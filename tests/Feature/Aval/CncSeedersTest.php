<?php

namespace Tests\Feature\Aval;

use App\Models\Category;
use App\Models\CustomField;
use App\Models\CustomFieldset;
use App\Models\Statuslabel;
use App\Models\User;
use Database\Seeders\Aval\CncCategorySeeder;
use Database\Seeders\Aval\CncCustomFieldSeeder;
use Tests\TestCase;

class CncSeedersTest extends TestCase
{
    private function seedTwice(string $seeder): void
    {
        User::factory()->firstAdmin()->create();
        $this->seed($seeder);
        $this->seed($seeder); // idempotence : aucun doublon
    }

    public function test_category_seeder_creates_cnc_categories_and_statuses()
    {
        $this->seedTwice(CncCategorySeeder::class);

        foreach (['Équipement biomédical', 'Véhicule', 'Informatique', 'Mobilier'] as $name) {
            $this->assertEquals(1, Category::where('name', $name)->where('category_type', 'asset')->count(), $name);
        }

        $this->assertEquals(1, Statuslabel::where('name', 'En service')->where('deployable', 1)->count());
        $this->assertEquals(1, Statuslabel::where('name', 'En maintenance')->count());
        $this->assertEquals(1, Statuslabel::where('name', 'En panne')->count());
        $this->assertEquals(1, Statuslabel::where('name', 'Réformé')->where('archived', 1)->count());
    }

    public function test_custom_field_seeder_creates_vehicle_and_biomedical_fieldsets()
    {
        $this->seedTwice(CncCustomFieldSeeder::class);

        $vehicule = CustomFieldset::where('name', 'Véhicule')->first();
        $this->assertNotNull($vehicule);
        $this->assertEquals(
            ['Immatriculation', 'Kilométrage', 'Échéance assurance', 'Échéance vignette', 'Chauffeur affecté'],
            $vehicule->fields->pluck('name')->all()
        );

        $biomedical = CustomFieldset::where('name', 'Équipement biomédical')->first();
        $this->assertNotNull($biomedical);
        $this->assertEquals(
            ['Criticité clinique', 'Dernière calibration', 'Prochaine calibration', 'Contrat de maintenance'],
            $biomedical->fields->pluck('name')->all()
        );

        $this->assertEquals('DATE', CustomField::where('name', 'Échéance assurance')->first()->format);
        $this->assertStringContainsString('Critique', CustomField::where('name', 'Criticité clinique')->first()->field_values);

        // Idempotence : 9 champs semés, pas 18. (La migration upstream
        // 2015_09_22_003413_migrate_mac_address crée déjà « MAC Address »,
        // donc on compte uniquement les champs de ce seeder.)
        $seeded = [
            'Immatriculation', 'Kilométrage', 'Échéance assurance', 'Échéance vignette', 'Chauffeur affecté',
            'Criticité clinique', 'Dernière calibration', 'Prochaine calibration', 'Contrat de maintenance',
        ];
        $this->assertEquals(9, CustomField::whereIn('name', $seeded)->count());
    }
}

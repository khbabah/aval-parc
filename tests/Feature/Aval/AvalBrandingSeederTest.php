<?php

namespace Tests\Feature\Aval;

use App\Models\Setting;
use Database\Seeders\Aval\AvalBrandingSeeder;
use Tests\TestCase;

class AvalBrandingSeederTest extends TestCase
{
    public function test_seeder_creates_settings_row_when_none_exists()
    {
        Setting::query()->delete();

        $this->seed(AvalBrandingSeeder::class);

        $settings = Setting::first();
        $this->assertNotNull($settings);
        $this->assertEquals('Aval Parc', $settings->site_name);
        $this->assertEquals('fr-FR', $settings->locale);
        $this->assertEquals('MRU', $settings->default_currency);
        $this->assertStringContainsString('github.com/Khbabah/aval-parc', $settings->footer_text);
    }

    public function test_seeder_updates_existing_settings_without_duplicating()
    {
        Setting::query()->delete();
        Setting::factory()->create(['site_name' => 'Snipe-IT Demo']);

        $this->seed(AvalBrandingSeeder::class);
        $this->seed(AvalBrandingSeeder::class); // idempotence

        $this->assertEquals(1, Setting::count());
        $this->assertEquals('Aval Parc', Setting::first()->site_name);
    }
}

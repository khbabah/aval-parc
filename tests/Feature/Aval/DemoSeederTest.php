<?php

namespace Tests\Feature\Aval;

use App\Models\Asset;
use App\Models\AssetModel;
use App\Models\CustomField;
use App\Models\Maintenance;
use App\Models\User;
use Database\Seeders\Aval\DemoSeeder;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    private function seedTwice(): void
    {
        Storage::fake('local_public');
        Storage::fake('public');
        User::factory()->firstAdmin()->create();

        $this->seed(DemoSeeder::class);
        $this->seed(DemoSeeder::class); // idempotence : mêmes comptes, aucun doublon
    }

    public function test_seeder_creates_exact_demo_counts_when_run_twice()
    {
        $this->seedTwice();

        $this->assertEquals(8, AssetModel::where('name', 'like', '%')->whereIn('name', [
            'Vivid E95', 'MAC 2000', 'IntelliVue MX450', 'BeneHeart D3', 'Evita V300',
            'Hilux', 'Land Cruiser 78', 'H-1',
        ])->count());

        $this->assertEquals(16, Asset::where('asset_tag', 'like', 'AVAL-DEMO-%')->count());

        $this->assertEquals(4, User::whereIn('username', [
            'fmint.ahmed', 'sould.cheikh', 'aabeidna', 'mvall',
        ])->count());

        $this->assertEquals(2, Maintenance::whereIn('name', [
            'Étalonnage annuel - Vivid E95 (AVAL-DEMO-0001)',
            'Réparation moteur - Hilux (AVAL-DEMO-0011)',
        ])->count());

        $this->assertEquals(3, Asset::where('asset_tag', 'like', 'AVAL-DEMO-%')
            ->whereNotNull('assigned_to')->count());
    }

    public function test_vehicle_asset_has_registration_custom_field_value()
    {
        $this->seedTwice();

        $field = CustomField::where('name', 'Immatriculation')->firstOrFail();
        $asset = Asset::where('asset_tag', 'AVAL-DEMO-0011')->firstOrFail();

        $this->assertNotEmpty($asset->{$field->db_column});
    }

    public function test_one_asset_is_assigned_to_a_user()
    {
        $this->seedTwice();

        $assigned = Asset::where('asset_tag', 'like', 'AVAL-DEMO-%')
            ->whereNotNull('assigned_to')
            ->first();

        $this->assertNotNull($assigned);
        $this->assertNotNull($assigned->assigned_to);
    }

    public function test_model_image_exists_on_expected_disk()
    {
        $this->seedTwice();

        $model = AssetModel::where('name', 'Vivid E95')->firstOrFail();
        $this->assertNotEmpty($model->image);
        $this->assertTrue(Storage::disk('public')->exists(app('models_upload_path').$model->image));
    }
}

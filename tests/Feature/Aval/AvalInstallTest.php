<?php

namespace Tests\Feature\Aval;

use App\Models\Category;
use App\Models\CustomFieldset;
use App\Models\Setting;
use App\Models\User;
use Tests\TestCase;

class AvalInstallTest extends TestCase
{
    public function test_install_command_provisions_admin_settings_and_cnc_data()
    {
        Setting::query()->delete();

        $this->artisan('aval:install', [
            '--admin-username' => 'admin',
            '--admin-email' => 'admin@cnc.mr',
            '--admin-password' => 'ChangeMe!2026',
        ])->assertExitCode(0);

        $admin = User::where('username', 'admin')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->isSuperUser());

        $this->assertEquals('Aval Parc', Setting::first()->site_name);
        $this->assertEquals(4, Category::where('category_type', 'asset')->count());
        $this->assertEquals(2, CustomFieldset::whereIn('name', ['Véhicule', 'Équipement biomédical'])->count());
    }

    public function test_install_command_is_rerunnable_and_keeps_existing_admin()
    {
        Setting::query()->delete();
        $args = [
            '--admin-username' => 'admin',
            '--admin-email' => 'admin@cnc.mr',
            '--admin-password' => 'ChangeMe!2026',
        ];

        $this->artisan('aval:install', $args)->assertExitCode(0);
        $this->artisan('aval:install', $args)->assertExitCode(0);

        $this->assertEquals(1, User::where('username', 'admin')->count());
        $this->assertEquals(1, Setting::count());
    }
}

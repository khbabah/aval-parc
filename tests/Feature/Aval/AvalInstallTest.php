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

    public function test_install_command_reads_admin_password_from_environment_when_option_missing()
    {
        Setting::query()->delete();

        // install.sh exporte ADMIN_PASSWORD dans l'environnement du conteneur
        // plutôt que de le passer sur l'argv (invisible dans `ps`) : on simule
        // ce chemin ici avec putenv(), lu par `env('ADMIN_PASSWORD')`.
        putenv('ADMIN_PASSWORD=EnvSuperSecret2026');

        try {
            $this->artisan('aval:install', [
                '--admin-username' => 'envadmin',
                '--admin-email' => 'envadmin@cnc.mr',
            ])->assertExitCode(0);
        } finally {
            putenv('ADMIN_PASSWORD');
        }

        $admin = User::where('username', 'envadmin')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->isSuperUser());
    }

    public function test_install_command_rejects_password_shorter_than_ten_characters()
    {
        Setting::query()->delete();

        $this->artisan('aval:install', [
            '--admin-username' => 'admin',
            '--admin-email' => 'admin@cnc.mr',
            '--admin-password' => 'Short1!',
        ])->assertExitCode(1);

        $this->assertNull(User::where('username', 'admin')->first());
    }
}

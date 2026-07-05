<?php

namespace App\Console\Commands\Aval;

use App\Models\User;
use Database\Seeders\Aval\CncSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class AvalInstall extends Command
{
    protected $signature = 'aval:install
        {--admin-username= : Identifiant du superadmin initial}
        {--admin-email= : Email du superadmin initial}
        {--admin-password= : Mot de passe du superadmin initial}';

    protected $description = 'Installe Aval Parc : migrations, superadmin, configuration CNC';

    public function handle(): int
    {
        $this->call('migrate', ['--force' => true]);

        if (! User::where('permissions->superuser', '1')->exists()) {
            $username = $this->option('admin-username');
            $email = $this->option('admin-email');
            $password = $this->option('admin-password');

            if (! $username || ! $email || ! $password) {
                $this->error('Aucun superadmin en base : fournir --admin-username, --admin-email et --admin-password.');

                return self::FAILURE;
            }

            $user = new User([
                'first_name' => 'Admin',
                'last_name' => 'Aval',
                'username' => $username,
                'email' => $email,
                'password' => Hash::make($password),
                'activated' => 1,
            ]);
            $user->permissions = '{"superuser":"1"}';
            $user->save();
            $this->info("Superadmin « {$username} » créé.");
        } else {
            $this->info('Superadmin existant conservé.');
        }

        $this->call('db:seed', ['--class' => CncSeeder::class, '--force' => true]);

        $this->info('Aval Parc est installé. Connectez-vous pour téléverser le logo (Paramètres > Image de marque).');

        return self::SUCCESS;
    }
}

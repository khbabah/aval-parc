<?php

namespace Database\Seeders\Aval;

use App\Models\Category;
use App\Models\Statuslabel;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Catégories et statuts pour un établissement de santé (config CNC).
 * Idempotent — sûr sur base de production.
 */
class CncCategorySeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('permissions->superuser', '1')->first();
        if (! $admin) {
            $this->command?->error('Aucun superadmin — exécuter aval:install ou créer un admin d\'abord.');

            return;
        }

        foreach (['Équipement biomédical', 'Véhicule', 'Informatique', 'Mobilier'] as $name) {
            Category::firstOrCreate(
                ['name' => $name, 'category_type' => 'asset'],
                ['created_by' => $admin->id, 'require_acceptance' => 0, 'checkin_email' => 0]
            );
        }

        $statuses = [
            ['name' => 'En service',     'deployable' => 1, 'pending' => 0, 'archived' => 0],
            ['name' => 'En attente',     'deployable' => 0, 'pending' => 1, 'archived' => 0],
            ['name' => 'En maintenance', 'deployable' => 0, 'pending' => 0, 'archived' => 0],
            ['name' => 'En panne',       'deployable' => 0, 'pending' => 0, 'archived' => 0],
            ['name' => 'Réformé',        'deployable' => 0, 'pending' => 0, 'archived' => 1],
        ];
        foreach ($statuses as $status) {
            Statuslabel::firstOrCreate(
                ['name' => $status['name']],
                $status + ['created_by' => $admin->id, 'show_in_nav' => 0, 'default_label' => 0]
            );
        }
    }
}

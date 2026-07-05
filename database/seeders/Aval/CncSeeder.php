<?php

namespace Database\Seeders\Aval;

use Illuminate\Database\Seeder;

/**
 * Configuration complète Aval Parc pour le Centre National de Cardiologie.
 * Usage : php artisan db:seed --class="Database\Seeders\Aval\CncSeeder"
 */
class CncSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AvalBrandingSeeder::class,
            CncCategorySeeder::class,
            CncCustomFieldSeeder::class,
        ]);
    }
}

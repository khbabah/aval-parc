<?php

namespace Database\Seeders\Aval;

use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Rebranding Aval Parc via les settings natifs de Snipe-IT.
 * Idempotent : ne crée jamais de doublon, met à jour la ligne existante.
 */
class AvalBrandingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = Setting::first() ?? new Setting;

        $settings->site_name = 'Aval Parc';
        $settings->locale = 'fr-FR';
        $settings->default_currency = 'MRU';
        $settings->support_footer = 'off';
        $settings->version_footer = 'off';
        $settings->footer_text = 'Aval Parc — basé sur [Snipe-IT](https://snipeitapp.com) (AGPL-3.0) · [Code source](https://github.com/Khbabah/aval-parc)';

        // Valeurs minimales requises si la ligne n'existe pas encore (avant le setup web)
        $settings->per_page = $settings->per_page ?? 20;
        $settings->auto_increment_assets = $settings->auto_increment_assets ?? 1;
        $settings->pwd_secure_min = $settings->pwd_secure_min ?? '10';
        $settings->default_avatar = $settings->default_avatar ?? 'default.png';

        // Logo et favicon officiels Aval Parc (à la manière du SettingsSeeder upstream :
        // copie depuis public/img/... vers le disque local_public).
        Storage::disk('local_public')->put('aval-logo.png', file_get_contents(public_path('img/aval/aval-logo.png')));
        Storage::disk('local_public')->put('aval-favicon.png', file_get_contents(public_path('img/aval/aval-favicon.png')));
        $settings->logo = 'aval-logo.png';
        $settings->favicon = 'aval-favicon.png';
        $settings->brand = 3; // 3 = logo + texte

        $settings->save();
    }
}

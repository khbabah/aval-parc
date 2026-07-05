<?php

namespace Database\Seeders\Aval;

use App\Models\Setting;
use Illuminate\Database\Seeder;

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
        $settings->brand = 1; // 1 = texte seul; le client pourra téléverser un logo dans l'UI
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

        $settings->save();
    }
}

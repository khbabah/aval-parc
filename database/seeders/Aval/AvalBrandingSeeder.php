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
        // Formats FR (Mauritanie) plutôt que les formats US par défaut de Snipe-IT.
        $settings->date_display_format = 'd/m/Y';
        $settings->time_display_format = 'H:i';
        // Discret : le lien de l'archive AGPL §13 doit rester présent (dépôt privé),
        // mais sans mention de marque tierce dans le pied de page client.
        $settings->footer_text = 'Aval Parc · [Code source](/source.tar.gz)';

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

        // Logo un peu plus grand sur la page de connexion (200px par défaut upstream)
        // + masquage des icônes sociales Snipe-IT/Grokability codées en dur dans le
        // pied de page upstream (resources/views/layouts/default.blade.php), qui ne
        // doivent pas apparaître dans un produit rebrandé.
        // Ne jamais écraser un CSS déjà personnalisé par le client.
        $settings->custom_css = $settings->custom_css ?: '#login-logo{max-width:260px}'
            . '.footer-links a[href*="snipeitapp"],.footer-links a[href*="grokability"],.footer-links a[href*="discord"],.footer-links a[href*="bsky.app"],.footer-links a[href*="github.com"]{display:none}';

        $settings->save();
    }
}

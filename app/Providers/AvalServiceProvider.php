<?php

namespace App\Providers;

use Illuminate\Support\Facades\Lang;
use Illuminate\Support\ServiceProvider;
use Illuminate\Translation\Translator;

/**
 * Surcharges Aval Parc appliquées PAR-DESSUS le pack de langue fr-FR upstream.
 *
 * On ne modifie jamais resources/lang/** (fichiers upstream) : à la place, on
 * charge un petit fichier de correctifs (app/Aval/lang/overrides-fr.php) et on
 * l'applique via Lang::addLines(). Défensif : fichier absent, vide ou invalide
 * => no-op silencieux (ne doit jamais faire planter le boot de l'application).
 */
class AvalServiceProvider extends ServiceProvider
{
    protected string $overridesPath = 'Aval/lang/overrides-fr.php';

    protected string $overridesLocale = 'fr-FR';

    /**
     * Clés NOUVELLES (absentes du pack upstream), introduites par les
     * micro-patchs de vues (docs/UPSTREAM_PATCHES.md) : injectées aussi en
     * en-US pour qu'aucune locale n'affiche de clé brute.
     */
    protected string $additionsPath = 'Aval/lang/additions-en.php';

    protected string $additionsLocale = 'en-US';

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->applyLines($this->additionsPath, $this->additionsLocale);
        $this->applyLines($this->overridesPath, $this->overridesLocale);
    }

    protected function applyLines(string $relativePath, string $locale): void
    {
        $path = app_path($relativePath);

        if (! is_file($path)) {
            return;
        }

        $lines = include $path;

        if (! is_array($lines) || empty($lines)) {
            return;
        }

        /** @var Translator $translator */
        $translator = $this->app['translator'];

        // Les clés des surcharges sont au format "groupe.cle" (ex:
        // 'admin/hardware/general.requestable'). Translator::addLines() écrit
        // directement dans le cache interne des traductions déjà chargées ; si un
        // groupe n'a encore JAMAIS été chargé, Translator::load() écraserait plus
        // tard tout le groupe avec pour seul contenu nos quelques clés de
        // substitution, faisant disparaître le reste du pack de langue pour ce
        // groupe. On force donc le chargement complet de chaque groupe concerné
        // AVANT d'ajouter nos lignes, afin que celles-ci viennent simplement
        // remplacer des clés existantes sans rien effacer d'autre.
        $groups = [];

        foreach (array_keys($lines) as $key) {
            $group = explode('.', $key, 2)[0];
            $groups[$group] = true;
        }

        foreach (array_keys($groups) as $group) {
            $translator->load('*', $group, $locale);
        }

        Lang::addLines($lines, $locale);
    }
}

<?php

/**
 * Clés de traduction NOUVELLES (absentes du pack en-US upstream), introduites
 * par les micro-patchs de vues Aval Parc (cf. docs/UPSTREAM_PATCHES.md).
 *
 * Injectées en en-US par App\Providers\AvalServiceProvider pour qu'aucune
 * locale n'affiche de clé brute ; les valeurs françaises correspondantes
 * vivent dans overrides-fr.php. Même format de clés : "groupe.cle".
 *
 * @return array<string, string>
 */
return [

    // resources/views/hardware/view.blade.php : encadré compteurs de la fiche
    // du bien ("Active Maintenances" était codé en dur en anglais).
    'general.active_maintenances' => 'Active Maintenances',

    // resources/views/dashboard.blade.php : titre du panneau catégories
    // (upstream concatène trans('general.asset').' '.trans('general.categories')).
    'general.asset_categories' => 'Asset Categories',

    // resources/views/blade/info-element/status.blade.php : le badge de
    // metastatut affiche désormais trans('general.'.statusMeta) ; toutes les
    // valeurs possibles (deployed/pending/undeployable/archived) ont déjà une
    // clé general.* upstream SAUF 'deployable'.
    'general.deployable' => 'Deployable',

];

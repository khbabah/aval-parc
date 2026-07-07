<?php

/**
 * Surcharges de traduction FR "Aval Parc".
 *
 * Ce fichier ne remplace PAS le pack fr-FR upstream : il ne fait que corriger,
 * clé par clé, les chaînes que Snipe-IT laisse non traduites (valeur fr-FR
 * identique à la valeur en-US) sur les écrans les plus visibles (menu latéral,
 * tableau de bord, fiche actif, listes accessoires/consommables/composants,
 * pied de page).
 *
 * Format des clés : "groupe.cle", où "groupe" est le chemin du fichier de
 * langue avec des slashes (ex: 'admin/hardware/general.requestable'), exactement
 * comme attendu par Illuminate\Translation\Translator::addLines().
 *
 * Chargé et appliqué par App\Providers\AvalServiceProvider.
 *
 * @return array<string, string>
 */
return [

    // --- Pied de page : débranding (plus aucune mention Grokability/Snipe-IT) ---
    'general.footer_credit' => 'Aval Parc — gestion de parc pour établissements de santé.',

    // --- Champs / valeurs très fréquents (fiche actif, listes, tout composant x-data-row) ---
    'general.no_value' => 'Non renseigné',
    'general.total_cost' => 'Coût total',
    'general.unit_cost' => 'Coût unitaire',
    'general.byod' => 'Matériel personnel',
    'general.available' => 'Disponible',
    'general.selected' => 'sélectionné(s)',
    'general.optional' => 'FACULTATIF',
    'general.show_all' => 'Tout afficher',

    // --- Menu latéral ---
    'general.bulkaudit' => 'Audit groupé par scanner',

    // --- Cycle de vie des biens : vocabulaire patrimoine plutôt que jargon IT ---
    // (« déployer » du matériel médical ne parle à personne : on AFFECTE un bien
    // à un service ou un agent, il est DISPONIBLE en réserve, INDISPONIBLE en
    // panne/maintenance, RETIRÉ en fin de vie.)
    // --- Vocabulaire du patrimoine hospitalier mauritanien ---
    // Aligné sur le registre réel des hôpitaux (colonnes de l'inventaire CHME :
    // DESIGNATION / MARQUE / ORIGINE-DATE D'ACQUISITION / EMPLACEMENT / ETAT,
    // document intitulé « INVENTAIRE DU PATRIMOINE »). Un don d'ONG ou une
    // dotation du Ministère n'est pas un « fournisseur » : c'est une origine.
    'general.asset' => 'Bien',
    'general.assets' => 'Patrimoine',
    'general.location' => 'Emplacement',
    'general.locations' => 'Emplacements',
    'general.manufacturer' => 'Marque',
    'general.manufacturers' => 'Marques',
    'general.supplier' => 'Origine',
    'general.suppliers' => 'Origines',
    'general.people' => 'Personnel',
    'general.user' => 'Agent',
    'general.users' => 'Personnel',

    // Clé partagée entre les menus Patrimoine, Personnel, Rapports : rester neutre.
    'general.list_all' => 'Tout lister',
    // Sous-menu Personnes (chaînes restées en anglais dans le pack fr-FR)
    'general.show_superadmins' => 'Superadmins',
    'general.show_admins' => 'Administrateurs',
    'general.deleted_users' => 'Utilisateurs supprimés',
    'general.deployed' => 'Affecté',
    'general.ready_to_deploy' => 'Disponible',
    'general.pending' => 'En attente',
    'general.undeployable' => 'Indisponible',
    'general.archived' => 'Retiré',
    'general.deploy' => 'Affecter',

    // --- Fiche actif (asset detail) ---
    'general.device_eol' => 'Fin de vie prévue',
    'general.add_note' => 'Ajouter une note au journal',
    'general.last_note' => 'Dernière note',
    'general.save_copy' => 'Enregistrer une copie',
    'general.asset_previous' => 'Actif (précédemment attribué)',
    'general.audited' => 'Audité',
    'general.audited_by' => 'Audité par',
    'general.viewassets' => 'Voir les éléments attribués',
    'general.viewassetsfor' => 'Voir les éléments de :name',
    'general.view_user_assets' => 'Voir les éléments attribués à l\'utilisateur',
    'general.unaccepted_asset_report' => 'Éléments non acceptés',
    'general.accept_item' => 'Accepter l\'élément',
    'general.accept_items' => 'Accepter les éléments',
    'general.child_locations' => 'Emplacements enfants',

    // --- Utilisateurs ---
    'general.login_disabled' => 'Connexion désactivée',
    'general.login_status' => 'Statut de connexion',
    'general.set_password' => 'Définir un mot de passe',

    // --- Tableau de bord (graphiques) ---
    'general.assets_by_category' => 'Actifs par catégorie',
    'general.activity_overview' => 'Aperçu de l\'activité',
    'general.checkouts_checkins' => 'Sorties et retours',
    'general.assets_newly_added' => 'Actifs ajoutés',
    'general.checkins' => 'Retours',
    'general.vs_prior_period' => 'vs période précédente',
    'general.time_range' => 'Sélectionner une période',
    'general.last_n_days' => 'Derniers :days jours',
    'general.custom_range' => 'Période personnalisée',
    'general.download_chart' => 'Télécharger le graphique en PNG',
    'general.fullscreen' => 'Plein écran',
    'general.licenses_with_no_seats' => 'Licences sans siège disponible',

    // --- Maintenances ---
    'general.maintenance_complete' => 'Maintenance terminée',

    // --- Thème clair/sombre (barre de navigation, toujours visible) ---
    'general.light_mode' => 'Mode clair',
    'general.dark_mode' => 'Mode sombre',
    'general.light_dark' => 'Mode clair/sombre',
    'general.theme' => 'Thème',
    'general.system_default' => 'Utiliser les paramètres système',

    // --- Actifs : listes et actions groupées ---
    'admin/hardware/general.bulk_checkin' => 'Retour groupé',
    'admin/hardware/general.clear' => 'Effacer',
    'admin/hardware/form.checkin_licenses' => 'Retourner les sièges de licence associés',
    'admin/hardware/form.checkin_child_assets' => 'Retourner les actifs associés',

    // --- Fiche du bien (audit CHME, encadré coûts/compteurs, colonne droite) ---
    // Le pack fr-FR laisse "Model n°." (mélange anglais/français), "Updated"
    // non traduit, et les dates d'audit dans un jargon logiciel : on aligne sur
    // le vocabulaire de pointage d'inventaire utilisé à l'hôpital.
    'general.model_no' => 'N° de modèle',
    'general.updated_plain' => 'Modifié',
    'general.updated_at' => 'Mis à jour le',
    'general.last_audit' => 'Dernier pointage d\'inventaire',
    'general.next_audit_date' => 'Prochain pointage d\'inventaire',
    'admin/hardware/form.default_location' => 'Emplacement de rattachement',
    // Compteurs d'activité (encadré sous les coûts) : "Associations/Dissociations"
    // est du jargon Snipe-IT ; on parle d'affectations et de retours de matériel.
    // "Demandes" (réservations en ligne, module non utilisé au CHME) est masquée
    // par CSS d'instance plutôt que renommée.
    'general.checkouts_count' => 'Affectations',
    'general.checkins_count' => 'Retours',
    // Fichiers du bien vs fichiers hérités du modèle : seule "Fichiers
    // additionnels" a une clé propre à cet usage (general.files est partagé
    // avec toutes les autres fiches - actifs, licences, utilisateurs... - et ne
    // peut donc pas être renommé "Fichiers du bien" sans devenir faux ailleurs).
    'general.additional_files' => 'Fichiers du modèle',

];

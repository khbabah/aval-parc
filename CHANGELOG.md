# Changelog — Aval Parc

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/). Les
versions marquent la couche Aval ; la base upstream est indiquée à chaque entrée.

## [Non publié]

## [1.0.0] — 2026-08-05

Base upstream : **Snipe-IT v8.6.3**.

### Ajouté
- Fork suiveur : branche miroir `upstream-master`, procédure de merge des
  releases (`docs/MISE_A_JOUR_UPSTREAM.md`), registre des patchs upstream
  (`docs/UPSTREAM_PATCHES.md` — 4 micro-patchs documentés).
- `php artisan aval:install` : migrations + superadmin (locale fr) + configuration
  santé en une commande, réexécutable.
- Seeders santé idempotents : branding (logo, fr-FR, MRU, footer AGPL),
  catégories/statuts français, champs personnalisés Véhicule et Équipement
  biomédical, `DemoSeeder` (parc de démonstration avec images générées).
- Déploiement Docker **hors-ligne** (`deploy/`) : install.sh (readiness réelle,
  clé générée hors crash-loop, archive AGPL `/source.tar.gz`), sauvegardes avec
  rotation et restauration testée, export d'images par USB, profil d'exposition
  publique documenté.
- Francisation profonde : surcharges de langue (`app/Aval/lang/`) — vocabulaire
  du patrimoine hospitalier (Patrimoine/Bien, Emplacements, Marques, Origines,
  Affecter/Rendre, pointage d'inventaire), plus clés manquantes des packs.
- Champ « N° de marché / bon de commande » (marchés publics) sur le champ
  natif de commande.
- Autopilote de démo vidéo (`demo-autopilot/`) : vidéo de formation 1080p
  auto-enregistrée (16 actes, cartes-concept, surligneur), serveur jetable.
- CI GitHub Actions : suite Aval à chaque push (`.github/workflows/aval-tests.yml`).

### Corrigé
- Avatar par défaut absent après installation sans assistant web.
- Locale de l'admin créé par `aval:install` (interface anglaise sinon).
- Libellés anglais résiduels des écrans clés (fiche du bien, maintenances,
  audit groupé, menus Personnes), badge de statut non traduit, titre
  « Bien Catégories » du tableau de bord.

[1.0.0]: https://github.com/khbabah/aval-parc/releases/tag/v1.0.0

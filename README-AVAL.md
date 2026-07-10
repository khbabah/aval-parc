# Aval Parc

Gestion de parc pour établissements de santé : équipements biomédicaux,
véhicules, informatique, mobilier. Basé sur [Snipe-IT](https://snipeitapp.com)
(AGPL-3.0), maintenu en fork suiveur.

Premier déploiement : Centre National de Cardiologie, Nouakchott, Mauritanie.

- **Spécification :** `docs/superpowers/specs/2026-07-04-aval-parc-design.md`
- **Installation :** `deploy/README.md`
- **Mise à jour upstream :** `docs/MISE_A_JOUR_UPSTREAM.md`
- **Licence :** AGPL-3.0 (voir `LICENSE`). Le code source complet de cette
  version, modifications incluses, est disponible sur ce dépôt et servi par
  chaque instance déployée sur `/source.tar.gz` (archive générée par
  `deploy/install.sh`, lien « Code source » du pied de page).

## Structure de la couche Aval (aucun fichier upstream modifié, sauf registre)

| Chemin | Rôle |
|---|---|
| `app/Aval/lang/` | surcharges de traduction FR + clés ajoutées (vocabulaire patrimoine hospitalier) |
| `app/Providers/AvalServiceProvider.php` | charge les surcharges de langue |
| `app/Console/Commands/Aval/` | `php artisan aval:install` (migrations + superadmin + config) |
| `database/seeders/Aval/` | branding, catégories/statuts/champs santé, données de démo |
| `deploy/` | production Docker hors-ligne (install, backup/restore, export USB) |
| `docs/UPSTREAM_PATCHES.md` | registre des rares fichiers upstream patchés (4, une ligne chacun) |
| `docs/MISE_A_JOUR_UPSTREAM.md` | procédure de merge des releases Snipe-IT |
| `tests/Feature/Aval/` | tests de la couche Aval (`php artisan test tests/Feature/Aval`) |

## Installation rapide (dev)

    composer install
    cp .env.example .env && php artisan key:generate
    # configurer la base dans .env, puis :
    php artisan aval:install --admin-username=admin --admin-email=vous@exemple.mr --admin-password=...

## Tests

    php artisan test tests/Feature/Aval

## Données de démonstration

    php artisan db:seed --class="Database\Seeders\Aval\DemoSeeder" --force

Attention : ne pas exécuter sur une base de production — ce seeder est réservé aux instances de démonstration (ex. avalparc.bsimr.com).

Mot de passe des utilisateurs de démo : surchargeable via `AVAL_DEMO_PASSWORD` (sinon `DemoAval2026!` par défaut).

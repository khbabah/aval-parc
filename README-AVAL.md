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

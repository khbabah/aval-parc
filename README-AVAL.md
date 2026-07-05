# Aval Parc

Gestion de parc pour établissements de santé : équipements biomédicaux,
véhicules, informatique, mobilier. Basé sur [Snipe-IT](https://snipeitapp.com)
(AGPL-3.0), maintenu en fork suiveur.

Premier déploiement : Centre National de Cardiologie, Nouakchott, Mauritanie.

- **Spécification :** `docs/superpowers/specs/2026-07-04-aval-parc-design.md`
- **Installation :** `deploy/README.md`
- **Mise à jour upstream :** `docs/MISE_A_JOUR_UPSTREAM.md`
- **Licence :** AGPL-3.0 (voir `LICENSE`). Le code source complet de cette
  version, modifications incluses, est disponible sur ce dépôt.

## Installation rapide (dev)

    composer install
    cp .env.example .env && php artisan key:generate
    # configurer la base dans .env, puis :
    php artisan aval:install --admin-username=admin --admin-email=vous@exemple.mr --admin-password=...

## Tests

    php artisan test tests/Feature/Aval

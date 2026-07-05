# Mise à jour depuis Snipe-IT (fork suiveur)

À chaque release Snipe-IT (tag `vX.Y.Z`) :

    git fetch upstream --tags
    git checkout upstream-master && git merge vX.Y.Z --ff-only
    git checkout main && git merge vX.Y.Z

1. Résoudre les éventuels conflits (rares : nos fichiers sont isolés
   dans `database/seeders/Aval/`, `app/Console/Commands/Aval/`, `deploy/`, `docs/`).
2. Re-vérifier chaque entrée de `docs/UPSTREAM_PATCHES.md`.
3. `composer install && php artisan test tests/Unit tests/Feature/Aval --stop-on-failure`
4. Checklist manuelle de non-régression (voir ci-dessous) sur un déploiement local.
5. Push, puis mise à jour du serveur : voir `deploy/README.md` section « Mise à jour » (avec accès internet ou hors-ligne).

## Checklist de non-régression (avant tout déploiement CNC)

- [ ] Login superadmin
- [ ] Création d'un actif dans « Équipement biomédical » avec ses champs custom
- [ ] Checkout / checkin d'un actif vers un utilisateur
- [ ] Rapport : liste des actifs exportée (CSV)
- [ ] Impression d'une étiquette
- [ ] Page « À propos » : nom « Aval Parc », footer avec lien code source

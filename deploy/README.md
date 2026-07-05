# Déploiement Aval Parc

## Installation (serveur clinique, Debian/Ubuntu + Docker)

1. Copier le dépôt sur le serveur (git clone, ou USB si hors-ligne).
2. Si hors-ligne : charger les images préparées avec `export-images.sh` :
   `docker load -i deploy/aval-parc-images.tar`
3. `cd deploy && ./install.sh admin admin@cnc.mr`
   - Premier lancement : le script crée `.env` — éditer les mots de passe puis relancer.
4. Ouvrir `http://<ip-serveur>:8000`, se connecter, téléverser le logo
   (Paramètres → Image de marque).

## Sauvegardes

- `./backup.sh` — base + fichiers dans `deploy/backups/`, rotation 14 jours.
- Ajouter au cron : `0 2 * * * /opt/aval-parc/deploy/backup.sh`
- **Copier régulièrement `deploy/backups/` sur un disque externe.**
- **Important : conservez aussi une copie de `deploy/.env` hors du serveur** (il contient
  `APP_KEY`) — sans cette clé, les champs chiffrés de la base restaurée sont indéchiffrables.

## Restauration

1. `docker compose up -d db` (attendre que la base soit prête, ~15 s)
2. `gunzip -c backups/db_<date>.sql.gz | docker compose exec -T db sh -c 'mariadb -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'`
3. `docker compose up -d app` puis restaurer storage :
   `gunzip -c backups/storage_<date>.tar.gz | docker compose exec -T app tar -xf - -C /`

## Mise à jour

Toujours sauvegarder d'abord : `./backup.sh`

### Serveur avec accès internet

1. `git pull`
2. `docker compose build`
3. `docker compose up -d`
4. `docker compose exec app php artisan migrate --force`

### Serveur hors-ligne (clinique)

1. Sur une machine connectée : `git pull` puis `./export-images.sh`,
   copier `deploy/aval-parc-images.tar` sur une clé USB.
2. Sur le serveur : `docker load -i aval-parc-images.tar`
3. `docker compose up -d` (sans `--build` : pas de reconstruction hors-ligne)
4. `docker compose exec app php artisan migrate --force`

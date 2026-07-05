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

## Restauration

1. `docker compose up -d db`
2. `gunzip -c backups/db_<date>.sql.gz | docker compose exec -T db sh -c 'mariadb -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'`
3. `docker compose up -d app` puis restaurer storage :
   `gunzip -c backups/storage_<date>.tar.gz | docker compose exec -T app tar -xzf - -C /`

## Mise à jour

1. Sauvegarder (`./backup.sh`).
2. `git pull` (ou charger la nouvelle image par USB).
3. `docker compose up -d --build`
4. `docker compose exec app php artisan migrate --force`

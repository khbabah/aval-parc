#!/usr/bin/env bash
# Sauvegarde quotidienne : base + fichiers. Rotation 14 jours.
# Cron suggéré : 0 2 * * * /opt/aval-parc/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/db_${STAMP}.sql.gz"
STORAGE_FILE="$BACKUP_DIR/storage_${STAMP}.tar.gz"

# Écriture dans un fichier .tmp puis renommage atomique : un dump interrompu
# ne laisse jamais un .gz tronqué qui aurait l'air valide.
docker compose exec -T db sh -c 'mariadb-dump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$DB_FILE.tmp"
gzip -t "$DB_FILE.tmp"
mv "$DB_FILE.tmp" "$DB_FILE"

# `tar` peut sortir en code 1 ("file changed as we read it") sur une appli en
# ligne : on tolère ce cas précis sous `set -e`, tout autre code (>=2) reste fatal.
docker compose exec -T app tar -czf - /var/lib/snipeit > "$STORAGE_FILE.tmp" \
  || [ $? -eq 1 ]
mv "$STORAGE_FILE.tmp" "$STORAGE_FILE"

find "$BACKUP_DIR" -name '*.gz' -mtime +14 -delete
echo "Sauvegarde OK : $BACKUP_DIR (db + storage, ${STAMP})"

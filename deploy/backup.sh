#!/usr/bin/env bash
# Sauvegarde quotidienne : base + fichiers. Rotation 14 jours.
# Cron suggéré : 0 2 * * * /opt/aval-parc/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$BACKUP_DIR"

docker compose exec -T db sh -c 'mariadb-dump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$BACKUP_DIR/db_${STAMP}.sql.gz"

docker compose exec -T app tar -czf - /var/lib/snipeit > "$BACKUP_DIR/storage_${STAMP}.tar.gz"

find "$BACKUP_DIR" -name '*.gz' -mtime +14 -delete
echo "Sauvegarde OK : $BACKUP_DIR (db + storage, ${STAMP})"

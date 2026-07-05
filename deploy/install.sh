#!/usr/bin/env bash
# Installation initiale d'Aval Parc sur le serveur de la clinique.
# Usage : ./install.sh <identifiant-admin> <email-admin>
set -euo pipefail
cd "$(dirname "$0")"

[ $# -eq 2 ] || { echo "Usage : $0 <identifiant-admin> <email-admin>"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> .env créé. Éditez les mots de passe (CHANGEZ_MOI) puis relancez."
  exit 1
fi

read -r -s -p "Mot de passe du superadmin : " ADMIN_PASSWORD; echo
if [ -z "$ADMIN_PASSWORD" ]; then
  echo "Erreur : le mot de passe du superadmin ne peut pas être vide." >&2
  exit 1
fi

APP_PORT=$(grep -E '^APP_PORT=' .env | cut -d= -f2 || true)
APP_PORT=${APP_PORT:-8000}

if ! grep -q '^APP_KEY=base64' .env; then
  # NB : sans APP_KEY le conteneur app redémarre en boucle (startup.sh upstream),
  # donc on génère la clé dans un conteneur éphémère plutôt que via `exec`.
  echo ">>> Génération de la clé d'application (APP_KEY)..."
  KEY=$(docker compose run --rm --no-deps -T app php artisan key:generate --show | tr -d '\r' | grep -o 'base64:.*')
  sed -i.bak "s|^APP_KEY=.*|APP_KEY=${KEY}|" .env
  rm -f .env.bak
fi

# Pas de --build : hors-ligne, l'image est chargée via `docker load` (voir README) ;
# compose construit automatiquement si l'image est absente. Build explicite : export-images.sh.
docker compose up -d

echo ">>> Attente de l'application (base de données, migrations, serveur web — max 120 s)..."
ready=0
for _ in $(seq 1 60); do
  if curl -fs -o /dev/null "http://localhost:${APP_PORT}/login"; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "Erreur : l'application ne répond pas après 120 s." >&2
  echo "Consultez les journaux : docker compose logs app db" >&2
  exit 1
fi
echo ">>> Application prête."

# Le mot de passe est transmis via l'environnement : il n'apparaît jamais dans la
# ligne de commande côté hôte (invisible dans `ps`).
export ADMIN_PASSWORD
docker compose exec -T -e ADMIN_PASSWORD -e ADMIN_USERNAME="$1" -e ADMIN_EMAIL="$2" app \
  sh -c 'php artisan aval:install --admin-username="$ADMIN_USERNAME" --admin-email="$ADMIN_EMAIL" --admin-password="$ADMIN_PASSWORD"'

echo ">>> Aval Parc est prêt : http://localhost:${APP_PORT}"

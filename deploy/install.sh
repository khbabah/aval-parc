#!/usr/bin/env bash
# Installation initiale d'Aval Parc sur le serveur de la clinique.
# Usage : ./install.sh <admin-username> <admin-email>
set -euo pipefail
cd "$(dirname "$0")"

[ $# -eq 2 ] || { echo "Usage: $0 <admin-username> <admin-email>"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> .env créé. Éditez les mots de passe (CHANGEZ_MOI) puis relancez."
  exit 1
fi

read -r -s -p "Mot de passe du superadmin : " ADMIN_PASSWORD; echo

# Pas de --build : hors-ligne, l'image est chargée via `docker load` (voir README) ;
# compose construit automatiquement si l'image est absente. Build explicite : export-images.sh.
docker compose up -d
echo ">>> Attente de la base de données..."
sleep 15

if ! grep -q '^APP_KEY=base64' .env; then
  # NB : sans APP_KEY le conteneur app redémarre en boucle (startup.sh upstream),
  # donc on génère la clé dans un conteneur éphémère plutôt que via `exec`.
  KEY=$(docker compose run --rm --no-deps -T app php artisan key:generate --show | tr -d '\r' | grep -o 'base64:.*')
  sed -i.bak "s|^APP_KEY=.*|APP_KEY=${KEY}|" .env
  docker compose up -d app
  echo ">>> Attente du démarrage de l'application..."
  sleep 20
fi

docker compose exec -T app php artisan aval:install \
  --admin-username="$1" --admin-email="$2" --admin-password="$ADMIN_PASSWORD"

echo ">>> Aval Parc est prêt : http://localhost:$(grep -E '^APP_PORT=' .env | cut -d= -f2 || echo 8000)"

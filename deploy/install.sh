#!/usr/bin/env bash
# Installation initiale d'Aval Parc sur le serveur de la clinique.
# Usage : ./install.sh <identifiant-admin> <email-admin>
set -euo pipefail
cd "$(dirname "$0")"

[ $# -eq 2 ] || { echo "Usage : $0 <identifiant-admin> <email-admin>"; exit 1; }

command -v curl >/dev/null 2>&1 || { echo "Erreur : la commande « curl » est requise mais introuvable." >&2; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> .env créé. Éditez les mots de passe (CHANGEZ_MOI) puis relancez."
  exit 1
fi

if grep -q 'CHANGEZ_MOI' .env; then
  echo "Erreur : .env contient encore des valeurs par défaut (CHANGEZ_MOI) — éditez les mots de passe avant de continuer." >&2
  exit 1
fi

read -r -s -p "Mot de passe du superadmin : " ADMIN_PASSWORD; echo
if [ -z "$ADMIN_PASSWORD" ]; then
  echo "Erreur : le mot de passe du superadmin ne peut pas être vide." >&2
  exit 1
fi

APP_PORT=$(grep -E '^APP_PORT=' .env | cut -d= -f2 || true)
APP_PORT=${APP_PORT:-8000}

# Archive du code source, servie par l'application sur /source.tar.gz
# (conformité AGPL-3.0 : l'appli fournit elle-même ses sources). Doit exister
# AVANT TOUTE commande compose (y compris `run` pour l'APP_KEY) : compose la
# monte en lecture seule, et un bind-mount vers un fichier absent ferait créer
# un répertoire à sa place par Docker.
if [ -d source.tar.gz ]; then
  rmdir source.tar.gz 2>/dev/null || { echo "Erreur : source.tar.gz est un répertoire non vide — supprimez-le puis relancez." >&2; exit 1; }
fi
echo ">>> Génération de l'archive du code source (source.tar.gz, conformité AGPL)..."
if git -C .. rev-parse >/dev/null 2>&1; then
  git -C .. archive --format=tar.gz -o deploy/source.tar.gz HEAD
else
  # Copie du dépôt sans .git (ex. transfert USB) : archivage direct, en
  # excluant secrets, sauvegardes et artefacts volumineux.
  tar -czf source.tar.gz -C .. \
    --exclude='.git' \
    --exclude='deploy/.env*' \
    --exclude='deploy/backups' \
    --exclude='deploy/*.tar*' \
    --exclude='node_modules' \
    --exclude='vendor' \
    .
fi
if [ ! -s source.tar.gz ]; then
  echo "Erreur : la génération de source.tar.gz a échoué (fichier absent ou vide)." >&2
  exit 1
fi

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

echo ">>> Attente de l'application (base de données, migrations, serveur web — max 300 s)..."
ready=0
for _ in $(seq 1 150); do
  if curl -fs -o /dev/null "http://localhost:${APP_PORT}/login"; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "Erreur : l'application ne répond pas après 300 s." >&2
  echo "Consultez les journaux : docker compose logs app db" >&2
  exit 1
fi
echo ">>> Application prête."

# Le mot de passe est transmis via l'environnement, jamais sur l'argv : il
# n'apparaît ni dans `ps` côté hôte ni dans `ps` côté conteneur. `aval:install`
# lit ADMIN_PASSWORD depuis l'environnement quand --admin-password est absent.
export ADMIN_PASSWORD
docker compose exec -T -e ADMIN_PASSWORD -e ADMIN_USERNAME="$1" -e ADMIN_EMAIL="$2" app \
  sh -c 'php artisan aval:install --admin-username="$ADMIN_USERNAME" --admin-email="$ADMIN_EMAIL"'

echo ">>> Aval Parc est prêt : http://localhost:${APP_PORT}"

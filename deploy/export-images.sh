#!/usr/bin/env bash
# Exporte les images Docker pour un serveur sans accès internet (transfert USB).
# Sur le serveur : docker load -i aval-parc-images.tar
set -euo pipefail
cd "$(dirname "$0")"

# Sur une machine connectée « vierge », .env n'existe pas encore : compose exige
# le fichier (env_file) même pour `build`. Les valeurs ne sont pas consommées
# par le build — une copie de l'exemple suffit.
if [ ! -f .env ]; then
  echo ">>> .env absent : copie de .env.example (les valeurs ne servent pas au build)."
  cp .env.example .env
fi

docker compose build
docker save aval-parc:${AVAL_VERSION:-v1} mariadb:11.4.7 -o aval-parc-images.tar
echo "Images exportées dans deploy/aval-parc-images.tar ($(du -h aval-parc-images.tar | cut -f1))"

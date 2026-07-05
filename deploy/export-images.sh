#!/usr/bin/env bash
# Exporte les images Docker pour un serveur sans accès internet (transfert USB).
# Sur le serveur : docker load -i aval-parc-images.tar
set -euo pipefail
cd "$(dirname "$0")"
docker compose build
docker save aval-parc:${AVAL_VERSION:-v1} mariadb:11.4.7 -o aval-parc-images.tar
echo "Images exportées dans deploy/aval-parc-images.tar ($(du -h aval-parc-images.tar | cut -f1))"

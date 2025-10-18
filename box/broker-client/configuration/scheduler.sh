#!/usr/bin/env bash
set -e

# Boucle infinie : exécute node dist/main.js toutes les 10s
while true; do
  echo "➡️  Start publishing at $(date --iso-8601=seconds)"
  node dist/main.js || true
  sleep ${PUSH_SCHEDULE_INTERVAL:-10}
done
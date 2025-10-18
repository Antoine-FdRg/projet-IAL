#!/usr/bin/env bash
set -e

# Vérification de la présence de $PUSH_SCHEDULE_INTERVAL
if [ -z "${PUSH_SCHEDULE_INTERVAL}" ]; then
  echo "⚠️  WARNING: PUSH_SCHEDULE_INTERVAL is not set. Defaulting to 1800 seconds."
fi

# Boucle infinie : exécute node dist/main.js toutes les 30 minutes
while true; do
  echo "➡️  Start publishing at $(date --iso-8601=seconds)"
  node dist/main.js || true
  sleep ${PUSH_SCHEDULE_INTERVAL:-1800}
done
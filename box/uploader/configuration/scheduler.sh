#!/usr/bin/env bash
set -e

# Vérification de la présence de $UPLOADER_SCHEDULE_INTERVAL
if [ -z "${UPLOADER_SCHEDULE_INTERVAL}" ]; then
  echo "⚠️  WARNING: UPLOADER_SCHEDULE_INTERVAL is not set. Defaulting to 1800 seconds."
else
  echo "✅  UPLOADER_SCHEDULE_INTERVAL is set to ${UPLOADER_SCHEDULE_INTERVAL} seconds."
fi

# Boucle infinie : exécute node dist/main.js toutes les 30 minutes
while true; do
  echo "➡️  Start publishing at $(date --iso-8601=seconds)"
  node dist/main.js || true
  sleep ${UPLOADER_SCHEDULE_INTERVAL:-1800}
done
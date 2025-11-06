#! /bin/bash
if [ $# -lt 1 ]; then
  echo "Usage: $0 <numero_maison>"
  echo "Exemple: $0 1  (utilise .env.home-1)"
  exit 1
fi

STATION_NUMBER="$1"
if ! [[ "$STATION_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "Erreur: le numéro de maison doit être un entier."
  exit 1
fi

ENV_FILE=".env.home-$STATION_NUMBER"
if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur: fichier d'environnement introuvable: $ENV_FILE"
  exit 1
fi

PROJECT_STATION="ial-station-$STATION_NUMBER"
PROJECT_DEVICE="ial-device-$STATION_NUMBER"


echo "🚀 Starting station $STATION_NUMBER services..."

echo "Starting Buffer DB..."

docker-compose -p "$PROJECT_STATION" --env-file "$ENV_FILE" -f ../box/infra/mongo/docker-compose.yml up -d

echo "✅ Buffer DB started successfully"

# Wait for Buffer DB to be ready
echo "Waiting for Buffer DB to be ready... (5 seconds)"
sleep 5

echo "Testing Buffer DB connection..."

docker exec buffer-db-${STATION_NUMBER} mongosh --quiet --eval 'db.getSiblingDB("messagesdb").auth("app", "root"); print("Connection successful!")' 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Buffer DB connection successful"
else
  echo "❌ Buffer DB connection failed"
fi

echo "Starting all services..."

docker-compose -p "$PROJECT_STATION" \
  --env-file "$ENV_FILE" \
  -f ../box/broker/docker-compose.yml \
  -f ../box/cleaner/docker-compose.yml \
  -f ../box/outlier-filter/docker-compose.yml \
  -f ../box/normalizer/docker-compose.yml \
  -f ../box/uploader/docker-compose.yml \
  -f ../box/gatt-server/docker-compose.yml \
  up -d

echo "✅ Station started successfully"

echo "🚀 Starting a device..."

docker-compose -p "$PROJECT_DEVICE" \
  --env-file "$ENV_FILE" \
  -f ../devices/mock-watch/docker-compose.yml \
  up -d

echo "✅ Device started successfully"


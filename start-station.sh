#! /bin/bash

echo "🚀 Starting station services..."

echo "Starting Buffer DB..."

docker-compose -p ial-station -f box/infra/mongo/docker-compose.yml up -d

echo "✅ Buffer DB started successfully"

# Wait for Buffer DB to be ready
echo "Waiting for Buffer DB to be ready... (5 seconds)"
sleep 5

echo "Testing Buffer DB connection..."

docker exec buffer-db mongosh --quiet --eval 'db.getSiblingDB("messagesdb").auth("app", "root"); print("Connection successful!")' 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Buffer DB connection successful"
else
  echo "❌ Buffer DB connection failed"
fi

echo "Starting all services..."

docker-compose -p ial-station \
  --env-file .env.station
  -f box/broker/docker-compose.yml \
  -f box/broker-client/docker-compose.yml \
  -f box/cleaner/docker-compose.yml \
  -f box/outlier-filter/docker-compose.yml \
  -f box/normalizer/docker-compose.yml \
  up -d

echo "✅ Station started successfully"

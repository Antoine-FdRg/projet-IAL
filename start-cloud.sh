#! /bin/bash
echo "🚀 Starting cloud services..."

docker-compose -p ial-cloud \
  --env-file .env.cloud \
  -f databases/user-db/docker-compose.yml \
  up -d

docker-compose -p ial-cloud \
  --env-file .env.cloud \
  -f databases/measurement-db/docker-compose.yml \
  -f save-service/docker-compose.yml \
  -f analyze-service/docker-compose.yml \
  -f family-notification-service/docker-compose.yml \
  up -d

echo "✅ Cloud services started successfully"

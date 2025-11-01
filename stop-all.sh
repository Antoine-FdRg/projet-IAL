#!/bin/bash

echo "🛑 Stopping all services..."

echo "Stopping pipeline services..."
docker-compose -p ial-station \
               --env-file .env.station \
               --file box/infra/mongo/docker-compose.yml \
               --file box/broker/docker-compose.yml \
               --file box/broker-client/docker-compose.yml \
               --file box/cleaner/docker-compose.yml \
               --file box/outlier-filter/docker-compose.yml \
               --file box/uploader/docker-compose.yml \
               --file box/normalizer/docker-compose.yml down -v

echo "All box services stopped"

echo "Stopping cloud services"
docker-compose -p ial-cloud \
               --env-file .env.cloud \
               -f databases/user-db/docker-compose.yml \
               -f databases/measurement-db/docker-compose.yml \
               -f save-service/docker-compose.yml \
               -f analyze-service/docker-compose.yml down -v
echo "Cloud services stopped"

echo "✅ All services stopped successfully"
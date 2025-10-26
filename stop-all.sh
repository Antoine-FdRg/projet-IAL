#!/bin/bash

echo "🛑 Stopping all services..."

# Stop save service
echo "Stopping save service..."
cd save-service && docker-compose down && cd ..

# Stop pipeline services
echo "Stopping pipeline services..."
docker-compose -p ial-pipeline \
               --env-file .env.docker \
               --env-file .env.queues \
               --file box/broker/docker-compose.yml \
               --file box/broker-client/docker-compose.yml \
               --file box/cleaner/docker-compose.yml \
               --file box/outlier-filter/docker-compose.yml \
               --file box/normalizer/docker-compose.yml down

# Stop measurement database
echo "Stopping measurement database..."
cd databases/measurement-db && docker-compose down && cd ../..

echo "✅ All services stopped"

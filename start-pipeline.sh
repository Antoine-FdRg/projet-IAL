#! /bin/bash

# Start the measurement database first
echo "🚀 Starting measurement database..."
cd databases/measurement-db && docker-compose up -d && cd ../..

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Start the pipeline services
echo "🚀 Starting pipeline services..."
docker-compose -p ial-pipeline \
  --env-file .env.docker \
  --env-file .env.queues \
  -f box/broker/docker-compose.yml \
  -f box/broker-client/docker-compose.yml \
  -f box/cleaner/docker-compose.yml \
  -f box/outlier-filter/docker-compose.yml \
  -f box/normalizer/docker-compose.yml \
  up -d

# Start the save service
echo "🚀 Starting save service..."
cd save-service && docker-compose up -d && cd ..

echo "✅ Pipeline started successfully"
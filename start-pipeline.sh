#! /bin/bash

# Start the measurement database first
echo "🚀 Starting measurement database..."
cd databases/measurement-db && docker-compose up -d && cd ../..

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Start the pipeline services
echo "🚀 Starting pipeline services..."

echo "Starting MongoDB..."

docker-compose -f box/infra/mongo/docker-compose.yml up -d

echo "✅ MongoDB started successfully"

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready... (5 seconds)"
sleep 5

echo "Testing MongoDB connection..."

docker exec mongo mongosh --quiet --eval 'db.getSiblingDB("messagesdb").auth("app", "root"); print("Connection successful!")' 2>&1

if [ $? -eq 0 ]; then
  echo "✅ MongoDB connection successful"
else
  echo "❌ MongoDB connection failed"
fi

echo "Starting pipeline..."

docker-compose -p ial-pipeline \
  --env-file .env.docker \
  --env-file .env.queues \
  -f databases/user-db/docker-compose.yml \
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

echo "Pipeline and MongoDB are up and running."

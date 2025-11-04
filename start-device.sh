#! /bin/bash

echo "🚀 Starting a device..."

docker-compose -p ial-device \
  --env-file .env.device \
  -f devices/mock-watch/docker-compose.yml \
  up -d

echo "✅ Device started successfully"

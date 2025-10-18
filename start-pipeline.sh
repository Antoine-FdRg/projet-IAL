#! /bin/bash
docker-compose -p ial-pipeline \
  -f pipeline/broker/docker-compose.yml \
  -f box/broker-client/docker-compose.yml \
  -f pipeline/splitter/docker-compose.yml \
  up -d

echo "✅ Pipeline started successfully"
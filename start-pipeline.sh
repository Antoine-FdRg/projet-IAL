#! /bin/bash
docker-compose -p ial-pipeline \
  --env-file .env.docker \
  --env-file .env.queues \
  -f pipeline/broker/docker-compose.yml \
  -f box/broker-client/docker-compose.yml \
  -f pipeline/cleaner/docker-compose.yml \
  -f pipeline/outlier-filter/docker-compose.yml \
  -f pipeline/normalizer/docker-compose.yml \
  -f pipeline/splitter/docker-compose.yml \
  up -d

echo "✅ Pipeline started successfully"
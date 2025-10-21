#! /bin/bash
docker-compose -p ial-pipeline-prod \
  --env-file .env.queues \
  --env-file .env.production \
  -f pipeline/broker/docker-compose.yml \
  -f box/broker-client/docker-compose.yml \
  -f pipeline/cleaner/docker-compose.yml \
  -f pipeline/outlier-filter/docker-compose.yml \
  -f pipeline/normalizer/docker-compose.yml \
  up -d

echo "✅ Pipeline started successfully in production mode"
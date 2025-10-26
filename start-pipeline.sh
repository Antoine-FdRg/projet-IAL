#! /bin/bash
docker-compose -p ial-pipeline \
  --env-file .env.docker \
  --env-file .env.queues \
  -f box/broker/docker-compose.yml \
  -f box/broker-client/docker-compose.yml \
  -f box/cleaner/docker-compose.yml \
  -f box/outlier-filter/docker-compose.yml \
  -f box/normalizer/docker-compose.yml \
  -f databases/user-db/docker-compose.yml \
  up -d

echo "✅ Pipeline started successfully"
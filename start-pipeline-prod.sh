#! /bin/bash
docker-compose -p ial-pipeline-prod \
  --env-file .env.queues \
  --env-file .env.production \
  -f box/broker/docker-compose-prod.yml \
  -f box/broker-client/docker-compose-prod.yml \
  -f box/cleaner/docker-compose-prod.yml \
  -f box/outlier-filter/docker-compose-prod.yml \
  -f box/normalizer/docker-compose-prod.yml \
  up -d

echo "✅ Pipeline started successfully in production mode"
#! /bin/bash
docker-compose -p ial-pipeline-prod \
  --env-file .env.queues \
  --env-file .env.production \
  -f pipeline/broker/docker-compose-prod.yml \
  -f box/broker-client/docker-compose-prod.yml \
  -f pipeline/cleaner/docker-compose-prod.yml \
  up -d

echo "✅ Pipeline started successfully in production mode"
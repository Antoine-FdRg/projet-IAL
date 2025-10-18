#! /bin/bash
docker-compose -p ial-pipeline-prod \
  -f pipeline/broker/docker-compose-prod.yml \
  -f box/broker-client/docker-compose-prod.yml \
  -f pipeline/splitter/docker-compose-prod.yml \
  up -d

echo "✅ Pipeline started successfully in production mode"
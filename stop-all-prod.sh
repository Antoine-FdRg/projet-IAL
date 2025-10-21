#!/bin/bash

echo "stopping all"
docker-compose -p ial-pipeline-prod \
               --env-file .env.queues \
               --env-file .env.production \
               --file pipeline/broker/docker-compose-prod.yml \
               --file box/broker-client/docker-compose-prod.yml \
               --file pipeline/cleaner/docker-compose-prod.yml \
               --file pipeline/outlier-filter/docker-compose-prod.yml \
               --file pipeline/normalizer/docker-compose-prod.yml down

echo "all services stopped"

#!/bin/bash

echo "stopping all"
docker-compose -p ial-pipeline-prod \
               --env-file .env.queues \
               --env-file .env.production \
               --file box/broker/docker-compose-prod.yml \
               --file box/broker-client/docker-compose-prod.yml \
               --file box/cleaner/docker-compose-prod.yml \
               --file box/outlier-filter/docker-compose-prod.yml \
               --file box/normalizer/docker-compose-prod.yml down

echo "all services stopped"

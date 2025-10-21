#!/bin/bash

echo "stopping all"
docker-compose -p ial-pipeline \
               --env-file .env.docker \
               --env-file .env.queues \
               --file pipeline/broker/docker-compose.yml \
               --file box/broker-client/docker-compose.yml \
               --file pipeline/cleaner/docker-compose.yml \
               --file pipeline/outlier-filter/docker-compose.yml \
               --file pipeline/normalizer/docker-compose.yml down

echo "all services stopped"

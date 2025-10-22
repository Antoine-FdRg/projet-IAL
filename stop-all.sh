#!/bin/bash

echo "stopping all"
docker-compose -p ial-pipeline \
               --env-file .env.docker \
               --env-file .env.queues \
               --file box/broker/docker-compose.yml \
               --file box/broker-client/docker-compose.yml \
               --file box/cleaner/docker-compose.yml \
               --file box/outlier-filter/docker-compose.yml \
               --file box/normalizer/docker-compose.yml down

echo "all services stopped"

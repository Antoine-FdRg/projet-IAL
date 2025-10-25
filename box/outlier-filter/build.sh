#!/bin/bash

# Optionnel: active BuildKit (plus rapide et logs clairs en CI)
export DOCKER_BUILDKIT=${DOCKER_BUILDKIT:-1}
export BUILDKIT_PROGRESS=${BUILDKIT_PROGRESS:-plain}

trap 'echo "❌ Build échoué: ial/outlier-filter"; exit 1' ERR

# Building docker image
echo "Begin: Building docker image ial/outlier-filter"
docker build -t "ial/outlier-filter" .
echo "Done: Building docker image ial/outlier-filter"

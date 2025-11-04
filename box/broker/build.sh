#!/bin/bash
set -Eeuo pipefail

# Optionnel: active BuildKit (plus rapide et logs clairs en CI)
export DOCKER_BUILDKIT=${DOCKER_BUILDKIT:-1}
export BUILDKIT_PROGRESS=${BUILDKIT_PROGRESS:-plain}

trap 'echo "❌ Build échoué: ial/setup-stream"; exit 1' ERR

echo "Begin: Building docker image ial/setup-stream"
docker build -t "ial/setup-stream" .
echo "✅ Done: Building docker image ial/setup-stream"
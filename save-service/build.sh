#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE_NAME="ial-save-service"
IMAGE_TAG="latest"

echo "🔨 Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"

docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

if [ $? -eq 0 ]; then
    echo "✅ Successfully built ${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo "❌ Failed to build ${IMAGE_NAME}:${IMAGE_TAG}"
    exit 1
fi

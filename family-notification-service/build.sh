#!/bin/bash

# Build script for family-notification-service
# Builds the Docker image with proper tagging

set -e

SERVICE_NAME="family-notification-service"
IMAGE_NAME="ial/${SERVICE_NAME}"
IMAGE_TAG="latest"

echo "========================================="
echo "Building ${SERVICE_NAME}"
echo "========================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the service directory
cd "${SCRIPT_DIR}"

# Build the Docker image
echo "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "========================================="
echo "Build complete!"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "========================================="

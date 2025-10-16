#!/bin/bash
# Manual script to build and push DevContainer image to GitHub Container Registry
# This is useful for testing or when you need to push immediately

set -e

# Configuration
REGISTRY="ghcr.io"
IMAGE_NAME="fengyuan213/sse_group_project/devcontainer"
TAG="${1:-latest}" # Use first argument as tag, default to 'latest'

echo "🔨 Building DevContainer image..."
docker build -t "${REGISTRY}/${IMAGE_NAME}:${TAG}" -f Dockerfile .

echo ""
echo "📦 Pushing to GitHub Container Registry..."
echo "   Image: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
echo ""
echo "⚠️  You need to be logged in to GitHub Container Registry first:"
echo "   docker login ghcr.io -u YOUR_GITHUB_USERNAME"
echo ""

read -p "Continue with push? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker push "${REGISTRY}/${IMAGE_NAME}:${TAG}"
    echo ""
    echo "✅ Successfully pushed to ${REGISTRY}/${IMAGE_NAME}:${TAG}"
    echo ""
    echo "📝 Update docker-compose.yml to use this image:"
    echo "   image: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
else
    echo "❌ Push cancelled"
fi


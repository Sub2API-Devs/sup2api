#!/usr/bin/env bash
# Build the standalone AI Gateway image from the repository source tree.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
IMAGE="${1:-${AI_GATEWAY_IMAGE:-sup2api/ai-gateway:local}}"

docker build \
    --tag "${IMAGE}" \
    --file "${REPO_ROOT}/ai-gateway/Dockerfile" \
    "${REPO_ROOT}/ai-gateway"

echo "Built AI Gateway image: ${IMAGE}"

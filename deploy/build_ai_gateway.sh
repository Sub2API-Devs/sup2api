#!/usr/bin/env bash
# Build the standalone AI Gateway image from the repository source tree.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKERFILE="${REPO_ROOT}/ai-gateway/Dockerfile"
IMAGE="${1:-${AI_GATEWAY_IMAGE:-sup2api/ai-gateway:local}}"
GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
GOSUMDB="${GOSUMDB:-sum.golang.google.cn}"

# BuildKit 解析 `# syntax=` / FROM 时会直连 auth.docker.io，国内常 30s 超时。
# `docker pull` 走另一条路径通常可用；先拉到本地，后面的 docker build 才能命中缓存。
pre_pull() {
    local image="$1"
    if docker image inspect "${image}" >/dev/null 2>&1; then
        echo ">> using local image ${image}"
        return
    fi
    echo ">> docker pull ${image}"
    docker pull "${image}"
}

if syntax_tag="$(sed -n 's/^# syntax=docker\/dockerfile:\([^[:space:]]*\).*/\1/p' "${DOCKERFILE}" | head -n 1)" \
    && [[ -n "${syntax_tag}" ]]; then
    pre_pull "docker/dockerfile:${syntax_tag}"
fi

while IFS= read -r image; do
    [[ -n "${image}" ]] || continue
    pre_pull "${image}"
done < <(sed -n -E 's/^ARG (GOLANG_IMAGE|ALPINE_IMAGE)=([^[:space:]]*).*/\2/p' "${DOCKERFILE}")

docker build \
    --tag "${IMAGE}" \
    --build-arg GOPROXY="${GOPROXY}" \
    --build-arg GOSUMDB="${GOSUMDB}" \
    --file "${DOCKERFILE}" \
    "${REPO_ROOT}/ai-gateway"

echo "Built AI Gateway image: ${IMAGE}"

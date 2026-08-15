#!/usr/bin/env bash
# 构建本目录 docker compose 需要的全部镜像，不启动容器。
#   1. docker pull 运行时镜像（postgres / redis / nats）
#   2. docker pull 构建基础镜像（避免 BuildKit 直连 auth.docker.io 超时）
#   3. docker build sub2api
#   4. docker build AI Gateway
#
# 用法（在 sup2api/ 目录）：
#   ./build_all.sh
#   ./build_all.sh --pull-only          # 只拉镜像，不 build
#   ./build_all.sh --app-only           # 只构建应用镜像，不拉 postgres/redis/nats
# 启动请用：docker compose up -d
#
# 镜像名优先读本目录 .env，否则用 .env.example 里的默认值。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DOCKERFILE="${REPO_ROOT}/Dockerfile"
GATEWAY_DOCKERFILE="${REPO_ROOT}/ai-gateway/Dockerfile"
ENV_FILE="${SCRIPT_DIR}/.env"

SUB2API_IMAGE="${SUB2API_IMAGE:-sub2api:latest}"
AI_GATEWAY_IMAGE="${AI_GATEWAY_IMAGE:-sup2api/ai-gateway:local}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:18-alpine}"
REDIS_IMAGE="${REDIS_IMAGE:-redis:8-alpine}"
NATS_IMAGE="${NATS_IMAGE:-nats:2.11-alpine}"
GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
GOSUMDB="${GOSUMDB:-sum.golang.google.cn}"

PULL_RUNTIME=1
BUILD_APPS=1

usage() {
    sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
}

load_env() {
    if [[ ! -f "${ENV_FILE}" ]]; then
        return
    fi
    local key
    for key in SUB2API_IMAGE AI_GATEWAY_IMAGE POSTGRES_IMAGE REDIS_IMAGE NATS_IMAGE GOPROXY GOSUMDB; do
        local line value
        line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
        [[ -n "${line}" ]] || continue
        value="${line#*=}"
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        printf -v "${key}" '%s' "${value}"
    done
}

pre_pull() {
    local image="$1"
    if docker image inspect "${image}" >/dev/null 2>&1; then
        echo ">> using local image ${image}"
        return
    fi
    echo ">> docker pull ${image}"
    docker pull "${image}"
}

pre_pull_dockerfile_images() {
    local dockerfile="$1"
    local syntax_tag image
    if syntax_tag="$(sed -n 's/^# syntax=docker\/dockerfile:\([^[:space:]]*\).*/\1/p' "${dockerfile}" | head -n 1)" \
        && [[ -n "${syntax_tag}" ]]; then
        pre_pull "docker/dockerfile:${syntax_tag}"
    fi
    while IFS= read -r image; do
        [[ -n "${image}" ]] || continue
        pre_pull "${image}"
    done < <(sed -n -E 's/^ARG (NODE_IMAGE|GOLANG_IMAGE|ALPINE_IMAGE|POSTGRES_IMAGE)=([^[:space:]]*).*/\2/p' "${dockerfile}")
}

build_sub2api() {
    echo ">> docker build ${SUB2API_IMAGE}"
    docker build \
        --tag "${SUB2API_IMAGE}" \
        --build-arg GOPROXY="${GOPROXY}" \
        --build-arg GOSUMDB="${GOSUMDB}" \
        --file "${APP_DOCKERFILE}" \
        "${REPO_ROOT}"
}

build_ai_gateway() {
    echo ">> docker build AI Gateway ${AI_GATEWAY_IMAGE}"
    docker build \
        --tag "${AI_GATEWAY_IMAGE}" \
        --build-arg GOPROXY="${GOPROXY}" \
        --build-arg GOSUMDB="${GOSUMDB}" \
        --file "${GATEWAY_DOCKERFILE}" \
        "${REPO_ROOT}/ai-gateway"
    echo ">> built AI Gateway ${AI_GATEWAY_IMAGE}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --pull-only) BUILD_APPS=0 ;;
        --app-only) PULL_RUNTIME=0 ;;
        -h|--help) usage; exit 0 ;;
        *)
            echo "unknown argument: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
    shift
done

load_env

echo "==> images"
echo "    sub2api     ${SUB2API_IMAGE}"
echo "    ai-gateway  ${AI_GATEWAY_IMAGE}"
echo "    postgres    ${POSTGRES_IMAGE}"
echo "    redis       ${REDIS_IMAGE}"
echo "    nats        ${NATS_IMAGE}"

if [[ "${PULL_RUNTIME}" -eq 1 ]]; then
    echo "==> pull runtime images"
    pre_pull "${POSTGRES_IMAGE}"
    pre_pull "${REDIS_IMAGE}"
    pre_pull "${NATS_IMAGE}"
fi

if [[ "${BUILD_APPS}" -eq 1 ]]; then
    echo "==> pull build base images"
    pre_pull_dockerfile_images "${APP_DOCKERFILE}"
    pre_pull_dockerfile_images "${GATEWAY_DOCKERFILE}"
    echo "==> build sub2api"
    build_sub2api
    echo "==> build AI Gateway"
    build_ai_gateway
fi

echo "==> images ready (not started). Next: docker compose up -d"
docker image inspect \
    --format '{{.RepoTags}}  {{.Size}}' \
    "${SUB2API_IMAGE}" \
    "${AI_GATEWAY_IMAGE}" \
    "${POSTGRES_IMAGE}" \
    "${REDIS_IMAGE}" \
    "${NATS_IMAGE}" \
    2>/dev/null || true

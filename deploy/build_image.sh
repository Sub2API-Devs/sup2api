#!/usr/bin/env bash
# 本地构建镜像的快速脚本，避免在命令行反复输入构建参数。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKERFILE="${REPO_ROOT}/Dockerfile"

# BuildKit 解析 `# syntax=` / FROM 时会直连 auth.docker.io，国内常 30s 超时。
# 这和 shell 里的 all_proxy 无关：拉镜像的是 OrbStack daemon，不读终端代理。
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
done < <(sed -n -E 's/^ARG (NODE_IMAGE|GOLANG_IMAGE|ALPINE_IMAGE|POSTGRES_IMAGE)=([^[:space:]]*).*/\2/p' "${DOCKERFILE}")

docker build -t sub2api:latest \
    --build-arg GOPROXY=https://goproxy.cn,direct \
    --build-arg GOSUMDB=sum.golang.google.cn \
    -f "${DOCKERFILE}" \
    "${REPO_ROOT}"

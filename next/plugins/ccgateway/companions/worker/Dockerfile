# 第一阶段：构建 Go 应用
FROM golang:1.27-bookworm AS builder

WORKDIR /build/worker

# 复制 go mod 文件
COPY go.mod go.sum ../
COPY worker/go.mod worker/go.sum ./
COPY contracts/go.mod ../contracts/
RUN go mod download

# 复制源代码
COPY . ..

# 构建二进制文件
ARG WORKER_VERSION=dev
ARG SOURCE_REVISION=unknown
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo \
    -ldflags="-w -s -X ccgateway/worker/internal/server.Version=${WORKER_VERSION} -X ccgateway/worker/internal/server.Revision=${SOURCE_REVISION}" \
    -o /tmp/worker ./cmd/worker

# 第二阶段：运行镜像（基于 node，包含 Claude Code CLI）
FROM node:22-bookworm-slim

# 安装 Claude Code CLI
ARG CLAUDE_VERSION=2.1.292
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @anthropic-ai/claude-code@${CLAUDE_VERSION}

# 创建非 root 用户和工作目录
RUN mkdir -p /work/config /work/data /work/history && \
    chown -R node:node /work

# 复制 Go 二进制文件
COPY --from=builder /tmp/worker /usr/local/bin/worker

# 切换到非 root 用户
USER node
WORKDIR /work

# 环境变量
ENV CLAUDE_CONFIG_DIR=/work/config \
    CLAUDE_SECURESTORAGE_CONFIG_DIR=/work/config \
    DISABLE_AUTOUPDATER=1 \
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
    CCG_BIND=0.0.0.0:8787 \
    CCG_DATA_DIR=/work/data \
    CACHE_DIR=/work/data/cache

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f "http://localhost:${WORKER_PORT:-8787}/health" || exit 1

# 暴露端口
EXPOSE 8787

# 启动服务
ENTRYPOINT ["/usr/local/bin/worker"]

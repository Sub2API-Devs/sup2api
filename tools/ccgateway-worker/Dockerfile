# 构建阶段
FROM golang:1.21-alpine AS builder

WORKDIR /build

# 安装构建依赖
RUN apk add --no-cache git make

# 复制依赖文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建二进制文件
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo \
    -ldflags="-w -s" \
    -o worker ./cmd/worker

# 运行阶段
FROM alpine:3.18

# 安装运行时依赖
RUN apk add --no-cache ca-certificates curl

# 创建非 root 用户
RUN addgroup -g 1000 worker && \
    adduser -D -u 1000 -G worker worker

# 创建必要的目录
RUN mkdir -p /root/.claude /var/lib/worker/cache && \
    chown -R worker:worker /root/.claude /var/lib/worker

# 复制二进制文件
COPY --from=builder /build/worker /usr/local/bin/worker

# 切换到非 root 用户
USER worker

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8788/health || exit 1

# 暴露端口
EXPOSE 8788

# 启动命令
ENTRYPOINT ["/usr/local/bin/worker"]

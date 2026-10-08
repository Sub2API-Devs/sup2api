# Build from the repository root: docker build -f backend/Dockerfile .
FROM golang:1.27.0-alpine

WORKDIR /app/backend

# 安装必要的工具
RUN apk add --no-cache git

# 复制go.mod和go.sum
COPY backend/go.mod backend/go.sum ./
COPY next/protocol-codec/ /app/next/protocol-codec/

# 下载依赖
RUN go mod download

# 复制源代码
COPY backend/ .

# 构建应用
RUN VERSION_VALUE="$(./scripts/resolve-version.sh)" && \
    go build -ldflags="-s -w -X main.Version=${VERSION_VALUE}" -o main ./cmd/server/

# 暴露端口
EXPOSE 8080

# 运行应用
CMD ["./main"]

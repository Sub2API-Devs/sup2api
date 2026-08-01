# syntax=docker/dockerfile:1.7

ARG GOLANG_IMAGE=golang:1.26.1-alpine
ARG ALPINE_IMAGE=alpine:3.23

FROM ${GOLANG_IMAGE} AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates git
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/ai-gateway ./cmd/ai-gateway

FROM ${ALPINE_IMAGE}
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S -g 10001 gateway \
    && adduser -S -D -H -u 10001 -G gateway gateway \
    && mkdir -p /var/lib/ai-gateway /var/lib/caddy /etc/caddy \
    && chown -R gateway:gateway /var/lib/ai-gateway /var/lib/caddy /etc/caddy

ENV XDG_DATA_HOME=/var/lib/caddy \
    XDG_CONFIG_HOME=/etc/caddy \
    AI_GATEWAY_SETTLEMENT_WAL_PATH=/var/lib/ai-gateway/data/settlements
WORKDIR /var/lib/ai-gateway
COPY --from=builder /out/ai-gateway /usr/local/bin/ai-gateway
USER gateway
EXPOSE 9999
VOLUME ["/var/lib/ai-gateway/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -T 2 -O /dev/null http://127.0.0.1:9999/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/ai-gateway"]

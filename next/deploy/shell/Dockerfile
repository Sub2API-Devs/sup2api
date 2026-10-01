# syntax=docker/dockerfile:1.7
# Build from next/: docker build -f deploy/shell/Dockerfile -t sup2api-shell .
ARG GO_IMAGE=golang:1.27-trixie
ARG RUNTIME_IMAGE=debian:trixie-slim
FROM ${GO_IMAGE} AS build
ENV CGO_ENABLED=0 GOWORK=off
WORKDIR /src
COPY runtime-contract ./runtime-contract
COPY shell ./shell
WORKDIR /src/shell
RUN --mount=type=cache,id=sub2api-next-gomod,target=/go/pkg/mod \
    --mount=type=cache,id=sub2api-next-gobuild,target=/root/.cache/go-build \
    go build -trimpath -o /out/sub2api-shell ./cmd/sub2api-shell && \
    go build -trimpath -o /out/sub2api-release ./cmd/sub2api-release

FROM ${RUNTIME_IMAGE}
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1000 sub2api \
    && useradd -u 1000 -g sub2api -d /var/lib/sub2api -s /usr/sbin/nologin sub2api \
    && mkdir -p /var/lib/sub2api /etc/sub2api \
    && chown 1000:1000 /var/lib/sub2api
COPY --from=build /out/ /usr/local/bin/
USER 1000:1000
WORKDIR /var/lib/sub2api
EXPOSE 8080 7443
STOPSIGNAL SIGTERM
ENTRYPOINT ["sub2api-shell"]
CMD ["serve", "-config", "/etc/sub2api/shell.json"]

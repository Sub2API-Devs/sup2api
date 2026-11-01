# ccgateway-guard (next/docs/ccgateway-guard/03 §9.7). Build context: this
# directory. CI passes only VERSION; the Docker CLI and compose plugin
# versions default to the ones on ovh (03 §9.1: same compose as the host).
FROM golang:1.27-bookworm@sha256:972b4110ba0f47539a975c31e52c64765e1ff19f2d74469ae4a595c6676e80a5 AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
ARG VERSION=dev
# Bounded like the worker image: on a many-core host (384 on ovh) an
# unbounded build exceeds the build cgroup's task limit.
ARG BUILD_MAX_PROCS=2
RUN CGO_ENABLED=0 GOWORK=off GOMAXPROCS=${BUILD_MAX_PROCS} go build -p ${BUILD_MAX_PROCS} -trimpath -ldflags "-s -w -X main.version=${VERSION}" \
      -o /out/ccgateway-guard ./cmd/ccgateway-guard

FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4
ARG DOCKER_CLI_VERSION=29.5.2
ARG COMPOSE_VERSION=5.1.4
# Docker's release signing key (https://download.docker.com/linux/debian/gpg).
ARG DOCKER_REPO_FPR=9DC858229FC7DD38854AE2D88D81803C0EBFCD88
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends iptables iproute2 util-linux ca-certificates curl gnupg; \
    install -d -m 0755 /etc/apt/keyrings; \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /tmp/docker.asc; \
    gpg --show-keys --with-colons /tmp/docker.asc | awk -F: '$1 == "fpr" { print $10 }' | grep -qx "$DOCKER_REPO_FPR"; \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg /tmp/docker.asc; \
    rm /tmp/docker.asc; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian trixie stable" \
      > /etc/apt/sources.list.d/docker.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      "docker-ce-cli=5:${DOCKER_CLI_VERSION}-1~debian.13~trixie" \
      "docker-compose-plugin=${COMPOSE_VERSION}-1~debian.13~trixie"; \
    update-alternatives --set iptables /usr/sbin/iptables-nft; \
    update-alternatives --set ip6tables /usr/sbin/ip6tables-nft; \
    apt-get purge -y curl gnupg; \
    apt-get autoremove -y; \
    rm -rf /var/lib/apt/lists/* /root/.gnupg; \
    iptables -V | grep -q nf_tables; \
    docker compose version
COPY --from=build /out/ccgateway-guard /usr/local/bin/ccgateway-guard
ENV DOCKER_CONFIG=/tmp/.docker
LABEL io.sup2api.ccgateway.guard="1"
# No ENTRYPOINT: `docker compose run guard ccgateway-guard print-rules`.
CMD ["/usr/local/bin/ccgateway-guard", "serve"]

FROM golang:1.27-bookworm AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /ccgateway .

FROM node:22-bookworm-slim
ARG CLAUDE_VERSION=2.1.304
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates locales tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /work/config /work/data && chown -R node:node /work
COPY cli-mods/release/ /opt/ccgateway/cli/
RUN test -f /opt/ccgateway/cli/${CLAUDE_VERSION}/claude \
    && chmod -R a+rX,go-w /opt/ccgateway \
    && chmod 755 /opt/ccgateway/cli/${CLAUDE_VERSION}/claude \
    && ln -s /opt/ccgateway/cli/${CLAUDE_VERSION}/claude /usr/local/bin/claude
COPY contracts/environment/locales.json contracts/environment/install-locales.cjs /tmp/container-locales/
RUN node /tmp/container-locales/install-locales.cjs
COPY --from=build /ccgateway /usr/local/bin/ccgateway
USER node
WORKDIR /work
ENV CCG_BIND=0.0.0.0:8787 CCG_DATA_DIR=/work/data CLAUDE_CONFIG_DIR=/work/config CLAUDE_SECURESTORAGE_CONFIG_DIR=/work/config DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
EXPOSE 8787
CMD ["ccgateway"]

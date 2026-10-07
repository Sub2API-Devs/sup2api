FROM golang:1.27-bookworm AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /ccgateway .

FROM node:22-bookworm-slim
ARG CLAUDE_VERSION=2.1.288
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @anthropic-ai/claude-code@${CLAUDE_VERSION} \
    && mkdir -p /work/config /work/data && chown -R node:node /work
COPY --from=build /ccgateway /usr/local/bin/ccgateway
USER node
WORKDIR /work
ENV CCG_BIND=0.0.0.0:8787 CCG_DATA_DIR=/work/data CLAUDE_CONFIG_DIR=/work/config CLAUDE_SECURESTORAGE_CONFIG_DIR=/work/config DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
EXPOSE 8787
CMD ["ccgateway"]

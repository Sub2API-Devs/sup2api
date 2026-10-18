FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates bash git \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /home/claude/work && chown -R 1000:1000 /home/claude
COPY --chmod=755 claude-linux-native /usr/local/bin/claude
ENV HOME=/home/claude \
    DISABLE_AUTOUPDATER=1
USER 1000:1000
WORKDIR /home/claude/work
ENTRYPOINT ["/usr/local/bin/claude"]

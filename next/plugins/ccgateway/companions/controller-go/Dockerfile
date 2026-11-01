# CCGateway controller (Go, guard mode): one static binary on scratch.
# Built from this directory (next/plugins/ccgateway/companions/controller-go).
FROM golang:1.27-bookworm AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
ARG VERSION=dev
# Bounded like the worker image: on a many-core host (384 on ovh) an
# unbounded build exceeds the build cgroup's task limit.
ARG BUILD_MAX_PROCS=2
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOWORK=off GOMAXPROCS=${BUILD_MAX_PROCS} \
    go build -p ${BUILD_MAX_PROCS} -trimpath -ldflags "-s -w -X main.buildVersion=${VERSION}" -o /out/ccg-controller ./cmd/ccg-controller \
 && mkdir -p /out/data /out/tmp && chmod 0700 /out/data && chmod 1777 /out/tmp

FROM scratch
COPY --from=build /out/ccg-controller /ccg-controller
COPY --from=build /out/data /data
COPY --from=build /out/tmp /tmp
# shared-egress=1: the Python 0.1.118 downgrade check accepts this image;
# guard-api=1: the guard upgrades the controller only to images with both.
LABEL io.sup2api.ccgateway.shared-egress="1" \
      io.sup2api.ccgateway.guard-api="1"
# Reported by GET /health; CI passes the source commit. An installer may still
# override it in the environment file (the guard drops that line on upgrade).
ARG VERSION=dev
ENV CCG_CONTROLLER_VERSION=$VERSION
ENV CCG_DEFAULT_CLI_VERSION=2.1.312
USER 0:0
EXPOSE 8787
HEALTHCHECK --interval=5s --timeout=4s --start-period=10s --retries=3 CMD ["/ccg-controller", "healthcheck"]
# CMD only (no ENTRYPOINT): compose and the guard run /ccg-controller with
# an explicit subcommand; the image has no shell.
CMD ["/ccg-controller", "serve"]

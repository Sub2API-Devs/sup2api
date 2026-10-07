FROM ghcr.io/sagernet/sing-box:v1.12.14 AS singbox
FROM alpine:3.22
RUN apk add --no-cache iproute2 nftables ca-certificates
COPY --from=singbox /usr/local/bin/sing-box /usr/local/bin/sing-box
COPY egress.sh /usr/local/bin/egress
ENTRYPOINT ["/bin/sh", "/usr/local/bin/egress"]

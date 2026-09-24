#!/bin/sh
# Container entrypoint for sub2api-next.
#
# When the image carries a dev signing key (/opt/sub2api/market/dev-official.pub,
# written at build time) and the operator did not configure trust explicitly,
# derive:
#   SUB2API_PLUGIN_OFFICIAL_KEYS = "<keyId>=<pub>"
#   SUB2API_MARKET_SOURCES       = [{"name":"local-dev","url":$SUB2API_DEV_MARKET_URL,"public_key":<pub>}]
# Production deployments set both variables and ignore the dev key.
set -eu
# The key that signed this image's built-in plugins is always trusted.
BUILTIN=/opt/sub2api/builtin
if [ -f "$BUILTIN/trust.pub" ] && [ -z "${SUB2API_BUILTIN_TRUST_KEY:-}" ]; then
  bkid=$(tr -d ' \r\n' < "$BUILTIN/trust.keyid" 2>/dev/null || echo sub2api-dev)
  export SUB2API_BUILTIN_TRUST_KEY="$bkid=$(tr -d ' \r\n' < "$BUILTIN/trust.pub")"
fi
MARKET=/opt/sub2api/market
if [ -f "$MARKET/dev-official.pub" ] && [ "${SUB2API_USE_DEV_KEYS:-true}" = "true" ]; then
  pub=$(tr -d ' \r\n' < "$MARKET/dev-official.pub")
  kid=$(tr -d ' \r\n' < "$MARKET/dev-official.keyid" 2>/dev/null || echo sub2api-dev)
  if [ -z "${SUB2API_PLUGIN_OFFICIAL_KEYS:-}" ]; then
    export SUB2API_PLUGIN_OFFICIAL_KEYS="$kid=$pub"
  fi
  if [ -z "${SUB2API_MARKET_SOURCES:-}" ] && [ -n "${SUB2API_DEV_MARKET_URL:-}" ]; then
    export SUB2API_MARKET_SOURCES="[{\"name\":\"local-dev\",\"url\":\"$SUB2API_DEV_MARKET_URL\",\"public_key\":\"$pub\"}]"
  fi
fi
exec "$@"

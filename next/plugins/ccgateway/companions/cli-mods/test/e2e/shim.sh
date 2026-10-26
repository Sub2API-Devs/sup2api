#!/bin/sh
# Harness shim, NOT part of the product: the image's patched CLI cannot finish
# `auth status --json` in an offline container (it waits on api.anthropic.com
# management endpoints; the official 2.1.304 binary answers in under a second).
# The Worker's resource-identity path calls that subcommand, so this shim
# answers only it and delegates every other invocation to the image's CLI.
# run.sh installs it as bin/claude-shim with @CC_VERSION@ replaced.
if [ "${1:-}" = "auth" ] && [ "${2:-}" = "status" ]; then
  if [ -n "${ANTHROPIC_API_KEY:-}" ]; then method=api_key; source=ANTHROPIC_API_KEY
  else method=oauth_token; source=; fi
  printf '{"loggedIn":true,"authMethod":"%s","apiProvider":"firstParty","apiKeySource":"%s","configDirectory":"%s"}\n' \
    "$method" "$source" "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
  exit 0
fi
exec /opt/ccgateway/cli/@CC_VERSION@/claude "$@"

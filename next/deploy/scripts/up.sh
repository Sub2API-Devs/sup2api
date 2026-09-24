#!/usr/bin/env bash
# up.sh [--no-cache] — run ON the test server: build images and (re)start the
# stack, then wait until Caddy answers /healthz.
source "$(dirname "$0")/lib.sh"
ensure_env

BUILD_ARGS=()
for a in "$@"; do
  case "$a" in
    --no-cache) BUILD_ARGS+=(--no-cache) ;;
    "") ;;
    *) echo "unknown argument: $a" >&2; exit 2 ;;
  esac
done

echo "==> building"
compose build "${BUILD_ARGS[@]}"
echo "==> starting"
compose up -d --remove-orphans
# The Caddyfile is bind-mounted and the admin API is off: restart to pick up edits.
compose restart caddy

echo "==> waiting for http://127.0.0.1:3120/healthz"
for i in $(seq 1 60); do
  if out=$(curl -fsS --max-time 2 http://127.0.0.1:3120/healthz 2>/dev/null); then
    echo "$out"
    break
  fi
  if [ "$i" = 60 ]; then
    echo "!! not healthy after 120s" >&2
    compose ps
    compose logs --tail=50 node-1 node-2 caddy >&2
    exit 1
  fi
  sleep 2
done
for n in 1 2; do
  printf 'node-%s: ' "$n"; curl -fsS --max-time 2 "http://127.0.0.1:3120/__node$n/healthz" || echo "DOWN"
  echo
done
compose ps

#!/usr/bin/env bash
# deploy.sh [branch]  -  run ON the server (e.g. ssh ovh 'bash -s' < deploy.sh)
#
# Pulls the code from GitHub into ~/sup2api/src (sparse: next/ only), creates
# ~/sup2api/.env with random secrets on the first run, then builds and starts
# the "sup2api" compose project and waits for /healthz.
#
# Env: SUP2API_DIR (default ~/sup2api), SUP2API_REPO, SUP2API_PORT (3130).
set -euo pipefail
BRANCH=${1:-feat/next-platform}
DIR=${SUP2API_DIR:-$HOME/sup2api}
REPO=${SUP2API_REPO:-https://github.com/Sub2API-Devs/sup2api.git}
PORT=${SUP2API_PORT:-3130}
PORT2=${SUP2API_PORT_2:-3131}
SRC=$DIR/src

mkdir -p "$DIR"
if [ ! -d "$SRC/.git" ]; then
  echo "==> cloning $REPO ($BRANCH)"
  git clone --depth 1 --filter=blob:none --sparse --branch "$BRANCH" "$REPO" "$SRC"
  git -C "$SRC" sparse-checkout set next
else
  echo "==> updating $SRC to origin/$BRANCH"
  git -C "$SRC" fetch --depth 1 origin "$BRANCH"
  git -C "$SRC" checkout -q -B "$BRANCH" FETCH_HEAD
fi
echo "    at $(git -C "$SRC" log -1 --format='%h %s')"

ENV_FILE=$DIR/.env
if [ ! -f "$ENV_FILE" ]; then
  echo "==> creating $ENV_FILE with random secrets"
  umask 077
  cat > "$ENV_FILE" <<EOF
PG_PASSWORD=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
SUB2API_MASTER_KEY=$(head -c 32 /dev/urandom | base64)
SUB2API_JWT_SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '\n')
SUB2API_BOOTSTRAP_ADMIN_EMAIL=admin@sup2api.local
SUB2API_BOOTSTRAP_ADMIN_PASSWORD=$(head -c 18 /dev/urandom | base64 | tr -d '/+=\n')
SUP2API_PORT=$PORT
SUP2API_PUBLIC_URL=http://127.0.0.1:$PORT
EOF
fi

COMPOSE=(docker compose -p sup2api -f "$SRC/next/deploy/single/compose.yml" --env-file "$ENV_FILE")
echo "==> building and starting"
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "==> waiting for /healthz on :$PORT and :$PORT2"
for _ in $(seq 1 60); do
  if out=$(curl -fsS "http://127.0.0.1:$PORT/healthz" 2>/dev/null) && out2=$(curl -fsS "http://127.0.0.1:$PORT2/healthz" 2>/dev/null); then
    echo "    $out"
    echo "    $out2"
    "${COMPOSE[@]}" ps
    exit 0
  fi
  sleep 2
done
echo "sup2api did not become healthy; recent logs:" >&2
"${COMPOSE[@]}" logs --tail 80 app app-2 >&2
exit 1

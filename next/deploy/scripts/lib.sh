# Sourced by the scripts that run on the test server.
# shellcheck shell=bash
set -euo pipefail
DEPLOY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BASE_DIR=${SUB2API_TEST_BASE:-$HOME/sub2api-next-test}
ENV_FILE=${SUB2API_TEST_ENV:-$BASE_DIR/.env}
PROJECT=sub2api-next-test

compose() {
  docker compose -p "$PROJECT" -f "$DEPLOY_DIR/compose.yml" --env-file "$ENV_FILE" "$@"
}

# ensure_env creates $ENV_FILE with random secrets on first use. It lives
# outside src/ so sync.sh never overwrites it.
ensure_env() {
  if [ -f "$ENV_FILE" ]; then return; fi
  mkdir -p "$(dirname "$ENV_FILE")"
  umask 077
  cat > "$ENV_FILE" <<EOF
PG_PASSWORD=$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')
SUB2API_MASTER_KEY=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
SUB2API_JWT_SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '\n')
SUB2API_BOOTSTRAP_ADMIN_EMAIL=admin@sub2api.test
SUB2API_BOOTSTRAP_ADMIN_PASSWORD=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')
SUB2API_VERSION=0.1.0-dev
SUB2API_LOG_LEVEL=info
EOF
  echo "==> created $ENV_FILE (admin credentials inside)"
}

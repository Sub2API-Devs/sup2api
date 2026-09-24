#!/usr/bin/env bash
# down.sh [--purge] — run ON the test server: stop and remove the stack.
# --purge also deletes the volumes (database, plugin data, market).
source "$(dirname "$0")/lib.sh"
ensure_env
if [ "${1:-}" = "--purge" ]; then
  compose down -v --remove-orphans
else
  compose down --remove-orphans
fi

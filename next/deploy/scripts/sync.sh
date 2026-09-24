#!/usr/bin/env bash
# sync.sh [--up] [--no-cache]
#
# Run locally (Git Bash / Linux / macOS). Packs next/ of the current worktree
# (tracked + untracked, honouring .gitignore; uncommitted changes included)
# and replaces ~/sub2api-next-test/src/next on the test server. With --up it
# then runs scripts/up.sh remotely.
#
# Env: SUB2API_TEST_HOST (default ovh), SUB2API_TEST_DIR (default
# sub2api-next-test, relative to the remote $HOME).
set -euo pipefail
HOST=${SUB2API_TEST_HOST:-ovh}
RDIR=${SUB2API_TEST_DIR:-sub2api-next-test}
UP=0
UP_ARGS=()
for a in "$@"; do
  case "$a" in
    --up) UP=1 ;;
    *) UP_ARGS+=("$a") ;;
  esac
done

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
cd "$ROOT"
echo "==> packing $(git rev-parse --abbrev-ref HEAD)@$(git rev-parse --short HEAD) (+ working tree) -> $HOST:~/$RDIR/src/next"

git ls-files -z -co --exclude-standard -- next \
  | tar --null --ignore-failed-read -T - -czf - \
  | ssh "$HOST" "set -e
      mkdir -p ~/$RDIR/src
      rm -rf ~/$RDIR/src/next.new
      mkdir ~/$RDIR/src/next.new
      tar -xzf - -C ~/$RDIR/src/next.new --strip-components=1
      rm -rf ~/$RDIR/src/next
      mv ~/$RDIR/src/next.new ~/$RDIR/src/next
      find ~/$RDIR/src/next -name '*.sh' -exec chmod +x {} +
      echo synced: \$(find ~/$RDIR/src/next -type f | wc -l) files"

if [ "$UP" = 1 ]; then
  ssh "$HOST" "bash ~/$RDIR/src/next/deploy/scripts/up.sh ${UP_ARGS[*]:-}"
fi

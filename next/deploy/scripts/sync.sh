#!/usr/bin/env bash
# sync.sh [--branch <name>] [--up] [--no-cache]
#
# Run locally (Git Bash / Linux / macOS). Makes the test server check out the
# current branch from GitHub into ~/sub2api-next-test/src (sparse: next/ only)
# and verifies it is at the same commit as local HEAD. Only pushed commits are
# deployed: uncommitted changes are not, and an unpushed HEAD is refused.
# With --up it then runs scripts/up.sh remotely.
#
# Env: SUB2API_TEST_HOST (default ovh), SUB2API_TEST_DIR (default
# sub2api-next-test, relative to the remote $HOME), SUB2API_TEST_REPO
# (default: URL of the local origin remote).
set -euo pipefail
HOST=${SUB2API_TEST_HOST:-ovh}
RDIR=${SUB2API_TEST_DIR:-sub2api-next-test}
BRANCH=
UP=0
UP_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --up) UP=1 ;;
    --branch) BRANCH=${2:?--branch needs a value}; shift ;;
    *) UP_ARGS+=("$1") ;;
  esac
  shift
done

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
cd "$ROOT"
BRANCH=${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}
REPO=${SUB2API_TEST_REPO:-$(git remote get-url origin)}

git fetch -q origin "$BRANCH"
REMOTE_SHA=$(git rev-parse FETCH_HEAD)
if [ "$BRANCH" = "$(git rev-parse --abbrev-ref HEAD)" ]; then
  if [ "$(git rev-parse HEAD)" != "$REMOTE_SHA" ]; then
    echo "!! local HEAD $(git rev-parse --short HEAD) != origin/$BRANCH $(git rev-parse --short "$REMOTE_SHA"); push (or pull) first" >&2
    exit 1
  fi
  if [ -n "$(git status --porcelain -- next)" ]; then
    echo "   note: uncommitted changes under next/ are NOT deployed"
  fi
fi
echo "==> $HOST:~/$RDIR/src <- $BRANCH@$(git rev-parse --short "$REMOTE_SHA")"

ssh "$HOST" "set -e
  cd ~/$RDIR
  if [ ! -d src/.git ]; then
    # first run, or a tree left by the old tar-based sync: replace it with a clone
    rm -rf src.new
    git clone -q --depth 1 --filter=blob:none --sparse --branch '$BRANCH' '$REPO' src.new
    git -C src.new sparse-checkout set next
    rm -rf src
    mv src.new src
  else
    git -C src fetch -q --depth 1 origin '$BRANCH'
    git -C src checkout -q -f -B '$BRANCH' FETCH_HEAD
    git -C src clean -qfd
  fi
  got=\$(git -C src rev-parse HEAD)
  if [ \"\$got\" != '$REMOTE_SHA' ]; then
    echo \"!! server is at \$got, expected $REMOTE_SHA\" >&2
    exit 1
  fi
  echo \"   at \$(git -C src log -1 --format='%h %s')\""

if [ "$UP" = 1 ]; then
  ssh "$HOST" "bash ~/$RDIR/src/next/deploy/scripts/up.sh ${UP_ARGS[*]:-}"
fi

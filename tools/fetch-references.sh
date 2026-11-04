#!/usr/bin/env bash
# Fetches the 2.1.88 reference source (https://github.com/liuup/claude-code-analysis) into
# references/claude-code-analysis/ at the commit this project was built against. It used to be a
# git submodule; inside sup2api (next/plugins/ccgateway/cli-reverse/) a nested submodule does not
# work, so the checkout is git-ignored and fetched with this script.
#   bash tools/fetch-references.sh          (needs network; set HTTPS_PROXY if required)
set -euo pipefail
cd "$(dirname "$0")/.."
URL=https://github.com/liuup/claude-code-analysis.git
COMMIT=7b7b915d7da804088a8152ed24c68e3da2d1110e
DIR=references/claude-code-analysis
if [ ! -d "$DIR/.git" ]; then
  rm -rf "$DIR"
  git clone --quiet "$URL" "$DIR"
fi
git -C "$DIR" fetch --quiet origin "$COMMIT" 2>/dev/null || true
git -C "$DIR" checkout --quiet "$COMMIT"
echo "$DIR at $(git -C "$DIR" rev-parse --short HEAD)"

#!/bin/sh
# collect-ui.sh <ctx> <dst>
# Copies only what the frontend build needs, keeping the repository layout, so
# the npm stage cache is not invalidated by Go changes.
set -eu
CTX=$1
DST=$2
mkdir -p "$DST/server/web" "$DST/deploy/docker"
cp -a "$CTX/deploy/docker/build-ui.sh" "$DST/deploy/docker/"
cp -a "$CTX/server/web/dist" "$DST/server/web/dist"
if [ -d "$CTX/web" ]; then
  cp -a "$CTX/web" "$DST/web"
fi
for ui in "$CTX"/plugins/*/ui; do
  [ -d "$ui" ] || continue
  rel=${ui#"$CTX"/}
  mkdir -p "$DST/$(dirname "$rel")"
  cp -a "$ui" "$DST/$rel"
done
# node_modules is excluded by Dockerfile.dockerignore; drop stray build output too.
find "$DST" -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true

#!/bin/sh
# build-go.sh <src> <out> <keydir>
#
# Builds (inside the Docker build stage, cwd-independent):
#   <out>/bin/sub2api          core server (-X main.Version=$VERSION)
#   <out>/bin/sub2api-plugin   plugin CLI (if tools/sub2api-plugin exists)
#   <out>/market/              *.s2plugin signed with the dev key, index.json,
#                              index.json.sig, dev-official.pub, dev-official.keyid
#
# Every step is skipped when its sources do not exist yet, so the skeleton
# image builds from day one. The dev key lives in <keydir> (a BuildKit cache
# mount) and is created on first use; it must never be copied into the image.
set -eu
SRC=$1
OUT=$2
KEYS=$3
VERSION=${VERSION:-0.1.0-dev}
KEY_ID=${SUB2API_DEV_KEY_ID:-sub2api-dev}
mkdir -p "$OUT/bin" "$OUT/market" "$OUT/builtin"
cd "$SRC"

echo "==> go version: $(go version)"
echo "==> building server $VERSION"
(cd server && go build -trimpath -ldflags "-s -w -X main.Version=$VERSION" -o "$OUT/bin/sub2api" ./cmd/sub2api)

CLI=""
if [ -f tools/sub2api-plugin/go.mod ]; then
  echo "==> building tools/sub2api-plugin"
  (cd tools/sub2api-plugin && go build -trimpath -ldflags "-s -w -X main.Version=$VERSION" -o "$OUT/bin/sub2api-plugin" .)
  CLI="$OUT/bin/sub2api-plugin"
fi
export PATH="$OUT/bin:$PATH"

write_empty_index() {
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"version":1,"generated_at":"%s","plugins":[]}\n' "$now" > "$OUT/market/index.json"
}

if [ -z "$CLI" ]; then
  echo "==> tools/sub2api-plugin not found: market contains an empty, UNSIGNED index"
  write_empty_index
  exit 0
fi

mkdir -p "$KEYS"
if [ ! -f "$KEYS/$KEY_ID.key" ]; then
  echo "==> generating dev signing key $KEY_ID"
  "$CLI" keygen --key-id "$KEY_ID" --out "$KEYS"
fi

manifest_version() {
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" | head -n1
}

if [ -f tools/sub2api-plugin/scripts/build-demo.sh ]; then
  # Owned by the SDK team: builds, packs and signs every demo package
  # (anthropic 0.1.6/0.2.0, guard 0.1.0, moderation 0.1.0, relay 0.1.2,
  # openai 0.1.6, gemini 0.1.6, guard test build) and
  # writes the index. Only BUILTIN_PLUGINS below are built in; relay is a
  # market plugin.
  echo "==> tools/sub2api-plugin/scripts/build-demo.sh"
  sh tools/sub2api-plugin/scripts/build-demo.sh "$OUT/market" "$KEYS" "$KEY_ID"
else
  # Generic fallback: one package per plugins/<name>/manifest.json.
  TMP=$(mktemp -d)
  found=0
  for dir in plugins/*/; do
    dir=${dir%/}
    [ -f "$dir/manifest.json" ] || continue
    name=$(basename "$dir")
    ver=$(manifest_version "$dir/manifest.json")
    echo "==> packaging $name $ver"
    "$CLI" build --dir "$dir" --out "$TMP/$name"
    extra=""
    if grep -q '"native"' "$dir/manifest.json" && [ ! -d "$dir/ui/native/dist" ]; then
      extra="--allow-missing-ui"
    fi
    # shellcheck disable=SC2086
    "$CLI" pack --dir "$dir" --runtimes "$TMP/$name" --out "$OUT/market/$name-$ver.s2plugin" $extra
    "$CLI" sign --key "$KEYS/$KEY_ID.key" --key-id "$KEY_ID" "$OUT/market/$name-$ver.s2plugin"
    found=1
  done
  rm -rf "$TMP"
  if [ "$found" = 1 ]; then
    "$CLI" index --dir "$OUT/market" --key "$KEYS/$KEY_ID.key"
  fi
fi

if [ ! -f "$OUT/market/index.json" ]; then
  echo "==> no plugins packaged: writing an empty index"
  write_empty_index
  if "$CLI" index --help >/dev/null 2>&1; then
    "$CLI" index --dir "$OUT/market" --key "$KEYS/$KEY_ID.key" || true
  fi
fi

# Public half of the dev key; the entrypoint derives the trust settings from it.
cp "$KEYS/$KEY_ID.pub" "$OUT/market/dev-official.pub"
printf '%s\n' "$KEY_ID" > "$OUT/market/dev-official.keyid"
ls -l "$OUT/market"

# Built-in plugins (installed and enabled by the core at startup, cannot be
# uninstalled): the package matching plugins/<name>/manifest.json's version.
# The anthropic/openai/gemini platforms and their endpoints are built into the
# core itself; the anthropic, openai and gemini plugins only add the API key
# account types of their platform (anthropic also a model
# catalog). moderation is the LLM prompt moderation hook (CONTRACTS §20):
# enabled at install, but its mode defaults to off until configured.
BUILTIN_PLUGINS=${BUILTIN_PLUGINS:-anthropic openai gemini moderation}
mkdir -p "$OUT/builtin"
cp "$KEYS/$KEY_ID.pub" "$OUT/builtin/trust.pub"
printf '%s\n' "$KEY_ID" > "$OUT/builtin/trust.keyid"
for name in $BUILTIN_PLUGINS; do
  ver=$(manifest_version "plugins/$name/manifest.json")
  if [ -f "$OUT/market/$name-$ver.s2plugin" ]; then
    cp "$OUT/market/$name-$ver.s2plugin" "$OUT/builtin/"
    echo "==> builtin plugin $name $ver"
  else
    echo "==> builtin plugin $name $ver: package not found, skipped" >&2
  fi
done
ls -l "$OUT/builtin"

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
if [ "${REQUIRE_EXISTING_DEV_KEY:-0}" = 1 ]; then
  [ -s "$KEYS/$KEY_ID.key" ] && [ -s "$KEYS/$KEY_ID.pub" ] || {
    echo 'release build requires the existing plugin signing key; refusing key generation' >&2
    exit 1
  }
fi
mkdir -p "$OUT/bin" "$OUT/market" "$OUT/builtin"
cd "$SRC"
# The core Docker context excludes CCGateway companion container modules.
# Retain the workspace dependency graph used by the server and plugins.
if [ -f go.work ]; then
  sed '/^[[:space:]]*\.\/plugins\/ccgateway\/companions[[:space:]]*$/d; /^[[:space:]]*\.\/plugins\/ccgateway\/companions\/worker[[:space:]]*$/d' go.work > go.build.work
  if [ -f go.work.sum ]; then cp go.work.sum go.build.work.sum; fi
  export GOWORK="$PWD/go.build.work"
fi

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
  # Owned by the SDK team: builds, packs and signs one package per
  # plugins/<name>/manifest.json (the list is discovered there, so a new plugin
  # needs no change in either script), plus the e2e fixtures (anthropic's
  # upgrade version, the guard test build), and writes the signed index.
  # Everything packaged here is in the market; only BUILTIN_PLUGINS below is
  # built into the image.
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

# Built-in plugins (installed by the core at startup, cannot be uninstalled,
# only disabled): the package matching plugins/<name>/manifest.json's version.
# Two lists:
#   BUILTIN_PLUGINS               installed and enabled on first install
#   BUILTIN_PLUGINS_INSTALL_ONLY  installed but left disabled until an operator
#                                 enables them (written to install-only.txt,
#                                 read by the core's EnsureBuiltin)
# Either way the core grants the requested host permissions itself, so an
# install-only plugin is ready to enable without a consent step.
#
# These lists are DELIBERATELY explicit and must NOT be derived from plugins/*.
# Being in the market (which *is* discovered, see build-demo.sh) means "an
# operator can install it"; being here means "every deployment ships it and
# nobody can remove it", which is a deployment decision, not a consequence of
# a directory existing. A new plugin therefore reaches the market with no
# change and is added here only on purpose.
#
# The anthropic/openai/gemini platforms and their endpoints are built into the
# core itself; the anthropic, openai and gemini plugins only add the API key
# account types of their platform (anthropic also a model
# catalog). moderation is the LLM prompt moderation hook (CONTRACTS §20):
# enabled at install, but its mode defaults to off until configured.
#
# volcengine is install-only: it does nothing until an operator adds an Ark
# account (per-deployment credentials and base URL), so it ships with every
# image but is enabled on purpose.
# ccgateway is also install-only: the operator first configures and authorizes
# a local/SSH Claude Code gateway, then enables its managed account type.
#
# Intentionally NOT built in: relay (a market-only account type), guard (an
# optional gateway hook).
BUILTIN_PLUGINS=${BUILTIN_PLUGINS:-anthropic openai gemini moderation}
BUILTIN_PLUGINS_INSTALL_ONLY=${BUILTIN_PLUGINS_INSTALL_ONLY:-volcengine ccgateway}
for name in $BUILTIN_PLUGINS_INSTALL_ONLY; do
  case " $BUILTIN_PLUGINS " in
    *" $name "*)
      echo "::error::builtin plugin $name is in both BUILTIN_PLUGINS and BUILTIN_PLUGINS_INSTALL_ONLY" >&2
      exit 1 ;;
  esac
done
mkdir -p "$OUT/builtin"
cp "$KEYS/$KEY_ID.pub" "$OUT/builtin/trust.pub"
printf '%s\n' "$KEY_ID" > "$OUT/builtin/trust.keyid"
: > "$OUT/builtin/install-only.txt"
for name in $BUILTIN_PLUGINS $BUILTIN_PLUGINS_INSTALL_ONLY; do
  ver=$(manifest_version "plugins/$name/manifest.json")
  if [ -f "$OUT/market/$name-$ver.s2plugin" ]; then
    cp "$OUT/market/$name-$ver.s2plugin" "$OUT/builtin/"
    echo "==> builtin plugin $name $ver"
  elif [ -n "${PLUGINS:-}" ]; then
    # The market list was narrowed on purpose (PLUGINS=...), so a built-in
    # whose package was not asked for is expected to be absent.
    echo "==> builtin plugin $name $ver: not in PLUGINS, skipped" >&2
  else
    # A built-in cannot be uninstalled, so an image missing one is an image
    # whose operator has no way to add it back. This used to warn and carry
    # on: the build went green and the plugin was simply not there.
    echo "::error::builtin plugin $name $ver: $OUT/market/$name-$ver.s2plugin was not built" >&2
    exit 1
  fi
done
for name in $BUILTIN_PLUGINS_INSTALL_ONLY; do
  printf '%s\n' "$name" >> "$OUT/builtin/install-only.txt"
  echo "==> builtin plugin $name: install-only (left disabled)"
done
ls -l "$OUT/builtin"

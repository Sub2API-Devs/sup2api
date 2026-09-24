#!/bin/sh
# Builds, packs and signs the demo plugins and writes a signed market index.
# POSIX sh; run from anywhere.
#
# Usage: build-demo.sh <outdir> <keydir> <keyid> [publisher]
#
#   <keydir>/<keyid>.key must exist (create it once with
#   `sub2api-plugin keygen --key-id <keyid> --out <keydir>`); it is reused,
#   never regenerated. The same key signs the packages and the index.
#
# Output:
#   <outdir>/anthropic-0.1.2.s2plugin, anthropic-0.2.0.s2plugin (upgrade test),
#   <outdir>/guard-0.1.0.s2plugin,
#   <outdir>/relay-0.1.0.s2plugin  (account type only: Claude relay key),
#   <outdir>/openai-0.1.2.s2plugin, gemini-0.1.2.s2plugin (built-in account types),
#   <outdir>/index.json, index.json.sig
#   <outdir>/test/guard-0.1.1-test.s2plugin   (guardtest build, not indexed)
#
# Environment:
#   SUB2API_PLUGIN  CLI to use (default: sub2api-plugin on PATH, else built
#                   from tools/sub2api-plugin into a temp dir).
#   REQUIRE_UI=1    fail when plugins/guard/ui/native/dist is missing
#                   (default: pack guard without its native UI and warn).
#   PLATFORMS=...   override target platforms (default linux/amd64,linux/arm64).
set -eu

if [ $# -lt 3 ]; then
  sed -n '2,24p' "$0"
  exit 2
fi

OUT=$1
KEYDIR=$2
KEYID=$3
PUBLISHER=${4:-sub2api}

NEXT=$(cd "$(dirname "$0")/../../.." && pwd)
mkdir -p "$OUT/test"
OUT=$(cd "$OUT" && pwd)
KEYDIR=$(cd "$KEYDIR" && pwd)
KEY="$KEYDIR/$KEYID.key"
if [ ! -f "$KEY" ]; then
  echo "missing $KEY; create it with: sub2api-plugin keygen --key-id $KEYID --out $KEYDIR" >&2
  exit 1
fi

WORK=$(mktemp -d 2>/dev/null || mktemp -d -t sub2api-plugin)
trap 'rm -rf "$WORK"' EXIT INT TERM

BIN=${SUB2API_PLUGIN:-}
if [ -z "$BIN" ]; then
  if command -v sub2api-plugin >/dev/null 2>&1; then
    BIN=$(command -v sub2api-plugin)
  else
    BIN="$WORK/sub2api-plugin"
    case "$(go env GOOS)" in windows) BIN="$BIN.exe" ;; esac
    (cd "$NEXT/tools/sub2api-plugin" && CGO_ENABLED=0 go build -o "$BIN" .)
  fi
fi

# package <plugin> <stage name> <dest dir> [overlay] [tags]
package() {
  plugin=$1; name=$2; dest=$3; overlay=${4:-}; tags=${5:-}
  dir="$NEXT/plugins/$plugin"
  stage="$WORK/stage/$name"

  set -- build --dir "$dir" --out "$stage"
  [ -n "$overlay" ] && set -- "$@" --overlay "$overlay"
  [ -n "$tags" ] && set -- "$@" --tags "$tags"
  [ -n "${PLATFORMS:-}" ] && set -- "$@" --platforms "$PLATFORMS"
  "$BIN" "$@" >/dev/null

  set -- pack --dir "$dir" --runtimes "$stage" --out-dir "$dest"
  [ -n "$overlay" ] && set -- "$@" --overlay "$overlay"
  if [ -f "$dir/manifest.json" ] && grep -q '"native"' "$dir/manifest.json" && [ ! -f "$dir/ui/native/dist/entry.js" ]; then
    if [ "${REQUIRE_UI:-0}" = "1" ]; then
      echo "$dir/ui/native/dist/entry.js missing (REQUIRE_UI=1)" >&2
      exit 1
    fi
    echo "warning: $plugin: ui/native/dist missing, packing without native UI" >&2
    set -- "$@" --allow-missing-ui
  fi
  pkg=$("$BIN" "$@")
  "$BIN" sign --key "$KEY" --key-id "$KEYID" --publisher "$PUBLISHER" "$pkg"
}

package anthropic anthropic-base "$OUT"
package anthropic anthropic-v020 "$OUT" testdata/v0.2.0
package guard guard-base "$OUT"
package relay relay-base "$OUT"
package openai openai-base "$OUT"
package gemini gemini-base "$OUT"
package guard guard-test "$OUT/test" testdata/guardtest guardtest

"$BIN" index --dir "$OUT" --key "$KEY"
if [ -f "$KEYDIR/$KEYID.pub" ]; then
  "$BIN" verify --pub "$KEYDIR/$KEYID.pub" "$OUT"/*.s2plugin "$OUT"/test/*.s2plugin
fi

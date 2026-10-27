#!/bin/sh
set -eu
# Run with the Bun the profile names (bunVersion: the one the official ELF
# embeds, so the TLS stack is the same) on Linux x64/glibc;
# package-release.cjs refuses an ELF built by another. The worker MUST be an
# explicit entry.
# Every module is compiled to bytecode as the official build is (ESM: the
# restored modules are ESM, and --bytecode alone defaults to CJS): without it
# each process parses the whole bundle, about 0.8 s per CLI start.
source_dir=$(cd "$1" && pwd)
output_file=$2
case "$output_file" in /*) ;; *) output_file="$PWD/$output_file" ;; esac
# The compiler must be the Bun the official ELF embeds (patch-cli.cjs writes it
# to ccgateway-patch.json from the profile); any other version is refused.
want=$(sed -n 's/.*"bunVersion": *"\([^"]*\)".*/\1/p' "$source_dir/ccgateway-patch.json" | head -n 1)
have=$(bun --version); have=${have%%+*}
if [ -z "$want" ] || [ "$want" != "$have" ]; then
  echo "build.sh: compiler is Bun $have, the official ELF embeds Bun ${want:-?} (ccgateway-patch.json bunVersion); use oven/bun:${want:-<bunVersion>}" >&2
  exit 1
fi
cd "$source_dir"
bun build cli.js src/plugins/functionHooks/hooks-worker/hooks-worker.js \
  --compile --bytecode --format=esm --outfile "$output_file"

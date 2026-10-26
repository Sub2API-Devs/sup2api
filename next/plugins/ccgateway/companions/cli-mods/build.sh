#!/bin/sh
set -eu
# Run with Bun 1.4.3 on Linux x64/glibc. The worker MUST be an explicit entry.
# Every module is compiled to bytecode as the official build is (ESM: the
# restored modules are ESM, and --bytecode alone defaults to CJS): without it
# each process parses the whole bundle, about 0.8 s per CLI start.
source_dir=$(cd "$1" && pwd)
output_file=$2
case "$output_file" in /*) ;; *) output_file="$PWD/$output_file" ;; esac
cd "$source_dir"
bun build cli.js src/plugins/functionHooks/hooks-worker/hooks-worker.js \
  --compile --bytecode --format=esm --outfile "$output_file"

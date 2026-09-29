#!/bin/sh
# next-check-module.sh [--no-test] <module dir>
#
# The per-module gate of next/'s CI, and the same four commands CONTRACTS §2
# asks of every module before it is called done:
#
#   gofmt -l .      (any output fails)
#   go vet ./...
#   go build ./...
#   go test ./...
#
# Run from the repository root; <module dir> is relative to it (e.g. next/sdk).
# Usable locally: `sh .github/next-ci/next-check-module.sh next/plugins/guard`.
#
# Modules are checked in workspace mode (GOWORK is left alone), which is how
# next/Dockerfile builds them -- it copies next/go.work into the build stage --
# and how developers build them. --no-test still compiles the test binaries
# through `go vet`, which is what next/e2e needs: it must not run without a
# deployed stack, but it must never stop compiling.
set -eu

test=1
case "${1:-}" in
  --no-test) test=0; shift ;;
esac
dir=${1:-}
if [ -z "$dir" ]; then
  echo "usage: $0 [--no-test] <module dir>" >&2
  exit 2
fi
if [ ! -f "$dir/go.mod" ]; then
  echo "::error::$dir has no go.mod" >&2
  exit 1
fi

cd "$dir"
echo "=== $dir ==="

unformatted=$(gofmt -l .)
if [ -n "$unformatted" ]; then
  echo "::error::gofmt -l reports unformatted files in $dir:" >&2
  echo "$unformatted" >&2
  exit 1
fi
echo "gofmt: clean"

echo "--- go vet ./..."
go vet ./...

echo "--- go build ./..."
go build ./...

if [ "$test" = 1 ]; then
  echo "--- go test ./..."
  go test -count=1 ./...
else
  echo "--- go test: skipped on purpose (compiled by go vet above)"
fi

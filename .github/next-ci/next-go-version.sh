#!/bin/sh
# Verifies that the Go toolchain on PATH matches the `go` directive of
# next/go.work, so the version lives in the repository and not in the workflow.
# Run from the repository root.
set -eu

work=next/go.work
want=$(awk '$1 == "go" { print $2; exit }' "$work")
if [ -z "$want" ]; then
  echo "::error::no 'go' directive in $work" >&2
  exit 1
fi
have=$(go env GOVERSION | sed 's/^go//')
echo "next/go.work wants go $want; toolchain is go $have"
case "$have" in
  "$want" | "$want".*) ;;
  *)
    echo "::error::go $have does not satisfy the go $want directive of $work" >&2
    exit 1
    ;;
esac

# Every module must agree with the workspace; a stray `go 1.28` in one plugin
# would only surface as a confusing build error later.
for mod in next/*/go.mod next/*/*/go.mod next/*/*/*/go.mod; do
  [ -f "$mod" ] || continue
  v=$(awk '$1 == "go" { print $2; exit }' "$mod")
  case "$v" in
    "$want" | "$want".*) ;;
    *)
      echo "::error file=$mod::go $v does not match the go $want of $work" >&2
      exit 1
      ;;
  esac
done
echo "all next/ modules declare go $want"

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

# "1.27" and "1.27.0" name the same language version.
norm() {
  case "$1" in
    *.*.*) echo "$1" ;;
    *) echo "$1.0" ;;
  esac
}

# newer A B: A is a later version than B.
newer() {
  [ "$(norm "$1")" != "$(norm "$2")" ] &&
    [ "$(printf '%s\n%s\n' "$(norm "$1")" "$(norm "$2")" | sort -V | tail -n1)" = "$(norm "$1")" ]
}

have=$(go env GOVERSION | sed 's/^go//')
echo "next/go.work wants go $want; toolchain is go $have"
if newer "$want" "$have"; then
  echo "::error::go $have does not satisfy the go $want directive of $work" >&2
  exit 1
fi

# No module may require a newer Go than the workspace: a stray `go 1.28` in
# one plugin would only surface as a confusing build error later. Older
# directives are fine (the workspace toolchain builds them).
for mod in next/*/go.mod next/*/*/go.mod next/*/*/*/go.mod next/*/*/*/*/go.mod; do
  [ -f "$mod" ] || continue
  v=$(awk '$1 == "go" { print $2; exit }' "$mod")
  if newer "$v" "$want"; then
    echo "::error file=$mod::go $v is newer than the go $want of $work" >&2
    exit 1
  fi
done
echo "no next/ module requires a newer go than $want"

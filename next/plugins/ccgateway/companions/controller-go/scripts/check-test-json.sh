#!/bin/sh
# Checks a `go test -json` log of controller-go (05-test-plan §1, 02 §8.1):
#   - no test was skipped (a package without tests is also a skip);
#   - no test failed;
#   - the number of passed tests is at least testdata/test-count.min;
#   - no default-suite source calls t.Skip or testing.Short.
# Usage: scripts/check-test-json.sh test.json [min-file]
# Run from controller-go/ (or give the min file explicitly).
set -eu

log=${1:?usage: check-test-json.sh test.json [min-file]}
here=$(cd "$(dirname "$0")/.." && pwd)
min_file=${2:-$here/testdata/test-count.min}

[ -s "$log" ] || { echo "check-test-json: $log is empty" >&2; exit 1; }
min=$(tr -dc '0-9' < "$min_file")
[ -n "$min" ] || { echo "check-test-json: no count in $min_file" >&2; exit 1; }

if grep -q '"Action":"skip"' "$log"; then
	echo "check-test-json: skipped tests or packages without tests:" >&2
	grep '"Action":"skip"' "$log" | sed 's/.*"Package":"\([^"]*\)".*"Test":"\([^"]*\)".*/  \1 \2/; s/.*"Package":"\([^"]*\)".*/  \1 (package)/' >&2
	exit 1
fi
if grep -q '"Action":"fail"' "$log"; then
	echo "check-test-json: failed tests:" >&2
	grep '"Action":"fail"' "$log" | grep '"Test"' | sed 's/.*"Test":"\([^"]*\)".*/  \1/' >&2 || true
	exit 1
fi
passed=$(grep '"Action":"pass"' "$log" | grep -c '"Test":' || true)
if [ "$passed" -lt "$min" ]; then
	echo "check-test-json: $passed tests passed, fewer than the minimum $min ($min_file)" >&2
	exit 1
fi
# t.Skip / testing.Short in the default suite (files without a build constraint line)
found=$(cd "$here" && find . -name '*_test.go' -exec grep -L '^//go:build' {} + | xargs grep -ln 't\.Skip\|testing\.Short()' || true)
if [ -n "$found" ]; then
	echo "check-test-json: t.Skip or testing.Short in the default suite:" >&2
	echo "$found" >&2
	exit 1
fi
echo "check-test-json: $passed tests passed (minimum $min), none skipped"

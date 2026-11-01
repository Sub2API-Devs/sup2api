#!/usr/bin/env bash
# Check a `go test -json` log: no skipped test and at least the registered
# number of passing tests for the layer (05 §1, testdata/test-count.min).
#
#   go test -json -count=1 ./... > unit.json
#   scripts/check-test-json.sh unit.json unit
#
# Layers: unit (any OS, default build), linux (default build on Linux:
# adds the //go:build linux tests), netns (-tags netns, privileged
# container), dockerit (-tags dockerit, real dockerd).
set -euo pipefail

log=${1:?usage: check-test-json.sh <go-test-json> <layer>}
layer=${2:?layer}
here=$(cd "$(dirname "$0")/.." && pwd)
min=$(awk -v l="$layer" '$1 == l { print $2 }' "$here/testdata/test-count.min")
if [ -z "$min" ]; then
	echo "no minimum registered for layer $layer" >&2
	exit 2
fi

# A test-level event has "Test":; package-level events do not.
skips=$(grep -E '"Action":"skip"' "$log" | grep -c '"Test":' || true)
fails=$(grep -E '"Action":"fail"' "$log" | grep -c '"Test":' || true)
pkgfail=$(grep -E '"Action":"fail"' "$log" | grep -vc '"Test":' || true)
passes=$(grep -E '"Action":"pass"' "$log" | grep -c '"Test":' || true)

status=0
if [ "$skips" -ne 0 ]; then
	echo "skipped tests: $skips" >&2
	grep -E '"Action":"skip"' "$log" | grep '"Test":' | sed -E 's/.*"Test":"([^"]*)".*/  \1/' >&2
	status=1
fi
if [ "$fails" -ne 0 ] || [ "$pkgfail" -ne 0 ]; then
	echo "failed tests: $fails, failed packages: $pkgfail" >&2
	status=1
fi
if [ "$passes" -lt "$min" ]; then
	echo "only $passes passing tests, layer $layer requires at least $min" >&2
	status=1
fi
echo "layer=$layer passed=$passes (min $min) skipped=$skips failed=$fails"
exit $status

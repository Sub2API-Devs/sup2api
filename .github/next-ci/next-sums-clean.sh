#!/bin/sh
# Fails when the build had to add checksums to next/go.work.sum or a module's
# go.sum, i.e. the committed sums were incomplete. In workspace mode a missing
# go.work.sum entry either breaks the build outright or is silently written
# into the working tree; this turns the second case into a clear failure.
# Run from the repository root, after the build/test steps.
set -eu

if git diff --exit-code -- next/go.work.sum 'next/**/go.sum'; then
  echo "next/go.work.sum and the module go.sum files are unchanged"
  exit 0
fi
echo "::error::the build added checksums that are not committed; run 'cd next && go work sync' and, in the affected module, 'GOWORK=off go mod tidy' (CONTRACTS §2), then commit the diff above" >&2
exit 1

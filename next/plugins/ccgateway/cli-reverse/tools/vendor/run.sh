#!/usr/bin/env bash
# Vendor (third-party) identification pipeline for Claude Code 2.1.316.
#
#   bash tools/vendor/run.sh            # full run (install, probe versions, match, report)
#   SKIP_FETCH=1 bash tools/vendor/run.sh   # reuse vendor-ref/node_modules and .versions
#
# Inputs:  original/ (read only), analysis/match/decl-map.jsonl (read only),
#          vendor-ref/package.json
# Outputs: analysis/vendor/{decl-vendor.jsonl,packages.json,helpers.json,
#          firstparty-conflicts.jsonl}; intermediates in analysis/vendor/index/
#          (not committed); reference packages in vendor-ref/node_modules
#          (not committed, ~4 GB with all probed versions).
#
# Nothing from npm is executed: npm install/pack run with --ignore-scripts and
# every package file is only read and parsed with Babel.
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE="node --max-old-space-size=12000"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:7890}"

if [ -z "${SKIP_FETCH:-}" ]; then
  (cd vendor-ref && npm install --ignore-scripts --no-audit --no-fund --before=2026-10-31 --legacy-peer-deps)
fi
$NODE tools/vendor/scan-original.mjs            # -> index/orig-decls.jsonl, helpers.json
$NODE tools/vendor/index-npm.mjs                # -> index/npm-files.jsonl, npm-decls.jsonl, packages.json
$NODE tools/vendor/match.mjs                    # -> index/unit-labels.jsonl, versions.json
if [ -z "${SKIP_FETCH:-}" ]; then
  $NODE tools/vendor/probe-versions.mjs 1 1500  # newest patch of recent minor lines
  $NODE tools/vendor/index-npm.mjs
  $NODE tools/vendor/match.mjs
  $NODE tools/vendor/probe-versions.mjs 2 1500  # every patch of the chosen minor lines
  $NODE tools/vendor/index-npm.mjs
  $NODE tools/vendor/match.mjs
fi
$NODE tools/vendor/report.mjs                   # -> decl-vendor.jsonl, packages.json, firstparty-conflicts.jsonl

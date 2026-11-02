#!/usr/bin/env bash
# Full reconstruction pipeline, from original/ to build/readable and runnable/.
#   bash tools/pipeline.sh            all stages after the scans
#   SCAN=1 bash tools/pipeline.sh     also rerun the AST scans (≈3 min)
#   VERIFY=1 bash tools/pipeline.sh   also run the runtime comparison original vs runnable
# Stages and their outputs are described in docs/PLAN.md and docs/process/lead.md.
set -euo pipefail
cd "$(dirname "$0")/.."
N="node --max-old-space-size=14000"
step() { echo; echo "== $*"; }

if [ "${SCAN:-0}" = 1 ]; then
  step scan;            $N tools/ast/scan.mjs original analysis/scan
  step scan-reference;  $N tools/ast/scan-reference.mjs
fi
step match;             $N tools/ast/match.mjs
step segment-pass1;     $N tools/segment/segment.mjs > /dev/null
step match-local;       $N tools/ast/match-local.mjs
step facades;           $N tools/ast/facades.mjs
step segment;           $N tools/segment/segment.mjs | head -30
step domains;           $N tools/segment/domains.mjs | head -14
step reference-names;   $N tools/naming/reference-names.mjs
step auto-names;        $N tools/naming/auto-names.mjs
step resolve;           $N tools/naming/resolve.mjs | head -10
step runnable;          $N tools/rename/apply.mjs original naming/final runnable --force --report artifacts/tmp/rename-report.json --check | tail -6
step readable;          $N tools/emit/readable.mjs --out build/readable | tail -6
if [ "${VERIFY:-0}" = 1 ]; then
  step verify;          npm run -s verify:runnable | tail -5
fi

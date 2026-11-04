#!/usr/bin/env bash
# Full reconstruction pipeline, from original/ to reconstructed/ (readable, buildable) and runnable/.
#   bash tools/pipeline.sh            all stages after the scans
#   SCAN=1 bash tools/pipeline.sh     also rerun the AST scans (≈3 min)
#   VERIFY=1 bash tools/pipeline.sh   also run the runtime comparison original vs runnable
# Stages and their outputs are described in docs/PLAN.md and docs/process/lead.md.
set -euo pipefail
cd "$(dirname "$0")/.."
# fs-retry: Windows briefly locks freshly written files (indexer, scanner); retry instead of failing the stage
N="node --max-old-space-size=14000 --import ./tools/lib/fs-retry.mjs"
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
step reference-align;   $N tools/naming/reference-align.mjs | cut -c1-300
step auto-names;        $N tools/naming/auto-names.mjs
step vendor-names;      $N tools/naming/vendor-names.mjs | tail -5
step propagate;         $N tools/naming/propagate.mjs | tail -5
step resolve;           $N tools/naming/resolve.mjs | head -10
step runnable;          $N tools/rename/apply.mjs original naming/final runnable --force --report artifacts/tmp/rename-report.json --check | tail -6
step readable;          rm -rf reconstructed && $N tools/emit/readable.mjs --out reconstructed | tail -6
step build-readable;    node reconstructed/build.mjs | tail -1
if [ "${VERIFY:-0}" = 1 ]; then
  step verify;          npm run -s verify:runnable | tail -5
  # the reading tree itself, built with Bun 1.4.4 (docs/process/buildable.md)
  step verify-readable-build; node tools/verify/compare.mjs original reconstructed/dist --name original-vs-reconstructed-dist | tail -5
  # the readable tree's deminify rewrite, proven on the runnable layout
  step verify-deminify; $N tools/emit/deminify-dir.mjs runnable artifacts/tmp/deminify/runnable-dm --force --check-printer --check-canonical | tail -3
  node tools/verify/compare.mjs original artifacts/tmp/deminify/runnable-dm --name deminify-runnable-dm | tail -5
fi
if [ "${VERIFY:-0}" = 1 ]; then
  # static checks on the reading tree (docs/process/lead.md, README "验证")
  [ -f analysis/verify/readable-check-original.json ] || $N tools/verify/readable-check.mjs original > /dev/null
  step readable-check;  $N tools/verify/readable-check.mjs | tail -1
  # every declaration compared with the official bytes, up to renaming and the deminify rules
  step decl-equiv;      $N tools/verify/decl-equiv.mjs 2>&1 | tail -1
  step readability;     $N tools/verify/readability.mjs analysis/readability naming/final 2>/dev/null | node -e 'const s=JSON.parse(require("fs").readFileSync(0));for(const t in s)for(const k in s[t])console.log(t,k,s[t][k].readable+"%",s[t][k].minified)'
  step leftover;        $N tools/verify/leftover.mjs analysis/readability
  step name-shape;      $N tools/verify/name-shape.mjs naming/final analysis/name-shape | head -6
  step doc-refs;        echo "FAIL: $(node --max-old-space-size=8000 tools/verify/doc-refs.mjs . docs/ARCHITECTURE.md docs/CHANGES-SINCE-2.1.88.md docs/INDEX.md docs/handbook/*.md | grep -c ' FAIL ')"
  step no-scratch-dirs; echo "_new/ _unattributed/ _misplaced/ dirs: $(find reconstructed -type d \( -name _new -o -name _unattributed -o -name _misplaced \) | wc -l)"
fi

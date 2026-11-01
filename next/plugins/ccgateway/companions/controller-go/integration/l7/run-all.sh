#!/bin/sh
# One full L7 pass on a clean isolated instance, in the order of 04 §7:
#   run-all.sh            baseline, Python start, all scenarios, cleanup, verify
# Results append to $GT_WORK/results.jsonl; the production baseline and the
# cleanup check go to $GT_WORK/base. Scenario failures do not stop the run.
set -u
cd "$(dirname "$0")"
. ./gt-vars.sh
run() { timeout "${2:-1800}" python3 ccg_it.py $1; }
sh gtctl.sh baseline "$GT_WORK/base" || exit 1
# A fresh driver state; earlier development runs are kept aside.
[ -f "$GT_WORK/results.jsonl" ] && mv "$GT_WORK/results.jsonl" "$GT_WORK/results-$(date +%s).jsonl"
rm -f "$GT_WORK/it-state.json"
mkdir -p "$GT_WORK/gen" && sh mkgt.sh "$GT_WORK/gen" > "$GT_WORK/gen/mkgt.out" || exit 1
sh gtctl.sh py-start || exit 1
sh gtctl.sh bridge-start || exit 1
sleep 3
run "IT-M01 IT-P01-python IT-P02-python IT-M02 IT-M03 IT-M04 IT-M05 IT-P01 IT-P02"
run "IT-S01 IT-S02 IT-S03 IT-S04 IT-S05 IT-S06 IT-S07 IT-S08 IT-S09 IT-S10 IT-S11 IT-S12 IT-S13 IT-S14 IT-S15 IT-S16" 3600
run "IT-F01 IT-F02 IT-F03 IT-F04 IT-F05 IT-F06 IT-F07 IT-F08 IT-F09 IT-F10 IT-F11 IT-F12 IT-F13 IT-F14 IT-F17" 3600
run "IT-X01 IT-X04 IT-X05 IT-X06 IT-X07 IT-X09 IT-X12 IT-X02 IT-X03" 3600
run "IT-M06 IT-M08 IT-M07"
run "IT-P03 IT-P05" 1200
run "IT-M09 IT-F18 IT-X08" 1200
run "IT-P04" 900
run "IT-F15 IT-F16"
sh gtctl.sh cleanup
sh gtctl.sh verify "$GT_WORK/base"

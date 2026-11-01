#!/bin/sh
# A partial L7 pass: the same setup as run-all.sh (Python start, adopt),
# then the given scenarios, cleanup and the production check.
#   run-part.sh "IT-P03 IT-P05 IT-M09 IT-F18 IT-X08"
set -u
cd "$(dirname "$0")"
. ./gt-vars.sh
run() { timeout "${2:-3600}" python3 ccg_it.py $1; }
sh gtctl.sh baseline "$GT_WORK/base" || exit 1
rm -f "$GT_WORK/it-state.json"
mkdir -p "$GT_WORK/gen" && sh mkgt.sh "$GT_WORK/gen" > "$GT_WORK/gen/mkgt.out" || exit 1
sh gtctl.sh py-start || exit 1
sh gtctl.sh bridge-start || exit 1
sleep 3
run "IT-M01 IT-M02 IT-M03 IT-M04 IT-M05"
run "$1"
sh gtctl.sh cleanup
sh gtctl.sh verify "$GT_WORK/base"

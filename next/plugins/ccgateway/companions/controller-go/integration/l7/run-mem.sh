#!/bin/sh
# IT-MEM on a clean isolated instance: setup as run-part.sh up to the Go
# adopt (IT-M01..M04), a3 without activation, then the concurrent paired
# activation, cleanup and the production check. The controller under test
# and the guard come from the environment:
#   GT_WORK=~/ccg-gt-memfix GT_GO_CTL=ccgateway-controller:0.1.119 \
#   GT_GUARD_IMG=ccgateway-guard:0.1.119 run-mem.sh
set -u
cd "$(dirname "$0")"
. ./gt-vars.sh
export GT_WORK GT_GO_CTL GT_GUARD_IMG
run() { timeout "${2:-3600}" python3 ccg_it.py $1; }
sh gtctl.sh baseline "$GT_WORK/base" || exit 1
rm -f "$GT_WORK/it-state.json"
mkdir -p "$GT_WORK/gen" && sh mkgt.sh "$GT_WORK/gen" > "$GT_WORK/gen/mkgt.out" || exit 1
sh gtctl.sh py-start || exit 1
sh gtctl.sh bridge-start || exit 1
sleep 3
run "IT-M01 IT-M02 IT-M03 IT-M04 IT-MEM00"
run "IT-MEM01" 1800
sh gtctl.sh cleanup
sh gtctl.sh verify "$GT_WORK/base"

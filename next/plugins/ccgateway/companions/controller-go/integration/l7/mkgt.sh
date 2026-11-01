#!/bin/sh
# Render the gt variants of the core's golden compose scripts (04 §7 step 3):
# only path, prefix, project, network and unit constants change; the compose
# template between the CCG_COMPOSE_EOF markers stays byte for byte. The diff
# against the golden file is printed so the evidence shows nothing else moved.
#   mkgt.sh OUTDIR
set -eu
. "$(dirname "$0")/gt-vars.sh"
OUT=$1
mkdir -p "$OUT"
# Constants outside the heredoc. Order matters: ccg-control0 before ccg-control.
SUBST='
s|'\''/opt/ccgateway-runtime'\''|'\''/opt/ccgateway-gt-runtime'\''|
s|'\''/opt/ccgateway-runtime.env'\''|'\''/opt/ccgateway-gt-runtime.env'\''|
s|^DIR='\''/opt/ccgateway'\''|DIR='\''/opt/ccgateway-gt'\''|
s|'\''/opt/ccgateway-controller'\''|'\''/opt/ccgateway-gt-controller'\''|
s|'\''/var/lib/ccgateway-guard'\''|'\''/var/lib/ccgateway-gt-guard'\''|
s|docker compose -p ccgateway |docker compose -p ccgateway-gt |
s|ccg-controller|ccg-gt-controller|g
s|= ccgateway \]|= ccgateway-gt ]|g
s|!= ccgateway \]|!= ccgateway-gt ]|g
s|ccgateway-bridge-guard|ccg-gt-bridge-guard|g
s|com.docker.network.bridge.name=ccg-control0|com.docker.network.bridge.name=ccg-gt-ctl0|
s|io.sup2api.ccgateway.control=ccg ccg-control |io.sup2api.ccgateway.control=ccg-gt ccg-gt-control |
s|'\'' ccg-control 2>|'\'' ccg-gt-control 2>|
s|172.29.255.0/29|172.29.255.8/29|g
s|--gateway 172.29.255.1 |--gateway 172.29.255.9 |
'
render() {
  sed -e "/<<'CCG_COMPOSE_EOF'/,/^CCG_COMPOSE_EOF\$/!{
$SUBST
}" "$1"
}
for f in compose-install.golden.sh compose-rollback.golden.sh compose-finish.golden.sh; do
  render "$GT_GOLDEN/$f" > "$OUT/gt-${f%.golden.sh}.sh"
  echo "== diff $f -> gt-${f%.golden.sh}.sh"
  diff "$GT_GOLDEN/$f" "$OUT/gt-${f%.golden.sh}.sh" || true
done
# The heredoc must equal the template exactly.
sed -n "/<<'CCG_COMPOSE_EOF'/,/^CCG_COMPOSE_EOF\$/p" "$OUT/gt-compose-install.sh" | sed '1d;$d' > "$OUT/heredoc.yml"
if cmp -s "$OUT/heredoc.yml" "$GT_TEMPLATE"; then echo "== heredoc identical to the template"; else echo "== HEREDOC DIFFERS"; exit 1; fi
# Real image references (the S4 step "golden -> real references"), workload
# optional rendering as in the panel install.
sed -e "s|placeholder-app:0|$GT_APP|" -e "s|placeholder-egress:0|$GT_EGRESS|" \
    -e "s|placeholder-controller:0|$GT_GO_CTL|" -e "s|placeholder-guard:0|$GT_GUARD_IMG|" \
    "$OUT/gt-compose-install.sh" > "$OUT/gt-adopt.sh"
# The release function alone (04 §5.3 step 3), taken from the rollback script.
{
  sed -n '1,/^}$/p' "$OUT/gt-compose-rollback.sh" | sed -n '1,4p'
  sed -n '/^is_key() {/,/^}$/p;/^present() /p;/^data_path() /p;/^sweep_mv() {/,/^}$/p;/^release() {/,/^}$/p' "$OUT/gt-compose-rollback.sh"
  echo 'release && echo CCG_RELEASE=done || { echo CCG_RELEASE=failed; exit 1; }'
} > "$OUT/gt-release.sh"
echo "== rendered: $(ls "$OUT")"

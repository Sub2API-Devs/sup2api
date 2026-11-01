# L7 isolated instance constants (04 §7). Sourced by every gt script.
# Every resource touched by the L7 run is named from these values; nothing
# here may start with a bare "ccg-" that is not "ccg-gt".
GT_PREFIX=ccg-gt
GT_PROJECT=ccgateway-gt
GT_DIR=/opt/ccgateway-gt
GT_ROOT=/opt/ccgateway-gt-runtime
GT_DATA=/opt/ccgateway-gt-controller
GT_ENVF=/opt/ccgateway-gt-runtime.env
GT_STATE=/var/lib/ccgateway-gt-guard
GT_NET=ccg-gt-control
GT_SUBNET=172.29.255.8/29
GT_BRIDGE=ccg-gt-ctl0
GT_GUARD_IP=172.29.255.9
GT_CTL_IP=172.29.255.10
GT_PORT=28787
GT_CHAIN=CCG-GT
GT_CTL=ccg-gt-controller
GT_GW=ccg-gt-shared-egress
GT_UPLINK=ccg-gt-d0000000000000000-xray-uplink
GT_BRIDGE_UNIT=ccg-gt-bridge-guard
# Images: the Python reference controller, the Go controller and guard under
# test, the production gateway image (read only, by ID).
GT_PY_CTL=ccgateway-controller:0.1.118
GT_GO_CTL=${GT_GO_CTL:-ccgateway-controller:it}
GT_GUARD_IMG=${GT_GUARD_IMG:-ccgateway-guard:it}
GT_APP=ccgateway-app:0.1.118
GT_EGRESS=ccgateway-egress:0.1.118
GT_XRAY=sha256:92305b5b13c97b8b9c93276c3e5430f68f7a4f607e768a63d32f1fb4c61ed0ea
# Work directory of the run on the host (as the ssh user) and the repo copy.
GT_WORK=${GT_WORK:-$HOME/ccg-gt-l7}
GT_SRC=$GT_WORK/src
GT_GOLDEN=$GT_SRC/next/server/internal/ccgateway/testdata
GT_TEMPLATE=$GT_SRC/next/server/internal/ccgateway/compose/ccgateway.compose.yml

gt_dc() { sudo -n docker compose -p "$GT_PROJECT" --project-directory "$GT_DIR" -f "$GT_DIR/compose.yml" --env-file "$GT_DIR/.env" "$@"; }

# gt_name_ok NAME: the safety rule of the run, checked before every docker rm,
# rename, stop or network/volume removal the scripts issue.
gt_name_ok() {
  case "$1" in
    ccg-gt-*|ccgateway-gt*|/opt/ccgateway-gt*|/var/lib/ccgateway-gt*|CCG-GT-*) return 0 ;;
  esac
  echo "SAFETY: refusing to touch $1" >&2
  exit 99
}

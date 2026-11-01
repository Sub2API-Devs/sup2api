#!/bin/sh
# Lifecycle of the L7 isolated instance (04 §7). Run on ovh as the ssh user
# (docker group, passwordless sudo). Subcommands:
#   baseline OUT        production snapshot (containers, CCG-PROXY-BRIDGE, networks, volumes)
#   py-start            Python 0.1.118 controller the old way (host network, 127.0.0.1:18787)
#   py-run              start only the Python container from the existing env file (release step 4)
#   bridge-start|bridge-stop   the Python bridge guard for the gt chain (transient unit)
#   guard-files         compose.yml, .env, guard state dir and the control network
#   adopt               the gt variant of the golden install script (stdin: env file)
#   finish|rollback     the gt variants of the golden finish/rollback scripts
#   release             04 §5.3 steps 2-4 (compose controller out, release, Python back)
#   cleanup             04 §7 cleanup
#   verify OUT          04 §7 checks against the baseline in OUT
set -eu
. "$(dirname "$0")/gt-vars.sh"
GEN=$GT_WORK/gen
cmd=${1:-}
shift || true

snapshot() {
  docker ps -a --no-trunc --filter name=ccg- --format '{{.ID}} {{.Names}}' | grep -v ' ccg-gt-' | sort -k2 > "$1/ps.txt"
  sudo -n iptables -S CCG-PROXY-BRIDGE > "$1/bridge.txt"
  docker network ls --no-trunc --format '{{.ID}} {{.Name}}' | grep ' ccg' | grep -v ' ccg-gt-' | sort -k2 > "$1/networks.txt"
  docker volume ls --format '{{.Name}}' | grep '^ccg' | grep -v '^ccg-gt-' | sort > "$1/volumes.txt"
  sudo -n iptables -S | grep -v CCG-GT | sort > "$1/iptables-nongt.txt"
  systemctl is-active ccgateway-bridge-guard > "$1/bridge-unit.txt" || true
}

env_file() {
  key=$1 ctl=$2
  printf '%s\n' "CCG_RUNTIME_ROOT=$GT_ROOT" "CCG_APP_IMAGE=$GT_APP" "CCG_EGRESS_IMAGE=$GT_EGRESS" \
    "CCG_CONTROLLER_IMAGE=$ctl" "CCG_CONTROLLER_KEY=$key" "CCG_RUNTIME_PREFIX=$GT_PREFIX" \
    "CCG_CONTROLLER_NAME=$GT_CTL" "CCG_XRAY_IMAGE=$GT_XRAY"
}

py_run() {
  # 04 §5.3 step 4 with the gt names. CCG_CONTROLLER_PORT is an -e because the
  # same env file feeds the compose controller, which must keep 8787 inside its
  # container (the template does not pin the port; see the evidence notes).
  gt_name_ok "$GT_CTL"
  docker run -d --name "$GT_CTL" --restart unless-stopped --network host \
    --env-file "$GT_WORK/runtime.env.copy" -e CCG_CONTROLLER_PORT=$GT_PORT \
    -v /var/run/docker.sock:/var/run/docker.sock -v "$GT_ROOT:$GT_ROOT" \
    --log-opt max-size=20m --log-opt max-file=3 "$GT_PY_CTL" >/dev/null
}

case "$cmd" in
baseline)
  mkdir -p "$1"; snapshot "$1"; wc -l "$1"/*.txt ;;
py-start)
  [ ! -e "$GT_ROOT" ] || { echo "already exists: $GT_ROOT"; exit 1; }
  gt_name_ok "$GT_ROOT"; gt_name_ok "$GT_ENVF"
  sudo -n install -d -m 0700 -o root -g root "$GT_ROOT"
  key=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  env_file "$key" "$GT_PY_CTL" | sudo -n tee "$GT_ENVF.tmp" >/dev/null
  sudo -n chmod 600 "$GT_ENVF.tmp"; sudo -n mv -f "$GT_ENVF.tmp" "$GT_ENVF"
  # docker --env-file is read by the docker CLI (this user): a private copy.
  umask 077; sudo -n cat "$GT_ENVF" > "$GT_WORK/runtime.env.copy"
  py_run
  for i in $(seq 30); do
    curl -fsS -m 3 -H "Authorization: Bearer $key" http://127.0.0.1:$GT_PORT/health >/dev/null 2>&1 && { echo py-ready; exit 0; }
    sleep 1
  done
  echo py-not-ready; exit 1 ;;
py-run)
  umask 077; sudo -n cat "$GT_ENVF" > "$GT_WORK/runtime.env.copy"; py_run ;;
bridge-start)
  gt_name_ok "$GT_BRIDGE_UNIT"
  sudo -n systemd-run --unit="$GT_BRIDGE_UNIT" --collect --property=Restart=no \
    /usr/bin/python3 "$GT_SRC/next/deploy/gateway/ovh/ccgateway-bridge-guard.py" \
    --root "$GT_ROOT" --prefix "$GT_PREFIX" --chain "$GT_CHAIN-PROXY-BRIDGE" ;;
bridge-stop)
  gt_name_ok "$GT_BRIDGE_UNIT"
  sudo -n systemctl stop "$GT_BRIDGE_UNIT" || true ;;
guard-files)
  for d in "$GT_DIR" "$GT_DATA" "$GT_STATE"; do gt_name_ok "$d"; sudo -n install -d -m 0700 -o root -g root "$d"; done
  sudo -n install -m 0600 -o root -g root "$GT_TEMPLATE" "$GT_DIR/compose.yml"
  if ! sudo -n test -e "$GT_DIR/.env"; then
    token=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
    printf '%s\n' "CCG_PREFIX=$GT_PREFIX" "CCG_PROJECT=$GT_PROJECT" "CCG_PROJECT_DIR=$GT_DIR" \
      "CCG_RUNTIME_HOST_ROOT=$GT_ROOT" "CCG_RUNTIME_ENV=$GT_ENVF" "CCG_CONTROLLER_DATA=$GT_DATA" \
      "CCG_GUARD_STATE=$GT_STATE" "CCG_CONTROL_NETWORK=$GT_NET" "CCG_CONTROL_BRIDGE=$GT_BRIDGE" \
      "CCG_CONTROL_SUBNET=$GT_SUBNET" "CCG_GUARD_ADDR=$GT_GUARD_IP" "CCG_CONTROLLER_IP=$GT_CTL_IP" \
      "CCG_CONTROLLER_PUBLISH=$GT_PORT" "CCG_CHAIN_PREFIX=$GT_CHAIN" \
      "CCG_GUARD_IMAGE=$GT_GUARD_IMG" "CCG_CONTROLLER_IMAGE=$GT_GO_CTL" "CCG_GATEWAY_IMAGE=$GT_XRAY" \
      "CCG_GUARD_TOKEN=$token" | sudo -n tee "$GT_DIR/.env" >/dev/null
    sudo -n chmod 600 "$GT_DIR/.env"
  fi
  # The same network command as the gt install script.
  if ! docker network inspect "$GT_NET" >/dev/null 2>&1; then
    docker network create --driver bridge --subnet "$GT_SUBNET" --gateway "$GT_GUARD_IP" \
      -o com.docker.network.bridge.name="$GT_BRIDGE" --label io.sup2api.ccgateway.control="$GT_PREFIX" "$GT_NET" >/dev/null
  fi
  gt_dc config -q && echo guard-files-ok ;;
adopt)
  sudo -n sh "$GEN/gt-adopt.sh" ;;
finish)
  sudo -n sh "$GEN/gt-compose-finish.sh" ;;
rollback)
  sudo -n sh "$GEN/gt-compose-rollback.sh" ;;
release)
  gt_dc rm -sf controller
  sudo -n sh "$GEN/gt-release.sh"
  sudo -n sed -i "s|^CCG_CONTROLLER_IMAGE=.*|CCG_CONTROLLER_IMAGE=$GT_PY_CTL|" "$GT_ENVF"
  umask 077; sudo -n cat "$GT_ENVF" > "$GT_WORK/runtime.env.copy"
  py_run; echo released ;;
cleanup)
  sudo -n systemctl stop "$GT_BRIDGE_UNIT" 2>/dev/null || true
  if sudo -n test -f "$GT_DIR/compose.yml"; then gt_dc --profile egress rm -sf || true; fi
  for c in $(docker ps -aq --filter name='^ccg-gt-'); do
    n=$(docker inspect --format '{{.Name}}' "$c"); n=${n#/}; gt_name_ok "$n"; docker rm -f "$c" >/dev/null
  done
  for n in $(docker network ls --format '{{.Name}}' --filter name='^ccg-gt-'); do
    gt_name_ok "$n"; docker network rm "$n" >/dev/null || true
  done
  for v in $(docker volume ls -q --filter name='^ccg-gt-'); do gt_name_ok "$v"; docker volume rm "$v" >/dev/null || true; done
  # Jumps first (DOCKER-USER, INPUT rules naming a CCG-GT chain or the guard
  # address), then flush and delete the three chains.
  for chain in DOCKER-USER INPUT; do
    sudo -n iptables -S "$chain" | grep -E "CCG-GT|$GT_GUARD_IP/32" | while IFS= read -r rule; do
      del=$(printf '%s\n' "$rule" | sed 's/^-A /-D /')
      eval "sudo -n iptables -w 5 $del"
    done
  done
  for c in $(sudo -n iptables -S | sed -n 's/^-N \(CCG-GT-[A-Z-]*\)$/\1/p'); do
    gt_name_ok "$c"; sudo -n iptables -w 5 -F "$c"; sudo -n iptables -w 5 -X "$c"
  done
  for p in "$GT_DIR" "$GT_ROOT" "$GT_DATA" "$GT_ENVF" "$GT_STATE"; do gt_name_ok "$p"; sudo -n rm -rf "$p"; done
  rm -f "$GT_WORK/runtime.env.copy"
  echo cleaned ;;
verify)
  out=$1; mkdir -p "$out/after"; snapshot "$out/after"; rc=0
  for f in ps.txt bridge.txt networks.txt volumes.txt iptables-nongt.txt bridge-unit.txt; do
    if cmp -s "$out/$f" "$out/after/$f"; then echo "same $f"; else echo "DIFFERENT $f"; diff "$out/$f" "$out/after/$f" | head -20; rc=1; fi
  done
  echo "gt containers: $(docker ps -aq --filter name='^ccg-gt-' | wc -l)"
  echo "gt networks: $(docker network ls -q --filter name='^ccg-gt-' | wc -l)"
  echo "gt volumes: $(docker volume ls -q --filter name='^ccg-gt-' | wc -l)"
  echo "CCG-GT rules: $(sudo -n iptables -S | grep -c CCG-GT || true)"
  echo "guard address rules: $(sudo -n iptables -S | grep -c "$GT_GUARD_IP/32" || true)"
  echo "gt paths: $(ls -d /opt/ccgateway-gt* /var/lib/ccgateway-gt* 2>/dev/null | wc -l)"
  exit $rc ;;
*)
  sed -n '2,15p' "$0"; exit 2 ;;
esac

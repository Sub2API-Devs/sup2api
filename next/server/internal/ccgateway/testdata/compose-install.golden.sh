set -u
umask 077
APP='placeholder-app:0'
EGRESS='placeholder-egress:0'
CTL='placeholder-controller:0'
GUARD='placeholder-guard:0'
STATEIMG='valkey/valkey:9.1.2'
ROOT='/opt/ccgateway-runtime'
ENVF='/opt/ccgateway-runtime.env'
DIR='/opt/ccgateway'
DATA='/opt/ccgateway-controller'
STATE='/var/lib/ccgateway-guard'
for img in "$APP" "$EGRESS"; do
  docker image inspect "$img" >/dev/null 2>&1 || docker pull -q "$img" >/dev/null 2>&1 || true
done
docker image inspect "$CTL" >/dev/null 2>&1 || docker pull -q "$CTL" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
API=$(docker image inspect --format '{{index .Config.Labels "io.sup2api.ccgateway.guard-api"}}' "$CTL" 2>/dev/null)
OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
if [ "$API" != 1 ]; then
if [ "$OWNER" = ccgateway ] || [ -e "$DATA/.adopted" ] || [ -e "$DATA/.adopting" ]; then echo CCG_RESULT=legacy_blocked; exit 1; fi
mkdir -p "$ROOT" && chmod 700 "$ROOT" || { echo CCG_RESULT=install_failed; exit 1; }
if ! { cat > "$ENVF.tmp" && chmod 600 "$ENVF.tmp" && mv -f "$ENVF.tmp" "$ENVF"; }; then
  rm -f "$ENVF.tmp"; echo CCG_RESULT=install_failed; exit 1
fi
# An install interrupted after the rename left only the previous controller.
if ! docker inspect --type container ccg-controller >/dev/null 2>&1 && docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1
fi
docker rm -f ccg-controller-prev >/dev/null 2>&1
if docker inspect --type container ccg-controller >/dev/null 2>&1; then
  docker rename ccg-controller ccg-controller-prev >/dev/null 2>&1 || { echo CCG_RESULT=install_failed; exit 1; }
  docker stop ccg-controller-prev >/dev/null 2>&1
fi
if ! docker run -d --name ccg-controller --restart unless-stopped --network host \
  --env-file "$ENVF" -v /var/run/docker.sock:/var/run/docker.sock -v "$ROOT:$ROOT" \
  --log-opt max-size=20m --log-opt max-file=3 "$CTL" >/dev/null 2>&1; then
  docker rm -f ccg-controller >/dev/null 2>&1
  if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
    docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1
  fi
  echo CCG_RESULT=controller_unhealthy; exit 1
fi
echo CCG_RESULT=started
exit 0
fi
# ---- compose path (CONTRACTS §76) ----
dc() { docker compose -p ccgateway --project-directory "$DIR" -f "$DIR/compose.yml" --env-file "$DIR/.env" "$@"; }
lock() {
  command -v flock >/dev/null 2>&1 || return 0
  exec 9>>"$DIR/.compose.lock" || return 1
  # flock -n in a loop, not -w: BusyBox flock (Alpine hosts) has no -w.
  i=0
  until flock -n 9; do i=$((i+1)); [ "$i" -lt 180 ] || return 1; sleep 1; done
}
is_key() {
  case "$1" in
    d????????????????) case "${1#d}" in *[!0-9a-f]*) return 1 ;; esac; return 0 ;;
    [1-9]*) case "$1" in *[!0-9]*) return 1 ;; esac; return 0 ;;
  esac
  return 1
}
present() { [ -e "$1" ] || [ -L "$1" ]; }
data_path() { if [ "$1" = shared-egress/state.json ]; then echo shared-egress-state.json; else echo "$1"; fi; }
sweep_mv() {
  present "$DATA/$1" || return 0
  present "$ROOT/$2" && return 0
  mv "$DATA/$1" "$ROOT/$2"
}
release() {
  # Everything adopt moved goes back; a conflict stops with both kept.
  for j in "$DATA/.adopted" "$DATA/.adopting"; do
    [ -f "$j" ] || continue
    while IFS= read -r line; do
      case "$line" in "mv "*) ;; *) continue ;; esac
      p=${line#mv }
      d=$(data_path "$p")
      present "$DATA/$d" || continue
      present "$ROOT/$p" && return 1
      case "$p" in */*) mkdir -p "$ROOT/${p%/*}" || return 1 ;; esac
      mv "$DATA/$d" "$ROOT/$p" || return 1
    done < "$j"
  done
  # After a finished adopt, what the Go controller created since goes back
  # too (new accounts, new backups); the old controller needs it.
  if [ -f "$DATA/.adopted" ]; then
    for n in .lock runtime.json uploads backups; do sweep_mv "$n" "$n" || return 1; done
    if present "$DATA/shared-egress-state.json"; then
      mkdir -p "$ROOT/shared-egress" && sweep_mv shared-egress-state.json shared-egress/state.json || return 1
    fi
    for d in "$DATA"/*; do
      k=${d##*/}
      [ -d "$d" ] && [ ! -L "$d" ] && is_key "$k" || continue
      mkdir -p "$ROOT/$k" || return 1
      for f in "$d"/* "$d"/.[!.]* "$d"/..?*; do
        present "$f" || continue
        sweep_mv "$k/${f##*/}" "$k/${f##*/}" || return 1
      done
      rmdir "$d" 2>/dev/null
    done
  fi
  for d in "$DATA"/*; do
    [ -d "$d" ] && [ ! -L "$d" ] && is_key "${d##*/}" && rmdir "$d" 2>/dev/null
  done
  rm -f "$DATA/.adopted" "$DATA/.adopting"
}
compose_rollback() {
  dc rm -sf controller >/dev/null 2>&1
  if [ -e "$DIR/.transition" ]; then
    release || { echo restore_failed; return 1; }
    if [ -e "$DIR/.env.prev" ]; then mv -f "$DIR/.env.prev" "$DIR/.env" && dc up -d --no-deps guard >/dev/null 2>&1; fi
    rm -f "$DIR/.transition"
    if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
      if docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1; then
        echo restored; return 0
      fi
      echo restore_failed; return 1
    fi
    echo removed; return 0
  fi
  if [ -e "$DIR/.env.prev" ]; then
    if mv -f "$DIR/.env.prev" "$DIR/.env" && dc up -d --no-deps guard controller >/dev/null 2>&1; then
      echo restored; return 0
    fi
    echo restore_failed; return 1
  fi
  echo removed
}
restore_env() { [ -e "$DIR/.env.prev" ] && mv -f "$DIR/.env.prev" "$DIR/.env"; }
restore_guard() { restore_env && dc up -d --no-deps guard >/dev/null 2>&1; }
adopt_mv() {
  present "$ROOT/$1" || return 0
  present "$DATA/$2" && return 1
  echo "mv $1" >> "$J" && mv "$ROOT/$1" "$DATA/$2"
}
adopt() {
  [ -e "$DATA/.adopted" ] && return 0
  J=$DATA/.adopting
  : >> "$J" || return 1
  for n in .lock runtime.json uploads backups; do adopt_mv "$n" "$n" || return 1; done
  adopt_mv shared-egress/state.json shared-egress-state.json || return 1
  for d in "$ROOT"/*; do
    k=${d##*/}
    [ -d "$d" ] && [ ! -L "$d" ] && is_key "$k" || continue
    for f in "$d"/* "$d"/.[!.]* "$d"/..?*; do
      present "$f" || continue
      n=${f##*/}
      case "$n" in resolv.conf|app.nft) continue ;; esac
      mkdir -p "$DATA/$k" && adopt_mv "$k/$n" "$k/$n" || return 1
    done
  done
  for f in "$ROOT"/* "$ROOT"/.[!.]* "$ROOT"/..?* "$ROOT"/shared-egress/* "$ROOT"/shared-egress/.[!.]* "$ROOT"/shared-egress/..?*; do
    present "$f" || continue
    n=${f#"$ROOT"/}
    case "$n" in
      shared-egress|shared-egress/boot.json|shared-egress/boot.nft|shared-egress/dns.json|shared-egress/active.nft|shared-egress/operation.json|state|state-conf) continue ;;
      */*) ;;
      *) if [ -d "$f" ] && [ ! -L "$f" ] && is_key "$n"; then continue; fi ;;
    esac
    echo "keep $n" >> "$J" || return 1
  done
  mv -f "$J" "$DATA/.adopted"
}
state_dirs() {
  mkdir -p "$ROOT/state" "$ROOT/state-conf" && chmod 755 "$ROOT/state" && chmod 700 "$ROOT/state-conf"
}
state_up() {
  docker image inspect "$STATEIMG" >/dev/null 2>&1 || docker pull -q "$STATEIMG" >/dev/null 2>&1 || { echo CCG_STATE=image_pull_failed; return 1; }
  if [ ! -e "$DATA/state-admin.secret" ]; then
    if ! { { od -An -N32 -tx1 /dev/urandom | tr -d ' \n'; echo; } > "$DATA/state-admin.secret.tmp" \
         && chmod 600 "$DATA/state-admin.secret.tmp" && mv -f "$DATA/state-admin.secret.tmp" "$DATA/state-admin.secret"; }; then
      rm -f "$DATA/state-admin.secret.tmp"; echo CCG_STATE=secret_failed; return 1
    fi
  fi
  # One line of 32-256 hex digits (the controller reads the same rule); the
  # SHA-256 is of that line without its newline.
  PW=$(sed -n '1{/^[0-9a-f]\{32,256\}$/p;}' "$DATA/state-admin.secret" 2>/dev/null)
  [ -n "$PW" ] || { echo CCG_STATE=secret_invalid; return 1; }
  H=$(printf '%s' "$PW" | sha256sum | sed 's/ .*//')
  printf '%s\n' "$H" | grep -Eq '^[0-9a-f]{64}$' || { echo CCG_STATE=secret_failed; return 1; }
  ACL=$ROOT/state-conf/users.acl
  if ! { printf 'user default off\nuser ccg-controller on #%s resetkeys resetchannels -@all +acl|setuser +acl|deluser +acl|list +acl|getuser +info +ping\n' "$H" > "$ACL.tmp" \
       && chmod 644 "$ACL.tmp"; }; then
    rm -f "$ACL.tmp"; echo CCG_STATE=acl_failed; return 1
  fi
  RECREATE=
  [ ! -e "$ACL" ] || [ "$(cat "$ACL.tmp")" = "$(cat "$ACL")" ] || RECREATE=--force-recreate
  mv -f "$ACL.tmp" "$ACL" || { rm -f "$ACL.tmp"; echo CCG_STATE=acl_failed; return 1; }
  dc up -d --no-deps $RECREATE state >/dev/null 2>&1 || { echo CCG_STATE=state_unavailable; return 1; }
  echo CCG_STATE=started
}
docker compose version >/dev/null 2>&1 || { echo CCG_RESULT=compose_unavailable; exit 1; }
# The old bridge guard would fight the guard over the same chain.
if systemctl is-active --quiet ccgateway-bridge-guard 2>/dev/null; then echo CCG_RESULT=bridge_guard_active; exit 1; fi
docker image inspect "$GUARD" >/dev/null 2>&1 || docker pull -q "$GUARD" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
mkdir -p "$ROOT" "$DATA" "$DIR" "$STATE" && chmod 700 "$ROOT" "$DATA" "$DIR" "$STATE" || { echo CCG_RESULT=install_failed; exit 1; }
state_dirs || { echo CCG_RESULT=install_failed; exit 1; }
# Moving the data must be a rename on one file system.
[ "$(stat -c %d "$ROOT")" = "$(stat -c %d "$DATA")" ] || { echo CCG_RESULT=data_cross_device; exit 1; }
lock || { echo CCG_RESULT=compose_locked; exit 1; }
if ! { cat > "$ENVF.tmp" && chmod 600 "$ENVF.tmp" && mv -f "$ENVF.tmp" "$ENVF"; }; then
  rm -f "$ENVF.tmp"; echo CCG_RESULT=install_failed; exit 1
fi
if ! { cat > "$DIR/compose.yml.tmp" <<'CCG_COMPOSE_EOF'
# CCGateway compose project (CONTRACTS §76). The only source of this file is
# the core (next/server/internal/ccgateway/compose/ccgateway.compose.yml): the
# install script writes it verbatim to /opt/ccgateway/compose.yml, and the
# manual guard deployment and the isolated test instance use the same text.
#
# The guard mounts /run/systemd/resolve (the directory: systemd-resolved
# replaces the file whole) for the control network DNS upstreams (D1); it is
# created empty on a host without systemd-resolved.
#
# Every instance value is a variable with its production value as the :-
# default; the core writes four variables into /opt/ccgateway/.env (CCG_GUARD_IMAGE, CCG_CONTROLLER_IMAGE,
# CCG_GATEWAY_IMAGE, CCG_GUARD_TOKEN), an isolated instance overrides the rest
# in its own .env.
#
# NEVER run up or down without a service name on this project: once the
# shared gateway is in compose that recreates or removes it and every account
# loses its egress. Always up -d --no-deps <service>.
name: ccgateway

x-log: &log
  driver: json-file
  options: {max-size: 20m, max-file: "3"}

services:
  guard:
    image: ${CCG_GUARD_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-guard
    restart: unless-stopped
    network_mode: host
    pid: host
    cap_drop: [ALL]
    cap_add: [NET_ADMIN, SYS_ADMIN, SYS_PTRACE]
    security_opt: ["no-new-privileges:true"]
    read_only: true
    tmpfs: ["/tmp:size=64m,mode=0700"]
    mem_limit: 256m
    pids_limit: 256
    stop_grace_period: 30s
    environment:
      # Go sizes its thread pool by the host CPU count (384 on ovh); with
      # pids_limit 256 the docker CLI and compose plugin the guard runs could
      # not start their threads (05 L7, 2026-11-01). Children inherit this.
      GOMAXPROCS: "4"
      CCG_GUARD_TOKEN: ${CCG_GUARD_TOKEN:?}
      CCG_GUARD_PREFIX: ${CCG_PREFIX:-ccg}
      CCG_GUARD_LISTEN: ${CCG_GUARD_ADDR:-172.29.255.1}:8790
      CCG_GUARD_CONTROLLER_IP: ${CCG_CONTROLLER_IP:-172.29.255.2}
      CCG_GUARD_CONTROL_NETWORK: ${CCG_CONTROL_NETWORK:-ccg-control}
      CCG_GUARD_CONTROL_BRIDGE: ${CCG_CONTROL_BRIDGE:-ccg-control0}
      CCG_GUARD_CONTROL_SUBNET: ${CCG_CONTROL_SUBNET:-172.29.255.0/29}
      CCG_GUARD_CONTROL_DNS: "${CCG_CONTROL_DNS:-1}"
      CCG_GUARD_CHAIN_PREFIX: ${CCG_CHAIN_PREFIX:-CCG}
      CCG_GUARD_PROJECT: ${CCG_PROJECT:-ccgateway}
      CCG_GUARD_PROJECT_DIR: ${CCG_PROJECT_DIR:-/opt/ccgateway}
      CCG_GUARD_RUNTIME_ROOT: ${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}
      # New account containers get <runtime root>/state (the session state
      # socket) read-only at /run/ccg-state; 0 keeps the two mounts of before
      # (SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.4). The install script creates
      # the directory before the guard starts.
      CCG_GUARD_SESSION_STATE: "${CCG_GUARD_SESSION_STATE:-1}"
    volumes:
      - {type: bind, source: /var/run/docker.sock, target: /var/run/docker.sock, bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}", target: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}", bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_PROJECT_DIR:-/opt/ccgateway}", target: "${CCG_PROJECT_DIR:-/opt/ccgateway}", bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}", target: "${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}", read_only: true, bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_GUARD_STATE:-/var/lib/ccgateway-guard}", target: /var/lib/ccgateway-guard, bind: {create_host_path: false}}
      - {type: bind, source: /run/systemd/resolve, target: /run/systemd/resolve, read_only: true, bind: {create_host_path: true}}
    healthcheck:
      test: ["CMD", "/usr/local/bin/ccgateway-guard", "ready"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 30s
    labels: {io.sup2api.ccgateway.guard: "${CCG_PREFIX:-ccg}"}
    logging: *log

  controller:
    image: ${CCG_CONTROLLER_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-controller
    restart: unless-stopped
    networks:
      control: {ipv4_address: "${CCG_CONTROLLER_IP:-172.29.255.2}"}
    ports: ["127.0.0.1:${CCG_CONTROLLER_PUBLISH:-8787}:8787"]
    env_file: ["${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}"]
    # environment wins over the same names in env_file: .env is the only
    # source of the controller image and the guard token.
    environment:
      GOMAXPROCS: "4"
      CCG_RUNTIME_ROOT: /data
      CCG_CONTROLLER_BIND: 0.0.0.0
      CCG_CONTROLLER_IMAGE: ${CCG_CONTROLLER_IMAGE:?}
      CCG_GUARD_URL: http://${CCG_GUARD_ADDR:-172.29.255.1}:8790
      CCG_GUARD_TOKEN: ${CCG_GUARD_TOKEN:?}
    volumes:
      - {type: bind, source: "${CCG_CONTROLLER_DATA:-/opt/ccgateway-controller}", target: /data, bind: {create_host_path: false}}
      # The session state socket, for the per-account ACL users (§7.5).
      - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}/state", target: /run/ccg-state, read_only: true, bind: {create_host_path: false}}
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    read_only: true
    tmpfs: ["/tmp:size=64m"]
    # 2g: headroom over what the Go controller uses (large files stream
    # through /data/.spool, whose page cache is charged here too).
    mem_limit: 2g
    pids_limit: 512
    stop_grace_period: 15s
    healthcheck:
      test: ["CMD", "/ccg-controller", "healthcheck"]
      interval: 5s
      timeout: 4s
      retries: 3
      start_period: 10s
    labels: {io.sup2api.ccgateway.controller: "${CCG_PREFIX:-ccg}"}
    logging: *log

  # The shared Xray gateway: only in the maintenance window that moves it into
  # compose (--profile egress); a plain up never touches it.
  egress:
    profiles: [egress]
    image: ${CCG_GATEWAY_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-shared-egress
    restart: unless-stopped
    init: true
    networks: [uplink]
    cap_drop: [ALL]
    cap_add: [NET_ADMIN, NET_BIND_SERVICE]
    security_opt: ["no-new-privileges:true"]
    sysctls:
      net.ipv4.ip_forward: "0"
      net.ipv6.conf.all.disable_ipv6: "1"
    environment: {GOMAXPROCS: "2"}
    volumes:
      - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}/shared-egress", target: /config, read_only: true, bind: {create_host_path: false}}
    mem_limit: 384m
    pids_limit: 256
    cpus: 2
    labels: {io.sup2api.ccgateway.shared: "${CCG_PREFIX:-ccg}"}
    logging: {driver: json-file, options: {max-size: 10m, max-file: "3"}}

  # The session memory of the account Workers (SESSION-MEMORY-TOOLS-USED-DESIGN.md
  # §5, §7.3): one Valkey per host, a unix socket only (no network at all),
  # nothing persisted (a restart is every session expiring). The users are the
  # admin user of the controller from the ACL file the install script writes and
  # one user per account the controller adds at run time; default is off.
  # The entrypoint of the image is bypassed: as root it chowns and drops to the
  # valkey user, which needs CAP_CHOWN and CAP_SETUID (all dropped here).
  state:
    image: ${CCG_STATE_IMAGE:-valkey/valkey:9.1.2}
    container_name: ${CCG_PREFIX:-ccg}-state
    restart: unless-stopped
    init: true
    network_mode: none
    user: "0:0"
    entrypoint: ["valkey-server"]
    command: ["--port", "0", "--unixsocket", "/run/ccg-state/valkey.sock", "--unixsocketperm", "666",
              "--save", "", "--appendonly", "no", "--maxmemory", "256mb", "--maxmemory-policy", "volatile-lru",
              "--protected-mode", "yes", "--aclfile", "/etc/valkey/users.acl"]
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    read_only: true
    tmpfs: ["/data:size=16m,mode=0700"]
    volumes:
      - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}/state", target: /run/ccg-state, bind: {create_host_path: false}}
      # The directory, not the file: a rename by the installer then reaches the
      # container on its next start.
      - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}/state-conf", target: /etc/valkey, read_only: true, bind: {create_host_path: false}}
    mem_limit: 320m
    pids_limit: 64
    cpus: 1
    stop_grace_period: 10s
    labels: {io.sup2api.ccgateway.state: "${CCG_PREFIX:-ccg}"}
    logging: *log

networks:
  control:
    external: true
    name: ${CCG_CONTROL_NETWORK:-ccg-control}
  uplink:
    external: true
    name: ${CCG_PREFIX:-ccg}-d0000000000000000-xray-uplink
CCG_COMPOSE_EOF
} || ! chmod 600 "$DIR/compose.yml.tmp" || ! mv -f "$DIR/compose.yml.tmp" "$DIR/compose.yml"; then
  rm -f "$DIR/compose.yml.tmp"; echo CCG_RESULT=install_failed; exit 1
fi
# .env keeps the host's guard token, gateway image and other instance
# variables; the first change of an install keeps the previous file as
# .env.prev until finish or rollback.
TOKEN=$(sed -n 's/^CCG_GUARD_TOKEN=\([0-9a-f]\{64\}\)$/\1/p' "$DIR/.env" 2>/dev/null | head -n 1)
[ -n "$TOKEN" ] || TOKEN=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
printf '%s\n' "$TOKEN" | grep -Eq '^[0-9a-f]{64}$' || { echo CCG_RESULT=install_failed; exit 1; }
GW=$(sed -n 's/^CCG_GATEWAY_IMAGE=\([A-Za-z0-9][A-Za-z0-9._\/:@-]*\)$/\1/p' "$DIR/.env" 2>/dev/null | head -n 1)
[ -n "$GW" ] || GW=$EGRESS
[ -e "$DIR/.env.prev" ] || [ ! -e "$DIR/.env" ] || cp -p "$DIR/.env" "$DIR/.env.prev" || { echo CCG_RESULT=install_failed; exit 1; }
if ! { { grep -E '^CCG_[A-Z0-9_]+=' "$DIR/.env" 2>/dev/null | grep -Ev '^CCG_(GUARD_IMAGE|CONTROLLER_IMAGE|GATEWAY_IMAGE|GUARD_TOKEN|STATE_IMAGE)='
       printf 'CCG_GUARD_IMAGE=%s\nCCG_CONTROLLER_IMAGE=%s\nCCG_GATEWAY_IMAGE=%s\nCCG_GUARD_TOKEN=%s\nCCG_STATE_IMAGE=%s\n' "$GUARD" "$CTL" "$GW" "$TOKEN" "$STATEIMG"; } > "$DIR/.env.tmp" \
     && chmod 600 "$DIR/.env.tmp" && mv -f "$DIR/.env.tmp" "$DIR/.env"; }; then
  rm -f "$DIR/.env.tmp"; restore_env; echo CCG_RESULT=install_failed; exit 1
fi
# The control network (external: a stray down never removes it).
NET=$(docker network inspect --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' ccg-control 2>/dev/null)
if [ -z "$NET" ]; then
  docker network create --driver bridge --subnet 172.29.255.0/29 --gateway 172.29.255.1 \
    -o com.docker.network.bridge.name=ccg-control0 --label io.sup2api.ccgateway.control=ccg ccg-control >/dev/null 2>&1 \
    || { restore_env; echo CCG_RESULT=control_network_conflict; exit 1; }
elif [ "$NET" != 172.29.255.0/29 ]; then restore_env; echo CCG_RESULT=control_network_conflict; exit 1; fi
dc config -q >/dev/null 2>&1 || { restore_env; echo CCG_RESULT=compose_config_failed; exit 1; }
# The session state before the guard that mounts it into new containers.
state_up
# The guard first: only an explicit install updates it.
if ! dc up -d --no-deps guard >/dev/null 2>&1; then
  restore_guard; echo CCG_RESULT=guard_unavailable; exit 1
fi
i=0
until dc exec -T guard ccgateway-guard ready >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge 30 ]; then restore_guard; echo CCG_RESULT=guard_unavailable; exit 1; fi
  sleep 1
done
# An install interrupted after the rename left only the previous controller.
if ! docker inspect --type container ccg-controller >/dev/null 2>&1 && docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1
  OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
fi
if docker inspect --type container ccg-controller >/dev/null 2>&1 && [ "$OWNER" != ccgateway ]; then
  # Another compose project owns the name.
  [ -z "$OWNER" ] || { restore_guard; echo CCG_RESULT=controller_name_taken; exit 1; }
  # Transition: a controller started by docker run becomes the previous one.
  docker rm -f ccg-controller-prev >/dev/null 2>&1
  : > "$DIR/.transition"
  docker rename ccg-controller ccg-controller-prev >/dev/null 2>&1 || { rm -f "$DIR/.transition"; restore_guard; echo CCG_RESULT=install_failed; exit 1; }
  docker stop ccg-controller-prev >/dev/null 2>&1
else
  # Compose already (or a new host): the previous controller of an install
  # that never finished is dropped, as the docker run path does.
  docker rm -f ccg-controller-prev >/dev/null 2>&1
  rm -f "$DIR/.transition"
fi
if ! adopt; then
  if release; then
    rm -f "$DIR/.transition"
    docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1
    restore_guard
    echo CCG_ROLLBACK=restored
  else
    echo CCG_ROLLBACK=restore_failed
  fi
  echo CCG_RESULT=adopt_failed; exit 1
fi
if ! dc up -d --no-deps controller >/dev/null 2>&1; then
  R=$(compose_rollback)
  echo "CCG_ROLLBACK=$R"
  echo CCG_RESULT=controller_unhealthy; exit 1
fi
echo CCG_RESULT=started

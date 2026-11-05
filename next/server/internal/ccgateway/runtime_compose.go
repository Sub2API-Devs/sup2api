package ccgateway

import (
	_ "embed"
)

// Compose installation (CONTRACTS §76): a controller image labelled
// io.sup2api.ccgateway.guard-api=1 (the Go controller) is installed as the
// compose project ccgateway next to the guard; any other image takes the
// docker run path of 0.1.226, unchanged. The texts below are constants: the
// scripts contain them and image references that pass validImage, nothing
// else.

const (
	composeDir     = "/opt/ccgateway"
	controllerData = "/opt/ccgateway-controller"
	guardState     = "/var/lib/ccgateway-guard"

	// guardAPILabel marks a controller image that runs only under the guard;
	// guardAPIFeature is what such a controller reports in /health.features.
	guardAPILabel   = "io.sup2api.ccgateway.guard-api"
	guardAPIFeature = "guard-api-v1"

	// StateImage is the session state Valkey (SESSION-MEMORY-TOOLS-USED-DESIGN.md
	// §5.1): the version the core's own cache runs on ovh (2026-11-05), pinned
	// to its minor release. The install script writes it into .env as
	// CCG_STATE_IMAGE; the compose template has it as the default too.
	StateImage = "valkey/valkey:9.1.2"
)

// composeTemplate is /opt/ccgateway/compose.yml, written verbatim through a
// quoted heredoc (no expansion). It is the only copy of the file.
//
//go:embed compose/ccgateway.compose.yml
var composeTemplate string

const composeHeredocEnd = "CCG_COMPOSE_EOF"

// legacyInstallBody is the 0.1.226 install script from the creation of the
// runtime root to "started", byte for byte (testdata/install-legacy-0.1.226.sh
// guards it).
const legacyInstallBody = `mkdir -p "$ROOT" && chmod 700 "$ROOT" || { echo CCG_RESULT=install_failed; exit 1; }
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
`

// legacyRollback is the 0.1.226 rollbackScript, byte for byte
// (testdata/rollback-legacy-0.1.226.sh).
const legacyRollback = `docker rm -f ccg-controller >/dev/null 2>&1
if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  if docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1; then
    echo CCG_RESULT=restored; exit 0
  fi
  echo CCG_RESULT=restore_failed; exit 1
fi
echo CCG_RESULT=removed
`

// installPathSelect reads the controller image's guard-api label and who
// owns ccg-controller, and opens the docker run branch for an image without
// the label. That branch refuses a host compose already manages: the old
// controller would start on the runtime root the controller data was moved
// out of (legacy_blocked).
const installPathSelect = `API=$(docker image inspect --format '{{index .Config.Labels "` + guardAPILabel + `"}}' "$CTL" 2>/dev/null)
OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
if [ "$API" != 1 ]; then
if [ "$OWNER" = ccgateway ] || [ -e "$DATA/.adopted" ] || [ -e "$DATA/.adopting" ]; then echo CCG_RESULT=legacy_blocked; exit 1; fi
`

// composeCommon defines what the install and rollback scripts share: dc
// (the project, never used without a service name), lock (the compose lock
// the guard takes too, held until the script exits), and release, which
// moves the controller data back from $DATA to $ROOT (§76.5).
const composeCommon = `dc() { docker compose -p ccgateway --project-directory "$DIR" -f "$DIR/compose.yml" --env-file "$DIR/.env" "$@"; }
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
`

// composeAdopt moves the controller's files from $ROOT to $DATA (§76.5):
// rename only (one file system), conflict fails, mount sources of account
// and gateway containers stay. Every move is journaled in $DATA/.adopting
// first; the finished list becomes $DATA/.adopted, and an existing .adopted
// means done. state/ and state-conf/ are the session state Valkey's mount
// sources (composeState makes them before adopt runs): they stay, like the
// gateway's shared-egress files, and are not leftovers to journal.
const composeAdopt = `restore_env() { [ -e "$DIR/.env.prev" ] && mv -f "$DIR/.env.prev" "$DIR/.env"; }
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
`

// composeState sets up the session state Valkey (SESSION-MEMORY-TOOLS-USED-
// DESIGN.md §5, §7.2, §7.3, §7.5). state_dirs is required: a guard with
// CCG_GUARD_SESSION_STATE=1 checks state/ (root 0755) before every new
// account container. state_up is best effort and prints CCG_STATE=<result>:
// without Valkey the Workers keep their memory in process, so the install
// goes on. The admin password is made once ($DATA/state-admin.secret, 0600,
// one line of 64 hex digits) and never replaced; users.acl holds only its
// SHA-256 and is rewritten from it every time (the same bytes unless the
// secret changed, and then Valkey is recreated to load it: it reads the file
// only at start). Every step is idempotent.
const composeState = `state_dirs() {
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
`

// composeInstallBody is the compose path of the install script, after the
// docker run branch.
func composeInstallBody() string {
	return `# ---- compose path (CONTRACTS §76) ----
` + composeCommon + composeAdopt + composeState + `docker compose version >/dev/null 2>&1 || { echo CCG_RESULT=compose_unavailable; exit 1; }
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
if ! { cat > "$DIR/compose.yml.tmp" <<'` + composeHeredocEnd + `'
` + composeTemplate + composeHeredocEnd + `
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
`
}

// composeRollbackBranch is the compose half of rollbackScript: a host whose
// controller compose runs, or with the marks of a compose install in
// progress, rolls back that install; anything else is the 0.1.226 rollback.
const composeRollbackBranch = `OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
if [ "$OWNER" = ccgateway ] || [ -e "$DIR/.env.prev" ] || [ -e "$DIR/.transition" ]; then
  lock || { echo CCG_RESULT=restore_failed; exit 1; }
  R=$(compose_rollback)
  echo "CCG_RESULT=$R"
  [ "$R" != restore_failed ] || exit 1
  exit 0
fi
`

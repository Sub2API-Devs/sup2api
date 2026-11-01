set -u
ROOT='/opt/ccgateway-runtime'
DIR='/opt/ccgateway'
DATA='/opt/ccgateway-controller'
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
OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
if [ "$OWNER" = ccgateway ] || [ -e "$DIR/.env.prev" ] || [ -e "$DIR/.transition" ]; then
  lock || { echo CCG_RESULT=restore_failed; exit 1; }
  R=$(compose_rollback)
  echo "CCG_RESULT=$R"
  [ "$R" != restore_failed ] || exit 1
  exit 0
fi
docker rm -f ccg-controller >/dev/null 2>&1
if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  if docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1; then
    echo CCG_RESULT=restored; exit 0
  fi
  echo CCG_RESULT=restore_failed; exit 1
fi
echo CCG_RESULT=removed

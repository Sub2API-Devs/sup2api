#!/bin/sh
# SESSION-MEMORY-TOOLS-USED-DESIGN.md §10.2: the session state Valkey's ACL
# isolation, sign-in, block/delete, restart and the controller's and the
# Worker's sides against a real Valkey, on a Docker host (ovh).
#
#   run.sh <next source dir> <work dir>
#
# Valkey runs as the compose service does (ccgateway.compose.yml "state":
# image, arguments, root without capabilities, read-only, no network, the
# socket in a root 0755 directory, users.acl written as the install script
# writes it). The -tags realvalkey test binaries run inside the same image
# (root, for the restart tests; memory and pids limits raised for them)
# next to a loop that starts valkey-server again when a test stops it,
# unless the pause file exists; the Worker store
# test runs once more as uid 1000 in a container of its own with the socket
# directory mounted read-only, as an account container has it.
set -eu
SRC=$(cd "${1:?next source dir}" && pwd)
mkdir -p "${2:?work dir}"
W=$(cd "$2" && pwd)
IMG=${CCG_STATE_IMAGE:-valkey/valkey:9.1.2}
GO=${GO_IMAGE:-golang:1.27-bookworm}
MOD=${GO_MOD_VOLUME:-ccg-state-gomod}
NAME=ccg-state-it
C=/src/plugins/ccgateway/companions

docker rm -f "$NAME" >/dev/null 2>&1 || true
[ -d "$W" ] && docker run --rm -v "$W:/w" alpine sh -c 'rm -rf /w/* /w/.[!.]*' 2>/dev/null || true
mkdir -p "$W/bin" "$W/state" "$W/state-conf" "$W/secret"

# The test binaries (static: the Valkey image has no Go).
docker volume create "$MOD" >/dev/null
docker run --rm -v "$SRC:/src:ro" -v "$W/bin:/out" -v "$MOD:/go/pkg/mod" -e GOWORK=off -e CGO_ENABLED=0 \
  -e GOFLAGS=-mod=mod "$GO" sh -c "
  cd $C && go test -c -tags realvalkey -o /out/engine.test ./engine &&
  cd $C/controller-go && go test -c -tags realvalkey -o /out/sessionstate.test ./internal/sessionstate &&
  go test -c -tags realvalkey -o /out/accounts.test ./internal/accounts"

# The install script's management password and users.acl (runtime_compose.go
# composeState: one line of 64 hex digits; default off; the management
# user's hash and rules).
PW=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
printf '%s\n' "$PW" > "$W/secret/state-admin.secret"
H=$(printf '%s' "$PW" | sha256sum | sed 's/ .*//')
printf 'user default off\nuser ccg-controller on #%s resetkeys resetchannels -@all +acl|setuser +acl|deluser +acl|list +acl|getuser +info +ping\n' "$H" > "$W/state-conf/users.acl"
chmod 644 "$W/state-conf/users.acl" "$W/secret/state-admin.secret"
# Owned by root as on a host (state/ 0755, state-conf/ 0700).
docker run --rm -v "$W:/w" alpine sh -c 'chown -R 0:0 /w/state /w/state-conf /w/secret && chmod 755 /w/state && chmod 700 /w/state-conf'

ARGS='--port 0 --unixsocket /run/ccg-state/valkey.sock --unixsocketperm 666 --save "" --appendonly no --maxmemory 256mb --maxmemory-policy volatile-lru --protected-mode yes --aclfile /etc/valkey/users.acl'
docker image inspect "$IMG" >/dev/null 2>&1 || docker pull -q "$IMG" >/dev/null
docker run -d --name "$NAME" --init --network none --user 0:0 --cap-drop ALL --security-opt no-new-privileges:true \
  --read-only --tmpfs /data:size=16m,mode=0700 --tmpfs /tmp:size=256m --memory 1g --pids-limit 512 \
  -v "$W/state:/run/ccg-state" -v "$W/state-conf:/etc/valkey:ro" -v "$W/bin:/t:ro" -v "$W/secret:/secret:ro" \
  -v "$SRC:/src:ro" --entrypoint sh "$IMG" -c "
  while :; do
    while [ -e /tmp/valkey.pause ]; do sleep 0.1; done
    eval valkey-server $ARGS
    sleep 0.2
  done" >/dev/null
i=0
until docker exec "$NAME" sh -c '[ -S /run/ccg-state/valkey.sock ]'; do
  i=$((i+1)); [ "$i" -lt 50 ] || { docker logs "$NAME"; exit 1; }; sleep 0.2
done
docker exec "$NAME" valkey-server --version

ENV='-e CCG_REAL_VALKEY_SOCKET=/run/ccg-state/valkey.sock -e CCG_REAL_VALKEY_SECRET_FILE=/secret/state-admin.secret -e CCG_REAL_VALKEY_PAUSE=/tmp/valkey.pause'
rc=0
run() { # name dir binary args...
  n=$1; d=$2; b=$3; shift 3
  if docker exec $ENV -e TMPDIR=/tmp -w "$d" "$NAME" "/t/$b" -test.v -test.count=1 "$@" > "$W/$n.log" 2>&1; then r=0; else r=$?; rc=1; fi
  echo "$n exit=$r pass=$(grep -c '^--- PASS\|^    --- PASS' "$W/$n.log") fail=$(grep -c -- '--- FAIL' "$W/$n.log") skip=$(grep -c -- '--- SKIP' "$W/$n.log")"
}
run sessionstate $C/controller-go/internal/sessionstate sessionstate.test -test.run RealValkey
run accounts $C/controller-go/internal/accounts accounts.test -test.run RealValkey
run engine $C/engine engine.test -test.run 'RealValkey|SessionStores'
# The Worker's side as an account container: another uid, read-only mount.
if docker run --rm --network none --user 1000:1000 --cap-drop ALL --read-only --tmpfs /tmp \
  -v "$W/state:/run/ccg-state:ro" -v "$W/bin:/t:ro" -v "$W/secret:/secret:ro" -v "$SRC:/src:ro" -w $C/engine \
  -e CCG_REAL_VALKEY_SOCKET=/run/ccg-state/valkey.sock -e CCG_REAL_VALKEY_SECRET_FILE=/secret/state-admin.secret \
  --entrypoint /t/engine.test "$IMG" -test.v -test.count=1 -test.run 'RealValkeyWorkerStore' > "$W/engine-uid1000.log" 2>&1; then r=0; else r=$?; rc=1; fi
echo "engine-uid1000 exit=$r pass=$(grep -c '^--- PASS' "$W/engine-uid1000.log") fail=$(grep -c -- '--- FAIL' "$W/engine-uid1000.log")"
docker exec "$NAME" sh -c 'ls -la /run/ccg-state'
docker logs "$NAME" > "$W/valkey.log" 2>&1
docker rm -f "$NAME" >/dev/null
echo "REAL-VALKEY rc=$rc"
exit $rc

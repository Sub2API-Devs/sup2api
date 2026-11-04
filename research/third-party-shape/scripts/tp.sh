#!/bin/sh
# Third-party vs first-party capture (2026-11-02). Runs inside one throwaway
# --network none container from ccgateway-app:0.1.122, started with
#   --add-host api.anthropic.com:127.0.0.1 --sysctl net.ipv4.ip_unprivileged_port_start=0
# /t holds: fake-upstream.cjs, proxy.cjs (e2e kit, unchanged), cap-upstream.cjs,
# bin/claude-2.1.316, bin/claude-2.1.312 (official, unmodified).
# Shapes:
#   A   real first party: no base URL, no unix socket, TLS to api.anthropic.com:443 (the fake)
#   A1  kit reference: ANTHROPIC_UNIX_SOCKET + _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1
#   B   third party: ANTHROPIC_BASE_URL=http://127.0.0.1:8790 (the fake over plain HTTP)
#   C   B through stand-in core (proxy.cjs :8788, policy header) -> Worker w1 -> v43 CLI -> fake
# Captures: /t/cap/<case>/req-NN.json (+ in/ for C: what the gateway received).
# sh tp.sh step1|step3|smoke
set -u
T=/t
PHASE=${1:-smoke}
CERT=$T/cert
mkdir -p $CERT $T/cap $T/logs $T/workdir $T/acct
if [ ! -f $CERT/ca.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -keyout $CERT/ca.key -out $CERT/ca.pem -days 2 \
    -subj "/CN=cc3p-ca" -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
  openssl req -newkey rsa:2048 -nodes -keyout $CERT/server.key.pem -out $CERT/server.csr -subj "/CN=api.anthropic.com" 2>/dev/null
  printf 'subjectAltName=DNS:api.anthropic.com,DNS:platform.claude.com,DNS:claude.ai,DNS:console.anthropic.com\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\n' > $CERT/ext.cnf
  openssl x509 -req -in $CERT/server.csr -CA $CERT/ca.pem -CAkey $CERT/ca.key -CAcreateserial \
    -out $CERT/server.crt.pem -days 2 -extfile $CERT/ext.cnf 2>/dev/null
  openssl req -x509 -newkey rsa:2048 -nodes -keyout $CERT/key.pem -out $CERT/cert.pem -days 2 \
    -subj /CN=api.anthropic.com -addext subjectAltName=DNS:api.anthropic.com 2>/dev/null
fi
FAR=$(( ($(date +%s) + 86400 * 30) * 1000 ))
printf '{"claudeAiOauth":{"accessToken":"sk-ant-oat01-ccgaudit-fake","refreshToken":"sk-ant-ort01-ccgaudit-fake","expiresAt":%s,"scopes":["user:inference","user:profile","user:sessions:claude_code"],"subscriptionType":"max"}}' $FAR > $T/acct/.credentials.json
printf '{"oauthAccount":{"emailAddress":"worker@example.invalid","accountUuid":"00000000-0000-4000-8000-000000000001","organizationUuid":"00000000-0000-4000-8000-000000000002"},"hasCompletedOnboarding":true}' > $T/acct/.claude.json
chmod 600 $T/acct/.credentials.json

wait_for() { i=0; while [ $i -lt "$2" ]; do curl -sf -m 2 "$1" >/dev/null 2>&1 && return 0; i=$((i+1)); sleep 1; done; return 1; }
start_fake() { # $1 capture dir, $2 scenario
  rm -rf "$1"; mkdir -p "$1"
  SCENARIO=$2 HTTP_PORT=8790 TLS_PORT=443 TLS_KEY=$CERT/server.key.pem TLS_CERT=$CERT/server.crt.pem \
    node $T/cap-upstream.cjs $T/up.sock "$1" $CERT > $T/logs/fake.log 2>&1 &
  echo $! > $T/fake.pid
  i=0; while [ $i -lt 20 ] && [ ! -S $T/up.sock ]; do i=$((i+1)); sleep 0.5; done
  sleep 0.5
}
stop_fake() { kill "$(cat $T/fake.pid)" 2>/dev/null; sleep 0.5; rm -f $T/up.sock; }

# Client home and cwd: the same paths for every shape, reset per case.
H=$T/home-c; RUN=$T/run
fresh() { rm -rf $H $RUN; mkdir -p $H/.claude $RUN; printf '{"hasCompletedOnboarding":true}' > $H/.claude.json; }
CEXTRA='CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
client() { # uses BIN CENV CARGS CEXTRA; $1 label
  ( cd $RUN && eval "env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$H CLAUDE_CONFIG_DIR=$H/.claude \
      CLAUDE_SECURESTORAGE_CONFIG_DIR=$H/.claude DISABLE_AUTOUPDATER=1 $CEXTRA \
      $CENV timeout 180 \$BIN $CARGS" > $T/logs/out-$1.json 2> $T/logs/err-$1.txt )
  echo "  [$1] exit=$? $(head -c 160 $T/logs/out-$1.json | tr '\n' ' ') $(tail -c 200 $T/logs/err-$1.txt | tr '\n' ' ')"
}

SHAPE_A='NODE_EXTRA_CA_CERTS=/t/cert/ca.pem'
SHAPE_A1='ANTHROPIC_UNIX_SOCKET=/t/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'
SHAPE_B='ANTHROPIC_BASE_URL=http://127.0.0.1:8790 NODE_EXTRA_CA_CERTS=/t/cert/ca.pem'
SHAPE_C='ANTHROPIC_BASE_URL=http://127.0.0.1:8788 NODE_EXTRA_CA_CERTS=/t/cert/ca.pem'
SHAPE_CF='ANTHROPIC_BASE_URL=http://127.0.0.1:8788 NODE_EXTRA_CA_CERTS=/t/cert/ca.pem _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'
AUTH_oauth='CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-client-fake'
AUTH_token='ANTHROPIC_AUTH_TOKEN=ccg-client-token-fake'
AUTH_apikey='ANTHROPIC_API_KEY=sk-ant-api03-client-fake'
# Through the gateway the client authenticates with the gateway key.
GAUTH_oauth='CLAUDE_CODE_OAUTH_TOKEN=ccg-audit-gateway-key'
GAUTH_token='ANTHROPIC_AUTH_TOKEN=ccg-audit-gateway-key'
P1='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
SUB='-p "use a subagent to say OK" --model claude-opus-4-8 --output-format json'

case_run() { # $1 case name, $2 scenario, $3 env, $4 args, [$5 turn2=1]
  echo "== $1"
  start_fake $T/cap/$1 "$2"; fresh
  [ -n "${INBOUND:-}" ] && printf '%s' "$T/cap/$1/in" > $T/inbound-dir-p1
  CENV=$3; CARGS=$4; client "$1-t1"
  if [ "${5:-}" = 1 ]; then CARGS="$4 --continue"; client "$1-t2"; fi
  [ -n "${INBOUND:-}" ] && printf '' > $T/inbound-dir-p1
  stop_fake
}
# Interactive-like: the TUI under script(1), the prompt as argument, killed after the first answer.
tui_run() { # $1 case, $2 env
  echo "== $1 (tui)"
  start_fake $T/cap/$1 text; fresh
  printf '{"hasCompletedOnboarding":true,"lastOnboardingVersion":"2.1.316","theme":"dark","numStartups":3,"projects":{"/t/run":{"hasTrustDialogAccepted":true,"hasCompletedProjectOnboarding":true}}}' > $H/.claude.json
  cp $H/.claude.json $H/.claude/.claude.json
  [ -n "${INBOUND:-}" ] && printf '%s' "$T/cap/$1/in" > $T/inbound-dir-p1
  ( cd $RUN && eval "env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$H CLAUDE_CONFIG_DIR=$H/.claude TERM=xterm-256color \
      CLAUDE_SECURESTORAGE_CONFIG_DIR=$H/.claude DISABLE_AUTOUPDATER=1 $CEXTRA $2 \
      timeout 40 script -qfec \"\$BIN --model claude-opus-4-8 'Reply with the single word OK.'\" /dev/null" > $T/logs/tui-$1.txt 2>&1 < /dev/null )
  echo "  [$1] exit=$? reqs=$(ls $T/cap/$1 | grep -c req-)"
  [ -n "${INBOUND:-}" ] && printf '' > $T/inbound-dir-p1
  stop_fake
}

step1() {
  for V in 2.1.316 2.1.312; do
    BIN=$T/bin/claude-$V
    for AU in oauth token apikey; do
      eval "AE=\$AUTH_$AU"
      for SH in A B; do
        eval "SE=\$SHAPE_$SH"
        case_run "s1-$V-$AU-$SH-p1" text "$SE $AE" "$P1"
        case_run "s1-$V-$AU-$SH-turn2" text "$SE $AE" "$P1" 1
        case_run "s1-$V-$AU-$SH-sub" subagent "$SE $AE" "$SUB"
      done
      case_run "s1-$V-$AU-A1-p1" text "$SHAPE_A1 $AE" "$P1"
    done
    for SH in A B; do
      eval "SE=\$SHAPE_$SH"
      CEXTRA='CLAUDE_CODE_ENTRYPOINT=cli CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' case_run "s1-$V-oauth-$SH-entrycli" text "$SE $AUTH_oauth" "$P1"
      CEXTRA='' case_run "s1-$V-token-$SH-nonessential" aux "$SE $AUTH_token" "$P1"
      CEXTRA='CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
      tui_run "s1-$V-oauth-$SH-tui" "$SE $AUTH_oauth"
    done
  done
}

# A logged-in subscriber (stored /login credentials + oauthAccount), no token env.
login_home() {
  printf '{"claudeAiOauth":{"accessToken":"sk-ant-oat01-client-login","refreshToken":"sk-ant-ort01-client-login","expiresAt":%s,"scopes":["user:inference","user:profile","user:sessions:claude_code"],"subscriptionType":"max","rateLimitTier":"default_claude_max_20x"}}' $FAR > $H/.claude/.credentials.json
  chmod 600 $H/.claude/.credentials.json
  printf '{"hasCompletedOnboarding":true,"lastOnboardingVersion":"2.1.316","theme":"dark","numStartups":3,"oauthAccount":{"emailAddress":"client@example.invalid","accountUuid":"22222222-2222-4222-8222-222222222222","organizationUuid":"11111111-1111-4111-8111-111111111111","organizationRole":"admin","billingType":"stripe_subscription"},"projects":{"/t/run":{"hasTrustDialogAccepted":true,"hasCompletedProjectOnboarding":true}}}' > $H/.claude.json
  cp $H/.claude.json $H/.claude/.claude.json
}
login_case() { # $1 case, $2 scenario, $3 env, $4 args, [$5 turn2]
  echo "== $1 (login)"
  start_fake $T/cap/$1 "$2"; fresh; login_home
  [ -n "${INBOUND:-}" ] && printf '%s' "$T/cap/$1/in" > $T/inbound-dir-p1
  CENV=$3; CARGS=$4; client "$1-t1"
  if [ "${5:-}" = 1 ]; then CARGS="$4 --continue"; client "$1-t2"; fi
  [ -n "${INBOUND:-}" ] && printf '' > $T/inbound-dir-p1
  stop_fake
}
login_tui() { # $1 case, $2 env
  echo "== $1 (login tui)"
  start_fake $T/cap/$1 text; fresh; login_home
  ( cd $RUN && eval "env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$H CLAUDE_CONFIG_DIR=$H/.claude TERM=xterm-256color       CLAUDE_SECURESTORAGE_CONFIG_DIR=$H/.claude DISABLE_AUTOUPDATER=1 $CEXTRA $2       timeout 40 script -qfec \"$BIN --model claude-opus-4-8 'Reply with the single word OK.'\" /dev/null" > $T/logs/tui-$1.txt 2>&1 < /dev/null )
  echo "  [$1] exit=$? reqs=$(ls $T/cap/$1 | grep -c req-)"
  stop_fake
}
steplogin() {
  for V in 2.1.316 2.1.312; do
    BIN=$T/bin/claude-$V
    login_case "s1-$V-login-A-p1" text "$SHAPE_A" "$P1"
    login_case "s1-$V-login-A-turn2" text "$SHAPE_A" "$P1" 1
    login_case "s1-$V-login-A-sub" subagent "$SHAPE_A" "$SUB"
    login_case "s1-$V-login-B-p1" text "$SHAPE_B" "$P1"
    login_tui "s1-$V-login-A-tui" "$SHAPE_A"
    login_tui "s1-$V-login-A-tui2" "$SHAPE_A"
  done
}

# --- step 3: the gateway path ------------------------------------------------
start_worker() {
  mkdir -p $T/data-w1
  env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$T/acct CLAUDE_CONFIG_DIR=$T/acct CLAUDE_SECURESTORAGE_CONFIG_DIR=$T/acct \
    CCG_BIND=127.0.0.1:8787 CCG_API_KEY=ccg-audit-gateway-key CCG_ADMIN_KEY=ccg-audit-admin-key \
    WORKER_CLI_VERSION=2.1.316 CCG_CLI_SHA256=$(node -e 'console.log(require("/opt/ccgateway/cli/manifest.json").versions["2.1.316"].sha256)') \
    CCG_CLI_PATCH=$(node -e 'console.log(require("/opt/ccgateway/cli/manifest.json").versions["2.1.316"].patch)') \
    WORKER_CLI_PATH=/opt/ccgateway/cli/2.1.316/claude \
    CCG_DATA_DIR=$T/data-w1 CCG_WORKING_DIRECTORY=$T/workdir \
    ANTHROPIC_UNIX_SOCKET=$T/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0 CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-ccgaudit-fake \
    /usr/local/bin/worker > $T/logs/worker-w1.log 2>&1 &
  echo $! > $T/worker.pid
  if ! wait_for http://127.0.0.1:8787/healthz 90; then echo "WORKER DID NOT START"; tail -20 $T/logs/worker-w1.log; exit 1; fi
  echo "worker ready: $(curl -s http://127.0.0.1:8787/healthz | head -c 300)"
  printf '{}' > $T/policy.json
  INBOUND_FILE=$T/inbound-dir-p1 WORKER_RESP_LOG=$T/logs/worker-resp.jsonl node $T/proxy.cjs 8788 8787 $T/policy.json > $T/logs/proxy.log 2>&1 &
  echo $! > $T/proxy.pid
  wait_for http://127.0.0.1:8788/healthz 10 || true
}
# The core's wire policies (contracts/testdata/core-worker-policies.json): low =
# global-default; high = LevelInjection(high, nil) (group-follow-billing).
POL_LOW='{"schema_version":1,"relay_mode":"build","build_injection":{"attachments":{"date":true,"environment":true,"model":true,"total_tokens":true}}}'
POL_HIGH='{"schema_version":1,"relay_mode":"build","build_injection":{"system_prompt":true,"attachments":{"date":true,"environment":true,"model":true,"total_tokens":true},"tools":{"Bash":true,"Edit":true,"Read":true,"Write":true}}}'
POL_NONE='{"schema_version":1,"relay_mode":"direct"}'
step3() {
  start_worker
  export INBOUND=1
  BIN=$T/bin/claude-2.1.316
  for LV in low high; do
    [ $LV = low ] && POL=$POL_LOW || POL=$POL_HIGH
    printf '%s' "$POL" > $T/policy.json
    for AU in token oauth; do
      eval "GE=\$GAUTH_$AU"
      case_run "s3-2.1.316-$AU-C-$LV-p1" text "$SHAPE_C $GE" "$P1"
      case_run "s3-2.1.316-$AU-C-$LV-turn2" text "$SHAPE_C $GE" "$P1" 1
      case_run "s3-2.1.316-$AU-C-$LV-sub" subagent "$SHAPE_C $GE" "$SUB"
    done
    # The kit's B (first-party-shaped client through the gateway), for contrast.
    case_run "s3-2.1.316-token-CF-$LV-p1" text "$SHAPE_CF $GAUTH_token" "$P1"
    CEXTRA='CLAUDE_CODE_ENTRYPOINT=cli CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' case_run "s3-2.1.316-token-C-$LV-entrycli" text "$SHAPE_C $GAUTH_token" "$P1"
    CEXTRA='CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
    tui_run "s3-2.1.316-token-C-$LV-tui" "$SHAPE_C $GAUTH_token"
  done
  printf '%s' "$POL_NONE" > $T/policy.json
  case_run "s3-2.1.316-token-C-none-p1" text "$SHAPE_C $GAUTH_token" "$P1"
  printf '%s' "$POL_LOW" > $T/policy.json
  BIN=$T/bin/claude-2.1.312
  case_run "s3-2.1.312-token-C-low-p1" text "$SHAPE_C $GAUTH_token" "$P1"
  case_run "s3-2.1.312-token-C-low-turn2" text "$SHAPE_C $GAUTH_token" "$P1" 1
  kill $(cat $T/proxy.pid) $(cat $T/worker.pid) 2>/dev/null; sleep 1
}

# Client-side knobs a third-party user can set.
settings_env() { # $1 json env object
  printf '{"env":%s}' "$1" > $H/.claude/settings.json
}
set_case() { # $1 case, $2 scenario, $3 settings env json, $4 args
  echo "== $1 (settings env)"
  start_fake $T/cap/$1 "$2"; fresh; settings_env "$3"
  [ -n "${INBOUND:-}" ] && printf '%s' "$T/cap/$1/in" > $T/inbound-dir-p1
  CENV="NODE_EXTRA_CA_CERTS=/t/cert/ca.pem"; CARGS=$4; client "$1-t1"
  [ -n "${INBOUND:-}" ] && printf '' > $T/inbound-dir-p1
  stop_fake
}
stepextra() {
  BIN=$T/bin/claude-2.1.316
  case_run "x-2.1.316-token-Bhint-p1" text "$SHAPE_B $AUTH_token CLAUDE_CODE_GATEWAY_HINT_HEADERS=1" "$P1"
  case_run "x-2.1.316-token-Bhint-sub" subagent "$SHAPE_B $AUTH_token CLAUDE_CODE_GATEWAY_HINT_HEADERS=1" "$SUB"
  set_case "x-2.1.316-token-Bset-p1" text '{"ANTHROPIC_BASE_URL":"http://127.0.0.1:8790","ANTHROPIC_AUTH_TOKEN":"ccg-client-token-fake"}' "$P1"
  set_case "x-2.1.316-token-Bsetassume-p1" text '{"ANTHROPIC_BASE_URL":"http://127.0.0.1:8790","ANTHROPIC_AUTH_TOKEN":"ccg-client-token-fake","_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL":"1"}' "$P1"
  start_worker
  export INBOUND=1
  printf '%s' "$POL_LOW" > $T/policy.json
  case_run "x-2.1.316-token-Chint-low-p1" text "$SHAPE_C $GAUTH_token CLAUDE_CODE_GATEWAY_HINT_HEADERS=1" "$P1"
  case_run "x-2.1.316-token-Chint-low-sub" subagent "$SHAPE_C $GAUTH_token CLAUDE_CODE_GATEWAY_HINT_HEADERS=1" "$SUB"
  case_run "x-2.1.316-token-Chint-low-turn2" text "$SHAPE_C $GAUTH_token CLAUDE_CODE_GATEWAY_HINT_HEADERS=1" "$P1" 1
  set_case "x-2.1.316-token-Csetassume-low-p1" text '{"ANTHROPIC_BASE_URL":"http://127.0.0.1:8788","ANTHROPIC_AUTH_TOKEN":"ccg-audit-gateway-key","_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL":"1"}' "$P1"
  kill $(cat $T/proxy.pid) $(cat $T/worker.pid) 2>/dev/null; sleep 1
}

stepreplay() {
  start_worker
  printf '%s' "$POL_LOW" > $T/policy.json
  for f in $T/replay/*.json; do
    n=$(basename $f .json)
    start_fake $T/cap/r-$n text
    printf '%s' "$T/cap/r-$n/in" > $T/inbound-dir-p1
    node $T/replay.cjs $f 8788 "Bearer ccg-audit-gateway-key"
    sleep 1; printf '' > $T/inbound-dir-p1
    stop_fake
  done
  kill $(cat $T/proxy.pid) $(cat $T/worker.pid) 2>/dev/null; sleep 1
}

case "$PHASE" in
  smoke)
    BIN=$T/bin/claude-2.1.316
    case_run smoke-A text "$SHAPE_A $AUTH_oauth" "$P1"
    case_run smoke-B text "$SHAPE_B $AUTH_oauth" "$P1"
    case_run smoke-A1 text "$SHAPE_A1 $AUTH_oauth" "$P1"
    tui_run smoke-tui-B "$SHAPE_B $AUTH_oauth"
    ;;
  smoketui)
    BIN=$T/bin/claude-2.1.316
    tui_run smoke-tui-B "$SHAPE_B $AUTH_oauth"
    ;;
  step1) step1 ;;
  login) steplogin ;;
  extra) stepextra ;;
  replay) stepreplay ;;
  step3) step3 ;;
esac
echo "phase $PHASE done"

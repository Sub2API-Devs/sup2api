#!/bin/sh
# Workflow offline diff harness (r3 2026-10-25, extended through 0.1.103; see
# README.md). Runs inside one throwaway, offline container: the official
# client (bin/claude-official) talks (A) straight to a fake upstream and (B)
# through a stand-in core + the real Worker + the patched CLI to the same fake
# upstream. Captures land in /t/cap/<name>/{a,b,in,b.hdr,b.body}; the stand-in
# core also writes the Worker answer (in/resp-N.json: headers, trailers, body,
# first-byte/end timing). extra.sh adds the r3 phases.
#
# RUN_MODE=all|calib|values|extra|conc|classify  SMOKE=1  CALIB2=1
# CC_VERSION         the gateway CLI version (default 2.1.304): policy cli_version,
#                    the manifest entry the Workers pin, the shim's target
# CLIENT_CC_VERSION  the version in the kit's synthetic CC client values (billing
#                    header, User-Agent; default 2.1.304); equal across compared runs
# REQUEST_LOG        off|summary|full: request log level for both Workers, sent in
#                    every policy (request_log, Worker 0.1.102+) and set locally
#                    (PUT /admin/request-logs, older Workers); unset = untouched
# CLI_PIN_OVERRIDE   the Worker pin (docker.sh passes it); default: the image's manifest
set -u
T=/t
MODE=${RUN_MODE:-all}
CC_VERSION=${CC_VERSION:-2.1.304}
CLIENT_CC_VERSION=${CLIENT_CC_VERSION:-2.1.304}
REQUEST_LOG=${REQUEST_LOG:-}
export CC_VERSION CLIENT_CC_VERSION
CEXTRA=${CEXTRA-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1}
CERT=$T/cert
mkdir -p "$CERT" $T/workdir $T/acct $T/acct2 $T/run $T/bin $T/logs
if [ ! -f $CERT/ca.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -keyout $CERT/ca.key -out $CERT/ca.pem -days 2 \
    -subj "/CN=ccg-audit-ca" -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
  openssl req -newkey rsa:2048 -nodes -keyout $CERT/server.key.pem -out $CERT/server.csr -subj "/CN=api.anthropic.com" 2>/dev/null
  printf 'subjectAltName=DNS:api.anthropic.com\nbasicConstraints=CA:FALSE\n' > $CERT/ext.cnf
  openssl x509 -req -in $CERT/server.csr -CA $CERT/ca.pem -CAkey $CERT/ca.key -CAcreateserial \
    -out $CERT/server.crt.pem -days 2 -extfile $CERT/ext.cnf 2>/dev/null
  openssl req -x509 -newkey rsa:2048 -nodes -keyout $CERT/key.pem -out $CERT/cert.pem -days 2 \
    -subj /CN=api.anthropic.com -addext subjectAltName=DNS:api.anthropic.com 2>/dev/null
fi
FAR=$(( ($(date +%s) + 86400 * 30) * 1000 ))
# Worker1 account: a stored login plus the env token (ambient model requests).
printf '{"claudeAiOauth":{"accessToken":"sk-ant-oat01-ccgaudit-fake","refreshToken":"sk-ant-ort01-ccgaudit-fake","expiresAt":%s,"scopes":["user:inference","user:profile","user:sessions:claude_code"],"subscriptionType":"max"}}' $FAR > $T/acct/.credentials.json
printf '{"oauthAccount":{"emailAddress":"worker@example.invalid","accountUuid":"00000000-0000-4000-8000-000000000001","organizationUuid":"00000000-0000-4000-8000-000000000002"},"hasCompletedOnboarding":true}' > $T/acct/.claude.json
chmod 600 $T/acct/.credentials.json
# Worker2 account: API key only, no stored login.
printf '{"hasCompletedOnboarding":true}' > $T/acct2/.claude.json
# The credit account is the API-key account (worker w3). The image's patched CLI
# cannot finish `auth status --json` in an offline container (it waits on
# api.anthropic.com management endpoints; the official 2.1.304 binary answers in
# <1 s). The Worker's resource-identity path calls that subcommand, so the audit
# runs it through a shim that answers only `auth status` and delegates every other
# invocation to the image CLI. No model request touches the shim.

wait_for() { i=0; while [ $i -lt "$2" ]; do curl -sf -m 2 "$1" >/dev/null 2>&1 && return 0; i=$((i+1)); sleep 1; done; return 1; }

start_fake() { # $1 capture dir, $2 scenario
  rm -rf "$1"; mkdir -p "$1"
  SCENARIO=$2 node $T/fake-upstream.cjs $T/up.sock "$1" $CERT > $T/fake.log 2>&1 &
  echo $! > $T/fake.pid
  i=0; while [ $i -lt 20 ] && [ ! -S $T/up.sock ]; do i=$((i+1)); sleep 0.5; done
  sleep 0.5
}
stop_fake() { kill "$(cat $T/fake.pid)" 2>/dev/null; sleep 0.5; rm -f $T/up.sock; }

client() {
  home=$1
  rm -rf "$home" $T/run; mkdir -p "$home/.claude" $T/run
  printf '{"hasCompletedOnboarding":true}' > "$home/.claude.json"
  ( cd $T/run && eval "env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$home CLAUDE_CONFIG_DIR=$home/.claude \
      CLAUDE_SECURESTORAGE_CONFIG_DIR=$home/.claude DISABLE_AUTOUPDATER=1 $CEXTRA \
      $CENV timeout 300 \$T/bin/claude-official $CARGS" > $T/out.json 2> $T/err.txt )
  rc=$?
  echo "  client exit=$rc result=$(node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify(j.result??j).slice(0,120))}catch(e){console.log("-")}' $T/out.json)"
  [ -s $T/err.txt ] && echo "  stderr: $(tail -c 300 $T/err.txt | tr '\n' ' ' | head -c 300)"
  return 0
}
client_keep() {
  home=$1
  ( cd $T/run && eval "env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$home CLAUDE_CONFIG_DIR=$home/.claude \
      CLAUDE_SECURESTORAGE_CONFIG_DIR=$home/.claude DISABLE_AUTOUPDATER=1 $CEXTRA \
      $CENV timeout 300 \$T/bin/claude-official $CARGS" > $T/out.json 2> $T/err.txt )
  echo "  client(keep) exit=$? result=$(node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify(j.result??j).slice(0,120))}catch(e){console.log("-")}' $T/out.json)"
  [ -s $T/err.txt ] && echo "  stderr: $(tail -c 300 $T/err.txt | tr '\n' ' ' | head -c 300)"
  return 0
}

REF_ENV='CLAUDE_CODE_OAUTH_TOKEN=ssh-placeholder ANTHROPIC_UNIX_SOCKET=/t/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'
GW_ENV='CLAUDE_CODE_OAUTH_TOKEN=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8788 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'
REF_KEY_ENV='ANTHROPIC_AUTH_TOKEN=ssh-placeholder ANTHROPIC_UNIX_SOCKET=/t/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'
GW_KEY_ENV='ANTHROPIC_AUTH_TOKEN=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8788 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'

CAP=${CAP_ROOT:-$T/cap}
run_case() { # $1 name, $2 scenario, $3 policy, $4 A env, $5 B env
  name=$1; scenario=$2; policy=${3:-}; aenv=${4:-$REF_ENV}; benv=${5:-$GW_ENV}
  echo "== $name (scenario $scenario)"
  CENV=$aenv; start_fake $CAP/$name/a "$scenario"; client $T/client-a; stop_fake
  CENV=$benv; start_fake $CAP/$name/b "$scenario"
  printf '%s' "$policy" > $T/policy.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
  client $T/client-b
  printf '' > $T/inbound-dir-p1
  stop_fake
}
run_case_continue() {
  name=$1; scenario=$2; policy=${3:-}
  echo "== $name (continue)"
  CENV=$REF_ENV; start_fake $CAP/$name/a "$scenario"; client $T/client-a
  CARGS="$CARGS --continue"; client_keep $T/client-a; stop_fake
  CENV=$GW_ENV; start_fake $CAP/$name/b "$scenario"
  printf '%s' "$policy" > $T/policy.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
  client $T/client-b
  CARGS="$CARGS --continue"; client_keep $T/client-b
  printf '' > $T/inbound-dir-p1; stop_fake
}

# The core's WorkerPolicy wire shape (CONTRACTS §53.18) for the CLI under test.
# Without REQUEST_LOG the bytes are the ones the 2.1.304 runs sent.
LOG_KEY=''
[ -n "$REQUEST_LOG" ] && LOG_KEY=",\"request_log\":\"$REQUEST_LOG\""
policy() { # $1 relay_mode, $2 further members (each with its leading comma)
  printf '{"schema_version":1,"relay_mode":"%s","cli_version":"%s"%s%s}' "$1" "$CC_VERSION" "$2" "$LOG_KEY"
}
POLICY_ATTACH=$(policy build ',"build_attachment_sources":{"platform_name":"worker","os_version":"worker","shell":"worker","primary_directory":"worker","additional_directories":"erase","git_repository":"erase"}')
POLICY_ENTRY=$(policy build ',"build_billing_entrypoint":"sdk-cli"')
POLICY_NONE=$(policy direct '')
POLICY_MICRO=$(policy build '')
POLICY_LOW=$(policy build ',"build_attachment_sources":{"platform_name":"worker","os_version":"worker"},"build_injection":{"attachments":{"environment":true,"model":true,"total_tokens":true,"date":true}}')
POLICY_HIGH=$(policy build ',"build_attachment_sources":{"platform_name":"worker","os_version":"worker"},"build_injection":{"system_prompt":true,"attachments":{"environment":true,"model":true,"total_tokens":true,"date":true},"tools":{"Bash":true,"Read":true,"Edit":true,"Write":true}}')
POLICY_ERASE=$(policy build ',"build_attachment_sources":{"platform_name":"erase","os_version":"erase","shell":"erase","primary_directory":"erase","additional_directories":"erase","git_repository":"erase","worktree":"erase","scratchpad_directory":"erase","github_cli":"erase","agent_proxy":"erase"}')
POLICY_BILLING=$(policy build ',"build_billing_sources":{"cc_version":"worker","cc_entrypoint":"worker"}')

# The Worker pin: docker.sh's (from the image's or the candidate's manifest), or
# the manifest of the CLI the image ships.
if [ -z "${CLI_PIN_OVERRIDE:-}" ]; then
  CLI_PIN_OVERRIDE=$(node -e 'const v=process.argv[1];const m=require("/opt/ccgateway/cli/manifest.json").versions[v];if(!m){console.error("CLI manifest has no version "+v);process.exit(1)}console.log("WORKER_CLI_VERSION="+v+" CCG_CLI_SHA256="+m.sha256+" CCG_CLI_PATCH="+m.patch)' "$CC_VERSION") || exit 1
fi

start_worker() { # $1 name, $2 port, $3 home, $4 extra env assignments
  name=$1; port=$2; home=$3; extra=$4
  # The pinned CLI by its release path: the image's /usr/local/bin/claude links
  # to its own version, which a candidate release of another version replaces.
  case "$extra" in *WORKER_CLI_PATH*) CLI_PIN='' ;; *) CLI_PIN="$CLI_PIN_OVERRIDE WORKER_CLI_PATH=/opt/ccgateway/cli/$CC_VERSION/claude" ;; esac
  mkdir -p $T/data-$name
  eval "env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$home CLAUDE_CONFIG_DIR=$home CLAUDE_SECURESTORAGE_CONFIG_DIR=$home \
    CCG_BIND=127.0.0.1:$port CCG_API_KEY=ccg-audit-gateway-key CCG_ADMIN_KEY=ccg-audit-admin-key \
    $CLI_PIN \
    CCG_DATA_DIR=$T/data-$name CCG_WORKING_DIRECTORY=$T/workdir \
    ANTHROPIC_UNIX_SOCKET=$T/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0 $extra \
    /usr/local/bin/worker" > $T/logs/worker-$name.log 2>&1 &
  eval "echo \$! > $T/worker-$name.pid"
  if ! wait_for http://127.0.0.1:$port/healthz 90; then echo "WORKER $name DID NOT START"; tail -20 $T/logs/worker-$name.log; exit 1; fi
  echo "worker $name ready: $(curl -s http://127.0.0.1:$port/healthz | head -c 200)"
}
start_proxy() { # $1 name, $2 listen, $3 worker port, $4 policy file, $5 env assignments
  name=$1
  eval "INBOUND_FILE=$T/inbound-dir-$name WORKER_RESP_LOG=$T/logs/worker-$name-resp.jsonl $5 \
    node $T/proxy.cjs $2 $3 $4" > $T/logs/proxy-$name.log 2>&1 &
  eval "echo \$! > $T/proxy-$name.pid"
  wait_for http://127.0.0.1:$2/healthz 10 || true
}

sed "s#@CC_VERSION@#$CC_VERSION#g" /t/shim.sh > $T/bin/claude-shim
chmod +x $T/bin/claude-shim

# A Worker older than 0.1.102 ignores the policy's request_log and records at
# its own level; set that too, so both generations log the same way.
set_log_level() { # $1 port
  [ -n "$REQUEST_LOG" ] || return 0
  case "$REQUEST_LOG" in full) body='{"level":"full","full_for_hours":24}' ;; *) body="{\"level\":\"$REQUEST_LOG\"}" ;; esac
  echo "request log level :$1 $REQUEST_LOG: $(curl -s -X PUT -H 'Authorization: Bearer ccg-audit-admin-key' -H 'content-type: application/json' -d "$body" http://127.0.0.1:$1/admin/request-logs | head -c 200)"
}

start_worker w1 8787 $T/acct 'CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-ccgaudit-fake'
start_worker w3 8777 $T/acct2 'ANTHROPIC_API_KEY=ccg-audit-upstream-key CCG_RESOURCE_ISSUER_ID=ccg-audit-issuer CCG_RESOURCE_ISSUER_GENERATION=ccg-audit-generation-0001 WORKER_CLI_PATH=/t/bin/claude-shim'
set_log_level 8787
set_log_level 8777
printf '{}' > $T/policy.json; printf '{}' > $T/policy3.json
start_proxy p1 8788 8787 $T/policy.json ''
start_proxy p3 8778 8777 $T/policy3.json 'CREDIT_SIM=1 WORKER_API_KEY=ccg-audit-gateway-key'

if [ "$MODE" = values ]; then
  . $T/values.sh
  kill $(cat $T/proxy-*.pid) $(cat $T/worker-*.pid) 2>/dev/null
  sleep 1
  echo "values done"; exit 0
fi
if [ "$MODE" = classify ]; then
  . $T/classify.sh
  kill $(cat $T/proxy-*.pid) $(cat $T/worker-*.pid) 2>/dev/null
  sleep 1
  echo "classify done"; exit 0
fi

if [ "$MODE" = conc ]; then
  . $T/conc.sh
  kill $(cat $T/proxy-*.pid) $(cat $T/worker-*.pid) 2>/dev/null
  sleep 1
  echo "conc done"; exit 0
fi

if [ "$MODE" = extra ]; then
  . $T/extra.sh all
  kill $(cat $T/proxy-*.pid) $(cat $T/worker-*.pid) 2>/dev/null
  sleep 1
  echo "extra done"; exit 0
fi

# ---------------------------------------------------------------------------
if [ "${SMOKE:-}" = 1 ]; then
  CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
  run_case smoke-main text "$POLICY_LOW"
  echo "== smoke-plain"
  start_fake $CAP/smoke-plain/b text; printf '%s' "$POLICY_LOW" > $T/policy.json
  printf '%s' "$CAP/smoke-plain/in" > $T/inbound-dir-p1
  curl -s -o $CAP/smoke-plain/b.body -w "  status=%{http_code}\n" -H "content-type: application/json" \
    -H "anthropic-version: 2023-06-01" -H "x-api-key: ccg-audit-gateway-key" \
    -d '{"model":"claude-opus-4-8","max_tokens":16,"messages":[{"role":"user","content":"Say OK."}]}' http://127.0.0.1:8788/v1/messages
  printf '' > $T/inbound-dir-p1; stop_fake
  echo "== smoke-credit"
  start_fake $CAP/smoke-credit/b credit; printf '%s' "$POLICY_MICRO" > $T/policy3.json
  printf '%s' "$CAP/smoke-credit/in" > $T/inbound-dir-p3
  curl -s -D $CAP/smoke-credit/b.hdr -o $CAP/smoke-credit/b.body -w "  status=%{http_code}\n" -H "content-type: application/json" \
    -H "anthropic-version: 2023-06-01" -H "x-api-key: ccg-audit-gateway-key" -H "anthropic-beta: claude-code-20250219,fallback-credit-2026-07-01" \
    -d '{"model":"claude-opus-4-8","max_tokens":16,"messages":[{"role":"user","content":"Say OK."}]}' http://127.0.0.1:8778/v1/messages
  printf '' > $T/inbound-dir-p3; stop_fake
  tr -d '\r' < $CAP/smoke-credit/b.hdr | grep -i -E "^(x-ccgateway|content-type)" | head
  echo "  body: $(head -c 200 $CAP/smoke-credit/b.body)"
  echo "== smoke-credit-identity"
  curl -s -H "x-api-key: ccg-audit-gateway-key" http://127.0.0.1:8777/_ccgateway/resources/identity; echo
  echo "== smoke-api-key-account"
  start_fake $CAP/smoke-apikey/b text; printf '%s' "$POLICY_LOW" > $T/policy3.json
  curl -s -o $CAP/smoke-apikey/b.body -w "  status=%{http_code}\n" -H "content-type: application/json" \
    -H "anthropic-version: 2023-06-01" -H "x-api-key: ccg-audit-gateway-key" \
    -d '{"model":"claude-opus-4-8","max_tokens":16,"system":"hi","messages":[{"role":"user","content":"Say OK."}]}' http://127.0.0.1:8778/v1/messages
  stop_fake
  kill $(cat $T/proxy-*.pid) $(cat $T/worker-*.pid) 2>/dev/null
  sleep 1
  echo "smoke done"; tail -5 $T/logs/worker-w3.log; tail -5 $T/logs/proxy-p3.log
  exit 0
fi
if [ "$MODE" = calib ] || [ "${CALIB2:-}" = 1 ]; then
  [ "$MODE" = calib ] && CAP=$T/cal1 || CAP=$T/cal2
  CAP_ROOT=$CAP
  CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
  run_case c-main-low text "$POLICY_LOW"
  CARGS='-p "Run the command and report its output." --model claude-opus-4-8 --output-format json'
  run_case c-tool-low tool "$POLICY_LOW"
  CARGS='-p "use a subagent to say OK" --model claude-opus-4-8 --output-format json'
  run_case c-sub-low subagent "$POLICY_LOW"
  CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
  run_case c-direct text "$POLICY_NONE"
  CEXTRA='' CARGS='-p "Say OK." --model claude-sonnet-4-6 --output-format json' run_case c-sonnet text "$POLICY_MICRO"
  CEXTRA='CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
  . $T/extra.sh calib
  kill $(cat $T/proxy-*.pid) $(cat $T/worker-*.pid) 2>/dev/null
  sleep 1
  echo "calib done ($CAP)"; exit 0
fi

# --- Phase 1: official client, both sides ----------------------------------
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
run_case main-build-low text "$POLICY_LOW"
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format stream-json --verbose'
run_case main-build-low-stream text "$POLICY_LOW"
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
run_case main-build-micro text "$POLICY_MICRO"
run_case main-build-erase text "$POLICY_ERASE"
run_case main-build-high text "$POLICY_HIGH"
run_case main-direct text "$POLICY_NONE"
run_case main-build-billing text "$POLICY_BILLING"
CARGS='-p "Run the command and report its output." --model claude-opus-4-8 --output-format json'
run_case tool-build-low tool "$POLICY_LOW"
run_case tool-direct tool "$POLICY_NONE"
CARGS='-p "use a subagent to say OK" --model claude-opus-4-8 --output-format json'
run_case subagent-build-low subagent "$POLICY_LOW"
run_case subagent-direct subagent "$POLICY_NONE"
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
run_case_continue turn2-build-low text "$POLICY_LOW"
# Compaction.
CENV=$REF_ENV; start_fake $CAP/compact-build-low/a text; client $T/client-a
CARGS='-p "/compact" --continue --model claude-opus-4-8 --output-format json'; client_keep $T/client-a; stop_fake
CENV=$GW_ENV; start_fake $CAP/compact-build-low/b text; printf '%s' "$POLICY_LOW" > $T/policy.json
printf '%s' "$CAP/compact-build-low/in" > $T/inbound-dir-p1
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'; client $T/client-b
CARGS='-p "/compact" --continue --model claude-opus-4-8 --output-format json'; client_keep $T/client-b
printf '' > $T/inbound-dir-p1; stop_fake
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
run_case attach-worker text "$POLICY_ATTACH"
CEXTRA='' CARGS='-p "Say OK." --model claude-opus-4-8 --output-format json'
run_case aux-nonessential text "$POLICY_LOW"
CEXTRA='CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
CEXTRA='CLAUDE_CODE_ENTRYPOINT=cli CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
run_case ua-cli-client-build-low text "$POLICY_LOW"
run_case ua-cli-worker-billing text "$POLICY_BILLING"
run_case ua-cli-entrypoint text "$POLICY_ENTRY"
CEXTRA='CLAUDE_CODE_ENTRYPOINT=sdk-ts CLAUDE_AGENT_SDK_VERSION=0.2.71 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
run_case ua-sdk-build-low text "$POLICY_LOW"
CEXTRA='CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
# API-key shaped client through the OAuth account.
CARGS='-p "Reply with the single word OK." --model claude-haiku-4-5-20251001 --output-format json'
run_case apikey-shape-haiku-micro text "$POLICY_MICRO" "$REF_KEY_ENV" "$GW_KEY_ENV"
CARGS='-p "Reply with the single word OK." --model claude-sonnet-4-6 --output-format json'
run_case apikey-shape-sonnet-micro text "$POLICY_MICRO" "$REF_KEY_ENV" "$GW_KEY_ENV"
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
run_case apikey-shape-opus-micro text "$POLICY_MICRO" "$REF_KEY_ENV" "$GW_KEY_ENV"
run_case apikey-shape-opus-direct text "$POLICY_NONE" "$REF_KEY_ENV" "$GW_KEY_ENV"
# A logged-in client carries its own account_uuid.
mkdir -p $T/h-login
printf '{"claudeAiOauth":{"accessToken":"sk-ant-oat01-client","refreshToken":"sk-ant-ort01-client","expiresAt":%s,"scopes":["user:inference"],"subscriptionType":"max"}}' $FAR > $T/h-login/.credentials.json
printf '{"oauthAccount":{"emailAddress":"client@example.invalid","accountUuid":"22222222-2222-4222-8222-222222222222","organizationUuid":"11111111-1111-4111-8111-111111111111"},"hasCompletedOnboarding":true}' > $T/h-login/.claude.json
chmod 600 $T/h-login/.credentials.json
login_run() { # $1 env assignments
  ( cd $T/run && env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$T/h-login CLAUDE_CONFIG_DIR=$T/h-login/.claude \
      CLAUDE_SECURESTORAGE_CONFIG_DIR=$T/h-login/.claude DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
      _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1 $1 timeout 300 $T/bin/claude-official -p "Say OK." --model claude-opus-4-8 --output-format json > $T/out.json 2> $T/err.txt )
  echo "  login client exit=$? $(head -c 80 $T/out.json)"
}
echo "== login-account"
start_fake $CAP/login-account/a text
login_run 'ANTHROPIC_UNIX_SOCKET=/t/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0'
stop_fake
start_fake $CAP/login-account/b text; printf '%s' "$POLICY_LOW" > $T/policy.json
printf '%s' "$CAP/login-account/in" > $T/inbound-dir-p1
login_run 'ANTHROPIC_BASE_URL=http://127.0.0.1:8788 CLAUDE_CODE_OAUTH_TOKEN=ccg-audit-gateway-key'
printf '' > $T/inbound-dir-p1; stop_fake

# --- Phase 2: non-CC requests through the stand-in core ---------------------
post() { # $1 case, $2 policy, $3 body, $4.. extra curl -H
  name=$1; pol=$2; body=$3; shift 3
  echo "== $name (non-CC)"
  start_fake $CAP/$name/b text
  printf '%s' "$pol" > $T/policy.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
  curl -s -o $CAP/$name/b.body -w "  status=%{http_code}\n" -H "content-type: application/json" -H "anthropic-version: 2023-06-01" \
    -H "x-api-key: ccg-audit-gateway-key" -H "user-agent: anthropic-sdk-python/0.40.0" "$@" \
    -d "$body" http://127.0.0.1:8788/v1/messages
  printf '' > $T/inbound-dir-p1; stop_fake
}
PLAIN='{"model":"claude-opus-4-8","max_tokens":64,"system":"Answer concisely.","messages":[{"role":"user","content":"Say OK."}]}'
post plain-build-micro "$POLICY_MICRO" "$PLAIN"
post plain-build-low "$POLICY_LOW" "$PLAIN"
post plain-build-high "$POLICY_HIGH" "$PLAIN"
post plain-direct "$POLICY_NONE" "$PLAIN"
TOOLS='{"model":"claude-opus-4-8","max_tokens":64,"system":"Answer concisely.","tools":[{"name":"Bash","description":"my own bash","input_schema":{"type":"object","properties":{"cmd":{"type":"string"}},"required":["cmd"]},"strict":true,"cache_control":{"type":"ephemeral"}},{"name":"MyTool","description":"custom","input_schema":{"type":"object","properties":{}}}],"messages":[{"role":"user","content":"Say OK."}]}'
post plain-tools-high "$POLICY_HIGH" "$TOOLS"
post plain-tools-low "$POLICY_LOW" "$TOOLS"
post plain-tools-direct "$POLICY_NONE" "$TOOLS"
post plain-tools-micro "$POLICY_MICRO" "$TOOLS"
NOSYS='{"model":"claude-opus-4-8","max_tokens":16,"messages":[{"role":"user","content":"Say OK."}]}'
post plain-nosystem-build "$POLICY_LOW" "$NOSYS"
post plain-nosystem-direct "$POLICY_NONE" "$NOSYS"
S1='{"model":"claude-opus-4-8","max_tokens":64,"messages":[{"role":"user","content":"Run it."},{"role":"assistant","content":[{"type":"tool_use","id":"toolu_s1","name":"Bash","input":{"command":"echo hi"}}]},{"role":"user","content":"never mind"}]}'
post s1-missing-result-build "$POLICY_LOW" "$S1"
post s1-missing-result-direct "$POLICY_NONE" "$S1"
S2='{"model":"claude-opus-4-8","max_tokens":64,"messages":[{"role":"user","content":"x"},{"role":"assistant","content":[{"type":"tool_use","id":"toolu_s2","name":"MyTool","input":{"n":9007199254740993}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_s2","content":"ok"}]}]}'
post s2-unsafe-number-build "$POLICY_LOW" "$S2"
post s2-unsafe-number-direct "$POLICY_NONE" "$S2"
S3='{"model":"claude-opus-4-8","max_tokens":64,"metadata":{"user_id":"{\"device_id\":\"abc\",\"account_uuid\":\"\",\"session_id\":\"ABCDEF01-2345-6789-ABCD-EF0123456789\"}"},"messages":[{"role":"user","content":"Say OK."}]}'
post s3-uppercase-session-build "$POLICY_LOW" "$S3"
BODY_S4='{"model":"claude-opus-4-8","max_tokens":64,"system":[{"type":"text","text":"x-anthropic-billing-header: cc_version='"$CLIENT_CC_VERSION"'.9a4; cc_entrypoint=sdk-cli; cch=12abc;"},{"type":"text","text":"You are a Claude agent, built on Anthropic'"'"'s Claude Agent SDK."}],"messages":[{"role":"user","content":"Say OK."}]}'
post s4-no-prompt-id-build "$POLICY_LOW" "$BODY_S4" -H "x-claude-code-prompt-id: 11111111-2222-4333-8444-555555555555"
post s5-two-beta-lines-build "$POLICY_LOW" "$PLAIN" -H "anthropic-beta: claude-code-20250219,context-1m-2025-08-07"
echo "== s5b-two-beta-lines-build"
start_fake $CAP/s5b-two-beta-lines-build/b text; printf '%s' "$POLICY_LOW" > $T/policy.json
printf '%s' "$CAP/s5b-two-beta-lines-build/in" > $T/inbound-dir-p1
curl -s -o /dev/null -w "  status=%{http_code}\n" -H "content-type: application/json" -H "anthropic-version: 2023-06-01" \
  -H "x-api-key: ccg-audit-gateway-key" -H "anthropic-beta: claude-code-20250219,context-1m-2025-08-07" \
  -H "anthropic-beta: oauth-2025-04-20" -d "$PLAIN" http://127.0.0.1:8788/v1/messages
printf '' > $T/inbound-dir-p1; stop_fake

# --- Phase 3: upstream error passthrough -----------------------------------
for m in build direct; do
  [ $m = build ] && P=$POLICY_LOW || P=$POLICY_NONE
  echo "== err400-$m"
  start_fake $CAP/err400-$m/b error400
  printf '%s' "$P" > $T/policy.json
  printf '%s' "$CAP/err400-$m/in" > $T/inbound-dir-p1
  curl -s -D $CAP/err400-$m/client.hdr -o $CAP/err400-$m/client.body -w "  status=%{http_code}\n" \
    -H "content-type: application/json" -H "anthropic-version: 2023-06-01" -H "x-api-key: ccg-audit-gateway-key" \
    -d "$PLAIN" http://127.0.0.1:8788/v1/messages
  tr -d '\r' < $CAP/err400-$m/client.hdr | sed -n '1,10p'
  echo "  body: $(cat $CAP/err400-$m/client.body)"
  printf '' > $T/inbound-dir-p1; stop_fake
done

# --- Phase 4: fallback-credit receipts (OAuth stored-credential worker) ------
credit() { # $1 case, $2 beta, $3 build|direct, $4 scenario=text
  name=$1; beta=$2; mode=$3; scen=${4:-text}
  echo "== $name (credit $beta $mode)"
  start_fake $CAP/$name/b "$scen"
  if [ "$mode" = direct ]; then pol="$POLICY_NONE"; body="$PLAIN"; else pol="$POLICY_MICRO"; body='{"model":"claude-opus-4-8","max_tokens":64,"messages":[{"role":"user","content":"Say OK."}]}'; fi
  printf '%s' "$pol" > $T/policy3.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p3
  curl -s -D $CAP/$name/b.hdr -o $CAP/$name/b.body -w "  status=%{http_code}\n" -H "content-type: application/json" \
    -H "anthropic-version: 2023-06-01" -H "x-api-key: ccg-audit-gateway-key" -H "anthropic-beta: claude-code-20250219,$beta" \
    -d "$body" http://127.0.0.1:8778/v1/messages
  printf '' > $T/inbound-dir-p3; stop_fake
  tr -d '\r' < $CAP/$name/b.hdr | grep -i -E "^(x-ccgateway|content-type|request-id)" | head -8
}
credit credit-beta-0701-build fallback-credit-2026-07-01 build
credit credit-beta-0701-direct fallback-credit-2026-07-01 direct
credit credit-beta-0601-build fallback-credit-2026-06-01 build
credit credit-ssf-0701-build server-side-fallback-2026-07-01 build
credit credit-ssf-0601-build server-side-fallback-2026-06-01 build
credit credit-ssf-0601-direct server-side-fallback-2026-06-01 direct
credit credit-issued-build fallback-credit-2026-07-01 build credit
credit credit-issued-direct fallback-credit-2026-07-01 direct credit
echo "== credit-issued-stream-build"
start_fake $CAP/credit-issued-stream-build/b credit
printf '%s' "$POLICY_MICRO" > $T/policy3.json
printf '%s' "$CAP/credit-issued-stream-build/in" > $T/inbound-dir-p3
curl -s -D $CAP/credit-issued-stream-build/b.hdr -o $CAP/credit-issued-stream-build/b.body -w "  status=%{http_code}\n" \
  -H "content-type: application/json" -H "anthropic-version: 2023-06-01" -H "x-api-key: ccg-audit-gateway-key" \
  -H "anthropic-beta: claude-code-20250219,fallback-credit-2026-07-01" \
  -d '{"model":"claude-opus-4-8","max_tokens":64,"stream":true,"messages":[{"role":"user","content":"Say OK."}]}' \
  http://127.0.0.1:8778/v1/messages
printf '' > $T/inbound-dir-p3; stop_fake
tr -d '\r' < $CAP/credit-issued-stream-build/b.hdr | grep -i -E "^(x-ccgateway|content-type|request-id)" | head -8

# --- Phase 5: an API-key account (w3 API key, proxy 8778) --------------------------
echo "== apikey-account-client"
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
CENV=$REF_ENV; start_fake $CAP/apikey-account-client/a text; client $T/client-a; stop_fake
CENV='CLAUDE_CODE_OAUTH_TOKEN=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8778 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'
start_fake $CAP/apikey-account-client/b text; printf '%s' "$POLICY_LOW" > $T/policy3.json
printf '%s' "$CAP/apikey-account-client/in" > $T/inbound-dir-p3; client $T/client-b
printf '' > $T/inbound-dir-p3; stop_fake
echo "== apikey-account-noncc-high (non-CC)"
start_fake $CAP/apikey-account-noncc-high/b text; printf '%s' "$POLICY_HIGH" > $T/policy3.json
printf '%s' "$CAP/apikey-account-noncc-high/in" > $T/inbound-dir-p3
curl -s -o $CAP/apikey-account-noncc-high/b.body -w "  status=%{http_code}\n" -H "content-type: application/json" \
  -H "anthropic-version: 2023-06-01" -H "x-api-key: ccg-audit-gateway-key" -d "$PLAIN" http://127.0.0.1:8778/v1/messages
printf '' > $T/inbound-dir-p3; stop_fake

# --- Phase 6: r3 subjects (non-CC context, nested subagents, credit stream) --
. $T/extra.sh all

# ---------------------------------------------------------------------------
kill $(cat $T/proxy-*.pid) $(cat $T/worker-*.pid) 2>/dev/null
sleep 1
echo "== captures"; for d in $CAP/*/; do echo "$(basename $d) a=$(ls $d/a 2>/dev/null | grep -c '^req-') b=$(ls $d/b 2>/dev/null | grep -c '^req-') in=$(ls $d/in 2>/dev/null | grep -c '^in-')"; done
echo "== worker logs"; for f in $T/logs/worker-*.log; do echo "-- $f"; tail -2 "$f"; done

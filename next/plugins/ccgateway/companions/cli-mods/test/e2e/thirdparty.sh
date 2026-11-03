# Third-party clients (2026-11-03, RUN_MODE=thirdparty, sourced by run.sh).
# The official client connected the way production users connect it: a custom
# ANTHROPIC_BASE_URL and no _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL, so it
# sends its third-party shape (a short billing header, three system blocks,
# no CC request headers, no diagnostics). The A side is the same client in the
# first-party shape (the kit's reference, straight to the fake upstream), so
# fp-compare.cjs can list what still differs once the gateway has converted
# the B side (features.FirstPartyShapeCapability). The policy carries no
# first_party_shape (on), except tp-main-off.
# The fake upstream compresses its answers, as the real one does (2026-11-03
# live test: v45's Worker read no compressed answer, so continuations lacked
# diagnostics and subagents their parent's prompt ID and agent type). The
# Sonnet scenarios have the client's cache marker on the prompt itself (no
# mid-conversation system message), which moves off it once a tool result
# follows (the same live test: a turn's prompt ID changed).
export FAKE_GZIP=1
TP_ENV='CLAUDE_CODE_OAUTH_TOKEN=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8788'
TP_KEY_ENV='ANTHROPIC_AUTH_TOKEN=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8788'
TP_APIKEY_ENV='ANTHROPIC_API_KEY=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8788'
REF_APIKEY_ENV='ANTHROPIC_API_KEY=sk-ant-api03-ccgaudit-fake ANTHROPIC_UNIX_SOCKET=/t/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1'
TP_W3_ENV='CLAUDE_CODE_OAUTH_TOKEN=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8778'
POLICY_LOW_OFF=$(policy build ',"build_attachment_sources":{"platform_name":"worker","os_version":"worker"},"build_injection":{"attachments":{"environment":true,"model":true,"total_tokens":true,"date":true}},"first_party_shape":false')

# tp_continue: two turns (the second with --continue), A then B.
tp_continue() { # $1 name, $2 scenario, $3 policy, $4 second prompt args
  name=$1; scenario=$2; policy=$3; second=$4
  echo "== $name (third-party, continue)"
  first=$CARGS
  CENV=$REF_ENV; start_fake $CAP/$name/a "$scenario"; client $T/client-a
  CARGS="$second"; client_keep $T/client-a; stop_fake
  CARGS=$first; CENV=$TP_ENV; start_fake $CAP/$name/b "$scenario"
  printf '%s' "$policy" > $T/policy.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
  client $T/client-b
  CARGS="$second"; client_keep $T/client-b
  printf '' > $T/inbound-dir-p1; stop_fake
  CARGS=$first
}

CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
run_case tp-main-low text "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
run_case tp-main-micro text "$POLICY_MICRO" "$REF_ENV" "$TP_ENV"
run_case tp-main-off text "$POLICY_LOW_OFF" "$REF_ENV" "$TP_ENV"
run_case tp-main-direct text "$POLICY_NONE" "$REF_ENV" "$TP_ENV"
CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format stream-json --verbose'
run_case tp-main-stream text "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
CARGS='-p "Reply with the single word OK." --model claude-sonnet-4-6 --output-format json'
run_case tp-sonnet-low text "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
CARGS='-p "Run the command and report its output." --model claude-opus-4-8 --output-format json'
run_case tp-tool-low tool "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
CARGS='-p "use a subagent to say OK" --model claude-opus-4-8 --output-format json'
run_case tp-subagent-low subagent "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
run_case tp-sub3-low sub3 "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
CARGS='-p "Run the command and report its output." --model claude-sonnet-4-6 --output-format json'
run_case tp-sonnet-tool-low tool "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
CARGS='-p "use a subagent to say OK" --model claude-sonnet-4-6 --output-format json'
run_case tp-sonnet-subagent-low subagent "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
CARGS='-p "Run the command and report its output." --model claude-sonnet-4-6 --output-format json'
tp_continue tp-sonnet-turn2-low tool "$POLICY_LOW" '-p "Reply with the single word OK." --continue --model claude-sonnet-4-6 --output-format json'

CARGS='-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json'
tp_continue tp-turn2-low text "$POLICY_LOW" '-p "Reply with the single word OK." --continue --model claude-opus-4-8 --output-format json'
tp_continue tp-compact-low text "$POLICY_LOW" '-p "/compact" --continue --model claude-opus-4-8 --output-format json'
# The other ways a client authenticates to the gateway, and an API-key account.
run_case tp-token-low text "$POLICY_LOW" "$REF_KEY_ENV" "$TP_KEY_ENV"
run_case tp-apikey-low text "$POLICY_LOW" "$REF_APIKEY_ENV" "$TP_APIKEY_ENV"
echo "== tp-apikey-account (third-party)"
CENV=$REF_ENV; start_fake $CAP/tp-apikey-account/a text; client $T/client-a; stop_fake
CENV=$TP_W3_ENV; start_fake $CAP/tp-apikey-account/b text; printf '%s' "$POLICY_LOW" > $T/policy3.json
printf '%s' "$CAP/tp-apikey-account/in" > $T/inbound-dir-p3; client $T/client-b
printf '' > $T/inbound-dir-p3; stop_fake
# The terminal entrypoint (a human's turn origin).
CEXTRA='CLAUDE_CODE_ENTRYPOINT=cli CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'
run_case tp-entry-cli text "$POLICY_LOW" "$REF_ENV" "$TP_ENV"
CEXTRA='CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1'

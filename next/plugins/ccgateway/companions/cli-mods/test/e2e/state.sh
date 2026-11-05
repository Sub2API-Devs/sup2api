# Session memory and the tools-used header (RUN_MODE=state, sourced by run.sh;
# SESSION-MEMORY-TOOLS-USED-DESIGN.md §10.4). docker.sh state runs it with a
# throwaway Valkey that shares the socket with this container (STATE_SOCKET,
# STATE_USER, STATE_PASSWORD: Worker w1 uses it) and a control directory
# (STATE_CTL: valkey_stop / valkey_start).
#
# Each case runs its turns on the A side (the official client in the
# first-party shape, straight to the fake upstream) and then on the B side
# (through the gateway), each turn after the first with --continue. A turn is
# a line "<hooks>|<client args>"; the hooks (comma-separated, "-" for none)
# run before that turn on the B side only:
#   restart      Worker w1 restarts (a new process, same account)
#   restart-mem  Worker w1 restarts without the Valkey settings (an old
#                container: process memory only)
#   vstop        Valkey stops (and stays stopped)    vstart  Valkey starts
#   sleepN       N seconds pass
#   drop         the proxy drops the client's x-claude-code-sandy-plover
# state-check.cjs compares the header per request.
export FAKE_GZIP=1
TP_ENV='CLAUDE_CODE_OAUTH_TOKEN=ccg-audit-gateway-key ANTHROPIC_BASE_URL=http://127.0.0.1:8788'
H_TOOLS=x-claude-code-sandy-plover
printf 'CCG_PROBE_FILE\n' > $T/run-probe.txt
# The probe MCP server, for both sides (multi).
printf '{"mcpServers":{"probe":{"command":"node","args":["%s/mcp-probe.cjs"]}}}' "$T" > $T/mcp.json
export MULTI_READ_FILE=$T/run-probe.txt
[ -n "${STATE_SOCKET:-}" ] || echo "note: no STATE_SOCKET; w1 keeps its memory in process"

w1_restart() { # $1: env assignments
  kill "$(cat $T/worker-w1.pid)" 2>/dev/null
  i=0; while [ $i -lt 50 ] && curl -sf -m 1 http://127.0.0.1:8787/healthz >/dev/null 2>&1; do i=$((i+1)); sleep 0.2; done
  start_worker w1 8787 $T/acct "$1"
  set_log_level 8787
}
valkey_stop() {
  : > "$STATE_CTL/stop"
  i=0; while [ $i -lt 100 ] && [ -S "$STATE_SOCKET" ]; do i=$((i+1)); sleep 0.1; done
  echo "  valkey stopped: $([ -S "$STATE_SOCKET" ] && echo no || echo yes)"
}
valkey_start() {
  rm -f "$STATE_CTL/stop"
  i=0; while [ $i -lt 100 ] && [ ! -S "$STATE_SOCKET" ]; do i=$((i+1)); sleep 0.1; done
  sleep 0.5
  echo "  valkey started: $([ -S "$STATE_SOCKET" ] && echo yes || echo no)"
}
st_hooks() {
  for h in $(printf '%s' "$1" | tr ',' ' '); do
    case "$h" in
      -) ;;
      restart) echo "  [w1 restart]"; w1_restart "$W1_ENV" ;;
      restart-mem) echo "  [w1 restart, process memory]"; w1_restart 'CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-ccgaudit-fake' ;;
      vstop) echo "  [valkey stop]"; valkey_stop ;;
      vstart) echo "  [valkey start]"; valkey_start ;;
      sleep*) echo "  [sleep ${h#sleep}]"; sleep "${h#sleep}" ;;
      drop) echo "  [proxy drops $H_TOOLS]"; printf '%s' "$H_TOOLS" > $T/drop-p1 ;;
      *) echo "  unknown hook $h"; exit 1 ;;
    esac
  done
}

st_case() { # $1 name, $2 scenario, $3 policy, $4 A env, $5 B env; turns on stdin
  # Own names: start_worker and start_proxy set name.
  st_name=$1; st_scenario=$2; st_policy=$3; st_aenv=$4; st_benv=$5
  # STATE_CASES (comma-separated names) runs only those.
  case ",${STATE_CASES:-$st_name}," in *",$st_name,"*) ;; *) cat > /dev/null; return 0 ;; esac
  cat > $T/st-turns
  echo "== $st_name (scenario $st_scenario)"
  for st_side in a b; do
    if [ $st_side = a ]; then CENV=$st_aenv; else CENV=$st_benv; fi
    start_fake $CAP/$st_name/$st_side "$st_scenario"
    if [ $st_side = b ]; then
      w1_restart "$W1_ENV" # every case starts on a fresh Worker process
      printf '%s' "$st_policy" > $T/policy.json
      printf '%s' "$CAP/$st_name/in" > $T/inbound-dir-p1
    fi
    st_n=0
    while IFS='|' read -r st_hooks_line st_args; do
      [ -n "$st_args" ] || continue
      [ $st_side = b ] && st_hooks "$st_hooks_line"
      CARGS=$st_args
      if [ $st_n = 0 ]; then client $T/client-$st_side </dev/null; else client_keep $T/client-$st_side </dev/null; fi
      st_n=$((st_n+1))
    done < $T/st-turns
    if [ $st_side = b ]; then printf '' > $T/inbound-dir-p1; : > $T/drop-p1; fi
    stop_fake
  done
  [ -S "${STATE_SOCKET:-/nonexistent}" ] || [ -z "${STATE_SOCKET:-}" ] || valkey_start
}

O='--model claude-opus-4-8 --output-format json'
MULTI="-p \"Use each tool you are given once, then say DONE.\" --mcp-config $T/mcp.json --permission-mode bypassPermissions $O"
MULTI_C="--mcp-config $T/mcp.json --permission-mode bypassPermissions --continue $O"
TOOL="-p \"Run the command and report its output.\" --permission-mode bypassPermissions $O"
COMPACT="-p \"/compact\" --continue $O"
OK_C="-p \"Reply with the single word OK.\" --continue --permission-mode bypassPermissions $O"
SHORT=$(policy build ',"build_attachment_sources":{"platform_name":"worker","os_version":"worker"},"build_injection":{"attachments":{"environment":true,"model":true,"total_tokens":true,"date":true}},"session_memory":{"thread_ttl_seconds":60,"tools_ttl_seconds":60}')

# Many tools in one turn (Bash, Read, MCP, WebSearch with its server tool):
# the client's own value (first-party), the gateway's (third-party: the
# client sends none), and the first-party value dropped on the way.
st_case st-multi-fp multi "$POLICY_LOW" "$REF_ENV" "$GW_ENV" <<EOF
-|$MULTI
-|-p "Reply with the single word OK." $MULTI_C
EOF
st_case st-multi-tp multi "$POLICY_LOW" "$REF_ENV" "$TP_ENV" <<EOF
-|$MULTI
-|-p "Reply with the single word OK." $MULTI_C
EOF
st_case st-multi-drop multi "$POLICY_LOW" "$REF_ENV" "$GW_ENV" <<EOF
drop|$MULTI
drop|-p "Reply with the single word OK." $MULTI_C
EOF
# A tool, a compaction, a turn without tools. Claude Code's compaction keeps
# the names in the summary message (<tools-used-before-summary>, read back by
# its history extraction), so even without memory B = A (2026-11-05 run).
st_case st-compact-tp tool1 "$POLICY_LOW" "$REF_ENV" "$TP_ENV" <<EOF
-|$TOOL
-|$COMPACT
-|$OK_C
EOF
st_case st-multi-compact-tp multi "$POLICY_LOW" "$REF_ENV" "$TP_ENV" <<EOF
-|$MULTI
-|$COMPACT
-|-p "Reply with the single word OK." $MULTI_C
EOF
# The Worker restarts between turns: with Valkey the memory survives.
st_case st-restart-tp tool1 "$POLICY_LOW" "$REF_ENV" "$TP_ENV" <<EOF
-|$TOOL
restart|$COMPACT
restart|$OK_C
EOF
# The same on an old container (process memory): the memory is lost, the
# summary still carries the names (B = A).
st_case st-restart-mem-tp tool1 "$POLICY_LOW" "$REF_ENV" "$TP_ENV" <<EOF
restart-mem|$TOOL
-|$COMPACT
restart-mem|$OK_C
EOF
# Memory past its lifetime (the policy's minimum, 60 s): the next turn has
# only the history, whose summary still carries the names (B = A).
st_case st-ttl-tp tool1 "$SHORT" "$REF_ENV" "$TP_ENV" <<EOF
-|$TOOL
-|$COMPACT
sleep65|$OK_C
EOF
# The same lifetime without the wait: still remembered.
st_case st-ttl-fresh-tp tool1 "$SHORT" "$REF_ENV" "$TP_ENV" <<EOF
-|$TOOL
-|$COMPACT
-|$OK_C
EOF
# Valkey stopped from the start: every request succeeds on the local copy;
# Valkey back (and the breaker's 30 s over), what was learnt meanwhile is
# written to it, so a Worker restart after that still has it.
st_case st-valkey-down-tp tool1 "$POLICY_LOW" "$REF_ENV" "$TP_ENV" <<EOF
vstop|$TOOL
-|$COMPACT
vstart,sleep32|$OK_C
restart|$OK_C
EOF
# Valkey stops between turns (no restart): the local copy answers.
st_case st-valkey-stop-tp tool1 "$POLICY_LOW" "$REF_ENV" "$TP_ENV" <<EOF
-|$TOOL
vstop|$COMPACT
-|$OK_C
EOF
# A name only the memory has: an @ file read is Claude Code's side channel
# (recorded as Read, never a tool_use block), so the first-party client's
# header has Read and the history does not. The next turn's header is
# dropped on the way and the Worker restarts first: with Valkey B = A; on an
# old container (process memory) Read is lost (the expected difference).
SIDE="-p \"Reply with the single word OK. @$T/run-probe.txt\" --permission-mode bypassPermissions $O"
st_case st-side-restart-fp text "$POLICY_LOW" "$REF_ENV" "$GW_ENV" <<EOF
-|$SIDE
drop,restart|$OK_C
EOF
st_case st-side-restart-mem-fp text "$POLICY_LOW" "$REF_ENV" "$GW_ENV" <<EOF
restart-mem|$SIDE
drop,restart-mem|$OK_C
EOF

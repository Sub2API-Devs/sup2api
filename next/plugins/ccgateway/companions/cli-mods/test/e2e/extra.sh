#!/bin/sh
# r3 extra phases (sourced from run.sh, $1 = calib|all): non-CC context,
# nested subagents, and the fallback-credit streaming probe. Uses run.sh's
# helpers, $T, $CAP and the POLICY_* constants.
set -u
PHASE=${1:-all}

noncc_run() { # $1 capture name, $2 identity|context
  name=$1; mode=$2
  echo "== $name (non-CC $mode)"
  start_fake $CAP/$name/b text
  printf '%s' "$POLICY_LOW" > $T/policy.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
  node $T/noncc.cjs http://127.0.0.1:8788/v1/messages "$POLICY_LOW" "$POLICY_NONE" "$mode" $T/policy.json | tee $CAP/$name/client.txt
  printf '' > $T/inbound-dir-p1
  stop_fake
}

credit_probe() { # $1 name, $2 scenario, $3 stream 0|1, $4 beta
  name=$1; scen=$2; stream=$3; beta=$4
  echo "== $name (credit $scen stream=$stream)"
  CREDIT_DELAY_MS=1500 start_fake $CAP/$name/b "$scen"
  printf '%s' "$POLICY_MICRO" > $T/policy3.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p3
  node $T/credit-client.cjs http://127.0.0.1:8778/v1/messages "$POLICY_MICRO" "$stream" "$beta" "$CAP/$name/client.json"
  printf '' > $T/inbound-dir-p3
  stop_fake
}

noncc_run2() { # $1 capture name, $2 identity2|context2
  name=$1; mode=$2
  echo "== $name (non-CC $mode)"
  start_fake $CAP/$name/b text
  printf '%s' "$POLICY_LOW" > $T/policy.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
  node $T/noncc2.cjs http://127.0.0.1:8788/v1/messages "$POLICY_LOW" "$POLICY_NONE" "$mode" $T/policy.json | tee $CAP/$name/client.txt
  printf '' > $T/inbound-dir-p1
  stop_fake
}

probe_run() {
  name=probe-build
  echo "== $name (Worker /v1/ccgateway/probe)"
  mkdir -p $CAP/$name
  start_fake $CAP/$name/b text
  PROBE_OUT=$CAP/$name/client.json node $T/noncc2.cjs http://127.0.0.1:8787/v1/ccgateway/probe "$POLICY_LOW" "$POLICY_NONE" probe
  stop_fake
}

credit_plain_vs_tracked() {
  name=credit-plain-vs-tracked
  echo "== $name (same body, untracked then tracked, both streamed)"
  CREDIT_DELAY_MS=1500 start_fake $CAP/$name/b credit-slow
  printf '%s' "$POLICY_MICRO" > $T/policy3.json
  printf '%s' "$CAP/$name/in" > $T/inbound-dir-p3
  node $T/credit-client.cjs http://127.0.0.1:8778/v1/messages "$POLICY_MICRO" 1 "" "$CAP/$name/client-plain.json"
  node $T/credit-client.cjs http://127.0.0.1:8778/v1/messages "$POLICY_MICRO" 1 fallback-credit-2026-07-01 "$CAP/$name/client-tracked.json"
  printf '' > $T/inbound-dir-p3
  stop_fake
}

if [ "$PHASE" = calib ]; then
  noncc_run c-identity identity
  noncc_run c-context context
  CARGS='-p "use a subagent to say OK" --model claude-opus-4-8 --output-format json'
  run_case c-sub3 sub3 "$POLICY_LOW"
  credit_probe c-credit-stream credit-slow 1 fallback-credit-2026-07-01
else
  noncc_run noncc-identity identity
  noncc_run noncc-context context
  CARGS='-p "use a subagent to say OK" --model claude-opus-4-8 --output-format json'
  run_case sub1-build-low sub1 "$POLICY_LOW"
  run_case sub1-direct sub1 "$POLICY_NONE"
  run_case sub2-build-low sub2 "$POLICY_LOW"
  run_case sub2-direct sub2 "$POLICY_NONE"
  run_case sub3-build-low sub3 "$POLICY_LOW"
  run_case sub3-direct sub3 "$POLICY_NONE"
  credit_probe credit-stream-trailer-build credit-slow 1 fallback-credit-2026-07-01
  credit_probe credit-json-trailer-build credit 0 fallback-credit-2026-07-01
  noncc_run2 noncc-identity2 identity2
  noncc_run2 noncc-context2 context2
  probe_run
  credit_plain_vs_tracked
fi

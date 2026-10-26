#!/bin/sh
# Follow-up (r3): one decisive classification test. Sourced from run.sh with
# $CAP/$T/POLICY_LOW in scope.
set -u
name=noncc-classify
echo "== $name (billing header position vs forged CC context)"
start_fake $CAP/$name/b text
printf '%s' "$POLICY_LOW" > $T/policy.json
printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
node $T/noncc3.cjs http://127.0.0.1:8788/v1/messages "$POLICY_LOW" $T/policy.json
printf '' > $T/inbound-dir-p1
stop_fake

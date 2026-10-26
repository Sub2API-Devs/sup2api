#!/bin/sh
# 0.1.95 client-values phase (sourced from run.sh): non-CC requests with
# numbers a JavaScript double would change, generation values CC's builder
# cannot carry and an unreadable metadata.user_id, through w1 (OAuth) behind
# the stand-in core p1. Uses run.sh's helpers, $T, $CAP and POLICY_*.
name=values
echo "== $name (client values)"
start_fake $CAP/$name/b text
printf '%s' "$CAP/$name/in" > $T/inbound-dir-p1
node $T/values.cjs http://127.0.0.1:8788/v1/messages "$POLICY_LOW" "$POLICY_NONE" $T/policy.json $CAP/$name/client.json
printf '' > $T/inbound-dir-p1
stop_fake
node $T/values-verify.cjs $CAP/$name

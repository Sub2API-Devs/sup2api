#!/bin/sh
# A9 (static audit): two tracked credit streams in flight at once. The Worker's
# resource authority is shared, so the second must not wait for the first
# (0.1.91 P2-2). Sourced from run.sh with $CAP/$T/POLICY_MICRO in scope.
set -u
name=credit-concurrent
echo "== $name (two tracked streams at once)"
CREDIT_DELAY_MS=1500 start_fake $CAP/$name/b credit-slow
printf '%s' "$POLICY_MICRO" > $T/policy3.json
printf '%s' "$CAP/$name/in" > $T/inbound-dir-p3
node $T/credit-client.cjs http://127.0.0.1:8778/v1/messages "$POLICY_MICRO" 1 fallback-credit-2026-07-01 "$CAP/$name/client-1.json" > "$CAP/$name/client-1.txt" &
p1=$!
sleep 0.2
node $T/credit-client.cjs http://127.0.0.1:8778/v1/messages "$POLICY_MICRO" 1 fallback-credit-2026-07-01 "$CAP/$name/client-2.json" > "$CAP/$name/client-2.txt" &
p2=$!
wait $p1 $p2
printf '' > $T/inbound-dir-p3
stop_fake
cat "$CAP/$name/client-1.txt" "$CAP/$name/client-2.txt"

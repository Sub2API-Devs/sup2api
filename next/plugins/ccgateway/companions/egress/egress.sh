#!/bin/sh
set -eu
# All commands execute inside this container's network namespace.
# Never enable IP forwarding: only sing-box may originate external traffic.
nft -f /config/firewall.nft
ip rule add fwmark 1 lookup 100
ip route add local 0.0.0.0/0 dev lo table 100
sing-box check -c /config/sing-box.json
exec sing-box run -c /config/sing-box.json

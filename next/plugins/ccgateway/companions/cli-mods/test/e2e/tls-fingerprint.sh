#!/bin/sh
# Records the ClientHello and HTTP/1.1 request head each client sends to
# api.anthropic.com (tls-probe.cjs), in one throwaway offline container:
# official Claude Code CLIs (print mode, synthetic API key) and custom CLI
# releases (`claude request --direct` and `--build`), each twice.
#   IMG=ccgateway-app:0.1.104 OUT=/abs/out sh tls-fingerprint.sh \
#     official-2.1.304=/abs/claude-official-304 official-2.1.310=/abs/claude-official-310 \
#     custom-v31=/abs/v31/claude custom-v32=/abs/v32/claude
# Then: node tls-compare.cjs $OUT/connections.jsonl
set -eu
IMG=${IMG:?worker image (node, openssl)}; OUT=${OUT:?output directory}
KIT=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT/bin"; chmod 777 "$OUT"; : > "$OUT/connections.jsonl"
CLIENTS=''
for spec in "$@"; do name=${spec%%=*}; cp "${spec#*=}" "$OUT/bin/$name"; chmod 755 "$OUT/bin/$name"; CLIENTS="$CLIENTS $name"; done
cp "$KIT/tls-probe.cjs" "$OUT/"
docker run --rm --network none --user 0 --add-host api.anthropic.com:127.0.0.1 -e CLIENTS="$CLIENTS" -v "$OUT":/o --entrypoint sh "$IMG" -euc '
  mkdir -p /o/cert && cd /o/cert
  openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.pem -days 1 -subj /CN=tlsprobe-ca -addext basicConstraints=critical,CA:TRUE -addext keyUsage=critical,keyCertSign,cRLSign 2>/dev/null
  openssl req -newkey rsa:2048 -nodes -keyout server.key.pem -out server.csr -subj /CN=api.anthropic.com 2>/dev/null
  printf "subjectAltName=DNS:api.anthropic.com\nbasicConstraints=CA:FALSE\n" > ext.cnf
  openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt.pem -days 1 -extfile ext.cnf 2>/dev/null
  node /o/tls-probe.cjs /o/cert /o > /o/probe.log 2>&1 &
  i=0; while [ ! -f /o/ready ] && [ $i -lt 50 ]; do i=$((i+1)); sleep 0.2; done
  mkdir -p /tmp/project && cd /tmp/project
  run() { # $1 label, then the command
    label=$1; shift; echo "$label" > /o/label
    rm -rf /tmp/home && mkdir -p /tmp/home/.claude && printf "{\"hasCompletedOnboarding\":true}" > /tmp/home/.claude.json && chown -R 1000:1000 /tmp/home
    env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/home CLAUDE_CONFIG_DIR=/tmp/home/.claude DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
      NODE_EXTRA_CA_CERTS=/o/cert/ca.pem ANTHROPIC_API_KEY=sk-ant-api03-tlsprobe-fake timeout 120 "$@" > /o/$label.out 2> /o/$label.err || echo "  $label exit=$?"
  }
  body=/tmp/direct.json; printf "{\"model\":\"claude-haiku-4-5-20251001\",\"max_tokens\":16,\"messages\":[{\"role\":\"user\",\"content\":\"Say OK.\"}]}" > $body
  build=/tmp/build.json; printf "{\"model\":\"claude-haiku-4-5-20251001\",\"messages\":[{\"role\":\"user\",\"content\":\"Say OK.\"}],\"parameters\":{\"max_tokens\":16}}" > $build
  for n in 1 2; do for c in $CLIENTS; do
    case $c in
      official-*) run "$c-$n" /o/bin/$c -p "Say OK." --model claude-haiku-4-5-20251001 --output-format json ;;
      *) run "$c-direct-$n" /o/bin/$c request --direct --input $body; run "$c-build-$n" /o/bin/$c request --build --input $build ;;
    esac
  done; done
  sleep 1; chmod -R a+rwX /o'
echo "connections: $(wc -l < "$OUT/connections.jsonl")"

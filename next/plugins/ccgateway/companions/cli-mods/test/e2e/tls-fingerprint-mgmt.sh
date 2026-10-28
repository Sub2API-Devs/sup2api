#!/bin/sh
# Records the ClientHello each client sends to api.anthropic.com (tls-probe.cjs)
# in one throwaway offline container, for the management-path TLS audit:
#   official-*  print mode, synthetic API key (the reference)
#   custom-*    `claude ccgateway-mgmt` (fake OAuth login in .credentials.json)
#               and `claude request --direct` (regression), each twice
# tls-probe.cjs completes TLS with a self-signed api.anthropic.com certificate
# the clients trust through NODE_EXTRA_CA_CERTS and answers 200 {} to anything
# that is not /v1/messages; the 200 versus 401 does not change the ClientHello.
#   IMG=ccgateway-app:0.1.107 OUT=/abs/out sh tls-fingerprint-mgmt.sh \
#     official-2.1.310=/abs/claude-official-310 custom-v34=/abs/v34/claude
# Then: node tls-compare-mgmt.cjs $OUT/connections.jsonl
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
  fresh_home() {
    rm -rf /tmp/home && mkdir -p /tmp/home/.claude && printf "{\"hasCompletedOnboarding\":true}" > /tmp/home/.claude.json
  }
  # run: one client invocation under the probe. $1 label, rest the command.
  run() { label=$1; shift; echo "$label" > /o/label
    env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/home CLAUDE_CONFIG_DIR=/tmp/home/.claude DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
      NODE_EXTRA_CA_CERTS=/o/cert/ca.pem $PROBE_ENV timeout 120 "$@" > /o/$label.out 2> /o/$label.err || echo "  $label exit=$?"
  }
  body=/tmp/direct.json; printf "{\"model\":\"claude-haiku-4-5-20251001\",\"max_tokens\":16,\"messages\":[{\"role\":\"user\",\"content\":\"Say OK.\"}]}" > $body
  for n in 1 2; do for c in $CLIENTS; do
    fresh_home; cd /tmp
    case $c in
      official-*)
        PROBE_ENV="ANTHROPIC_API_KEY=sk-ant-api03-tlsprobe-fake"
        run "$c-$n" /o/bin/$c -p "Say OK." --model claude-haiku-4-5-20251001 --output-format json ;;
      *)
        # A fake Claude login, so the command takes the OAuth path (no API key
        # in the environment). The access token is never checked by the probe.
        cat > /tmp/home/.claude/.credentials.json <<EOF
{"claudeAiOauth":{"accessToken":"sk-ant-oat01-fake","refreshToken":"sk-ant-ort01-fake","expiresAt":4102444800000,"refreshTokenExpiresAt":4102444800000,"scopes":["user:inference","user:profile"],"subscriptionType":"pro","rateLimitType":"default_claude_ai"}}
EOF
        PROBE_ENV=""
        run "$c-mgmt-$n" /o/bin/$c ccgateway-mgmt --path /api/oauth/usage --output /o/$c-mgmt-$n.body --meta /o/$c-mgmt-$n.meta --timeout-ms 5000
        PROBE_ENV="ANTHROPIC_API_KEY=sk-ant-api03-tlsprobe-fake"
        run "$c-direct-$n" /o/bin/$c request --direct --input $body ;;
    esac
  done; done
  sleep 1; chmod -R a+rwX /o'
echo "connections: $(wc -l < "$OUT/connections.jsonl")"

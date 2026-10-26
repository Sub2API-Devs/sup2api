#!/bin/sh
# Captures what an unmodified official Claude Code sends upstream, as the
# version's committed fixture (test/fixtures/official-request-<version>.json):
# one print-mode request from a fresh HOME in a fresh, non-Git project
# (/work/fresh-official-project), with a synthetic API key, against the e2e
# fake upstream (fake-upstream.cjs, scenario text) over a unix socket. Runs in a
# throwaway offline container from a Worker image (node + openssl); nothing
# leaves the container but the captured body.
#   IMG=ccgateway-app:0.1.103 OFFICIAL_CLI=/path/claude-official-2.1.310 \
#     [TOOLS_OUT=/path/official-tools-2.1.310.json] \
#     sh capture-official.sh /path/official-request-2.1.310.json [model]
# TOOLS_OUT also writes the version's official-tools fixture from the same
# request: its provenance, the client's SHA-256, the body hash
# (sha256 of the compact JSON, as test/replay-helpers.cjs sha) and the
# client's own ToolSearch and DeferredToolPlaceholder entries of this
# request's tools array, verbatim. fixtures/build-assembly-manifest.cjs takes
# those two definitions from the official-request capture when the file is
# absent and checks it against the capture when present.
set -eu
OUT=$1; MODEL=${2:-claude-sonnet-4-6}
IMG=${IMG:?image with node and openssl}; OFFICIAL_CLI=${OFFICIAL_CLI:?official CLI ELF}
KIT=$(cd "$(dirname "$0")" && pwd)
W=$(mktemp -d); trap 'docker run --rm -v "$W":/w --entrypoint rm "$IMG" -rf /w/cap /w/home /w/cert >/dev/null 2>&1; rm -rf "$W"' EXIT
cp "$KIT/fake-upstream.cjs" "$W/"; cp "$OFFICIAL_CLI" "$W/claude-official"; chmod 755 "$W/claude-official"; chmod 777 "$W"
docker run --rm --network none --user 1000:1000 -v "$W":/w --entrypoint sh "$IMG" -euc '
  cd /w; mkdir -p cert cap home/.claude /tmp/work/fresh-official-project
  openssl req -x509 -newkey rsa:2048 -nodes -keyout cert/key.pem -out cert/cert.pem -days 1 -subj /CN=api.anthropic.com -addext subjectAltName=DNS:api.anthropic.com 2>/dev/null
  SCENARIO=text node fake-upstream.cjs /w/up.sock /w/cap /w/cert > fake.log 2>&1 &
  i=0; while [ $i -lt 20 ] && [ ! -S /w/up.sock ]; do i=$((i+1)); sleep 0.5; done
  printf "{\"hasCompletedOnboarding\":true}" > home/.claude.json
  cd /tmp/work/fresh-official-project
  env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/w/home CLAUDE_CONFIG_DIR=/w/home/.claude DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
    ANTHROPIC_API_KEY=sk-ant-api03-ccgaudit-fake ANTHROPIC_UNIX_SOCKET=/w/up.sock NODE_TLS_REJECT_UNAUTHORIZED=0 _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1 \
    timeout 300 /w/claude-official -p "Reply with CAPTURED. Do not call any tools." --model "'"$MODEL"'" --output-format json > /w/out.json 2> /w/err.txt || true
  ls /w/cap'
# The fixture is the body of the one Messages request, as JSON.
docker run --rm -v "$W":/w --entrypoint node "$IMG" -e '
  const fs=require("fs");const files=fs.readdirSync("/w/cap").filter(f=>/^req-\d+\.json$/.test(f)).sort();
  const reqs=files.map(f=>JSON.parse(fs.readFileSync("/w/cap/"+f,"utf8"))).filter(r=>r.url.startsWith("/v1/messages")&&!r.url.includes("count_tokens"));
  if(reqs.length!==1){console.error("expected one Messages request, got "+reqs.length+" ("+files.join(",")+")");process.exit(1)}
  process.stdout.write(JSON.stringify(JSON.parse(reqs[0].rawBody),null,2)+"\n")' > "$OUT"
echo "captured $(wc -c < "$OUT") bytes to $OUT"
if [ -n "${TOOLS_OUT:-}" ]; then
  SOURCE_SHA=$(sha256sum "$OFFICIAL_CLI" | cut -d' ' -f1)
  docker run --rm -i --network none --entrypoint node "$IMG" -e '
    const body=JSON.parse(require("fs").readFileSync(0,"utf8"));
    const version=/cc_version=(\d+\.\d+\.\d+)\./.exec(JSON.stringify(body.system))?.[1];
    const tools=Object.fromEntries(["ToolSearch","DeferredToolPlaceholder"].map(name=>{
      const found=(body.tools||[]).filter(t=>t.name===name);
      if(found.length!==1){console.error("the capture carries "+found.length+" "+name+" tools");process.exit(1)}
      return [name,found[0]]}));
    process.stdout.write(JSON.stringify({provenance:"Fresh official unmodified "+version+" request captured in a disposable local-mock environment (test/e2e/capture-official.sh)",
      source_cli_sha256:process.argv[1],body_sha256:require("crypto").createHash("sha256").update(JSON.stringify(body)).digest("hex"),tools},null,2)+"\n")' "$SOURCE_SHA" < "$OUT" > "$TOOLS_OUT"
  echo "official tools of the same request to $TOOLS_OUT"
fi

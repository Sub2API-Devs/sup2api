// Export scenario A (official client straight to the fake upstream) as the
// baseline of what Anthropic receives from a genuine Claude Code client.
// Tokens are masked. Output: <out>/<scenario>.json
// node export-baseline.cjs <capture-root> <out-dir>
// OFFICIAL_LABEL names the client in each file's `source` (the official binary
// and the run); the default is the 2.1.304 r3 run's.
const fs = require('fs'), path = require('path');
const [root, out] = process.argv.slice(2);
const OFFICIAL_LABEL = process.env.OFFICIAL_LABEL || 'official Claude Code 2.1.304 client (sha256 ea0f1357…27912)';
const RUN_LABEL = process.env.RUN_LABEL || 'r3 run, 2026-10-25';
fs.mkdirSync(out, { recursive: true });
const SECRET = /^(authorization|x-api-key|proxy-authorization|cookie)$/i;
const mask = (k, v) => SECRET.test(k) ? (String(v).startsWith('Bearer ') ? 'Bearer REDACTED' : 'REDACTED') : v;
const CASES = {
  '01-main-text': { dir: 'main-build-low', note: 'main thread, single user turn, -p "Reply with the single word OK."' },
  '02-main-text-direct': { dir: 'main-direct', note: 'the same conversation; direct only changes the delivery, not the client request' },
  '03-tool-two-rounds': { dir: 'tool-build-low', note: 'round 1: Bash tool_use; round 2: tool_result then text' },
  '04-subagent-two-levels': { dir: 'subagent-build-low', note: 'main -> Agent(LEVEL1) -> Agent(LEVEL2); 5 requests in wire order' },
  '05-compact': { dir: 'compact-build-low', note: 'turn 1, then /compact in the same session (request 2 is the compaction request)' },
  '06-turn2': { dir: 'turn2-build-low', note: 'two user turns in one session (--continue)' },
  '07-aux-nonessential': { dir: 'aux-nonessential', note: 'nonessential traffic enabled; the client issued no auxiliary request' },
  '08-noncc-reference': { dir: 'main-build-low', note: 'the official main-thread request, used as the reference for a non-Claude-Code request' },
  '09-apikey-shape': { dir: 'apikey-shape-sonnet-micro', note: 'the official client in API-key shape (ANTHROPIC_AUTH_TOKEN), the beta list of a non-OAuth client' },
  '10-subagent-one-level': { dir: 'sub1-build-low', note: 'main -> Agent(LEVEL1) -> OK (one subagent level)' },
  '11-subagent-three-levels': { dir: 'sub3-build-low', note: 'main -> Agent(LEVEL1) -> Agent(LEVEL2) -> Agent(LEVEL3); 7 requests in wire order' },
  '12-subagent-three-levels-direct': { dir: 'sub3-direct', note: 'the same three levels with relay_mode=direct (bytes are the client\'s)' },
};
for (const [name, c] of Object.entries(CASES)) {
  const src = path.join(root, c.dir, 'a');
  if (!fs.existsSync(src)) { console.log('skip', name, '(no capture)'); continue; }
  const files = fs.readdirSync(src).filter(f => /^req-\d+\.json$/.test(f)).sort();
  const requests = files.map((f, i) => {
    const r = JSON.parse(fs.readFileSync(path.join(src, f), 'utf8'));
    const headers = [];
    for (let k = 0; k + 1 < r.rawHeaders.length; k += 2) headers.push([r.rawHeaders[k].toLowerCase(), mask(r.rawHeaders[k], r.rawHeaders[k + 1])]);
    return { index: i + 1, method: r.method, url: r.url, headers, body: r.body };
  });
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({
    scenario: name, source: `${OFFICIAL_LABEL} straight to the fake upstream, ANTHROPIC_UNIX_SOCKET + _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1 (${RUN_LABEL})`,
    note: c.note, captured_at: new Date().toISOString(), requests,
  }, null, 1));
  console.log('wrote', name, requests.length, 'requests');
}

// Checks request_capture_v1 end to end in one offline regression work dir:
// every request the fake upstream received through the Worker (cap/*/b) must
// be recorded in a Worker request log (data-*/request-logs/*/upstream-request.json)
// with the same body digest, a kept upstream-request.body must equal the bytes
// received, and the recorded headers must match the received ones (secrets
// redacted; connection-level headers the runtime adds are listed separately).
//   node capcheck.cjs $B/work-<tag>
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const W = process.argv[2];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const secrets = new Set(['authorization', 'proxy-authorization', 'x-api-key', 'cookie']);

const received = [];
const capRoot = path.join(W, 'cap');
for (const c of fs.existsSync(capRoot) ? fs.readdirSync(capRoot) : []) {
  const dir = path.join(capRoot, c, 'b');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => /^req-\d+\.json$/.test(f))) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (typeof r.rawBody !== 'string') continue;
    received.push({ where: `${c}/${f}`, sha: sha(Buffer.from(r.rawBody, 'utf8')), raw: r.rawBody, headers: r.headers || {} });
  }
}

const logs = [];
for (const d of fs.readdirSync(W).filter(d => d.startsWith('data-'))) {
  const root = path.join(W, d, 'request-logs');
  if (!fs.existsSync(root)) continue;
  for (const id of fs.readdirSync(root)) {
    const dir = path.join(root, id);
    const facts = path.join(dir, 'upstream-request.json');
    if (!fs.statSync(dir).isDirectory() || !fs.existsSync(facts)) continue;
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));
    const body = path.join(dir, 'upstream-request.body');
    logs.push({ worker: d, id, facts: JSON.parse(fs.readFileSync(facts, 'utf8')), meta, body: fs.existsSync(body) ? fs.readFileSync(body) : null });
  }
}

const bySha = new Map();
for (const l of logs) bySha.set(l.facts.body_sha256, [...(bySha.get(l.facts.body_sha256) || []), l]);
let missing = 0, bodyMismatch = 0, bodyChecked = 0, metaBad = 0, headerDiff = {}, headerChecked = 0;
for (const r of received) {
  const hit = bySha.get(r.sha);
  if (!hit) { missing++; if (missing <= 5) console.log('MISSING', r.where, r.sha.slice(0, 12)); continue; }
  for (const l of hit) {
    if (l.body) { bodyChecked++; if (!l.body.equals(Buffer.from(r.raw, 'utf8'))) { bodyMismatch++; console.log('BODY-MISMATCH', r.where, l.id); } }
    if (l.meta.upstream_body_sha256 !== r.sha || l.meta.upstream_captured !== true) { metaBad++; console.log('META', r.where, l.id, l.meta.upstream_body_sha256, l.meta.upstream_captured); }
  }
  // The same body can be sent in several cases: pair by the request's own ID.
  const id = r.headers['x-client-request-id'];
  const l = hit.find(x => id !== undefined && (x.facts.headers || {})['x-client-request-id'] === id) ?? (hit.length === 1 ? hit[0] : undefined);
  if (!l) { headerDiff['(ambiguous pairing)'] = (headerDiff['(ambiguous pairing)'] || 0) + 1; continue; }
  headerChecked++;
  const got = l.facts.headers || {};
  const names = new Set([...Object.keys(got), ...Object.keys(r.headers)]);
  for (const n of names) {
    const a = got[n], b = r.headers[n];
    const want = b === undefined ? undefined : secrets.has(n) ? '[REDACTED]' : Array.isArray(b) ? b.join(', ') : b;
    if (a !== want) headerDiff[n] = (headerDiff[n] || 0) + 1;
  }
}
const full = logs.filter(l => l.meta.log_level === 'full').length;
console.log(JSON.stringify({ received: received.length, logged: logs.length, fullLevelLogs: full, missing, bodyChecked, bodyMismatch, metaBad, headerChecked, headerDiff,
  modes: logs.reduce((m, l) => (m[l.meta.mode] = (m[l.meta.mode] || 0) + 1, m), {}),
  changed: logs.reduce((m, l) => (m[`${l.meta.mode}:${l.meta.body_changed}`] = (m[`${l.meta.mode}:${l.meta.body_changed}`] || 0) + 1, m), {}),
  secretsLeaked: logs.some(l => /sk-ant-oat01-ccgaudit-fake|ccg-audit-upstream-key|ccg-audit-gateway-key/.test(JSON.stringify(l.facts))) }, null, 1));

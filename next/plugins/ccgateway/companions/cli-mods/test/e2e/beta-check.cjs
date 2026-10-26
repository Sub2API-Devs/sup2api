// Cross-check every inbound request's anthropic-beta against the outbound one:
// a beta the client sent must be present at egress; anything only A has is the
// first-party-only addition. node beta-check.cjs <capture-root>
const fs = require('fs'), path = require('path');
const root = process.argv[2] || '/t/cap';
const pairs = raw => { const m = {}; for (let i = 0; i + 1 < raw.length; i += 2) { const k = raw[i].toLowerCase(); (m[k] ??= []).push(raw[i + 1]); } return m; };
const load = (d, re) => fs.existsSync(d) ? fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) : [];
let cases = 0, checked = 0, missing = 0, added = 0, firstParty = new Set(), addedSet = new Set();
for (const name of fs.readdirSync(root).sort()) {
  const dir = path.join(root, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  cases++;
  const IN = load(path.join(dir, 'in'), /^in-\d+\.json$/), B = load(path.join(dir, 'b'), /^req-\d+\.json$/)
    .filter(r => String(r.url).startsWith('/v1/messages'));
  const A = load(path.join(dir, 'a'), /^req-\d+\.json$/);
  const betas = r => (pairs(Array.isArray(r.rawHeaders) ? r.rawHeaders : [])['anthropic-beta']?.[0] ?? '').split(',').filter(Boolean);
  for (let i = 0; i < Math.min(IN.length, B.length); i++) {
    const ib = betas(IN[i]), bb = betas(B[i]);
    checked++;
    const gone = ib.filter(x => !bb.includes(x));
    if (gone.length) { missing++; console.log(`MISSING ${name} #${i + 1}: ${gone.join(',')}`); }
    const newOnes = bb.filter(x => !ib.includes(x));
    for (const x of newOnes) { added++; addedSet.add(x); }
  }
  if (A.length && B.length) {
    const ab = betas(A[0]), bb = betas(B[0]);
    for (const x of ab) if (!bb.includes(x)) firstParty.add(x);
  }
}
console.log(`\ncases=${cases} requests_checked=${checked} client_betas_missing_at_egress=${missing} betas_added=${added}`);
console.log('added by the gateway:', [...addedSet].join(', ') || '(none)');
console.log('only the A side has:', [...firstParty].join(', ') || '(none)');

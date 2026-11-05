// The state.sh cases, per Messages request in order: a = the official client
// straight to the fake upstream, in = what the client sent the gateway, b =
// what the fake upstream got through it.
//   node state-check.cjs <cap root>
// Two comparisons, both b against a:
//   - the x-claude-code-sandy-plover values;
//   - the thread chain: each request's x-claude-code-request-class, whether
//     its billing header has cc_prev_req and whether it has diagnostics (a
//     side query taken for the main thread breaks the main thread's chain).
// Exit 1 on any difference but the expected ones (EXPECTED_CHAIN).
const fs = require('fs'), path = require('path');
const root = process.argv[2];
const H = 'x-claude-code-sandy-plover';
// Expected chain differences: the thread memory past its lifetime (65 s
// over a 60 s policy) leaves the first request after the compaction without
// cc_prev_req and diagnostics, as Claude Code resuming a session whose
// transcript is gone.
const EXPECTED_CHAIN = { 'st-ttl-tp': ['#5 chain a=main+prev+diag b=main'] };
const header = (j, name) => {
  const r = j.rawHeaders || [];
  for (let i = 0; i < r.length; i += 2) if (String(r[i]).toLowerCase() === name) return r[i + 1];
  return undefined;
};
const requests = d => {
  if (!fs.existsSync(d)) return null;
  return fs.readdirSync(d).filter(f => /^(req|in)-\d+\.json$/.test(f)).sort().map(f => {
    const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
    const u = j.url || '';
    if (!/\/v1\/messages/.test(u) || /count_tokens/.test(u)) return null;
    const body = typeof j.body === 'string' ? (() => { try { return JSON.parse(j.body); } catch { return {}; } })() : j.body || {};
    const billing = String(body.system?.[0]?.text ?? '');
    return {
      tools: header(j, H) ?? '-',
      chain: `${header(j, 'x-claude-code-request-class') ?? '-'}${/cc_prev_req=/.test(billing) ? '+prev' : ''}${body.diagnostics ? '+diag' : ''}`,
    };
  }).filter(v => v !== null);
};
const compare = (a, b, key) => {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i]?.[key] !== b[i]?.[key]) out.push(`#${i + 1} ${key} a=${a[i]?.[key] ?? '(none)'} b=${b[i]?.[key] ?? '(none)'}`);
  return out;
};
let bad = 0;
for (const name of fs.readdirSync(root).filter(n => n.startsWith('st-')).sort()) {
  const a = requests(path.join(root, name, 'a')) || [], b = requests(path.join(root, name, 'b')) || [], inb = requests(path.join(root, name, 'in')) || [];
  const expected = EXPECTED_CHAIN[name] ?? [];
  const diffs = [...compare(a, b, 'tools'), ...compare(a, b, 'chain')];
  const ok = diffs.every(d => expected.includes(d)) && expected.every(d => diffs.includes(d)) && a.length > 0 && b.length > 0;
  if (!ok) bad++;
  console.log(`${name.padEnd(24)} ${!ok ? 'MISMATCH' : expected.length ? 'EXPECTED' : 'EQUAL'}  requests a=${a.length} b=${b.length}`);
  console.log(`  a  ${JSON.stringify(a.map(r => r.tools))}`);
  console.log(`  in ${JSON.stringify(inb.map(r => r.tools))}`);
  console.log(`  b  ${JSON.stringify(b.map(r => r.tools))}`);
  console.log(`  chain a  ${a.map(r => r.chain).join(' ')}`);
  console.log(`  chain b  ${b.map(r => r.chain).join(' ')}`);
  for (const d of diffs) console.log(`  ${d}`);
}
console.log(bad ? `state-check: ${bad} case(s) failed` : 'state-check: ok');
process.exit(bad ? 1 : 0);

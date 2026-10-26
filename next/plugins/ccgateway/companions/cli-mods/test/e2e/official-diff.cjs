// Compares two captured request bodies (official 2.1.304 vs 2.1.310, or
// official vs gateway) component by component: top-level keys and order, each
// system block, each first-turn reminder, each tool (name, description, schema,
// other fields), and the generation fields. Values that differ by construction
// are normalized first: the version (cc_version and the plain version), the
// cch and the attribution fingerprint, metadata ids, the date line.
//   node official-diff.cjs <a.json> <b.json> [--full]
const fs = require('fs');
const [A, B, mode] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));
const norm = s => typeof s !== 'string' ? s : s
  .replace(/cc_version=\d+\.\d+\.\d+\.[0-9a-f]{3}/g, 'cc_version=<V>.<fp>').replace(/\b2\.1\.\d{3}\b/g, '<V>')
  .replace(/cch=[0-9a-f]{5}/g, 'cch=<cch>').replace(/cc_prompt_id=[0-9a-f-]{36}/g, 'cc_prompt_id=<id>')
  .replace(/Today's date is \d{4}-\d{2}-\d{2}/g, "Today's date is <date>");
const out = [];
const same = (label, x, y) => { const nx = JSON.stringify(x, (k, v) => norm(v)), ny = JSON.stringify(y, (k, v) => norm(v)); if (nx !== ny) out.push({ label, a: nx, b: ny }); return nx === ny; };
same('top-level keys', Object.keys(a), Object.keys(b));
same('model', a.model, b.model);
const sys = x => Array.isArray(x.system) ? x.system : x.system === undefined ? [] : [{ type: 'text', text: x.system }];
const sa = sys(a), sb = sys(b);
same('system block count', sa.length, sb.length);
for (let i = 0; i < Math.max(sa.length, sb.length); i++) same(`system[${i}]`, sa[i], sb[i]);
const first = x => (Array.isArray(x.messages?.[0]?.content) ? x.messages[0].content : [{ type: 'text', text: x.messages?.[0]?.content }]);
const fa = first(a), fb = first(b);
same('first message block count', fa.length, fb.length);
for (let i = 0; i < Math.max(fa.length, fb.length); i++) same(`messages[0].content[${i}]`, fa[i], fb[i]);
same('message count', a.messages?.length, b.messages?.length);
for (let i = 1; i < Math.max(a.messages?.length ?? 0, b.messages?.length ?? 0); i++) same(`messages[${i}]`, a.messages[i], b.messages[i]);
const tools = x => new Map((x.tools ?? []).map(t => [t.name, t]));
const ta = tools(a), tb = tools(b);
same('tool names and order', [...ta.keys()], [...tb.keys()]);
for (const name of new Set([...ta.keys(), ...tb.keys()])) {
  const x = ta.get(name), y = tb.get(name);
  if (!x || !y) { out.push({ label: `tool ${name}`, a: x ? 'present' : 'absent', b: y ? 'present' : 'absent' }); continue; }
  same(`tool ${name} keys`, Object.keys(x), Object.keys(y));
  same(`tool ${name} description`, x.description, y.description);
  same(`tool ${name} input_schema`, x.input_schema, y.input_schema);
  const rest = t => Object.fromEntries(Object.entries(t).filter(([k]) => !['name', 'description', 'input_schema'].includes(k)));
  same(`tool ${name} other fields`, rest(x), rest(y));
}
for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
  if (['model', 'system', 'messages', 'tools', 'metadata'].includes(k)) continue;
  same(k, a[k], b[k]);
}
same('metadata keys', Object.keys(a.metadata ?? {}), Object.keys(b.metadata ?? {}));
// A short word diff for long texts: the first point where they differ.
const show = s => s.length > 400 && mode !== '--full' ? s.slice(0, 400) + '…' : s;
for (const d of out) {
  let at = 0; while (at < d.a.length && d.a[at] === d.b[at]) at++;
  console.log(`== ${d.label} (differs at ${at})`);
  console.log('  a: ' + show(d.a.slice(Math.max(0, at - 120))));
  console.log('  b: ' + show(d.b.slice(Math.max(0, at - 120))));
}
console.log(JSON.stringify({ differences: out.length, labels: out.map(d => d.label) }));
process.exitCode = out.length ? 1 : 0;

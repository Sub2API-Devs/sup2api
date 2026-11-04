// Per-request summary of a capture dir (cap-upstream.cjs records).
// node dump.cjs <case-dir> [--full]
const fs = require('fs'), path = require('path');
const dir = process.argv[2], full = process.argv.includes('--full');
const j = JSON.stringify;
const reqs = fs.readdirSync(dir).filter(f => /^req-\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const pairs = raw => { const o = []; for (let i = 0; i + 1 < raw.length; i += 2) o.push([raw[i], raw[i + 1]]); return o; };
const mask = (k, v) => /^(authorization|x-api-key)$/i.test(k) ? v.replace(/(Bearer |^)(.{0,12}).*/, '$1$2…') : v;
for (const r of reqs) {
  console.log(`\n=== req-${String(r.index).padStart(2, '0')} [${r.listener}] ${r.method} ${r.url}`);
  for (const [k, v] of pairs(r.rawHeaders)) console.log(`  H ${k}: ${mask(k, v)}`);
  const b = r.body;
  if (!b || typeof b !== 'object') continue;
  console.log(`  body keys: ${j(Object.keys(b))}`);
  for (const k of Object.keys(b)) if (!['system', 'messages', 'tools', 'metadata'].includes(k)) console.log(`  body.${k} = ${j(b[k]).slice(0, 300)}`);
  if (b.metadata) { let u = b.metadata.user_id; try { u = JSON.parse(u); } catch {} console.log(`  metadata = ${j({ ...b.metadata, user_id: u })}`); }
  const sys = Array.isArray(b.system) ? b.system : b.system ? [{ type: 'text', text: b.system, _string: true }] : [];
  sys.forEach((s, i) => console.log(`  system[${i}] len=${(s.text || '').length} keys=${j(Object.keys(s))} cache=${j(s.cache_control)} :: ${j((s.text || '').slice(0, full ? 100000 : 160))}`));
  console.log(`  tools(${(b.tools || []).length}) = ${j((b.tools || []).map(t => t.name + (t.defer_loading ? '*' : '')))}`);
  (b.messages || []).forEach((m, i) => {
    const c = typeof m.content === 'string' ? [{ type: 'string', text: m.content }] : m.content;
    console.log(`  msg[${i}] ${m.role}: ` + c.map(x => `${x.type}${x.cache_control ? '(cc:' + j(x.cache_control) + ')' : ''}:${j(String(x.text ?? x.name ?? x.tool_use_id ?? '').slice(0, full ? 100000 : 90))}`).join(' | '));
  });
}

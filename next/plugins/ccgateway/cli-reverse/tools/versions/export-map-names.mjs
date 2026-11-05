// Names the locals of Bun's namespace export maps after their export keys when a map's current names
// are the right set put on the wrong locals (a permutation), the signature of a carry that paired
// look-alike declarations by position. Bun writes a source module's namespace as
//   __export(ns, { KEY: () => local, ... })
// and KEY is that module's own export name, so it is the binding's original name.
//
//   node --max-old-space-size=6000 tools/versions/export-map-names.mjs [--out naming/semantic-zzzzzz-export-maps.jsonl]
//
// Input : original/, naming/final/top.json (run tools/naming/resolve.mjs first).
// Output: <out> one row per local whose final name differs from its key, in maps where the keys and
//         the current names overlap by at least 80% as sets (all maps of a chunk taken together) while
//         fewer than 95% sit on their own local. Offset keys, source "semantic", confidence 0.99 (wins over the carried
//         tables). Maps where the names simply differ (a member chose AGENT_OFFER_SITE for AGENT_OFFER)
//         are left alone. Prints one line per map it touched.
// 2026-11-05: 2.1.318's env registry (chunk-xjnnz630.js, 1,302 getters) came out shifted this way.
import fs from 'node:fs';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const OUT = args.out ?? 'naming/semantic-zzzzzz-export-maps.jsonl';
const top = JSON.parse(fs.readFileSync('naming/final/top.json', 'utf8'));
const strip = (n) => n.replace(/_\d+$/, '');
const rows = [];
// The output feeds the next resolve, so a rerun sees the fixed names and finds nothing to do: rows of an
// earlier run are kept as long as their binding is still exported under that key.
const earlier = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const stillExported = new Set();
for (const f of fs.readdirSync('original').filter((f) => /\.js$/.test(f)).sort()) {
  const s = fs.readFileSync('original/' + f, 'utf8');
  const byMin = new Map(Object.entries(top[f] ?? {}).filter(([, r]) => r.kind === 'decl').map(([k, r]) => [r.min, { ...r, key: k }]));
  // all maps of the chunk together: a shift can carry names across maps (the env registry has seven)
  const maps = [];
  for (const m of s.matchAll(/[\w$]+\([\w$]+,\{((?:[\w$]+:\(\)=>[\w$]+,?)+)\}\)/g)) {
    const pairs = m[1].split(',').map((p) => p.split(':()=>')).filter(([k, v]) => v && byMin.has(v));
    if (pairs.length) maps.push({ at: m.index, pairs });
  }
  const all = maps.flatMap((x) => x.pairs);
  for (const [k, v] of all) stillExported.add(f + byMin.get(v).key + '=' + k);
  if (all.length < 10) continue;
  const keys = new Set(all.map(([k]) => k)), names = new Set(all.map(([, v]) => strip(byMin.get(v).name)));
  let overlap = 0; for (const n of names) if (keys.has(n)) overlap++;
  const onPlace = all.filter(([k, v]) => byMin.get(v).name === k).length;
  if (overlap < 0.8 * keys.size || onPlace >= 0.95 * all.length) continue;
  let n = 0;
  for (const [k, v] of all) {
    const r = byMin.get(v);
    if (r.name === k || k === 'default' || !/^[A-Za-z_$][\w$]*$/.test(k)) continue; // a default export keeps its local name
    rows.push({ file: f, key: r.key, name: k, source: 'semantic', confidence: 0.99, note: `export map key (was ${r.name})` });
    n++;
  }
  console.log(`${f}: ${maps.length} maps, ${all.length} entries, ${onPlace} on place, ${n} renamed`);
}
{
  const have = new Set(rows.map((r) => r.file + r.key));
  for (const r of earlier) if (!have.has(r.file + r.key) && stillExported.has(r.file + r.key + '=' + r.name)) rows.push(r);
  rows.sort((a, b) => a.file.localeCompare(b.file) || +a.key.slice(1) - +b.key.slice(1));
}
fs.writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
console.log(JSON.stringify({ rows: rows.length, out: OUT }));

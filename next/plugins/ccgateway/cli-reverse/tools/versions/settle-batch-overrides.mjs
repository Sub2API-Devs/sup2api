// Settles naming-batch rows that rename a binding a carried table (tools/versions/carry-names.mjs)
// already names differently. On 2.1.318 most such rows were the batch's mistake (names written one
// binding off, copied from hints.jsonl), and a few were real carry errors where the code around the
// binding changed. Rule per disputed key: compare the code around the binding in the old tree (the
// carried row's source) and in the new tree, identifiers blanked; when they agree (>= 0.4: shared
// suffix of the 60 characters before plus shared prefix of the 60 after; small edits nearby already
// pull it under 0.8, and the shifted batch names sat between 0.45 and 0.75), the
// carried name stands; otherwise the batch name stands. The decision is written as a table with
// confidence 0.99 so tools/naming/resolve.mjs takes it over both.
//
//   node --max-old-space-size=6000 tools/versions/settle-batch-overrides.mjs \
//     --old-tree artifacts/versions/2.1.316-original --old-naming artifacts/versions/2.1.316-naming \
//     --dropped artifacts/versions/carry-316-318-dropped.jsonl --batches 'semantic-nm318-' \
//     --out naming/semantic-zzzzz-318-settle.jsonl --report artifacts/versions/settle-318.jsonl
//
// Inputs : original/ (new tree), naming/ (carried tables and batch tables), the old tree and old naming
//          directory, carry-names' dropped list (to pair carried rows with their old rows).
// Output : <out> one row per disputed key {file, key, name, source:"semantic", confidence:0.99, note};
//          <report> one row per disputed key with both names, both contexts, similarity and the choice.
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const PREFIX = args.batches ?? 'semantic-nm318-';
const outName = path.basename(args.out);
const dropped = new Set(readJsonl(args.dropped).map((d) => d.table + '\u0001' + JSON.stringify(d.row)));
// carried rows: new key -> {name, oldFile, oldKey, table}
const carried = new Map();
for (const f of fs.readdirSync(args['old-naming']).filter((f) => /^semantic-.*\.jsonl$/.test(f)).sort()) {
  const olds = readJsonl(path.join(args['old-naming'], f)), news = readJsonl(path.join('naming', f));
  let j = 0;
  for (const o of olds) {
    if (dropped.has(f + '\u0001' + JSON.stringify(o))) continue;
    const n = news[j++];
    carried.set(n.file + n.key, { name: n.name, oldFile: o.file, oldKey: o.key, table: f });
  }
}
const src = new Map();
const text = (root, f) => { const k = root + '/' + f; if (!src.has(k)) src.set(k, fs.readFileSync(path.join(root, f), 'utf8')); return src.get(k); };
const blank = (s) => s.replace(/[A-Za-z_$][\w$]*/g, '#');
function around(root, f, off) {
  const t = text(root, f), id = /^[\w$]+/.exec(t.slice(off))?.[0] ?? '';
  return { left: blank(t.slice(Math.max(0, off - 60), off)), right: blank(t.slice(off + id.length, off + id.length + 60)), raw: t.slice(Math.max(0, off - 40), off + id.length + 40).replace(/\s+/g, ' ') };
}
function similarity(a, b) {
  let l = 0; while (l < a.left.length && l < b.left.length && a.left[a.left.length - 1 - l] === b.left[b.left.length - 1 - l]) l++;
  let r = 0; while (r < a.right.length && r < b.right.length && a.right[r] === b.right[r]) r++;
  return (l + r) / Math.max(1, Math.min(a.left.length, b.left.length) + Math.min(a.right.length, b.right.length));
}
const rows = [], report = [];
const seen = new Set();
for (const f of fs.readdirSync('naming').filter((f) => f.startsWith(PREFIX) && f.endsWith('.jsonl')).sort()) {
  for (const x of readJsonl(path.join('naming', f))) {
    const k = x.file + x.key, c = carried.get(k);
    if (!c || c.name === x.name || seen.has(k)) continue;
    seen.add(k);
    const a = around(args['old-tree'], c.oldFile, +c.oldKey.slice(1)), b = around('original', x.file, +x.key.slice(1));
    const sim = Math.round(similarity(a, b) * 1000) / 1000;
    const keepCarried = sim >= 0.4;
    const name = keepCarried ? c.name : x.name;
    rows.push({ file: x.file, key: x.key, name, source: 'semantic', confidence: 0.99, note: `settled: ${keepCarried ? 'carried ' + c.table : 'batch ' + f} (context ${sim})` });
    report.push({ key: k, carried: c.name, carriedTable: c.table, batch: x.name, batchTable: f, similarity: sim, choice: keepCarried ? 'carried' : 'batch', old: a.raw, new: b.raw });
  }
}
fs.writeFileSync(args.out, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
fs.writeFileSync(args.report, report.map((r) => JSON.stringify(r)).join('\n') + (report.length ? '\n' : ''));
const by = {};
for (const r of report) { const key = r.batchTable.replace(/\.jsonl$/, '') + ' ' + r.choice; by[key] = (by[key] ?? 0) + 1; }
console.log(JSON.stringify({ disputed: report.length, carried: report.filter((r) => r.choice === 'carried').length, batch: report.filter((r) => r.choice === 'batch').length, out: outName }));
console.log(by);

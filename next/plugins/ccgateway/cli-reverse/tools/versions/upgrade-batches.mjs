// Cuts the hand work left after a version upgrade into batches for helpers (one input directory
// per batch), after tools/versions/carry-names.mjs and a pipeline run:
//   placement batches  declarations still under _unattributed/ or _new/ (analysis/segments/decl-path.jsonl)
//   naming batches     bindings still minified (analysis/readability/todo.jsonl, tools/verify/readability.mjs)
//
//   node --max-old-space-size=6000 tools/versions/upgrade-batches.mjs --out artifacts/tmp/batches \
//     --tag 318 --placement-size 300 --naming-groups 10 \
//     --pairs artifacts/versions/carry-316-318-pairs.jsonl --dropped artifacts/versions/carry-316-318-dropped.jsonl \
//     --old-analysis artifacts/versions/2.1.316-analysis
//
// Inputs : analysis/scan/decls.jsonl, analysis/segments/decl-path.jsonl, analysis/readability/todo.jsonl,
//          naming/final/top.json; the carry pairs and dropped rows; the old version's analysis/ (316 paths).
// Outputs: <out>/pl<tag>-<n>/decls.jsonl   placement work, one declaration per line:
//            {id, file, start, end, bytes, path (current, a scratch path), names (minified),
//             prev / next (nearest placed declarations in the chunk: {id, path}),
//             old (paired old declaration: {id, path, status}) | null}
//          <out>/nm<tag>-<n>/plan.json     naming work in tools/naming/annotate.mjs plan format (one group, index 0)
//          <out>/nm<tag>-<n>/hints.jsonl   old-version names of bindings in these declarations that could not
//                                          be carried: {declId, oldFile, oldKey, name, reason}
//          <out>/batches.json             the list: code, kind, counts, output files
// The task text for each batch is written by hand next to these files (TASK.md).
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const OUT = args.out ?? 'artifacts/tmp/batches', TAG = args.tag ?? 'new';
const PSIZE = +(args['placement-size'] ?? 300), NG = +(args['naming-groups'] ?? 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const scratch = (p) => /(^|\/)_(unattributed|new|misplaced)\//.test(p);

const decls = readJsonl('analysis/scan/decls.jsonl');
const byId = new Map(decls.map((d) => [idOf(d), d]));
const pathOf = new Map(readJsonl('analysis/segments/decl-path.jsonl').map((x) => [x.id, x.path]));
// new unit key -> new decl id
const newDeclOfUnit = new Map();
for (const d of decls) { for (const n of d.names) newDeclOfUnit.set(d.file + ':' + n, idOf(d)); newDeclOfUnit.set(d.file + ':#' + d.start, idOf(d)); }
// old side
const OA = args['old-analysis'];
const oldDecls = readJsonl(path.join(OA, 'scan/decls.jsonl'));
const oldDeclOfUnit = new Map();
for (const d of oldDecls) { for (const n of d.names) oldDeclOfUnit.set(d.file + ':' + n, idOf(d)); oldDeclOfUnit.set(d.file + ':#' + d.start, idOf(d)); }
const oldPath = new Map(readJsonl(path.join(OA, 'segments/decl-path.jsonl')).map((x) => [x.id, x.path]));
const oldOfNewDecl = new Map(); // new decl id -> {id, path, status}
const newOfOldUnit = new Map();
for (const p of readJsonl(args.pairs)) {
  newOfOldUnit.set(p.old, p.new);
  const nd = newDeclOfUnit.get(p.new), od = oldDeclOfUnit.get(p.old);
  if (nd && od && !oldOfNewDecl.has(nd)) oldOfNewDecl.set(nd, { id: od, path: oldPath.get(od) ?? null, status: p.status, how: p.how });
}
fs.mkdirSync(OUT, { recursive: true });
const batches = [];

// ---------- placement ----------
{
  const byChunk = new Map();
  for (const d of decls) (byChunk.get(d.file) ?? byChunk.set(d.file, []).get(d.file)).push(d);
  for (const l of byChunk.values()) l.sort((a, b) => a.start - b.start);
  const work = new Map(); // chunk -> rows
  for (const [chunk, list] of byChunk) {
    list.forEach((d, i) => {
      const id = idOf(d), p = pathOf.get(id);
      if (!p || !scratch(p)) return;
      const near = (step) => { for (let j = i + step; j >= 0 && j < list.length; j += step) { const q = pathOf.get(idOf(list[j])); if (q && !scratch(q)) return { id: idOf(list[j]), path: q }; } return null; };
      (work.get(chunk) ?? work.set(chunk, []).get(chunk)).push({ id, file: d.file, start: d.start, end: d.end, bytes: d.bytes, path: p, names: d.names, prev: near(-1), next: near(1), old: oldOfNewDecl.get(id) ?? null });
    });
  }
  // whole chunks per batch, biggest first, filled to about PSIZE declarations
  const chunks = [...work].sort((a, b) => b[1].length - a[1].length);
  const bins = [];
  for (const [chunk, rows] of chunks) {
    let bin = bins.find((b) => b.rows.length + rows.length <= PSIZE);
    if (!bin) bins.push((bin = { rows: [], chunks: [] }));
    bin.rows.push(...rows); bin.chunks.push(chunk);
  }
  bins.forEach((b, i) => {
    const code = `pl${TAG}-${i + 1}`, dir = path.join(OUT, code);
    fs.mkdirSync(dir, { recursive: true });
    b.rows.sort((x, y) => x.file.localeCompare(y.file) || x.start - y.start);
    fs.writeFileSync(path.join(dir, 'decls.jsonl'), b.rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    batches.push({ code, kind: 'placement', decls: b.rows.length, bytes: b.rows.reduce((s, r) => s + r.bytes, 0), chunks: b.chunks.length,
      outputs: [`naming/placement-${code}.json`, `naming/docs-${code}.jsonl`, `naming/modules-${code}.json`, `docs/process/batch-${code}.md`] });
  });
}

// ---------- naming ----------
{
  const todo = readJsonl('analysis/readability/todo.jsonl').filter((t) => t.declId && (t.path.startsWith('src/') || t.path.startsWith('vendor/') || t.path.startsWith('runtime/')));
  const per = new Map();
  for (const t of todo) {
    let e = per.get(t.declId);
    if (!e) { const d = byId.get(t.declId); per.set(t.declId, (e = { id: t.declId, file: t.file, start: d?.start, end: d?.end, path: t.path, unnamed: 0, refs: 0 })); }
    e.unnamed++; e.refs += t.refs;
  }
  // old names that could not be carried, by the new declaration of their unit
  const hints = new Map();
  for (const r of readJsonl(args.dropped)) {
    if (!r.unit || !r.row?.key || !r.row?.name) continue;
    const nu = newOfOldUnit.get(r.unit);
    const nd = nu && newDeclOfUnit.get(nu);
    if (!nd || !per.has(nd)) continue;
    (hints.get(nd) ?? hints.set(nd, []).get(nd)).push({ declId: nd, oldDecl: oldDeclOfUnit.get(r.unit), oldFile: r.row.file, oldKey: r.row.key, name: r.row.name, reason: r.reason });
  }
  const vendor = [...per.values()].filter((e) => !e.path.startsWith('src/')).sort((a, b) => a.path.localeCompare(b.path) || a.start - b.start);
  const src = [...per.values()].filter((e) => e.path.startsWith('src/')).sort((a, b) => a.path.localeCompare(b.path) || a.start - b.start);
  const total = src.reduce((s, e) => s + e.unnamed, 0), target = total / NG;
  const groups = [];
  let g = null;
  for (const e of src) {
    if (!g || (g.unnamed >= target && groups.length < NG)) groups.push((g = { decls: [], unnamed: 0, dirs: [] }));
    const dir = e.path.split('/').slice(0, 3).join('/');
    if (!g.dirs.includes(dir)) g.dirs.push(dir);
    g.decls.push(e); g.unnamed += e.unnamed;
  }
  if (vendor.length) groups.push({ decls: vendor, unnamed: vendor.reduce((s, e) => s + e.unnamed, 0), dirs: [...new Set(vendor.map((e) => e.path.split('/').slice(0, 3).join('/')))], vendor: true });
  groups.forEach((gr, i) => {
    const code = `nm${TAG}-${i + 1}`, dir = path.join(OUT, code);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify([{ dirs: gr.dirs, unnamed: gr.unnamed, decls: gr.decls }]));
    const h = gr.decls.flatMap((e) => hints.get(e.id) ?? []);
    fs.writeFileSync(path.join(dir, 'hints.jsonl'), h.map((x) => JSON.stringify(x)).join('\n') + (h.length ? '\n' : ''));
    batches.push({ code, kind: gr.vendor ? 'naming-vendor' : 'naming', decls: gr.decls.length, bindings: gr.unnamed, hints: h.length, first: gr.decls[0].path, last: gr.decls.at(-1).path,
      outputs: [`naming/semantic-${code}.jsonl`, `docs/process/batch-${code}.md`] });
  });
}
fs.writeFileSync(path.join(OUT, 'batches.json'), JSON.stringify(batches, null, 1) + '\n');
for (const b of batches) console.log(JSON.stringify(b));

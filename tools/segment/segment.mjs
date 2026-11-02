// Groups the 2.1.316 top-level declarations into reconstructed source modules.
//   node tools/segment/segment.mjs [analysis]
// Inputs : analysis/scan/decls.jsonl, analysis/match/decl-map.jsonl,
//          analysis/vendor/decl-vendor.jsonl (optional, from the vendor role),
//          naming/placement*.json (optional, domain roles: {"<decl id>": "path/in/src.ts"}).
// Outputs: analysis/segments/modules.json  path -> {kind, decls[], chunks{}, bytes, methods{}}
//          analysis/segments/decl-path.jsonl one line per declaration {id, path, kind, method}
//          analysis/segments/summary.json
//
// Bun (like esbuild) code-splits at top-level-statement granularity, so one
// source file's declarations may sit in several chunks; inside one chunk a
// file's statements stay contiguous. Attribution order of precedence:
//   explicit placement > vendor/runtime > first-party match (reference file)
//   > layout (between two declarations of the same file in a chunk)
//   > affinity (adjacent in the chunk and its use-edges point to that file)
// Anything left is grouped per chunk run under _unattributed/ for the domain
// roles to place.
import fs from 'node:fs';
import path from 'node:path';

const A = process.argv[2] ?? 'analysis';
const out = path.join(A, 'segments');
fs.mkdirSync(out, { recursive: true });
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

const D = readJsonl(path.join(A, 'scan/decls.jsonl'));
const modules = JSON.parse(fs.readFileSync(path.join(A, 'scan/modules.json'), 'utf8'));
const exportsOf = new Map(modules.map((m) => [m.file, m.exports ?? {}]));
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const byId = new Map();
const byLocal = new Map();
D.forEach((d, i) => {
  d.i = i;
  d.id = idOf(d);
  byId.set(d.id, d);
  for (const n of d.names) byLocal.set(`${d.file}#${n}`, d);
});
// use edges (both directions)
for (const d of D) d.uses = new Set();
for (const d of D) d.usedBy = new Set();
for (const d of D) {
  for (const r of d.refs) {
    let t;
    if (r.startsWith('=')) t = byLocal.get(`${d.file}#${r.slice(1)}`);
    else {
      const [f, name] = r.split('|');
      const local = exportsOf.get(f)?.[name];
      t = local && byLocal.get(`${f}#${local}`);
    }
    if (t && t !== d) { d.uses.add(t.i); t.usedBy.add(d.i); }
  }
}

const label = new Array(D.length).fill(null); // {path, kind, method, order}
// 1. explicit placements
const namingDir = 'naming';
if (fs.existsSync(namingDir)) {
  for (const f of fs.readdirSync(namingDir).filter((f) => /^placement.*\.json$/.test(f))) {
    const p = JSON.parse(fs.readFileSync(path.join(namingDir, f), 'utf8'));
    for (const [id, target] of Object.entries(p)) {
      const d = byId.get(id);
      if (d) {
        const p = typeof target === 'string' ? target : target.path;
        const kind = p.startsWith('vendor/') ? 'vendor' : p.startsWith('_misplaced/') ? 'unattributed' : 'first-party';
        label[d.i] = { path: kind === 'vendor' ? p.slice('vendor/'.length) : p, kind, method: 'placement', by: f };
      }
    }
  }
}
// 2. vendor / runtime
for (const v of readJsonl(path.join(A, 'vendor/decl-vendor.jsonl'))) {
  const d = byId.get(v.id);
  if (!d || label[d.i]) continue;
  if (v.pkg === 'bun-runtime') label[d.i] = { path: 'bun-runtime.js', kind: 'runtime', method: v.method };
  else label[d.i] = { path: `${v.pkg}/${v.pkgFile ?? 'index.js'}`, kind: 'vendor', method: v.method, pkg: v.pkg };
}
// 2b. facade chunks: a facade re-exports exactly one source module, so every
// declaration it exports belongs to that module (analysis/facades, tools/ast/facades.mjs)
const facadePath = path.join(A, 'facades/facades.json');
if (fs.existsSync(facadePath)) {
  for (const [facade, f] of Object.entries(JSON.parse(fs.readFileSync(facadePath, 'utf8')))) {
    if (!f.path) continue;
    for (const id of Object.values(f.exports)) {
      const d = byId.get(id);
      if (d && !label[d.i]) label[d.i] = { path: f.path, kind: 'first-party', method: f.pathMethod, facade };
    }
  }
}
// 3. first-party matches. One-to-many ("fingerprint-shared") matches are
// clones — the same small helper inlined into several bundles or re-declared
// per chunk — so they name a declaration but do not place it; the matcher's
// own layout guesses are redone below with the trusted labels only.
const refLine = new Map();
for (const r of readJsonl(path.join(A, 'reference/decls.jsonl'))) refLine.set(`${r.file}#${r.names[0] ?? '@' + r.line}`, r.line);
const sharedClones = [];
for (const m of readJsonl(path.join(A, 'match/decl-map.jsonl'))) {
  const d = byId.get(m.id);
  if (!d || label[d.i] || !m.refFile) continue;
  if (m.method === 'fingerprint-shared' || m.fileMethod === 'layout') { if (m.method === 'fingerprint-shared') sharedClones.push([d, m]); continue; }
  label[d.i] = { path: m.refFile, kind: 'first-party', method: m.fileMethod ?? m.method, order: m.ref ? refLine.get(m.ref) : undefined, refName: m.refName };
}
for (const m of readJsonl(path.join(A, 'match/local-map.jsonl'))) {
  const d = byId.get(m.id);
  if (d && !label[d.i]) label[d.i] = { path: m.refFile, kind: 'first-party', method: m.method, refName: m.refName };
}

// Per-chunk ordered lists
const byChunk = new Map();
for (const d of D) { let a = byChunk.get(d.file); if (!a) byChunk.set(d.file, (a = [])); a.push(d); }
for (const a of byChunk.values()) a.sort((x, y) => x.start - y.start);
// readable names from the previous resolve run, for naming new modules
const previousNames = new Map();
if (fs.existsSync('naming/final/top.json')) {
  for (const recs of Object.values(JSON.parse(fs.readFileSync('naming/final/top.json', 'utf8'))))
    for (const r of Object.values(recs)) if (r.declId && r.source !== 'minified' && !previousNames.has(r.declId)) previousNames.set(r.declId, r.name);
}

// 4. layout + affinity, iterated to a fixpoint
for (let round = 0; round < 60; round++) {
  let added = 0;
  for (const list of byChunk.values()) {
    // layout: gap between two declarations of the same path
    let last = null, gap = [];
    for (const d of list) {
      const l = label[d.i];
      if (!l) { gap.push(d); continue; }
      if (gap.length && last && last.path === l.path) for (const g of gap) { label[g.i] = { path: l.path, kind: l.kind, method: 'layout', pkg: l.pkg }; added++; }
      gap = [];
      last = l;
    }
    // affinity: an unlabeled declaration adjacent to a labeled one whose
    // use-edges point (mostly) to the same path
    for (let k = 0; k < list.length; k++) {
      const d = list[k];
      if (label[d.i]) continue;
      const cands = new Set([label[list[k - 1]?.i]?.path, label[list[k + 1]?.i]?.path].filter(Boolean));
      if (!cands.size) continue;
      const votes = new Map();
      for (const j of [...d.uses, ...d.usedBy]) { const p = label[j]?.path; if (p) votes.set(p, (votes.get(p) ?? 0) + 1); }
      let best = null, total = 0;
      for (const [p, n] of votes) { total += n; if (cands.has(p) && (!best || n > best.n)) best = { p, n }; }
      if (best && best.n * 2 > total) {
        const src = label[list[k - 1]?.i]?.path === best.p ? label[list[k - 1].i] : label[list[k + 1].i];
        label[d.i] = { path: best.p, kind: src.kind, method: 'affinity', pkg: src.pkg };
        added++;
      }
    }
  }
  added += soleConsumerRuns();
  if (!added) break;
}

// 4c. sole-consumer runs. Take each maximal run of unplaced declarations in
// a chunk; if everything outside the run that uses it lives in ONE first-party
// module P, the run is P's private code. Bun keeps a source module's
// statements contiguous inside a chunk, so:
//   - the run touches P in the chunk  -> it is part of P            (sole-consumer)
//   - it does not                      -> a separate module only P uses,
//                                         placed next to P             (sole-consumer-new)
// Only first-party consumers count; vendor internals are the vendor role's.
function soleConsumerRuns() {
  let added = 0;
  for (const list of byChunk.values()) {
    for (let k = 0; k < list.length;) {
      if (label[list[k].i]) { k++; continue; }
      let e = k;
      while (e < list.length && !label[list[e].i]) e++;
      const run = list.slice(k, e);
      const inRun = new Set(run.map((d) => d.i));
      let p = null, ok = true, users = 0;
      for (const d of run) for (const j of d.usedBy) {
        if (inRun.has(j)) continue;
        const l = label[j];
        users++;
        if (!l || l.kind !== 'first-party' || (p && l.path !== p)) { ok = false; break; }
        p = l.path;
      }
      if (ok && p && users) {
        const touches = [list[k - 1], list[e]].some((x) => x && label[x.i]?.path === p);
        let target = p, method = 'sole-consumer';
        if (!touches) {
          const main = run.reduce((a, b) => (b.bytes > a.bytes ? b : a));
          const dir = p.startsWith('_new/') ? '_new' : path.posix.join(path.posix.dirname(p), '_new');
          target = path.posix.join(dir, `${nameOfDecl(main, p)}.ts`);
          method = 'sole-consumer-new';
        }
        for (const d of run) label[d.i] = { path: target, kind: 'first-party', method };
        added += run.length;
      }
      k = e;
    }
  }
  return added;
}
// A readable name for a new module: the main declaration's previous readable
// name, else "<consumer file>.helpers-<chunk tag>".
function nameOfDecl(d, consumer) {
  const n = previousNames.get(d.id);
  if (n && /^[A-Za-z_$][\w$]*$/.test(n) && n.length > 3) return n;
  const base = path.posix.basename(consumer).replace(/\.(tsx?|jsx?)$/, '');
  return `${base}.helpers-${d.file.replace(/^chunk-|\.js$/g, '').slice(0, 4)}`;
}

// 4b. a shared clone still unplaced goes to its reference file only when one
// of its chunk neighbours already sits there (it is then that file's copy)
for (const [d, m] of sharedClones) {
  if (label[d.i]) continue;
  const list = byChunk.get(d.file);
  const k = list.indexOf(d);
  const near = [list[k - 1], list[k + 1]].map((x) => x && label[x.i]?.path);
  if (near.includes(m.refFile)) label[d.i] = { path: m.refFile, kind: 'first-party', method: 'shared-adjacent', refName: m.refName };
}

// 5. leftovers: contiguous unlabeled runs per chunk
for (const [chunk, list] of byChunk) {
  let run = 0, prevLabeled = true;
  for (const d of list) {
    if (label[d.i]) { prevLabeled = true; continue; }
    if (prevLabeled) run++;
    prevLabeled = false;
    label[d.i] = { path: `_unattributed/${chunk.replace(/\.js$/, '')}/part-${String(run).padStart(3, '0')}.js`, kind: 'unattributed', method: 'leftover' };
  }
}

// ---------- output ----------
const mods = {};
const ws = fs.createWriteStream(path.join(out, 'decl-path.jsonl'));
for (const d of D) {
  const l = label[d.i];
  ws.write(JSON.stringify({ id: d.id, path: l.path, kind: l.kind, method: l.method, ...(l.refName ? { refName: l.refName } : {}) }) + '\n');
  const m = (mods[l.path] ??= { kind: l.kind, decls: [], chunks: {}, bytes: 0, methods: {} });
  m.decls.push({ id: d.id, order: l.order, chunk: d.file, start: d.start });
  m.chunks[d.file] = (m.chunks[d.file] ?? 0) + 1;
  m.bytes += d.bytes;
  m.methods[l.method] = (m.methods[l.method] ?? 0) + 1;
}
ws.end();
// Order declarations inside a module: chunk by chunk (largest first), keep
// chunk order; matched reference line numbers only break ties across chunks.
for (const m of Object.values(mods)) {
  const chunkRank = Object.entries(m.chunks).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  m.decls.sort((a, b) => chunkRank.indexOf(a.chunk) - chunkRank.indexOf(b.chunk) || a.start - b.start);
  m.decls = m.decls.map((x) => x.id);
}
fs.writeFileSync(path.join(out, 'modules.json'), JSON.stringify(mods, null, 1));
const sum = { modules: 0, decls: D.length, bytes: 0, byKind: {}, byMethod: {} };
for (const [p, m] of Object.entries(mods)) {
  sum.modules++;
  sum.bytes += m.bytes;
  const k = (sum.byKind[m.kind] ??= { modules: 0, decls: 0, bytes: 0 });
  k.modules++; k.decls += m.decls.length; k.bytes += m.bytes;
  for (const [meth, n] of Object.entries(m.methods)) sum.byMethod[meth] = (sum.byMethod[meth] ?? 0) + n;
}
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(sum, null, 1));
console.log(JSON.stringify(sum, null, 1));

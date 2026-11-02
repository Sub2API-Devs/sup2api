// Matches 2.1.316 top-level declarations against the reference source.
//   node tools/ast/match.mjs [analysis]
// Reads analysis/scan/{modules.json,decls.jsonl} and analysis/reference/
// {files.json,decls.jsonl}; writes analysis/match/{decl-map.jsonl,
// chunk-files.json,summary.json}.
//
// Stage 1 (fingerprint): weighted Dice over string literals and property
// names, weights = IDF over the 316 corpus; accepted when mutually best and
// above a threshold. Stage 2 (graph): for an accepted pair, unmatched callees
// are paired up when the call edges line up (same arity class, unique
// candidate, or best fingerprint among the callees). Stage 3 (layout): Bun
// emits each source module's statements contiguously inside a chunk, so an
// unmatched declaration sitting between two declarations of the same
// reference file is attributed to that file.
import fs from 'node:fs';
import path from 'node:path';

const A = process.argv[2] ?? 'analysis';
const out = path.join(A, 'match');
fs.mkdirSync(out, { recursive: true });
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// ---------- 316 side ----------
const modules = JSON.parse(fs.readFileSync(path.join(A, 'scan/modules.json'), 'utf8'));
const exportsOf = new Map(modules.map((m) => [m.file, m.exports ?? {}]));
const D = readJsonl(path.join(A, 'scan/decls.jsonl'));
const dByLocal = new Map(); // file#local -> decl index
D.forEach((d, i) => {
  d.i = i;
  d.id = `${d.file}#${d.names[0] ?? '@' + d.start}`;
  for (const n of d.names) dByLocal.set(`${d.file}#${n}`, i);
});
for (const d of D) {
  d.callees = [];
  for (const r of d.refs) {
    let key;
    if (r.startsWith('=')) key = `${d.file}#${r.slice(1)}`;
    else {
      const [f, name] = r.split('|');
      const local = exportsOf.get(f)?.[name];
      if (local) key = `${f}#${local}`;
    }
    const j = key && dByLocal.get(key);
    if (j !== undefined && j !== d.i) d.callees.push(j);
  }
}

// ---------- reference side ----------
const refFiles = JSON.parse(fs.readFileSync(path.join(A, 'reference/files.json'), 'utf8'));
const refFileSet = new Set(refFiles.map((f) => f.file));
const R = readJsonl(path.join(A, 'reference/decls.jsonl'));
const rByName = new Map();
R.forEach((r, i) => {
  r.i = i;
  r.id = `${r.file}#${r.names[0] ?? '@' + r.line}`;
  for (const n of r.names) rByName.set(`${r.file}#${n}`, i);
});
function resolveRef(from, spec) {
  let p;
  if (spec.startsWith('.')) p = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else if (spec.startsWith('src/')) p = spec.slice(4);
  else return null;
  const base = p.replace(/\.(js|jsx|ts|tsx|mjs)$/, '');
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js']) if (refFileSet.has(base + ext)) return base + ext;
  return null;
}
for (const r of R) {
  r.callees = [];
  for (const ref of r.refs) {
    let key;
    if (ref.startsWith('=')) key = `${r.file}#${ref.slice(1)}`;
    else {
      const bar = ref.lastIndexOf('|');
      const f = resolveRef(r.file, ref.slice(0, bar));
      if (f) key = `${f}#${ref.slice(bar + 1)}`;
    }
    const j = key && rByName.get(key);
    if (j !== undefined && j !== r.i) r.callees.push(j);
  }
}

// ---------- features ----------
const df = new Map();
const featsOf = (x) => [...x.strings.map((s) => 's\u0000' + s), ...x.props.map((p) => 'p\u0000' + p)];
for (const d of D) for (const f of new Set(featsOf(d))) df.set(f, (df.get(f) ?? 0) + 1);
const N = D.length;
const weight = (f) => {
  const n = df.get(f);
  if (!n) return 0;
  if (n > 400) return 0;
  const base = Math.log(1 + N / n);
  return f[0] === 's' ? base : base * 0.55;
};
const dW = D.map((d) => {
  const m = new Map();
  for (const f of featsOf(d)) { const w = weight(f); if (w) m.set(f, w); }
  return m;
});
const rW = R.map((r) => {
  const m = new Map();
  for (const f of featsOf(r)) { const w = weight(f); if (w) m.set(f, w); }
  return m;
});
const sum = (m) => { let s = 0; for (const v of m.values()) s += v; return s; };
const dTot = dW.map(sum);
const rTot = rW.map(sum);
const inv = new Map(); // feature -> ref indices
rW.forEach((m, i) => { for (const f of m.keys()) { let a = inv.get(f); if (!a) inv.set(f, (a = [])); a.push(i); } });

function score(di, ri) {
  const a = dW[di], b = rW[ri];
  let shared = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [f, w] of small) if (big.has(f)) shared += w;
  return (2 * shared) / (dTot[di] + rTot[ri] || 1);
}

// Stage 1
const MIN_W = 4; // a declaration needs some distinctive features to be fingerprinted
const best316 = new Array(N).fill(null);
const bestRef = new Array(R.length).fill(null);
for (let i = 0; i < N; i++) {
  if (dTot[i] < MIN_W) continue;
  const acc = new Map();
  for (const [f, w] of dW[i]) for (const ri of inv.get(f) ?? []) acc.set(ri, (acc.get(ri) ?? 0) + w);
  let top = null, second = 0;
  for (const [ri, shared] of acc) {
    const s = (2 * shared) / (dTot[i] + rTot[ri]);
    if (!top || s > top.s) { if (top) second = Math.max(second, top.s); top = { ri, s }; } else second = Math.max(second, s);
  }
  if (top) {
    best316[i] = { ...top, second };
    const cur = bestRef[top.ri];
    if (!cur || cur.s < top.s) bestRef[top.ri] = { di: i, s: top.s };
  }
}
const match = new Map(); // di -> {ri, s, method}
const matchedRef = new Map();
for (let i = 0; i < N; i++) {
  const b = best316[i];
  if (!b || b.s < 0.3) continue;
  const mutual = bestRef[b.ri]?.di === i;
  // Shape check only for one-to-many ("shared") matches of single-binding
  // statements; Bun merges constants into multi-declarator var statements, so
  // the function/value category is unreliable otherwise.
  const cat = (x) => (x.names.length !== 1 ? null : /Function|Class/.test(x.kind) || x.params != null ? "fn" : "value");
  const shapeOk = cat(D[i]) === null || cat(R[b.ri]) === null || cat(D[i]) === cat(R[b.ri]);
  if (mutual || (b.s >= 0.75 && shapeOk)) {
    match.set(i, { ri: b.ri, s: +b.s.toFixed(3), margin: +(b.s - b.second).toFixed(3), method: mutual ? 'fingerprint' : 'fingerprint-shared' });
    if (!matchedRef.has(b.ri)) matchedRef.set(b.ri, i);
  }
}
const stage1 = match.size;

// Stage 2: propagate along call edges, both directions (callees and callers).
// Each matched pair proposes pairings between its unmatched neighbours; a
// proposal is accepted with two independent witnesses, or one witness plus a
// fingerprint score (scores among neighbours are trustworthy at lower values
// than corpus-wide ones because the candidate set is tiny).
const dCallers = D.map(() => []), rCallers = R.map(() => []);
D.forEach((d) => { for (const c of new Set(d.callees)) dCallers[c].push(d.i); });
R.forEach((r) => { for (const c of new Set(r.callees)) rCallers[c].push(r.i); });
let rounds = 0;
for (;;) {
  if (rounds++ > 15) break;
  const proposals = new Map();
  const propose = (a, b, witness) => {
    if (!sameShape(D[a], R[b])) return;
    const k = a + ',' + b;
    let p = proposals.get(k);
    if (!p) proposals.set(k, (p = { a, b, witnesses: new Set(), s: score(a, b) }));
    p.witnesses.add(witness);
  };
  for (const [di, m] of match) {
    for (const [dn, rn] of [[D[di].callees, R[m.ri].callees], [dCallers[di], rCallers[m.ri]]]) {
      const dc = [...new Set(dn)].filter((x) => !match.has(x));
      const rc = [...new Set(rn)].filter((x) => !matchedRef.has(x));
      if (!dc.length || !rc.length || dc.length * rc.length > 400) continue;
      if (dc.length === 1 && rc.length === 1) { propose(dc[0], rc[0], di); continue; }
      for (const a of dc) for (const b of rc) if (score(a, b) >= 0.12) propose(a, b, di);
    }
  }
  const accepted = [...proposals.values()]
    .filter((p) => p.witnesses.size >= 2 || p.s >= 0.15)
    .sort((x, y) => y.witnesses.size - x.witnesses.size || y.s - x.s);
  let added = 0;
  for (const p of accepted) {
    if (match.has(p.a) || matchedRef.has(p.b)) continue;
    add(p.a, p.b, +p.s.toFixed(3), p.witnesses.size >= 2 ? 'callgraph-witnessed' : 'callgraph-fingerprint');
    match.get(p.a).witnesses = p.witnesses.size;
    added++;
  }
  if (!added) break;
}
function sameShape(d, r) {
  const fn = (k) => /Function|Class/.test(k) ? k.replace('Declaration', '') : 'var';
  if (fn(d.kind) !== fn(r.kind)) return d.kind !== 'FunctionDeclaration' && r.kind !== 'FunctionDeclaration';
  return true;
}
function add(di, ri, s, method) {
  match.set(di, { ri, s, method });
  matchedRef.set(ri, di);
}

// Stage 3: chunk layout interpolation
const byFile = new Map();
for (const d of D) { let a = byFile.get(d.file); if (!a) byFile.set(d.file, (a = [])); a.push(d); }
const fileOf = new Map(); // di -> {refFile, method}
for (const [di, m] of match) fileOf.set(di, { refFile: R[m.ri].file, method: m.method });
for (const list of byFile.values()) {
  list.sort((a, b) => a.start - b.start);
  let lastFile = null, gap = [];
  for (const d of list) {
    const f = fileOf.get(d.i)?.refFile;
    if (!f) { gap.push(d.i); continue; }
    if (gap.length && lastFile === f) for (const g of gap) fileOf.set(g, { refFile: f, method: 'layout' });
    gap = [];
    lastFile = f;
  }
}

// ---------- output ----------
const ws = fs.createWriteStream(path.join(out, 'decl-map.jsonl'));
const chunkFiles = {};
for (const d of D) {
  const m = match.get(d.i);
  const f = fileOf.get(d.i);
  const rec = { id: d.id, file: d.file, names: d.names, exported: d.exported, bytes: d.bytes };
  if (m) Object.assign(rec, { ref: R[m.ri].id, refName: R[m.ri].names[0] ?? null, score: m.s, margin: m.margin, method: m.method });
  if (f) Object.assign(rec, { refFile: f.refFile, fileMethod: f.method });
  ws.write(JSON.stringify(rec) + '\n');
  const c = (chunkFiles[d.file] ??= { decls: 0, bytes: 0, files: {} });
  c.decls++; c.bytes += d.bytes;
  if (f) c.files[f.refFile] = (c.files[f.refFile] ?? 0) + d.bytes;
}
ws.end();
fs.writeFileSync(path.join(out, 'chunk-files.json'), JSON.stringify(chunkFiles, null, 1));
const coveredBytes = Object.values(chunkFiles).reduce((s, c) => s + Object.values(c.files).reduce((a, b) => a + b, 0), 0);
const totalBytes = Object.values(chunkFiles).reduce((s, c) => s + c.bytes, 0);
const summary = {
  decls316: N, refDecls: R.length,
  stage1Fingerprint: stage1, afterCallgraph: match.size, withFile: fileOf.size,
  refDeclsMatched: matchedRef.size,
  refFilesTouched: new Set([...fileOf.values()].map((f) => f.refFile)).size,
  chunksTouched: Object.values(chunkFiles).filter((c) => Object.keys(c.files).length).length,
  bytesAttributed: coveredBytes, bytesTotal: totalBytes,
};
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(summary);

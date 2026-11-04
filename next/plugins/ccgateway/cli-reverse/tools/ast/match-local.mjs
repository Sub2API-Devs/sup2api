// Second-pass, file-local matching. After segmentation, many 2.1.316
// declarations are attributed to a reference file (layout / affinity) without
// a one-to-one partner. Inside one file the candidate set is tiny, so pairs
// can be accepted on much weaker evidence than corpus-wide matching:
//   - fingerprint Dice >= 0.12 with compatible shape, greedy best-first; or
//   - exactly one unmatched declaration of a compatible shape left on each
//     side with the same parameter count (function) — "last-pair".
//   node tools/ast/match-local.mjs [analysis]
// Output: analysis/match/local-map.jsonl {id, ref, refName, refFile, score, method}
import fs from 'node:fs';
import path from 'node:path';

const A = process.argv[2] ?? 'analysis';
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const D = new Map(readJsonl(path.join(A, 'scan/decls.jsonl')).map((d) => [`${d.file}#${d.names[0] ?? '@' + d.start}`, d]));
const R = readJsonl(path.join(A, 'reference/decls.jsonl'));
const rById = new Map(R.map((r) => [`${r.file}#${r.names[0] ?? '@' + r.line}`, r]));
const matched = readJsonl(path.join(A, 'match/decl-map.jsonl'));
const usedRef = new Set(matched.filter((m) => m.ref).map((m) => m.ref));
const has = new Set(matched.filter((m) => m.ref).map((m) => m.id));
const seg = readJsonl(path.join(A, 'segments/decl-path.jsonl'));

// IDF over the 316 corpus, as in match.mjs
const df = new Map();
const feats = (x) => [...x.strings.map((s) => 's\u0000' + s), ...x.props.map((p) => 'p\u0000' + p)];
for (const d of D.values()) for (const f of new Set(feats(d))) df.set(f, (df.get(f) ?? 0) + 1);
const N = D.size;
const w = (f) => { const n = df.get(f); if (!n || n > 400) return n ? 0.05 : 0.5; return Math.log(1 + N / n) * (f[0] === 's' ? 1 : 0.55); };
const vec = (x) => { const m = new Map(); for (const f of feats(x)) m.set(f, w(f)); return m; };
function score(a, b) {
  const va = vec(a), vb = vec(b);
  let s = 0, ta = 0, tb = 0;
  for (const [f, x] of va) { ta += x; if (vb.has(f)) s += x; }
  for (const x of vb.values()) tb += x;
  return ta + tb ? (2 * s) / (ta + tb) : 0;
}
const cat = (x) => (x.names.length !== 1 ? null : /Function|Class/.test(x.kind) ? 'fn' : x.params != null ? 'fn' : 'value');
const compatible = (a, b) => cat(a) === null || cat(b) === null || cat(a) === cat(b);

const byFile316 = new Map();
for (const s of seg) {
  if (s.kind !== 'first-party' || has.has(s.id)) continue;
  let a = byFile316.get(s.path);
  if (!a) byFile316.set(s.path, (a = []));
  a.push(D.get(s.id));
}
const byFileRef = new Map();
for (const r of R) {
  const id = `${r.file}#${r.names[0] ?? '@' + r.line}`;
  if (usedRef.has(id)) continue;
  let a = byFileRef.get(r.file);
  if (!a) byFileRef.set(r.file, (a = []));
  a.push(r);
}
const out = fs.createWriteStream(path.join(A, 'match/local-map.jsonl'));
let n = 0, lastPair = 0;
for (const [file, ds] of byFile316) {
  const rs = byFileRef.get(file);
  if (!rs?.length) continue;
  const pairs = [];
  for (const d of ds) for (const r of rs) if (compatible(d, r)) { const s = score(d, r); if (s >= 0.12) pairs.push([s, d, r]); }
  pairs.sort((x, y) => y[0] - x[0]);
  const ud = new Set(), ur = new Set();
  for (const [s, d, r] of pairs) {
    if (ud.has(d) || ur.has(r)) continue;
    ud.add(d); ur.add(r);
    out.write(JSON.stringify({ id: `${d.file}#${d.names[0] ?? '@' + d.start}`, ref: `${r.file}#${r.names[0] ?? '@' + r.line}`, refName: r.names[0] ?? null, refFile: r.file, score: +s.toFixed(3), method: 'file-local' }) + '\n');
    n++;
  }
  const restD = ds.filter((d) => !ud.has(d) && cat(d) === 'fn');
  const restR = rs.filter((r) => !ur.has(r) && cat(r) === 'fn');
  if (restD.length === 1 && restR.length === 1 && restD[0].params === restR[0].params) {
    const [d, r] = [restD[0], restR[0]];
    out.write(JSON.stringify({ id: `${d.file}#${d.names[0] ?? '@' + d.start}`, ref: `${r.file}#${r.names[0] ?? '@' + r.line}`, refName: r.names[0] ?? null, refFile: r.file, score: +score(d, r).toFixed(3), method: 'file-last-pair' }) + '\n');
    n++; lastPair++;
  }
}
out.end();
console.log({ localMatches: n, lastPair });
void rById;

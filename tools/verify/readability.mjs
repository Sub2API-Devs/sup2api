// Readability metric for the reconstructed tree: how many bindings still carry
// a minified-looking name after naming/final is applied.
//   node --max-old-space-size=8000 tools/verify/readability.mjs [out=analysis/readability] [final=naming/final]
//
// A binding "looks minified" when the module was minified (most of its
// bindings have 1–3 character names) and the binding still carries its
// minified name (or that name with a module-clash chunk tag `K1e_ab12`), or
// when a naming source gave it a 1–3 character name that is not a
// conventional short name (i, err, fn, id …). Imports are skipped (they follow
// the exporter).
//
// Output: <out>/summary.json   totals by tree / scope / kind, plus refs-weighted
//         <out>/files.jsonl    per reconstructed file: {path, tree, bindings, minified, top, params, locals, bytes}
//         <out>/todo.jsonl     every minified-looking binding: {file, key, min, path, scope, kind, refs, declId}
import fs from 'node:fs';
import path from 'node:path';
import { bindingsOf } from '../rename/lib/rename.mjs';

const OUT = process.argv[2] ?? 'analysis/readability';
const FINAL = process.argv[3] ?? 'naming/final';
fs.mkdirSync(OUT, { recursive: true });
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

const CONVENTIONAL = new Set(('i j k n m x y z e t v ' +
  'id fn cb ms ts ok db fd io os ui on to op ip' +
  ' err key url api dir cwd pid res req ctx acc obj arr str num idx len max min msg src dst val buf out raw row col tag ref map set now end pos sum tmp run log cmd arg env opt doc box' +
  ' age app bar bin bit cap cat cnt cur day def del dep diff dom elm evt exp ext fmt gap hex hit hue img inc ins jsx kid lhs rhs lim lng lst mid mod net nil nth old pad par pct pre prg pty qty rel rem rep ret rgb rid sec seq sha sig siz sql ssh std sub suf svg tab tex tid tok top txt typ uid uri usr utf var vec ver win wrk xml yes' +
  ' add all any ask bad big cmp cpu cut due fix get has hit job kv lo hi mb kb gb').split(/\s+/).filter(Boolean));
const looksMinified = (final, min, minifiedModule) => {
  if (final === '$' || final === '_') return false;
  const base = final.replace(/_[a-z0-9]{4}\d*$/, '');
  if (minifiedModule && base === min && min.length <= 3) return true;
  return base.length <= 3 && !CONVENTIONAL.has(base) && !CONVENTIONAL.has(base.toLowerCase());
};

const top = JSON.parse(fs.readFileSync(path.join(FINAL, 'top.json'), 'utf8'));
const localName = new Map();
const localSource = new Map();
for (const l of readJsonl(path.join(FINAL, 'locals.jsonl'))) { localName.set(`${l.file}${l.key}`, l.name); localSource.set(`${l.file}${l.key}`, l.source); }
// Short names taken from the original source (npm package or 2.1.88) are the
// author's own names (ajv's `it`, tsc's `o`): readable, counted as `authentic`.
const AUTHENTIC = new Set(['facade', 'vendor', 'reference']);

const declsByFile = new Map();
for (const d of readJsonl('analysis/scan/decls.jsonl')) {
  let a = declsByFile.get(d.file);
  if (!a) declsByFile.set(d.file, (a = new Map()));
  a.set(d.start, `${d.file}#${d.names[0] ?? '@' + d.start}`);
}
const pathOf = new Map(readJsonl('analysis/segments/decl-path.jsonl').map((x) => [x.id, x]));
const manifest = JSON.parse(fs.readFileSync('reconstructed/manifest.json', 'utf8'));
const outOf = new Map(); // declId -> reconstructed path
for (const [p, m] of Object.entries(manifest)) for (const id of m.decls ?? []) outOf.set(id, p);

const files = fs.readdirSync('original').filter((f) => /\.(js|mjs)$/.test(f) && !/\.min\.js$/.test(f) && f !== 'hljsBundle.generated.min.js');
const totals = {};
const bump = (k, w) => { totals[k] = (totals[k] ?? 0) + w; };
const perFile = new Map();
const todo = fs.createWriteStream(path.join(OUT, 'todo.jsonl'));
let n = 0;
for (const file of files) {
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  let bs;
  try { bs = bindingsOf(file, src); } catch { continue; }
  const decls = declsByFile.get(file) ?? new Map();
  const own = bs.filter((b) => b.kind !== 'import');
  const minifiedModule = own.filter((b) => b.name.length <= 3).length > own.length * 0.6;
  for (const b of bs) {
    if (b.kind === 'import') continue;
    const final = b.scope === 'top' ? top[file]?.[b.key]?.name ?? b.name : localName.get(`${file}${b.key}`) ?? b.name;
    const declId = decls.get(b.topDeclStart) ?? null;
    const out = (declId && outOf.get(declId)) ?? '(unplaced)';
    const tree = out.split('/')[0];
    const scope = b.scope === 'top' ? 'top' : b.kind === 'param' ? 'param' : 'local';
    const src0 = b.scope === 'top' ? top[file]?.[b.key]?.source : localSource.get(`${file}${b.key}`);
    const authentic = AUTHENTIC.has(src0) && final !== b.name;
    if (authentic && looksMinified(final, b.name, minifiedModule)) bump(`${tree}.${scope}.authenticShort`, 1);
    // A short name a naming member chose on purpose (different from the minified
    // one, two or more letters: ids, pin, ttl, jwt, mcp …, or a/b/c/d for
    // comparator-style pairs) is a reading decision, not leftover minification.
    const chosen = !authentic && src0 && src0 !== "minified" && final !== b.name && !/_d+$/.test(final) && (/^[A-Za-z][A-Za-z0-9]+$/.test(final) || /^[abcd]$/.test(final));
    if (chosen && looksMinified(final, b.name, minifiedModule)) bump(`${tree}.${scope}.chosenShort`, 1);
    const bad = !authentic && !chosen && looksMinified(final, b.name, minifiedModule);
    let f = perFile.get(out);
    if (!f) perFile.set(out, (f = { path: out, tree, bindings: 0, minified: 0, top: 0, params: 0, locals: 0, refs: 0, minifiedRefs: 0 }));
    f.bindings++;
    f.refs += b.refs + 1;
    bump(`${tree}.${scope}.total`, 1);
    bump(`${tree}.${scope}.totalRefs`, b.refs + 1);
    if (!bad) continue;
    f.minified++;
    f.minifiedRefs += b.refs + 1;
    f[scope === 'top' ? 'top' : scope === 'param' ? 'params' : 'locals']++;
    bump(`${tree}.${scope}.minified`, 1);
    bump(`${tree}.${scope}.minifiedRefs`, b.refs + 1);
    todo.write(JSON.stringify({ file, key: b.key, min: b.name, final, path: out, scope, kind: b.kind, refs: b.refs, declId }) + '\n');
  }
  if (++n % 200 === 0) process.stderr.write(`${n}/${files.length}\n`);
}
todo.end();
for (const [p, f] of perFile) {
  const full = path.join('reconstructed', p);
  f.bytes = fs.existsSync(full) ? fs.statSync(full).size : 0;
}
fs.writeFileSync(path.join(OUT, 'files.jsonl'), [...perFile.values()].sort((a, b) => b.minified - a.minified).map((f) => JSON.stringify(f)).join('\n') + '\n');
const summary = {};
for (const tree of new Set(Object.keys(totals).map((k) => k.split('.')[0]))) {
  summary[tree] = {};
  for (const scope of ['top', 'param', 'local']) {
    const t = totals[`${tree}.${scope}.total`] ?? 0;
    const m = totals[`${tree}.${scope}.minified`] ?? 0;
    const tr = totals[`${tree}.${scope}.totalRefs`] ?? 0;
    const mr = totals[`${tree}.${scope}.minifiedRefs`] ?? 0;
    summary[tree][scope] = { bindings: t, minified: m, authenticShort: totals[`${tree}.${scope}.authenticShort`] ?? 0, chosenShort: totals[`${tree}.${scope}.chosenShort`] ?? 0, readable: t ? +((1 - m / t) * 100).toFixed(1) : 100, readableByRefs: tr ? +((1 - mr / tr) * 100).toFixed(1) : 100 };
  }
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));

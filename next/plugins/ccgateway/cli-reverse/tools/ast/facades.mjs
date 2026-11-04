// Facade chunks: Bun gives every dynamically imported source module its own
// tiny chunk that only re-exports that module's bindings under their ORIGINAL
// export names, e.g. chunk-kahpc3cs.js:
//   import{fp,hn,…}from"./chunk-437rqrst.js"; … export{hn as cliError, fp as printCliError, …}
// So one facade = one source file, and its export list = that file's real
// export names. This is the strongest evidence in the build (first found by
// the bootstrap domain member, artifacts/tmp/bootstrap/facades.mjs).
//   node tools/ast/facades.mjs [analysis]
// Output: analysis/facades/facades.json
//   { "<facade chunk>": { path, pathMethod, own, exports: { "<original name>": "<decl id>" } } }
//         analysis/names/facade.jsonl  top-level names (source "facade")
// Path resolution: a reference file whose exported names cover the facade's
// names best (Jaccard >= 0.5, or all facade names exported by it); otherwise
// the reference file most of the facade's declarations were already matched
// to; otherwise unresolved (a module new in 2.1.316, named after its exports).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const A = process.argv[2] ?? 'analysis';
fs.mkdirSync(path.join(A, 'facades'), { recursive: true });
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const modules = JSON.parse(fs.readFileSync(path.join(A, 'scan/modules.json'), 'utf8'));
const exportsOf = new Map(modules.map((m) => [m.file, m.exports ?? {}]));
const D = readJsonl(path.join(A, 'scan/decls.jsonl'));
const declByLocal = new Map();
for (const d of D) for (const n of d.names) declByLocal.set(`${d.file}#${n}`, d);
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;

// reference exports per file
const refFiles = JSON.parse(fs.readFileSync(path.join(A, 'reference/files.json'), 'utf8'));
const refExports = new Map(refFiles.map((f) => [f.file, new Set(f.exported ?? [])]));
const byName = new Map(); // export name -> ref files
for (const [f, s] of refExports) for (const n of s) { let a = byName.get(n); if (!a) byName.set(n, (a = [])); a.push(f); }
const matchRec = new Map(readJsonl(path.join(A, 'match/decl-map.jsonl')).filter((m) => m.refFile && m.ref).map((m) => [m.id, m]));
const segPath = new Map(readJsonl(path.join(A, 'segments/decl-path.jsonl')).map((x) => [x.id, x.path]));
const byIdDecl = new Map(D.map((d) => [`${d.file}#${d.names[0] ?? '@' + d.start}`, d]));

const out = {};
const nameLines = [];
let resolved = { exports: 0, majority: 0, none: 0 };
for (const m of modules) {
  if (m.parseError || !m.file.startsWith('chunk-')) continue;
  const src = fs.readFileSync(path.join('original', m.file), 'utf8');
  const ast = parse(src, { sourceType: 'module' });
  // own code = anything other than import/export statements
  let own = 0;
  for (const n of ast.program.body) if (!/^(ImportDeclaration|Export(Named|All)Declaration)$/.test(n.type) || n.declaration) own += n.end - n.start;
  if (own > 200) continue;
  const im = new Map();
  for (const n of ast.program.body) if (n.type === 'ImportDeclaration') for (const s of n.specifiers) if (s.type === 'ImportSpecifier') im.set(s.local.name, [n.source.value.replace(/^\.\//, ''), s.imported.name ?? s.imported.value]);
  const exports = {};
  for (const [exp, local] of Object.entries(m.exports)) {
    const src2 = im.get(local);
    if (!src2) continue;
    const defLocal = exportsOf.get(src2[0])?.[src2[1]];
    const d = defLocal && declByLocal.get(`${src2[0]}#${defLocal}`);
    if (d) exports[exp] = idOf(d);
  }
  const names = Object.keys(exports).filter((n) => n !== 'default');
  if (!Object.keys(exports).length) continue;
  // resolve the source path. Only distinctive names vote (exported by at most
  // 3 reference files): DESCRIPTION, PROMPT, call, default… are everywhere.
  let best = null;
  const cand = new Map();
  const distinct = names.filter((n) => (byName.get(n)?.length ?? 0) <= 3);
  for (const n of distinct) for (const f of byName.get(n) ?? []) cand.set(f, (cand.get(f) ?? 0) + 1);
  for (const [f, k] of cand) {
    const s = refExports.get(f);
    const j = k / (names.length + s.size - k);
    const cover = k / Math.max(1, distinct.length);
    // full cover of the distinctive names, or a solid share of them
    const sc = cover === 1 ? 0.6 + j / 2 : cover >= 0.34 && k >= 2 ? 0.5 + j / 2 : j;
    if (!best || sc > best.sc) best = { f, sc };
  }
  let p = null, how = null;
  if (best && best.sc >= 0.5) { p = best.f; how = 'facade-exports'; resolved.exports++; }
  else {
    // weighted vote: a declaration matched to a reference declaration of the
    // SAME name as its facade export is strong evidence (3), any first-party
    // match counts 1, a segmentation guess (layout/affinity) 0.5
    const votes = new Map();
    let total = 0;
    for (const [exp, id] of Object.entries(exports)) {
      const mm = matchRec.get(id);
      const sp = segPath.get(id);
      let f = null, w = 0;
      if (mm?.refFile) { f = mm.refFile; w = mm.refName === exp ? 3 : 1; }
      else if (sp && !sp.startsWith('_unattributed/') && sp.includes('.ts')) { f = sp; w = 0.5; }
      total += 3;
      if (f) votes.set(f, (votes.get(f) ?? 0) + w);
    }
    const top = [...votes].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2 && top[1] >= total * 0.2) { p = top[0]; how = 'facade-majority'; resolved.majority++; }
    else {
      // new in 2.1.316 (or not in the reference): name the module after its
      // largest exported declaration
      const main = Object.entries(exports).filter(([e]) => e !== 'default').map(([e, id]) => [e, byIdDecl.get(id)?.bytes ?? 0]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? m.file.replace(/\.js$/, '');
      p = `_new/${main}.ts`;
      how = 'facade-new';
      resolved.none++;
    }
  }
  out[m.file] = { path: p, pathMethod: how, own, exports };
  for (const [exp, id] of Object.entries(exports)) {
    if (exp === 'default' || !/^[A-Za-z_$][\w$]*$/.test(exp)) continue;
    const d = byIdDecl.get(id) ?? null;
    if (!d) continue;
    nameLines.push({ id, exp });
  }
}
// binding offsets for the names: the declaring identifier of each declaration
const offsets = new Map(); // id -> Map(local -> offset)
const files = new Set(nameLines.map((x) => x.id.split('#')[0]));
for (const f of files) {
  const ast = parse(fs.readFileSync(path.join('original', f), 'utf8'), { sourceType: 'module' });
  const pat = (p, acc) => {
    if (!p) return;
    if (p.type === 'Identifier') acc.set(p.name, p.start);
    else if (p.type === 'ObjectPattern') p.properties.forEach((x) => pat(x.value ?? x.argument, acc));
    else if (p.type === 'ArrayPattern') p.elements.forEach((x) => pat(x, acc));
    else if (p.type === 'AssignmentPattern') pat(p.left, acc);
    else if (p.type === 'RestElement') pat(p.argument, acc);
  };
  const acc = new Map();
  for (const n0 of ast.program.body) {
    const n = n0.type === 'ExportNamedDeclaration' && n0.declaration ? n0.declaration : n0;
    if (n.type === 'VariableDeclaration') n.declarations.forEach((d) => pat(d.id, acc));
    else if (n.id?.type === 'Identifier') acc.set(n.id.name, n.id.start);
  }
  offsets.set(f, acc);
}
// the facade names a specific binding: exports map to local names
const ws = fs.createWriteStream(path.join(A, 'names/facade.jsonl'));
let named = 0;
for (const [facade, info] of Object.entries(out)) {
  const im = new Map();
  for (const [exp, id] of Object.entries(info.exports)) im.set(exp, id);
  for (const [exp, id] of im) {
    if (exp === 'default' || !/^[A-Za-z_$][\w$]*$/.test(exp)) continue;
    const file = id.split('#')[0];
    // which local of the decl is exported: resolve through the facade import again
    const local = resolveLocal(facade, exp);
    const off = local && offsets.get(file)?.get(local);
    if (off === undefined) continue;
    ws.write(JSON.stringify({ file, key: '@' + off, min: local, name: exp, source: 'facade', confidence: 0.99, via: 'facade:' + facade }) + '\n');
    named++;
  }
}
ws.end();
function resolveLocal(facade, exp) {
  const fm = modules.find((x) => x.file === facade);
  const local = fm.exports[exp];
  const imp = fm.imports.find((i) => i.names.some((n) => n.local === local));
  const imported = imp?.names.find((n) => n.local === local)?.imported;
  return imported && exportsOf.get(imp.from.replace(/^\.\//, ''))?.[imported];
}
fs.writeFileSync(path.join(A, 'facades/facades.json'), JSON.stringify(out, null, 1));
console.log({ facades: Object.keys(out).length, ...resolved, names: named });

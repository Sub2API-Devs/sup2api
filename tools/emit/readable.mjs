// Emits the readable source tree from the restored modules, the segmentation
// and the final naming table.
//   node tools/emit/readable.mjs [--out build/readable] [--only <path-prefix>] [--no-format]
// Inputs : original/, analysis/scan/{decls.jsonl,modules.json},
//          analysis/segments/{modules.json,decl-path.jsonl}, naming/final/{top.json,locals.jsonl}
// Outputs: <out>/src/**        first-party modules at their reference paths (.ts/.tsx -> .js)
//          <out>/src/_unattributed/**  first-party code not yet placed
//          <out>/vendor/<pkg>/** third-party modules
//          <out>/runtime/bun-runtime.js  Bun bundler helpers
//          <out>/assets/**      resources imported by modules (copied byte-for-byte)
//          <out>/manifest.json  per output file: declarations, chunk ranges, imports, exports
//
// Every top-level declaration keeps its original text (with names applied by
// the rename library) and is preceded by a provenance line
//   //@ chunk-xxx.js:<start>-<end> <how it was attributed> [= reference name]
// Imports are synthesised from the use edges: a binding defined in another
// output module is imported by its final name; chunk-external imports (node
// builtins, "bun:*") are carried over as written.
import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = opt('--out', 'build/readable');
const ONLY = opt('--only', null);
const FORMAT = !argv.includes('--no-format');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

import { renameModule } from '../rename/lib/rename.mjs';
import { loadNaming } from '../rename/lib/naming.mjs';
import { planFromTree } from '../rename/lib/global.mjs';

const D = readJsonl('analysis/scan/decls.jsonl');
const scanMods = JSON.parse(fs.readFileSync('analysis/scan/modules.json', 'utf8'));
const exportsOf = new Map(scanMods.map((m) => [m.file, m.exports ?? {}]));
const segMods = JSON.parse(fs.readFileSync('analysis/segments/modules.json', 'utf8'));
const declPath = new Map(readJsonl('analysis/segments/decl-path.jsonl').map((x) => [x.id, x]));
const match = new Map(readJsonl('analysis/match/decl-map.jsonl').filter((m) => m.refName).map((m) => [m.id, m]));
const top = JSON.parse(fs.readFileSync('naming/final/top.json', 'utf8'));
const localsByFile = new Map();
for (const l of readJsonl('naming/final/locals.jsonl')) {
  let m = localsByFile.get(l.file);
  if (!m) localsByFile.set(l.file, (m = new Map()));
  m.set(+l.key.slice(1), l.name);
}
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const byId = new Map(D.map((d) => [idOf(d), d]));
const declByLocal = new Map();
const declsByFile = new Map();
for (const d of D) {
  for (const n of d.names) declByLocal.set(`${d.file}#${n}`, d);
  let a = declsByFile.get(d.file);
  if (!a) declsByFile.set(d.file, (a = []));
  a.push(d);
}

// binding lookup per chunk: minified name -> {off, rec}
const topByMin = new Map(); // file -> Map(min -> {off, rec})
const importByKey = new Map(); // file -> Map("from|imported" -> {off, rec})
for (const [file, recs] of Object.entries(top)) {
  const a = new Map(), b = new Map();
  for (const [k, r] of Object.entries(recs)) {
    if (r.kind === 'import') b.set(`${r.from}|${r.imported}`, { off: +k.slice(1), rec: r });
    else a.set(r.min, { off: +k.slice(1), rec: r });
  }
  topByMin.set(file, a);
  importByKey.set(file, b);
}

// output path of a reconstructed module
function outPath(p, kind) {
  if (kind === 'vendor') return path.posix.join('vendor', p);
  if (kind === 'runtime') return 'runtime/bun-runtime.js';
  return path.posix.join('src', p.replace(/\.(tsx?|jsx|mjs)$/, '.js'));
}

// ---------- rename + slice every chunk that contributes ----------
const wanted = Object.entries(segMods).filter(([p]) => !ONLY || p.startsWith(ONLY));
const chunks = new Set();
for (const [, m] of wanted) for (const c of Object.keys(m.chunks)) chunks.add(c);
// Imports of contributing chunks name bindings of other chunks: rename those too
// so every top-level name used below is the engine's final one.
const naming = loadNaming('naming/final');
console.time('[emit] global plan');
const { plan } = planFromTree('original', naming.modules);
console.timeEnd('[emit] global plan');
const declText = new Map();
const finalName = new Map(); // file -> Map(original offset -> final name), top-level and imports
let conflicts = 0;
for (const file of fs.readdirSync('original').filter((f) => f === 'cli.js' || /^chunk-.*.js$/.test(f))) {
  const source = fs.readFileSync(path.join('original', file), 'utf8');
  const r = renameModule(file, source, naming.modules.get(file), plan);
  conflicts += r.conflicts.length;
  const fm = new Map();
  for (const x of r.renamed) if (x.key?.startsWith('@')) fm.set(+x.key.slice(1), x.to);
  finalName.set(file, fm);
  if (!chunks.has(file)) continue;
  for (const d of declsByFile.get(file) ?? []) declText.set(idOf(d), r.code.slice(r.offsetMap(d.start), r.offsetMap(d.end)));
}
// patch the name records used for import synthesis with the engine's decisions
for (const [file, recs] of Object.entries(top)) {
  const fm = finalName.get(file);
  if (!fm) continue;
  for (const [k, r] of Object.entries(recs)) r.name = fm.get(+k.slice(1)) ?? r.min;
}

// ---------- assemble ----------
const manifest = {};
const resources = new Set();
const pathOfDecl = (id) => { const x = declPath.get(id); return x ? outPath(x.path, x.kind) : null; };
for (const [p, m] of wanted) {
  const file = outPath(p, m.kind);
  const imports = new Map(); // module specifier -> Map(importedName -> localName)
  const externalImports = new Map();
  const body = [];
  const exportNames = new Set();
  for (const id of m.decls) {
    const d = byId.get(id);
    // use edges -> imports
    for (const r of d.refs) {
      if (r.startsWith('=')) {
        const t = topByMin.get(d.file)?.get(r.slice(1));
        const tDecl = declByLocal.get(`${d.file}#${r.slice(1)}`);
        if (!t || !tDecl) continue;
        const tp = pathOfDecl(idOf(tDecl));
        if (tp && tp !== file) addImport(imports, rel(file, tp), t.rec.name, t.rec.name);
        continue;
      }
      const bar = r.indexOf('|');
      const from = r.slice(0, bar), imported = r.slice(bar + 1);
      const local = importByKey.get(d.file)?.get(`${from}|${imported}`);
      const alias = local?.rec.name ?? imported;
      if (!/^chunk-|^cli\.js$/.test(from)) {
        if (/^__cc_resource_/.test(alias) || /\.(txt|md|json|node|woff2|asset|html|mjs|js)$/.test(from)) { resources.add(from); addImport(externalImports, rel(file, 'assets/' + from), imported, alias); continue; }
        addImport(externalImports, from, imported, alias);
        continue;
      }
      const tLocal = exportsOf.get(from)?.[imported];
      const tDecl = tLocal && declByLocal.get(`${from}#${tLocal}`);
      if (!tDecl) continue;
      const tName = topByMin.get(from)?.get(tLocal)?.rec.name ?? tLocal;
      const tp = pathOfDecl(idOf(tDecl));
      if (!tp) continue;
      if (tp === file) { if (alias !== tName) body.push(`const ${alias} = ${tName}; //@ cross-chunk alias`); continue; }
      addImport(imports, rel(file, tp), tName, alias);
    }
    const dp = declPath.get(id);
    const mm = match.get(id);
    body.push(`//@ ${d.file}:${d.start}-${d.end} ${dp?.method ?? ''}${mm ? ' = ' + mm.refName + (mm.score !== undefined ? ` (${mm.score})` : '') : ''}`);
    body.push(declText.get(id) ?? '/* missing */');
  }
  // names other modules import from this one
  manifest[file] = { from: p, kind: m.kind, decls: m.decls, chunks: m.chunks, methods: m.methods, imports: [...imports.keys()] };
  manifest[file].exportsPending = exportNames;
  manifest[file].lines = { imports, externalImports, body };
}
// exports: every name another module imports
for (const [file, info] of Object.entries(manifest)) {
  for (const [spec, names] of info.lines.imports) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
    if (manifest[target]) for (const n of names.keys()) manifest[target].exportsPending.add(n);
  }
}
let written = 0, formatFailures = 0;
for (const [file, info] of Object.entries(manifest)) {
  const { imports, externalImports, body } = info.lines;
  const head = [
    '/**',
    ` * ${info.from}`,
    ` * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).`,
    ` * kind: ${info.kind}${info.kind === 'first-party' ? `   reference path: src/${info.from}` : ''}`,
    ` * pieces: ${Object.entries(info.chunks).map(([c, n]) => `${c} (${n})`).join(', ')}`,
    ` * attribution: ${Object.entries(info.methods).map(([k, n]) => `${k} ${n}`).join(', ')}`,
    ' */',
  ];
  const imp = [];
  for (const [spec, names] of [...externalImports, ...imports]) {
    const def = names.get('default');
    const ns = names.get('*');
    const named = [...names].filter(([k]) => k !== 'default' && k !== '*').map(([k, v]) => (k === v ? k : `${k} as ${v}`));
    if (ns) imp.push(`import * as ${ns} from ${JSON.stringify(spec)};`);
    if (def || named.length) imp.push(`import ${[def, named.length ? `{ ${named.join(', ')} }` : null].filter(Boolean).join(', ')} from ${JSON.stringify(spec)};`);
  }
  const ex = [...info.exportsPending];
  let text = [...head, ...imp, '', ...body, '', ex.length ? `export { ${ex.join(', ')} };` : ''].join('\n') + '\n';
  if (FORMAT) {
    try { text = await prettier.format(text, { parser: 'babel', printWidth: 110 }); } catch { formatFailures++; }
  }
  const dest = path.join(OUT, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
  info.exports = ex;
  delete info.lines;
  delete info.exportsPending;
  written++;
}
for (const r of resources) {
  const dest = path.join(OUT, 'assets', r);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(path.join('original', r))) fs.copyFileSync(path.join('original', r), dest);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log({ written, formatFailures, resources: resources.size, renameConflicts: conflicts });

function addImport(map, spec, imported, local) {
  let m = map.get(spec);
  if (!m) map.set(spec, (m = new Map()));
  m.set(imported, local);
}
function rel(from, to) {
  let r = path.posix.relative(path.posix.dirname(from), to);
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

// Emits the readable source tree from the restored modules, the segmentation
// and the final naming table.
//   node tools/emit/readable.mjs [--out build/readable] [--only <path-prefix>] [--no-format] [--no-deminify]
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
// Before formatting, every file goes through tools/emit/deminify.mjs: one local name per
// imported binding (the aliases several chunks brought in are merged), `!0` -> `true`,
// `void 0` -> `undefined`, shorthand properties, `typeof x > "u"`, statement-level sequences
// (also in return / throw / if tests / arrow bodies), statement-level && / || / ?: as ifs,
// one declarator per declaration (docs/process/deminify.md).
import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = opt('--out', 'reconstructed');
const ONLY = opt('--only', null);
const FORMAT = !argv.includes('--no-format');
const DEMINIFY = !argv.includes('--no-deminify');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

import { renameModule } from '../rename/lib/rename.mjs';
import { loadNaming, emptyModule } from '../rename/lib/naming.mjs';
import { planFromTree } from '../rename/lib/global.mjs';
import { deminifyCode, newStats, addStats } from './deminify.mjs';

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
// Domain members' documentation: per-declaration JSDoc and per-module summaries.
const declDocs = new Map();
const moduleDocs = new Map();
for (const f of fs.existsSync('naming') ? fs.readdirSync('naming') : []) {
  if (/^docs-.*\.jsonl$/.test(f)) for (const x of readJsonl(path.join('naming', f))) if (x.id && x.doc) declDocs.set(x.id, x.doc);
  if (/^modules-.*\.json$/.test(f)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join('naming', f), 'utf8')))) moduleDocs.set(k, v);
}
const docLines = (text) => String(text).split(/\r?\n/).map((l) => ' * ' + l.replaceAll('*/', '*\\/'));
const jsdoc = (text) => ['/**', ...docLines(text), ' */'].join('\n');
const refFileSet = new Set(JSON.parse(fs.readFileSync('analysis/reference/files.json', 'utf8')).map((f) => f.file));
const vendorPkgs = fs.existsSync('analysis/vendor/packages.json') ? JSON.parse(fs.readFileSync('analysis/vendor/packages.json', 'utf8')).packages : {};
// resource import kinds as Bun wrote them (text / file)
const resourceType = new Map();
for (const f of fs.readdirSync('original').filter((x) => /.js$/.test(x))) {
  const head = fs.readFileSync(path.join('original', f), 'utf8').slice(0, 4000);
  for (const m of head.matchAll(/from "\.\/([^"]+)" with \{ type: "(\w+)" \}/g)) resourceType.set(m[1], m[2]);
}
const symbols = []; // {name, file, line, id, source, kind, doc?}
function vendorLine(from) {
  const pk = Object.keys(vendorPkgs).filter((k) => from === k || from.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0];
  const v = pk && vendorPkgs[pk];
  return ` * third-party: ${pk ?? from}${v?.version ? '@' + v.version : ''}${v?.kind && v.kind !== 'npm' ? ' (' + v.kind + ')' : ''}`;
}
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const byId = new Map(D.map((d) => [idOf(d), d]));
// `var v; … var v;` re-declarations share an id ("file#v"); a module's decl
// list then repeats the id, and the n-th occurrence means the n-th declaration.
const byIdAll = new Map();
for (const d of D) { const k = idOf(d); if (!byIdAll.has(k)) byIdAll.set(k, []); byIdAll.get(k).push(d); }
function declsOf(ids) {
  const seen = new Map();
  return ids.map((id) => { const n = seen.get(id) ?? 0; seen.set(id, n + 1); const all = byIdAll.get(id); return all[Math.min(n, all.length - 1)]; });
}
const declByLocal = new Map();
const declAt = new Map(D.map((d) => [d.file + ':' + d.start, d]));
const declsByFile = new Map();
for (const d of D) {
  for (const n of d.names) declByLocal.set(`${d.file}#${n}`, d);
  let a = declsByFile.get(d.file);
  if (!a) declsByFile.set(d.file, (a = []));
  a.push(d);
}

// binding lookup per chunk: minified name -> {off, rec}
const topByMin = new Map(); // file -> Map(min -> {off, rec})
// A chunk can import the same name twice (`import{randomUUID as Ge}from"crypto"`
// … `import{randomUUID as Pt}from"crypto"`); use edges only say "crypto|randomUUID",
// so every alias is kept and all of them are imported.
const importByKey = new Map(); // file -> Map("from|imported" -> [{off, rec}])
for (const [file, recs] of Object.entries(top)) {
  const a = new Map(), b = new Map();
  for (const [k, r] of Object.entries(recs)) {
    if (r.kind === 'import') {
      const key = `${r.from}|${r.imported}`;
      if (!b.has(key)) b.set(key, []);
      b.get(key).push({ off: +k.slice(1), rec: r });
    } else a.set(r.min, { off: +k.slice(1), rec: r });
  }
  topByMin.set(file, a);
  importByKey.set(file, b);
}

// output path of a reconstructed module
function outPath(p, kind) {
  // vendor files keep their package path; non-JS ones (bundled package.json /
  // schema .json wrapped in a CommonJS factory) get ".js" appended
  if (kind === 'vendor') return path.posix.join('vendor', /\.[cm]?js$/.test(p) ? p : p + '.js');
  if (kind === 'runtime') return 'runtime/bun-runtime.js';
  return path.posix.join('src', p.replace(/\.(tsx?|jsx|mjs)$/, '.js'));
}

// ---------- rename every chunk ----------
const wanted = Object.entries(segMods).filter(([p]) => !ONLY || p.startsWith(ONLY));
// Imports of contributing chunks name bindings of other chunks, so every chunk
// is renamed (the engine's final names are the single source of truth).
const naming = loadNaming('naming/final');
console.time('[emit] global plan');
const { plan } = planFromTree('original', naming.modules);
console.timeEnd('[emit] global plan');
const chunkFiles = fs.readdirSync('original').filter((f) => /\.m?js$/.test(f) && !/\.min\.js$/.test(f));
const overrides = new Map(); // chunk -> Map(binding offset -> name), module-level dedupe
const renamed = new Map(); // chunk -> {code, offsetMap, fm}
let conflicts = 0;
function renameChunk(file) {
  const source = fs.readFileSync(path.join('original', file), 'utf8');
  let entry = naming.modules.get(file) ?? emptyModule();
  const ov = overrides.get(file);
  if (ov) {
    entry = { top: entry.top, locals: new Map(entry.locals), exports: entry.exports };
    for (const [off, name] of ov) entry.locals.set(off, { name, source: 'emit', confidence: 9, note: 'module-level dedupe', from: 'emit' });
  }
  const r = renameModule(file, source, entry, plan);
  const fm = new Map();
  for (const x of r.renamed) if (x.key?.startsWith('@')) fm.set(+x.key.slice(1), x.to);
  renamed.set(file, { code: r.code, offsetMap: r.offsetMap, fm, conflicts: r.conflicts.length });
}
for (const f of chunkFiles) renameChunk(f);
// final top-level / import names, as the engine applied them
function patchNames() {
  for (const [file, recs] of Object.entries(top)) {
    const fm = renamed.get(file)?.fm;
    if (!fm) continue;
    for (const [k, r] of Object.entries(recs)) r.name = fm.get(+k.slice(1)) ?? r.min;
  }
}

// ---------- output modules (x.ts and x.tsx collapse to x.js) ----------
const outputs = new Map(); // out file -> {from, kind, decls[], chunks{}, methods{}}
for (const [p, m] of wanted) {
  const file = outPath(p, m.kind);
  const o = outputs.get(file);
  if (!o) { outputs.set(file, { from: p, kind: m.kind, decls: [...m.decls], chunks: { ...m.chunks }, methods: { ...m.methods } }); continue; }
  o.decls.push(...m.decls);
  for (const [c, n] of Object.entries(m.chunks)) o.chunks[c] = (o.chunks[c] ?? 0) + n;
  for (const [k, n] of Object.entries(m.methods)) o.methods[k] = (o.methods[k] ?? 0) + n;
}
const pathOfDecl = (id) => { const x = declPath.get(id); return x ? outPath(x.path, x.kind) : null; };

// Bindings visible at the top of an output module. Each has an identity key
// (two entries with the same key are the same thing and may share a name) and
// says where it can be renamed (chunk + binding offset), if anywhere.
function moduleBindings(file, o) {
  const out = [];
  const seen = new Set();
  const add = (e) => { const k = e.key + '|' + e.name; if (!seen.has(k)) { seen.add(k); out.push(e); } };
  for (const d of declsOf(o.decls)) {
    const id = idOf(d);
    for (const n of d.names) {
      const t = topByMin.get(d.file)?.get(n);
      if (t) add({ name: t.rec.name, key: d.file + '@' + t.off, chunk: d.file, off: t.off, prio: 0 });
    }
    for (const r of d.refs) {
      if (r.startsWith('=')) {
        const t = topByMin.get(d.file)?.get(r.slice(1));
        const tDecl = declByLocal.get(d.file + '#' + r.slice(1));
        if (!t || !tDecl || pathOfDecl(idOf(tDecl)) === file) continue;
        // imported under its own name; renamable only at its definition
        add({ name: t.rec.name, key: d.file + '@' + t.off, chunk: d.file, off: t.off, prio: 1 });
        continue;
      }
      const bar = r.indexOf('|');
      const locals = importByKey.get(d.file)?.get(r.slice(0, bar) + '|' + r.slice(bar + 1));
      if (!locals) continue;
      const tgt = resolveExport(r.slice(0, bar), r.slice(bar + 1));
      if (!tgt) continue;
      for (const local of locals) {
        let key;
        if (tgt.ext) key = 'ext:' + tgt.ext + '|' + tgt.imported;
        else {
          key = tgt.chunk + '@' + tgt.off;
          if (pathOfDecl(idOf(tgt.decl)) === file && local.rec.name === tgt.name) continue;
        }
        add({ name: local.rec.name, key, chunk: d.file, off: local.off, prio: 2 });
      }
    }
  }
  return out;
}
// Follows chunk re-exports (`import {x as y} from "./chunk-b.js"` / from "crypto",
// then `export {y}`) to the declaring chunk or the external module.
const importByMin = new Map(); // chunk -> Map(local min name -> import record)
for (const [file, recs] of Object.entries(top)) {
  const m = new Map();
  for (const r of Object.values(recs)) if (r.kind === 'import') m.set(r.min, r);
  importByMin.set(file, m);
}
function resolveExport(from, imported, depth = 0) {
  if (!/^chunk-|^cli\.js$/.test(from)) return { ext: from, imported };
  if (depth > 8) return null;
  const tLocal = exportsOf.get(from)?.[imported];
  if (!tLocal) return null;
  const tDecl = declByLocal.get(from + '#' + tLocal);
  const tt = topByMin.get(from)?.get(tLocal);
  if (tDecl && tt) return { chunk: from, off: tt.off, decl: tDecl, name: tt.rec.name };
  const im = importByMin.get(from)?.get(tLocal);
  return im ? resolveExport(im.from, im.imported, depth + 1) : null;
}
const ALLOWED_DUP_KEYS = /^ext:/;
for (let round = 0; round < 8; round++) {
  patchNames();
  const touched = new Set();
  let clashes = 0;
  for (const [file, o] of outputs) {
    const byName = new Map();
    for (const e of moduleBindings(file, o)) {
      let a = byName.get(e.name);
      if (!a) byName.set(e.name, (a = []));
      a.push(e);
    }
    const used = new Set(byName.keys());
    for (const [name, list] of byName) {
      const keys = [...new Set(list.map((e) => e.key))];
      if (keys.length < 2) continue;
      // keep the first identity (definitions in this module first), rename the rest
      list.sort((x, y) => x.prio - y.prio || (x.key < y.key ? -1 : 1));
      const keep = list[0].key;
      for (const k of keys) {
        if (k === keep || (ALLOWED_DUP_KEYS.test(k) && ALLOWED_DUP_KEYS.test(keep) && false)) continue;
        const e = list.find((x) => x.key === k);
        let n = 2, cand;
        do cand = name + '_' + n++; while (used.has(cand));
        used.add(cand);
        let ov = overrides.get(e.chunk);
        if (!ov) overrides.set(e.chunk, (ov = new Map()));
        ov.set(e.off, cand);
        touched.add(e.chunk);
        clashes++;
      }
    }
  }
  console.log('[emit] dedupe round', round, 'clashes', clashes, 'chunks', touched.size);
  if (!touched.size) break;
  for (const f of touched) renameChunk(f);
}
patchNames();
const declText = new Map();
for (const d of D) {
  const r = renamed.get(d.file);
  if (r) declText.set(d, r.code.slice(r.offsetMap(d.start), r.offsetMap(d.end)));
}
for (const r of renamed.values()) conflicts += r.conflicts;

// ---------- assemble ----------
const manifest = {};
const resources = new Set();
for (const [file, o] of outputs) {
  const imports = new Map(); // module specifier -> Map("imported\0local" -> [imported, local])
  const externalImports = new Map();
  const body = [];
  const aliasLines = new Set();
  for (const d of declsOf(o.decls)) {
    const id = idOf(d);
    for (const r of d.refs) {
      if (r.startsWith('=')) {
        const t = topByMin.get(d.file)?.get(r.slice(1));
        const tDecl = declByLocal.get(d.file + '#' + r.slice(1));
        if (!t || !tDecl) continue;
        const tp = pathOfDecl(idOf(tDecl));
        if (tp && tp !== file) addImport(imports, rel(file, tp), t.rec.name, t.rec.name);
        continue;
      }
      const bar = r.indexOf('|');
      const from0 = r.slice(0, bar), imported0 = r.slice(bar + 1);
      const tgt = resolveExport(from0, imported0);
      if (!tgt) continue;
      for (const local of importByKey.get(d.file)?.get(from0 + '|' + imported0) ?? [{ rec: { name: imported0 } }]) {
        const alias = local.rec.name;
        if (tgt.ext) {
          const from = tgt.ext, imported = tgt.imported;
          if (/^__cc_resource_/.test(alias) || /\.(txt|md|json|node|woff2|asset|html|mjs|js|zst)$/.test(from)) { resources.add(from); addImport(externalImports, rel(file, 'assets/' + from), imported, alias, true); continue; }
          addImport(externalImports, from, imported, alias);
          continue;
        }
        const tName = tgt.name;
        const tp = pathOfDecl(idOf(tgt.decl));
        if (!tp) continue;
        if (tp === file) { if (alias !== tName) aliasLines.add('const ' + alias + ' = ' + tName + '; //@ cross-chunk alias'); continue; }
        addImport(imports, rel(file, tp), tName, alias);
      }
    }
    const dp = declPath.get(id);
    const mm = match.get(id);
    if (declDocs.has(id)) body.push(jsdoc(declDocs.get(id)));
    body.push('//@ ' + d.file + ':' + d.start + '-' + d.end + ' ' + (dp?.method ?? '') + (mm ? ' = ' + mm.refName + (mm.score !== undefined ? ' (' + mm.score + ')' : '') : ''));
    body.push(declText.get(d) ?? '/* missing */');
  }
  body.push(...aliasLines);
  manifest[file] = { from: o.from, kind: o.kind, decls: o.decls, chunks: o.chunks, methods: o.methods, imports: [...imports.keys()] };
  manifest[file].exportsPending = new Set();
  manifest[file].lines = { imports, externalImports, body };
}
// exports: every name another module imports
for (const [file, info] of Object.entries(manifest)) {
  for (const [spec, names] of info.lines.imports) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
    if (manifest[target]) for (const [imported] of names.values()) manifest[target].exportsPending.add(imported);
  }
}
let written = 0, formatFailures = 0, deminifyFailures = 0;
const deminifyStats = newStats();
for (const [file, info] of Object.entries(manifest)) {
  const { imports, externalImports, body } = info.lines;
  const head = [
    '/**',
    ` * ${info.from}`,
    ...(moduleDocs.has(info.from) ? [' *', ...docLines(moduleDocs.get(info.from)), ' *'] : []),
    ` * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).`,
    info.kind === 'first-party'
      ? (refFileSet.has(info.from) ? ` * 2.1.88 counterpart: references/claude-code-analysis/src/${info.from}` : ' * new in 2.1.316 (2.1.88 has no file at this path)')
      : info.kind === 'vendor' ? vendorLine(info.from) : ` * kind: ${info.kind}`,
    ` * pieces: ${Object.entries(info.chunks).map(([c, n]) => `${c} (${n})`).join(', ')}`,
    ` * attribution: ${Object.entries(info.methods).map(([k, n]) => `${k} ${n}`).join(', ')}`,
    ' */',
  ];
  const imp = [];
  for (const [spec, names] of [...externalImports, ...imports]) {
    const pairs = [...names.values()];
    const resource = pairs.some((x) => x[2]);
    const attr = resource ? ' with { type: "' + (resourceType.get(spec.replace(/^.*assets\//, '')) ?? 'file') + '" }' : '';
    for (const [, local] of pairs.filter(([k]) => k === '*')) imp.push('import * as ' + local + ' from ' + JSON.stringify(spec) + ';');
    const defs = pairs.filter(([k]) => k === 'default').map(([, l]) => l);
    const named = pairs.filter(([k]) => k !== 'default' && k !== '*').map(([k, v]) => (k === v ? k : k + ' as ' + v));
    // one default per statement; extra default aliases become named "default as x"
    const extraDefaults = defs.slice(1).map((l) => 'default as ' + l);
    const all = [...named, ...extraDefaults];
    if (defs.length || all.length) imp.push('import ' + [defs[0], all.length ? '{ ' + all.join(', ') + ' }' : null].filter(Boolean).join(', ') + ' from ' + JSON.stringify(spec) + attr + ';');
  }
  const ex = [...info.exportsPending];
  let text = [...head, ...imp, '', ...body, '', ex.length ? `export { ${ex.join(', ')} };` : ''].join('\n') + '\n';
  if (DEMINIFY) {
    const dm = deminifyCode(text, { unify: true, crossChunkAlias: true });
    if (dm.error) { deminifyFailures++; console.warn('[emit] deminify skipped', file, dm.error); }
    else text = dm.code;
    addStats(deminifyStats, dm.stats);
  }
  if (FORMAT) {
    try { text = await prettier.format(text, { parser: 'babel', printWidth: 110 }); } catch { formatFailures++; }
  }
  const dest = path.join(OUT, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
  // symbol index: the provenance marker precedes each declaration; a declaration of several
  // names (split into one statement per name by deminify) points each name at its own line
  const lines = text.split(/\r?\n/);
  const escRe = (s) => s.replace(/[$]/g, '\\$&');
  lines.forEach((ln, i) => {
    const mk = /^\/\/@ (\S+?):(\d+)-\d+ /.exec(ln);
    const d = mk && declAt.get(mk[1] + ':' + mk[2]);
    if (!d) return;
    d.names.forEach((n, k) => {
      const t = topByMin.get(d.file)?.get(n);
      const name = t?.rec.name ?? n;
      let line = i + 2;
      if (d.names.length > 1) {
        const re = new RegExp('^\\s*(?:export\\s+)?(?:var|let|const|class|(?:async\\s+)?function\\*?)\\s+' + escRe(name) + '(?![\\w$])');
        for (let j = i + 1; j < lines.length && !lines[j].startsWith('//@ '); j++) if (re.test(lines[j])) { line = j + 1; break; }
      }
      const rec = { name, file, line, id: idOf(d), source: t?.rec.source ?? 'minified', kind: info.kind };
      if (k === 0 && declDocs.has(idOf(d))) rec.doc = declDocs.get(idOf(d));
      symbols.push(rec);
    });
  });
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
fs.writeFileSync(path.join(OUT, 'symbols.jsonl'), symbols.map((x) => JSON.stringify(x)).join('\n') + '\n');
console.log({ written, formatFailures, deminifyFailures, resources: resources.size, renameConflicts: conflicts });
if (DEMINIFY) console.log('[emit] deminify', JSON.stringify(deminifyStats));

function addImport(map, spec, imported, local, resource = false) {
  let m = map.get(spec);
  if (!m) map.set(spec, (m = new Map()));
  m.set(imported + '\0' + local, [imported, local, resource]);
}
function rel(from, to) {
  let r = path.posix.relative(path.posix.dirname(from), to);
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

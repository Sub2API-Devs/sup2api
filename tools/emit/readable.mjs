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
//          <out>/**/*.lazy.js   units loaded by import() / require() whose names span several modules
//          <out>/src/plugins/functionHooks/hooks-worker/hooks-worker.js  the hooks worker (second program)
//          <out>/runtime/deferred-init.js  load-time work of import cycles, in the official order
//          <out>/package.json, build.mjs (= tools/build/build.mjs), .gitignore   the tree builds with
//                               Bun 1.4.4 into <out>/dist (`npm run build`, `npm start -- <args>`)
//
// The tree is also a program (docs/process/buildable.md): dynamic loads point at the reading tree's
// modules; a declaration lives with the statements that assign it (writes.mjs); a module's statements
// follow the official chunk order (load-order.mjs); statements of an import cycle that would run
// code of the cycle while it loads wait for the cycle (init-deps.mjs, eval-order.mjs, defer.mjs).
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
import { parseModule } from '../rename/lib/parse.mjs';
import { analyze } from '../rename/lib/scope.mjs';
import { chunkWrites } from './writes.mjs';
import { chunkInitFacts } from './init-deps.mjs';
import { chunkEvalOrder } from './load-order.mjs';
import { planEvaluation } from './eval-order.mjs';
import { deferStatement } from './defer.mjs';

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
// statements that assign a module-level binding declared by another statement of the same chunk (writes.mjs)
const chunkWriteFacts = new Map(); // chunk -> [{name, kind, declStart, writerStarts}]
// what each statement reads while it loads / what its functions read (init-deps.mjs)
const chunkInit = new Map(); // chunk -> Map(statement start -> {init, body})
// chunks of the Bun runtime helpers (__esm / __commonJS / __export …): their function arguments run later
const runtimeChunks = new Set(Object.values(segMods).filter((m) => m.kind === 'runtime').flatMap((m) => Object.keys(m.chunks)));
function renameChunk(file, first = false) {
  const source = fs.readFileSync(path.join('original', file), 'utf8');
  let entry = naming.modules.get(file) ?? emptyModule();
  const ov = overrides.get(file);
  if (ov) {
    entry = { top: entry.top, locals: new Map(entry.locals), exports: entry.exports };
    for (const [off, name] of ov) entry.locals.set(off, { name, source: 'emit', confidence: 9, note: 'module-level dedupe', from: 'emit' });
  }
  let opts = {};
  if (first) {
    const ast = parseModule(source);
    const analysis = analyze(ast, source);
    chunkWriteFacts.set(file, chunkWrites(ast, analysis, declsByFile.get(file) ?? []));
    chunkInit.set(file, chunkInitFacts(ast, analysis, declsByFile.get(file) ?? [], { isRuntimeSource: (src) => runtimeChunks.has(path.posix.normalize(path.posix.join(path.posix.dirname(file), src))) }));
    opts = { ast, analysis };
  }
  const r = renameModule(file, source, entry, plan, opts);
  const fm = new Map();
  for (const x of r.renamed) if (x.key?.startsWith('@')) fm.set(+x.key.slice(1), x.to);
  renamed.set(file, { code: r.code, offsetMap: r.offsetMap, fm, conflicts: r.conflicts.length });
}
for (const f of chunkFiles) renameChunk(f, true);
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

// Assignments across modules. An ES module cannot assign an imported binding, and Bun never
// splits a binding from the statements that assign it (they always share a chunk), but the
// placement may put `var y;` in one module and `function f() { y = 1 }` in another. A
// declaration and its writers form a group (union over shared bindings, always within one
// chunk); a group spread over several modules is gathered into the module that already holds
// most of its bytes, each moved statement among that module's statements of the same chunk at
// its chunk position, so the relative order of the chunk's statements is kept
// (docs/process/buildable.md, "assignments across modules").
const writeMoves = { groups: 0, moved: 0, skipped: [] };
{
  const idCount = new Map();
  for (const o of outputs.values()) for (const id of o.decls) idCount.set(id, (idCount.get(id) ?? 0) + 1);
  for (const [chunk, ws] of chunkWriteFacts) {
    const parent = new Map();
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const add = (x) => { if (!parent.has(x)) parent.set(x, x); };
    for (const w of ws) {
      add(w.declStart);
      for (const s of w.writerStarts) { add(s); parent.set(find(s), find(w.declStart)); }
    }
    const groups = new Map();
    for (const x of parent.keys()) { const r = find(x); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(declAt.get(chunk + ':' + x)); }
    for (const members of groups.values()) {
      if (members.some((d) => !d)) continue;
      const bytesBy = new Map();
      for (const d of members) { const p = pathOfDecl(idOf(d)); bytesBy.set(p, (bytesBy.get(p) ?? 0) + (d.end - d.start)); }
      if (bytesBy.size < 2) continue;
      writeMoves.groups++;
      if (members.some((d) => (byIdAll.get(idOf(d))?.length ?? 1) > 1 || idCount.get(idOf(d)) !== 1) || [...bytesBy.keys()].some((p) => !p)) {
        writeMoves.skipped.push(`${chunk}@${members[0].start}`);
        continue;
      }
      const target = [...bytesBy].sort((a, b) => b[1] - a[1])[0][0];
      const to = outputs.get(target);
      for (const v of members.sort((a, b) => a.start - b.start)) {
        const vid = idOf(v), vp = pathOfDecl(vid);
        if (vp === target) continue;
        const from = outputs.get(vp);
        from.decls.splice(from.decls.indexOf(vid), 1);
        const sameChunk = declsOf(to.decls).map((d, i) => [d, i]).filter(([d]) => d.file === chunk);
        const after = sameChunk.find(([d]) => d.start > v.start);
        const at = after ? after[1] : sameChunk.length ? sameChunk[sameChunk.length - 1][1] + 1 : to.decls.length;
        to.decls.splice(at, 0, vid);
        from.chunks[chunk]--;
        if (!from.chunks[chunk]) delete from.chunks[chunk];
        to.chunks[chunk] = (to.chunks[chunk] ?? 0) + 1;
        const old = declPath.get(vid);
        declPath.set(vid, { ...old, path: to.from, kind: to.kind, method: `${old?.method ?? ''} (moved: shares a binding it assigns)` });
        writeMoves.moved++;
      }
    }
  }
}
console.log('[emit] assignments across modules', JSON.stringify({ ...writeMoves, skipped: writeMoves.skipped.length, skippedSample: writeMoves.skipped.slice(0, 5) }));

// Order inside a module. A module gathers the statements of one source file from several chunks;
// each chunk's statements keep their order, and the chunks follow the order the original evaluates
// them (a chunk after the chunks it imports), so a statement never comes before one of its own
// chunk or of an imported chunk that it may need (docs/process/buildable.md, "evaluation order").
const chunkImports = new Map();
const DYN_RE = /\b(?:import|require)\(\s*"(\.{1,2}\/[^"]+)"\s*\)/g;
for (const m of scanMods) {
  const stat = (m.imports ?? []).filter((i) => i.from.startsWith('.')).map((i) => path.posix.normalize(path.posix.join(path.posix.dirname(m.file), i.from)));
  const dyn = [], atLoad = [];
  if (/\.m?js$/.test(m.file) && fs.existsSync(path.join('original', m.file))) {
    const src = fs.readFileSync(path.join('original', m.file), 'utf8');
    const targetsIn = (text, out) => { for (const x of text.matchAll(DYN_RE)) { const t = path.posix.normalize(path.posix.join(path.posix.dirname(m.file), x[1])); if (!out.includes(t)) out.push(t); } };
    targetsIn(src, dyn);
    // loads made while the chunk itself is evaluated: by a statement, or by a function of the chunk
    // that a statement calls (one level); these chunks are evaluated in the middle of this one
    const facts = chunkInit.get(m.file);
    for (const d of declsByFile.get(m.file) ?? []) {
      const f = facts?.get(d.start);
      if (!f) continue;
      if (f.loads) targetsIn(src.slice(d.start, d.end), atLoad);
      for (const r of f.init) {
        if (r.local === undefined) continue;
        const g = facts.get(r.local);
        const gd = declAt.get(m.file + ':' + r.local);
        if (g?.bodyLoads && gd) targetsIn(src.slice(gd.start, gd.end), atLoad);
      }
    }
  }
  chunkImports.set(m.file, { static: [...new Set(stat)], atLoad, dynamic: dyn });
}
const chunkOrder = chunkEvalOrder(chunkImports, 'cli.js');
const chunkRank = new Map(chunkOrder.map((c, i) => [c, i]));
let reordered = 0;
for (const o of outputs.values()) {
  const ds = declsOf(o.decls);
  const sorted = [...ds].sort((a, b) => (chunkRank.get(a.file) ?? 1e9) - (chunkRank.get(b.file) ?? 1e9) || a.start - b.start);
  if (sorted.some((d, i) => d !== ds[i])) reordered++;
  o.decls = sorted.map(idOf);
}
console.log('[emit] modules whose statements were put in chunk order', reordered);

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

// ---------- dynamic loads: import("./chunk-x.js") / require("./chunk-x.js") ----------
// The original loads almost all code on demand through chunk files (the static closure
// of cli.js is 8 chunks / 53 declarations). A loaded chunk's export list is the source
// module's export list (the facade names), so a load is pointed at the output module
// that declares all of those names; when they are spread over several output modules (or
// a name is taken), at a generated re-export module `<name>.lazy.js` next to them.
// docs/process/buildable.md, section "dynamic loads".
const defaultDeclOf = new Map(); // chunk -> its `export default …` statement
for (const d of D) if (!d.names.length && /^export\s+default\b/.test(declText.get(d) ?? '')) defaultDeclOf.set(d.file, d);
const facadeInfo = fs.existsSync('analysis/facades/facades.json') ? JSON.parse(fs.readFileSync('analysis/facades/facades.json', 'utf8')) : {};
const dynTargets = new Map(); // chunk -> {file, reexports: Map(spec -> [[local, exported]]) | null, pairs: [[file, local, exported]]}
const lazyFiles = new Map(); // generated re-export module -> target record
const dynStats = { loads: 0, targets: 0, direct: 0, lazyModules: 0, unresolved: [] };
function dynamicTarget(chunk) {
  if (dynTargets.has(chunk)) return dynTargets.get(chunk);
  const pairs = []; // [output file, local name, exported name] or [ext, imported, exported, true]
  for (const [name, local] of Object.entries(exportsOf.get(chunk) ?? {})) {
    if (name === 'default' && local === '(expression)') {
      const dd = defaultDeclOf.get(chunk);
      const f = dd && pathOfDecl(idOf(dd));
      if (f) pairs.push([f, 'default', 'default']);
      else dynStats.unresolved.push(chunk + '|default');
      continue;
    }
    const t = resolveExport(chunk, name);
    if (!t) { dynStats.unresolved.push(chunk + '|' + name); continue; }
    if (t.ext) { pairs.push([t.ext, t.imported, name, true]); continue; }
    const f = pathOfDecl(idOf(t.decl));
    if (!f) { dynStats.unresolved.push(chunk + '|' + name); continue; }
    pairs.push([f, t.name, name]);
  }
  const files = [...new Set(pairs.map((p) => p[0]))];
  let rec;
  if (files.length === 1 && !pairs[0][3] && pairs.every((p) => p[1] === p[2])) {
    rec = { file: files[0], pairs, lazy: false };
    dynStats.direct++;
  } else if (!pairs.length) {
    // nothing exported: the load only evaluates code. A chunk with statements of its own is
    // pointed at the module holding most of them; a chunk of bare `import "./chunk-…"` lines
    // gets a generated module importing, in the same order, the modules holding those chunks' statements.
    const counts = new Map();
    for (const d of declsByFile.get(chunk) ?? []) { const f = pathOfDecl(idOf(d)); if (f) counts.set(f, (counts.get(f) ?? 0) + 1); }
    const best = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) rec = { file: best, pairs, lazy: false };
    else {
      const src = fs.readFileSync(path.join('original', chunk), 'utf8');
      const sideEffects = [];
      for (const m of src.matchAll(/import\s*(?:[^"'();]*?from\s*)?"(\.[^"]+)"/g)) {
        const c = path.posix.normalize(path.posix.join(path.posix.dirname(chunk), m[1]));
        for (const d of declsByFile.get(c) ?? []) { const f = pathOfDecl(idOf(d)); if (f && !sideEffects.includes(f)) sideEffects.push(f); }
      }
      const base = path.posix.join(path.posix.dirname(sideEffects[0] ?? 'src/x'), chunk.replace(/\.js$/, ''));
      rec = { file: base + '.lazy.js', pairs, lazy: true, chunk, sideEffects };
      lazyFiles.set(rec.file, rec);
      dynStats.lazyModules++;
    }
  } else {
    // a facade path is used only when it is a real place; new-in-316 facades carry a
    // `_new/<name>.ts` placeholder, so their lazy module goes next to the code it re-exports
    const fp0 = facadeInfo[chunk]?.path;
    const fp = fp0 && !/(^|\/)_(new|unattributed|misplaced)\//.test(fp0) ? fp0 : null;
    const own = pairs.find((p) => !p[3]);
    const base = fp ? outPath(fp, 'first-party').replace(/\.js$/, '') : path.posix.join(own ? path.posix.dirname(own[0]) : 'src', (own ?? pairs[0])[2]);
    let lf = base + '.lazy.js', n = 2;
    while (lazyFiles.has(lf)) lf = base + '_' + n++ + '.lazy.js';
    rec = { file: lf, pairs, lazy: true, chunk };
    lazyFiles.set(lf, rec);
    dynStats.lazyModules++;
  }
  dynTargets.set(chunk, rec);
  dynStats.targets++;
  return rec;
}
// rewrites the chunk specifiers of dynamic loads in a declaration's text
function rewriteDynamicLoads(text, chunkFile, outFile, count = true) {
  return text.replace(/\b(require|import)\(\s*"(\.{1,2}\/[^"]+)"\s*\)/g, (all, kind, spec) => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(chunkFile), spec));
    if (!/(^|\/)chunk-[a-z0-9]+\.js$/.test(target) && !exportsOf.has(target)) return all;
    const rec = dynamicTarget(target);
    if (!rec?.file) return all;
    if (count) dynStats.loads++;
    return kind + '(' + JSON.stringify(rel(outFile, rec.file)) + ')';
  });
}

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
    body.push('//@ ' + d.file + ':' + d.start + '-' + d.end + ' ' + (dp?.method ?? '') + (mm ? ' = ' + mm.refName + (mm.score !== undefined ? ' (' + mm.score + ')' : '') : ''));
    // the JSDoc sits directly above its declaration, under the provenance line
    if (declDocs.has(id)) body.push(jsdoc(declDocs.get(id)));
    // rendered after the evaluation plan (some statements' initialisation is deferred); the
    // dynamic loads are resolved now so that the plan knows every load target
    if (declText.has(d)) rewriteDynamicLoads(declText.get(d), d.file, file, false);
    body.push(declText.has(d) ? { decl: d } : '/* missing */');
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
// ---------- the function-hooks worker: a second program (a worker thread's entry) ----------
// original/src/plugins/functionHooks/hooks-worker/hooks-worker.js is started as a Worker by
// plugins/functionHooks/hooksWorker (HOOKS_WORKER_URL = import.meta.dir + "/./src/plugins/…"). It
// is not one of the scanned chunks; it is emitted as is, with its imports of chunk exports pointed at
// the modules that declare them. Its bare `import "./chunk-…"` lines are dropped: in the reading tree
// every module imports what it uses. (docs/process/buildable.md, "programs")
const WORKER = 'src/plugins/functionHooks/hooks-worker/hooks-worker.js';
const workerSrcPath = path.join('original', 'src/plugins/functionHooks/hooks-worker/hooks-worker.js');
const workerStats = { imports: 0, dropped: 0, unresolved: [] };
if (fs.existsSync(workerSrcPath) && !manifest[WORKER]) {
  const src = fs.readFileSync(workerSrcPath, 'utf8');
  const ast = parseModule(src);
  const imports = new Map(), externalImports = new Map();
  const cut = [];
  for (const n of ast.program.body) {
    if (n.type !== 'ImportDeclaration') continue;
    cut.push([n.start, n.end]);
    const from = n.source.value;
    if (!from.startsWith('.')) {
      for (const s of n.specifiers) addImport(externalImports, from, s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*', s.local.name);
      if (!n.specifiers.length) workerStats.unresolved.push('bare import of ' + from);
      continue;
    }
    const chunk = path.posix.normalize(path.posix.join('src/plugins/functionHooks/hooks-worker', from));
    if (!n.specifiers.length) { workerStats.dropped++; continue; }
    for (const s of n.specifiers) {
      const imported = s.imported.name ?? s.imported.value;
      const t = resolveExport(chunk, imported);
      if (!t) { workerStats.unresolved.push(chunk + '|' + imported); continue; }
      if (t.ext) { addImport(externalImports, t.ext, t.imported, s.local.name); continue; }
      const tp = pathOfDecl(idOf(t.decl));
      if (!tp || !manifest[tp]) { workerStats.unresolved.push(chunk + '|' + imported); continue; }
      addImport(imports, rel(WORKER, tp), t.name, s.local.name);
      manifest[tp].exportsPending.add(t.name);
      workerStats.imports++;
    }
  }
  let text = '', pos = 0;
  for (const [a, b] of cut) { text += src.slice(pos, a); pos = b; }
  text += src.slice(pos);
  text = text.replace(/^\s*\/\/ @bun @bytecode\n/, '').replace(/^\s*\/\/ \(c\) Anthropic PBC[^\n]*\n/m, '').replace(/^\s*\/\/ Version: [^\n]*\n/m, '');
  manifest[WORKER] = {
    from: 'plugins/functionHooks/hooks-worker/hooks-worker.js', kind: 'worker', decls: [], chunks: {}, methods: {}, imports: [],
    exportsPending: new Set(),
    lines: { imports, externalImports, body: ['//@ src/plugins/functionHooks/hooks-worker/hooks-worker.js (original, imports rewritten)', text.trim()] },
  };
  manifest[WORKER].imports = [...imports.keys()];
}
console.log('[emit] hooks worker', JSON.stringify({ ...workerStats, unresolved: workerStats.unresolved.slice(0, 5) }));

// ---------- evaluation plan (tools/emit/eval-order.mjs, docs/process/buildable.md "evaluation order") ----------
const ENTRY = 'src/entrypoints/cli.js';
const RUNTIME_INIT = 'runtime/deferred-init.js';
const loaderImports = (rec) => [...(rec.sideEffects ?? []), ...new Set(rec.pairs.filter((p) => !p[3]).map((p) => p[0]))];
function planModuleGraph() {
  const g = new Map();
  for (const [file, info] of Object.entries(manifest)) {
    const imps = [];
    for (const spec of info.lines.imports.keys()) { const t = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)); if (!imps.includes(t)) imps.push(t); }
    g.set(file, { decls: declsOf(info.decls), imports: imps });
  }
  for (const rec of new Set(dynTargets.values())) if (rec.lazy) g.set(rec.file, { decls: [], imports: loaderImports(rec) });
  return g;
}
const depsMemo = new Map();
function depsOf(d) {
  let r = depsMemo.get(d);
  if (r) return r;
  const f = chunkInit.get(d.file)?.get(d.start) ?? { init: [], body: [] };
  const res = (x) => {
    if (x.local !== undefined) return declAt.get(d.file + ':' + x.local) ?? null;
    const from = path.posix.normalize(path.posix.join(path.posix.dirname(d.file), x.from));
    const t = resolveExport(from, x.imported);
    return t && !t.ext ? t.decl : null;
  };
  r = { init: f.init.map((x) => ({ decl: res(x), active: !!x.active })).filter((x) => x.decl), loads: !!f.loads, calls: !!f.calls, declOnly: !!f.declOnly };
  depsMemo.set(d, r);
  return r;
}
const evalPlan = planEvaluation({
  modules: planModuleGraph(),
  entry: ENTRY,
  programs: manifest[WORKER] ? [WORKER] : [],
  loadTargets: [...new Set([...dynTargets.values()].map((r) => r.file).filter(Boolean))],
  depsOf,
  hoisted: (d) => d.kind === 'FunctionDeclaration',
  sameChunkLater: (d, t) => t.file === d.file && t.start > d.start,
  keyOf: (d) => [chunkRank.get(d.file) ?? 1e9, d.start],
});
console.log('[emit] evaluation plan', JSON.stringify(evalPlan.stats));
// deferred statements register with deferInit; the cycle's first module begins the group, its root
// (the last of the cycle to finish) runs it
{
  const deferredIn = new Set([...evalPlan.deferred].map((d) => pathOfDecl(idOf(d))));
  for (const f of deferredIn) if (manifest[f]) addImport(manifest[f].lines.imports, rel(f, RUNTIME_INIT), 'deferInit', 'deferInit');
  // A cycle is named by the module that closes it. A module can open or close different cycles in
  // different loads (the same modules entered from another side); it carries the calls for all of
  // them, and the runtime only acts on the cycle that is actually open (runtime/deferred-init.js).
  const opens = new Map(), closes = new Map(); // module -> Map(cycle name -> members)
  // A module is evaluated once per program, by the first load that reaches it: a module of the
  // startup load only ever has its startup role; a module only lazy loads reach carries the roles of
  // all of them. The worker thread is a program of its own: its cycles are named "worker:<module>".
  const startupSet = new Set(evalPlan.loads[0].modules);
  for (const c of evalPlan.cycles) {
    if (!c.deferred) continue;
    const worker = c.load === WORKER;
    const name = (worker ? 'worker:' : '') + c.root;
    for (const [m, f] of [[opens, c.first], [closes, c.root]]) {
      if (!worker && c.load !== ENTRY && startupSet.has(f)) continue;
      if (!m.has(f)) m.set(f, new Map());
      m.get(f).set(name, Math.max(m.get(f).get(name) ?? 0, c.members));
    }
  }
  for (const [f, cs] of opens) {
    if (!manifest[f]) continue;
    addImport(manifest[f].lines.imports, rel(f, RUNTIME_INIT), 'beginDeferredInits', 'beginDeferredInits');
    const lines = [];
    for (const [root, members] of cs) {
      const target = root.replace(/^worker:/, '');
      lines.push(
        `// This module is the first evaluated of an import cycle of ${members} modules closed by ${rel(f, target)}${root.startsWith('worker:') ? ' (in the hooks worker thread)' : ''};`,
        '// the load-time work of the cycle\'s statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).',
        `beginDeferredInits(${JSON.stringify(root)});`,
      );
    }
    manifest[f].lines.body.unshift(...lines);
  }
  for (const [f, cs] of closes) {
    if (!manifest[f]) continue;
    addImport(manifest[f].lines.imports, rel(f, RUNTIME_INIT), 'runDeferredInits', 'runDeferredInits');
    manifest[f].lines.body.push(
      '',
      `// The import cycle this module closes (${[...cs.values()][0]} modules) is complete: run the load-time work its statements`,
      '// marked "deferred" waited for, in the official build\'s order (runtime/deferred-init.js).',
      ...[...cs.keys()].map((name) => `runDeferredInits(${JSON.stringify(name)});`),
    );
  }
}

// exports needed by dynamic loads, and the generated re-export modules (`*.lazy.js`)
for (const rec of new Set(dynTargets.values())) {
  for (const [f, local, , ext] of rec.pairs) if (!ext && local !== 'default' && manifest[f]) manifest[f].exportsPending.add(local);
  if (!rec.lazy) continue;
  const bySpec = new Map();
  for (const [f, local, exported, ext] of rec.pairs) {
    const spec = ext ? f : rel(rec.file, f);
    if (!bySpec.has(spec)) bySpec.set(spec, []);
    bySpec.get(spec).push(local === '*' ? '*' + exported : local === exported ? local : local + ' as ' + exported);
  }
  const fp = facadeInfo[rec.chunk]?.path;
  const body = [
    ...(rec.sideEffects ?? []).map((f) => `import ${JSON.stringify(rel(rec.file, f))};`),
    ...[...bySpec].flatMap(([spec, names]) => [
      ...names.filter((n) => n.startsWith('*')).map((n) => `export * as ${n.slice(1)} from ${JSON.stringify(spec)};`),
      ...(names.some((n) => !n.startsWith('*')) ? [`export { ${names.filter((n) => !n.startsWith('*')).join(', ')} } from ${JSON.stringify(spec)};`] : []),
    ]),
  ];
  manifest[rec.file] = {
    from: fp ?? rec.file, kind: 'lazy', decls: [], chunks: { [rec.chunk]: 0 }, methods: {}, imports: [...bySpec.keys()],
    exportsPending: new Set(),
    lines: { imports: new Map(), externalImports: new Map(), body, lazyOf: rec.chunk },
  };
}
// a statement's text in its module: dynamic loads pointed at the reading tree, and its load-time
// work deferred when the evaluation plan says so (tools/emit/defer.mjs)
const deferStats = { deferred: 0, refused: [] };
function renderDecl(d, file) {
  const text = rewriteDynamicLoads(declText.get(d), d.file, file);
  if (!evalPlan.deferred.has(d)) return text;
  const r = deferStatement(text, d.file + ':' + d.start);
  if (r.error) { deferStats.refused.push(idOf(d) + ': ' + r.error); return text; }
  deferStats.deferred++;
  const t = evalPlan.reason.get(d);
  const isDecl = t && typeof t === 'object';
  const tName = isDecl ? (topByMin.get(t.file)?.get(t.names[0])?.rec.name ?? t.names[0] ?? `the statement at ${t.file}:${t.start}`) : '';
  const tFile = isDecl ? pathOfDecl(idOf(t)) : null;
  const note = isDecl
    ? `// deferred: uses ${tName}${tFile && tFile !== file ? ` (${rel(file, tFile)})` : ''} of its import cycle while loading; runs once the cycle is complete`
    : t === 'effects'
      ? '// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order'
      : '// deferred: loads other modules while loading; runs once its import cycle is complete';
  const lines = r.code.split('\n');
  if (r.names.length) lines[0] += ' ' + note;
  else lines.unshift(note);
  return lines.join('\n');
}
let written = 0, formatFailures = 0, deminifyFailures = 0;
const deminifyStats = newStats();
for (const [file, info] of Object.entries(manifest)) {
  const { imports, externalImports, body } = info.lines;
  const head = info.kind === 'worker' ? [
    '/**',
    ` * ${info.from}: the function-hooks worker (a worker thread's entry; a second program)`,
    ' * Reconstructed from the official Claude Code 2.1.316 build (linux-x64): the file of the same path in the',
    ' * build, unchanged except that its imports of chunk exports name the reading tree\'s modules (its own',
    ' * names are still the minified ones; it was not part of the scanned chunks). Started by',
    ' * plugins/functionHooks/hooksWorker.js; built as its own entry (build.mjs).',
    ' */',
  ] : info.kind === 'lazy' ? [
    '/**',
    ` * ${info.from}: lazily loaded unit`,
    ` * The original build loads this unit on demand (import() / require() of ${info.lines.lazyOf}); its export`,
    ' * list is that chunk\'s export list (the source module\'s names), whose declarations live in the modules below.',
    ' * Generated by tools/emit/readable.mjs (docs/process/buildable.md, "dynamic loads").',
    ' */',
  ] : [
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
  let text = [...head, ...imp, '', ...body.map((b) => (typeof b === 'string' ? b : renderDecl(b.decl, file))), '', ex.length ? `export { ${ex.join(', ')} };` : ''].join('\n') + '\n';
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
      let first = i + 1; // first line after the provenance line and its JSDoc
      if (lines[first]?.startsWith('/**')) { while (first < lines.length && !lines[first].includes('*/')) first++; first++; }
      let line = first + 1;
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
// load-time work that waits for its import cycle (tools/emit/eval-order.mjs): the order table and
// the three functions the reading tree uses
{
  const chunks = [...new Set([...evalPlan.deferred].map((d) => d.file))].sort((a, b) => (chunkRank.get(a) ?? 1e9) - (chunkRank.get(b) ?? 1e9));
  const helper = [
    '/**',
    ' * runtime/deferred-init.js — load-time work of import cycles, in the official build\'s order',
    ' *',
    ' * Not part of Claude Code 2.1.316: generated by tools/emit/readable.mjs so that the reading tree runs',
    ' * as ES modules (docs/process/buildable.md, "evaluation order").',
    ' *',
    ' * The official build evaluates a chunk\'s statements in order once every chunk it imports is evaluated.',
    ' * ES modules give the same guarantee to a module outside import cycles. A module inside a cycle may run',
    ' * while modules it reaches are not evaluated yet, so its statements that would run code of the cycle',
    ' * (or read a value of the cycle not evaluated yet, or load modules) wait: they keep their text and place,',
    ' * wrapped as `deferInit("<chunk>:<offset>", () => { … })`. A cycle is named by the module that closes',
    ' * it: its first module to be evaluated calls `beginDeferredInits(name)`, the closing module',
    ' * `runDeferredInits(name)`, which runs the statements registered in between, in the official order: by',
    ' * chunk in CHUNK_ORDER (a chunk after the chunks it imports), then by offset. Cycles nest like the',
    ' * evaluation does. A module may open or close different cycles in different loads (the same modules',
    ' * entered from another side) and carries the calls for each; only the cycle actually open is acted on.',
    ' * Work registered while no cycle is open runs at once (its module is not in a cycle in this load).',
    ' */',
    '',
    'import { isMainThread } from "worker_threads";',
    '',
    '// chunks that have deferred statements, in the order the official build evaluates them',
    'const CHUNK_ORDER = [',
    ...chunks.map((c) => `  ${JSON.stringify(c)},`),
    '];',
    'const RANK = new Map(CHUNK_ORDER.map((chunk, i) => [chunk, i]));',
    'const pending = [];',
    '// cycles of the hooks worker thread are named "worker:<module>"; the CLI cycles are named by the module alone',
    'const ofThisProgram = (name) => name.startsWith("worker:") !== isMainThread;',
    'const open = []; // cycles being evaluated: { name, start } (start: index into pending)',
    '',
    '/** The import cycle `name` starts: work registered from now on belongs to it. */',
    'export function beginDeferredInits(name) {',
    '  if (!ofThisProgram(name)) return;',
    '  open.push({ name, start: pending.length });',
    '}',
    '',
    '/** Registers the load-time work of the statement at `at` ("<chunk>:<offset>" in the official build). */',
    'export function deferInit(at, init) {',
    '  if (!open.length) return init();',
    '  const i = at.lastIndexOf(":");',
    '  pending.push({ rank: RANK.get(at.slice(0, i)) ?? CHUNK_ORDER.length, offset: Number(at.slice(i + 1)), init });',
    '}',
    '',
    '/** The import cycle `name` is complete: runs its registered work (and that of cycles opened inside it) in the official order. */',
    'export function runDeferredInits(name) {',
    '  if (!ofThisProgram(name)) return;',
    '  let i = open.length - 1;',
    '  while (i >= 0 && open[i].name !== name) i--;',
    '  if (i < 0) return; // this module does not close the cycle being evaluated now',
    '  const batch = pending.splice(open[i].start);',
    '  open.length = i;',
    '  batch.sort((a, b) => a.rank - b.rank || a.offset - b.offset);',
    '  for (const { init } of batch) init();',
    '}',
    '',
  ].join('\n');
  fs.mkdirSync(path.join(OUT, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(OUT, RUNTIME_INIT), helper);
  manifest[RUNTIME_INIT] = { from: RUNTIME_INIT, kind: 'build-support', decls: [], chunks: {}, methods: {}, imports: [], exports: ['beginDeferredInits', 'deferInit', 'runDeferredInits'] };
}
console.log('[emit] deferred load-time initialisation', JSON.stringify({ ...deferStats, refused: deferStats.refused.length, refusedSample: deferStats.refused.slice(0, 10) }));
// the tree builds on its own: package.json + build.mjs (tools/build/build.mjs); output in dist/
fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({
  name: 'claude-code-reconstructed',
  version: '2.1.316',
  private: true,
  type: 'module',
  description: 'Claude Code 2.1.316 reconstructed from the official build; builds with Bun 1.4.4 (docs/process/buildable.md)',
  scripts: {
    build: 'node build.mjs',
    start: 'node build.mjs run --',
  },
  engines: { bun: '1.4.4' },
}, null, 2) + '\n');
fs.copyFileSync('tools/build/build.mjs', path.join(OUT, 'build.mjs'));
// only the build output at the root: vendor packages have dist/ directories of their own
fs.writeFileSync(path.join(OUT, '.gitignore'), '/dist/\n');
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
fs.writeFileSync(path.join(OUT, 'symbols.jsonl'), symbols.map((x) => JSON.stringify(x)).join('\n') + '\n');
console.log({ written, formatFailures, deminifyFailures, resources: resources.size, renameConflicts: conflicts });
console.log('[emit] dynamic loads', JSON.stringify({ ...dynStats, unresolved: dynStats.unresolved.length, unresolvedSample: dynStats.unresolved.slice(0, 10) }));
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

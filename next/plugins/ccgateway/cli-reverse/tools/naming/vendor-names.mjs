// Names for third-party (npm) code in 2.1.316, taken back from the npm sources.
//   node --max-old-space-size=8000 tools/naming/vendor-names.mjs [analysis] [out=analysis/names/vendor.jsonl]
//   env VN_ONLY=chunk-a.js,chunk-b.js  only these chunks;  VN_DEBUG=<file.jsonl>  per-run alignment + rejections
//
// Inputs (tools/vendor, see docs/process/vendor.md):
//   analysis/vendor/decl-vendor.jsonl          which top-level declarations are npm code
//   analysis/vendor/index/orig-decls.jsonl     their declarator units (start/end, CommonJS wrapper or hoisted ESM)
//   analysis/vendor/index/unit-labels.jsonl    per unit: the npm file (fid = name@version/path)
//   analysis/vendor/index/packages.json        package dir under vendor-ref/node_modules for each name@version
//   analysis/vendor/packages.json, helpers.json  chosen versions; Bun __esm helper names per chunk
//   analysis/segments/decl-path.jsonl          vendor/<pkg>/<path> placements for units tools/vendor left unlabelled
//   vendor-ref/node_modules (+ .versions/)     the npm sources (read as text, parsed with Babel, never executed)
//
// Method (details, data and spot checks: docs/process/vendor-names.md):
//   - runs: a CommonJS wrapper `var X = x(function(e, m){ … })` is one run (its body
//     against the whole npm file); hoisted ESM units of the same npm file that are
//     consecutive in a chunk form one run. Wrapper variables are named
//     require_<file> (esbuild style), wrapper parameters cjsExports / cjsModule,
//     `var Y = __toESM(require_x())` import_<file>, Bun's `__esm` initialisers
//     init_<file>, `var A = B` / `A = B` (export default) B_default.
//   - npm file candidates (npmCandidates): the labelled file; another installed
//     version when this one lacks it; hashed bundle chunks with the same stem; the
//     unminified build next to a minified one, else minified siblings with source
//     maps; ESM builds next to a CommonJS one. The candidate with most aligned
//     informative tokens wins. Minified builds are used only through their source
//     map's names (lib/vendor-sourcemap.mjs).
//   - alignment: normalised token streams (lib/vendor-tokens.mjs), identifiers bound
//     to a binding are wildcards of four classes (plain / parameter / expression
//     name / function-or-class name); patience anchors + weighted LCS + snapping
//     (lib/vendor-align.mjs); poorly aligned units are re-aligned on their own.
//   - votes: every aligned wildcard pair whose 316 binding is declared in a run of
//     the same npm file. File-level 316 bindings pair only with file-level npm
//     bindings, and their declaration only with a declaration in the npm statement
//     the unit mostly aligned with.
//   - decision: ≥ 70 % of the votes for one name (60 % with ≥ 2 votes); the npm
//     binding's votes in that run point back at it (≥ 60 %); parameter-ness agrees;
//     a single vote needs a unit whose informative tokens aligned ≥ 80 % including a
//     specific one (string/regex ≥ 4 chars, property ≥ 5, unusual number); placement-
//     only files need unit quality ≥ 0.6; runs inside a much larger source-mapped
//     bundle need confidence ≥ 0.8.
//   - confidence: 0.95 × vote share × min(window quality, unit quality) ×
//     (0.6 + 0.4 × coverage) × 0.9 for a single occurrence × 0.9 for placement-only
//     files; < 0.5 is dropped.
// Output lines (format of analysis/names/reference.jsonl, plus npmAt = npm offset):
//   {file, key:"@<binding identifier offset>", min, name, source:"vendor", confidence, via, note, npmAt?}
//   via: top | param | local | cjs-wrapper | cjs-param | cjs-import | esm-init | default-alias | expr-name
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { parseModule } from '../rename/lib/parse.mjs';
import { analyze, OCC } from '../rename/lib/scope.mjs';
import { isValidBindingName } from '../rename/lib/names.mjs';
import { tokenize, intern, WILD, isInformative, isStrong } from './lib/vendor-tokens.mjs';
import { align } from './lib/vendor-align.mjs';
import { sourceMapNames } from './lib/vendor-sourcemap.mjs';

const A = process.argv[2] ?? 'analysis';
const outFile = process.argv[3] ?? path.join(A, 'names/vendor.jsonl');
const NM = 'vendor-ref/node_modules';
const IDX = path.join(A, 'vendor/index');
const DEBUG = process.env.VN_DEBUG ? fs.createWriteStream(process.env.VN_DEBUG) : null;

const eachLine = (p, f) => {
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(1 << 24);
  let rest = '';
  for (;;) {
    const n = fs.readSync(fd, buf, 0, buf.length, null);
    if (!n) break;
    const parts = (rest + buf.toString('utf8', 0, n)).split('\n');
    rest = parts.pop();
    for (const l of parts) if (l) f(l);
  }
  if (rest) f(rest);
  fs.closeSync(fd);
};
const readJsonl = (p) => { const a = []; eachLine(p, (l) => a.push(JSON.parse(l))); return a; };

// ---------- inputs ----------
const SPECIAL = new Set(['bun-runtime', 'private-unresolved', 'unresolved-cjs', 'bun-resource']);
const vendorDecls = new Map(readJsonl(path.join(A, 'vendor/decl-vendor.jsonl')).filter((d) => d.pkg && !SPECIAL.has(d.pkg)).map((d) => [d.id, d]));
const labels = new Map();
eachLine(path.join(IDX, 'unit-labels.jsonl'), (l) => {
  if (!l.includes('"fid"')) return;
  const u = JSON.parse(l);
  if (u.label?.fid && !SPECIAL.has(u.label.pkg)) labels.set(u.id, u.label);
});
const units = new Map(); // file -> [{declId, u, start, end, wrap, body, label, names}]
const pkgDirOf = new Map(); // name@version -> dir
for (const [dir, p] of Object.entries(JSON.parse(fs.readFileSync(path.join(IDX, 'packages.json'), 'utf8')))) {
  const k = `${p.name}@${p.version}`;
  if (!pkgDirOf.has(k) || dir.length < pkgDirOf.get(k).length) pkgDirOf.set(k, dir);
}
const splitFid = (fid) => { const i = fid.indexOf('/', fid.startsWith('@') ? fid.indexOf('/') + 1 : 0); return [fid.slice(0, i), fid.slice(i + 1)]; };
// Units tools/vendor left without a file but that the segmenter placed under
// vendor/<pkg>/<path> (analysis/segments/decl-path.jsonl): that npm file, in the
// version tools/vendor chose for the package (else the installed one).
const pkgVersion = new Map(Object.entries(JSON.parse(fs.readFileSync(path.join(A, 'vendor/packages.json'), 'utf8')).packages).map(([n, p]) => [n, [...(p.versionCandidates ?? []), p.version]]));
const placed = new Map(); // declId -> fid
eachLine(path.join(A, 'segments/decl-path.jsonl'), (l) => {
  if (!l.includes('"kind":"vendor"')) return;
  const d = JSON.parse(l);
  const m = /^((?:@[^/]+\/)?[^/]+)\/(.+)$/.exec(d.path);
  if (!m) return;
  let dir = null, nv = null;
  for (const v of [...(pkgVersion.get(m[1]) ?? [])].reverse()) if (pkgDirOf.has(`${m[1]}@${v}`)) { nv = `${m[1]}@${v}`; dir = pkgDirOf.get(nv); break; }
  if (!dir) {
    try { const v = JSON.parse(fs.readFileSync(path.join(NM, m[1], 'package.json'), 'utf8')).version; if (pkgDirOf.has(`${m[1]}@${v}`)) { nv = `${m[1]}@${v}`; dir = pkgDirOf.get(nv); } } catch {}
  }
  if (dir && fs.existsSync(path.join(NM, dir, m[2]))) placed.set(d.id, `${nv}/${m[2]}`);
});
eachLine(path.join(IDX, 'orig-decls.jsonl'), (l) => {
  const id = l.slice(7, l.indexOf('"', 7));
  if (!vendorDecls.has(id) && !placed.has(id)) return;
  const d = JSON.parse(l);
  for (const u of d.units) {
    let label = labels.get(`${d.id}~${u.u}`);
    if (!label && vendorDecls.has(d.id)) {
      // unit without its own label: the declaration's (or its part's) attribution
      const dv = vendorDecls.get(d.id);
      const part = dv.parts ? dv.parts.find((p) => p.u === u.u) : dv;
      if (part?.pkg && !SPECIAL.has(part.pkg) && part.pkgFile) {
        const vs = [...(part.versionCandidates ?? dv.versionCandidates ?? []), part.version].filter(Boolean).reverse();
        const v = vs.find((x) => pkgDirOf.has(`${part.pkg}@${x}`));
        if (v) label = { fid: `${part.pkg}@${v}/${part.pkgFile}`, pkg: part.pkg, path: part.pkgFile, method: 'decl', score: part.score ?? 0.5 };
      }
    }
    if (!label && placed.has(d.id)) {
      const fid = placed.get(d.id);
      label = { fid, pkg: splitFid(fid)[0].replace(/@[^@]+$/, ''), path: splitFid(fid)[1], method: 'placement', score: 0.8, placement: true };
    }
    if (!label) continue;
    let a = units.get(d.file);
    if (!a) units.set(d.file, (a = []));
    a.push({ declId: d.id, u: u.u, start: u.start, end: u.end, wrap: u.wrap, body: u.body ?? null, label, names: u.names });
  }
});

// ---------- npm side ----------
function parseNpm(src) {
  const base = { errorRecovery: true, allowReturnOutsideFunction: true, allowImportExportEverywhere: true, allowAwaitOutsideFunction: true, allowSuperOutsideMethod: true, allowUndeclaredExports: true };
  for (const opts of [{ sourceType: 'module' }, { sourceType: 'script' }, { sourceType: 'module', plugins: ['jsx'] }]) {
    try { return parse(src, { ...base, ...opts }); } catch {}
  }
  return null;
}
const npmCache = new Map();
const npmStats = { files: 0, sourceMapped: 0, minifiedSkipped: 0, unparsed: 0, missing: 0 };
// minified builds have long lines; source with short names (jsbn, bignumber.js) does not
function looksMinifiedFile(src) {
  if (src.length < 3000) return false;
  let lines = 1;
  for (let i = src.indexOf('\n'); i >= 0; i = src.indexOf('\n', i + 1)) lines++;
  return src.length / lines > 400;
}
function npmFile(fid) {
  if (npmCache.has(fid)) return npmCache.get(fid);
  if (npmCache.size > 400) npmCache.delete(npmCache.keys().next().value);
  const r = loadNpm(fid);
  npmCache.set(fid, r);
  return r;
}
// npm bindings of minified builds get their original name from the source map
// (REAL: binding -> name, or null when the map has none for it)
const REAL = new WeakMap();
const npmName = (bn) => (REAL.has(bn) ? REAL.get(bn) : bn.name);
// one npm file, parsed and tokenised; minified builds only with a source map that has names
function loadNpm(fid) {
  const [nv, rel] = splitFid(fid);
  const dir = pkgDirOf.get(nv);
  if (!dir) { npmStats.missing++; return null; }
  const abs = path.join(NM, dir, rel);
  if (!fs.existsSync(abs)) return null;
  const src = fs.readFileSync(abs, 'utf8');
  const ast = parseNpm(src);
  if (!ast) { npmStats.unparsed++; return null; }
  let an;
  try { an = analyze(ast, src); } catch { npmStats.unparsed++; return null; }
  let viaMap = false;
  if (looksMinifiedFile(src)) {
    let at = null;
    try { at = sourceMapNames(JSON.parse(fs.readFileSync(abs + '.map', 'utf8'))); } catch {}
    if (!at) { npmStats.minifiedSkipped++; return null; }
    for (const b of an.bindings) {
      if (b.implicit || !b.decls.length) continue;
      const id = b.decls.reduce((x, y) => (y.start < x.start ? y : x));
      const nm = at(id.loc.start.line, id.loc.start.column);
      REAL.set(b, nm ?? null);
    }
    viaMap = true;
    npmStats.sourceMapped++;
  }
  npmStats.files++;
  const imports = new Map(an.importSpecs.map((x) => [x.localOcc.binding, x.imported]));
  const t = tokenize(ast.program.body, { imports, defaultBase: requireName(nv.replace(/@[^@]*$/, ''), rel).slice(8) });
  // top-level statement of each token / of a position
  const starts = ast.program.body.map((n) => n.start);
  const stmtOfPos = (p) => { let lo = 0, hi = starts.length - 1, ans = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (starts[mid] <= p) { ans = mid; lo = mid + 1; } else hi = mid - 1; } return ans; };
  const stmt = new Int32Array(t.pos.length);
  for (let i = 0; i < t.pos.length; i++) stmt[i] = stmtOfPos(t.pos[i]);
  return { fid, path: rel, nv, viaMap, stmt, stmtOfPos, ...t };
}
const versionsOf = new Map(); // package name -> [name@version] that are installed
for (const k of pkgDirOf.keys()) { const n = k.replace(/@[^@]*$/, ''); if (!versionsOf.has(n)) versionsOf.set(n, []); versionsOf.get(n).push(k); }
const cmpVer = (a, b) => { const x = a.split(/[.-]/), y = b.split(/[.-]/); for (let i = 0; i < Math.max(x.length, y.length); i++) { const p = +x[i] || 0, q = +y[i] || 0; if (p !== q) return p - q; } return 0; };
const existsIn = (nv, rel) => pkgDirOf.has(nv) && fs.existsSync(path.join(NM, pkgDirOf.get(nv), rel));
// npm files the 316 code of label fid may come from (the run keeps the one aligning best):
//  - the file itself; when this version lacks it, the nearest installed versions that have it;
//  - hashed bundle chunks (name-<hash>.mjs) with the same stem;
//  - for a minified build: the unminified build next to it, else minified siblings with source maps;
//  - ESM siblings of a CommonJS build (esmSiblings).
function npmCandidates(fid, esm) {
  const [nv, rel] = splitFid(fid);
  const pkg = nv.replace(/@[^@]*$/, '');
  const ver = nv.slice(pkg.length + 1);
  const vers = (versionsOf.get(pkg) ?? []).slice().sort((a, b) => Math.abs(cmpVer(a.slice(pkg.length + 1), ver)) - Math.abs(cmpVer(b.slice(pkg.length + 1), ver)) || cmpVer(b.slice(pkg.length + 1), a.slice(pkg.length + 1)));
  const out = [];
  const add = (v, r) => { const f = `${v}/${r}`; if (!out.includes(f) && existsIn(v, r)) out.push(f); };
  add(nv, rel);
  if (!out.length) for (const v of vers) { add(v, rel); if (out.length >= 2) break; }
  const hm = /^(.*\/)?([^/]+)-[A-Za-z0-9_]{8}(\.[cm]?js)$/.exec(rel);
  if (hm) {
    for (const v of [nv, ...vers].slice(0, 3)) {
      const d = pkgDirOf.get(v);
      if (!d) continue;
      try { for (const f of fs.readdirSync(path.join(NM, d, hm[1] ?? ''))) if (f.startsWith(hm[2] + '-') && f.endsWith(hm[3]) && f.length === hm[2].length + 9 + hm[3].length) add(v, (hm[1] ?? '') + f); } catch {}
      if (out.length) break;
    }
  }
  if (/\.min\.[cm]?js$/.test(rel) || isMinifiedPath(nv, rel)) {
    const base = path.posix.basename(rel).replace(/\.min\.([cm]?js)$/, '.$1');
    add(nv, rel.replace(/\.min\.([cm]?js)$/, '.$1'));
    for (const sub of ['lib', 'dist', 'src', 'build']) add(nv, `${sub}/${base}`);
    const d = pkgDirOf.get(nv), sub = path.posix.dirname(rel);
    try { for (const f of fs.readdirSync(path.join(NM, d, sub))) if (/\.[cm]?js$/.test(f) && fs.existsSync(path.join(NM, d, sub, f + '.map'))) add(nv, sub === '.' ? f : `${sub}/${f}`); } catch {}
  }
  if (esm) for (const f of esmSiblings(fid)) if (!out.includes(f)) out.push(f);
  return out;
}
const minPathCache = new Map();
function isMinifiedPath(nv, rel) {
  const k = nv + '/' + rel;
  if (!minPathCache.has(k)) {
    let v = false;
    try { v = looksMinifiedFile(fs.readFileSync(path.join(NM, pkgDirOf.get(nv), rel), 'utf8')); } catch {}
    minPathCache.set(k, v);
  }
  return minPathCache.get(k);
}

// ESM builds next to a CommonJS build of the same file
const SIBLING_RULES = [
  [/(^|\/)dist-cjs\//, '$1dist-es/'],
  [/(^|\/)dist\/cjs\//, '$1dist/esm/'],
  [/(^|\/)dist\/cjs\//, '$1dist/mjs/'],
  [/(^|\/)dist\/commonjs\//, '$1dist/esm/'],
  [/(^|\/)cjs\//, '$1esm/'],
  [/(^|\/)cjs\//, '$1es/'],
  [/(^|\/)build\/src\//, '$1build/esm/'],
  [/(^|\/)build\/src\//, '$1build/esnext/'],
  [/(^|\/)lib\/cjs\//, '$1lib/esm/'],
  [/(^|\/)lib\//, '$1es/'],
  [/(^|\/)lib\//, '$1esm/'],
  [/(^|\/)lib\//, '$1lib/esm/'],
  [/\.cjs$/, '.js'],
  [/\.cjs$/, '.mjs'],
  [/\.js$/, '.mjs'],
];
function esmSiblings(fid) {
  const [nv, rel] = splitFid(fid);
  const dir = pkgDirOf.get(nv);
  if (!dir) return [];
  const out = new Set();
  for (const [re, to] of SIBLING_RULES) {
    if (!re.test(rel)) continue;
    const alt = rel.replace(re, to);
    for (const a of [alt, alt.replace(/\.js$/, '.mjs')]) if (a !== rel && fs.existsSync(path.join(NM, dir, a))) out.add(`${nv}/${a}`);
  }
  return [...out];
}

// top-level bindings declared without initialiser (`var a, b;`) -> offsets of `a = …` assignments
function lazyAssignments(ast) {
  const bare = new Set();
  for (const n of ast.program.body) if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (!d.init && d.id.type === 'Identifier') { const b = d.id[OCC]?.binding; if (b) bare.add(b); }
  const out = new Map();
  if (!bare.size) return out;
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'AssignmentExpression' && n.operator === '=' && n.left.type === 'Identifier') {
      const b = n.left[OCC]?.binding;
      if (b && bare.has(b)) { let a = out.get(b); if (!a) out.set(b, (a = [])); a.push(n.left.start); }
    }
    for (const k in n) {
      if (k === 'loc' || k === 'extra') continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') walk(x); }
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast.program);
  return out;
}

// [outer identifier, expression name identifier] for `x = class y {}`, `var x = function y(){}`
function collectExprNames(node, out) {
  const named = (e) => (e && (e.type === 'ClassExpression' || e.type === 'FunctionExpression') && e.id ? e.id : null);
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && named(n.init)) out.push([n.id, named(n.init)]);
    else if (n.type === 'AssignmentExpression' && n.operator === '=' && n.left.type === 'Identifier' && named(n.right)) out.push([n.left, named(n.right)]);
    for (const k in n) {
      if (k === 'loc' || k === 'extra' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') walk(x); }
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(node);
}

// ---------- naming helpers ----------
const GENERIC_DIR = new Set(['lib', 'dist', 'src', 'build', 'cjs', 'esm', 'es', 'dist-cjs', 'dist-es', 'node', 'umd', 'commonjs', 'module', 'modules', 'internal', 'source', 'out', 'browser']);
const ident = (s) => s.replace(/[^A-Za-z0-9_$]+/g, '_').replace(/^_+|_+$/g, '') || 'module';
function requireName(pkg, rel) {
  const parts = rel.split('/');
  let base = parts.pop().replace(/\.(c|m)?js$|\.json$/, '');
  if (base === 'index' || base === 'main') {
    while (parts.length && GENERIC_DIR.has(parts[parts.length - 1])) parts.pop();
    base = parts.length ? parts[parts.length - 1] : pkg.replace(/^@[^/]+\//, '');
  }
  return 'require_' + ident(base);
}

// ---------- 316 side ----------
const out = [];
const stats = { files: 0, runs: 0, stmtMismatch: 0, esmSibling: 0, realigned: 0, exprName: 0, importNs: 0, defaultAlias: 0, esmInit: 0, cjs: 0, json: 0, aligned: 0, noNpm: 0, top: 0, param: 0, local: 0, wrappers: 0, cjsParams: 0, rejected: {} };
const W = 16;
const npmUsed = new Map(); // run -> fid of the npm file it was aligned with
const helpers = JSON.parse(fs.readFileSync(path.join(A, "vendor/helpers.json"), "utf8"));

function findUnitNode(ast, start) {
  for (const n0 of ast.program.body) {
    if (n0.end <= start || n0.start > start) continue;
    const n = n0.type === 'ExportNamedDeclaration' || n0.type === 'ExportDefaultDeclaration' ? n0.declaration ?? n0 : n0;
    if (n.type === 'VariableDeclaration') return n.declarations.find((d) => d.start === start) ?? null;
    return n;
  }
  return null;
}

// CommonJS wrapper variables (by chunk and minified top-level name) -> require_<file>
const wrapperNames = new Map();
for (const [file, us] of units) for (const u of us) if (u.wrap === 'cjs' && u.names.length === 1) wrapperNames.set(`${file}#${u.names[0]}`, requireName(u.label.pkg, splitFid(u.label.fid)[1]));
const exportCache = new Map(); // chunk -> Map(exported -> local)
function exportsOfChunk(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const m = new Map();
  try {
    const src = fs.readFileSync(path.join('original', file), 'utf8');
    for (const x of src.matchAll(/export\s*\{([^}]*)\}/g)) {
      for (const part of x[1].split(',')) {
        const p = part.trim().split(/\s+as\s+/);
        if (p[0]) m.set(p[1] ?? p[0], p[0]);
      }
    }
  } catch {}
  exportCache.set(file, m);
  return m;
}
// require_<file> name of the wrapper a binding refers to (declared here or imported from another chunk)
function wrapperNameOf(file, b, an) {
  if (b.scope.kind !== 'module') return null;
  if (b.kind !== 'import') return wrapperNames.get(`${file}#${b.name}`) ?? null;
  const spec = an.importSpecs.find((s) => s.localOcc.binding === b);
  if (!spec || !spec.source.startsWith('./')) return null;
  const from = spec.source.slice(2);
  const local = exportsOfChunk(from).get(spec.imported);
  return local ? wrapperNames.get(`${from}#${local}`) ?? null : null;
}

const files = [...units.keys()].sort().filter((f) => !process.env.VN_ONLY || process.env.VN_ONLY.split(",").includes(f));
for (const file of files) {
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  let ast, an;
  try { ast = parseModule(src); an = analyze(ast, src); } catch (e) { console.error('skip', file, e.message); continue; }
  stats.files++;
  const us = units.get(file).sort((a, b) => a.start - b.start);
  const votes = new Map(); // b316 -> Map(bNpm -> n)
  const backOf = new Map(); // b316 -> Map(bNpm -> that run's Map(bNpm -> Map(b316 -> n)))
  const runOf = new Map(); // b316 -> run that declares it
  const quality = new Map(); // b316 -> [sum, n]
  const npmOf = new Map(); // bNpm -> fid (for notes)
  const fixed = []; // direct names (wrapper var, wrapper params)

  const declStarts = new Map();
  const declStartOf = (b) => { let d = declStarts.get(b); if (d === undefined) { d = Math.min(...b.decls.map((x) => x.start)); declStarts.set(b, d); } return d; };
  const lazyAssigned = lazyAssignments(ast);
  const runs = [];
  for (let ui = 0; ui < us.length; ui++) {
    const u = us[ui];
    const node = findUnitNode(ast, u.start);
    if (!node) continue;
    if (u.wrap === 'cjs') {
      const init = node.init;
      const fn = init?.type === 'CallExpression' ? init.arguments[0] : null;
      if (!fn || !/Function/.test(fn.type)) continue;
      const [nv, rel] = splitFid(u.label.fid);
      if (node.id?.type === 'Identifier') fixed.push({ id: node.id, name: requireName(u.label.pkg, rel), via: 'cjs-wrapper', conf: Math.min(0.95, 0.5 + (u.label.score ?? 0.5) / 2), note: `${nv}/${rel}` });
      const subst = new Map();
      const pn = ['cjsExports', 'cjsModule'];
      fn.params.forEach((p, i) => {
        if (p.type !== 'Identifier' || i > 1) return;
        const b = p[OCC]?.binding;
        if (!b) return;
        subst.set(b, intern(i === 0 ? 'g:exports' : 'g:module'));
        fixed.push({ id: p, name: pn[i], via: 'cjs-param', conf: 0.95, note: `${nv}/${rel}` });
      });
      if (u.body === 'json' || /\.json$/.test(rel)) { stats.json++; continue; }
      stats.cjs++;
      runs.push({ fid: u.label.fid, nodes: fn.body.body, subst, wrapFn: fn, ranges: [[node.start, node.end]], label: u.label });
    } else {
      const prev = runs[runs.length - 1];
      if (prev && !prev.subst && prev.fid === u.label.fid && prev.lastIdx === ui - 1) { prev.nodes.push(node); prev.ranges.push([node.start, node.end]); prev.lastIdx++; }
      else runs.push({ fid: u.label.fid, nodes: [node], subst: null, ranges: [[node.start, node.end]], label: u.label, lastIdx: ui });
    }
  }

  for (const run of runs) {
    stats.runs++;
    const t = tokenize(run.nodes, { subst: run.subst });
    // hoisted ESM may have been labelled with the CommonJS build of the file
    // (dist-cjs/… when Bun bundled dist-es/…): try the ESM siblings and keep the
    // npm file that aligns best
    let npm = null, m = null, best = -1;
    for (const fid of npmCandidates(run.fid, !run.subst)) {
      const cand = npmFile(fid);
      if (!cand) continue;
      const mm = align(t.tok, cand.tok, WILD);
      // score: aligned informative tokens (a big unrelated file aligns many
      // wildcards and syntax markers, few literals); Dice breaks ties between
      // builds of the same size
      let a = 0, inf = 0;
      for (let i = 0; i < mm.length; i++) if (mm[i] >= 0) { a++; if (isInformative(t.tok[i])) inf++; }
      const score = inf + (2 * a) / (t.tok.length + cand.tok.length);
      if (score > best) { best = score; npm = cand; m = mm; }
    }
    if (!npm) { stats.noNpm++; if (DEBUG) DEBUG.write(JSON.stringify({ noNpm: run.fid, file, n316: t.tok.length }) + '\n'); continue; }
    npmUsed.set(run, npm.fid);
    if (npm.fid !== run.fid) stats.esmSibling++;
    stats.aligned++;
    // declarations the bundler moved (rollup/esbuild bundles in npm, or Bun's own
    // ordering) break the run's monotone alignment: a unit that came out poorly
    // aligned is aligned again on its own against the whole npm file
    {
      const lb = (x) => { let lo = 0, hi = t.pos.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (t.pos[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
      for (const node of run.nodes) {
        const a0 = lb(node.start), a1 = lb(node.end);
        if (a1 - a0 < 8) continue;
        let a = 0;
        for (let i = a0; i < a1; i++) if (m[i] >= 0) a++;
        if (a >= (a1 - a0) * 0.7) continue;
        const mm = align(t.tok.subarray(a0, a1), npm.tok, WILD);
        let a2 = 0;
        for (let i = 0; i < mm.length; i++) if (mm[i] >= 0) a2++;
        if (a2 <= a) continue;
        for (let i = a0; i < a1; i++) m[i] = mm[i - a0];
        stats.realigned++;
      }
    }
    // local quality: prefix sums of aligned tokens
    const pre = new Int32Array(t.tok.length + 1);
    for (let i = 0; i < t.tok.length; i++) pre[i + 1] = pre[i] + (m[i] >= 0 ? 1 : 0);
    // unit quality: share of the unit's informative tokens (strings, property
    // names, numbers, globals …) that found a partner; wildcards and syntax
    // markers align with almost anything and prove little on their own
    const uq = new Float32Array(t.tok.length).fill(1);
    const ustrong = new Int32Array(t.tok.length); // aligned strong tokens in the unit
    {
      const lb = (x) => { let lo = 0, hi = t.pos.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (t.pos[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
      const spans = run.subst ? [[0, t.tok.length]] : run.nodes.map((n) => [lb(n.start), lb(n.end)]);
      for (const [a0, a1] of spans) {
        let inf = 0, infA = 0, all = 0, allA = 0, strongA = 0;
        for (let i = a0; i < a1; i++) { all++; if (m[i] >= 0) allA++; if (isInformative(t.tok[i])) { inf++; if (m[i] >= 0) { infA++; if (isStrong(t.tok[i])) strongA++; } } }
        const q = inf >= 3 ? infA / inf : all ? (allA / all) * 0.9 : 0;
        for (let i = a0; i < a1; i++) { uq[i] = q; ustrong[i] = strongA; }
      }
    }
    // the npm top-level statement each 316 unit mostly aligned with: a unit's
    // declared names may only take names declared in that statement
    const umaj = new Int32Array(t.tok.length).fill(-1);
    {
      const lb = (x) => { let lo = 0, hi = t.pos.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (t.pos[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
      for (const n of run.nodes) {
        const a0 = lb(n.start), a1 = lb(n.end);
        const cnt = new Map();
        let best = -1, bestN = 0;
        for (let i = a0; i < a1; i++) if (m[i] >= 0) { const s = npm.stmt[m[i]]; const c = (cnt.get(s) ?? 0) + 1; cnt.set(s, c); if (c > bestN) { bestN = c; best = s; } }
        for (let i = a0; i < a1; i++) umaj[i] = best;
      }
    }
    run.al = { t, npm, m, pre, uq, ustrong, umaj };
    if (DEBUG) DEBUG.write(JSON.stringify({ file, fid: run.fid, npmPath: npm.path, n316: t.tok.length, nNpm: npm.tok.length, aligned: pre[t.tok.length] }) + '\n');
  }

  // Votes. An occurrence votes only when the binding is declared in a run aligned
  // with the same npm file (any run of it: Bun splits one file into several runs
  // around other modules' code); references from runs of other files see the
  // npm side's import-local names (checkUrl_1.checkUrl, import {a as b}).
  const homeFid = new Map(); // b316 -> fid of the npm file its declaring run aligned with
  const runAt = (p) => runs.find((r) => r.al && r.ranges.some(([s, e]) => p >= s && p < e));
  const homeOf = (b) => {
    if (homeFid.has(b)) return homeFid.get(b);
    // `var X;` declared bare at the top and assigned inside a lazy-init wrapper
    // (Bun's __esm, CommonJS turned into ESM): the run with `X = …` is its home
    let r = runAt(declStartOf(b));
    if (!r) for (const p of lazyAssigned.get(b) ?? []) if ((r = runAt(p))) break;
    const f = r ? r.al.npm.fid : null;
    homeFid.set(b, f);
    if (r) runOf.set(b, r);
    return f;
  };
  for (const run of runs) {
    if (!run.al) continue;
    const { t, npm, m, pre, uq, ustrong, umaj } = run.al;
    // reverse votes per run (a run that came out misaligned must not mask another's)
    const runBack = new Map();
    for (let i = 0; i < t.tok.length; i++) {
      const b = t.bind[i];
      if (!b || homeOf(b) !== npm.fid) continue;
      const lo = Math.max(0, i - W), hi = Math.min(t.tok.length, i + W + 1);
      const q = (pre[hi] - pre[lo]) / (hi - lo);
      let qa = quality.get(b);
      if (!qa) quality.set(b, (qa = [0, 0, 0, 0]));
      qa[0] += q; qa[1]++;
      if (uq[i] > qa[2]) qa[2] = uq[i];
      if (ustrong[i] > qa[3]) qa[3] = ustrong[i];
      const j = m[i];
      const bn = j >= 0 ? npm.bind[j] : null;
      if (!bn) continue;
      // the declaration of a file-level binding must pair with a declaration in the
      // npm statement its unit aligned with, and any occurrence of it only with a
      // file-level npm binding
      const fileLevel = b.scope.kind === 'module' || (run.wrapFn && b.scope.node === run.wrapFn);
      if (fileLevel && !bn.pseudo && bn.scope?.kind !== 'module') { stats.stmtMismatch++; continue; }
      if (fileLevel && b.decls.some((d) => d.start === t.pos[i]) && umaj[i] >= 0 && !bn.pseudo) {
        if (npm.stmtOfPos(Math.min(...bn.decls.map((d) => d.start))) !== umaj[i]) { stats.stmtMismatch++; continue; }
      }
      let v = votes.get(b);
      if (!v) votes.set(b, (v = new Map()));
      v.set(bn, (v.get(bn) ?? 0) + 1);
      let r = runBack.get(bn);
      if (!r) runBack.set(bn, (r = new Map()));
      r.set(b, (r.get(b) ?? 0) + 1);
      let bf = backOf.get(b);
      if (!bf) backOf.set(b, (bf = new Map()));
      bf.set(bn, runBack);
      npmOf.set(bn, npm.nv + '/' + npm.path);
    }
  }

  // decisions
  const named = new Set();
  const chosen = new Map(); // b316 -> {name, conf}
  const exprNames = [];
  for (const run of runs) for (const n of run.nodes) collectExprNames(n, exprNames);
  for (const f of fixed) {
    const b = f.id[OCC]?.binding;
    if (!b || b.frozen) continue;
    named.add(b);
    if (f.name === b.name) continue;
    out.push({ file, key: '@' + Math.min(...b.decls.map((d) => d.start)), min: b.name, name: f.name, source: 'vendor', confidence: +f.conf.toFixed(2), via: f.via, note: f.note });
    stats[f.via === 'cjs-wrapper' ? 'wrappers' : 'cjsParams']++;
  }
  const why = (reason, b, extra) => {
    stats.rejected[reason] = (stats.rejected[reason] ?? 0) + 1;
    if (DEBUG) DEBUG.write(JSON.stringify({ why: reason, file, key: '@' + declStartOf(b), min: b.name, kind: b.kind, ...extra }) + '\n');
  };
  for (const b of quality.keys()) if (!votes.has(b) && !named.has(b) && !b.frozen) why('novote', b, {});
  for (const [b, v] of votes) {
    if (named.has(b) || b.implicit || b.frozen) continue;
    const declStart = declStartOf(b);
    let total = 0;
    const byName = new Map();
    let best = null, bestN = 0;
    for (const [bn, n] of v) {
      total += n;
      const nm = npmName(bn);
      byName.set(nm, (byName.get(nm) ?? 0) + n);
      if (n > bestN) { best = bn; bestN = n; }
    }
    const bestName = npmName(best);
    const nameVotes = byName.get(bestName);
    const share = nameVotes / total;
    const top3 = () => ({ votes: [...byName].sort((x, y) => y[1] - x[1]).slice(0, 3) });
    if (share < 0.7 && !(share >= 0.6 && nameVotes >= 2)) { why('share', b, top3()); continue; }
    const r = backOf.get(b).get(best).get(best);
    let rt = 0;
    for (const n of r.values()) rt += n;
    if (r.get(b) / rt < 0.6) { why('reverse', b, { name: bestName, back: r.get(b) + '/' + rt }); continue; }
    if ((b.kind === 'param') !== (best.kind === 'param')) { why('kind', b, { name: bestName, npmKind: best.kind }); continue; }
    // a minified npm build whose source map has no name for this binding
    if (bestName === null) { why('npm-minified', b, {}); continue; }
    if (!isValidBindingName(bestName)) { why('invalid', b, { name: bestName }); continue; }
    if (bestName === b.name) { why('same', b, { name: bestName }); continue; }
    const qa = quality.get(b);
    const q = Math.min(1, qa[0] / qa[1] / 0.9, qa[2] / 0.8);
    const occ = b.decls.length + b.refs.length;
    // files known only from the segmenter's placement count a little less, and
    // their units must align well (the segmenter also places first-party code
    // next to vendor code under vendor/)
    const placement = runOf.get(b).label.placement;
    if (placement && qa[2] < 0.6) { why('placement-unit', b, { name: bestName, unitQ: qa[2] }); continue; }
    // a single aligned occurrence is weak evidence unless its unit aligned well
    // (a unit without any aligned specific token — `var R = Re(Rx())`, `Fc = 2` — matches anything of its shape)
    if (total === 1 && (qa[2] < 0.8 || qa[3] < 1)) { why('weak-single', b, { name: bestName, unitQ: qa[2], strong: qa[3] }); continue; }
    // occurrences in the home run that found no partner lower the confidence
    const coverage = Math.min(1, total / qa[1]);
    if (qa[1] >= 3 && coverage < 0.34) { why('coverage', b, { name: bestName, coverage }); continue; }
    const conf = 0.95 * share * q * (0.6 + 0.4 * coverage) * (occ <= 1 ? 0.9 : 1) * (placement ? 0.9 : 1);
    if (conf < 0.5) { why('conf', b, { name: bestName, conf }); continue; }
    // a small run aligned inside a much larger minified bundle (names from its
    // source map) is noisy: only well-supported names
    const al = runOf.get(b).al;
    if (al.npm.viaMap && al.npm.tok.length > 8 * al.t.tok.length && conf < 0.8) { why('map-bundle', b, { name: bestName, conf }); continue; }
    const via = b.scope.kind === 'module' ? 'top' : b.kind === 'param' ? 'param' : 'local';
    stats[via]++;
    chosen.set(b, { name: bestName, conf });
    out.push({ file, key: '@' + declStart, min: b.name, name: bestName, source: 'vendor', confidence: +conf.toFixed(2), via, note: `${npmOf.get(best)} ${nameVotes}/${total}${REAL.has(best) ? ' sourcemap' : ''}`, npmAt: Math.min(...best.decls.map((d) => d.start)) });
  }
  // `X = class Y {…}` / `var X = function Y(){…}`: Bun keeps the expression's own
  // name Y (a separate binding); it takes X's npm name when its own votes gave none
  for (const [outerId, innerId] of exprNames) {
    const outer = outerId[OCC]?.binding, inner = innerId[OCC]?.binding;
    const c = outer && chosen.get(outer);
    if (!c || !inner || inner.frozen || named.has(inner) || chosen.has(inner) || inner.name === c.name) continue;
    chosen.set(inner, c);
    stats.exprName++;
    out.push({ file, key: '@' + declStartOf(inner), min: inner.name, name: c.name, source: 'vendor', confidence: +c.conf.toFixed(2), via: 'expr-name', note: `name of ${outer.name}` });
  }
  // `var X = __toESM(require_foo())` in hoisted ESM: esbuild's import_foo
  for (const run of runs) {
    if (run.subst) continue;
    for (const node of run.nodes) {
      if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier') continue;
      const init = node.init;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier' || !init.arguments.length || init.arguments.length > 2) continue;
      const inner = init.arguments[0];
      if (inner.type !== 'CallExpression' || inner.arguments.length || inner.callee.type !== 'Identifier') continue;
      if (init.arguments[1] && init.arguments[1].type !== 'NumericLiteral') continue;
      const yb = inner.callee[OCC]?.binding;
      const b = node.id[OCC]?.binding;
      if (!yb || !b || b.frozen || chosen.has(b) || named.has(b)) continue;
      const req = wrapperNameOf(file, yb, an);
      if (!req) continue;
      const name = 'import_' + req.slice('require_'.length);
      chosen.set(b, { name, conf: 0.9 });
      stats.importNs++;
      out.push({ file, key: '@' + declStartOf(b), min: b.name, name, source: 'vendor', confidence: 0.9, via: 'cjs-import', note: `__toESM(${req}())` });
    }
  }
  // `var A = B;` in hoisted ESM is the bundler's `export default B` (esbuild: B_default);
  // inside Bun's lazy __esm wrappers it is `A = B` with a bare `var A;` at the top
  const esmHelpers = new Set(helpers.chunks?.[file]?.roles?.__esm ?? []);
  for (const run of runs) {
    if (run.subst) continue;
    const pairs = [];
    for (const node of run.nodes) {
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'Identifier') pairs.push([node.id, node.init]);
      // var init_x = __esm(() => { … A = B … })
      if (node.type === 'VariableDeclarator' && node.init?.type === 'CallExpression' && node.init.callee.type === 'Identifier' && esmHelpers.has(node.init.callee.name)) {
        const fn = node.init.arguments[0];
        const body = fn?.body?.type === 'BlockStatement' ? fn.body.body : [];
        for (const st of body) {
          const e = st.type === 'ExpressionStatement' ? st.expression : null;
          const list = e?.type === 'SequenceExpression' ? e.expressions : e ? [e] : [];
          for (const x of list) if (x.type === 'AssignmentExpression' && x.operator === '=' && x.left.type === 'Identifier' && x.right.type === 'Identifier') pairs.push([x.left, x.right]);
        }
        const b = node.id[OCC]?.binding;
        if (b && !b.frozen && !chosen.has(b) && !named.has(b)) {
          const name = 'init_' + requireName(run.label.pkg, splitFid(npmUsed.get(run) ?? run.fid)[1]).slice('require_'.length);
          chosen.set(b, { name, conf: 0.85 });
          stats.esmInit++;
          out.push({ file, key: '@' + declStartOf(b), min: b.name, name, source: 'vendor', confidence: 0.85, via: 'esm-init', note: 'Bun __esm lazy initialiser' });
        }
      }
    }
    for (const [ida, idb] of pairs) {
      const a = ida[OCC]?.binding, bb = idb[OCC]?.binding;
      if (!a || a.scope.kind !== 'module') continue;
      const c = bb && bb.scope.kind === 'module' && chosen.get(bb);
      if (!c || a.frozen || chosen.has(a) || named.has(a)) continue;
      const name = c.name.replace(/_default$/, '') + '_default';
      chosen.set(a, { name, conf: c.conf * 0.9 });
      stats.defaultAlias++;
      out.push({ file, key: '@' + declStartOf(a), min: a.name, name, source: 'vendor', confidence: +(c.conf * 0.9).toFixed(2), via: 'default-alias', note: `${a.name} = ${bb.name} (${c.name})` });
    }
  }
  if (stats.files % 20 === 0) console.error(`${stats.files}/${files.length} ${file} names=${out.length}`);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
const tmp = outFile + '.tmp';
fs.writeFileSync(tmp, out.map((o) => JSON.stringify(o)).join('\n') + '\n');
fs.renameSync(tmp, outFile);
if (DEBUG) DEBUG.end();
console.log(JSON.stringify({ ...stats, npm: npmStats, names: out.length }, null, 1));

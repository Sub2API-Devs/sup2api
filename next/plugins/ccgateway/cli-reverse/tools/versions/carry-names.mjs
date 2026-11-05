// Carries the naming and placement tables of one official version to the next:
// every key that points into the old original/ (file + offset of a declaring
// identifier, a declaration id "file#name" / "file#@start", a statement start)
// is rewritten to the matching place in the new original/, using the unit
// pairing of tools/versions/equiv.cjs.
//
//   node --max-old-space-size=12000 tools/versions/carry-names.mjs \
//     --old-tree artifacts/versions/2.1.316-original --new-tree original \
//     --equiv <equiv-316-318.json> \
//     --old-naming artifacts/versions/2.1.316-naming --out naming \
//     --old-scan artifacts/versions/2.1.316-analysis/scan/decls.jsonl --new-scan analysis/scan/decls.jsonl \
//     --report artifacts/versions/carry-316-318.json --carry-conflicts same
//
// Inputs
//   old/new tree   restored module trees (tools/extract/restore-bun.cjs), each with reconstruction.json
//   equiv          tools/versions/equiv.cjs output for old -> new (its "map" and "conflicts")
//   old naming     the old naming/ directory; tables read (format in naming/README.md):
//                    semantic-*.jsonl, _*.jsonl with {file,key}        offset keys
//                    docs-*.jsonl, _dup-docs-*.jsonl with {id}         declaration ids
//                    placement-*.json {declId: target}                 declaration ids
//                    _name-shape-verdicts.jsonl {file, stmt}           statement starts
//                    worker-hooks-worker.json [{at, ...}]              offsets in the hooks worker
//                    modules-*.json (keyed by reading-tree path), README.md: copied unchanged
//   old/new scan   analysis/scan/decls.jsonl of each tree (tools/ast/scan.mjs): declaration ids
// Outputs
//   <out>/<same table names>   the carried tables (entries that cannot be carried are left out)
//   <report>                   counts per table and reason; units by status
//   <report minus .json>-dropped.jsonl   one line per entry left out, with the reason
//
// How a key is carried
//   A unit is a module-scope binding (as in equiv.cjs) or a top-level statement that declares
//   none (expression statements, loops, anonymous default exports: "file:#<start>"). Its
//   canonical form is equiv.cjs's token list; locals are numbered by first occurrence.
//   - same unit (equal canonical hash): the top-level binding and every local carry one to one,
//     local n of the old unit is local n of the new unit;
//   - changed unit: the top-level binding carries; locals are carried where a token alignment
//     (Myers diff over the canonical tokens with every local written as one wildcard) pairs
//     them consistently (it also aligns both arrays reversed and counts the pairings the two disagree
//     on, as "unstable" in the report; they are kept): an old local takes the new local most of its aligned occurrences
//     point at, when that is at least 3/4 of its aligned occurrences and half of all its
//     occurrences, one to one; a pair below similarity 0.3 is treated as unmapped (equiv.cjs:
//     such a pair is usually wrong);
//   - unmapped unit: nothing carries. An old unit equiv.cjs reached twice (a conflict) carries
//     only with --carry-conflicts same, and then only when its first pairing has an equal hash
//     and no other old unit tried to pair with that new unit; the rest are listed in the report;
//   - units equiv.cjs left unpaired, statement units included, get fallback pairings (the
//     "fallback" block below): equal form and refs, equal form unique in a home file, or
//     content similarity ("similar-home"). Rows carried through a similar-home pair are marked
//     (confidence -0.1 and note "carry:fallback-c"; ids carry:"fallback-c") and the pairs are
//     listed in the report (similarHome) for spot checks;
//   - import bindings carry to the import binding of the new file (where the old file's units
//     went) that resolves to the paired unit;
//   - files equiv.cjs does not index (*.mjs) pair units by equal hash in the file of the same name.
//   A declaration id carries through the first of its names that carries (or its statement
//   unit), to the id of the new declaration holding that binding.
// Also written: <report minus .json>-pairs.jsonl, every pairing used {old, new, how, status};
//   <report minus .json>-unstable.jsonl, the locals whose forward and reversed alignments disagree
//   {oldUnit, newUnit, oldFile, oldOff, newFile, newOff (carried to), reversedOff (the reversed choice)}.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const espree = require('espree');
const escope = require('eslint-scope');

// ---------- arguments ----------
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
for (const k of ['old-tree', 'new-tree', 'equiv', 'old-naming', 'out', 'old-scan', 'new-scan', 'report']) if (!args[k]) { console.error('missing --' + k); process.exit(2); }
const OLD = args['old-tree'], NEW = args['new-tree'];
const CARRY_CONFLICTS = args['carry-conflicts'] === 'same';
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

// ---------- canonical form (copied from tools/versions/equiv.cjs; the hashes must agree) ----------
const SKIP = new Set(['range', 'start', 'end', 'loc', 'raw', 'comments', 'tokens', 'parent']);
const FILE_REF = /^(\.\/)?[\w./-]*?-[a-z0-9]{8}\.[a-z]+(\.zst)?$/;
const buildFacts = (root) => { const t = fs.readFileSync(path.join(root, 'cli.js'), 'utf8'); return ['VERSION', 'BUILD_TIME', 'GIT_SHA'].map((k) => (new RegExp(k + ':"([^"]+)"').exec(t) ?? [])[1]); };
const NORMALIZE = process.env.EQUIV_NORMALIZE ? JSON.parse(process.env.EQUIV_NORMALIZE) : (() => { const o = buildFacts(OLD), n = buildFacts(NEW); return o.map((v, i) => [v, n[i]]).filter(([a, b]) => a && b && a !== b); })();
const normalized = (side) => new Map(NORMALIZE.map((pair, i) => [pair[side], '@' + i]));

function analyze(root, file, side) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = espree.parse(text, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const moduleScope = sm.scopes.find((s) => s.type === 'module');
  const idVar = new Map();
  for (const s of sm.scopes) {
    for (const v of s.variables) for (const id of v.identifiers) idVar.set(id, v);
    for (const r of s.references) idVar.set(r.identifier, r.resolved ?? null);
  }
  return { text, ast, sm, moduleScope, idVar, norms: normalized(side) };
}

// equiv.cjs's canonical(), also returning the locals in numbering order
function canonical(a, nodes, self) {
  const tokens = [], refs = [], locals = new Map(), norms = a.norms;
  const emit = (t) => tokens.push(t);
  function walk(n) {
    if (n === null || n === undefined) { emit('~'); return; }
    if (Array.isArray(n)) { emit('['); n.forEach(walk); emit(']'); return; }
    if (typeof n !== 'object') { emit(JSON.stringify(n)); return; }
    if (n.type === 'Identifier' || n.type === 'JSXIdentifier') {
      if (a.idVar.has(n)) {
        const v = a.idVar.get(n);
        if (v === null) { emit('G:' + n.name); return; }
        if (v.scope === a.moduleScope) {
          if (v.name === self) { emit('SELF'); return; }
          emit('M'); refs.push(v.name); return;
        }
        if (!locals.has(v)) locals.set(v, locals.size);
        emit('L' + locals.get(v)); return;
      }
      emit('P:' + n.name); return;
    }
    if (n.type === 'TemplateElement') { let c = n.value.cooked; for (const [k, v] of norms) c = c?.split(k).join(v); emit('tpl:' + JSON.stringify(c)); return; }
    if (n.type === 'Literal') {
      if (typeof n.value === 'string' && FILE_REF.test(n.value)) { emit('F'); return; }
      if (typeof n.value === 'string' && norms.has(n.value)) { emit('lit:' + norms.get(n.value)); return; }
      emit('lit:' + (n.regex ? '/' + n.regex.pattern + '/' + n.regex.flags : n.bigint !== undefined ? n.bigint + 'n' : JSON.stringify(n.value)));
      return;
    }
    emit('(' + n.type);
    for (const k of Object.keys(n)) {
      if (SKIP.has(k) || k === 'type') continue;
      emit(k); walk(n[k]);
    }
    emit(')');
  }
  for (const n of nodes) walk(n);
  return { tokens, refs, locals };
}
function unitNodes(v) {
  const out = [];
  for (const d of v.defs) {
    if (d.type === 'FunctionName' || d.type === 'ClassName') out.push(d.node);
    else if (d.type === 'Variable') out.push(d.node.id.type === 'Identifier' ? d.node.init : d.node);
    else if (d.type === 'ImportBinding') out.push({ type: 'Import' });
  }
  for (const r of v.references) if (r.isWrite() && r.writeExpr && !v.defs.some((d) => d.node.init === r.writeExpr)) out.push(r.writeExpr);
  return out;
}
const hashOf = (tokens) => crypto.createHash('sha256').update(tokens.join('\u0001')).digest('hex').slice(0, 24);
const minOffset = (v) => Math.min(...v.identifiers.map((id) => id.range[0]));
const norm = (file, spec) => (spec.startsWith('./') ? path.posix.join(path.posix.dirname(file), spec) : spec);

// Top-level statements that declare no module binding are units of their own.
function statementUnits(a) {
  const out = [];
  for (const node of a.ast.body) {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration') continue;
    if (node.type === 'ExportNamedDeclaration' && !node.declaration) continue;
    const t = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration : node;
    if (t.type === 'VariableDeclaration' || ((t.type === 'FunctionDeclaration' || t.type === 'ClassDeclaration') && t.id)) continue;
    out.push(node);
  }
  return out;
}

// Every unit of a file: [{key, kind:'binding'|'stmt', name?, v?, nodes, self}]
function unitsOf(a, file) {
  const out = [];
  const importNames = new Set();
  for (const node of a.ast.body) if (node.type === 'ImportDeclaration') for (const s of node.specifiers) importNames.add(s.local.name);
  for (const v of a.moduleScope.variables) {
    if (importNames.has(v.name)) continue;
    out.push({ key: file + ':' + v.name, kind: 'binding', name: v.name, v, nodes: unitNodes(v), self: v.name });
  }
  for (const node of statementUnits(a)) out.push({ key: file + ':#' + node.range[0], kind: 'stmt', nodes: [node], self: null });
  return out;
}

function moduleTable(a, file) {
  const imports = new Map(), exports = new Map(), stars = [];
  for (const node of a.ast.body) {
    if (node.type === 'ImportDeclaration') for (const s of node.specifiers) imports.set(s.local.name, { from: norm(file, node.source.value), imported: s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*', at: s.local.range[0] });
    if (node.type === 'ExportNamedDeclaration') {
      for (const s of node.specifiers) {
        const ex = s.exported.name ?? s.exported.value, local = s.local.name ?? s.local.value;
        exports.set(ex, node.source ? { from: norm(file, node.source.value), imported: local } : { local });
      }
      if (node.declaration?.id) exports.set(node.declaration.id.name, { local: node.declaration.id.name });
      for (const d of node.declaration?.declarations ?? []) if (d.id.type === 'Identifier') exports.set(d.id.name, { local: d.id.name });
    }
    if (node.type === 'ExportDefaultDeclaration') exports.set('default', { local: node.declaration.id?.name ?? '*default' });
    if (node.type === 'ExportAllDeclaration') stars.push(norm(file, node.source.value));
  }
  return { imports, exports, stars };
}

// equiv.cjs's resolver: a module variable used in file -> the unit that defines it
function resolver(modules) {
  const memo = new Map();
  function exported(file, name, seen = new Set()) {
    const key = file + '|' + name;
    if (memo.has(key)) return memo.get(key);
    if (seen.has(key)) return null; seen.add(key);
    const m = modules.get(file);
    let out = null;
    if (!m) out = 'ext:' + file + ':' + name;
    else if (name === '*') out = 'ns:' + file;
    else {
      const e = m.exports.get(name);
      if (e?.local) out = local(file, e.local, seen);
      else if (e?.from) out = exported(e.from, e.imported, seen);
      else for (const s of m.stars) { const r = exported(s, name, seen); if (r) { out = r; break; } }
    }
    memo.set(key, out); return out;
  }
  function local(file, name, seen = new Set()) {
    const im = modules.get(file)?.imports.get(name);
    if (im) return exported(im.from, im.imported, seen) ?? ('unresolved:' + im.from + ':' + im.imported);
    return file + ':' + name;
  }
  return local;
}

// the JS modules of reconstruction.json, plus the top-level *.mjs scripts restore-bun.cjs records as
// resources (2.1.316/318: build-report-lite, runner-scaffold), which tools/ast/scan.mjs scans too
const jsFiles = (root) => [...new Set([...JSON.parse(fs.readFileSync(path.join(root, 'reconstruction.json'), 'utf8')).modules.map((m) => m.file).filter((f) => /\.(js|mjs)$/.test(f)), ...fs.readdirSync(root).filter((f) => /\.mjs$/.test(f))])];
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// ---------- old tables ----------
const ON = args['old-naming'];
const tables = []; // {name, kind:'offset'|'id'|'placement'|'stmt'|'worker'|'copy', rows}
for (const f of fs.readdirSync(ON).sort()) {
  const p = path.join(ON, f);
  if (fs.statSync(p).isDirectory()) continue; // final/ is generated by tools/naming/resolve.mjs
  if (f === 'worker-hooks-worker.json') { tables.push({ name: f, kind: 'worker', rows: JSON.parse(fs.readFileSync(p, 'utf8')) }); continue; }
  if (/^placement.*\.json$/.test(f)) { tables.push({ name: f, kind: 'placement', rows: Object.entries(JSON.parse(fs.readFileSync(p, 'utf8'))) }); continue; }
  if (f.endsWith('.jsonl')) {
    const rows = readJsonl(p);
    const kind = rows.every((r) => r.file && r.key) ? 'offset' : rows.every((r) => r.id) ? 'id' : rows.every((r) => r.file && r.stmt !== undefined) ? 'stmt' : null;
    if (!kind) throw new Error('unknown table shape: ' + f);
    tables.push({ name: f, kind, rows });
    continue;
  }
  tables.push({ name: f, kind: 'copy' });
}
const WORKER = 'src/plugins/functionHooks/hooks-worker/hooks-worker.js';
// offset requests per old file: file -> Set(offset)
const wantOffsets = new Map();
const want = (file, off) => { let s = wantOffsets.get(file); if (!s) wantOffsets.set(file, (s = new Set())); s.add(off); };
for (const t of tables) {
  if (t.kind === 'offset') for (const r of t.rows) want(r.file, +r.key.slice(1));
  if (t.kind === 'worker') for (const r of t.rows) want(WORKER, r.at);
}

// ---------- index a tree ----------
// units: key -> {hash, top (offset of the binding) | null, locals: Int32Array idx -> offset, refs, file}
function indexTree(root, side, onFile) {
  const units = new Map(), modules = new Map();
  let n = 0;
  for (const file of jsFiles(root)) {
    let a;
    try { a = analyze(root, file, side); } catch (e) { log('parse', root, file, e.message); continue; }
    modules.set(file, moduleTable(a, file));
    const mine = [];
    for (const u of unitsOf(a, file)) {
      mine.push(u.key);
      const c = canonical(a, u.nodes, u.self);
      const locals = new Int32Array(c.locals.size);
      for (const [v, i] of c.locals) locals[i] = v.identifiers.length ? minOffset(v) : -1;
      units.set(u.key, { hash: hashOf(c.tokens), top: u.v ? minOffset(u.v) : null, locals, refs: c.refs, file, size: c.tokens.length, c, u });
    }
    if (onFile) onFile(file, a, units);
    for (const k of mine) { const u = units.get(k); delete u.c; delete u.u; }
    if (++n % 250 === 0) log(root, n);
  }
  return { units, modules, res: resolver(modules) };
}

// old side: offset -> where it lives
const located = new Map(); // `${file}@${off}` -> [{unit, idx}] | {top: unit} | {import: local}
function locateOld(file, a, units) {
  const offs = wantOffsets.get(file);
  if (!offs) return;
  const where = new Map();
  const add = (off, x) => { if (!offs.has(off)) return; let l = where.get(off); if (!l) where.set(off, (l = [])); l.push(x); };
  for (const [key, u] of units) {
    if (u.file !== file || !u.c) continue;
    if (u.u.v) for (const id of u.u.v.identifiers) add(id.range[0], { unit: key, top: true });
    for (const [v, i] of u.c.locals) for (const id of v.identifiers) add(id.range[0], { unit: key, idx: i });
  }
  for (const node of a.ast.body) if (node.type === 'ImportDeclaration') for (const s of node.specifiers) add(s.local.range[0], { import: s.local.name });
  for (const off of offs) located.set(file + '@' + off, where.get(off) ?? []);
}

log('index new tree', NEW);
const newT = indexTree(NEW, 1);
log('index old tree', OLD);
const oldT = indexTree(OLD, 0, locateOld);

// ---------- token helpers ----------
// Myers diff over int arrays with typed-array traces; returns matched index pairs or null.
function myers(a, b, maxD = 5000) {
  let s = 0; while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let ea = a.length, eb = b.length; while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
  const pairs = [];
  for (let i = 0; i < s; i++) pairs.push([i, i]);
  const A = a.subarray(s, ea), B = b.subarray(s, eb), n = A.length, m = B.length;
  const mid = [];
  if (n && m) {
    const max = Math.min(n + m, maxD), off = max + 1;
    const v = new Int32Array(2 * max + 3); v[off + 1] = 0;
    const trace = [];
    let found = -1;
    for (let d = 0; d <= max && found < 0; d++) {
      trace.push(v.slice(off - d - 1, off + d + 2));
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
        let y = x - k;
        while (x < n && y < m && A[x] === B[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) { found = d; break; }
      }
    }
    if (found < 0) return null;
    let x = n, y = m;
    for (let d = found; d > 0; d--) {
      const t = trace[d], base = d + 1; // t[base + k] = v[k] before step d
      const k = x - y;
      const get = (kk) => t[base + kk];
      const prevK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
      const px = get(prevK), py = px - prevK;
      while (x > px && y > py) { mid.push([s + x - 1, s + y - 1]); x--; y--; }
      x = px; y = py;
    }
    while (x > 0 && y > 0) { mid.push([s + x - 1, s + y - 1]); x--; y--; }
    mid.reverse();
  }
  for (const p of mid) pairs.push(p);
  for (let i = 0; i < a.length - ea; i++) pairs.push([ea + i, eb + i]);
  return pairs;
}
// align(a, b): matched index pairs of two int arrays. Myers when the difference is small;
// otherwise patience anchoring: tokens that occur once in each side, longest increasing chain
// of them, then the same recursively between consecutive anchors (pieces without anchors that
// Myers cannot do stay unmatched). Returns null only when nothing at all could be aligned.
function align(a, b) {
  const out = [];
  const rec = (ao, ae, bo, be, depth) => {
    while (ao < ae && bo < be && a[ao] === b[bo]) out.push([ao++, bo++]);
    const tail = [];
    while (ae > ao && be > bo && a[ae - 1] === b[be - 1]) tail.push([--ae, --be]);
    if (ae > ao && be > bo) {
      const direct = (ae - ao) + (be - bo) <= 40000 || depth > 20 ? myers(a.subarray(ao, ae), b.subarray(bo, be), 2000) : null;
      if (direct) for (const [x, y] of direct) out.push([ao + x, bo + y]);
      else if (depth <= 20) {
        const ca = new Map(), cb = new Map();
        for (let i = ao; i < ae; i++) { const t = a[i]; const c = ca.get(t); ca.set(t, c === undefined ? i : -1); }
        for (let j = bo; j < be; j++) { const t = b[j]; const c = cb.get(t); cb.set(t, c === undefined ? j : -1); }
        const anchors = [];
        for (const [t, i] of ca) if (i >= 0) { const j = cb.get(t); if (j !== undefined && j >= 0) anchors.push([i, j]); }
        anchors.sort((p, q) => p[0] - q[0]);
        // longest increasing subsequence on j
        const tails = [], prev = new Int32Array(anchors.length).fill(-1), tailIdx = [];
        for (let k = 0; k < anchors.length; k++) {
          const j = anchors[k][1];
          let lo = 0, hi = tails.length;
          while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < j) lo = mid + 1; else hi = mid; }
          tails[lo] = j; tailIdx[lo] = k; prev[k] = lo ? tailIdx[lo - 1] : -1;
        }
        const chain = [];
        for (let k = tailIdx[tails.length - 1] ?? -1; k >= 0; k = prev[k]) chain.push(anchors[k]);
        chain.reverse();
        let pa = ao, pb = bo;
        for (const [i, j] of chain) { rec(pa, i, pb, j, depth + 1); out.push([i, j]); pa = i + 1; pb = j + 1; }
        if (chain.length) rec(pa, ae, pb, be, depth + 1);
      }
    }
    for (let k = tail.length - 1; k >= 0; k--) out.push(tail[k]);
  };
  rec(0, a.length, 0, b.length, 0);
  return out.length ? out : null;
}
const fileOfKey = (k) => (k.includes(':#') ? k.slice(0, k.indexOf(':#')) : k.slice(0, k.lastIndexOf(':')));
const intern = new Map();
const contentIds = new Set(); // ids of string, template, property and global tokens (similar-home fingerprints)
const tokId = (t) => { let i = intern.get(t); if (i === undefined) { intern.set(t, (i = intern.size + 1)); if (/^(lit|tpl|P|G):/.test(t)) contentIds.add(i); } return i; };
const LTOK = tokId('L');
function generic(tokens) {
  const ids = new Int32Array(tokens.length), loc = new Int32Array(tokens.length).fill(-1);
  tokens.forEach((t, i) => { if (t.charCodeAt(0) === 76 && /^L\d+$/.test(t)) { ids[i] = LTOK; loc[i] = +t.slice(1); } else ids[i] = tokId(t); });
  return { ids, loc };
}
// unitTokens(tree root, side, [keys]) -> Map(key -> generic tokens), one parse per file
function unitTokens(root, side, keys) {
  const byFile = new Map();
  for (const k of keys) { const f = fileOfKey(k); (byFile.get(f) ?? byFile.set(f, []).get(f)).push(k); }
  const out = new Map();
  for (const [file, ks] of byFile) {
    const a = analyze(root, file, side);
    const us = new Map(unitsOf(a, file).map((u) => [u.key, u]));
    for (const k of ks) { const u = us.get(k); if (u) out.set(k, generic(canonical(a, u.nodes, u.self).tokens)); }
  }
  return out;
}

// ---------- pairing ----------
const equiv = JSON.parse(fs.readFileSync(args.equiv, 'utf8'));
const pairOf = new Map(Object.entries(equiv.map));
const how = new Map([...pairOf.keys()].map((k) => [k, 'equiv']));
const conflictOld = new Set(equiv.conflicts.filter((c) => c.kind === 'old-reached-twice').map((c) => c.old));
// new units another old unit also tried to pair with (equiv.cjs conflicts): new -> Set(old)
const wantedBy = new Map();
for (const c of equiv.conflicts) { const n = c.kind === 'old-reached-twice' ? c.second : c.first; (wantedBy.get(n) ?? wantedBy.set(n, new Set()).get(n)).add(c.old); }
const conflictVerdict = new Map(); // conflict old unit -> 'carried' | reason
const stats = { units: {}, hashCheck: {} };
// hashes agree with equiv.cjs: its same/changed counts are recomputed here
{
  let same = 0, changed = 0, missing = 0;
  for (const [o, n] of pairOf) { const uo = oldT.units.get(o), un = newT.units.get(n); if (!uo || !un) { missing++; continue; } if (uo.hash === un.hash) same++; else changed++; }
  stats.hashCheck = { equivSame: equiv.same, equivChanged: equiv.changed, here: { same, changed, missing } };
  log('hash check', JSON.stringify(stats.hashCheck));
}
// files equiv.cjs does not index: same file name, equal hash
for (const [k, u] of oldT.units) {
  if (!u.file.endsWith('.mjs') || pairOf.has(k)) continue;
  if (newT.units.get(k)?.hash === u.hash) { pairOf.set(k, k); how.set(k, 'mjs-same-file'); }
}
const claimed = new Set(pairOf.values());
// home files: old file -> new files its units went to, by count
const homeOf = new Map();
for (const [o, n] of pairOf) {
  const fo = oldT.units.get(o)?.file, fn = newT.units.get(n)?.file;
  if (!fo || !fn) continue;
  let m = homeOf.get(fo); if (!m) homeOf.set(fo, (m = new Map()));
  m.set(fn, (m.get(fn) ?? 0) + 1);
}
const homes = (fo) => [...(homeOf.get(fo) ?? new Map())].sort((a, b) => b[1] - a[1]).map(([f]) => f);
// Fallback pairing for units equiv.cjs left unpaired (statement units are never in its map):
//   same-form-refs  equal canonical hash and equal refs (old refs through the pairing so far),
//                   first in the new files most of the old file's units went to, in source order,
//                   else when unique in the tree;
//   same-form-home  equal canonical hash, refs differ: only when unique among the unpaired units
//                   of one of the three main home files, and not tiny (12 tokens or more);
//   similar-home    neither: the unpaired unit of a home file with the most similar content
//                   (Jaccard over string, template, property and global tokens ≥ 0.5, sizes
//                   within 2×, mutual best, 40 tokens or more); its locals then go through the
//                   same alignment as a changed pair, which drops it below similarity 0.3.
const kindOf = (k) => (k.includes(':#') ? 'stmt' : 'binding');
const posOf = (k, u) => u.top ?? +k.slice(k.indexOf(':#') + 2);
const push = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);
const fallback = { 'same-form-refs': 0, 'same-form-home': 0, 'similar-home': 0 };
const jaccardOf = new Map(); // similar-home old unit -> Jaccard of the pairing
const alignSim = new Map(); // aligned old unit -> token similarity
const unstableList = []; // pairings the forward and reversed alignments disagree on (kept; listed for audits)
{
  const newSig = new Map(), newByHash = new Map();
  for (const [k, u] of newT.units) { push(newSig, u.hash + '|' + u.refs.map((r) => newT.res(u.file, r)).join(','), k); push(newByHash, u.hash, k); }
  const oldSig = (u) => u.hash + '|' + u.refs.map((r) => { const t = oldT.res(u.file, r); return pairOf.get(t) ?? (t.startsWith('ext:') ? t : '?' + t); }).join(',');
  const pickHome = (file, cands) => {
    for (const h of homes(file)) {
      let best = null;
      for (const x of cands) { const nu = newT.units.get(x); if (nu.file === h && (!best || posOf(x, nu) < posOf(best, newT.units.get(best)))) best = x; }
      if (best) return best;
    }
    return null;
  };
  const unpairedOld = () => [...oldT.units.keys()].filter((k) => !pairOf.has(k)).sort((a, b) => { const ua = oldT.units.get(a), ub = oldT.units.get(b); return ua.file.localeCompare(ub.file) || posOf(a, ua) - posOf(b, ub); });
  const take = (k, n, h) => { pairOf.set(k, n); how.set(k, h); claimed.add(n); fallback[h]++; };
  for (let round = 0; round < 4; round++) {
    let added = 0;
    for (const k of unpairedOld()) {
      const u = oldT.units.get(k);
      const cands = (newSig.get(oldSig(u)) ?? []).filter((x) => !claimed.has(x) && kindOf(x) === kindOf(k));
      let pick = cands.length ? pickHome(u.file, cands) ?? (cands.length === 1 ? cands[0] : null) : null;
      if (pick) { take(k, pick, 'same-form-refs'); added++; continue; }
      if (u.size < 12) continue;
      const c2 = (newByHash.get(u.hash) ?? []).filter((x) => !claimed.has(x) && kindOf(x) === kindOf(k));
      for (const h of homes(u.file).slice(0, 3)) { const inH = c2.filter((x) => newT.units.get(x).file === h); if (inH.length === 1) { pick = inH[0]; break; } }
      if (pick) { take(k, pick, 'same-form-home'); added++; }
    }
    if (!added) break;
  }
  // similar content inside the home files
  const olds = unpairedOld().filter((k) => oldT.units.get(k).size >= 40);
  const newCands = new Map(); // old key -> [new keys]
  const needNew = new Set();
  const freeByFile = new Map();
  for (const [nk, nu] of newT.units) if (!claimed.has(nk)) push(freeByFile, nu.file, nk);
  for (const k of olds) {
    const u = oldT.units.get(k), hs = new Set(homes(u.file).slice(0, 3));
    const c = [];
    for (const h of hs) for (const nk of freeByFile.get(h) ?? []) { const nu = newT.units.get(nk); if (!claimed.has(nk) && kindOf(nk) === kindOf(k) && nu.size >= u.size / 2 && nu.size <= u.size * 2) c.push(nk); }
    if (c.length) { newCands.set(k, c); for (const x of c) needNew.add(x); }
  }
  const fpOf = (g) => { const s = new Set(); for (const id of g.ids) if (contentIds.has(id)) s.add(id); return s; };
  const ot = unitTokens(OLD, 0, [...newCands.keys()]), nt = unitTokens(NEW, 1, [...needNew]);
  const ofp = new Map([...ot].map(([k, g]) => [k, fpOf(g)])), nfp = new Map([...nt].map(([k, g]) => [k, fpOf(g)]));
  const jac = (a, b) => { if (!a.size && !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
  const bestOld = new Map(), bestNew = new Map();
  for (const [k, c] of newCands) {
    for (const nk of c) {
      const j = jac(ofp.get(k), nfp.get(nk));
      if (j < 0.5) continue;
      if (!bestOld.has(k) || j > bestOld.get(k)[1]) bestOld.set(k, [nk, j]);
      if (!bestNew.has(nk) || j > bestNew.get(nk)[1]) bestNew.set(nk, [k, j]);
    }
  }
  for (const [k, [nk, j]] of bestOld) if (bestNew.get(nk)?.[0] === k && !claimed.has(nk)) { take(k, nk, 'similar-home'); jaccardOf.set(k, Math.round(j * 1000) / 1000); }
}
stats.units.fallback = fallback;

// status of an old unit
const statusCache = new Map();
function statusOf(o) {
  if (statusCache.has(o)) return statusCache.get(o);
  let s;
  const n = pairOf.get(o);
  if (!n || !newT.units.has(n)) s = 'unmapped';
  else if (conflictOld.has(o)) {
    // --carry-conflicts same: carried when the first pairing has an equal hash and no other old
    // unit tried to pair with that new unit (one to one); otherwise left out
    const equal = oldT.units.get(o).hash === newT.units.get(n).hash;
    const others = [...(wantedBy.get(n) ?? [])].filter((x) => x !== o);
    const v = !CARRY_CONFLICTS ? 'option-off' : !equal ? 'hash-differs' : others.length ? 'new-unit-wanted-by-another' : 'carried';
    conflictVerdict.set(o, v);
    s = v === 'carried' ? 'same' : 'conflict';
  }
  else s = oldT.units.get(o).hash === newT.units.get(n).hash ? 'same' : 'changed';
  statusCache.set(o, s);
  return s;
}
{
  const c = {};
  for (const k of oldT.units.keys()) { const s = statusOf(k); c[s] = (c[s] ?? 0) + 1; }
  stats.units.old = c;
  // what --carry-conflicts same would add back
  stats.units.conflictWithEqualHash = [...conflictOld].filter((o) => pairOf.has(o) && oldT.units.get(o)?.hash === newT.units.get(pairOf.get(o))?.hash).length;
  const cv = {};
  for (const v of conflictVerdict.values()) cv[v] = (cv[v] ?? 0) + 1;
  stats.units.conflictVerdicts = cv;
  stats.units.conflictsLeftOut = [...conflictVerdict].filter(([, v]) => v !== 'carried').map(([o, v]) => ({ old: o, new: pairOf.get(o), why: v, others: [...(wantedBy.get(pairOf.get(o)) ?? [])].filter((x) => x !== o) }));
  stats.units.newTotal = newT.units.size;
  stats.units.newPaired = new Set([...pairOf.values()]).size;
}

// ---------- changed units: local alignment ----------
// requests: old unit -> Set(idx) of locals that carry an entry
const localReq = new Map();
for (const [k, l] of located) for (const x of l) if (x.idx !== undefined && statusOf(x.unit) === 'changed') (localReq.get(x.unit) ?? localReq.set(x.unit, new Set()).get(x.unit)).add(x.idx);
const localMap = new Map(); // old unit -> Map(oldIdx -> newIdx)
const alignStats = { units: localReq.size, lowSimilarity: 0, tooDifferent: 0 };
const lowSim = new Set();
{
  log('align changed units', localReq.size);
  const keys = [...localReq.keys()];
  // in slices, so the token lists of only a few hundred units are alive at once
  for (let i = 0; i < keys.length; i += 300) {
    const slice = keys.slice(i, i + 300);
    const ot = unitTokens(OLD, 0, slice), nt = unitTokens(NEW, 1, slice.map((k) => pairOf.get(k)));
    for (const o of slice) {
      const A = ot.get(o), B = nt.get(pairOf.get(o));
      if (!A || !B) { alignStats.tooDifferent++; continue; }
      const same = align(A.ids, B.ids);
      if (!same) { alignStats.tooDifferent++; continue; }
      const sim = (2 * same.length) / (A.ids.length + B.ids.length);
      alignSim.set(o, Math.round(sim * 1000) / 1000);
      if (sim < 0.3) { alignStats.lowSimilarity++; lowSim.add(o); continue; }
      // Votes from two alignments: the arrays as they are and both reversed. Where several
      // alignments cost the same (runs of look-alike declarations such as `a=null,b=null`), Myers
      // picks one of them and the wildcard locals can come out shifted by one; the reversed
      // alignment picks the other way. Only a pairing both agree on is kept (2026-11-05: the
      // naming batches found shifted names in about 200 places before this check).
      const occ = new Map();
      for (let j = 0; j < A.loc.length; j++) if (A.loc[j] >= 0) occ.set(A.loc[j], (occ.get(A.loc[j]) ?? 0) + 1);
      const voteOf = (pairs) => {
        const votes = new Map(), aligned = new Map();
        for (const [x, y] of pairs) {
          if (A.loc[x] < 0) continue;
          const ol = A.loc[x], nl = B.loc[y];
          aligned.set(ol, (aligned.get(ol) ?? 0) + 1);
          let m = votes.get(ol); if (!m) votes.set(ol, (m = new Map()));
          m.set(nl, (m.get(nl) ?? 0) + 1);
        }
        const cand = [];
        for (const [ol, m] of votes) {
          let best = -1, bv = 0;
          for (const [nl, c] of m) if (c > bv) { bv = c; best = nl; }
          if (bv >= 0.75 * aligned.get(ol) && bv >= 0.5 * occ.get(ol)) cand.push([ol, best, bv]);
        }
        // one to one: a new local chosen twice keeps the strictly strongest claim
        const byNew = new Map();
        for (const c of cand) (byNew.get(c[1]) ?? byNew.set(c[1], []).get(c[1])).push(c);
        const r = new Map();
        for (const cs of byNew.values()) { cs.sort((p, q) => q[2] - p[2]); if (cs.length === 1 || cs[0][2] > cs[1][2]) r.set(cs[0][0], cs[0][1]); }
        return r;
      };
      const fwd = voteOf(same);
      const ra = A.ids.slice().reverse(), rb = B.ids.slice().reverse(), na = A.ids.length - 1, nb = B.ids.length - 1;
      const back = align(ra, rb);
      const bwd = back ? voteOf(back.map(([x, y]) => [na - x, nb - y])) : new Map();
      const m = new Map();
      // report only: on 2.1.318 the 800 unstable pairings held 7 of the ~200 names the batches disputed,
      // and tracing the disputes showed the carried names right (docs/process/upgrade-318.md 6.2)
      for (const [ol, nl] of fwd) {
        m.set(ol, nl);
        if (bwd.get(ol) === nl) continue;
        alignStats.unstable = (alignStats.unstable ?? 0) + 1;
        const uo = oldT.units.get(o), un = newT.units.get(pairOf.get(o)), bl = bwd.get(ol);
        unstableList.push({ oldUnit: o, newUnit: pairOf.get(o), oldFile: uo.file, oldOff: uo.locals[ol], newFile: un.file, newOff: un.locals[nl], reversedOff: bl === undefined ? null : un.locals[bl] });
      }
      localMap.set(o, m);
    }
    log('aligned', Math.min(i + 300, keys.length), '/', keys.length);
  }
}

// ---------- carrying one offset ----------
// returns {file, off, status} or {reason}
function carryOffset(file, off) {
  const l = located.get(file + '@' + off);
  if (!l || !l.length) return { reason: 'not-a-binding' };
  // a binding declared once: prefer the top-level reading, then any unit that carries it
  const tops = l.filter((x) => x.top), locs = l.filter((x) => x.idx !== undefined), imps = l.filter((x) => x.import);
  let lastReason = null;
  for (const x of tops) {
    const s = statusOf(x.unit);
    if (s === 'unmapped' || s === 'conflict') { lastReason = s; continue; }
    if (s === 'changed' && lowSim.has(x.unit)) { lastReason = 'low-similarity'; continue; }
    const nu = newT.units.get(pairOf.get(x.unit));
    return { file: nu.file, off: nu.top, status: s, unit: x.unit };
  }
  for (const x of locs) {
    const s = statusOf(x.unit);
    if (s === 'unmapped' || s === 'conflict') { lastReason = lastReason ?? s; continue; }
    const nu = newT.units.get(pairOf.get(x.unit));
    if (s === 'same') { const o2 = nu.locals[x.idx]; if (o2 >= 0) return { file: nu.file, off: o2, status: s, unit: x.unit }; lastReason = 'no-declaration'; continue; }
    if (lowSim.has(x.unit)) { lastReason = 'low-similarity'; continue; }
    const m = localMap.get(x.unit);
    if (!m) { lastReason = 'diff-too-large'; continue; }
    const ni = m.get(x.idx);
    if (ni === undefined) { lastReason = 'local-not-aligned'; continue; } // includes pairings the two alignments disagree on
    const o2 = nu.locals[ni];
    if (o2 >= 0) return { file: nu.file, off: o2, status: 'changed', unit: x.unit };
    lastReason = 'no-declaration';
  }
  for (const x of imps) {
    const target = oldT.res(file, x.import);
    const nt = target.startsWith('ext:') ? target : pairOf.get(target);
    if (!nt) { lastReason = 'import-target-unmapped'; continue; }
    for (const h of homes(file)) {
      const m = newT.modules.get(h);
      for (const [local, im] of m?.imports ?? []) if (newT.res(h, local) === nt) return { file: h, off: im.at, status: 'import' };
    }
    lastReason = 'import-not-found';
  }
  return { reason: lastReason ?? 'not-a-binding', unit: (tops[0] ?? locs[0])?.unit };
}

// ---------- declarations ----------
const oldDecls = readJsonl(args['old-scan']), newDecls = readJsonl(args['new-scan']);
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const oldDeclById = new Map(oldDecls.map((d) => [idOf(d), d]));
const oldDeclByStart = new Map(oldDecls.map((d) => [d.file + '@' + d.start, d]));
const newDeclOfName = new Map(), newDeclOfStart = new Map();
for (const d of newDecls) { for (const n of d.names) newDeclOfName.set(d.file + ':' + n, d); newDeclOfStart.set(d.file + '@' + d.start, d); }
function carryDecl(d) {
  if (!d) return { reason: 'no-such-declaration' };
  const keys = d.names.length ? d.names.map((n) => d.file + ':' + n) : [d.file + ':#' + d.start];
  let reason = null, status = null;
  for (const k of keys) {
    const s = statusOf(k);
    if (s === 'unmapped' || s === 'conflict') { reason = reason ?? s; continue; }
    if (s === 'changed' && lowSim.has(k)) { reason = reason ?? 'low-similarity'; continue; }
    const nk = pairOf.get(k), cut = nk.indexOf(':#') >= 0 ? nk.indexOf(':#') : nk.lastIndexOf(':');
    const nf = nk.slice(0, cut);
    const nd = nk.includes(':#') ? newDeclOfStart.get(nf + '@' + nk.slice(cut + 2)) : newDeclOfName.get(nk);
    if (!nd) { reason = 'new-declaration-missing'; continue; }
    status = s;
    // the declaration is "same" only when every carried name of it is
    for (const k2 of keys) if (statusOf(k2) === 'changed') status = 'changed';
    return { id: idOf(nd), file: nd.file, start: nd.start, status, unit: k };
  }
  return { reason: reason ?? 'unmapped' };
}

// ---------- write the tables ----------
// Names that came through a similar-home pair (content similarity only) may be wrong: one step
// lower confidence (-0.1) and "carry:fallback-c" in the note; ids and statements get carry:"fallback-c".
const viaC = (c) => c.unit && how.get(c.unit) === 'similar-home';
const cCarried = new Map(); // old unit -> rows carried through it
const countC = (c) => { if (viaC(c)) cCarried.set(c.unit, (cCarried.get(c.unit) ?? 0) + 1); };
const markName = (row, c) => (viaC(c) ? { ...row, confidence: Math.max(0.05, Math.round(((row.confidence ?? 0.5) - 0.1) * 100) / 100), note: (row.note ? row.note + '; ' : '') + 'carry:fallback-c' } : row);
const markDoc = (row, c) => (viaC(c) ? { ...row, carry: 'fallback-c' } : row);
fs.mkdirSync(args.out, { recursive: true });
const reportTables = {};
const droppedPath = args.report.replace(/\.json$/, '') + '-dropped.jsonl';
const dropped = fs.createWriteStream(droppedPath);
const declCache = new Map();
const carryDeclId = (id) => { if (!declCache.has(id)) declCache.set(id, carryDecl(oldDeclById.get(id))); return declCache.get(id); };
for (const t of tables) {
  const out = path.join(args.out, t.name);
  const r = { kind: t.kind, total: 0, carried: 0, byStatus: {}, dropped: {}, collisions: 0 };
  const drop = (reason, row, unit) => { r.dropped[reason] = (r.dropped[reason] ?? 0) + 1; dropped.write(JSON.stringify({ table: t.name, reason, ...(unit ? { unit } : {}), row }) + '\n'); };
  const ok = (status) => { r.carried++; r.byStatus[status] = (r.byStatus[status] ?? 0) + 1; };
  if (t.kind === 'copy') { fs.copyFileSync(path.join(ON, t.name), out); reportTables[t.name] = { kind: 'copy' }; continue; }
  if (t.kind === 'offset') {
    const lines = [], seen = new Map();
    for (const row of t.rows) {
      r.total++;
      const c = carryOffset(row.file, +row.key.slice(1));
      if (c.reason) { drop(c.reason, row, c.unit); continue; }
      // Names may hold annotate placeholders "<min>_K<offset>" (tools/naming/resolve.mjs replaces them
      // with the final name of the binding at that offset of the same file); the offset is an old one
      // and is carried too. A placeholder that does not carry into the same new file drops the row.
      let name = row.name;
      if (/_K\d+/.test(name)) {
        let bad = false;
        name = name.replace(/(?<![\w$])([\w$]{1,3})_K(\d+)(?!\d)/g, (whole, min, n) => {
          const p = carryOffset(row.file, +n);
          if (p.reason || p.file !== c.file) { bad = true; return whole; }
          return `${min}_K${p.off}`;
        });
        if (bad) { drop('placeholder-not-carried', row, c.unit); continue; }
        r.placeholders = (r.placeholders ?? 0) + 1;
      }
      const k = c.file + '@' + c.off;
      if (seen.has(k) && seen.get(k) !== row.name) r.collisions++;
      seen.set(k, row.name);
      ok(c.status);
      countC(c);
      lines.push(JSON.stringify({ ...markName({ ...row, name }, c), file: c.file, key: '@' + c.off }));
    }
    fs.writeFileSync(out, lines.length ? lines.join('\n') + '\n' : '');
  } else if (t.kind === 'id') {
    const lines = [];
    for (const row of t.rows) {
      r.total++;
      const c = carryDeclId(row.id);
      if (c.reason) { drop(c.reason, row, c.unit); continue; }
      ok(c.status);
      countC(c);
      lines.push(JSON.stringify({ ...markDoc(row, c), id: c.id }));
    }
    fs.writeFileSync(out, lines.length ? lines.join('\n') + '\n' : '');
  } else if (t.kind === 'stmt') {
    const lines = [];
    for (const row of t.rows) {
      r.total++;
      const d = oldDeclByStart.get(row.file + '@' + row.stmt);
      const c = carryDecl(d);
      if (c.reason) { drop(c.reason, row, c.unit); continue; }
      ok(c.status);
      countC(c);
      lines.push(JSON.stringify({ ...markDoc(row, c), file: c.file, stmt: c.start }));
    }
    fs.writeFileSync(out, lines.length ? lines.join('\n') + '\n' : '');
  } else if (t.kind === 'placement') {
    const o = {};
    for (const [id, target] of t.rows) {
      r.total++;
      const c = carryDeclId(id);
      if (c.reason) { drop(c.reason, { id, target }); continue; }
      if (o[c.id] !== undefined) { r.collisions++; if (JSON.stringify(o[c.id]) !== JSON.stringify(target)) drop('collision', { id, target, with: o[c.id] }); continue; }
      ok(c.status);
      countC(c);
      o[c.id] = target;
    }
    fs.writeFileSync(out, JSON.stringify(o, null, 1) + '\n');
  } else if (t.kind === 'worker') {
    const rows = [];
    for (const row of t.rows) {
      r.total++;
      if (!row.name) { r.dropped.unnamed = (r.dropped.unnamed ?? 0) + 1; continue; } // skeleton rows; tools/naming/worker-bindings.mjs regenerates them
      const c = carryOffset(WORKER, row.at);
      if (c.reason) { drop(c.reason, row, c.unit); continue; }
      if (c.file !== WORKER) { drop('left-the-worker', row); continue; }
      ok(c.status);
      countC(c);
      rows.push({ ...markName(row, c), at: c.off });
    }
    rows.sort((a, b) => a.at - b.at);
    fs.writeFileSync(out, '[\n' + rows.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n');
  }
  reportTables[t.name] = r;
}
dropped.end();

const sum = (k) => Object.values(reportTables).filter((r) => r.kind === k).reduce((a, r) => { a.total += r.total; a.carried += r.carried; for (const [x, n] of Object.entries(r.dropped)) a.dropped[x] = (a.dropped[x] ?? 0) + n; for (const [x, n] of Object.entries(r.byStatus)) a.byStatus[x] = (a.byStatus[x] ?? 0) + n; return a; }, { total: 0, carried: 0, byStatus: {}, dropped: {} });
const report = {
  generated: new Date().toISOString(), oldTree: OLD, newTree: NEW, equiv: args.equiv, carryConflicts: CARRY_CONFLICTS, normalize: NORMALIZE,
  units: stats.units, hashCheck: stats.hashCheck, align: alignStats,
  // pairs made only by content similarity (to be spot-checked): old, new, Jaccard, token similarity, rows carried
  similarHome: [...how].filter(([, h]) => h === 'similar-home').map(([o]) => ({ old: o, new: pairOf.get(o), status: statusOf(o), jaccard: jaccardOf.get(o), similarity: alignSim.get(o) ?? null, carried: cCarried.get(o) ?? 0 })).sort((a, b) => b.carried - a.carried),
  totals: { offset: sum('offset'), id: sum('id'), placement: sum('placement'), stmt: sum('stmt'), worker: sum('worker') },
  tables: reportTables,
};
fs.writeFileSync(args.report, JSON.stringify(report, null, 1) + '\n');
// every pairing used (equiv.cjs's and the fallbacks), for lookups and audits
fs.writeFileSync(args.report.replace(/\.json$/, '') + '-unstable.jsonl', unstableList.map((x) => JSON.stringify(x)).join('\n') + (unstableList.length ? '\n' : ''));
fs.writeFileSync(args.report.replace(/\.json$/, '') + '-pairs.jsonl', [...pairOf].map(([o, n]) => JSON.stringify({ old: o, new: n, how: how.get(o), status: statusOf(o) })).join('\n') + '\n');
console.log(JSON.stringify({ units: report.units, align: report.align, totals: report.totals }, null, 1));

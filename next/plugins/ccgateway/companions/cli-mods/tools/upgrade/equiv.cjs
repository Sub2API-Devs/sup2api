// Structural equivalence of two restored Claude Code module trees.
//
// Every module-scope binding of every JS module is a unit. A unit's canonical
// form is its AST with identifiers classified by scope analysis (eslint-scope):
// locals become L<n> by first use, module bindings become M (the binding they
// resolve to, through imports and exports, is recorded in order as the unit's
// refs), globals keep their name, property names stay literal. Two units with
// the same canonical form and pairwise-mapped refs are the same logic.
//
// Pairing: units whose canonical hash is unique in both trees are paired, then
// pairs propagate through refs (the i-th ref of a pair maps to the i-th ref of
// its partner). A changed pair is aligned by a token diff and the refs in the
// equal stretches still propagate. Conflicts (one old unit reached as two new
// ones) are reported.
//
//   node equiv.cjs <old-root> <new-root> <seeds.json> <out.json>
// seeds.json: [{"file":"chunk-x.js","name":"FH"}, ...] (old tree names).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const rq = require;
const espree = rq('espree'), escope = rq('eslint-scope');
const [OLD, NEW, SEEDS, OUT] = process.argv.slice(2);
const SKIP = new Set(['range', 'start', 'end', 'loc', 'raw', 'comments', 'tokens', 'parent']);
const FILE_REF = /^(\.\/)?[\w./-]*?-[a-z0-9]{8}\.[a-z]+(\.zst)?$/;
// Build metadata (version, build time, commit) differs by construction; each
// pair [old, new] canonicalizes to one placeholder in its tree. By default the
// pairs are read from each tree's entry (cli.js VERSION, BUILD_TIME, GIT_SHA);
// EQUIV_NORMALIZE (JSON [[old,new],...]) replaces them.
const buildFacts = root => { const t = fs.readFileSync(path.join(root, 'cli.js'), 'utf8'); return ['VERSION', 'BUILD_TIME', 'GIT_SHA'].map(k => (new RegExp(k + ':"([^"]+)"').exec(t) ?? [])[1]); };
const NORMALIZE = process.env.EQUIV_NORMALIZE ? JSON.parse(process.env.EQUIV_NORMALIZE) : (() => { const o = buildFacts(OLD), n = buildFacts(NEW); return o.map((v, i) => [v, n[i]]).filter(([a, b]) => a && b && a !== b); })();
const normalized = side => new Map(NORMALIZE.map((pair, i) => [pair[side], '@' + i]));

function modulesOf(root) {
  const rec = JSON.parse(fs.readFileSync(path.join(root, 'reconstruction.json'), 'utf8'));
  return rec.modules.map(m => m.file);
}

function analyze(root, file, side = root === OLD ? 0 : 1) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = espree.parse(text, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const moduleScope = sm.scopes.find(s => s.type === 'module');
  const idVar = new Map();
  for (const s of sm.scopes) {
    for (const v of s.variables) for (const id of v.identifiers) idVar.set(id, v);
    for (const r of s.references) idVar.set(r.identifier, r.resolved ?? null);
  }
  return { text, ast, sm, moduleScope, idVar, norms: normalized(side) };
}

// canonical returns the token list of nodes, refs (module variables in order)
// and file references (string literals naming bundled files).
function canonical(a, nodes, self) {
  const tokens = [], refs = [], files = [], locals = new Map(), norms = a.norms;
  const emit = t => tokens.push(t);
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
      if (typeof n.value === 'string' && FILE_REF.test(n.value)) { emit('F'); files.push(n.value); return; }
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
  return { tokens, refs, files };
}

// unitNodes is what defines a module variable: its declaration, and for a
// declared-but-assigned variable every value written to it.
function unitNodes(a, v) {
  const out = [];
  for (const d of v.defs) {
    if (d.type === 'FunctionName' || d.type === 'ClassName') out.push(d.node);
    else if (d.type === 'Variable') { out.push(d.node.id.type === 'Identifier' ? d.node.init : d.node); }
    else if (d.type === 'ImportBinding') out.push({ type: 'Import' });
  }
  for (const r of v.references) if (r.isWrite() && r.writeExpr && !v.defs.some(d => d.node.init === r.writeExpr)) out.push(r.writeExpr);
  return out;
}

function indexTree(root) {
  // The index is cached beside the output, keyed by the tree and normalization.
  const cacheFile = path.join(path.dirname(path.resolve(OUT)), 'equiv-index-' + crypto.createHash('sha256').update(path.resolve(root) + JSON.stringify(NORMALIZE)).digest('hex').slice(0, 12) + '.json');
  if (fs.existsSync(cacheFile)) {
    const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    return { root, units: new Map(c.units), modules: new Map(c.modules.map(([f, m]) => [f, { imports: new Map(m.imports), exports: new Map(m.exports), stars: m.stars }])) };
  }
  const t = indexTreeUncached(root);
  fs.writeFileSync(cacheFile, JSON.stringify({ units: [...t.units], modules: [...t.modules].map(([f, m]) => [f, { imports: [...m.imports], exports: [...m.exports], stars: m.stars }]) }));
  return t;
}
function indexTreeUncached(root) {
  const units = new Map(), modules = new Map();
  let n = 0;
  for (const file of modulesOf(root)) {
    if (!file.endsWith('.js')) continue;
    let a;
    try { a = analyze(root, file); } catch (e) { console.error('parse', root, file, e.message); continue; }
    const imports = new Map(), exports = new Map(), stars = [];
    for (const node of a.ast.body) {
      if (node.type === 'ImportDeclaration') for (const s of node.specifiers) imports.set(s.local.name, { from: norm(file, node.source.value), imported: s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*' });
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
    modules.set(file, { imports, exports, stars });
    for (const v of a.moduleScope.variables) {
      if (imports.has(v.name)) continue;
      const nodes = unitNodes(a, v);
      const c = canonical(a, nodes, v.name);
      const hash = crypto.createHash('sha256').update(c.tokens.join('\u0001')).digest('hex').slice(0, 24);
      units.set(file + ':' + v.name, { hash, refs: c.refs, files: c.files, size: c.tokens.length });
    }
    if (++n % 250 === 0) console.error(root, n);
  }
  return { units, modules, root };
}
function norm(file, spec) { return spec.startsWith('./') ? path.posix.join(path.posix.dirname(file), spec) : spec; }

// resolve turns a module variable used in file into the unit that defines it.
function resolver(tree) {
  const memo = new Map();
  function exported(file, name, seen = new Set()) {
    const key = file + '|' + name;
    if (memo.has(key)) return memo.get(key);
    if (seen.has(key)) return null; seen.add(key);
    const m = tree.modules.get(file);
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
    const im = tree.modules.get(file)?.imports.get(name);
    if (im) return exported(im.from, im.imported, seen) ?? ('unresolved:' + im.from + ':' + im.imported);
    return file + ':' + name;
  }
  local.exported = exported;
  return local;
}

const oldTree = indexTree(OLD), newTree = indexTree(NEW);
const resOld = resolver(oldTree), resNew = resolver(newTree);
const refsOf = (tree, res, key) => { const u = tree.units.get(key); if (!u) return []; const file = key.slice(0, key.lastIndexOf(':')); return u.refs.map(r => res(file, r)); };

// Unique hashes pair first.
const byHash = units => { const m = new Map(); for (const [k, u] of units) { if (u.size < 12) continue; (m.get(u.hash) ?? m.set(u.hash, []).get(u.hash)).push(k); } return m; };
const oh = byHash(oldTree.units), nh = byHash(newTree.units);
const map = new Map(), via = new Map(), conflicts = [], claimed = new Map();
const queue = [];
// A pairing is one-to-one: an old unit reached as a second new unit, or a new
// unit already claimed by another old unit, is a conflict (kind) and is not
// paired again. Both usually mean callers moved to another function.
function pair(o, n, how) {
  if (!oldTree.units.has(o) || !newTree.units.has(n)) return;
  const had = map.get(o);
  if (had) { if (had !== n) conflicts.push({ kind: 'old-reached-twice', old: o, first: had, second: n, how }); return; }
  const owner = claimed.get(n);
  if (owner !== undefined && owner !== o) { conflicts.push({ kind: 'new-claimed-twice', old: o, first: n, second: n, owner, how }); return; }
  map.set(o, n); claimed.set(n, o); via.set(o, how); queue.push(o);
}
for (const [h, ks] of oh) { const ns = nh.get(h); if (ks.length === 1 && ns?.length === 1) pair(ks[0], ns[0], 'unique-hash'); }
// Exports with real (not minified) names pair by name when unique in both.
const named = tree => { const m = new Map(); for (const [file, mod] of tree.modules) for (const [ex, e] of mod.exports) { if (!e.local || !/^[a-zA-Z_$][\w$]{5,}$/.test(ex) || !/[a-z]{3}/.test(ex)) continue; (m.get(ex) ?? m.set(ex, []).get(ex)).push(file + ':' + e.local); } return m; };
const on = named(oldTree), nn = named(newTree);
for (const [ex, ks] of on) { const ns = nn.get(ex); if (ks.length === 1 && ns?.length === 1) pair(ks[0], ns[0], 'export-name'); }
const seeds = JSON.parse(fs.readFileSync(SEEDS, 'utf8'));
for (const s of seeds) if (s.newKey) pair(s.file + ':' + s.name, s.newKey, 'seed');

// Changed units are aligned token by token (Myers diff on the canonical tokens,
// recomputed from source).
const cache = new Map();
function tokensOf(tree, key) {
  const file = key.slice(0, key.lastIndexOf(':')), name = key.slice(key.lastIndexOf(':') + 1);
  if (!cache.has(tree.root + file)) { if (cache.size > 6) cache.delete(cache.keys().next().value); cache.set(tree.root + file, analyze(tree.root, file)); }
  const a = cache.get(tree.root + file), v = a.moduleScope.set.get(name);
  return canonical(a, unitNodes(a, v), name);
}
function myers(a, b) {
  const n = a.length, m = b.length, max = n + m, v = new Map([[1, 0]]), trace = [];
  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))) ? v.get(k + 1) : v.get(k - 1) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v.set(k, x);
      if (x >= n && y >= m) return backtrack(trace, a, b, d);
    }
    if (d > 4000) return null;
  }
}
function backtrack(trace, a, b, dEnd) {
  let x = a.length, y = b.length; const same = [];
  for (let d = dEnd; d > 0; d--) {
    const v = trace[d], k = x - y;
    const prevK = (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))) ? k + 1 : k - 1;
    const px = v.get(prevK), py = px - prevK;
    while (x > px && y > py) { same.push([x - 1, y - 1]); x--; y--; }
    x = px; y = py;
  }
  while (x > 0 && y > 0) { same.push([x - 1, y - 1]); x--; y--; }
  return same.reverse();
}

const result = new Map();
while (queue.length) {
  const o = queue.shift(), n = map.get(o);
  const uo = oldTree.units.get(o), un = newTree.units.get(n);
  const ro = refsOf(oldTree, resOld, o), rn = refsOf(newTree, resNew, n);
  if (uo.hash === un.hash) {
    result.set(o, { new: n, status: 'same' });
    ro.forEach((r, i) => pair(r, rn[i], 'ref:' + o));
    continue;
  }
  const status = { new: n, status: 'changed', oldSize: uo.size, newSize: un.size };
  if (uo.size + un.size < 400000) {
    const to = tokensOf(oldTree, o), tn = tokensOf(newTree, n);
    const same = myers(to.tokens, tn.tokens);
    if (same) {
      const mo = [], mn = []; let io = 0, inn = 0;
      to.tokens.forEach((t, i) => { if (t === 'M') mo[i] = io++; });
      tn.tokens.forEach((t, i) => { if (t === 'M') mn[i] = inn++; });
      for (const [i, j] of same) if (to.tokens[i] === 'M') { const a = ro[mo[i]], b = rn[mn[j]]; if (a && b) pair(a, b, 'aligned:' + o); }
      status.diffTokens = to.tokens.length + tn.tokens.length - 2 * same.length;
      // Similarity below ~0.3 usually means the pair itself is wrong (an
      // unrelated function reached by position); check it before trusting it.
      status.similarity = Math.round(1000 * 2 * same.length / (to.tokens.length + tn.tokens.length)) / 1000;
      status.how = via.get(o);
      // Global-name and literal differences are what the change is made of.
      const so = new Set(same.map(p => p[0])), sn = new Set(same.map(p => p[1]));
      status.removed = to.tokens.filter((t, i) => !so.has(i)).slice(0, 60).join(' ');
      status.added = tn.tokens.filter((t, i) => !sn.has(i)).slice(0, 60).join(' ');
    }
  }
  result.set(o, status);
}

// Report every seed and its reachable closure (depth by refs in the old tree).
const report = [];
for (const s of seeds) {
  const key = s.file + ':' + s.name;
  const viaExport = oldTree.modules.get(s.file)?.exports.get(s.name);
  const root = viaExport && !oldTree.units.has(s.file + ':' + s.name) ? resOld.exported(s.file, s.name) : resOld(s.file, s.name);
  const depth = new Map([[root, 0]]), order = [root];
  for (let i = 0; i < order.length; i++) {
    const k = order[i], d = depth.get(k);
    if (d >= (s.depth ?? 3)) continue;
    for (const r of refsOf(oldTree, resOld, k)) if (!depth.has(r) && oldTree.units.has(r)) { depth.set(r, d + 1); order.push(r); }
  }
  const closure = order.map(k => ({ key: k, depth: depth.get(k), ...(result.get(k) ?? { status: map.has(k) ? 'pending' : 'unmapped' }) }));
  report.push({ seed: key, resolved: root, new: map.get(root) ?? null, status: result.get(root)?.status ?? 'unmapped',
    closure: { total: closure.length, same: closure.filter(c => c.status === 'same').length,
      changed: closure.filter(c => c.status === 'changed'), conflicts: conflicts.filter(c => depth.has(c.old)), unmapped: closure.filter(c => c.status === 'unmapped').map(c => c.key) } });
}
const all = [...result.values()];
fs.writeFileSync(OUT, JSON.stringify({ oldUnits: oldTree.units.size, newUnits: newTree.units.size, mapped: map.size,
  same: all.filter(r => r.status === 'same').length, changed: all.filter(r => r.status === 'changed').length,
  conflicts, map: Object.fromEntries(map), report }, null, 1));
console.log(JSON.stringify({ oldUnits: oldTree.units.size, newUnits: newTree.units.size, mapped: map.size, conflicts: conflicts.length,
  seeds: report.map(r => [r.seed, r.new, r.status, r.closure.total, r.closure.same, r.closure.changed.length, r.closure.unmapped.length]) }));

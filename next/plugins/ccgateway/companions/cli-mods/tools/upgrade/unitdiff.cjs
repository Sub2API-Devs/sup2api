// Readable diff of paired units: both sides with identifiers made comparable
// (module bindings by their old-tree name, the new tree's through the pairing
// map; locals numbered by first use; globals as they are), reprinted by
// esbuild, then diffed.
//   node unitdiff.cjs <old-root> <new-root> <equiv.json> <out-dir> <old-key>...
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const rq = require;
const espree = rq('espree'), escope = rq('eslint-scope'), esbuild = rq('esbuild');
const [OLD, NEW, EQUIV, OUT, ...keys] = process.argv.slice(2);
const eq = JSON.parse(fs.readFileSync(EQUIV, 'utf8'));
const inverse = new Map(Object.entries(eq.map).map(([o, n]) => [n, o]));
const cache = new Map();
function analyze(root, file) {
  const k = root + file;
  if (cache.has(k)) return cache.get(k);
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = espree.parse(text, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const moduleScope = sm.scopes.find(s => s.type === 'module'), idVar = new Map(), imports = new Map();
  for (const s of sm.scopes) {
    for (const v of s.variables) for (const id of v.identifiers) idVar.set(id, v);
    for (const r of s.references) idVar.set(r.identifier, r.resolved ?? null);
  }
  for (const n of ast.body) if (n.type === 'ImportDeclaration') for (const s of n.specifiers)
    imports.set(s.local.name, { from: path.posix.join(path.posix.dirname(file), n.source.value), imported: s.imported?.name ?? 'default' });
  const exports = new Map();
  for (const n of ast.body) if (n.type === 'ExportNamedDeclaration' && !n.source) for (const s of n.specifiers) exports.set(s.exported.name, s.local.name);
  const a = { text, ast, moduleScope, idVar, imports, exports, file };
  cache.set(k, a); return a;
}
function resolve(root, file, name, depth = 0) {
  const a = analyze(root, file), im = a.imports.get(name);
  if (!im || depth > 8 || !fs.existsSync(path.join(root, im.from))) return file + ':' + name;
  const b = analyze(root, im.from), local = b.exports.get(im.imported);
  return local ? resolve(root, im.from, local, depth + 1) : im.from + ':' + im.imported;
}
function render(root, key, side) {
  const file = key.slice(0, key.lastIndexOf(':')), name = key.slice(key.lastIndexOf(':') + 1);
  const a = analyze(root, file), v = a.moduleScope.set.get(name);
  if (!v) return `/* ${key} not found */`;
  const parts = [];
  for (const d of v.defs) {
    if (d.type === 'FunctionName' || d.type === 'ClassName') parts.push([d.node, '']);
    else if (d.type === 'Variable' && d.node.init) parts.push([d.node.init, 'SELF = ']);
  }
  for (const r of v.references) if (r.isWrite() && r.writeExpr && !v.defs.some(d => d.node.init === r.writeExpr)) parts.push([r.writeExpr, 'SELF = ']);
  const locals = new Map();
  const out = [];
  for (const [node, prefix] of parts) {
    const edits = [];
    const label = id => {
      const w = a.idVar.get(id);
      if (w === null) return id.name;
      if (w.scope === a.moduleScope) {
        if (w.name === name) return 'SELF';
        const target = resolve(root, file, w.name);
        const oldKey = side === 'old' ? target : inverse.get(target);
        return oldKey ? oldKey.slice(oldKey.lastIndexOf(':') + 1).replace(/^/, '$m_') : '$NEW_' + target.replace(/[^\w$]/g, '_');
      }
      if (!locals.has(w)) locals.set(w, locals.size);
      return '$l' + locals.get(w);
    };
    (function walk(n, parent) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(c => walk(c, parent)); return; }
      if (n.type === 'Property' && n.shorthand && n.value.type === 'Identifier' && a.idVar.has(n.value)) {
        edits.push([n.range[0], n.range[1], n.key.name + ':' + label(n.value)]); return;
      }
      if (n.type === 'Identifier' && a.idVar.has(n)) { edits.push([n.range[0], n.range[1], label(n)]); return; }
      for (const k of Object.keys(n)) if (!['range', 'loc', 'parent'].includes(k)) walk(n[k], n);
    })(node);
    let text = a.text.slice(node.range[0], node.range[1]);
    for (const [s, e, t] of edits.sort((x, y) => y[0] - x[0])) text = text.slice(0, s - node.range[0]) + t + text.slice(e - node.range[0]);
    out.push(prefix + text + ';');
  }
  let code = out.join('\n');
  try { code = esbuild.transformSync(code, { loader: 'js', format: 'esm', minify: false }).code; } catch (e) { code = '/* esbuild: ' + e.message.split('\n')[0] + ' */\n' + code; }
  return code;
}
fs.mkdirSync(OUT, { recursive: true });
for (const key of keys) {
  const newKey = eq.map[key];
  const safe = key.replace(/[^\w$.-]/g, '_');
  const o = path.join(OUT, safe + '.old.js'), n = path.join(OUT, safe + '.new.js');
  fs.writeFileSync(o, render(OLD, key, 'old'));
  fs.writeFileSync(n, newKey ? render(NEW, newKey, 'new') : '/* unmapped */');
  let diff = '';
  try { diff = execFileSync('git', ['diff', '--no-index', '--no-color', '-U3', o, n], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
  catch (e) { diff = e.stdout; }
  fs.writeFileSync(path.join(OUT, safe + '.diff'), `# ${key} -> ${newKey}\n` + diff);
  console.log(key, '->', newKey, 'diff lines', diff.split('\n').filter(l => /^[-+][^-+]/.test(l)).length);
}

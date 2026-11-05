// Runs native functions of a recovered Claude Code tree in Node: a top-level
// binding is evaluated with only the declarations it reads (within its module,
// the closure of the top-level declarations it references; across modules,
// its imports, followed to their definitions). What a pure function touches of
// CC's runtime (feature flags, telemetry, session services) is given by
// overrides, keyed file:name at the binding's definition; anything else runs
// as CC wrote it. A module's own export alias (export {a as b}) resolves to
// its declaration, so a binding a patch exports can be named as the patched
// tree names it; texts gives a module's text instead of the tree's (a module
// as the patch writes it). A dependency that cannot run here (a session
// service evaluated at load) is left undefined, as for a function that never
// reaches it: the tests compare what the functions return. Shared by the
// native tests (test/native/<version>/).
//   const { get } = nativeClosure(root, overrides); const nD = get('chunk-sva49n74.js', 'nD');
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const packageFile = process.env.CCG_BABEL_PACKAGE || fileURLToPath(new URL('../package.json', import.meta.url));
const parser = createRequire(packageFile)('@babel/parser');
const require = createRequire(import.meta.url);

export function nativeClosure(root, overrides = {}, texts = {}) {
  const base = root instanceof URL ? fileURLToPath(root) : root;
  const files = new Map(), values = new Map(), inProgress = new Set();
  function load(file) {
    if (files.has(file)) return files.get(file);
    const text = Object.hasOwn(texts, file) ? texts[file] : fs.readFileSync(path.join(base, file), 'utf8');
    const ast = parser.parse(text, { sourceType: 'module' });
    const decls = new Map(), imports = new Map(), exports = new Map();
    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration') {
        for (const s of node.specifiers) imports.set(s.local.name, { from: node.source.value, imported: s.imported ? s.imported.name : 'default' });
      } else if (node.type === 'ExportNamedDeclaration' && !node.declaration && !node.source) {
        for (const s of node.specifiers) exports.set(s.exported.name, s.local.name);
      } else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
        decls.set(node.id.name, { node, src: text.slice(node.start, node.end), start: node.start });
      } else if (node.type === 'VariableDeclaration') {
        for (const d of node.declarations) if (d.id.type === 'Identifier') decls.set(d.id.name, { node: d, src: `var ${text.slice(d.start, d.end)};`, start: d.start });
      }
    }
    const loaded = { decls, imports, exports };
    files.set(file, loaded);
    return loaded;
  }
  function pattern(p, out) {
    if (!p) return;
    if (p.type === 'Identifier') out.add(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach(q => pattern(q.type === 'RestElement' ? q.argument : q.value, out));
    else if (p.type === 'ArrayPattern') p.elements.forEach(q => pattern(q, out));
    else if (p.type === 'AssignmentPattern') pattern(p.left, out);
    else if (p.type === 'RestElement') pattern(p.argument, out);
  }
  // The names a declaration reads, and the ones it binds itself.
  function identifiers(node) {
    const used = new Set(), local = new Set();
    (function walk(n, parent, key) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(x => walk(x, parent, key)); return; }
      if (n.type === 'Identifier') {
        const member = parent && (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && key === 'property' && !parent.computed;
        const property = parent && ['ObjectProperty', 'ObjectMethod', 'ClassMethod', 'ClassProperty', 'ClassPrivateProperty'].includes(parent.type) && key === 'key' && !parent.computed;
        if (!member && !property && parent?.type !== 'PrivateName') used.add(n.name);
      }
      if (n.type === 'VariableDeclarator') pattern(n.id, local);
      if (/Function/.test(n.type)) { if (n.id && parent !== null) local.add(n.id.name); for (const p of n.params ?? []) pattern(p, local); }
      if (n.type === 'CatchClause' && n.param) pattern(n.param, local);
      if (n.type === 'ClassDeclaration' && n.id && parent !== null) local.add(n.id.name);
      for (const [k, v] of Object.entries(n)) {
        if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(k)) continue;
        if (v && typeof v === 'object') walk(v, n, k);
      }
    })(node, null, null);
    return { used, local };
  }
  function resolve(file, name, depth = 0) {
    const module = load(file);
    if (module.decls.has(name)) return { file, name };
    if (module.exports.has(name) && module.exports.get(name) !== name && depth < 30) return resolve(file, module.exports.get(name), depth + 1);
    const imported = module.imports.get(name);
    if (imported && imported.from.startsWith('./') && depth < 30) {
      const target = imported.from.slice(2);
      return resolve(target, load(target).exports.get(imported.imported) ?? imported.imported, depth + 1);
    }
    return { file, name, external: imported?.from, imported: imported?.imported };
  }
  const key = (file, name) => file + ':' + name;
  function get(file, name) {
    const found = resolve(file, name), id = key(found.file, found.name);
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (values.has(id)) return values.get(id);
    if (found.external !== undefined || !load(found.file).decls.has(found.name)) {
      const external = found.external ? require(found.external) : undefined;
      const value = external === undefined ? undefined : found.imported === 'default' ? external.default ?? external : external[found.imported];
      values.set(id, value);
      return value;
    }
    if (inProgress.has(id)) return undefined;
    inProgress.add(id);
    const module = load(found.file), need = new Set([found.name]), queue = [found.name], imports = new Set();
    while (queue.length) {
      const current = queue.pop();
      const { used, local } = identifiers(module.decls.get(current).node);
      for (const u of used) {
        if (u === current || local.has(u)) continue;
        if (module.decls.has(u)) {
          if (Object.hasOwn(overrides, key(found.file, u))) imports.add(u);
          else if (!need.has(u)) { need.add(u); queue.push(u); }
        } else if (module.imports.has(u)) imports.add(u);
      }
    }
    const ordered = [...need].map(n => [n, module.decls.get(n)]).sort((a, b) => a[1].start - b[1].start);
    const params = [...imports].filter(u => !need.has(u));
    const args = params.map(u => { try { return get(found.file, u); } catch { return undefined; } });
    const body = ordered.map(([, d]) => d.src).join('\n') + `\nreturn {${ordered.map(([n]) => n).join(',')}};`;
    let scope;
    try {
      scope = vm.runInThisContext(`(function(${params.join(',')}){${body}\n})`)(...args);
    } catch (error) {
      inProgress.delete(id);
      throw Error(`evaluating ${id}: ${error.message}`);
    }
    for (const [n] of ordered) if (!values.has(key(found.file, n))) values.set(key(found.file, n), scope[n]);
    inProgress.delete(id);
    return scope[found.name];
  }
  return { get };
}

// Re-scans original/ for the vendor stage. Same declaration ids as
// tools/ast/scan.mjs (`${file}#${names[0] ?? '@' + start}`) but with the
// uncapped token set of tools/vendor/lib/common.mjs, the bundler-helper role
// of every binding, the CommonJS / lazy-ESM wrapper kind of each declaration
// and the ordered list of wrappers each wrapper calls (= its require() order).
//
//   node --max-old-space-size=12000 tools/vendor/scan-original.mjs [original] [analysis/vendor]
//
// Output:
//   <out>/index/orig-decls.jsonl  {id, file, idx, names, kind, shape, start, end, bytes,
//                                  units[{u, names, start, end, bytes, tokens[], deps[],
//                                  wrap: cjs|esm|null, calls[] (ordered unit ids), helper}]}
//                                  unit id = decl id + "~" + declarator index
//   <out>/helpers.json            per chunk: helper locals and their roles
//                                 (imported from the shared runtime chunk or
//                                 defined in place), plus the runtime chunk itself
//   <out>/index/orig-unparsed.json  modules Babel cannot parse (BOM resources)
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { collect, declaredNames, shapeOf, writeJsonl } from './lib/common.mjs';

const [root = 'original', out = 'analysis/vendor'] = process.argv.slice(2);
fs.mkdirSync(path.join(out, 'index'), { recursive: true });
const files = fs.readdirSync(root).filter((f) => /\.(js|mjs|cjs)$/.test(f)).sort();

// ---------- helper role classification (structural, names are ignored) ----------
// Each test sees the minified source of one declarator's initializer with
// every identifier replaced by `_`, so `(a,b)=>()=>(b||a(...` and
// `(e,t)=>()=>(t||e(...` normalise to the same text.
const ID = /(?<![.\w$])(?!(?:var|let|const|function|return|typeof|instanceof|in|of|for|if|else|try|catch|throw|new|void|null|this|true|false|delete|let|class|extends|super|import|meta|require|Object|Symbol|WeakMap|Reflect|exports|default|module|Module|__esModule|get|set|value|enumerable|configurable|writable)\b)[A-Za-z_$][\w$]*/g;
const norm = (s) => s.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(ID, '_');
const ROLES = [
  ['__commonJS', (t) => /^\(_,_\)=>(?:\(\)=>|function _?\(\)\{return )\(?_\|\|_\(\(_=\{exports:\{\}\}\)\.exports,_\),_\.exports/.test(t) || /^\(_,_\)=>function _\(\)\{return _\|\|\(0,_\[_\(_\)\[0\]\]\)\(\(_=\{exports:\{\}\}\)\.exports,_\),_\.exports\}/.test(t)],
  ['__esm', (t) => /^\(_,_(?:,_)?\)=>(?:\(\)=>\{if\(_\)try\{_=_\(_=0\)\}|function _?\(\)\{return _&&\(_=\(0,_\[_\(_\)\[0\]\]\)\(_=0\)\),_\})/.test(t)],
  ['__toESM', (t) => /__esModule/.test(t) && /""/.test(t) && /(create|getPrototypeOf|_\(_\(_\)\))/.test(t) && t.length < 700 && /=>/.test(t)],
  ['__export', (t) => /^\(_,_(?:,_)?\)=>\{(?:let _=\{\};)?for\(var _ in _\)_\(_,_,\{get:_\[_\],(?:set:_\[_\],)?enumerable:!0(?:,configurable:!0)?(?:,set:[^}]*)?\}\)/.test(t)],
  ['__copyProps', (t) => /^\(_,_,_,_\)=>\{if\(_&&typeof _===""\|\|typeof _===""\)\{for\(/.test(t)],
  ['__toCommonJS', (t) => /^\(?_\)?=>_\(_\(\{\},"",\{value:!0\}\),_\)$/.test(t)],
  ['__require', (t) => /^import\.meta\.require$/.test(t) || /^_\(import\.meta\.url\)$/.test(t)],
  ['react-compiler-sentinel', (t, raw) => /^Symbol\.for\("react\.(memo_cache|early_return)_sentinel"\)$/.test(raw)],
];
function roleOf(initSrc) {
  const t = norm(initSrc);
  for (const [r, test] of ROLES) if (test(t, initSrc)) return r;
  return null;
}

// ---------- pass 1: parse ----------
const mods = [];
const unparsed = [];
for (const file of files) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module' });
  } catch (e) {
    unparsed.push({ file, bytes: src.length, error: String(e.message).slice(0, 200) });
    continue;
  }
  const importLocal = new Map(); // local -> {from, name}
  const exportsMap = {};
  const decls = [];
  const helpers = {}; // local -> role (defined here)
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      for (const s of node.specifiers) importLocal.set(s.local.name, { from: node.source.value.replace(/^\.\//, ''), name: s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*' });
      continue;
    }
    if (node.type === 'ExportNamedDeclaration' && !node.declaration) {
      for (const s of node.specifiers) exportsMap[s.exported.name ?? s.exported.value] = s.local.name;
      continue;
    }
    if (node.type === 'ExportAllDeclaration') continue;
    const target = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration : node;
    const names = declaredNames(target);
    if (target.type === 'VariableDeclaration') {
      for (const d of target.declarations) {
        if (d.id.type === 'Identifier' && d.init) {
          const r = roleOf(src.slice(d.init.start, d.init.end));
          if (r) helpers[d.id.name] = r;
        }
      }
    }
    // Matching units: one per declarator of a var/let/const statement (Bun
    // merges adjacent var statements, possibly across source modules, and
    // pre-bundled dist files declare many CJS wrappers in one statement),
    // otherwise the whole statement.
    const parts = target.type === "VariableDeclaration" ? target.declarations : [target];
    const units = parts.map((p, u) => {
      const c = collect(p, { wantCalls: true });
      const nm = target.type === "VariableDeclaration" ? declaredNames({ type: "VariableDeclaration", declarations: [p] }) : names;
      return { u, names: nm, start: p.start, end: p.end, bytes: p.end - p.start, tokens: [...c.tokens], refSet: c.refs, callList: c.calls, target: wrapperCallee(p), body: wrapperBodyKind(p) };
    });
    decls.push({ id: `${file}#${names[0] ?? "@" + node.start}`, file, idx: decls.length, names, kind: target.type === "VariableDeclaration" ? target.kind : target.type, shape: shapeOf(target), start: node.start, end: node.end, bytes: node.end - node.start, units });
  }
  mods.push({ file, src, importLocal, exportsMap, decls, helpers });
}

// `var X = H(function(exports, module){...})` / `var X = H(() => {...})`
function wrapperCallee(p) {
  if (p.type !== 'VariableDeclarator') return null;
  const init = p.init;
  if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier' || init.arguments.length !== 1) return null;
  if (!/Function/.test(init.arguments[0].type)) return null;
  return init.callee.name;
}

// What a wrapper body is, when it is not ordinary code:
//   native   module.exports = require("./x.node")   (Bun-embedded .node addon)
//   resource module.exports = __cc_resource_N       (embedded text/data asset)
//   json     module.exports = { ...literal... }      (an imported .json file)
function wrapperBodyKind(p) {
  const fn = p.init?.arguments?.[0];
  if (!fn || !/Function/.test(fn.type)) return undefined;
  const body = fn.body.type === "BlockStatement" ? fn.body.body : [{ type: "ExpressionStatement", expression: fn.body }];
  if (body.length !== 1 || body[0].type !== "ExpressionStatement") return undefined;
  const e = body[0].expression;
  if (e.type !== "AssignmentExpression" || e.left.type !== "MemberExpression" || e.left.property?.name !== "exports") return undefined;
  const r = e.right;
  if (r.type === "CallExpression" && r.callee.name === "require" && /.node$/.test(r.arguments[0]?.value ?? "")) return "native";
  if (r.type === "Identifier" && /^__cc_resource_/.test(r.name)) return "resource";
  const lit = (n) => !n || /^(String|Numeric|Boolean|Null)Literal$/.test(n.type) || (n.type === "UnaryExpression" && lit(n.argument)) || (n.type === "ArrayExpression" && n.elements.every(lit)) || (n.type === "ObjectExpression" && n.properties.every((q) => q.type === "ObjectProperty" && !q.computed && lit(q.value)));
  if ((r.type === "ObjectExpression" || r.type === "ArrayExpression") && lit(r)) return "json";
  return undefined;
}

// ---------- pass 2: resolve helper roles across chunks ----------
const byFile = new Map(mods.map((m) => [m.file, m]));
function roleOfLocal(m, local, seen = 0) {
  if (m.helpers[local]) return m.helpers[local];
  const im = m.importLocal.get(local);
  if (im && seen < 5) {
    const t = byFile.get(im.from);
    const l = t?.exportsMap[im.name];
    if (t && l) return roleOfLocal(t, l, seen + 1);
  }
  return null;
}
const runtimeChunks = mods.filter((m) => Object.keys(m.helpers).length >= 3 && m.decls.length <= 12 && Object.values(m.exportsMap).every((l) => m.helpers[l] || m.decls.some((d) => d.names.includes(l)))).map((m) => m.file);
const helpersOut = { runtimeChunks, chunks: {} };
for (const m of mods) {
  const imported = {};
  for (const [local, im] of m.importLocal) {
    const r = roleOfLocal(m, local);
    if (r) imported[local] = { role: r, from: im.from, name: im.name };
  }
  // non-helper names exported by the runtime chunk (internals such as the
  // `{getPrototypeOf,defineProperty,...}=Object` aliases) are still runtime
  for (const [local, im] of m.importLocal) if (!imported[local] && runtimeChunks.includes(im.from)) imported[local] = { role: 'runtime-other', from: im.from, name: im.name };
  if (Object.keys(imported).length || Object.keys(m.helpers).length) helpersOut.chunks[m.file] = { imported, defined: m.helpers };
}

// ---------- pass 3: resolve refs/calls to declaration ids ----------
const declOfLocal = new Map(); // file#local -> id
const unitOfLocal = new Map(); // file#local -> id~u
for (const m of mods) for (const d of m.decls) {
  for (const n of d.names) declOfLocal.set(`${m.file}#${n}`, d.id);
  for (const un of d.units) for (const n of un.names) unitOfLocal.set(`${m.file}#${n}`, d.id + "~" + un.u);
}
function resolveLocal(m, name, seen = 0, unit = false) {
  const own = (unit ? unitOfLocal : declOfLocal).get(`${m.file}#${name}`);
  if (own) return own;
  const im = m.importLocal.get(name);
  if (!im || seen > 5) return null;
  const t = byFile.get(im.from);
  const l = t?.exportsMap[im.name];
  return t && l ? resolveLocal(t, l, seen + 1, unit) : null;
}
const rows = [];
for (const m of mods) {
  for (const d of m.decls) {
    const units = d.units.map((un) => {
      const own = new Set(un.names);
      const deps = new Set();
      for (const r of un.refSet) if (!own.has(r)) {
        const id = resolveLocal(m, r);
        if (id && id !== d.id) deps.add(id);
      }
      let wrap = null;
      if (un.target) {
        const role = roleOfLocal(m, un.target);
        if (role === "__commonJS") wrap = "cjs";
        else if (role === "__esm") wrap = "esm";
      }
      const calls = [];
      if (wrap) {
        const seen = new Set();
        for (const c of un.callList) {
          if (own.has(c)) continue;
          const id = resolveLocal(m, c, 0, true);
          if (id && !seen.has(id)) {
            seen.add(id);
            calls.push(id);
          }
        }
      }
      let helper = null;
      if (runtimeChunks.includes(m.file)) helper = "bun-runtime";
      else if (un.names.some((n) => m.helpers[n])) helper = "embedded-runtime:" + un.names.filter((n) => m.helpers[n]).map((n) => m.helpers[n]).join(",");
      return { u: un.u, names: un.names, start: un.start, end: un.end, bytes: un.bytes, tokens: un.tokens, deps: [...deps], wrap, calls, helper, body: wrap ? un.body : undefined };
    });
    rows.push({ id: d.id, file: d.file, idx: d.idx, names: d.names, kind: d.kind, shape: d.shape, start: d.start, end: d.end, bytes: d.bytes, units });
  }
}
writeJsonl(path.join(out, 'index/orig-decls.jsonl'), rows);
fs.writeFileSync(path.join(out, 'index/orig-unparsed.json'), JSON.stringify(unparsed, null, 1));
fs.writeFileSync(path.join(out, 'helpers.json'), JSON.stringify(helpersOut, null, 1));
console.log(JSON.stringify({ modules: mods.length, unparsed: unparsed.length, decls: rows.length, units: rows.reduce((a, r) => a + r.units.length, 0), cjs: rows.flatMap((r) => r.units).filter((u) => u.wrap === 'cjs').length, esm: rows.flatMap((r) => r.units).filter((u) => u.wrap === 'esm').length, runtimeChunks, chunksWithHelpers: Object.keys(helpersOut.chunks).length }));

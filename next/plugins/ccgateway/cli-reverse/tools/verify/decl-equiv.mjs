// Declaration-level equivalence of the reading tree with the official build.
//   node --max-old-space-size=8000 tools/verify/decl-equiv.mjs [reconstructed] [--out analysis/verify/decl-equiv]
// Input:  original/ (the official modules), analysis/scan/decls.jsonl (top-level declarations,
//         SCAN=1 bash tools/pipeline.sh), the reading tree's .js files.
// Output: <out>.json (counts, mismatch keys) and <out>.md (summary and the first mismatches).
//
// readable-check.mjs only checks that every declaration's provenance marker `//@ <module>:<start>-<end>`
// is there once; this check compares what follows the marker with the original bytes. For every
// declaration both sides are reduced to a fingerprint that ignores what renaming, the deminify rules
// and the reading tree's layout are allowed to change, and keeps everything else:
//   - the reading-tree side: statements from one marker up to the next; `export` is dropped,
//     `deferInit("<at>", () => { … })` is unwrapped and `var X;` + deferred `X = init` becomes `var X = init`
//   - both sides: canonicalize() of tools/emit/deminify.mjs (the canonical form of the deminify
//     equivalence check), then every binding is replaced by the order in which it first appears in the
//     declaration (so a renaming has to be consistent: two names that were one binding stay one, two
//     bindings stay two), names that resolve to nothing are kept when they are globals, property names,
//     literals and the whole tree shape are kept as they are; `var`/`let`/`const` is not compared
//     (the reading tree turns deferred `const` into `var`), the count of kind changes is reported
// Equal fingerprints mean the declaration is the original one up to a consistent renaming and the
// deminify rewrites, on every line, executed by the 98 scenarios or not.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generator from '@babel/generator';
import * as t from '@babel/types';
import { canonicalize } from '../emit/deminify.mjs';

const traverse = _traverse.default ?? _traverse;
const generate = _generator.generate ?? _generator.default ?? _generator;
const argv = process.argv.slice(2);
const ROOT = argv.find((a) => !a.startsWith('--')) ?? 'reconstructed';
const OUT = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'analysis/verify/decl-equiv';
const SHOW = 40;
let dynImports = 0;
let requires = 0;

const GLOBALS = new Set(Object.getOwnPropertyNames(globalThis).concat(['require', 'module', 'exports', '__dirname', '__filename', 'Bun', 'process', 'Buffer', 'global', 'window', 'document', 'navigator', 'self', 'arguments', 'undefined', 'globalThis', 'HTMLElement', 'Element', 'Node', 'location', 'Deno', 'XMLHttpRequest', 'ActiveXObject', 'importScripts', 'WorkerGlobalScope', 'define', 'chrome', 'localStorage', 'sessionStorage', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'Image', 'CSS', 'NodeFilter', 'DOMParser', 'XMLSerializer', '__webpack_require__', 'Intl']));
const parseFile = (code) => parse(code, { sourceType: 'module', plugins: ['jsx', 'importAttributes'], errorRecovery: false, attachComment: true });
const SKIP = new Set(['start', 'end', 'loc', 'range', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'shorthand', 'name']);

// top-level binding names of a module (declarations and import locals): a free name of a declaration
// that is one of them refers to the module, not to a global
function topNames(program) {
  const s = new Set();
  const add = (id) => { for (const n of Object.keys(t.getBindingIdentifiers(id))) s.add(n); };
  for (let n of program.body) {
    if (t.isImportDeclaration(n)) { for (const sp of n.specifiers) s.add(sp.local.name); continue; }
    if ((t.isExportNamedDeclaration(n) || t.isExportDefaultDeclaration(n)) && n.declaration) n = n.declaration;
    if (t.isVariableDeclaration(n)) for (const d of n.declarations) add(d.id);
    else if ((t.isFunctionDeclaration(n) || t.isClassDeclaration(n)) && n.id) s.add(n.id.name);
  }
  return s;
}

// statements -> { fp, code, kinds }
function fingerprint(stmts, fileTop) {
  const kinds = [];
  const file = t.file(t.program(stmts.map((s) => t.cloneNode(s, true, true))));
  // empty statements in statement lists are no-ops (the reading tree's printer drops a stray `;`);
  // drop them before canonicalize() so that a block left with one statement is unwrapped on both sides
  (function dropEmpty(n) {
    if (!n || typeof n.type !== 'string') return;
    for (const k of t.VISITOR_KEYS[n.type] ?? []) {
      if (Array.isArray(n[k])) { if (k === 'body' || k === 'consequent') n[k] = n[k].filter((x) => !t.isEmptyStatement(x)); n[k].forEach(dropEmpty); }
      else dropEmpty(n[k]);
    }
  })(file.program);
  canonicalize(file);
  const ident = new Map(); // Identifier node -> identity (Binding object or string)
  traverse.cache.clear();
  traverse(file, {
    'Identifier|JSXIdentifier'(p) {
      const name = p.node.name;
      if (name.startsWith('$import:')) { ident.set(p.node, name); return; }
      if (!(p.isReferencedIdentifier() || p.isBindingIdentifier())) return;
      // labels are not bindings (and are not renamed): compared by name
      if (p.key === 'label') return;
      // the name of a function/class declaration is bound in the enclosing scope; Babel resolves it
      // from the declaration's own scope, where a parameter or local of the same name would shadow it
      const own = p.key === 'id' && (p.parentPath.isFunctionDeclaration() || p.parentPath.isClassDeclaration());
      let b = own ? p.parentPath.scope.parent.getBinding(name) : p.scope.getBinding(name);
      // the name of a function/class expression shadowed by its own parameter or local: a binding of its own
      if (!own && p.key === 'id' && (p.parentPath.isFunctionExpression() || p.parentPath.isClassExpression()) && b?.identifier !== p.node) b = p.node;
      if (b) ident.set(p.node, b);
      else if (fileTop.has(name)) ident.set(p.node, 'top:' + name);
      else ident.set(p.node, null); // global or unknown: compared by name
    },
    VariableDeclaration(p) { kinds.push(p.node.kind); },
  });
  const order = new Map();
  const out = [];
  const KEYED = new Set(['ObjectProperty', 'ObjectMethod', 'ClassProperty', 'ClassMethod', 'ClassAccessorProperty']);
  const ser = (n) => {
    if (n === null || n === undefined) { out.push('~'); return; }
    // empty statements are no-ops (the reading tree's printer drops a stray `;`)
    if (Array.isArray(n)) { out.push('['); for (const x of n) if (!t.isEmptyStatement(x)) ser(x); out.push(']'); return; }
    if (typeof n !== 'object') { out.push(typeof n === 'bigint' ? n + 'n' : JSON.stringify(n)); return; }
    if (typeof n.type !== 'string') { out.push(JSON.stringify(n)); return; }
    // import("<module>"): the official chunk name and the reading-tree path differ; the target is
    // checked by the build (every import resolves) and by the runtime comparison
    if (n.type === 'ImportExpression' && t.isStringLiteral(n.source)) { dynImports++; out.push('(ImportExpression#module options='); ser(n.options); out.push(')'); return; }
    // the same for require("./<module>") of a free require
    if (t.isCallExpression(n) && t.isIdentifier(n.callee, { name: 'require' }) && ident.get(n.callee) === null && n.arguments.length === 1 && t.isStringLiteral(n.arguments[0]) && n.arguments[0].value.startsWith('.')) { requires++; out.push('(require#module)'); return; }
    // a && (b && c) and (a && b) && c evaluate the same operands in the same order with the same
    // result; the same for ||
    if (t.isLogicalExpression(n) && (n.operator === '&&' || n.operator === '||')) {
      const ops = [];
      const flat = (e) => { if (t.isLogicalExpression(e, { operator: n.operator })) { flat(e.left); flat(e.right); } else ops.push(e); };
      flat(n);
      out.push('(Logical' + n.operator);
      ser(ops);
      out.push(')');
      return;
    }
    out.push('(' + n.type);
    if (t.isIdentifier(n) || t.isJSXIdentifier(n)) {
      if (ident.has(n) && ident.get(n) !== null) {
        const k = ident.get(n);
        // imports: the module path and the export name differ between the official chunk and the
        // reading-tree file; the import is one binding, numbered like any other
        if (!order.has(k)) order.set(k, order.size);
        out.push('#' + order.get(k));
      } else out.push('N:' + n.name);
    }
    for (const k of Object.keys(n).sort()) {
      if (SKIP.has(k) || k === 'type' || k.startsWith('_')) continue;
      if (k === 'kind' && n.type === 'VariableDeclaration') continue;
      if (k === 'decorators' && !n[k]?.length) continue;
      out.push(k + '=');
      // property names: `0`, `"0"` and `a`, `"a"` name the same property
      if (k === 'key' && KEYED.has(n.type) && !n.computed && (t.isIdentifier(n.key) || t.isStringLiteral(n.key) || t.isNumericLiteral(n.key))) {
        out.push('K:' + JSON.stringify(String(t.isIdentifier(n.key) ? n.key.name : n.key.value)));
        continue;
      }
      ser(n[k]);
    }
    out.push(')');
  };
  ser(file.program.body);
  const fp = out.join('');
  return { fp, hash: crypto.createHash('sha1').update(fp).digest('hex'), file, kinds: kinds.join(',') };
}

// ---------- official side ----------
const declsByFile = new Map();
for (const l of fs.readFileSync('analysis/scan/decls.jsonl', 'utf8').split('\n')) {
  if (!l) continue;
  const d = JSON.parse(l);
  if (!declsByFile.has(d.file)) declsByFile.set(d.file, []);
  declsByFile.get(d.file).push(d);
}
// key -> node(s) of the official module that the declaration covers
function officialStmts(program, d) {
  for (let n of program.body) {
    if (n.start === d.start && n.end === d.end) {
      if ((t.isExportNamedDeclaration(n) || t.isExportDefaultDeclaration(n)) && n.declaration) n = t.isExpression(n.declaration) ? t.expressionStatement(n.declaration) : n.declaration;
      return [n];
    }
    let decl = n;
    if ((t.isExportNamedDeclaration(n)) && n.declaration) decl = n.declaration;
    if (decl.start === d.start && decl.end === d.end) return [decl];
    // expression statements are recorded with the range of the expression (no `;`)
    if (t.isExpressionStatement(n) && n.expression.start === d.start && n.expression.end === d.end) return [n];
    if (t.isVariableDeclaration(decl) && decl.start <= d.start && d.end <= decl.end)
      for (const v of decl.declarations) if (v.start === d.start && v.end === d.end) return [t.variableDeclaration(decl.kind, [v])];
  }
  return null;
}

const t0 = Date.now();
const official = new Map(); // key -> {hash, kinds}
const unlocated = [];
const uncovered = []; // top-level statements of an official module that no declaration covers
for (const [file, decls] of declsByFile) {
  const prog = parseFile(fs.readFileSync(path.join('original', file), 'utf8')).program;
  const top = topNames(prog);
  const covered = new Set();
  for (const d of decls) {
    const key = `${file}:${d.start}-${d.end}`;
    const stmts = officialStmts(prog, d);
    if (!stmts) { unlocated.push(key); continue; }
    const f = fingerprint(stmts, top);
    official.set(key, { hash: f.hash, kinds: f.kinds });
    covered.add(d.start);
  }
  for (const n of prog.body) {
    if (t.isImportDeclaration(n) || (t.isExportNamedDeclaration(n) && !n.declaration) || t.isExportAllDeclaration(n)) continue;
    const inner = t.isExportNamedDeclaration(n) && n.declaration ? n.declaration : n;
    const starts = t.isVariableDeclaration(inner) ? inner.declarations.map((v) => v.start) : [];
    if (!covered.has(n.start) && !covered.has(inner.start) && !starts.some((s) => covered.has(s))) uncovered.push(`${file}:${n.start}-${n.end} ${n.type}`);
  }
}
console.error(`official: ${official.size} declarations, ${unlocated.length} not located, ${uncovered.length} statements not covered (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

// ---------- reading-tree side ----------
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!(d === ROOT && ['assets', 'dist', 'node_modules'].includes(e.name))) walk(p); }
    else if (/\.[cm]?js$/.test(e.name)) files.push(p);
  }
})(ROOT);

const MARK = /^@ (\S+?:\d+-\d+)(?:\s|$)/;
const isDeferInit = (s) => t.isExpressionStatement(s) && t.isCallExpression(s.expression) && t.isIdentifier(s.expression.callee, { name: 'deferInit' })
  && s.expression.arguments.length === 2 && t.isArrowFunctionExpression(s.expression.arguments[1]) && t.isBlockStatement(s.expression.arguments[1].body);
// the reading-tree layout back to the official statement shape
function normalize(stmts, stats) {
  const out = [];
  for (let s of stmts) {
    if (t.isImportDeclaration(s) || (t.isExportNamedDeclaration(s) && !s.declaration) || t.isExportAllDeclaration(s)) { stats.dropped++; continue; }
    if ((t.isExportNamedDeclaration(s) || t.isExportDefaultDeclaration(s)) && s.declaration) s = t.isExpression(s.declaration) ? t.expressionStatement(s.declaration) : s.declaration;
    if (isDeferInit(s)) {
      stats.deferred++;
      const body = s.expression.arguments[1].body.body;
      // var X; var Y; deferInit(…, () => { X = a; Y = b; }) -> var X = a; var Y = b
      // (only when the assignments fill the uninitialised declarators in their declaration order)
      const open = out.filter((o) => t.isVariableDeclaration(o)).flatMap((o) => o.declarations).filter((v) => !v.init && t.isIdentifier(v.id));
      let next = 0;
      const rest = [];
      for (const b of body) {
        const a = t.isExpressionStatement(b) && t.isAssignmentExpression(b.expression, { operator: '=' }) ? b.expression : null;
        // var a; var b; deferInit(…, () => { ({ x: a, y: b } = init); }) -> var { x: a, y: b } = init
        if (a && !rest.length && t.isPattern(a.left)) {
          const names = Object.keys(t.getBindingIdentifiers(a.left));
          const decls = out.filter((o) => t.isVariableDeclaration(o) && o.declarations.every((v) => !v.init && t.isIdentifier(v.id) && names.includes(v.id.name)));
          const at = names.map((nm) => open.findIndex((v) => v.id.name === nm));
          if (decls.flatMap((o) => o.declarations).length === names.length && Math.min(...at) >= next) {
            const pos = out.indexOf(decls[0]);
            for (const o of decls) out.splice(out.indexOf(o), 1);
            out.splice(pos, 0, t.variableDeclaration(decls[0].kind, [t.variableDeclarator(a.left, a.right)]));
            next = Math.max(...at) + 1;
            continue;
          }
        }
        const at = a && t.isIdentifier(a.left) ? open.findIndex((v) => v.id.name === a.left.name) : -1;
        if (!rest.length && at >= next) { open[at].init = a.right; next = at + 1; } else rest.push(b);
      }
      out.push(...rest);
      continue;
    }
    // runDeferredInits("<file>") at the end of a file runs the file's deferred statements (deferred-init.js)
    if (t.isExpressionStatement(s) && t.isCallExpression(s.expression) && t.isIdentifier(s.expression.callee, { name: 'runDeferredInits' })) { stats.runDeferred = (stats.runDeferred ?? 0) + 1; continue; }
    out.push(s);
  }
  // var X = class X {…} (deferred class declarations, after the merge above) -> class X {…}
  for (let i = 0; i < out.length; i++) {
    const s = out[i];
    if (t.isVariableDeclaration(s) && s.declarations.length === 1 && t.isIdentifier(s.declarations[0].id) && t.isClassExpression(s.declarations[0].init) && s.declarations[0].init.id?.name === s.declarations[0].id.name) {
      const c = s.declarations[0].init;
      stats.classLet = (stats.classLet ?? 0) + 1;
      out[i] = t.classDeclaration(c.id, c.superClass, c.body, c.decorators ?? null);
    }
  }
  return out;
}

const seen = new Map(); // key -> count
const mismatch = [];
const kindChanged = [];
const unmarked = [];
const notOfficial = [];
const stats = { files: files.length, dropped: 0, deferred: 0, groups: 0 };
for (const f of files) {
  const prog = parseFile(fs.readFileSync(f, 'utf8')).program;
  const top = topNames(prog);
  const groups = [];
  for (const s of prog.body) {
    const keys = (s.leadingComments ?? []).filter((c) => c.type === 'CommentLine').map((c) => MARK.exec(c.value)?.[1]).filter(Boolean);
    if (keys.length) groups.push({ keys, stmts: [s] });
    else if (groups.length) groups[groups.length - 1].stmts.push(s);
    else if (!(t.isImportDeclaration(s) || t.isExportNamedDeclaration(s) && !s.declaration || t.isExportAllDeclaration(s) || t.isExpressionStatement(s) && t.isStringLiteral(s.expression))) unmarked.push(`${f}:${s.loc.start.line} ${s.type}`);
  }
  for (const g of groups) {
    stats.groups++;
    const key = g.keys.join('+');
    for (const k of g.keys) seen.set(k, (seen.get(k) ?? 0) + 1);
    const want = official.get(key);
    if (!want) { notOfficial.push(`${f}: ${key}`); continue; }
    const got = fingerprint(normalize(g.stmts, stats), top);
    if (got.hash !== want.hash) mismatch.push({ key, file: f });
    else if (got.kinds !== want.kinds) kindChanged.push(key);
  }
}
const missing = [...official.keys()].filter((k) => !seen.has(k));
const duplicated = [...seen].filter(([, n]) => n > 1).map(([k]) => k);

// show the first mismatches as canonical code, official vs reading tree
function canonCode(stmts, top) { return generate(fingerprint(stmts, top).file.program, { comments: false }).code; }
const shown = [];
for (const m of mismatch.slice(0, SHOW)) {
  const [file, range] = [m.key.slice(0, m.key.lastIndexOf(':')), m.key.slice(m.key.lastIndexOf(':') + 1)];
  const [start, end] = range.split('-').map(Number);
  const oprog = parseFile(fs.readFileSync(path.join('original', file), 'utf8')).program;
  const a = canonCode(officialStmts(oprog, { start, end }), topNames(oprog));
  const rprog = parseFile(fs.readFileSync(m.file, 'utf8')).program;
  const idx = rprog.body.findIndex((s) => (s.leadingComments ?? []).some((c) => MARK.exec(c.value)?.[1] === m.key));
  const g = [rprog.body[idx]];
  for (let i = idx + 1; i < rprog.body.length && !(rprog.body[i].leadingComments ?? []).some((c) => MARK.test(c.value)); i++) g.push(rprog.body[i]);
  // normalize() fills declarators in place: give each use its own copy
  const b = canonCode(normalize(g.map((s) => t.cloneNode(s, true)), {}), topNames(rprog));
  const fa = fingerprint(officialStmts(oprog, { start, end }), topNames(oprog)).fp, fb = fingerprint(normalize(g.map((s) => t.cloneNode(s, true)), {}), topNames(rprog)).fp;
  let i = 0;
  while (i < fa.length && fa[i] === fb[i]) i++;
  shown.push({ key: m.key, file: m.file, official: a.slice(0, 1500), reading: b.slice(0, 1500), at: i, fa: fa.slice(Math.max(0, i - 150), i + 150), fb: fb.slice(Math.max(0, i - 150), i + 150) });
}

const report = {
  root: ROOT, seconds: (Date.now() - t0) / 1000, ...stats, dynImports, requires,
  declarations: official.size, equal: official.size - missing.length - mismatch.length, mismatch: mismatch.length,
  missing: missing.length, duplicated: duplicated.length, notOfficial: notOfficial.length, unmarked: unmarked.length,
  kindChanged: kindChanged.length, unlocated: unlocated.length, uncoveredOfficialStatements: uncovered.length,
  lists: { mismatch: mismatch.map((m) => `${m.file}: ${m.key}`), missing: missing.slice(0, 200), duplicated: duplicated.slice(0, 200), notOfficial: notOfficial.slice(0, 200), unmarked: unmarked.slice(0, 200), unlocated: unlocated.slice(0, 200), uncovered: uncovered.slice(0, 200), kindChanged: kindChanged.slice(0, 200) },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT + '.json', JSON.stringify(report, null, 1));
const md = [`# 声明级等价校验（tools/verify/decl-equiv.mjs）`, '', `阅读树 \`${ROOT}\`，${files.length} 个文件，用时 ${report.seconds.toFixed(0)} 秒。`, '',
  '| 项 | 数 |', '|---|---|',
  ...['declarations', 'equal', 'mismatch', 'missing', 'duplicated', 'notOfficial', 'unmarked', 'unlocated', 'uncoveredOfficialStatements', 'kindChanged', 'deferred', 'dropped'].map((k) => `| ${k} | ${report[k]} |`), '',
  ...shown.flatMap((s) => [`## ${s.key}`, '', `阅读树文件 \`${s.file}\``, '', '官方（规范形）：', '', '```js', s.official, '```', '', '阅读树（规范形）：', '', '```js', s.reading, '```', '', `指纹第一处不同（第 ${s.at} 个字符）：`, '', '```', s.fa, '```', '', '```', s.fb, '```', ''])];
fs.writeFileSync(OUT + '.md', md.join('\n'));
const { lists, ...summary } = report;
console.log(JSON.stringify(summary));

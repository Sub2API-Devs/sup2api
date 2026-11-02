// Evidence-based fallback names ("auto") for bindings no better source names.
//   node tools/naming/auto-names.mjs [analysis] [out=analysis/names/auto.jsonl]
// Every rule names a binding from something visible in the code itself, so a
// reader can always see why a name was chosen. Rules (confidence in brackets):
//   top-level
//     class with `this.name = "FooError"` / static name            -> FooError      [0.5]
//     const bound to a short identifier-like string "foo-bar"       -> FOO_BAR       [0.3]
//     var bound to `process.env.FOO_BAR` / env lookups               -> envFooBar     [0.3]
//     import { join as u } from "path"                          -> join          [0.6]
//   locals and top-level
//     destructuring `{foo: a}` / `{foo: a = 1}`                       -> foo           [0.45]
//     catch (e)                                                       -> error         [0.4]
//     `a = x.foo` / `a = await x.getFoo(..)` / `a = x.foo(..)`        -> foo           [0.3]
//     `a = new Foo(..)` with a readable class name                    -> foo           [0.3]
//     well-known calls (JSON.parse, Date.now, Object.keys, .split, …) -> parsed, now…  [0.35]
//     `for (const a of x.foos)` / `x.foos.map((a) => …)`             -> foo (singular)[0.3]
// Names that are not valid identifiers, are one letter, or start with a
// digit are dropped; the rename engine suffixes scope conflicts.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default ?? _traverse;
const A = process.argv[2] ?? 'analysis';
const outFile = process.argv[3] ?? path.join(A, 'names/auto.jsonl');
const ws = fs.createWriteStream(outFile);
const files = fs.readdirSync('original').filter((f) => /\.(js|mjs)$/.test(f) && !/\.min\.js$/.test(f));

const KNOWN = {
  'JSON.parse': 'parsed', 'JSON.stringify': 'json', 'Date.now': 'now', 'Object.keys': 'keys', 'Object.entries': 'entries', 'Object.values': 'values',
  'Object.assign': 'merged', 'Array.from': 'list', 'Math.max': 'max', 'Math.min': 'min', 'Math.floor': 'floored', 'Math.round': 'rounded', 'performance.now': 'startTime',
  'process.cwd': 'cwd', 'Buffer.from': 'buffer', 'Buffer.concat': 'buffer', 'Promise.all': 'results', 'Promise.race': 'winner', 'Promise.allSettled': 'settled',
};
const METHOD = {
  split: 'parts', filter: 'filtered', map: 'mapped', trim: 'trimmed', toLowerCase: 'lower', toUpperCase: 'upper', join: 'joined', slice: 'sliced',
  indexOf: 'index', lastIndexOf: 'index', findIndex: 'index', find: 'found', match: 'match', exec: 'match', replace: 'replaced', replaceAll: 'replaced',
  test: 'matches', includes: 'included', some: 'any', every: 'all', reduce: 'reduced', flatMap: 'flattened', sort: 'sorted', concat: 'combined',
  then: 'result', json: 'body', text: 'text', toString: 'str', keys: 'keys', values: 'values', entries: 'entries', getReader: 'reader', subarray: 'chunk',
  readFileSync: 'content', readFile: 'content', readdirSync: 'entries', readdir: 'entries', statSync: 'stats', stat: 'stats', lstat: 'stats', existsSync: 'exists',
  spawn: 'child', fork: 'child', exec_: 'output', createInterface: 'rl', getTime: 'time', toISOString: 'iso', padStart: 'padded', padEnd: 'padded', charCodeAt: 'code',
  codePointAt: 'codePoint', fetch: 'response', resolve: 'resolved', relative: 'relativePath', dirname: 'dir', basename: 'base', extname: 'ext', normalize: 'normalized',
};
const GENERIC = new Set(['default', 'value', 'data', 'result', 'type', 'name', 'call', 'apply', 'bind', 'get', 'set', 'has', 'add', 'then', 'catch', 'length', 'prototype', 'constructor', 'push', 'pop', 'shift', 'next', 'done', 'current']);
const ok = (n) => typeof n === 'string' && /^[A-Za-z_$][\w$]*$/.test(n) && n.length > 1 && n.length <= 40 && !GENERIC.has(n);
const lowerFirst = (s) => s[0].toLowerCase() + s.slice(1);
const camel = (s) => s.toLowerCase().replace(/[_\-.:/ ]+([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/[^\w$]/g, '');
const singular = (s) => (/ies$/.test(s) ? s.slice(0, -3) + 'y' : /(ss|us)$/.test(s) ? null : /s$/.test(s) ? s.slice(0, -1) : null);
const unget = (n) => (/^(get|load|read|fetch|create|build|compute|resolve|parse|find|make)[A-Z]/.test(n) ? lowerFirst(n.replace(/^(get|load|read|fetch|create|build|compute|resolve|parse|find|make)/, '')) : n);

let count = 0;
for (const file of files) {
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module' }); } catch { continue; }
  const emit = (id, name, conf, rule) => {
    if (!ok(name)) return;
    ws.write(JSON.stringify({ file, key: '@' + id.start, min: id.name, name, source: 'auto', confidence: conf, via: rule }) + '\n');
    count++;
  };
  const fromInit = (id, init) => {
    if (!init) return;
    if (init.type === 'AwaitExpression') init = init.argument;
    if (init.type === 'StringLiteral' && /^[A-Za-z][\w.:/-]{2,40}$/.test(init.value) && id.scopeTop) return emit(id, init.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''), 0.3, 'string-const');
    if (init.type === 'MemberExpression' && !init.computed) {
      const o = init.object;
      if (o.type === 'MemberExpression' && !o.computed && o.object.name === 'process' && o.property.name === 'env') return emit(id, 'env' + camel('_' + init.property.name), 0.3, 'env');
      return emit(id, init.property.name, 0.3, 'member');
    }
    if (init.type === 'CallExpression' || init.type === 'NewExpression') {
      const c = init.callee;
      if (c.type === 'MemberExpression' && !c.computed) {
        const k = c.object.type === 'Identifier' ? `${c.object.name}.${c.property.name}` : null;
        if (k && KNOWN[k]) return emit(id, KNOWN[k], 0.35, 'known-call');
        if (METHOD[c.property.name]) return emit(id, METHOD[c.property.name], 0.3, 'method');
        if (init.type === 'CallExpression') return emit(id, unget(c.property.name), 0.25, 'method-name');
      }
      if (init.type === 'NewExpression' && c.type === 'Identifier' && c.name.length > 3) return emit(id, lowerFirst(c.name), 0.3, 'new');
    }
  };
  // imports from outside the bundle (node builtins, bun:*): local = imported name
  for (const n of ast.program.body) {
    if (n.type !== 'ImportDeclaration' || n.source.value.startsWith('.')) continue;
    for (const sp of n.specifiers) {
      const base = n.source.value.replace(/^node:/, '').replace(/[^\w]+(\w)/g, (_, c) => c.toUpperCase());
      const want = sp.type === 'ImportSpecifier' ? (sp.imported.name ?? sp.imported.value) : sp.type === 'ImportNamespaceSpecifier' ? base + 'Module' : base;
      if (want !== sp.local.name) emit(sp.local, want, 0.6, 'external-import');
    }
  }
  traverse(ast, {
    ClassDeclaration(p) {
      let nm = null;
      p.traverse({
        AssignmentExpression(q) {
          const l = q.node.left;
          if (l.type === 'MemberExpression' && l.object.type === 'ThisExpression' && l.property.name === 'name' && q.node.right.type === 'StringLiteral') nm = q.node.right.value;
        },
        ClassProperty(q) { if (q.node.static && q.node.key.name === 'name' && q.node.value?.type === 'StringLiteral') nm = q.node.value.value; },
      });
      if (nm && p.node.id) emit(p.node.id, nm, 0.5, 'class-name');
    },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id.type === 'Identifier') {
        id.scopeTop = p.parentPath.parentPath.isProgram();
        if (init?.type === 'ClassExpression') {
          let nm = null;
          p.traverse({ AssignmentExpression(q) { const l = q.node.left; if (l.type === 'MemberExpression' && l.object.type === 'ThisExpression' && l.property.name === 'name' && q.node.right.type === 'StringLiteral') nm = q.node.right.value; } });
          if (nm) return emit(id, nm, 0.5, 'class-name');
        }
        fromInit(id, init);
      } else if (id.type === 'ObjectPattern') {
        for (const pr of id.properties) {
          if (pr.type !== 'ObjectProperty' || pr.computed) continue;
          const key = pr.key.name ?? pr.key.value;
          const v = pr.value.type === 'AssignmentPattern' ? pr.value.left : pr.value;
          if (v.type === 'Identifier' && v.name !== key) emit(v, key, 0.45, 'destructure');
        }
      }
    },
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(p) {
      for (const prm of p.node.params) {
        if (prm.type === 'ObjectPattern') for (const pr of prm.properties) {
          if (pr.type !== 'ObjectProperty' || pr.computed) continue;
          const key = pr.key.name ?? pr.key.value;
          const v = pr.value.type === 'AssignmentPattern' ? pr.value.left : pr.value;
          if (v.type === 'Identifier' && v.name !== key) emit(v, key, 0.45, 'destructure');
        }
      }
      // x.foos.map((a) => …) / forEach / filter / find / some
      const parent = p.parent;
      if (p.listKey === 'arguments' && p.key === 0 && parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression' && /^(map|forEach|filter|find|some|every|flatMap|findIndex)$/.test(parent.callee.property.name)) {
        const coll = parent.callee.object;
        const collName = coll.type === 'MemberExpression' && !coll.computed ? coll.property.name : null;
        const first = p.node.params[0];
        const s = collName && singular(collName);
        if (s && first?.type === 'Identifier') emit(first, s, 0.3, 'iter');
      }
    },
    CatchClause(p) { if (p.node.param?.type === 'Identifier') emit(p.node.param, 'error', 0.4, 'catch'); },
    'ForOfStatement|ForInStatement'(p) {
      const l = p.node.left;
      if (l.type !== 'VariableDeclaration' || l.declarations[0].id.type !== 'Identifier') return;
      const r = p.node.right;
      const collName = r.type === 'MemberExpression' && !r.computed ? r.property.name : null;
      const s = collName && singular(collName);
      if (p.node.type === 'ForInStatement') emit(l.declarations[0].id, 'key', 0.3, 'for-in');
      else if (s) emit(l.declarations[0].id, s, 0.3, 'iter');
    },
  });
}
ws.end();
console.log({ autoNames: count });

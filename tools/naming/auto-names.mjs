// Evidence-based fallback names ("auto") for bindings no better source names.
//   node --max-old-space-size=8000 tools/naming/auto-names.mjs [analysis] [out=analysis/names/auto.jsonl]
// Input: original/*.js|mjs. Output: JSONL {file, key:"@offset", min, name, source:"auto", confidence, via}.
// Only bindings that still carry a minified name are named: the module is
// minified (>60% of its own bindings have 1–3 character names, the
// tools/verify/readability.mjs test) and the binding's name is 1–3 characters.
// Every rule names a binding from something visible in the code itself, so a
// reader can always see why a name was chosen. Rules (via, confidence):
//   top-level
//     class with `this.name = "FooError"` / static name            -> FooError      class-name    0.5
//     const bound to a short identifier-like string "foo-bar"       -> FOO_BAR       string-const  0.3
//     var bound to `process.env.FOO_BAR`                            -> envFooBar     env           0.3
//     import { join as u } from "path"                              -> join          external-import 0.6
//   locals and top-level
//     destructuring `{foo: a}` / `{foo: a = 1}`                     -> foo           destructure   0.45
//     catch (e) / promise.catch((e) => …) / .then(_, (e) => …)      -> error         catch         0.4
//     `a = x.foo`                                                   -> foo           member        0.3
//     `a = x?.foo` / `x.foo ?? d` / `x && x.foo` / `c ? x.foo : null` -> foo         member-loose  0.3
//     `a = x.split(..)` / `.filter(..)` … (fixed table) / `x.at(-1)` -> parts, filtered, last  method  0.3
//     `a = x.getFoo(..)` / `x.loadFoo(..)` (getter-like verbs only) -> foo           method-name   0.25
//     `a = new Foo(..)` with a readable class name                  -> foo           new           0.3
//     well-known calls (JSON.parse, Date.now, setTimeout, …)        -> parsed, now…  known-call    0.35
//     `a = s.split("\n")`                                           -> lines         split-lines   0.4
//     `for (const a of x.foos)` / `x.foos.map((a) => …)` (through filter/slice/sort/Array.from/[...x])
//                                                                   -> foo           iter          0.3
//     `Object.keys(x).map((a) => …)` / `for (const a of x.keys())`  -> key           iter-keys     0.35
//     `for (const [a, b] of Object.entries(x))` / `Object.entries(x).map(([a, b]) => …)`
//                                                                   -> key, value    entries       0.4
//     `xs.reduce((a, b) => …)`                                      -> acc           reduce-acc    0.35
//     `for (let a = 0; …; a++)` counters, by loop depth (next free) -> i, j, k, idx  loop-index    0.35
//     `new Promise((a, b) => …)`                                    -> resolve, reject promise-executor 0.5
//     param used with .preventDefault()/.stopPropagation()/.stopImmediatePropagation()/.currentTarget/.defaultPrevented
//                                                                   -> event         event         0.4
//     Ink input handler `(a, b) => …` with b.upArrow/b.escape/…     -> input, key    ink-input     0.45
//     every use of `a` is `{foo: a}` / `this.foo = a` / `x.foo = a` (React Compiler cache reads/writes ignored)
//                                                                   -> foo           sole-prop     0.4
//     component `function X(e) { let …, {a, b} = e; … }` using hooks / compiler cache / createElement
//                                                                   -> props         react-props   0.45
//     `let [a, b] = useState(x.foo)`                                -> foo, setFoo   use-state     0.35
//     `let a = useRef(x.foo)`                                       -> fooRef        use-ref       0.35
//     Error subclass `constructor(a) { super(a) }` (custom bases: no other string argument)
//                                                                   -> message       error-message 0.45
// snake_case keys become camelCase variables (stop_reason -> stopReason).
// Names that are not valid identifiers or are generic are dropped; the rename
// engine suffixes scope conflicts. Bindings named by several rules keep the
// highest-confidence one.
import fs from 'node:fs';
import path from 'node:path';
import _traverse from '@babel/traverse';
import { listFiles, parseFile, minifiedModuleOf, singular, usable, lowerFirst, lowerCamel, upperFirst, camel, reactHooks, COMPILER_RUNTIME, writeJsonlAtomic, RESERVED } from './lib/auto-common.mjs';

const traverse = _traverse.default ?? _traverse;
const A = process.argv[2] ?? 'analysis';
const outFile = process.argv[3] ?? path.join(A, 'names/auto.jsonl');
const files = listFiles();
const REACT = reactHooks();

const KNOWN = {
  'JSON.parse': 'parsed', 'JSON.stringify': 'json', 'Date.now': 'now', 'Object.keys': 'keys', 'Object.entries': 'entries', 'Object.values': 'values',
  'Object.assign': 'merged', 'Array.from': 'list', 'Math.max': 'max', 'Math.min': 'min', 'Math.floor': 'floored', 'Math.round': 'rounded', 'performance.now': 'startTime',
  'Date.parse': 'timestamp', 'Promise.withResolvers': 'deferred', 'process.cwd': 'cwd', 'Buffer.from': 'buffer', 'Buffer.concat': 'buffer', 'Promise.all': 'results', 'Promise.race': 'winner', 'Promise.allSettled': 'settled',
};
const KNOWN_GLOBAL = { setTimeout: 'timer', setInterval: 'interval', structuredClone: 'clone', encodeURIComponent: 'encoded', decodeURIComponent: 'decoded', fetch: 'response' };
const METHOD = {
  split: 'parts', filter: 'filtered', map: 'mapped', trim: 'trimmed', toLowerCase: 'lower', toUpperCase: 'upper', join: 'joined', slice: 'sliced',
  indexOf: 'index', lastIndexOf: 'index', findIndex: 'index', find: 'found', match: 'match', exec: 'match', replace: 'replaced', replaceAll: 'replaced',
  test: 'matches', includes: 'included', some: 'any', every: 'all', reduce: 'reduced', flatMap: 'flattened', sort: 'sorted', concat: 'combined',
  then: 'result', json: 'body', text: 'text', toString: 'str', keys: 'keys', values: 'values', entries: 'entries', getReader: 'reader', subarray: 'chunk',
  readFileSync: 'content', readFile: 'content', readdirSync: 'entries', readdir: 'entries', statSync: 'stats', stat: 'stats', lstat: 'stats', existsSync: 'exists',
  spawn: 'child', fork: 'child', createInterface: 'rl', getTime: 'time', toISOString: 'iso', padStart: 'padded', padEnd: 'padded', charCodeAt: 'code',
  codePointAt: 'codePoint', fetch: 'response', resolve: 'resolved', relative: 'relativePath', dirname: 'dir', basename: 'base', extname: 'ext', normalize: 'normalized',
};
// method-name rule: verbs whose bare name says nothing about the result
// method-name rule: a method whose name starts with a verb returns something the verb does not name
// (safeParse → a result, subscribe → an unsubscribe function). Only getter-like verbs (stripped by unget)
// and noun-like method names (thinkingConfig(), egressAddress()) name the result.
const VERB_FIRST = /^(safe|parse|merge|insert|patch|post|put|delete|subscribe|unsubscribe|query|await|decrypt|encrypt|take|with|is|has|should|can|extend|apply|send|emit|handle|process|run|exec|execute|update|set|add|remove|push|write|append|register|unregister|start|stop|open|close|connect|disconnect|wait|try|check|validate|verify|ensure|format|render|normalize|convert|transform|map|filter|reduce|sort|split|join|replace|match|test|compare|clone|copy|wrap|unwrap|bind|call|invoke|dispatch|trigger|notify|schedule|poll|retry|refresh|reset|clear|flush|save|store|persist|to|from|of|pow|abs|floor|ceil|round|sqrt|decode|encode|serialize|deserialize|stringify|hash|sign|digest|request|upload|download|install|uninstall|enable|disable|mark|track|log|report|record|observe|watch|listen|accept|reject|spawn|fork|kill|select|pick|omit|slice|splice|concat|flat|reverse|fill|includes|starts|ends|create|assign|freeze|on|once|off|catch|finally|next|pipe|for|define|describe|lock|unlock|acquire|release|claim|consume|produce|enqueue|dequeue|drain|commit|rollback|begin|end|finish|complete|cancel|abort|pause|resume|skip|seek|scan|search|lookup|walk|visit|traverse|collect|gather|emit|fire|raise|throw|assert|expect|require|import|export|mount|unmount|attach|detach|link|unlink|move|rename|touch|mkdir|rm|chmod|spawn|then|do|make|build|compute|resolve|find|load|read|fetch|get|use|wrap|nullable|optional|array|object|string|number|boolean|literal|union|enum|describe|default|transform|refine|pipe|brand|catchall|passthrough|strict|partial|required|pick|omit|keyof|or|and|not|min|max|length|regex|email|url|uuid|int|positive|nonnegative|finite|safeParseAsync)(?=[A-Z0-9_]|$)/;
const GENERIC = new Set(['default', 'value', 'data', 'result', 'type', 'name', 'call', 'apply', 'bind', 'get', 'set', 'has', 'add', 'then', 'catch', 'length', 'prototype', 'constructor', 'push', 'pop', 'shift', 'next', 'done', 'current']);
// old rules (member / method / new / known-call / destructure / iter) keep their filter
const ok = (n) => typeof n === 'string' && /^[A-Za-z_$][\w$]*$/.test(n) && n.length > 1 && n.length <= 40 && !GENERIC.has(n) && !RESERVED.has(n);
// sole-prop: keys that are fine variable names even if generic for member reads
const PROP_OK = (n) => typeof n === 'string' && /^[A-Za-z_$][\w$]*$/.test(n) && n.length > 1 && n.length <= 40 && !RESERVED.has(n) && !/^(default|prototype|constructor|length|current|then|catch|__proto__|toString|valueOf|_)$/.test(n) && !/^[A-Z0-9_]+$/.test(n);
const unget = (n) => (/^(get|load|read|fetch|create|build|compute|resolve|parse|find|make)[A-Z]/.test(n) ? lowerCamel(n.replace(/^(get|load|read|fetch|create|build|compute|resolve|parse|find|make)/, '')) : n);
const KEY_PROPS = /^(upArrow|downArrow|leftArrow|rightArrow|escape|backspace|pageUp|pageDown|wheelUp|wheelDown)$/;

const best = new Map(); // file@off -> row
const rules = {};
for (const file of files) {
  const { ast } = parseFile(file);
  if (!ast) continue;
  traverse(ast, {
    Program(prog) {
      const minified = minifiedModuleOf(prog);
      if (!minified) { prog.stop(); return; }
      runRules(file, prog);
      prog.stop();
    },
  });
}

function runRules(file, prog) {
  const emit = (id, name, conf, rule, check = ok) => {
    // snake_case property names (API fields) become camelCase variables: stop_reason -> stopReason
    if (typeof name === 'string' && /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(name) && !/^(string-const|env|external-import|class-name)$/.test(rule)) name = name.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    if (!id || id.type !== 'Identifier' || id.name.length > 3 || !check(name) || name === id.name) return;
    const k = `${file}@${id.start}`;
    const cur = best.get(k);
    if (cur && cur.confidence >= conf) return;
    best.set(k, { file, key: '@' + id.start, min: id.name, name, source: 'auto', confidence: conf, via: rule });
  };
  // imports: React hooks, compiler runtime, external modules
  const hookOf = new Map(); // local name -> hook name
  const runtimeLocals = new Set();
  for (const n of prog.node.body) {
    if (n.type !== 'ImportDeclaration') continue;
    const from = n.source.value.replace(/^\.\//, '');
    if (from === REACT.file) for (const sp of n.specifiers) if (sp.type === 'ImportSpecifier' && REACT.hooks.has(sp.imported.name)) hookOf.set(sp.local.name, REACT.hooks.get(sp.imported.name));
    if (from === COMPILER_RUNTIME) for (const sp of n.specifiers) runtimeLocals.add(sp.local.name);
    if (n.source.value.startsWith('.')) continue;
    // imports from outside the bundle (node builtins, bun:*): local = imported name
    for (const sp of n.specifiers) {
      const base = n.source.value.replace(/^node:/, '').replace(/[^\w]+(\w)/g, (_, c) => c.toUpperCase());
      const want = sp.type === 'ImportSpecifier' ? (sp.imported.name ?? sp.imported.value) : sp.type === 'ImportNamespaceSpecifier' ? base + 'Module' : base;
      if (want !== sp.local.name) emit(sp.local, want, 0.6, 'external-import');
    }
  }
  const isImportOf = (p, idNode, set) => {
    if (idNode?.type !== 'Identifier') return null;
    const b = p.scope.getBinding(idNode.name);
    if (!b || b.kind !== 'module') return null;
    return set(idNode.name);
  };
  const hookCalled = (p, call) => (call?.type === 'CallExpression' ? isImportOf(p, call.callee, (n) => hookOf.get(n)) : null);
  // compiler cache bindings: `let $ = w(N)`
  const isCacheBinding = (b) => {
    const n = b?.path?.node;
    return n?.type === 'VariableDeclarator' && n.init?.type === 'CallExpression' && n.init.callee.type === 'Identifier' && runtimeLocals.has(n.init.callee.name) && n.init.arguments[0]?.type === 'NumericLiteral';
  };
  const isCacheSlot = (p, node) => node?.type === 'MemberExpression' && node.computed && node.object.type === 'Identifier' && isCacheBinding(p.scope.getBinding(node.object.name));
  // the uses of a binding that are not React Compiler cache traffic
  const realRefs = (b) => b.referencePaths.filter((r) => {
    const par = r.parent;
    if (par.type === 'AssignmentExpression' && par.right === r.node && isCacheSlot(r, par.left)) return false;
    if (par.type === 'BinaryExpression' && /^[!=]==?$/.test(par.operator) && isCacheSlot(r, par.left === r.node ? par.right : par.left)) return false;
    return true;
  });

  // ---- value-expression names ----
  const memberName = (e) => {
    if (!e) return null;
    if ((e.type === 'MemberExpression' || e.type === 'OptionalMemberExpression') && !e.computed && e.property.type === 'Identifier') return e.property.name;
    return null;
  };
  const isEmptyish = (e) => !e || e.type === 'NullLiteral' || (e.type === 'Identifier' && e.name === 'undefined') || (e.type === 'UnaryExpression' && e.operator === 'void') || e.type === 'StringLiteral' || e.type === 'NumericLiteral' || e.type === 'BooleanLiteral' || (e.type === 'ArrayExpression' && !e.elements.length) || (e.type === 'ObjectExpression' && !e.properties.length) || (e.type === 'UnaryExpression' && e.operator === '!' && e.argument.type === 'NumericLiteral');
  // `x.foo`, `x?.foo`, `x.foo ?? d`, `x && x.foo`, `c ? x.foo : null`
  const looseMember = (e) => {
    if (!e) return null;
    if (e.type === 'AwaitExpression') return looseMember(e.argument);
    const m = memberName(e);
    if (m) return m;
    if (e.type === 'LogicalExpression') {
      if (e.operator === '&&') return memberName(e.right);
      const l = memberName(e.left);
      if (l && (isEmptyish(e.right) || memberName(e.right) === l || e.right.type === 'Identifier')) return l;
      return null;
    }
    if (e.type === 'ConditionalExpression') {
      const c = memberName(e.consequent), a = memberName(e.alternate);
      if (c && (c === a || isEmptyish(e.alternate))) return c;
      if (a && isEmptyish(e.consequent)) return a;
    }
    return null;
  };
  const fromInit = (p, id, init, scopeTop) => {
    if (!init) return;
    if (init.type === 'AwaitExpression') init = init.argument;
    if (init.type === 'StringLiteral' && /^[A-Za-z][\w.:/-]{2,40}$/.test(init.value) && scopeTop) return emit(id, init.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''), 0.3, 'string-const');
    if (init.type === 'MemberExpression' && !init.computed) {
      const o = init.object;
      if (o.type === 'MemberExpression' && !o.computed && o.object.name === 'process' && o.property.name === 'env') return emit(id, 'env' + camel('_' + init.property.name), 0.3, 'env');
    }
    const hook = hookCalled(p, init);
    if (hook === 'useRef') {
      const m = looseMember(init.arguments[0]);
      if (m && ok(m) && /^[a-z]/.test(m)) emit(id, m + 'Ref', 0.35, 'use-ref');
      return;
    }
    if (hook) return;
    const lm = looseMember(init);
    if (lm) return emit(id, lm, 0.3, memberName(init) ? 'member' : 'member-loose');
    if (init.type === 'CallExpression' || init.type === 'NewExpression' || init.type === 'OptionalCallExpression') {
      const c = init.callee;
      if (c.type === 'Identifier' && !p.scope.getBinding(c.name) && KNOWN_GLOBAL[c.name] && init.type !== 'NewExpression') return emit(id, KNOWN_GLOBAL[c.name], 0.35, 'known-call');
      if ((c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed && c.property.type === 'Identifier') {
        const k = c.object.type === 'Identifier' ? `${c.object.name}.${c.property.name}` : null;
        if (k && KNOWN[k] && !p.scope.getBinding(c.object.name)) return emit(id, KNOWN[k], 0.35, 'known-call');
        if (c.property.name === 'split' && isNewlineArg(init.arguments[0])) return emit(id, 'lines', 0.4, 'split-lines');
        if (METHOD[c.property.name]) return emit(id, METHOD[c.property.name], 0.3, 'method');
        if (c.property.name === 'at' && init.arguments.length === 1) {
          const a = init.arguments[0];
          if (a.type === 'UnaryExpression' && a.operator === '-' && a.argument.value === 1) return emit(id, 'last', 0.35, 'method');
          if (a.type === 'NumericLiteral' && a.value === 0) return emit(id, 'first', 0.35, 'method');
          return;
        }
        if (init.type !== 'NewExpression') {
          // only getter-like verbs say what comes back: x.getFoo() / x.loadFoo() / x.findLast() -> foo / last
          const u = unget(c.property.name);
          if (u !== c.property.name && !VERB_FIRST.test(u)) emit(id, u, 0.25, 'method-name');
          return;
        }
      }
      if (init.type === 'NewExpression' && c.type === 'Identifier' && c.name.length > 3) return emit(id, lowerFirst(c.name), 0.3, 'new');
    }
  };
  const isNewlineArg = (a) => ((a?.type === 'StringLiteral' && (a.value === '\n' || a.value === '\r\n')) || (a?.type === 'TemplateLiteral' && a.quasis.length === 1 && /^\r?\n$/.test(a.quasis[0].value.cooked))) || (a?.type === 'RegExpLiteral' && a.pattern.includes('\\n') && /^[\\rn?|()[\]+]+$/.test(a.pattern));

  // ---- collections: the element name of the thing being iterated ----
  const CHAIN = /^(filter|slice|sort|toSorted|reverse|toReversed|concat|flat|splice)$/;
  // returns {kind:'elem', name} | {kind:'key'} | {kind:'entries'} | null
  const elemOf = (e) => {
    if (!e) return null;
    if (e.type === 'CallExpression' || e.type === 'OptionalCallExpression') {
      const c = e.callee;
      if ((c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed && c.property.type === 'Identifier') {
        const pn = c.property.name;
        if (c.object.type === 'Identifier' && c.object.name === 'Object' && e.arguments.length === 1) {
          if (pn === 'keys') return { kind: 'key' };
          if (pn === 'entries') return { kind: 'entries' };
          if (pn === 'values') return elemOf(e.arguments[0]);
        }
        if (c.object.type === 'Identifier' && c.object.name === 'Array' && pn === 'from' && e.arguments.length === 1) return elemOf(e.arguments[0]);
        if (pn === 'keys' && !e.arguments.length) return { kind: 'key' };
        // `.entries()` is [index, value] on arrays and [key, value] on Maps: not named
        if (pn === 'values' && !e.arguments.length) return elemOf(c.object);
        if (pn === 'split' && isNewlineArg(e.arguments[0])) return { kind: 'elem', name: 'line' };
        if (CHAIN.test(pn)) return elemOf(c.object);
      }
      return null;
    }
    if (e.type === 'ArrayExpression' && e.elements.length === 1 && e.elements[0]?.type === 'SpreadElement') return elemOf(e.elements[0].argument);
    const m = memberName(e);
    if (m) {
      const s = singular(m);
      return s ? { kind: 'elem', name: s } : null;
    }
    return null;
  };
  const nameIter = (target, coll, rule) => {
    const el = elemOf(coll);
    if (!el) return;
    if (target.type === 'Identifier') {
      if (el.kind === 'elem') emit(target, el.name, 0.3, rule);
      else if (el.kind === 'key') emit(target, 'key', 0.35, rule + '-keys', usable0);
    } else if (target.type === 'ArrayPattern' && el.kind === 'entries') {
      const [k, v] = target.elements;
      if (k?.type === 'Identifier') emit(k, 'key', 0.4, 'entries', usable0);
      if (v?.type === 'Identifier') emit(v, 'value', 0.4, 'entries', usable0);
    }
  };
  const usable0 = (n) => n === 'key' || n === 'value' || n === 'acc' || usable(n);

  // ---- per-binding use patterns ----
  const propKeyOf = (r) => {
    const par = r.parent;
    if (par.type === 'ObjectProperty' && par.value === r.node && !par.computed && !par.shorthand) return par.key.type === 'Identifier' ? par.key.name : par.key.type === 'StringLiteral' ? par.key.value : null;
    if (par.type === 'AssignmentExpression' && par.operator === '=' && par.right === r.node && par.left.type === 'MemberExpression' && !par.left.computed && par.left.property.type === 'Identifier' && !isCacheSlot(r, par.left)) return par.left.property.name;
    return null;
  };
  const soleProp = (b) => {
    if (!b) return null;
    // writes other than the declaration; a React Compiler `x = $[n]` cache read does not count
    const writes = b.constantViolations.filter((v) => !(v.node.type === 'AssignmentExpression' && isCacheSlot(v, v.node.right)));
    if (writes.length > 1) return null;
    const refs = realRefs(b);
    if (!refs.length) return null;
    let key = null;
    for (const r of refs) {
      const k = propKeyOf(r);
      if (!k || (key && k !== key)) return null;
      key = k;
    }
    return key;
  };
  const memberUses = (b) => {
    const s = new Set();
    for (const r of b.referencePaths) {
      const par = r.parent;
      if ((par.type === 'MemberExpression' || par.type === 'OptionalMemberExpression') && par.object === r.node && !par.computed) s.add(par.property.name);
    }
    return s;
  };
  const isComponent = (fnPath) => {
    let yes = false;
    fnPath.traverse({
      CallExpression(q) {
        if (yes) return q.stop();
        const c = q.node.callee;
        if (c.type !== 'Identifier') return;
        const b = q.scope.getBinding(c.name);
        if (b?.kind === 'module' && (hookOf.has(c.name) || runtimeLocals.has(c.name))) { yes = true; q.stop(); }
      },
      Function(q) { q.skip(); },
    });
    return yes;
  };

  let loopDepth = 0;
  prog.traverse({
    ClassDeclaration(p) { classRules(p, p.node.id); },
    ClassExpression(p) { classRules(p, p.parentPath.isVariableDeclarator() ? p.parent.id : p.node.id); },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      const scopeTop = p.parentPath.parentPath.isProgram();
      if (id.type === 'Identifier') {
        if (init?.type === 'ClassExpression') return;
        fromInit(p, id, init, scopeTop);
        if (!scopeTop) {
          const k = soleProp(p.scope.getBinding(id.name));
          if (k) emit(id, k, 0.4, 'sole-prop', PROP_OK);
        }
      } else if (id.type === 'ObjectPattern') {
        destructure(id);
      } else if (id.type === 'ArrayPattern' && hookCalled(p, init) === 'useState') {
        const m0 = looseMember(init.arguments[0]);
        const m = m0 && m0.includes('_') ? m0.replace(/_+([a-z0-9])/g, (_, c) => c.toUpperCase()) : m0;
        const [v, s] = id.elements;
        if (m && ok(m)) {
          if (v?.type === 'Identifier') emit(v, m, 0.35, 'use-state');
          if (s?.type === 'Identifier') emit(s, 'set' + upperFirst(m), 0.35, 'use-state');
        }
      }
    },
    Function(p) {
      const params = p.node.params;
      for (const prm of params) if (prm.type === 'ObjectPattern') destructure(prm);
      // sole-prop for parameters
      for (const prm of params) {
        const id = prm.type === 'AssignmentPattern' ? prm.left : prm;
        if (id.type !== 'Identifier') continue;
        const k = soleProp(p.scope.getBinding(id.name));
        if (k) emit(id, k, 0.4, 'sole-prop', PROP_OK);
      }
      const parent = p.parent;
      const first = params[0];
      // callbacks
      if (p.listKey === 'arguments' && (parent.type === 'CallExpression' || parent.type === 'OptionalCallExpression') && (parent.callee.type === 'MemberExpression' || parent.callee.type === 'OptionalMemberExpression') && !parent.callee.computed) {
        const mn = parent.callee.property.name;
        if (p.key === 0 && /^(map|forEach|filter|find|findLast|some|every|flatMap|findIndex|findLastIndex)$/.test(mn) && first) nameIter(first, parent.callee.object, 'iter');
        if (p.key === 0 && mn === 'reduce' && params.length >= 2) {
          if (first.type === 'Identifier') emit(first, 'acc', 0.35, 'reduce-acc', usable0);
          if (params[1].type === 'Identifier') nameIter(params[1], parent.callee.object, 'iter');
        }
        if (((p.key === 0 && mn === 'catch') || (p.key === 1 && mn === 'then')) && first?.type === 'Identifier') emit(first, 'error', 0.4, 'catch');
      }
      // new Promise((resolve, reject) => …)
      if (p.listKey === 'arguments' && p.key === 0 && parent.type === 'NewExpression' && parent.callee.type === 'Identifier' && parent.callee.name === 'Promise' && !p.scope.parent.getBinding('Promise')) {
        if (first?.type === 'Identifier') emit(first, 'resolve', 0.5, 'promise-executor', usable0);
        if (params[1]?.type === 'Identifier') emit(params[1], 'reject', 0.5, 'promise-executor', usable0);
      }
      // event handlers, Ink input handlers
      params.forEach((prm, i) => {
        if (prm.type !== 'Identifier') return;
        const b = p.scope.getBinding(prm.name);
        if (!b) return;
        const uses = memberUses(b);
        if ([...uses].some((u) => KEY_PROPS.test(u))) {
          emit(prm, 'key', 0.45, 'ink-input', usable0);
          if (i === 1 && params[0].type === 'Identifier') emit(params[0], 'input', 0.45, 'ink-input', usable0);
        } else if (uses.has('preventDefault') || uses.has('stopPropagation') || uses.has('stopImmediatePropagation') || uses.has('currentTarget') || uses.has('defaultPrevented')) emit(prm, 'event', 0.4, 'event');
      });
      // React component props
      if (first?.type === 'Identifier' && params.length <= 2 && p.node.body.type === 'BlockStatement') {
        const st = p.node.body.body[0];
        if (st?.type === 'VariableDeclaration' && st.declarations.some((d) => d.id.type === 'ObjectPattern' && d.init?.type === 'Identifier' && d.init.name === first.name) && isComponent(p)) emit(first, 'props', 0.45, 'react-props');
      }
    },
    CatchClause(p) { if (p.node.param?.type === 'Identifier') emit(p.node.param, 'error', 0.4, 'catch'); },
    ForOfStatement(p) {
      const l = p.node.left;
      if (l.type !== 'VariableDeclaration') return;
      nameIter(l.declarations[0].id, p.node.right, 'iter');
    },
    ForInStatement(p) {
      const l = p.node.left;
      if (l.type === 'VariableDeclaration' && l.declarations[0].id.type === 'Identifier') emit(l.declarations[0].id, 'key', 0.3, 'for-in', usable0);
    },
    ForStatement: {
      enter(p) {
        const init = p.node.init;
        const d = init?.type === 'VariableDeclaration' && init.declarations[0];
        if (d && d.id.type === 'Identifier' && d.init && (d.init.type === 'NumericLiteral' || d.init.type === 'BinaryExpression') && p.node.update?.type === 'UpdateExpression' && p.node.update.argument.type === 'Identifier' && p.node.update.argument.name === d.id.name && loopDepth < 3) {
          // i / j / k by depth; skip a letter already visible here or used inside the loop
          const used = new Set();
          p.traverse({ Identifier(q) { used.add(q.node.name); } });
          const pick = ['i', 'j', 'k', 'idx'].slice(loopDepth).find((c) => c === d.id.name || (!p.scope.hasBinding(c) && !used.has(c)));
          if (pick) emit(d.id, pick, 0.35, 'loop-index', () => true);
          p.node.__counted = true;
          loopDepth++;
        }
      },
      exit(p) { if (p.node.__counted) loopDepth--; },
    },
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod|ObjectMethod': {
      enter(p) { p.node.__depth = loopDepth; loopDepth = 0; },
      exit(p) { loopDepth = p.node.__depth; },
    },
  });

  function destructure(pat) {
    for (const pr of pat.properties) {
      if (pr.type !== 'ObjectProperty' || pr.computed) continue;
      const key = pr.key.name ?? pr.key.value;
      const v = pr.value.type === 'AssignmentPattern' ? pr.value.left : pr.value;
      if (v.type === 'Identifier' && v.name !== key) emit(v, key, 0.45, 'destructure');
      else if (v.type === 'ObjectPattern') destructure(v);
    }
  }
  function classRules(p, id) {
    let nm = null;
    p.traverse({
      AssignmentExpression(q) {
        const l = q.node.left;
        if (l.type === 'MemberExpression' && l.object.type === 'ThisExpression' && l.property.name === 'name' && q.node.right.type === 'StringLiteral') nm = q.node.right.value;
      },
      ClassProperty(q) { if (q.node.static && q.node.key.name === 'name' && q.node.value?.type === 'StringLiteral') nm = q.node.value.value; },
    });
    if (nm && id) emit(id, nm, 0.5, 'class-name');
    // Error subclass: constructor(a, …) { super(a, …) }
    const sup = p.node.superClass;
    const isErr = (sup?.type === 'Identifier' && /^(Error|TypeError|RangeError|SyntaxError)$/.test(sup.name) && !p.scope.getBinding(sup.name)) || (nm && /Error$/.test(nm));
    if (!isErr) return;
    const ctor = p.node.body.body.find((m) => m.type === 'ClassMethod' && m.kind === 'constructor');
    const first = ctor?.params[0];
    if (first?.type !== 'Identifier') return;
    const stmt = ctor.body.body.find((s) => s.type === 'ExpressionStatement' && s.expression.type === 'CallExpression' && s.expression.callee.type === 'Super');
    const args = stmt?.expression.arguments ?? [];
    // a custom base class may take something else first: then no other argument may look like a message
    const literalErrorBase = sup?.type === 'Identifier' && /^(Error|TypeError|RangeError|SyntaxError)$/.test(sup.name);
    if (!literalErrorBase && args.slice(1).some((a) => a.type === 'StringLiteral' || a.type === 'TemplateLiteral')) return;
    if (args[0]?.type === 'Identifier' && args[0].name === first.name) emit(first, 'message', 0.45, 'error-message', usable0);
  }
}

const rows = [...best.values()];
for (const r of rows) rules[r.via] = (rules[r.via] ?? 0) + 1;
writeJsonlAtomic(outFile, rows);
console.log({ autoNames: rows.length, rules });

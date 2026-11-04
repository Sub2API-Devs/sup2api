// Cross-function name propagation ("auto"): uses the call graph to carry names
// between callers and callees, plus a few rules that need other bindings' names.
//   node --max-old-space-size=8000 tools/naming/propagate.mjs [analysis] [out=analysis/names/propagate.jsonl]
// Input:  original/*.js|mjs; every naming source except the output itself —
//         analysis/names/*.jsonl (facade, reference, vendor, reference-align, auto, …) and
//         naming/semantic-*.jsonl — merged per binding with tools/naming/resolve.mjs's priority
//         (facade > semantic > vendor > reference > auto, then confidence).
// Output: JSONL {file, key:"@offset", min, name, source:"auto", confidence, via, note}.
// Only local bindings (parameters and function-scope locals) of minified modules that
// still carry a 1–3 character name and have no name from any source (auto `method` /
// `method-name` guesses excepted) are named. Rules (via, confidence):
//   call-arg      f(a) where f's parameter is named `foo`: every call agrees (or ≥2/3 of ≥3);
//                 f has at most 3 call sites (widely used helpers have generic parameter names);
//                 loop elements are left to iter-name; generic evidence (value, input, data …) ignored
//                                                                                        -> a = foo        0.35–0.45
//   call-param    f(x.foo) / f(foo) / f(getFoo()) at the call sites: ≥75% of named arguments
//                 agree and they are ≥2 and ≥ half the call sites, or f has a single call site
//                                                                                        -> param = foo    0.35–0.45
//   call-result   a = getFoo(…) / await loadFoo(…) / getFoo().then((a) => …) / [a, b] = await Promise.all([getA(), getB()])
//                 (useFoo(selector) skipped)                                             -> a = foo        0.35
//   iter-name     for (const a of messages) / messages.map((a) => …) (filter/find/some/every/forEach/flatMap/reduce)
//                                                                                        -> a = message    0.35
//   use-state     [a, b] = useState(…) with a named foo, or b named setFoo               -> setFoo / foo   0.4
//   use-ref       a = useRef(foo) / a.current = foo                                      -> fooRef         0.35
// Callees are resolved through local bindings and through imports to the exporting
// chunk's declaration (re-export chains followed); React's own hooks are not used as
// evidence. Rules run in rounds until no rule names anything new (a fixpoint, 3 rounds
// in 2.1.316); names found in later rounds lose 0.05 confidence. Names found by
// call-arg / call-param are not used as evidence again (guess chains drift).
import fs from 'node:fs';
import path from 'node:path';
import _traverse from '@babel/traverse';
import { listFiles, parseFile, minifiedModuleOf, singular, resultNameOf, usable, okName, upperFirst, lowerFirst, reactHooks, readJsonl, writeJsonlAtomic } from './lib/auto-common.mjs';

const traverse = _traverse.default ?? _traverse;
const A = process.argv[2] ?? 'analysis';
const outFile = process.argv[3] ?? path.join(A, 'names/propagate.jsonl');
const OUT_BASE = path.basename(outFile);
const REACT = reactHooks();
const PRIORITY = { facade: 5, semantic: 4, vendor: 3, reference: 2, auto: 1 };
// auto names too weak to be passed on to other bindings
const WEAK_VIA = new Set(['method', 'method-name', 'known-call', 'string-const', 'env', 'loop-index', 'reduce-acc', 'module-clash', 'for-in', 'iter-keys', 'entries']);
const ITER_METHODS = /^(map|forEach|filter|find|findLast|some|every|flatMap|findIndex|findLastIndex)$/;
const CHAIN = /^(filter|slice|sort|toSorted|reverse|toReversed|concat)$/;

// ---------------- phase A: facts from the code ----------------
const info = new Map(); // key -> {file, min, eligible, orig}
const fns = new Map(); // key -> {name: fnKey, params: [key|null]}
const calls = []; // {callee: ref, args: [desc|null], file}
const results = []; // {target, callee: ref}
const iters = []; // {target, coll: ref}
const elementKeys = new Set(); // for-of variables and iteration-callback parameters
const states = []; // {value, setter, init: desc}
const refs = []; // {target, init: desc, assigns: [desc]}
const exportsOf = new Map(); // file -> Map(exportName -> ref)
const files = listFiles();
const bkey = (file, b) => `${file}@${b.identifier.start}`;
let nf = 0;
for (const file of files) {
  const { ast } = parseFile(file);
  if (!ast) continue;
  traverse(ast, { Program(prog) { collect(file, prog); prog.stop(); } });
  if (++nf % 400 === 0) process.stderr.write(`parsed ${nf}/${files.length}\n`);
}

function collect(file, prog) {
  const mm = minifiedModuleOf(prog);
  const importOf = new Map(); // local -> {from, imported}
  const hookOf = new Map();
  for (const n of prog.node.body) {
    if (n.type !== 'ImportDeclaration') continue;
    const from = n.source.value;
    for (const sp of n.specifiers) {
      const imported = sp.type === 'ImportSpecifier' ? (sp.imported.name ?? sp.imported.value) : sp.type === 'ImportDefaultSpecifier' ? 'default' : '*';
      importOf.set(sp.local.name, { from, imported });
      if (from.replace(/^\.\//, '') === REACT.file && REACT.hooks.has(imported)) hookOf.set(sp.local.name, REACT.hooks.get(imported));
    }
  }
  const refOfBinding = (b) => {
    if (!b) return null;
    if (b.kind === 'module') {
      const im = importOf.get(b.identifier.name);
      if (!im) return null;
      return im.from.startsWith('.') ? `imp:${im.from.replace(/^\.\//, '')}|${im.imported}` : `x:${im.imported}`;
    }
    const k = bkey(file, b);
    if (!info.has(k)) {
      const eligible = mm && b.identifier.name.length <= 3 && b.scope.path.type !== 'Program';
      info.set(k, { file, min: b.identifier.name, eligible, orig: mm && b.identifier.name.length <= 3 ? null : b.identifier.name });
    }
    return k;
  };
  const exp = new Map();
  for (const n of prog.node.body) {
    if (n.type !== 'ExportNamedDeclaration' || n.declaration || n.source) continue;
    for (const s of n.specifiers) {
      const r = refOfBinding(prog.scope.getBinding(s.local.name));
      if (r) exp.set(s.exported.name ?? s.exported.value, r);
    }
  }
  exportsOf.set(file, exp);
  const hookCalled = (p, call) => {
    if (call?.type !== 'CallExpression' || call.callee.type !== 'Identifier') return null;
    const b = p.scope.getBinding(call.callee.name);
    return b?.kind === 'module' ? hookOf.get(call.callee.name) ?? null : null;
  };
  // value descriptor of an expression
  const descOf = (p) => {
    let n = p.node;
    if (!n) return null;
    if (n.type === 'AwaitExpression') { p = p.get('argument'); n = p.node; }
    if (n.type === 'Identifier') return refOfBinding(p.scope.getBinding(n.name));
    if ((n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') && !n.computed && n.property.type === 'Identifier') return `p:${n.property.name}`;
    if (n.type === 'CallExpression' || n.type === 'OptionalCallExpression') {
      const c = n.callee;
      if (c.type === 'Identifier') { const r = refOfBinding(p.scope.getBinding(c.name)); return r ? `c:${r}` : null; }
      if ((c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed && c.property.type === 'Identifier') return `m:${c.property.name}`;
    }
    return null;
  };
  const paramsOf = (fnPath) => fnPath.node.params.map((prm, i) => {
    const id = prm.type === 'AssignmentPattern' ? prm.left : prm;
    if (id.type !== 'Identifier') return null;
    return refOfBinding(fnPath.scope.getBinding(id.name));
  });
  const collRoot = (p) => {
    // unwrap array-preserving chains down to an identifier
    for (let i = 0; i < 6 && p?.node; i++) {
      const n = p.node;
      if (n.type === 'Identifier') return refOfBinding(p.scope.getBinding(n.name));
      if ((n.type === 'CallExpression' || n.type === 'OptionalCallExpression') && (n.callee.type === 'MemberExpression' || n.callee.type === 'OptionalMemberExpression') && !n.callee.computed && CHAIN.test(n.callee.property.name)) { p = p.get('callee.object'); continue; }
      if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.type === 'Identifier' && n.callee.object.name === 'Array' && n.callee.property.name === 'from' && n.arguments.length === 1) { p = p.get('arguments.0'); continue; }
      if (n.type === 'ArrayExpression' && n.elements.length === 1 && n.elements[0]?.type === 'SpreadElement') { p = p.get('elements.0.argument'); continue; }
      return null;
    }
    return null;
  };
  prog.traverse({
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(p) {
      let b = null;
      if (p.node.type === 'FunctionDeclaration' && p.node.id) b = p.parentPath.scope.getBinding(p.node.id.name);
      else if (p.parentPath.isVariableDeclarator() && p.parent.init === p.node && p.parent.id.type === 'Identifier') b = p.parentPath.scope.getBinding(p.parent.id.name);
      if (b && b.identifier === (p.node.id && p.node.type === 'FunctionDeclaration' ? p.node.id : p.parent.id)) {
        const k = refOfBinding(b);
        if (k && !fns.has(k)) fns.set(k, { params: paramsOf(p), name: k });
      }
      // callbacks: iteration and .then on a call
      const par = p.parent;
      if (p.listKey === 'arguments' && (par.type === 'CallExpression' || par.type === 'OptionalCallExpression') && (par.callee.type === 'MemberExpression' || par.callee.type === 'OptionalMemberExpression') && !par.callee.computed) {
        const mn = par.callee.property.name;
        const objPath = p.parentPath.get('callee.object');
        const prm = p.node.params;
        const target = (i) => (prm[i]?.type === 'Identifier' ? refOfBinding(p.scope.getBinding(prm[i].name)) : null);
        if (p.key === 0 && ITER_METHODS.test(mn)) { const t = target(0), c = collRoot(objPath); if (t) elementKeys.add(t); if (t && c) iters.push({ target: t, coll: c }); }
        if (p.key === 0 && mn === 'reduce') { const t = target(1), c = collRoot(objPath); if (t && c) iters.push({ target: t, coll: c }); }
        if (p.key === 0 && mn === 'then' && (objPath.node.type === 'CallExpression') && objPath.node.callee.type === 'Identifier') {
          const t = target(0), c = refOfBinding(objPath.scope.getBinding(objPath.node.callee.name));
          if (t && c) results.push({ target: t, callee: c });
        }
      }
    },
    ClassDeclaration(p) {
      const ctor = p.node.body.body.find((m) => m.type === 'ClassMethod' && m.kind === 'constructor');
      if (!ctor || !p.node.id) return;
      const k = refOfBinding(p.parentPath.scope.getBinding(p.node.id.name));
      const cp = p.get('body.body').find((m) => m.node === ctor);
      if (k && !fns.has(k)) fns.set(k, { params: paramsOf(cp), name: k });
    },
    'CallExpression|NewExpression'(p) {
      const c = p.node.callee;
      if (c.type !== 'Identifier') return;
      const callee = refOfBinding(p.scope.getBinding(c.name));
      if (!callee) return;
      const args = [];
      for (const ap of p.get('arguments')) {
        if (ap.node.type === 'SpreadElement') break;
        args.push(descOf(ap));
      }
      if (args.some(Boolean)) calls.push({ callee, args, file });
    },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (!init) return;
      const hook = hookCalled(p, init);
      if (id.type === 'Identifier') {
        const t = refOfBinding(p.scope.getBinding(id.name));
        if (!t || !info.get(t)?.eligible) return;
        if (hook === 'useRef') {
          const b = p.scope.getBinding(id.name);
          const assigns = [];
          for (const r of b.referencePaths) {
            const mp = r.parentPath;
            if (mp.isMemberExpression() && !mp.node.computed && mp.node.property.name === 'current' && mp.parentPath.isAssignmentExpression() && mp.parent.left === mp.node) assigns.push(descOf(mp.parentPath.get('right')));
          }
          refs.push({ target: t, init: init.arguments[0] ? descOf(p.get('init.arguments.0')) : null, assigns });
          return;
        }
        if (hook) return;
        let ip = p.get('init');
        if (ip.node.type === 'AwaitExpression') ip = ip.get('argument');
        if (ip.node.type === 'CallExpression' && ip.node.callee.type === 'Identifier') {
          const c = refOfBinding(ip.scope.getBinding(ip.node.callee.name));
          // useFoo(selector) returns what the selector picks, not a foo
          const fnArg = ip.node.arguments.some((a) => a.type === 'ArrowFunctionExpression' || a.type === 'FunctionExpression');
          if (c) results.push({ target: t, callee: c, fnArg });
        }
      } else if (id.type === 'ArrayPattern') {
        if (hook === 'useState') {
          const [v, s] = id.elements;
          const vk = v?.type === 'Identifier' ? refOfBinding(p.scope.getBinding(v.name)) : null;
          const sk = s?.type === 'Identifier' ? refOfBinding(p.scope.getBinding(s.name)) : null;
          if (vk || sk) states.push({ value: vk, setter: sk });
          return;
        }
        // [a, b] = await Promise.all([getA(), getB()])
        let ip = p.get('init');
        if (ip.node.type === 'AwaitExpression') ip = ip.get('argument');
        const n = ip.node;
        if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.type === 'Identifier' && n.callee.object.name === 'Promise' && /^(all|allSettled)$/.test(n.callee.property.name) && n.callee.property.name === 'all' && n.arguments[0]?.type === 'ArrayExpression') {
          const els = ip.get('arguments.0.elements');
          id.elements.forEach((e, i) => {
            if (e?.type !== 'Identifier' || !els[i]) return;
            let ep = els[i];
            if (ep.node?.type === 'AwaitExpression') ep = ep.get('argument');
            if (ep.node?.type !== 'CallExpression' || ep.node.callee.type !== 'Identifier') return;
            const t = refOfBinding(p.scope.getBinding(e.name));
            const c = refOfBinding(ep.scope.getBinding(ep.node.callee.name));
            if (t && c && info.get(t)?.eligible) results.push({ target: t, callee: c });
          });
        }
      }
    },
    ForOfStatement(p) {
      const l = p.node.left;
      if (l.type !== 'VariableDeclaration' || l.declarations[0].id.type !== 'Identifier') return;
      const t = refOfBinding(p.scope.getBinding(l.declarations[0].id.name));
      const c = collRoot(p.get('right'));
      if (t) elementKeys.add(t);
      if (t && c) iters.push({ target: t, coll: c });
    },
  });
}
console.error({ bindings: info.size, functions: fns.size, calls: calls.length, results: results.length, iters: iters.length, states: states.length, refs: refs.length });

// ---------------- names from every source ----------------
const names = new Map(); // key -> {name, rank, source, via, prop: bool}
const validName = (n) => typeof n === 'string' && /^[A-Za-z_$][\w$]*$/.test(n);
const sources = [
  ...fs.readdirSync(path.join(A, 'names')).filter((f) => f.endsWith('.jsonl') && f !== OUT_BASE && f !== 'propagate.jsonl').map((f) => path.join(A, 'names', f)),
  ...(fs.existsSync('naming') ? fs.readdirSync('naming').filter((f) => /^semantic-.*\.jsonl$/.test(f)).map((f) => path.join('naming', f)) : []),
];
for (const src of sources) {
  for (const c of readJsonl(src)) {
    if (!validName(c.name) || !c.key) continue;
    const k = `${c.file}${c.key}`;
    const rank = (PRIORITY[c.source] ?? 0) * 10 + (c.confidence ?? 0.5);
    const cur = names.get(k);
    if (!cur || rank > cur.rank) names.set(k, { name: c.name, rank, source: c.source, via: c.via });
  }
}
console.error({ sources: sources.length, named: names.size });

// ---------------- resolution ----------------
const resolveImp = (ref, depth = 0) => {
  if (!ref?.startsWith('imp:') || depth > 8) return ref;
  const [from, name] = ref.slice(4).split('|');
  const r = exportsOf.get(from)?.get(name);
  return r ? resolveImp(r, depth + 1) : null;
};
const accepted = new Map(); // key -> {name, conf, via, note, round}
// a name usable as evidence for other bindings
const PASS_ON = new Set(['call-result', 'iter-name', 'use-state']);
const nameOfKey = (k) => {
  // names found by call-arg / call-param are not passed on again: chains of guesses drift (spot check: 71% vs 94%)
  const a = accepted.get(k);
  if (a) return PASS_ON.has(a.via) ? a.name : null;
  const n = names.get(k);
  if (n) return n.source === 'auto' && WEAK_VIA.has(n.via) ? null : n.name;
  return info.get(k)?.orig ?? null;
};
// a binding already named by a source keeps its name, except the weakest auto guesses (x.foo() -> 'filtered', 'mapped' …)
const OVERRIDABLE = new Set(['method', 'method-name']);
const srcOfKey = (k) => { const a = accepted.get(k); if (a) return 'p:' + a.via; const n = names.get(k); if (n) return n.source + (n.via ? '/' + n.via : ''); return 'orig'; };
const hasName = (k) => { if (accepted.has(k)) return true; const n = names.get(k); return !!n && !(n.source === 'auto' && OVERRIDABLE.has(n.via)); };
const nameOfRef = (ref) => {
  if (!ref) return null;
  if (ref.startsWith('x:')) return ref.slice(2);
  const r = resolveImp(ref);
  if (!r) return null;
  if (r.startsWith('x:')) return r.slice(2);
  return nameOfKey(r);
};
const fnOf = (ref) => {
  const r = resolveImp(ref);
  return r && !r.startsWith('x:') ? fns.get(r) : null;
};
const descName = (d) => {
  if (!d) return null;
  if (d.startsWith('p:')) { const n = d.slice(2); return /^(length|current|default|prototype|constructor|size|then)$/.test(n) ? null : n; }
  if (d.startsWith('c:')) return resultNameOf(nameOfRef(d.slice(2)));
  if (d.startsWith('m:')) return resultNameOf(d.slice(2));
  return nameOfRef(d);
};
const MAX_HELPER_CALLS = 3;
const GENERIC_PARAM = /^(value|values|input|data|obj|object|item|items|arg|args|val|str|string|thing|other|first|second|left|right|rest|self|that)$/;
// names that are engine suffix artifacts (a_5) or generic evidence are not passed on
const niceEvidence = (n) => (typeof n === 'string' && !/_\d+$/.test(n) && !GENERIC_PARAM.test(n) ? nice(n) : null);
const nice = (n) => (typeof n === 'string' && /^[a-z]/.test(n) && usable(n) && !/^[a-z]+_[a-z]/.test(n) ? n : typeof n === 'string' && /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(n) ? n.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()) : null);
const target = (k) => k && !k.startsWith('imp:') && !k.startsWith('x:') && info.get(k)?.eligible && !hasName(k);

// callers of each function (resolved)
const callsOf = new Map(); // fnKey -> [call]
for (const c of calls) {
  const r = resolveImp(c.callee);
  if (!r || r.startsWith('x:') || !fns.has(r)) continue;
  // React's own parameter names (useEffect(create, deps) …) describe React internals, not the caller's values
  if (REACT.file && r.startsWith(REACT.file + '@')) continue;
  c.fn = r;
  let a = callsOf.get(r);
  if (!a) callsOf.set(r, (a = []));
  a.push(c);
}
console.error({ resolvedCalls: [...callsOf.values()].reduce((s, a) => s + a.length, 0), calledFunctions: callsOf.size });

const RULE_ORDER = ['use-state', 'call-arg', 'call-result', 'iter-name', 'call-param', 'use-ref'];
const stats = Object.fromEntries(RULE_ORDER.map((r) => [r, 0]));
for (let round = 1; round <= 40; round++) {
  const props = new Map(); // key -> {name, conf, via, note}
  const propose = (k, name, conf, via, note) => {
    name = nice(name);
    if (!name || !target(k) || name === info.get(k).min) return;
    if (round > 1) conf = Math.max(0.3, conf - 0.05);
    const cur = props.get(k);
    if (cur && (cur.conf > conf || (cur.conf === conf && RULE_ORDER.indexOf(cur.via) <= RULE_ORDER.indexOf(via)))) return;
    props.set(k, { name, conf: +conf.toFixed(2), via, note });
  };
  // use-state pairs
  for (const s of states) {
    const vn = s.value && nameOfKey(s.value), sn = s.setter && nameOfKey(s.setter);
    if (vn && !target(s.value) && s.setter && /^[a-z]/.test(vn)) propose(s.setter, 'set' + upperFirst(vn), 0.4, 'use-state', `state ${vn}`);
    if (sn && /^set[A-Z]/.test(sn) && s.value) propose(s.value, lowerFirst(sn.slice(3)), 0.4, 'use-state', `setter ${sn}`);
  }
  // call-arg: votes from the callee's parameter names
  const votes = new Map(); // key -> Map(name -> count)
  const srcs = new Map();
  for (const [fk, cs] of callsOf) {
    const f = fns.get(fk);
    // widely used helpers (jsonStringify(value), normalize(path) …) have generic parameter names: their callers' values are more specific
    if (cs.length > MAX_HELPER_CALLS) continue;
    for (const c of cs) {
      c.args.forEach((d, i) => {
        // loop elements are named after their collection instead (spot check: most call-arg misses were elements)
        if (!target(d) || elementKeys.has(d) || i >= f.params.length || !f.params[i] || f.params[i] === d) return;
        const pn = niceEvidence(nameOfKey(f.params[i]));
        if (!pn) return;
        let m = votes.get(d);
        if (!m) votes.set(d, (m = new Map()));
        m.set(pn, (m.get(pn) ?? 0) + 1);
        (srcs.get(d) ?? srcs.set(d, new Set()).get(d)).add(srcOfKey(f.params[i]));
      });
    }
  }
  for (const [k, m] of votes) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    const [best, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (n === tot) propose(k, best, n >= 2 ? 0.45 : 0.4, 'call-arg', `passed as ${best} (${n} call${n > 1 ? 's' : ''}) [${[...srcs.get(k)].join(',')}] r${round}`);
    else if (n >= 3 && n / tot >= 2 / 3) propose(k, best, 0.35, 'call-arg', `passed as ${best} (${n}/${tot} calls)`);
  }
  // call-param: votes from the arguments at every call site
  for (const [fk, cs] of callsOf) {
    const f = fns.get(fk);
    f.params.forEach((pk, i) => {
      if (!target(pk)) return;
      const m = new Map();
      let sites = 0;
      for (const c of cs) {
        if (i >= c.args.length) continue;
        sites++;
        const n = niceEvidence(descName(c.args[i]));
        if (n) m.set(n, (m.get(n) ?? 0) + 1);
      }
      if (!m.size) return;
      const named = [...m.values()].reduce((a, b) => a + b, 0);
      const [best, n] = [...m].sort((a, b) => b[1] - a[1])[0];
      if (n / named < 0.75) return;
      // at least half of the call sites must pass the name; one call site alone is enough only when it is the only one
      if (n >= 2 && n / sites >= 0.5) propose(pk, best, n === named && n >= 3 ? 0.45 : 0.4, 'call-param', `callers pass ${best} (${n}/${sites})`);
      else if (sites === 1) propose(pk, best, 0.35, 'call-param', `the only caller passes ${best}`);
    });
  }
  // call-result
  for (const r of results) {
    if (!target(r.target)) continue;
    const cn = nameOfRef(r.callee);
    if (r.fnArg && /^use[A-Z]/.test(cn ?? '')) continue;
    const n = resultNameOf(cn);
    if (n) propose(r.target, n, 0.35, 'call-result', `= ${cn}()`);
  }
  // iter-name
  for (const it of iters) {
    if (!target(it.target)) continue;
    const cn = nameOfRef(it.coll);
    const s0 = cn && singular(cn);
    const s = s0 && /^all[A-Z]/.test(s0) ? lowerFirst(s0.slice(3)) : s0; // allAgents -> agent
    if (s) propose(it.target, s, 0.35, 'iter-name', `element of ${cn}`);
  }
  // use-ref
  for (const r of refs) {
    if (!target(r.target)) continue;
    const cands = [r.init, ...r.assigns].map(descName).map(niceEvidence).filter(Boolean);
    const set = new Set(cands);
    if (set.size === 1) { const [n] = set; if (!/Ref$/.test(n)) propose(r.target, n + 'Ref', 0.35, 'use-ref', `holds ${n}`); }
  }
  if (!props.size) { console.error({ round, fixpoint: true }); break; }
  for (const [k, v] of props) { accepted.set(k, { ...v, round }); stats[v.via]++; }
  console.error({ round, named: props.size });
}

const rows = [];
for (const [k, v] of accepted) {
  const i = k.lastIndexOf('@');
  rows.push({ file: k.slice(0, i), key: k.slice(i), min: info.get(k).min, name: v.name, source: 'auto', confidence: v.conf, via: v.via, note: v.note });
}
rows.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : +a.key.slice(1) - +b.key.slice(1)));
writeJsonlAtomic(outFile, rows);
console.log({ propagated: rows.length, rules: stats });

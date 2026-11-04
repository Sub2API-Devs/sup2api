// What each top-level statement of a chunk reads while it runs ("load time"), and what the
// functions it defines read when they are called.
//   import { chunkInitFacts } from './init-deps.mjs'
//   chunkInitFacts(ast, analysis, decls) -> Map(statement start -> { init: Ref[], body: Ref[] })
//     ast, analysis  Babel AST and tools/rename/lib/scope.mjs analysis of the chunk
//     decls          the chunk's top-level statements (analysis/scan/decls.jsonl records)
//     Ref            { local: <statement start> } | { from: <module>, imported: <name> }
//   loads / bodyLoads: the statement / its functions call require() or import() (they load modules)
//   init: module-level bindings read while the statement itself is evaluated — everything
//         outside nested function bodies, plus immediately invoked function bodies, class
//         heritage, static fields / blocks and computed keys;
//   body: module-level bindings referenced inside the nested function bodies (what a call of the
//         function defined by the statement can read).
// Used by tools/emit/eval-order.mjs (docs/process/buildable.md, "evaluation order").
import { OCC } from '../rename/lib/scope.mjs';

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range']);
const isFn = (n) => n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration'
  || n.type === 'ObjectMethod' || n.type === 'ClassMethod' || n.type === 'ClassPrivateMethod';

function children(n, cb) {
  for (const k of Object.keys(n)) {
    if (SKIP_KEYS.has(k)) continue;
    const v = n[k];
    if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') cb(x, k); }
    else if (v && typeof v.type === 'string') cb(v, k);
  }
}

// identifiers evaluated at load time (init) and inside function bodies (body). A function passed
// as an argument counts as called right away (`[a, b].flatMap((x) => f(x))`, `new Promise(fn)`) —
// unless the callee is one of the Bun runtime's lazy wrappers (isLazyWrapper), whose argument
// only runs when the wrapper's result is called.
function walkStatement(stmt, onInit, onBody, isLazyWrapper = () => false, onLoad = () => {}, onBodyLoad = () => {}, onCall = () => {}) {
  const isLoad = (x) => (x.type === 'CallExpression' && ((x.callee.type === 'Identifier' && x.callee.name === 'require' && !x.callee[OCC]?.binding) || x.callee.type === 'Import'));
  const bodyWalk = (n) => {
    const st = [n];
    while (st.length) {
      const x = st.pop();
      if (x.type === 'Identifier') onBody(x);
      else if (isLoad(x)) onBodyLoad();
      children(x, (c) => st.push(c));
    }
  };
  // active: the identifier's value is used in a way that may run code (called, constructed, a
  // property read, passed to a call, spread, extended) — as opposed to a plain read of the value
  const visit = (n, invoked, active = false) => {
    if (isFn(n)) {
      if (n.type === 'ObjectMethod' || n.type === 'ClassMethod' || n.type === 'ClassPrivateMethod') { if (n.computed) visit(n.key); bodyWalk(n.body); for (const p of n.params) bodyWalk(p); return; }
      // parameters' default values and the body run at call time
      if (invoked) { for (const p of n.params) visit(p); visit(n.body); }
      else { for (const p of n.params) bodyWalk(p); bodyWalk(n.body); }
      return;
    }
    switch (n.type) {
      case 'Identifier': onInit(n, active); return;
      case 'CallExpression': case 'NewExpression': case 'OptionalCallExpression': {
        let c = n.callee;
        while (c.type === 'ParenthesizedExpression') c = c.expression;
        // require("./x") / import("./x") while loading: the statement loads other modules now
        if ((c.type === 'Identifier' && c.name === 'require' && !c[OCC]?.binding) || c.type === 'Import') onLoad();
        const lazy = c.type === 'Identifier' && isLazyWrapper(c);
        if (!lazy) onCall();
        visit(c, true, true); // (function () { … })() runs now
        for (const a of n.arguments) visit(a, !lazy, !lazy);
        return;
      }
      case 'MemberExpression': case 'OptionalMemberExpression':
        if (n.object.type === 'Identifier' && !n.object[OCC]?.binding) onCall(); // a property of a global (process.env.X …)
        visit(n.object, false, true);
        if (n.computed) visit(n.property);
        return;
      case 'SpreadElement': visit(n.argument, false, true); return;
      case 'ClassDeclaration': case 'ClassExpression':
        if (n.superClass) visit(n.superClass, false, true);
        visit(n.body);
        return;
      case 'ClassProperty': case 'ClassPrivateProperty': case 'ClassAccessorProperty':
        if (n.computed) visit(n.key);
        if (n.value) { if (n.static) visit(n.value); else bodyWalk(n.value); }
        return;
      case 'StaticBlock': for (const s of n.body) visit(s); return;
      case 'AssignmentExpression':
        // `x = v` writes x without reading it; compound assignments (`x ??= v`, `x += v`) read it too
        if (n.operator === '=') writeTarget(n.left);
        else visit(n.left);
        visit(n.right);
        return;
      case 'TaggedTemplateExpression': onCall(); visit(n.tag, true, true); visit(n.quasi); return;
      default: children(n, (c) => visit(c));
    }
  };
  // an assignment target: bindings in it are written, not read; member targets read their object,
  // default values in patterns are read
  const writeTarget = (p) => {
    switch (p.type) {
      case 'Identifier': return;
      case 'MemberExpression': case 'OptionalMemberExpression': visit(p.object, false, true); if (p.computed) visit(p.property); return;
      case 'ObjectPattern': for (const q of p.properties) { if (q.type === 'RestElement') writeTarget(q.argument); else { if (q.computed) visit(q.key); writeTarget(q.value); } } return;
      case 'ArrayPattern': for (const q of p.elements) if (q) writeTarget(q); return;
      case 'AssignmentPattern': writeTarget(p.left); visit(p.right); return;
      case 'RestElement': writeTarget(p.argument); return;
      case 'ParenthesizedExpression': writeTarget(p.expression); return;
      default: visit(p);
    }
  };
  visit(stmt);
}

export function chunkInitFacts(ast, an, decls, { isRuntimeSource = () => false } = {}) {
  const sorted = [...decls].sort((a, b) => a.start - b.start);
  const stmtAt = (pos) => {
    let lo = 0, hi = sorted.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (sorted[m].end <= pos) lo = m + 1; else if (sorted[m].start > pos) hi = m - 1; else return sorted[m]; }
    return null;
  };
  const importOf = new Map();
  for (const s of an.importSpecs) if (s.localOcc?.binding) importOf.set(s.localOcc.binding, { from: s.source, imported: s.imported });
  const refOf = (id) => {
    const b = id[OCC]?.binding;
    if (!b || b.scope !== an.module) return null;
    if (b.kind === 'import') return importOf.get(b) ?? null;
    const d = b.decls[0] && stmtAt(b.decls[0].start);
    return d ? { local: d.start } : null;
  };
  const out = new Map();
  for (const stmt of ast.program.body) {
    const d = stmtAt(stmt.start);
    if (!d) continue;
    let rec = out.get(d.start);
    if (!rec) out.set(d.start, (rec = { init: new Map(), body: new Map(), loads: false, bodyLoads: false, calls: false, declOnly: true }));
    // `var x;` without an initialiser: hoisted, the value is undefined before and after it runs
    if (!(stmt.type === "VariableDeclaration" && stmt.kind === "var" && stmt.declarations.every((x) => !x.init))) rec.declOnly = false;
    const add = (m) => (id, active = false) => {
      // the statement's own declared names are not dependencies
      if (id[OCC]?.role === 'decl') return;
      const r = refOf(id);
      if (!r || r.local === d.start) return;
      const k = r.local !== undefined ? '@' + r.local : r.from + '|' + r.imported;
      if (!m.has(k)) m.set(k, { ...r, active }); else if (active) m.get(k).active = true;
    };
    const isLazyWrapper = (id) => { const im = importOf.get(id[OCC]?.binding); return !!im && isRuntimeSource(im.from); };
    walkStatement(stmt, add(rec.init), add(rec.body), isLazyWrapper, () => { rec.loads = true; }, () => { rec.bodyLoads = true; }, () => { rec.calls = true; });
  }
  for (const [k, rec] of out) out.set(k, { init: [...rec.init.values()], body: [...rec.body.values()], loads: rec.loads, bodyLoads: rec.bodyLoads, calls: rec.calls, declOnly: rec.declOnly });
  return out;
}

// Evaluation order of the reading tree as ES modules, and the statements whose load-time work has
// to wait until the import cycle they are in is complete.
//   import { planEvaluation, esmOrder } from './eval-order.mjs'
//   planEvaluation({ modules, entry, programs, loadTargets, depsOf, hoisted, sameChunkLater, keyOf, orderEffects })
//     programs     [file…] entries of other programs (a worker thread): evaluated from scratch
//     modules      Map(file -> { decls: [statement…] in module order, imports: [file…] static, in source order })
//     entry        the program's entry module
//     loadTargets  [file…] modules loaded by import() / require()
//     depsOf(s)    -> { init: [{ decl, active }…], loads } (tools/emit/init-deps.mjs, resolved to statements):
//                  bindings s reads while it runs; active = used in a way that may run code (called,
//                  constructed, property read, passed to a call, spread, extended); loads = s calls
//                  require() / import(); calls = s calls something (or reads a property of a global) while it
//                  runs; declOnly = s is `var x;` (no initialiser: nothing to wait for)
//     keyOf(s)     [chunk rank, offset]: the official evaluation order
//     hoisted(s)   true for function declarations (initialised when the module is instantiated)
//     sameChunkLater(s, t)  the original evaluates t after s in the same chunk (so s cannot need t's value)
//   -> { loads, cycles: [{ load, members, first, root, deferred }], deferred: Set(statement),
//        reason: Map(statement -> statement | null (loads modules) | "effects"), stats }
//
// The rule (docs/process/buildable.md, "evaluation order"). The official build evaluates a chunk's
// statements in order once every chunk it imports is evaluated: whatever a statement can reach — the
// bindings it reads, the functions it calls and everything they call — is complete. ES modules give the
// reading tree the same guarantee for every module that is not in an import cycle: it is evaluated
// after all the modules it imports, transitively. Inside a cycle (a strongly connected component of the
// modules one load evaluates) a module may run while modules it reaches are not yet evaluated. So a
// statement of a module in a cycle is deferred when, while it runs, it
//   - touches a binding of the cycle in a way that may run code (calls a function of the cycle, reads a
//     property of one of its objects, passes one to a call, extends one of its classes …),
//   - reads a value of the cycle that is not evaluated yet, or is itself deferred, or
//   - loads modules (require() / import()).
// Calls into modules outside the cycle are safe: such a module cannot reach the cycle (it would be part
// of it), and it is complete. Once a statement of a cycle waits, every later statement of the cycle
// (official order) that has load-time effects waits too (orderEffects), so effects keep their order.
// Deferred statements run when the cycle is complete — the last module of the cycle to finish (its root)
// ends with runDeferredInits(root), the first one to start begins with beginDeferredInits(root) — in the
// order of the official build (keyOf: chunk order, then offset).

export function esmOrder(imports, roots, done = new Set()) {
  const order = [];
  const state = new Set(done);
  for (const root of roots) {
    if (state.has(root)) continue;
    state.add(root);
    const stack = [[root, 0]];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const deps = imports.get(top[0]) ?? [];
      if (top[1] < deps.length) {
        const t = deps[top[1]++];
        if (!state.has(t) && imports.has(t)) { state.add(t); stack.push([t, 0]); }
      } else { stack.pop(); order.push(top[0]); }
    }
  }
  return order;
}

// strongly connected components of the modules in `nodes` (Tarjan, iterative)
function sccsOf(nodes, imports) {
  const inSet = new Set(nodes);
  const idx = new Map(), low = new Map(), on = new Set(), st = [], out = [];
  let index = 0;
  for (const root of nodes) {
    if (idx.has(root)) continue;
    const work = [[root, 0]];
    idx.set(root, index); low.set(root, index); index++; st.push(root); on.add(root);
    while (work.length) {
      const fr = work[work.length - 1];
      const v = fr[0];
      const deps = imports.get(v) ?? [];
      if (fr[1] < deps.length) {
        const w = deps[fr[1]++];
        if (!inSet.has(w)) continue;
        if (!idx.has(w)) { idx.set(w, index); low.set(w, index); index++; st.push(w); on.add(w); work.push([w, 0]); }
        else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
      } else {
        work.pop();
        if (work.length) { const u = work[work.length - 1][0]; low.set(u, Math.min(low.get(u), low.get(v))); }
        if (low.get(v) === idx.get(v)) { const c = []; let w; do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v); out.push(c); }
      }
    }
  }
  return out;
}

export function planEvaluation({ modules, entry, programs = [], loadTargets, depsOf, hoisted, sameChunkLater, keyOf, orderEffects = true }) {
  let effectsDeferred = 0;
  const imports = new Map([...modules].map(([f, m]) => [f, m.imports]));
  const moduleOf = new Map();
  for (const [f, m] of modules) for (const d of m.decls) moduleOf.set(d, f);
  const startup = esmOrder(imports, [entry]);
  const startupSet = new Set(startup);
  const loads = [{ root: entry, modules: startup }];
  // other programs (a worker thread) evaluate their modules from scratch
  for (const p of programs) loads.push({ root: p, modules: esmOrder(imports, [p]) });
  for (const t of loadTargets) if (!startupSet.has(t)) loads.push({ root: t, modules: esmOrder(imports, [t], startupSet) });

  const deferred = new Set();
  const reason = new Map();
  const cycles = []; // { load, members, first, root, deferred }
  const role = new Map(); // module -> Set of "first:<root>" / "root:<root>" / "member:<root>" over all loads
  const note = (f, r) => { if (!role.has(f)) role.set(f, new Set()); role.get(f).add(r); };
  for (const load of loads) {
    const pos = new Map(load.modules.map((f, i) => [f, i]));
    for (const members of sccsOf(load.modules, imports)) {
      if (members.length < 2) continue;
      const inCycle = new Set(members);
      members.sort((a, b) => pos.get(a) - pos.get(b));
      const first = members[0], root = members[members.length - 1];
      const at = new Map();
      for (const f of members) modules.get(f).decls.forEach((d, di) => at.set(d, [pos.get(f), di]));
      const ready = (t, key) => { if (depsOf(t).declOnly) return true; const k = at.get(t); return !!k && (k[0] < key[0] || (k[0] === key[0] && k[1] < key[1])); };
      let n = 0;
      const settle = () => { for (let changed = true; changed; ) {
        changed = false;
        for (const [s, key] of at) {
          if (deferred.has(s) || moduleOf.get(s) === entry) continue;
          const deps = depsOf(s);
          let why;
          if (deps.loads) why = null;
          else {
            for (const { decl: t, active } of deps.init) {
              if (t === s || !inCycle.has(moduleOf.get(t))) continue;
              if (active) { why = t; break; }
              if (hoisted(t) || sameChunkLater(s, t)) continue;
              if (!ready(t, key) || deferred.has(t)) { why = t; break; }
            }
            if (why === undefined) continue;
          }
          deferred.add(s);
          reason.set(s, why);
          changed = true;
        }
      } };
      settle();
      // order of observable effects: once a statement of the cycle waits, every later statement of the
      // cycle (in the official order) that is not inert waits too, so that the statements that can see
      // each other's effects (calls, properties of globals and shared objects) keep the official order
      if (orderEffects) {
        let firstKey = null;
        for (const s of at.keys()) if (deferred.has(s)) { const k = keyOf(s); if (!firstKey || k[0] < firstKey[0] || (k[0] === firstKey[0] && k[1] < firstKey[1])) firstKey = k; }
        if (firstKey) for (const s of at.keys()) {
          if (deferred.has(s) || moduleOf.get(s) === entry || hoisted(s)) continue;
          const k = keyOf(s);
          if (k[0] < firstKey[0] || (k[0] === firstKey[0] && k[1] <= firstKey[1])) continue;
          const deps = depsOf(s);
          if (!deps.calls && !deps.init.some((x) => x.active)) continue; // inert: literals, functions, plain reads
          deferred.add(s);
          reason.set(s, 'effects');
          effectsDeferred++;
        }
      }
      if (orderEffects) settle();
      for (const s of at.keys()) if (deferred.has(s)) n++;
      cycles.push({ load: load.root, members: members.length, first, root, deferred: n });
      if (n) { note(first, 'first:' + root); note(root, 'root:' + root); for (const f of members) note(f, 'member:' + root); }
    }
  }
  // informational: modules with deferred statements that open or close cycles under different names
  // in different loads (they carry the calls for each; the runtime acts on the open one), and modules
  // evaluated by some load outside any cycle (there their deferred work runs at once)
  const deferredModules = new Set([...deferred].map((d) => moduleOf.get(d)));
  let multiRole = 0, notInCycle = 0;
  for (const f of deferredModules) if (new Set([...(role.get(f) ?? [])].map((x) => x.slice(x.indexOf(":") + 1))).size > 1) multiRole++;
  for (const load of loads) {
    const cyc = new Set(sccsOf(load.modules, imports).filter((c) => c.length > 1).flat());
    for (const f of load.modules) if (deferredModules.has(f) && !cyc.has(f)) notInCycle++;
  }
  const big = cycles.filter((c) => c.deferred).sort((a, b) => b.members - a.members);
  return {
    loads, cycles, deferred, reason,
    stats: { loads: loads.length, startupModules: startup.length, cycles: cycles.length, cyclesWithDeferred: big.length, deferred: deferred.size, forEffectOrder: effectsDeferred, loadsModules: [...reason.values()].filter((x) => x === null).length, multiRole, notInCycle, largest: big.slice(0, 5).map((c) => ({ load: c.load, members: c.members, deferred: c.deferred, root: c.root })) },
  };
}

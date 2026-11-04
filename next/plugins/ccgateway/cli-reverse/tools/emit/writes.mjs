// Facts about module-level bindings that a top-level statement assigns although another
// statement declares them (`var y; … function f(){ y = 1 }`), per chunk of original/.
//   import { chunkWrites } from './writes.mjs'
//   chunkWrites(ast, analysis, decls) -> [{ name, declStart, writerStarts: [start…] }]
//     ast, analysis: Babel AST and tools/rename/lib/scope.mjs analysis of the chunk
//     decls: the chunk's top-level statements from analysis/scan/decls.jsonl ({start, end})
// Used by tools/emit/readable.mjs: in ESM an imported binding cannot be assigned, so a
// statement that assigns a module-level binding must be emitted into the module that
// declares it (docs/process/buildable.md, "assignments across modules").
import { OCC } from '../rename/lib/scope.mjs';

function patternIds(p, out) {
  if (!p) return out;
  switch (p.type) {
    case 'Identifier': out.push(p); break;
    case 'ObjectPattern': for (const q of p.properties) patternIds(q.type === 'RestElement' ? q.argument : q.value, out); break;
    case 'ArrayPattern': for (const q of p.elements) patternIds(q, out); break;
    case 'AssignmentPattern': patternIds(p.left, out); break;
    case 'RestElement': patternIds(p.argument, out); break;
    case 'ParenthesizedExpression': patternIds(p.expression, out); break;
    default: break; // member expressions write properties, not bindings
  }
  return out;
}

export function writeTargets(ast) {
  const out = [];
  const stack = [ast.program];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n.type !== 'string') continue;
    if (n.type === 'AssignmentExpression') patternIds(n.left, out);
    else if (n.type === 'UpdateExpression') patternIds(n.argument, out);
    else if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left.type !== 'VariableDeclaration') patternIds(n.left, out);
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') stack.push(x); }
      else if (v && typeof v.type === 'string') stack.push(v);
    }
  }
  return out;
}

export function chunkWrites(ast, an, decls) {
  const sorted = [...decls].sort((a, b) => a.start - b.start);
  const stmtAt = (pos) => {
    let lo = 0, hi = sorted.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (sorted[m].end <= pos) lo = m + 1; else if (sorted[m].start > pos) hi = m - 1; else return sorted[m]; }
    return null;
  };
  const byBinding = new Map();
  const note = (b, w, v) => {
    let e = byBinding.get(b);
    if (!e) byBinding.set(b, (e = { name: b.name, kind: b.kind, declStart: v.start, writerStarts: new Set() }));
    e.writerStarts.add(w.start);
  };
  for (const id of writeTargets(ast)) {
    const b = id[OCC]?.binding;
    if (!b || b.scope !== an.module || b.kind === 'import') continue;
    const w = stmtAt(id.start);
    const declNode = b.decls[0];
    const v = declNode && stmtAt(declNode.start);
    if (!w || !v || w === v) continue;
    note(b, w, v);
  }
  // `var v; … var v = 1;` — every further declaring statement writes the same binding
  for (const b of an.module.names.values()) {
    if (b.decls.length < 2 || b.kind === 'import') continue;
    const v = stmtAt(b.decls[0].start);
    for (const d of b.decls.slice(1)) { const w = stmtAt(d.start); if (v && w && w !== v) note(b, w, v); }
  }
  return [...byBinding.values()].map((e) => ({ ...e, writerStarts: [...e.writerStarts] }));
}

// Renames the bindings of the function-hooks worker (a second program, not one of the scanned
// chunks, so tools/rename does not cover it) and proves the renaming changes no reference.
//   import { renameWorker } from './worker-names.mjs'
//   const { code, renamed, unnamed } = renameWorker(src, table, importNames)
// src          original/src/plugins/functionHooks/hooks-worker/hooks-worker.js
// table        naming/worker-hooks-worker.json (tools/naming/worker-bindings.mjs): [{ at, min, name }],
//              at = offset of the binding's declaring identifier in src
// importNames  Map(local name of an import -> the name the reading tree exports it under); a table
//              entry with a name wins
// Returns the program without its import declarations (tools/emit/readable.mjs writes the imports).
// Throws when a new name is not a valid identifier, two bindings of one scope get the same name, or
// any identifier resolves to another binding (or global) after the renaming than before it.
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generator from '@babel/generator';
import * as t from '@babel/types';

const traverse = _traverse.default ?? _traverse;
const generate = _generator.generate ?? _generator.default ?? _generator;
const RESERVED = new Set(['arguments', 'eval', 'undefined', 'await', 'yield', 'let', 'static', 'enum', 'implements', 'interface', 'package', 'private', 'protected', 'public']);

// Identifier node -> the declaring identifier node of its binding, or "global:<name>"
function resolution(ast) {
  const r = new Map();
  traverse.cache.clear();
  traverse(ast, {
    'Identifier|JSXIdentifier'(p) {
      if (!(p.isReferencedIdentifier() || p.isBindingIdentifier()) || p.key === 'label') return;
      const b = p.scope.getBinding(p.node.name);
      r.set(p.node, b ? b.identifier : 'global:' + p.node.name);
    },
  });
  return r;
}

export function renameWorker(src, table, importNames) {
  const ast = parse(src, { sourceType: 'module', errorRecovery: false });
  const before = resolution(ast);
  const byAt = new Map(table.filter((e) => e.name).map((e) => [e.at, e.name]));
  const plan = []; // [scope, old, new]
  let unnamed = 0;
  traverse.cache.clear();
  traverse(ast, {
    Scope(p) {
      const final = []; // the name every binding of this scope ends up with
      for (const [old, b] of Object.entries(p.scope.bindings)) {
        if (b.scope !== p.scope) continue;
        const name = byAt.get(b.identifier.start) ?? (b.kind === 'module' ? importNames.get(old) : undefined);
        if (!name) { if (b.kind !== 'module') unnamed++; final.push(old); continue; }
        if (!t.isValidIdentifier(name) || RESERVED.has(name)) throw new Error(`worker: "${name}" (for ${old} at ${b.identifier.start}) is not a usable identifier`);
        plan.push([p.scope, old, name]);
        final.push(name);
      }
      const dup = final.find((n, i) => final.indexOf(n) !== i);
      if (dup) throw new Error(`worker: two bindings of one scope named ${dup}`);
    },
  });
  // rename through temporary names first, so that a -> b, b -> a style plans cannot collide midway
  const tmp = plan.map(([scope, old], i) => { const n = `__worker_rename_${i}__`; scope.rename(old, n); return n; });
  plan.forEach(([scope, , name], i) => { if (tmp[i] !== name) scope.rename(tmp[i], name); });
  const after = resolution(ast);
  for (const [node, target] of before) {
    if (after.get(node) !== target) throw new Error(`worker: renaming changes what ${node.name} at ${node.start} refers to`);
  }
  const body = ast.program.body.filter((n) => !t.isImportDeclaration(n));
  const code = generate(t.program(body, ast.program.directives), { comments: false }).code;
  return { code, renamed: plan.length, unnamed };
}

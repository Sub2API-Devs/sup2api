// Lists the bindings of the function-hooks worker (a second program, not one of the scanned chunks),
// as the skeleton of its naming table.
//   node tools/naming/worker-bindings.mjs [naming/worker-hooks-worker.json]
// Input:  original/src/plugins/functionHooks/hooks-worker/hooks-worker.js
// Output: the table (JSON array, one entry per binding declared in the worker, in source order):
//   { at: <offset of the binding's declaring identifier in the original file>, min: <minified name>,
//     kind: <var|let|const|param|function|class|import|catch|...>, in: <enclosing function names>,
//     name: <readable name, filled by hand; an existing table keeps its names>, note: <optional> }
// Imports get the name the reading tree exports them under (tools/emit/readable.mjs applies the table).
import fs from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default ?? _traverse;
const SRC = 'original/src/plugins/functionHooks/hooks-worker/hooks-worker.js';
const OUT = process.argv[2] ?? 'naming/worker-hooks-worker.json';
const src = fs.readFileSync(SRC, 'utf8');
const ast = parse(src, { sourceType: 'module' });
const old = fs.existsSync(OUT) ? new Map(JSON.parse(fs.readFileSync(OUT, 'utf8')).map((e) => [e.at, e])) : new Map();
const rows = [];
const seen = new Set();
traverse(ast, {
  Scope(p) {
    for (const [min, b] of Object.entries(p.scope.bindings)) {
      const at = b.identifier.start;
      if (seen.has(at)) continue;
      seen.add(at);
      const fns = [];
      for (let q = b.path; q; q = q.parentPath) if (q.isFunction() || q.isClass()) {
        const id = q.node.id?.name ?? (q.parentPath.isVariableDeclarator() ? q.parentPath.node.id.name : q.parentPath.isObjectProperty() || q.parentPath.isClassMethod() ? q.parentPath.node.key?.name : '');
        if (q !== b.path) fns.unshift(id || '(anonymous)');
      }
      const prev = old.get(at);
      rows.push({ at, min, kind: b.kind === 'module' ? 'import' : b.kind, in: fns.join('/'), name: prev?.name ?? '', ...(prev?.note ? { note: prev.note } : {}), refs: b.referencePaths.length, line: src.slice(0, at).split('\n').length });
    }
  },
});
rows.sort((a, b) => a.at - b.at);
fs.writeFileSync(OUT, '[\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n');
console.log(`${rows.length} bindings -> ${OUT} (${rows.filter((r) => r.name).length} named)`);

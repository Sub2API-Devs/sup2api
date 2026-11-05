// Version change list: what the changed, removed and added units of two module trees are about.
// For every unit (module-scope binding, as in equiv.cjs) it records the content tokens that came and
// went: string literals, template text, property names and global names (they survive
// minification), plus the readable names and reading-tree paths on both sides.
//
//   node --max-old-space-size=8000 tools/versions/changes.mjs --old-tree artifacts/versions/2.1.316-original \
//     --new-tree original --pairs artifacts/versions/carry-316-318-pairs.jsonl \
//     --old-names artifacts/versions/2.1.316-naming/final/top.json --new-names naming/final/top.json \
//     --old-paths artifacts/versions/2.1.316-analysis/segments/decl-path.jsonl --new-paths analysis/segments/decl-path.jsonl \
//     --old-scan artifacts/versions/2.1.316-analysis/scan/decls.jsonl --new-scan analysis/scan/decls.jsonl \
//     --out artifacts/versions/changes-316-318.jsonl
//
// Inputs : both restored trees; the pairing of tools/versions/carry-names.mjs ({old, new, how, status});
//          each version's naming/final/top.json, analysis/segments/decl-path.jsonl, analysis/scan/decls.jsonl.
// Output : JSONL, one row per unit that is changed, removed (old, unpaired) or added (new, unpaired):
//          {kind: changed|removed|added, old, new, oldName, newName, oldPath, newPath, size,
//           plus: [content tokens only in the new side], minus: [only in the old side]}  (multiset difference;
//          for removed/added units the side's own tokens), sorted by path.
//          Token prefixes: s: string or template text, p: property name, g: global name.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const espree = require('espree'), escope = require('eslint-scope');
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;

function namesOf(topPath) {
  const m = new Map();
  for (const [f, recs] of Object.entries(JSON.parse(fs.readFileSync(topPath, 'utf8')))) for (const r of Object.values(recs)) if (r.kind === 'decl') m.set(f + ':' + r.min, r.name);
  return m;
}
function pathsOf(scanPath, declPath) {
  const p = new Map(readJsonl(declPath).map((x) => [x.id, x.path]));
  const m = new Map();
  for (const d of readJsonl(scanPath)) for (const n of d.names) m.set(d.file + ':' + n, p.get(idOf(d)));
  return m;
}
// content tokens of every module-scope binding of a file
function contentOf(root, file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  let ast;
  try { ast = espree.parse(text, { ecmaVersion: 'latest', sourceType: 'module', range: true }); } catch { return new Map(); }
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const ms = sm.scopes.find((s) => s.type === 'module');
  const globals = new Set();
  for (const s of sm.scopes) for (const r of s.references) if (!r.resolved) globals.add(r.identifier);
  const out = new Map();
  const walk = (n, acc) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) walk(x, acc); return; }
    if (n.type === 'Literal' && typeof n.value === 'string' && n.value.length > 1) acc.push('s:' + n.value.slice(0, 160));
    else if (n.type === 'TemplateElement' && n.value.cooked?.trim()) acc.push('s:' + n.value.cooked.slice(0, 160));
    else if (n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier') acc.push('p:' + n.property.name);
    else if ((n.type === 'Property' || n.type === 'MethodDefinition' || n.type === 'PropertyDefinition') && !n.computed && n.key?.type === 'Identifier') acc.push('p:' + n.key.name);
    else if (n.type === 'Identifier' && globals.has(n)) acc.push('g:' + n.name);
    for (const k of Object.keys(n)) if (k !== 'parent' && k !== 'range' && k !== 'loc') walk(n[k], acc);
  };
  for (const v of ms.variables) {
    const acc = [];
    for (const d of v.defs) if (d.type !== 'ImportBinding') walk(d.type === 'Variable' ? d.node.init : d.node, acc);
    for (const r of v.references) if (r.isWrite() && r.writeExpr) walk(r.writeExpr, acc);
    out.set(file + ':' + v.name, acc);
  }
  return out;
}
const fileOf = (k) => k.slice(0, k.lastIndexOf(':'));
const minus = (a, b) => { const c = new Map(); for (const x of b) c.set(x, (c.get(x) ?? 0) + 1); const r = []; for (const x of a) { const n = c.get(x); if (n) c.set(x, n - 1); else r.push(x); } return [...new Set(r)]; };

const pairs = readJsonl(args.pairs).filter((p) => !p.old.includes(':#'));
const oldNames = namesOf(args['old-names']), newNames = namesOf(args['new-names']);
const oldPaths = pathsOf(args['old-scan'], args['old-paths']), newPaths = pathsOf(args['new-scan'], args['new-paths']);
const pairedOld = new Set(pairs.map((p) => p.old)), pairedNew = new Set(pairs.map((p) => p.new));
const want = { old: new Map(), new: new Map() }; // file -> Set(keys)
const need = (side, k) => (want[side].get(fileOf(k)) ?? want[side].set(fileOf(k), new Set()).get(fileOf(k))).add(k);
const changed = pairs.filter((p) => p.status === 'changed');
for (const p of changed) { need('old', p.old); need('new', p.new); }
for (const k of oldPaths.keys()) if (!pairedOld.has(k)) need('old', k);
for (const k of newPaths.keys()) if (!pairedNew.has(k)) need('new', k);
const tokens = { old: new Map(), new: new Map() };
for (const side of ['old', 'new']) {
  const root = side === 'old' ? args['old-tree'] : args['new-tree'];
  for (const [file, keys] of want[side]) { const c = contentOf(root, file); for (const k of keys) tokens[side].set(k, c.get(k) ?? []); }
}
const rows = [];
for (const p of changed) {
  const a = tokens.old.get(p.old) ?? [], b = tokens.new.get(p.new) ?? [];
  rows.push({ kind: 'changed', old: p.old, new: p.new, how: p.how, oldName: oldNames.get(p.old) ?? null, newName: newNames.get(p.new) ?? null, oldPath: oldPaths.get(p.old) ?? null, newPath: newPaths.get(p.new) ?? null, size: b.length, plus: minus(b, a), minus: minus(a, b) });
}
for (const [k, t] of tokens.old) if (!pairedOld.has(k)) rows.push({ kind: 'removed', old: k, oldName: oldNames.get(k) ?? null, oldPath: oldPaths.get(k) ?? null, size: t.length, minus: [...new Set(t)] });
for (const [k, t] of tokens.new) if (!pairedNew.has(k)) rows.push({ kind: 'added', new: k, newName: newNames.get(k) ?? null, newPath: newPaths.get(k) ?? null, size: t.length, plus: [...new Set(t)] });
rows.sort((x, y) => (x.newPath ?? x.oldPath ?? '').localeCompare(y.newPath ?? y.oldPath ?? '') || x.kind.localeCompare(y.kind));
fs.writeFileSync(args.out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const c = {};
for (const r of rows) c[r.kind] = (c[r.kind] ?? 0) + 1;
console.log(JSON.stringify(c));

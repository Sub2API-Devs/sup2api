// Scans every JS module of the restored 2.1.316 tree with Babel and records,
// per module and per top-level declaration, the facts later stages need:
// imports/exports, declared names, byte ranges, string literals and the
// property names they touch (both survive minification, so they are the
// fingerprints used to match code against the reference source).
//   node tools/ast/scan.mjs [original] [analysis/scan]
// Output: <out>/modules.json (one record per module) and <out>/decls.jsonl
// (one record per top-level declaration).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { features, walk } from './lib/features.mjs';

const [root = 'original', out = 'analysis/scan'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(root).filter((f) => /\.(js|mjs)$/.test(f)).sort();
const modules = [];
const declsOut = fs.createWriteStream(path.join(out, 'decls.jsonl'));

for (const file of files) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', errorRecovery: false });
  } catch (e) {
    modules.push({ file, bytes: src.length, parseError: String(e.message) });
    continue;
  }
  const imports = [];
  const exports = {}; // exported name -> local name
  const decls = [];
  const resources = [];
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      const from = node.source.value;
      if (node.attributes?.length || /__cc_resource_/.test(node.specifiers[0]?.local?.name ?? '')) {
        resources.push(from);
      }
      imports.push({
        from,
        names: node.specifiers.map((s) => ({
          imported: s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*',
          local: s.local.name,
        })),
      });
      continue;
    }
    if (node.type === 'ExportNamedDeclaration' && !node.declaration) {
      for (const s of node.specifiers) exports[s.exported.name ?? s.exported.value] = s.local.name;
      if (node.source) imports.push({ from: node.source.value, reexport: true, names: node.specifiers.map((s) => ({ imported: s.local.name, local: s.exported.name })) });
      continue;
    }
    if (node.type === 'ExportAllDeclaration') {
      imports.push({ from: node.source.value, reexportAll: true, names: [] });
      continue;
    }
    if (node.type === 'ExportDefaultDeclaration') {
      exports.default = node.declaration.id?.name ?? '(expression)';
    }
    const target = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration : node;
    const names = declaredNames(target);
    const f = features(target);
    decls.push({
      file,
      names,
      kind: target.type === 'VariableDeclaration' ? target.kind : target.type,
      start: node.start,
      end: node.end,
      bytes: node.end - node.start,
      params: target.params?.length ?? target.declarations?.[0]?.init?.params?.length ?? null,
      jsx: f.jsx,
      strings: f.strings,
      props: f.props,
      refSet: f.refs,
    });
  }
  // Resolve each declaration's identifier reads to module-level bindings:
  // "=local" for this module's own declarations, "chunk.js|exportName" for imports.
  const importLocal = new Map();
  for (const im of imports) if (!im.reexport && !im.reexportAll) for (const n of im.names) importLocal.set(n.local, im.from.replace(/^[.][/]/, '') + '|' + n.imported);
  const topNames = new Set(decls.flatMap((d) => d.names));
  for (const d of decls) {
    const own = new Set(d.names);
    d.refs = [...d.refSet].filter((n) => !own.has(n) && (topNames.has(n) || importLocal.has(n))).map((n) => (topNames.has(n) ? '=' + n : importLocal.get(n)));
    delete d.refSet;
  }
  const localToExport = Object.fromEntries(Object.entries(exports).map(([e, l]) => [l, e]));
  for (const d of decls) {
    d.exported = d.names.filter((n) => localToExport[n]).map((n) => localToExport[n]);
    declsOut.write(JSON.stringify(d) + '\n');
  }
  const header = src.slice(0, 400).match(/^\/\/ @bun[^\n]*\n(?:\/\/[^\n]*\n|\n)*/)?.[0] ?? '';
  modules.push({
    file,
    bytes: src.length,
    bunBytecode: header.includes('@bytecode'),
    anthropicHeader: header.includes('Anthropic PBC'),
    imports,
    exports,
    resources,
    declCount: decls.length,
    licenseComments: (ast.comments ?? []).filter((c) => /licen[cs]e|copyright|@preserve|\(c\)/i.test(c.value)).map((c) => c.value.trim().slice(0, 300)),
  });
}
declsOut.end();
fs.writeFileSync(path.join(out, 'modules.json'), JSON.stringify(modules, null, 1));
console.log(JSON.stringify({ modules: modules.length, parseErrors: modules.filter((m) => m.parseError).length }));

function declaredNames(n) {
  if (!n) return [];
  if (n.type === 'VariableDeclaration') return n.declarations.flatMap((d) => patternNames(d.id));
  if (n.id?.name) return [n.id.name];
  return [];
}
function patternNames(p) {
  if (!p) return [];
  if (p.type === 'Identifier') return [p.name];
  if (p.type === 'ObjectPattern') return p.properties.flatMap((x) => patternNames(x.value ?? x.argument));
  if (p.type === 'ArrayPattern') return p.elements.flatMap(patternNames);
  if (p.type === 'AssignmentPattern') return patternNames(p.left);
  if (p.type === 'RestElement') return patternNames(p.argument);
  return [];
}
void walk;

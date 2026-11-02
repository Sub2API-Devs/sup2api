// Scans the reference TypeScript source (references/claude-code-analysis/src,
// an older Claude Code release) into the same per-declaration feature records
// the 2.1.316 scan produces, so the two can be matched.
//   node tools/ast/scan-reference.mjs [references/claude-code-analysis/src] [analysis/reference]
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { features } from './lib/features.mjs';

const [root = 'references/claude-code-analysis/src', out = 'analysis/reference'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const files = [];
(function list(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) list(p);
    else if (/\.(tsx?|jsx?|mjs)$/.test(e.name) && !e.name.endsWith('.d.ts')) files.push(p);
  }
})(root);

const ws = fs.createWriteStream(path.join(out, 'decls.jsonl'));
const fileRecords = [];
let errors = 0;
for (const abs of files.sort()) {
  const file = path.relative(root, abs).split(path.sep).join('/');
  const src = fs.readFileSync(abs, 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx', 'decorators-legacy', 'importAttributes'], errorRecovery: true });
  } catch (e) {
    errors++;
    fileRecords.push({ file, parseError: e.message });
    continue;
  }
  const imports = [];
  const exported = [];
  const pending = [];
  let count = 0;
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      imports.push({ from: node.source.value, names: node.specifiers.map((s) => s.local.name), typeOnly: node.importKind === 'type' });
      continue;
    }
    const isExport = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration';
    const target = isExport ? node.declaration : node;
    if (!target) continue;
    if (/^TS(Interface|TypeAlias|ModuleDeclaration|DeclareFunction)/.test(target.type)) continue;
    const names = target.type === 'VariableDeclaration' ? target.declarations.map((d) => d.id.name).filter(Boolean) : target.id?.name ? [target.id.name] : node.type === 'ExportDefaultDeclaration' ? ['default'] : [];
    const f = features(target);
    if (isExport) exported.push(...names);
    count++;
    pending.push({
      file,
      names,
      exported: isExport,
      kind: target.type === 'VariableDeclaration' ? target.kind : target.type,
      line: node.loc.start.line,
      lines: node.loc.end.line - node.loc.start.line + 1,
      params: target.params?.length ?? target.declarations?.[0]?.init?.params?.length ?? null,
      jsx: f.jsx,
      strings: f.strings,
      props: f.props,
      refSet: f.refs,
    });
  }
  // Same edge model as scan.mjs: "=local" or "<import source>|<imported name>".
  const importLocal = new Map();
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration' || node.importKind === 'type') continue;
    for (const s of node.specifiers) {
      if (s.importKind === 'type') continue;
      const imported = s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*';
      importLocal.set(s.local.name, node.source.value + '|' + imported);
    }
  }
  const topNames = new Set(pending.flatMap((d) => d.names));
  for (const d of pending) {
    const own = new Set(d.names);
    d.refs = [...d.refSet].filter((n) => !own.has(n) && (topNames.has(n) || importLocal.has(n))).map((n) => (topNames.has(n) ? '=' + n : importLocal.get(n)));
    delete d.refSet;
    ws.write(JSON.stringify(d) + '\n');
  }
  fileRecords.push({ file, lines: src.split('\n').length, imports, exported, declCount: count });
}
ws.end();
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(fileRecords, null, 1));
console.log(JSON.stringify({ files: files.length, errors }));

// Static inventory of the verified 2.1.302 renderer; never executes CLI code.
// Run from any cwd: node inspect-attachments.cjs [restored-source-directory]
// stdout is generated evidence JSON, suitable for redirecting to a file.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '../../../../../..');
const parse = createRequire(path.join(repo, 'next/web/package.json'))('@babel/parser').parse;
const root = path.resolve(process.argv[2] || path.join(repo, 'artifacts/claude-2.1.302/linux-restored'));
const file = 'chunk-8242685m.js';
const source = fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = crypto.createHash('sha256').update(source).digest('hex');
const profile = require('../../../companions/cli-mods/profiles/linux-x64-2.1.302.json');
assert.equal(sha256, profile.modules[file], 'source must match the pinned official baseline');
const ast = parse(source, { sourceType: 'module' });
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'extra', 'comments', 'tokens'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
const text = node => source.slice(node.start, node.end);
const location = node => ({ file, line: node.loc.start.line, startCharacter: node.start, endCharacter: node.end });
let registry, renderer;
const symbols = {};
const selected = new Set(['$Fe', 'Vte', 'xct', 'Ryt', 'xyt', 'pZn', 'Oyt', 'Zyt', 'o_t', 'aNe', 'lNe', 'n6', 'QMn', 'n6n', '_A', 'gRn', 'TYr']);
walk(ast, node => {
  const name = node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator' ? node.id?.name : undefined;
  if (name === 'awr' && node.init) registry = node.init;
  if (name === 'xct') renderer = node;
  if (selected.has(name)) symbols[name] = location(node);
});
assert.equal(registry?.type, 'ObjectExpression');
assert.ok(renderer);
const entries = registry.properties.map(property => ({
  type: property.key.name ?? property.key.value,
  kind: 'registry',
  unconditionalEmpty: property.value.body.type === 'ArrayExpression' && property.value.body.elements.length === 0,
  ...location(property),
}));
const special = new Map();
walk(renderer, node => {
  if (node.type === 'SwitchStatement' && text(node.discriminant) === 'e.type') {
    for (const branch of node.cases) if (typeof branch.test?.value === 'string') {
      entries.push({ type: branch.test.value, kind: 'switch', ...location(branch) });
    }
  }
  if (node.type === 'CallExpression' && node.callee?.property?.name === 'includes' &&
      node.callee.object.type === 'ArrayExpression' && node.arguments.length === 1 && text(node.arguments[0]) === 'e.type') {
    for (const value of node.callee.object.elements) entries.push({ type: value.value, kind: 'compatibility-ignore', ...location(value) });
  }
  if (node.type === 'BinaryExpression' && node.operator === '===' && text(node.left) === 'e.type' &&
      ['teammate_mailbox', 'team_context', 'proactivity'].includes(node.right?.value) && !special.has(node.right.value)) {
    special.set(node.right.value, { type: node.right.value, kind: 'special', ...location(node) });
  }
});
entries.push(...special.values());
assert.equal(new Set(entries.map(entry => entry.type)).size, entries.length, 'each type must be counted once');
const counts = Object.fromEntries(['registry', 'switch', 'special', 'compatibility-ignore'].map(kind =>
  [kind, entries.filter(entry => entry.kind === kind).length]));
assert.deepEqual(counts, { registry: 89, switch: 22, special: 3, 'compatibility-ignore': 17 });
const old = require('../2.1.296/attachment-renderers.json');
const previous = new Set(old.entries.map(entry => entry.type));
const current = new Set(entries.map(entry => entry.type));
console.log(JSON.stringify({
  version: '2.1.302',
  platform: 'linux-x64-glibc',
  scope: 'Explicitly recognized types at xct, not every producer, not 131 transmitted attachments.',
  method: 'AST inventory of the hash-verified restored official module; no target code execution.',
  offsetUnit: 'UTF-16 JavaScript string offsets, not binary offsets',
  source: { file, sha256 },
  counts,
  totalTypes: entries.length,
  unconditionalEmptyRegistryEntries: entries.filter(entry => entry.unconditionalEmpty).length,
  addedSince296: [...current].filter(type => !previous.has(type)),
  removedSince296: [...previous].filter(type => !current.has(type)),
  symbols,
  entries,
}, null, 2));

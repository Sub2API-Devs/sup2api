#!/usr/bin/env node
// Enumerates syntax obligations; deliberately does NOT claim execution coverage.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../../../..');
const parser = createRequire(path.join(root, 'next/web/package.json'))('@babel/parser');
const native = 'artifacts/claude-2.1.304/linux-restored/';
const mods = 'next/plugins/ccgateway/companions/cli-mods/';
const scope = [
  [native + 'chunk-rncrmfyt.js', ['jOt', 'qmn', 'uXn', 'Gmn', 'jA', 'Xfr', 'FH', '_oo', 'zkt', 'Kkt']],
  [native + 'chunk-t61vswm2.js', ['PAs', 'Fbo']],
  [native + 'chunk-6qx5mjec.js', ['kLo']],
  [native + 'chunk-2gh4h0fv.js', ['RIs']],
  [native + 'chunk-38xgev2z.js', ['sF']],
  [native + 'chunk-5vqpbzgd.js', ['B1e']],
  [mods + 'request-build.js', ['buildRequest']],
  [mods + 'request-input.js', ['prepareBuildInput', 'systemRecord']],
  [mods + 'content-policy.js', ['applyContentPolicy', 'mergeBillingAttribution', 'environmentRegions', 'identify', 'recognizedUser', 'fenceAfter']],
  [mods + 'request-command.js', ['runRequestCommand']],
  [mods + 'model-request.js', ['openModelRequest']],
  [mods + 'request-options.js', ['parseRequestOptions', 'parseRequestJSON']],
  [mods + 'request-policy.js', ['validateRequestPolicy', 'runtimeContext', 'contentDiagnostic']],
  [mods + 'native-environment-2.1.304.inc.js', ['ccgatewayEnvironment']],
];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const ignored = new Set(['loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens']);
function walk(node, visitor) {
  if (!node || typeof node.type !== 'string') return;
  visitor(node);
  for (const [key, value] of Object.entries(node)) {
    if (ignored.has(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visitor));
    else if (value && typeof value === 'object') walk(value, visitor);
  }
}
const decisions = {
  IfStatement: ['true', 'false'],
  ConditionalExpression: ['true', 'false'],
  LogicalExpression: ['evaluate-right', 'short-circuit'],
  AssignmentPattern: ['default', 'provided'],
  SwitchCase: ['selected', 'not-selected'],
  CatchClause: ['exception', 'no-exception'],
  ForStatement: ['zero-iterations', 'iterations'],
  ForInStatement: ['zero-iterations', 'iterations'],
  ForOfStatement: ['zero-iterations', 'iterations'],
  WhileStatement: ['zero-iterations', 'iterations'],
  DoWhileStatement: ['repeat', 'exit'],
};
const files = [];
const errors = [];
const profile = JSON.parse(fs.readFileSync(path.join(root, mods, 'profiles/linux-x64-2.1.304.json'), 'utf8'));
for (const [file, names] of scope) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const sourceHash = hash(text);
  if (file.startsWith(native) && profile.modules[path.basename(file)] && profile.modules[path.basename(file)] !== sourceHash)
    throw Error('Baseline SHA mismatch: ' + file);
  const ast = parser.parse(text, { sourceType: 'module', allowReturnOutsideFunction: true });
  const nodes = [];
  walk(ast, node => nodes.push(node));
  const ranges = [];
  for (const name of names) {
    const matches = nodes.filter(n => (n.type === 'FunctionDeclaration' || n.type === 'VariableDeclarator') && n.id?.name === name);
    if (matches.length !== 1) { errors.push({ file, name, matches: matches.length }); continue; }
    const n = matches[0];
    ranges.push({ name, start: n.start, end: n.end, line: n.loc.start.line, sha256: hash(text.slice(n.start, n.end)) });
  }
  const obligations = [];
  for (const node of nodes) {
    if (!decisions[node.type]) continue;
    const owner = ranges.filter(r => r.start <= node.start && r.end >= node.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    if (!owner) continue;
    const predicate = node.test || node.left || node.param;
    obligations.push({
      id: `${file}:${owner.name}:${node.start}:${node.type}`,
      symbol: owner.name, kind: node.type, operator: node.operator,
      range: [node.start, node.end], line: node.loc.start.line,
      predicate: predicate ? text.slice(predicate.start, predicate.end).slice(0, 400) : null,
      predicate_truncated: predicate ? predicate.end - predicate.start > 400 : false,
      outcomes: decisions[node.type],
      execution_status: 'unmeasured',
    });
  }
  files.push({ file, sha256: sourceHash, symbols: ranges, syntax_obligations: obligations });
}
const result = {
  schema_version: 1, cli_version: '2.1.304',
  scope: 'Selected native request builders and ccgateway adapters; not whole-CLI branch coverage',
  semantics: 'A syntax obligation is a candidate to exercise, not proof of reachability, behavior, or execution. Nested selected symbols own their branches once. Nested unselected callbacks belong to the selected enclosing range.',
  limitations: [
    'Native qmn also contains transport retry/stream branches after the build-only return; enumeration alone cannot mark them reachable in ccgateway.',
    'The inventory is intentionally unmeasured: fixture success does not instrument or prove every native branch outcome.',
    'Dynamic imports, runtime flags, provider branches and callees outside these ranges are not closed over.',
    'Baseline hashes are checked when present in the version profile; every other module still records its exact SHA.',
  ],
  summary: {
    files: files.length, symbols: files.reduce((n, f) => n + f.symbols.length, 0),
    syntax_obligations: files.reduce((n, f) => n + f.syntax_obligations.length, 0),
    executed_branch_outcomes: null, errors: errors.length,
  }, errors, files,
};
const destination = path.resolve(process.argv[2] || path.join(root, 'artifacts/claude-2.1.304/assembly-audit/inventory.json'));
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: destination, ...result.summary, errors }));
if (errors.length) process.exitCode = 1;

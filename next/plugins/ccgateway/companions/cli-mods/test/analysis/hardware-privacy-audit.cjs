#!/usr/bin/env node
// Inert AST inventory for the recovered 2.1.304 application. No target execution.
// Inventory hits and lexical references are candidates, not proof of transmission.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../../../..');
const parser = createRequire(path.join(root, 'next/web/package.json'))('@babel/parser');
const sourceRoot = path.join(root, 'artifacts/claude-2.1.304/linux-restored');
const reconstruction = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'reconstruction.json'), 'utf8'));
const profile = require('../../profiles/linux-x64-2.1.304.json');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
if (reconstruction.binarySha256 !== profile.binarySHA256) throw Error('Wrong binary baseline');
const ignored = new Set(['loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens']);
function walk(node, visit, ancestors = []) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, ancestors);
  ancestors.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (ignored.has(key)) continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit, ancestors);
    else walk(value, visit, ancestors);
  }
  ancestors.pop();
}
function key(n) { return n?.type === 'Identifier' ? n.name : n?.type === 'StringLiteral' ? n.value : undefined; }
function member(n) {
  if (n?.type === 'Identifier') return n.name;
  if (n?.type === 'MemberExpression' || n?.type === 'OptionalMemberExpression') {
    const base = member(n.object), leaf = !n.computed || n.property.type === 'StringLiteral' ? key(n.property) : undefined;
    if (base && leaf) return base + '.' + leaf;
  }
}
function owner(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const n = ancestors[i], parent = ancestors[i - 1];
    if (/Function/.test(n.type) || n.type === 'ObjectMethod' || n.type === 'ClassMethod') {
      return { name: n.id?.name ?? (parent?.type === 'VariableDeclarator' ? key(parent.id) : key(n.key)) ?? '<callback>', start: n.start, end: n.end, line: n.loc.start.line };
    }
  }
  return { name: '<module>' };
}
function load(file) {
  const text = fs.readFileSync(path.join(sourceRoot, file), 'utf8'), sha256 = hash(text);
  if (profile.modules[file] && profile.modules[file] !== sha256) throw Error('Baseline changed: ' + file);
  return { text, sha256, ast: parser.parse(text, { sourceType: 'module' }) };
}
function evidence(doc, node, ancestors) {
  return { start: node.start, end: node.end, line: node.loc.start.line, column: node.loc.start.column,
    owner: owner(ancestors), source: doc.text.slice(node.start, node.end) };
}
function bindingName(node) {
  if (['FunctionDeclaration', 'VariableDeclarator', 'ClassDeclaration'].includes(node.type)) return node.id?.name;
  if (['ObjectMethod', 'ClassMethod', 'ClassProperty'].includes(node.type)) return key(node.key);
}
const [mode = 'inventory', selectedFile, selectedName] = process.argv.slice(2);
if (mode === 'report') {
  const selection = {
    'chunk-7p6jp6kj.js': ['ZM', 'I_t', 'i1', 'd1', 'GUr', 'RT', 'I1', 'ZBt', 'OW', 'oze', 'transformLogsToEvents', 'sendBatchWithRetry'],
    'chunk-t61vswm2.js': ['yBe'],
    'chunk-jkcb7qdd.js': ['IGt', 'VF', 'Tt'],
    'chunk-wyzdzgh4.js': ['Oy'],
    'chunk-sx3g9k86.js': ['V', 'K'],
    'chunk-e7mgxhn6.js': ['Ve', 'Dt', 'it', 'Bn', 'transformMetricsForInternal', 'postOnce'],
    'chunk-5720eenm.js': ['initializeDatadog', 'LFt'],
    'chunk-gvtgs37t.js': ['n2s'],
    'chunk-rp4e5650.js': ['K', 'OBe'],
    'chunk-yqea5hk4.js': ['Ali', 'qir'],
    'chunk-r3pgc3n3.js': ['pot'],
    'chunk-9befx4h0.js': ['fTn'],
    'chunk-x14q1sjn.js': ['pRt', 'Jbe'],
    'chunk-dykwp5mc.js': ['r2t', 'Je', 'Ke', 'en'],
    'chunk-hcgkwy7m.js': ['hn', 'Tli', 'Jr', 'Kir'],
    'chunk-qm6t5b60.js': ['ne', 'S5n'],
    'chunk-38xgev2z.js': ['buildHeaders'],
    'chunk-4qs43hr1.js': ['bA'],
    'chunk-7dttn3gk.js': ['s'],
    'chunk-w1pck5fs.js': ['P5s'],
    'chunk-d0te4b5s.js': ['Ir'],
    'chunk-j8jwkrgq.js': ['z5', 'wce', 'vce'],
    'chunk-38vgtxey.js': ['TC', 'mhe'],
    'chunk-whn549sj.js': ['nn'],
    'chunk-024r210v.js': ['qb'],
    'chunk-yrdh91k8.js': ['un'],
    'chunk-rncrmfyt.js': ['poo', 'rOr', 'Jwn', 'Xnt'],
    'chunk-tbekftmt.js': ['readLinuxDistroInfo'],
    'chunk-m98set7z.js': ['F', 'Qe', 'W'],
  };
  const inventory = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/claude-2.1.304/hardware-privacy-inventory.json'), 'utf8'));
  if (inventory.parse_failures.length || inventory.modules_parsed !== reconstruction.jsCount) throw Error('Incomplete inventory');
  const patched = path.join(root, 'artifacts/claude-2.1.304/linux-patched-v12-assembly-fix');
  const manifest = JSON.parse(fs.readFileSync(path.join(patched, 'ccgateway-patch.json'), 'utf8'));
  for (const [file, identity] of Object.entries(manifest.files)) {
    if (hash(fs.readFileSync(path.join(patched, file))) !== identity.after) throw Error('Patched source mismatch: ' + file);
  }
  for (const [file, identity] of Object.entries(manifest.supportFiles)) {
    if (hash(fs.readFileSync(path.join(patched, file))) !== identity.sha256) throw Error('Support source mismatch: ' + file);
  }
  const baseline = hash(fs.readFileSync(path.join(root, 'artifacts/claude-2.1.304/claude-linux-x64')));
  const deployedCandidate = hash(fs.readFileSync(path.join(root, 'artifacts/claude-2.1.304/claude-linux-assembly-fix')));
  if (baseline !== profile.binarySHA256 || deployedCandidate !== '138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd') throw Error('Binary identity mismatch');
  const report = { schema: 1, version: '2.1.304', baseline_binary_sha256: baseline, deployed_candidate_sha256: deployedCandidate,
    modules_parsed: inventory.modules_parsed, parse_failures: inventory.parse_failures,
    interpretation: 'Reviewed source/sink/guard evidence. The inventory is not an exhaustive interprocedural proof or network capture.',
    evidence: [], errors: [] };
  for (const [file, names] of Object.entries(selection)) {
    const doc = load(file), selected = new Set(names), found = [];
    walk(doc.ast, (node, ancestors) => {
      const name = bindingName(node);
      if (selected.has(name)) found.push({ name, ...evidence(doc, node, ancestors) });
    });
    for (const name of names) if (found.filter(n => n.name === name).length !== 1) report.errors.push({ file, name, reason: 'Not a unique AST binding' });
    const patchedText = fs.readFileSync(path.join(patched, file), 'utf8');
    report.evidence.push({ file, sha256: doc.sha256, identical_patched_module: patchedText === doc.text, nodes: found });
  }
  const cliText = fs.readFileSync(path.join(patched, 'cli.js'), 'utf8');
  const cli = { text: cliText, sha256: hash(cliText), ast: parser.parse(cliText, { sourceType: 'module' }) };
  const requestBranches = [];
  walk(cli.ast, (node, ancestors) => {
    if (node.type === 'IfStatement' && node.test.type === 'BinaryExpression' &&
      node.test.operator === '===' && node.test.right.type === 'StringLiteral' && node.test.right.value === 'request' &&
      node.test.left.type === 'MemberExpression' && node.test.left.object.name === 'e' && node.test.left.property.value === 0) {
      requestBranches.push(evidence(cli, node, ancestors));
    }
  });
  if (requestBranches.length !== 1) report.errors.push({ reason: 'Request branch is not unique' });
  report.request_entry = { file: 'linux-patched-v12-assembly-fix/cli.js', sha256: cli.sha256, nodes: requestBranches };
  report.support_sources = {};
  for (const file of ['ccgateway-request-command.js', 'ccgateway-request-build.js', 'ccgateway-request-options.js', 'ccgateway-model-request.js']) {
    const text = fs.readFileSync(path.join(patched, file), 'utf8');
    report.support_sources[file] = { sha256: hash(text), source: text };
  }
  const destination = path.join(root, 'artifacts/claude-2.1.304/hardware-privacy-evidence.json');
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: destination, modules_parsed: report.modules_parsed,
    evidence_files: report.evidence.length, nodes: report.evidence.reduce((n, f) => n + f.nodes.length, 0), errors: report.errors }));
  if (report.errors.length) process.exitCode = 1;
} else if (mode === 'links') {
  const report = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/claude-2.1.304/hardware-privacy-inventory.json'), 'utf8'));
  const doc = report.modules.find(m => m.file === selectedFile), selected = new Set(selectedName.split(','));
  const exports = doc.exports.filter(e => selected.has(e.local) || selected.has(e.exported));
  console.log(JSON.stringify({ file: selectedFile, imports: doc.imports.filter(i => selected.has(i.local)), exports,
    importers: report.modules.flatMap(m => m.imports.filter(i => i.module === './' + selectedFile && exports.some(e => e.exported === i.imported)).map(i => ({ file: m.file, ...i }))) }, null, 2));
} else if (mode === 'at') {
  const doc = load(selectedFile), offset = Number(selectedName), matches = [];
  walk(doc.ast, node => {
    if (node.start <= offset && node.end >= offset &&
      (/Function/.test(node.type) || ['VariableDeclarator', 'ClassDeclaration', 'ClassExpression', 'ObjectMethod', 'ClassMethod'].includes(node.type))) {
      matches.push({ type: node.type, name: node.id?.name ?? key(node.key), start: node.start, end: node.end,
        source: node.end - node.start <= 12000 ? doc.text.slice(node.start, node.end) : '<use narrower AST range>' });
    }
  });
  console.log(JSON.stringify({ file: selectedFile, sha256: doc.sha256, matches }, null, 2));
} else if (mode === 'symbol' || mode === 'refs') {
  const doc = load(selectedFile), matches = [];
  const selected = new Set(selectedName.split(','));
  walk(doc.ast, (node, ancestors) => {
    if (mode === 'symbol' && selected.has(bindingName(node))) matches.push({ name: bindingName(node), ...evidence(doc, node, ancestors) });
    if (mode === 'refs' && node.type === 'Identifier' && selected.has(node.name)) {
      const enclosing = ancestors.at(-1);
      matches.push({ ...evidence(doc, node, ancestors), context: enclosing && doc.text.slice(enclosing.start, Math.min(enclosing.end, enclosing.start + 2400)) });
    }
  });
  console.log(JSON.stringify({ file: selectedFile, sha256: doc.sha256, matches }, null, 2));
} else if (mode === 'inventory') {
  const osNames = new Set(['arch', 'platform', 'type', 'release', 'version', 'cpus', 'availableParallelism', 'totalmem', 'freemem', 'networkInterfaces', 'hostname', 'uptime', 'userInfo', 'loadavg']);
  const pathPattern = /^\/(?:proc\/(?:cpuinfo|meminfo|stat|vmstat|uptime|self\/(?:cgroup|mountinfo|ns)|sys\/kernel)|sys\/(?:class\/dmi|devices\/system\/cpu|fs\/cgroup)|etc\/(?:machine-id|os-release)|var\/lib\/dbus\/machine-id)/;
  const fieldPattern = /^(?:device_id|machine_id|host\.id|host\.name|host\.arch|os\.(?:type|version|description)|cpu_count|cpu_model|cpuCount|cpuModel|machineId|machineID|userID|deviceId|total_memory|totalMemory|num_cpus|mac_address|hardware_id|cpus|memory_gb|disk_free_gb|free_mem_mb|load_avg_1m)$/;
  const gatePattern = /^(?:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC|DISABLE_TELEMETRY|DO_NOT_TRACK|DISABLE_ERROR_REPORTING|CLAUDE_CODE_ENABLE_TELEMETRY|OTEL_[A-Z_]+)$/;
  const report = { version: '2.1.304', binary_sha256: profile.binarySHA256, modules_expected: reconstruction.jsCount,
    limitations: ['AST import/call candidates are not runtime execution or complete data-flow proof.',
      'References mode includes declarations and property keys; it does not claim lexical binding resolution.',
      'Unresolved aliases, native Bun/ELF internals, dynamic code and tool-command outputs need separate analysis.'],
    modules: [], hits: [], parse_failures: [] };
  for (const { file } of reconstruction.modules) {
    let doc;
    try { doc = load(file); } catch (error) { report.parse_failures.push({ file, error: error.message }); continue; }
    const imports = [], exports = [], osBindings = new Map(), hits = [];
    walk(doc.ast, (node, ancestors) => {
      if (node.type === 'ImportDeclaration') {
        for (const spec of node.specifiers) {
          imports.push({ module: node.source.value, imported: key(spec.imported) ?? (spec.type === 'ImportDefaultSpecifier' ? 'default' : '*'), local: spec.local.name });
          if (['os', 'node:os'].includes(node.source.value)) osBindings.set(spec.local.name, key(spec.imported) ?? '*');
        }
      }
      if (node.type === 'ExportNamedDeclaration') for (const spec of node.specifiers) exports.push({ local: key(spec.local), exported: key(spec.exported), module: node.source?.value });
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'CallExpression' &&
        ['os', 'node:os'].includes(node.init.arguments[0]?.value)) osBindings.set(node.id.name, '*');
      if (node.type === 'StringLiteral' && (pathPattern.test(node.value) || fieldPattern.test(node.value))) hits.push({ kind: 'literal', value: node.value, ...evidence(doc, node, ancestors) });
      if (node.type === 'StringLiteral' && /event_logging|intake.*datadog|api\/.*(?:metrics|telemetry)|sentry\.io|opentelemetry|tengu_startup_perf/.test(node.value)) hits.push({ kind: 'telemetry-literal', value: node.value, ...evidence(doc, node, ancestors) });
      if ((node.type === 'ObjectProperty' || node.type === 'ObjectMethod') && fieldPattern.test(key(node.key) ?? '')) hits.push({ kind: 'identity-field', field: key(node.key), ...evidence(doc, node, ancestors) });
      if (node.type === 'MemberExpression' && gatePattern.test(key(node.property) ?? '')) hits.push({ kind: 'gate', ...evidence(doc, node, ancestors) });
      if (node.type === 'MemberExpression' && /^(process\.env\.(?:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC|DISABLE_TELEMETRY|DO_NOT_TRACK|DISABLE_ERROR_REPORTING|CLAUDE_CODE_ENABLE_TELEMETRY)|process\.(?:arch|platform|versions))$/.test(member(node) ?? '')) hits.push({ kind: 'runtime', ...evidence(doc, node, ancestors) });
    });
    walk(doc.ast, (node, ancestors) => {
      if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return;
      const callee = member(node.callee);
      if (!callee) return;
      const parts = callee.split('.'), imported = osBindings.get(parts[0]);
      const operation = imported === '*' ? parts[1] : imported;
      if (operation && osNames.has(operation)) hits.push({ kind: 'os-call-candidate', operation, ...evidence(doc, node, ancestors) });
    });
    report.modules.push({ file, sha256: doc.sha256, imports, exports, os_bindings: Object.fromEntries(osBindings) });
    report.hits.push(...hits.map(hit => ({ file, ...hit })));
  }
  report.modules_parsed = report.modules.length;
  const destination = path.join(root, 'artifacts/claude-2.1.304/hardware-privacy-inventory.json');
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: destination, modules: report.modules_parsed, failures: report.parse_failures, hits: report.hits.length }));
  if (report.parse_failures.length || report.modules_parsed !== report.modules_expected) process.exitCode = 1;
} else {
  throw Error('Use inventory, report, symbol/refs/links <file> <names>, or at <file> <offset>');
}

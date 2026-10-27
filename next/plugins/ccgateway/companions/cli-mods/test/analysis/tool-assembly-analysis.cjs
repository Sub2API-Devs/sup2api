/* Historical, hash-bound AST audit of the pre-fix tool assembly path.
 * This reproduces the config-audit snapshot's defects, not current behavior.
 * Current native final-wire behavior is tested by
 * test/native/<version>/patch-wire-preservation.test.mjs.
 *
 * [CC_VERSION=<version>] node test/analysis/tool-assembly-analysis.cjs [--repo ROOT] [--out FILE]
 * Add --assert-contract to exit nonzero when a preservation contract fails.
 * Only versions with a recorded pre-fix snapshot (historicalSnapshots) run;
 * any other version is refused, not approximated.
 *
 * VM cases execute extracted native functions/expressions with the explicitly
 * reported collaborators stubbed. They are NOT whole-CLI or network tests.
 * A reproduced known defect remains a failed contract, never an expected pass.
 *
 * 2026-10-27 cleanup: the 2.1.304 pre-fix snapshot
 * artifacts/claude-2.1.304/linux-patched-v12-config-audit/ was deleted; without
 * --patched-root the run stops with an explicit error. The original evidence
 * artifacts/claude-2.1.304/assembly-audit/tools.json is kept.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');

const ignored = new Set(['loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens']);
const functionTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod']);
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const property = node => node?.computed ? node.property?.value : node?.property?.name;

function walk(node, visitor, parent = null) {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (ignored.has(key)) continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visitor, node);
    else if (value && typeof value === 'object') walk(value, visitor, node);
  }
}
function descendants(node, predicate) {
  const result = [];
  walk(node, (child, parent) => { if (predicate(child, parent)) result.push(child); });
  return result;
}
function one(values, label) {
  assert.equal(values.length, 1, `Expected exactly one AST node: ${label}; found ${values.length}`);
  return values[0];
}
function readsProperty(node, name) {
  return descendants(node, child => ['MemberExpression', 'OptionalMemberExpression'].includes(child.type) && property(child) === name).length > 0;
}
function patternNames(node) {
  if (!node) return [];
  if (node.type === 'Identifier') return [node.name];
  if (node.type === 'RestElement') return patternNames(node.argument);
  if (node.type === 'AssignmentPattern') return patternNames(node.left);
  if (node.type === 'ArrayPattern') return node.elements.flatMap(patternNames);
  if (node.type === 'ObjectPattern') return node.properties.flatMap(p => patternNames(p.type === 'RestElement' ? p.argument : p.value));
  return [];
}

function repoFrom(start) {
  let current = path.resolve(start);
  while (!fs.existsSync(path.join(current, 'next/server/go.mod'))) {
    const parent = path.dirname(current);
    if (parent === current) throw Error('Cannot locate repository root; pass --repo');
    current = parent;
  }
  return current;
}

class SourceModule {
  constructor(file, parser, repo) {
    this.file = file; this.repo = repo; this.text = fs.readFileSync(file, 'utf8');
    this.hash = sha256(this.text); this.ast = parser.parse(this.text, { sourceType: 'module' });
    this.scopes = new WeakMap(); this.parents = new WeakMap(); this.top = null;
    this.index(this.ast.program, null, null);
  }
  index(node, parentScope, parent) {
    if (!node || typeof node !== 'object') return;
    this.parents.set(node, parent);
    let scope = parentScope;
    if (node.type === 'FunctionDeclaration' && node.id && parentScope) {
      parentScope.bindings.set(node.id.name, { node, kind: 'function', scope: parentScope });
    }
    if (node.type === 'Program' || node.type === 'BlockStatement' || functionTypes.has(node.type)) {
      scope = { parent: parentScope, node, bindings: new Map(), function: functionTypes.has(node.type) };
      if (!this.top) this.top = scope;
    }
    this.scopes.set(node, scope);
    if (functionTypes.has(node.type)) {
      node.params.forEach((p, index) => patternNames(p).forEach(name => scope.bindings.set(name, { node: p, kind: 'parameter', parameterIndex: index, scope })));
      if (node.id) scope.bindings.set(node.id.name, { node, kind: 'function-self', scope });
    }
    if (node.type === 'VariableDeclarator') {
      let bindingScope = scope;
      if (parent?.kind === 'var') while (bindingScope.parent && !bindingScope.function) bindingScope = bindingScope.parent;
      patternNames(node.id).forEach(name => bindingScope.bindings.set(name, { node, kind: parent?.kind ?? 'variable', scope: bindingScope }));
    }
    if (node.type === 'ImportDeclaration') {
      node.specifiers.forEach(spec => scope.bindings.set(spec.local.name, {
        node: spec, kind: 'import', imported: spec.imported?.name ?? spec.imported?.value ?? 'default',
        module: node.source.value, scope,
      }));
    }
    for (const [key, value] of Object.entries(node)) {
      if (ignored.has(key)) continue;
      if (Array.isArray(value)) for (const child of value) this.index(child, scope, node);
      else if (value && typeof value === 'object') this.index(value, scope, node);
    }
  }
  raw(node) { return this.text.slice(node.start, node.end); }
  location(node, includeSource = true) {
    return {
      file: path.relative(this.repo, this.file).replaceAll('\\', '/'),
      module_sha256: this.hash, node_sha256: sha256(this.raw(node)),
      start: { line: node.loc.start.line, column_zero_based: node.loc.start.column, offset: node.start },
      end: { line: node.loc.end.line, column_zero_based: node.loc.end.column, offset: node.end },
      ...(includeSource ? { source: this.raw(node) } : {}),
    };
  }
  declaration(name) {
    const binding = this.top.bindings.get(name);
    assert.ok(binding, `Missing module binding ${path.basename(this.file)}:${name}`);
    return binding.node;
  }
  variable(root, name) {
    return one(descendants(root, n => n.type === 'VariableDeclarator' && n.id?.name === name), `${name} in ${path.basename(this.file)}`);
  }
  resolve(from, name) {
    for (let scope = this.scopes.get(from); scope; scope = scope.parent) {
      if (scope.bindings.has(name)) {
        const binding = scope.bindings.get(name);
        return { name, kind: binding.kind, parameter_index: binding.parameterIndex, imported: binding.imported,
          module: binding.module, owner: scope.node.id?.name ?? scope.node.type, definition: this.location(binding.node, false) };
      }
    }
    return { name, kind: 'unresolved-global' };
  }
}

function evaluateFunction(source, name, globals = {}) {
  return vm.runInNewContext(`${source}\n;${name}`, { structuredClone, Map, Set, console, ...globals }, { timeout: 2000 });
}
function evaluateExpression(source, globals = {}) {
  return vm.runInNewContext(`(${source})`, { structuredClone, Map, Set, ...globals }, { timeout: 2000 });
}
function evaluateSupport(module, names) {
  const declarations = module.ast.program.body.map(n => module.raw(n.type === 'ExportNamedDeclaration' ? n.declaration : n)).join('\n');
  return vm.runInNewContext(`${declarations}\n;({${names.join(',')}})`, {
    structuredClone, Map, Set, Symbol, crypto: { randomUUID: () => 'audit-fixed-id' },
  }, { timeout: 2000 });
}

// The pre-fix snapshots this audit is bound to, by Claude Code version: the
// recovered core chunk, the patched config-audit tree and its manifest SHA,
// and the name of qmn's ToolSearch-refusal retry option. 2.1.310 renamed that
// option withoutToolSearch -> toolSearchRefusal (artifacts/claude-2.1.310/
// linux-restored chunk-j0tbz6ra.js) and has no pre-fix config-audit snapshot,
// so there is nothing for this audit to reproduce there.
const historicalSnapshots = {
  '2.1.304': {
    core: 'chunk-rncrmfyt.js', patched: 'linux-patched-v12-config-audit',
    manifestSHA: '86f15b6dbd20c9eee867c3e19546685f6dfb2eb40a2fb8f61be410622af05a81',
    searchRefusalOption: 'withoutToolSearch',
  },
};
const searchRefusalOptions = { '2.1.304': 'withoutToolSearch', '2.1.310': 'toolSearchRefusal' };

async function runToolAssemblyAnalysis(options = {}) {
  const version = options.version ?? process.env.CC_VERSION ?? '2.1.304';
  const snapshot = historicalSnapshots[version];
  if (!snapshot) throw Error(`No pre-fix tool-assembly snapshot for Claude Code ${version}` +
    (searchRefusalOptions[version] ? ` (its qmn retry option is ${searchRefusalOptions[version]})` : '') +
    `; current behavior: test/native/${version}/patch-wire-preservation.test.mjs`);
  const repo = repoFrom(options.repo ?? __dirname);
  const parser = createRequire(path.resolve(options.babelPackage ?? process.env.CCG_BABEL_PACKAGE ?? path.join(repo, 'next/web/package.json')))('@babel/parser');
  const sourceRoot = path.resolve(options.sourceRoot ?? path.join(repo, `artifacts/claude-${version}/linux-restored`));
  const patchedRoot = path.resolve(options.patchedRoot ?? path.join(repo, `artifacts/claude-${version}/${snapshot.patched}`));
  const output = path.resolve(options.output ?? path.join(repo, `artifacts/claude-${version}/assembly-audit/tools-pre-fix-replay.json`));
  const originalEvidence = path.resolve(repo, `artifacts/claude-${version}/assembly-audit/tools.json`);
  if (!options.patchedRoot && !fs.existsSync(patchedRoot)) throw Error(`${path.relative(repo, patchedRoot)} is missing: the pre-fix ${snapshot.patched} snapshot was deleted in the 2026-10-27 artifacts cleanup; pass --patched-root <dir> with the same manifest SHA (${snapshot.manifestSHA}) to rerun`);
  assert.ok(output !== originalEvidence || !fs.existsSync(originalEvidence), 'Preserve the original pre-fix tools.json evidence; choose a different --out path');
  const cache = new Map();
  const load = (root, file) => {
    const key = path.join(root, file);
    if (!cache.has(key)) cache.set(key, new SourceModule(key, parser, repo));
    return cache.get(key);
  };
  const core = load(sourceRoot, snapshot.core);
  const patchedCore = load(patchedRoot, snapshot.core);
  const placement = load(sourceRoot, 'chunk-5vqpbzgd.js');
  const modes = load(sourceRoot, 'chunk-gtqjkgba.js');
  const identity = load(sourceRoot, 'chunk-h3dn4j2q.js');
  const constants = load(sourceRoot, 'chunk-yc4d941t.js');
  const order = load(sourceRoot, 'chunk-d6g6rfje.js');
  const dedup = load(sourceRoot, 'chunk-qygf2xvn.js');
  const provider = load(sourceRoot, 'chunk-38xgev2z.js');
  const adapter = load(patchedRoot, 'ccgateway-request-build.js');
  const input = load(patchedRoot, 'ccgateway-request-input.js');
  const registry = load(patchedRoot, 'ccgateway-native-tools.js');
  const profile = JSON.parse(fs.readFileSync(path.join(repo, `next/plugins/ccgateway/companions/cli-mods/profiles/linux-x64-${version}.json`), 'utf8'));
  const manifestBytes = fs.readFileSync(path.join(patchedRoot, 'ccgateway-patch.json'));
  const historicalManifestSHA = snapshot.manifestSHA;
  assert.equal(sha256(manifestBytes), historicalManifestSHA,
    'This historical audit only supports the exact pre-fix config-audit snapshot. Use the current wire-preservation tests for a repaired patch.');
  const patchManifest = JSON.parse(manifestBytes);
  const helperHashes = {
    'chunk-5vqpbzgd.js': '8746ece798f86943e538f419a00868297fb57b5daf6f59ebc83bfe5fcbf851e5',
    'chunk-gtqjkgba.js': '1f1a50a8dcf1cbec4e57a5d230c28b64298bdc946ea4e3250c76a39f9770a3af',
    'chunk-h3dn4j2q.js': 'ed38b60da76aa8e7ec40f278debcc2e526cf0b321c4ff832262b0fcab71d0fbe',
    'chunk-yc4d941t.js': '3f21b2c66493eca67d75b1b65c6d94316598cfb23c35512e0340937080be510b',
    'chunk-d6g6rfje.js': '9b13c83b8347405dc2a4756d9a62a55459cdf2ea8a7ab105f8a657c51e9dbddf',
  };
  for (const module of cache.values()) {
    const file = path.basename(module.file);
    const expected = path.dirname(module.file) === sourceRoot ? profile.modules[file] ?? helperHashes[file]
      : patchManifest.files[file]?.after ?? patchManifest.supportFiles[file]?.sha256;
    assert.ok(expected, `No hash anchor for ${module.file}`);
    assert.equal(module.hash, expected, `Modified or unsupported audit baseline: ${module.file}`);
  }
  const qmn = core.declaration('qmn'), patchedQmn = patchedCore.declaration('qmn');
  const nativeFH = core.declaration('FH'), patchedFH = patchedCore.declaration('FH');
  const build = adapter.declaration('buildRequest');
  const adapterOptions = adapter.variable(build, 'options').init;
  const optionNames = adapterOptions.properties.filter(p => p.type === 'ObjectProperty').map(p => p.key.name ?? p.key.value);
  const guard = one(descendants(qmn, n => n.type === 'IfStatement' && readsProperty(n.test, 'hasPendingMcpServers')), 'no-deferred ToolSearch guard');
  const patchedGuard = one(descendants(patchedQmn, n => n.type === 'IfStatement' && readsProperty(n.test, 'hasPendingMcpServers')), 'patched no-deferred guard');
  const filters = descendants(qmn, n => n.type === 'AssignmentExpression' && n.left?.name === 'xr' &&
    n.right?.type === 'CallExpression' && n.right.callee?.object?.name === 's' && property(n.right.callee) === 'filter');
  assert.equal(filters.length, 2, 'Expected active and inactive ToolSearch pool filters');
  const searchOff = one(filters.filter(n => descendants(n.right.arguments[0], x => x.type === 'ReturnStatement' &&
    x.argument?.type === 'UnaryExpression' && x.argument.operator === '!' && x.argument.argument?.value === 1).length > 0), 'ToolSearch off filter');
  const searchOn = one(filters.filter(n => n !== searchOff), 'ToolSearch on filter');
  const sr = core.variable(qmn, 'sr'), br = core.variable(qmn, 'Br');
  const requestParamsBuilder = core.variable(qmn, 'uXn').init;
  const toolChoice = core.variable(requestParamsBuilder, 'CT');
  const choiceGuard = one(descendants(requestParamsBuilder, n => n.type === 'IfStatement' && readsProperty(n.test, 'type') &&
    descendants(n.test, x => x.type === 'Identifier' && x.name === 'CT').length &&
    descendants(n.test, x => x.type === 'Identifier' && x.name === 'EF').length), 'tool_choice thinking demotion');
  const wg = core.variable(qmn, 'wg'), io = core.variable(qmn, 'Io');
  const registerCall = one(descendants(build, n => n.type === 'CallExpression' && n.callee?.name === 'registerNative'), 'adapter registerNative call');
  const registryTool = registry.variable(registry.declaration('registerNative'), 'tool').init;
  const moduleFiles = [...cache.values()].map(m => ({ file: path.relative(repo, m.file).replaceAll('\\', '/'), sha256: m.hash }));

  const branches = [];
  const branch = (id, module, node, meaning, cases, extra = {}) => {
    branches.push({ id, evidence: module.location(node), meaning, suggested_cases: cases, ...extra });
  };
  branch('tools.native_mode', modes, modes.declaration('XEe'),
    'ENABLE_TOOL_SEARCH/default/auto thresholds choose standard, tst, or tst-auto; force override precedes the environment switch.',
    ['default', 'true', 'false', 'auto:0', 'auto:100', 'auto:50', 'force_override', 'provider_disabled']);
  branch('tools.entry_tool_pool', core, core.declaration('jOt'),
    'jOt destructures tools:s and passes it through sGe to ugn then qmn. sGe uses the unmodified pool on the first attempt.',
    ['initial_tools_forwarded', 'native_org_policy_refusal_retry']);
  branch('tools.search_recovery_retry', core, core.declaration('ugn'),
    `Native mZ recovery retries qmn with ${snapshot.searchRefusalOption}=true and a new reminder. External build exits at its request event before native network/recovery.`,
    ['native_search_refusal_retry', 'external_build_no_native_retry']);
  branch('tools.native_availability', core, core.declaration('H8e'),
    'Model/provider support and a ToolSearch name/alias in the native tool pool gate ToolSearch.',
    ['unsupported_model', 'unsupported_vertex', 'unsupported_foundry', 'empty_pool', 'not_registered', 'search_absent', 'search_present']);
  branch('tools.native_search_decision', core, core.declaration('avr'),
    'Mode plus conversation-held state and deferred token/character threshold determine the initial search decision.',
    ['held_off', 'held_on', 'auto_above', 'auto_below', 'token_count_unavailable_char_fallback']);
  branch('tools.deferable_native_fields', placement, placement.declaration('T'),
    'Native candidate classification uses isMcp or shouldDefer, not isDeferred.',
    ['isMcp_true', 'shouldDefer_true', 'isDeferred_only', 'ordinary_custom']);
  branch('tools.deferable_exclusions', placement, placement.declaration('B1e'),
    'alwaysLoad, native always-loaded families/names and a provider compatibility gate override deferral.',
    ['always_load', 'non_deferrable_name', 'provider_compat', 'normal_deferred']);
  branch('tools.adapter_deferral_mapping', adapter, registerCall,
    'Adapter maps input defer_loading to isDeferred and constructs all custom tools with isMcp:false; it does not set native shouldDefer.',
    ['tools.search_with_deferred_custom', 'tools.search_with_deferred_placeholder']);
  branch('tools.registry_deferral_fields', registry, registryTool,
    'Registry descriptor retains isDeferred; native engine placement reads a different field.',
    ['descriptor_has_isDeferred', 'descriptor_lacks_shouldDefer'], { binding: registry.resolve(registryTool, 'spec') });
  branch('tools.placement_source', core, core.variable(qmn, 'yn'),
    'withoutToolDescribeHooks=true selects engine B1e rather than hook-adjusted IX.', ['engine', 'hooks'],
    { bindings: ['J', 'Un', 'B1e', 'IX'].map(name => core.resolve(core.variable(qmn, 'yn'), name)) });
  branch('tools.search_disabled_empty_candidates', core, guard,
    'Even an initially enabled search is switched off when Ao is empty, there are no pending MCP servers (or C5), no kept references and no declared ToolSearch.',
    ['empty_candidates', 'candidate_present', 'pending_mcp', 'kept_reference', 'declared_search', 'tool_addition_fallback'],
    { unchanged_in_patch: core.raw(guard) === patchedCore.raw(patchedGuard), bindings: ['J', 'Ao', 's', 'Qo', 'on', 'Ai'].map(n => core.resolve(guard, n)) });
  branch('tools.search_on_filter', core, searchOn,
    'Search-enabled candidates not surfaced in history are withheld; ToolSearch itself is kept.', ['ordinary', 'unloaded_deferred', 'surfaced_deferred', 'by_value_hidden']);
  branch('tools.search_off_filter', core, searchOff,
    'No tool_search/tool_addition mode: remove name/alias ToolSearch and by-value-only names.', ['tools.search_without_deferred', 'name_alias_search', 'by_value']);
  branch('tools.deferral_emission', core, br,
    'FH deferLoading is derived from native selected candidates/referenced kept schemas, not the client wire flag.', ['selected_deferred', 'kept_with_primary', 'no_search_mode']);
  branch('tools.pool_order', core, io,
    'Io=A5(szn(xr)); A5 is identity, szn removes underlying V1 duplicates. There is no alphabetical sort here.', ['custom_order', 'underlying_v1_duplicate']);
  branch('tools.current_C5_constant', order, order.declaration('C5'),
    'This exact native 304 build compiles C5 to constant false; a pending-MCP override is not blocked by this helper.',
    ['compiled_false']);
  branch('tools.extra_server_append', core, wg,
    'Native server schemas append after the converted custom-tool schemas; an interleaved external input is regrouped by the adapter.',
    ['tools.server_tools_append_order', 'server_only', 'custom_only', 'mixed_server_custom']);
  branch('tools.FH_native', core, nativeFH,
    'Native schema generation uses recorded entries/descriptions, strict/eager fields, defer/cache options, provider stripping and description hooks.',
    ['recorded_entry', 'strict_model', 'cache_control', 'eager_input_streaming', 'provider_strip'], { evidence: core.location(nativeFH, false) });
  branch('tools.FH_patched_custom', patchedCore, patchedFH.body.body[0],
    'Patched registered-custom branch returns the client\'s own definition verbatim early, bypassing native FH provider/cache/record logic.',
    ['custom_attributes_preserved', 'raw_deferred_flag_survives_false_native_deferLoading']);
  branch('tools.provider_schema_filter', provider, provider.declaration('tzs'),
    'Foundry feature refusals can remove the deferred placeholder and strip defer_loading/strict. This VM coverage is not proof that the current request entry supports Foundry.',
    ['first_party', 'foundry_no_refusals', 'foundry_tool_search_refused', 'foundry_structured_outputs_refused']);
  branch('tools.refused_schema_filter', core, core.declaration('YYt'),
    'Native per-conversation refused schema state can replace matching schemas and remove eager streaming.', ['no_refusal', 'matching_refusal', 'different_schema']);
  branch('tools.tool_choice', core, choiceGuard,
    'Forced named tool_choice becomes auto under effective thinking. With thinking disabled, a removed ToolSearch can remain the forced name.',
    ['forced_disabled_thinking', 'forced_enabled_thinking', 'auto', 'any', 'removed_search_forced'], { binding: core.resolve(toolChoice, 'J') });
  branch('tools.history_reference_normalization', core, core.declaration('Gmn'),
    'Native Gmn uses useToolSearch to strip/normalize history references; the patched external-input fast path returns original messages before this branch.',
    ['history_tool_reference_search_on', 'history_tool_reference_search_off', 'external_preserved_reference_search_missing'],
    { evidence: core.location(core.declaration('Gmn'), false), patched_early_return: patchedCore.location(patchedCore.declaration('Gmn').body.body[0]) });

  const helperTests = [], contracts = [];
  const test = async (id, expected, execute, stubs) => {
    const observed = plain(await execute());
    let passed = true, error;
    try { assert.deepEqual(observed, expected); } catch (e) { passed = false; error = e.message; }
    helperTests.push({ id, passed, expected, observed, stubs, ...(error ? { error } : {}) });
    return observed;
  };
  const contract = (id, expected, observed, evidenceIds, reproduction) => {
    let status = 'pass';
    try { assert.deepEqual(plain(observed), plain(expected)); } catch { status = 'fail'; }
    contracts.push({ id, status, expected, observed, evidence_ids: evidenceIds, reproduction });
  };
  const classify = evaluateFunction(placement.raw(placement.declaration('T')), 'T', {
    LUs: () => false, Yv: () => false, d: 'stub-special-family',
  });
  for (const [id, tool, expected] of [
    ['isDeferred_only', { name: 'Deferred', isDeferred: true, isMcp: false }, false],
    ['shouldDefer_true', { name: 'Deferred', shouldDefer: true, isMcp: false }, true],
    ['isMcp_true', { name: 'mcp__x__y', isMcp: true }, true],
    ['ordinary_custom', { name: 'Regular', isMcp: false }, false],
  ]) await test(`native.classifier.${id}`, expected, () => classify(tool), ['LUs=false; special tool-family branch disabled', 'Yv=false']);
  for (const [id, flags, tool, expected] of [
    ['regular_deferred', {}, { shouldDefer: true }, true],
    ['always_load', {}, { shouldDefer: true, alwaysLoad: true }, false],
    ['excluded_name', { excluded: true }, { shouldDefer: true }, false],
    ['provider_compat', { compat: true }, { shouldDefer: true }, false],
  ]) {
    const f = evaluateFunction(placement.raw(placement.declaration('B1e')), 'B1e', { T: classify, O: () => !!flags.excluded, n2n: () => !!flags.compat });
    await test(`native.placement.${id}`, expected, () => f(tool, new Set()), ['O: controlled native-family exclusion result', 'n2n: controlled provider compatibility result', 'T: actual extracted native classifier']);
  }
  const modeFunction = flags => evaluateFunction(modes.raw(modes.declaration('XEe')), 'XEe', {
    process: { env: { ENABLE_TOOL_SEARCH: flags.value } }, jan: () => !!flags.disabled, l: () => !!flags.force,
    xOo: value => value.startsWith('auto:') ? Math.max(0, Math.min(100, Number(value.slice(5)))) : null,
    E: value => value === 'auto' || value?.startsWith('auto:'), Fe: value => value === 'true', Rs: value => value === 'false',
  });
  for (const [value, expected] of [[undefined, 'tst'], ['true', 'tst'], ['false', 'standard'], ['auto:0', 'tst'], ['auto:100', 'standard'], ['auto:50', 'tst-auto']]) {
    await test(`native.mode.${value ?? 'unset'}`, expected, () => modeFunction({ value })(), ['jan=false', 'force override l=false', 'scalar environment helpers stubbed for exact fixture values']);
  }
  await test('native.mode.force_override_precedes_false', 'tst', () => modeFunction({ value: 'false', force: true })(), ['l=true; native force-override branch']);
  const ct = evaluateFunction(identity.raw(identity.declaration('Ct')), 'Ct');
  const searchName = evaluateExpression(constants.raw(constants.declaration('Ai').init));
  assert.equal(searchName, 'ToolSearch');
  const registryAPI = evaluateSupport(registry, ['requestTool', 'isNative']);
  const inputAPI = evaluateSupport(input, ['prepareBuildInput']);
  const fh = evaluateFunction(patchedCore.raw(patchedFH), 'FH', {
    ccgIsNative: registryAPI.isNative,
    dsi: async (_tool, description) => ({ description }),
  });
  const customInputs = [{ name: 'ToolSearch', description: 'search', inputSchema: { type: 'object' } },
    { name: 'DeferredFixture', description: 'deferred', inputSchema: { type: 'object' }, defer_loading: true }];
  const prepared = inputAPI.prepareBuildInput({ model: 'claude-sonnet-4-5', messages: [{ role: 'user', content: 'hello' }], tools: customInputs }, null, { preserveContent: true });
  const registered = prepared.customTools.map(tool => ({
    ...registryAPI.requestTool({ name: tool.name, description: tool.description ?? '', inputSchema: tool.input_schema, isDeferred: tool.defer_loading }),
    ccgatewayRequestDefinition: tool,
  }));
  const candidateNames = registered.filter(classify).map(tool => tool.name);
  const guardSource = core.raw(guard), srSource = core.raw(sr.init);
  const filterOff = core.raw(searchOff.right), filterOn = core.raw(searchOn.right);
  const selection = flags => {
    const context = {
      s: flags.tools ?? registered, Ao: new Set(flags.candidates ?? []), J: { hasPendingMcpServers: !!flags.pending },
      C5: evaluateFunction(order.raw(order.declaration('C5')), 'C5'), Qo: { kept: new Set(flags.kept ?? []) },
      on: { has: name => (flags.declared ?? []).includes(name) }, Ai: searchName, Ct: ct,
      eo: new Set(flags.surfaced ?? []), Er: new Set(), oo: new Set(flags.byValue ?? []),
      uo: false, t: () => {},
    };
    return vm.runInNewContext(`let po=${flags.initial ?? true},io=${flags.addition ?? false};${guardSource};let sr=${srSource};let xr=sr!==void 0?${filterOn}:${filterOff};({po,mode:sr??null,names:xr.map(t=>t.name)})`,
      context, { timeout: 2000 });
  };
  for (const [id, flags, expected] of [
    ['empty', {}, { po: false, mode: null, names: ['DeferredFixture'] }],
    ['candidate', { candidates: ['DeferredFixture'] }, { po: true, mode: 'tool_search', names: ['ToolSearch'] }],
    ['surfaced_candidate', { candidates: ['DeferredFixture'], surfaced: ['DeferredFixture'] }, { po: true, mode: 'tool_search', names: ['ToolSearch', 'DeferredFixture'] }],
    ['pending', { pending: true }, { po: true, mode: 'tool_search', names: ['ToolSearch', 'DeferredFixture'] }],
    ['kept', { kept: ['DeferredFixture'] }, { po: true, mode: 'tool_search', names: ['ToolSearch', 'DeferredFixture'] }],
    ['declared', { declared: ['ToolSearch'] }, { po: true, mode: 'tool_search', names: ['ToolSearch', 'DeferredFixture'] }],
    ['already_off', { initial: false }, { po: false, mode: null, names: ['DeferredFixture'] }],
    ['tool_addition_fallback', { addition: true }, { po: false, mode: 'tool_addition', names: ['ToolSearch', 'DeferredFixture'] }],
  ]) await test(`native.search_guard.${id}`, expected, () => selection(flags), [
    'initial avr result controlled', 'Ao native candidate set controlled', 'pending MCP/reference/declared state and tool_addition fallback controlled',
    'actual qmn guard, mode expression and both s.filter callbacks', 'actual Ct name/alias identity and C5 constant',
  ]);
  const missingSearch = plain(selection({ candidates: candidateNames }));
  contract('tools.search_with_deferred_custom', ['ToolSearch', 'DeferredFixture'], missingSearch.names,
    ['tools.adapter_deferral_mapping', 'tools.registry_deferral_fields', 'tools.deferable_native_fields', 'tools.search_disabled_empty_candidates', 'tools.search_off_filter'],
    'Actual support-module descriptor + native extracted classifier/guard/filter; model support and initial search decision forced enabled, all conversation state absent like the adapter.');
  const emittedDeferred = await fh(registered[1], { withoutToolDescribeHooks: true, deferLoading: false });
  await test('patched.FH.original_defer_loading_survives_false_native_flag', true, () => emittedDeferred.defer_loading,
    ['actual patched FH client-definition branch', 'hooks disabled as in adapter']);
  contract('tools.deferred_catalog_has_search', true, missingSearch.names.includes('ToolSearch') || emittedDeferred.defer_loading !== true,
    ['tools.FH_patched_custom', 'tools.search_off_filter'], 'defer_loading=true remains on a tool while ToolSearch is absent.');

  const mixed = inputAPI.prepareBuildInput({ model: 'claude-sonnet-4-5', messages: [{ role: 'user', content: 'hello' }], tools: [
    { type: 'web_search_20250305', name: 'web_search', max_uses: 2, cache_control: { type: 'ephemeral' } },
    { name: 'Zebra', inputSchema: { type: 'object' }, cache_control: { type: 'ephemeral', ttl: '5m' }, strict: true },
    { name: 'Alpha', inputSchema: { type: 'object' } },
  ] }, null, { preserveContent: true });
  const merged = evaluateExpression(core.raw(wg.init), { vr: mixed.customTools, NO: mixed.extraToolSchemas });
  await test('native.server_schema_append_order', ['Zebra', 'Alpha', 'web_search'], () => merged.map(t => t.name),
    ['actual prepareBuildInput split', 'actual qmn wg concat expression; FH output substituted by same-name schemas']);
  contract('tools.order_preserved_interleaved_server', ['web_search', 'Zebra', 'Alpha'], merged.map(t => t.name),
    ['tools.extra_server_append', 'tools.pool_order'], 'Adapter partitions custom/server definitions; native wg appends server schemas after custom schemas.');
  const identityOrder = evaluateFunction(order.raw(order.declaration('A5')), 'A5');
  await test('native.A5_does_not_sort', ['Zebra', 'Alpha'], () => identityOrder(mixed.customTools).map(t => t.name), []);
  const dedupFunction = evaluateFunction(dedup.raw(dedup.declaration('szn')), 'szn', { LM: tool => tool.fixtureWrapper === true });
  await test('native.underlying_v1_dedup', ['new', 'untouched'], () => dedupFunction([
    { name: 'old' }, { name: 'new', fixtureWrapper: true, underlyingV1ToolName: 'old' }, { name: 'untouched' },
  ]).map(t => t.name), ['LM stub marks only the fixture wrapper; actual szn removal executed']);
  const cached = { ...registryAPI.requestTool({ name: 'Zebra', description: 'cache', inputSchema: { type: 'object' } }), ccgatewayRequestDefinition: mixed.customTools[0] };
  const cachedOutput = await fh(cached, { withoutToolDescribeHooks: true, deferLoading: false });
  contract('tools.custom_cache_control_preserved', { type: 'ephemeral', ttl: '5m' }, cachedOutput.cache_control,
    ['tools.FH_patched_custom'], 'Actual patched FH early return; no native cache options supplied.');
  contract('tools.server_cache_control_preserved', { type: 'ephemeral' }, merged[2].cache_control,
    ['tools.extra_server_append'], 'Actual input split + native append; first-party provider path does not filter.');

  const nativeQN = core.variable(nativeFH, 'qn');
  const qnStatement = core.parents.get(nativeQN);
  const qnIndex = nativeFH.body.body.indexOf(qnStatement);
  assert.ok(qnIndex >= 0);
  const fhTail = nativeFH.body.body.slice(qnIndex + 1).map(n => core.raw(n)).join('\n');
  const schemaTail = evaluateFunction(`function emit(ln,n,Vn,Zn,on,e){let qn=${core.raw(nativeQN.init)};${fhTail}}`, 'emit', {
    VB: () => false, Wxr: () => false, ip: 'disabled-citations-name',
  });
  await test('native.FH_tail_cache_and_defer', { name: 'n', description: 'recorded', input_schema: { type: 'object' }, strict: true,
    eager_input_streaming: true, defer_loading: true, cache_control: { type: 'ephemeral', ttl: '1h' } },
    () => schemaTail({ name: 'n', description: 'fresh', input_schema: { type: 'object' }, strict: true, eager_input_streaming: true },
      { deferLoading: true, cacheControl: { type: 'ephemeral', ttl: '1h' }, recordedDescription: 'recorded' }, undefined, false, false, { name: 'n' }),
    ['native FH qn construction and subsequent statements only', 'VB=false; no provider stripping', 'schema/cache upstream generation represented by ln fixture']);
  for (const [id, thinking, choice, expected] of [
    ['disabled_thinking', false, { type: 'tool', name: 'ToolSearch' }, { type: 'tool', name: 'ToolSearch' }],
    ['enabled_thinking', true, { type: 'tool', name: 'ToolSearch' }, { type: 'auto' }],
    ['auto', true, { type: 'auto' }, { type: 'auto' }],
    ['any', true, { type: 'any' }, { type: 'any' }],
  ]) {
    const observed = vm.runInNewContext(`let CT=J.toolChoice;${core.raw(choiceGuard)};CT`, { J: { toolChoice: choice }, EF: thinking, t: () => {} }, { timeout: 2000 });
    await test(`native.tool_choice.${id}`, expected, () => observed, ['effective thinking EF controlled; real qmn thinking model computation not executed']);
  }
  contract('tools.forced_choice_names_existing_tool', true, missingSearch.names.includes('ToolSearch'),
    ['tools.tool_choice', 'tools.search_off_filter'], 'Forced ToolSearch remains unchanged with thinking disabled, but the same pool filtering removed its definition.');

  for (const [id, providerName, refusals, expected] of [
    ['first_party', 'firstParty', ['tool_search', 'structured_outputs'], ['DeferredToolPlaceholder:true:false', 'custom:true:true']],
    ['foundry_no_refusal', 'foundry', [], ['DeferredToolPlaceholder:true:false', 'custom:true:true']],
    ['foundry_search_refused', 'foundry', ['tool_search'], ['custom:false:true']],
    ['foundry_strict_refused', 'foundry', ['structured_outputs'], ['DeferredToolPlaceholder:true:false', 'custom:true:false']],
  ]) {
    const tf = evaluateFunction(provider.raw(provider.declaration('tzs')), 'tzs', {
      Pe: () => providerName, Eer: () => new Map([['model', new Set(refusals)]]), Va: model => model,
      SWe: 'DeferredToolPlaceholder', bYn: 'placeholder fixture',
    });
    const schemas = [{ name: 'DeferredToolPlaceholder', description: 'placeholder fixture', defer_loading: true },
      { name: 'custom', defer_loading: true, strict: true }];
    await test(`native.provider.${id}`, expected, () => tf(schemas, 'model').map(t => `${t.name}:${t.defer_loading === true}:${t.strict === true}`),
      ['provider, refusal registry and placeholder constants supplied by fixtures; exact tzs executed']);
  }

  const optionsOfInterest = [snapshot.searchRefusalOption, 'hasPendingMcpServers', 'recordedToolDescriptions', 'recordedToolEntries',
    'recordedToolServers', 'recordedDeferredTools', 'toolPoolRefreshes', 'redescribedTools', 'mcpClients', 'withoutToolDescribeHooks',
    'toolChoice', 'extraToolSchemas', 'enablePromptCaching', 'advisorModel', 'advisorDeferred'];
  const nativeOptionReads = [...new Set(descendants(qmn, n => ['MemberExpression', 'OptionalMemberExpression'].includes(n.type) &&
    n.object?.name === 'J').map(property))];
  const report = {
    schema_version: 1, category: 'tools', cli_version: version, analysis: 'Babel AST with lexical binding resolution; selected native helper VM execution',
    historical_scope: { snapshot: 'pre-fix linux-patched-v12-config-audit', manifest_sha256: historicalManifestSHA,
      current_behavior_claimed: false, current_regression: `test/native/${version}/patch-wire-preservation.test.mjs` },
    source_positions: 'Babel positions: 1-based lines, 0-based columns, UTF-16 offsets; node hashes use UTF-8 source text.',
    source_root: sourceRoot, patched_root: patchedRoot, files: moduleFiles,
    hash_verification: { source_profile_binary_sha256: profile.binarySHA256, source_helpers: helperHashes,
      patched_manifest: path.relative(repo, path.join(patchedRoot, 'ccgateway-patch.json')).replaceAll('\\', '/'), verified: true },
    scope_trace: [
      { use: 'qmn.s is the native tool pool', binding: core.resolve(searchOff, 's') },
      { use: 'qmn.J is derived from sixth-parameter options S, not a global policy object', binding: core.resolve(guard, 'J') },
      { use: 'Ai is imported ToolSearch name constant', binding: core.resolve(searchOff, 'Ai'), value: searchName, definition: constants.location(constants.declaration('Ai')) },
      { use: 'buildRequest tools -> native builder fourth payload field', binding: adapter.resolve(registerCall, 'input') },
    ],
    branches,
    adapter_options: { supplied: optionNames, native_reads: optionsOfInterest.filter(n => nativeOptionReads.includes(n)),
      missing: optionsOfInterest.filter(n => nativeOptionReads.includes(n) && !optionNames.includes(n)),
      fixed: { withoutToolDescribeHooks: true, mcpClients: [], isMcp: false, enablePromptCaching: false },
      limits: 'Absent recorded/deferred/MCP session state cannot in general be recovered from a plain HTTP tools array. This audit does not propose inventing that state.' },
    toolsearch_loss: {
      status: 'confirmed', exact_trigger: [
        'A custom ToolSearch name or alias is present in the input.',
        'External deferred tools become registered descriptors with isDeferred=true, isMcp=false, and no shouldDefer.',
        'Engine placement is used because withoutToolDescribeHooks=true; B1e/T classify these descriptors as non-deferred unless the optional native family rule independently qualifies them (disabled explicitly in the VM fixtures).',
        'No pending MCP/kept-reference/declared-tool metadata rescues the empty candidate set; normal adapter defaults omit these inputs.',
        'qmn turns po off, sr is undefined when tool_addition fallback io is false, and the search-off filter removes Ct(tool,Ai).',
        'Patched FH can still preserve the original defer_loading=true via ccgatewayRequestDefinition, leaving a deferred schema without ToolSearch.',
      ],
      native_vs_patch: 'The no-candidate guard and tool filters are unchanged native logic. The incompatible descriptor mapping and missing native runtime state enter through the build adapter/registry. Gmn preservation does not preserve the tool catalog.',
      actual_adapter_candidate_names: candidateNames,
      rescued_cases: ['native shouldDefer/isMcp classification', 'pending MCP (native C5 is constant false)', 'kept references', 'recorded declared ToolSearch', 'tool_addition fallback selects a different filter branch'],
      not_claimed: ['Full qmn execution in this VM harness', 'Foundry route support by the request entry', 'Model acceptance of an inconsistent catalog'],
    },
    native_helper_tests: { kind: 'AST-extracted VM tests with explicit stubs', passed: helperTests.filter(t => t.passed).length,
      failed: helperTests.filter(t => !t.passed).length, cases: helperTests },
    preservation_contracts: { passed: contracts.filter(c => c.status === 'pass').length,
      failed: contracts.filter(c => c.status === 'fail').length, cases: contracts },
    missing_integration_cases: [
      'ToolSearch with deferred native/custom/MCP schemas under true/false/auto modes in the real Worker -> CLI path',
      'By-value declarations and late tool-addition replay with actual native recorded session state',
      'Tool cache markers and interleaved custom/server tool order in actual captured HTTP',
      'History tool_reference blocks retained while ToolSearch is removed',
      'All provider refusals: helper tests alone do not establish supported provider entry routes',
    ],
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  return report;
}

module.exports = { runToolAssemblyAnalysis };
if (require.main === module) {
  const args = process.argv.slice(2);
  const argument = name => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
  runToolAssemblyAnalysis({ repo: argument('--repo'), sourceRoot: argument('--source-root'), patchedRoot: argument('--patched-root'), output: argument('--out') })
    .then(report => {
      console.log(JSON.stringify({ category: report.category, historical_scope: report.historical_scope, branches: report.branches.length,
        native_helper_tests: { passed: report.native_helper_tests.passed, failed: report.native_helper_tests.failed },
        preservation_contracts: { passed: report.preservation_contracts.passed, failed: report.preservation_contracts.failed } }));
      if (report.native_helper_tests.failed || args.includes('--assert-contract') && report.preservation_contracts.failed) process.exitCode = 1;
    }).catch(error => { console.error(error.stack); process.exitCode = 1; });
}

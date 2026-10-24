// Hash-bound native patch integration plus extracted final-object execution.
// Native model/profile collaborators are explicit stubs here; the real
// Worker/CLI assembly suite remains the end-to-end acceptance check.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { requestSessionID } from '../request-identity.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../..');
const mods = path.dirname(here);
const baseline = path.join(root, 'artifacts/claude-2.1.304/linux-restored');
const packageFile = process.env.CCG_BABEL_PACKAGE || path.join(root, 'next/web/package.json');
const parser = createRequire(packageFile)('@babel/parser');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
let ownedDirectory, output, finalObject, extraBodyExpression, patchManifest;

function find(node, predicate) {
  const matches = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (predicate(value)) matches.push(value);
    for (const [key, child] of Object.entries(value)) {
      if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  }
  visit(node);
  return matches;
}
function one(matches, label) {
  assert.equal(matches.length, 1, `Expected unique AST anchor: ${label}`);
  return matches[0];
}
// compact spells a module's tokens with no comments and no layout: a space only
// between two word tokens, each token as written in the source.
function compact(source) {
  let out = '';
  for (const token of parser.parse(source, { sourceType: 'module', tokens: true }).tokens) {
    if (token.type === 'CommentLine' || token.type === 'CommentBlock') continue;
    const text = source.slice(token.start, token.end);
    if (/[\w$]$/.test(out) && /^[\w$]/.test(text)) out += ' ';
    out += text;
  }
  return out;
}

before(() => {
  assert(fs.existsSync(baseline), 'Recovered 2.1.304 baseline is required; this test must not silently pass without it');
  ownedDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg304-wire-test-'));
  output = path.join(ownedDirectory, 'patched');
  execFileSync(process.execPath, [path.join(mods, 'patch-cli-2.1.304.cjs'), baseline, output], {
    env: { ...process.env, CCG_BABEL_PACKAGE: packageFile },
    encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 120000,
  });
  patchManifest = JSON.parse(fs.readFileSync(path.join(output, 'ccgateway-patch.json'), 'utf8'));
  const source = fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8');
  const tree = parser.parse(source, { sourceType: 'module' });
  const qmn = one(find(tree, n => n.type === 'FunctionDeclaration' && n.id?.name === 'qmn'), 'qmn');
  const uXn = one(find(qmn, n => n.type === 'VariableDeclarator' && n.id?.name === 'uXn'), 'qmn.uXn');
  const body = one(find(uXn.init, n => n.type === 'VariableDeclarator' && n.id?.name === '$c'), 'qmn.uXn.$c');
  const extra = one(find(uXn.init, n => n.type === 'VariableDeclarator' && n.id?.name === 'Xa'), 'qmn.uXn.Xa');
  finalObject = source.slice(body.init.start, body.init.end);
  extraBodyExpression = source.slice(extra.init.start, extra.init.end);
});

after(() => {
  if (!ownedDirectory) return;
  // Delete only the fresh test-owned directory immediately inside OS temp.
  const target = path.resolve(ownedDirectory), parent = path.resolve(os.tmpdir());
  assert.equal(path.dirname(target), parent);
  assert(path.basename(target).startsWith('ccg304-wire-test-'));
  fs.rmSync(target, { recursive: true, force: true });
});

function assemble({ external, tools, extra = {}, choice = { type: 'auto' }, thinking = { type: 'disabled' } }) {
  let extraBodyCalls = 0;
  const messages = [{ role: 'user', content: [{ type: 'text', text: 'original user' }] }];
  const system = [{ type: 'text', text: 'original system' }];
  const nativeTools = [{ name: 'native_reordered', description: 'native' }];
  const J = {
    ccgatewayBuildOnly: external, ccgatewayWireTools: tools,
    ccgatewayWireMessages: messages, ccgatewaySystemBlocks: system, model: 'claude-sonnet-4-6',
  };
  const context = {
    structuredClone, J, yl: [],
    z2() { extraBodyCalls++; return structuredClone(extra); },
    fC: value => value, Rk: null, Gf: messages, jh: { system, tools: nativeTools },
    CT: choice, OF: false, yBe: () => ({ user_id: 'native-stub-identity' }),
    db: 128, kf: thinking, hse: 1, MA: null, oF: false, o5: false,
    iy: false, Zk: null, Kw: null, qm: {}, Il: { effort: 'high' },
    VO: undefined, vR: () => false,
  };
  vm.createContext(context);
  context.Xa = vm.runInContext(`(${extraBodyExpression})`, context);
  const result = vm.runInContext(`(${finalObject})`, context);
  return { result, extraBodyCalls, messages, system, nativeTools };
}

test('304 patch binds baseline hashes and emits a matching native module hash', () => {
  const profile = JSON.parse(fs.readFileSync(path.join(mods, 'profiles/linux-x64-2.1.304.json'), 'utf8'));
  // The capabilities are the profile's, and --ccgateway-info prints the same.
  assert.deepEqual(patchManifest.capabilities, profile.capabilities);
  assert(compact(fs.readFileSync(path.join(output, 'cli.js'), 'utf8')).includes('console.log(JSON.stringify({version:"2.1.304",patch:' + JSON.stringify(profile.extension) + ',capabilities:' + JSON.stringify(profile.capabilities) + '}));return}'));
  for (const [name, hashes] of Object.entries(patchManifest.files)) {
    assert.equal(hashes.before, profile.modules[name]);
    assert.equal(hashes.before, sha(fs.readFileSync(path.join(baseline, name))));
    assert.equal(hashes.after, sha(fs.readFileSync(path.join(output, name))));
  }
});

test('external native final object preserves ToolSearch, mixed order, missing description and opaque fields', () => {
  const tools = [
    { name: 'ToolSearch', input_schema: { type: 'object' } },
    { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
    { name: 'deferred_custom', defer_loading: true, input_schema: { type: 'object' }, opaque: { nested: [1, 2] } },
    { name: 'cached_custom', description: '', cache_control: { type: 'ephemeral' }, input_schema: { type: 'object' } },
  ];
  const original = structuredClone(tools);
  const { result } = assemble({ external: true, tools });
  assert.deepEqual(plain(result.tools), original);
  assert(!Object.hasOwn(result.tools[0], 'description'));
  result.tools[2].opaque.nested.push(3);
  assert.deepEqual(tools, original, 'native output must not alias the adapter input');
});

test('external tool absence and explicit empty list remain distinguishable', () => {
  const absent = assemble({ external: true, tools: undefined }).result;
  const empty = assemble({ external: true, tools: [] }).result;
  assert(!Object.hasOwn(absent, 'tools'));
  assert.deepEqual(plain(empty.tools), []);
});

test('external build ignores EXTRA_BODY before it can replace content, tools or native parameters', () => {
  const tools = [{ name: 'original', input_schema: { type: 'object' } }];
  const extra = {
    model: 'override', messages: [], system: 'override', tools: [], max_tokens: 777,
    thinking: { type: 'adaptive' }, metadata: { user_id: 'override' },
    tool_choice: { type: 'none' }, temperature: 0.99, unknown_extra: true,
    output_config: { effort: 'low' },
  };
  const { result, extraBodyCalls, messages, system } = assemble({ external: true, tools, extra });
  assert.equal(extraBodyCalls, 0, 'do not evaluate process-global EXTRA_BODY at all for external build');
  assert.deepEqual(plain(result.messages), messages);
  assert.deepEqual(plain(result.system), system);
  assert.deepEqual(plain(result.tools), tools);
  assert.equal(result.model, 'claude-sonnet-4-6');
  assert.equal(result.max_tokens, 128);
  assert.deepEqual(plain(result.thinking), { type: 'disabled' });
  assert.deepEqual(plain(result.tool_choice), { type: 'auto' });
  assert.deepEqual(plain(result.metadata), { user_id: 'native-stub-identity' });
  assert.equal(result.temperature, 1);
  assert.deepEqual(plain(result.output_config), { effort: 'high' });
  assert(!Object.hasOwn(result, 'unknown_extra'));
});

test('ordinary native CLI retains its own tools and EXTRA_BODY behavior', () => {
  const native = assemble({ external: false, tools: [{ name: 'external_ignored' }] });
  assert.equal(native.extraBodyCalls, 1);
  assert.deepEqual(plain(native.result.tools), native.nativeTools);
  const overridden = assemble({ external: false, extra: { max_tokens: 777, unknown_extra: true, tools: [{ name: 'env' }] } });
  assert.equal(overridden.extraBodyCalls, 1);
  assert.equal(overridden.result.max_tokens, 777);
  assert.equal(overridden.result.unknown_extra, true);
  assert.deepEqual(plain(overridden.result.tools), [{ name: 'env' }]);
});

test('external tools override leaves native-derived thinking and tool-choice values intact', () => {
  const choice = { type: 'auto' }, thinking = { type: 'adaptive', display: 'updates' };
  const { result } = assemble({ external: true, tools: [{ name: 'ToolSearch' }], choice, thinking });
  assert.deepEqual(plain(result.tool_choice), choice);
  assert.deepEqual(plain(result.thinking), thinking);
});

function nativeFunction(directory, file, name) {
  const source = fs.readFileSync(path.join(directory, file), 'utf8');
  const ast = parser.parse(source, { sourceType: 'module' });
  const node = one(find(ast, n => n.type === 'FunctionDeclaration' && n.id?.name === name), file + ':' + name);
  return source.slice(node.start, node.end);
}

test('container resource reporting does not read host CPU, RAM, load or disk', async () => {
  const resources = { cpus: 2, memory_gb: 2, free_mem_mb: 1536 };
  const forbidden = () => { throw Error('host hardware was read'); };
  const context = {
    ccgContainerResources: () => resources, qir: () => true, AbortSignal,
    w8r: async () => ({ complete: true, profile: { tools: ['fixture'] } }),
    s: 2000, c: [], $Hr: 100, UHr: 10000, FHr: 1e6, a: 2n ** 30n,
    d: forbidden, p: forbidden, u: forbidden, Ne: value => value,
    _: JSON.stringify, m: forbidden, l: forbidden, U: value => value, f() {}, g() {},
  };
  vm.createContext(context);
  vm.runInContext(nativeFunction(output, 'chunk-yqea5hk4.js', 'Ali'), context);
  assert.deepEqual(plain(await context.Ali('/work')), { tools: ['fixture'], cpus: 2, memory_gb: 2 });
  context.ccgContainerResources = () => ({ ...resources, disk_free_gb: 7 });
  assert.deepEqual(plain(await context.Ali('/work')), { tools: ['fixture'], cpus: 2, memory_gb: 2, disk_free_gb: 7 });
  context.ccgContainerResources = () => ({});
  assert.deepEqual(plain(await context.Ali('/work')), { tools: ['fixture'] }, 'unknown limits must not fall back to the host');
  context.qir = () => false;
  context.ccgContainerResources = forbidden;
  assert.equal(await context.Ali('/work'), undefined, 'native feature gate stays ahead of collection');

  const performance = {
    ccgContainerResources: () => resources,
    sce: () => ({ getEntriesByType: () => [{ name: 'main_after_run', startTime: 1 }] }),
    _t: {}, ft: new Set(), F: { freemem: forbidden, loadavg: forbidden },
    a: {}, v: undefined, H: undefined, yGt: () => undefined,
  };
  vm.createContext(performance);
  vm.runInContext(nativeFunction(output, 'chunk-sx3g9k86.js', 'V'), performance);
  const result = performance.V({ firstEmitPhases: new Set(), startupContext: {} }, { late: false });
  assert.equal(result.free_mem_mb, 1536);
  assert(!Object.hasOwn(result, 'load_avg_1m'));
  performance.ccgContainerResources = () => ({});
  const unknown = performance.V({ firstEmitPhases: new Set(), startupContext: {} }, { late: false });
  assert(!Object.hasOwn(unknown, 'free_mem_mb'));
  assert(!Object.hasOwn(unknown, 'load_avg_1m'));
  assert(patchManifest.capabilities.includes('container_resource_reporting_v1'));
  assert.equal(patchManifest.extension, 'ccgateway-v24-beta-path');
  assert(patchManifest.capabilities.includes('client_user_agent_v1'));
  assert(patchManifest.capabilities.includes('request_levels_v1'));
  assert(patchManifest.capabilities.includes('request_identity_v1'));
  assert(patchManifest.capabilities.includes('build_identity_line_v1'));
  assert(patchManifest.capabilities.includes('direct_billing_v1'));
  assert(patchManifest.supportFiles['ccgateway-direct-billing.js']);
  // The Claude Code lines are the CLI's own: the build request gets the native
  // selector's three lines (interactive; non-interactive with and without an
  // appended prompt) and recognizer. Direct gets only the native header line
  // (kLo over RIs of the first user prompt, with a main-thread prompt's ID and
  // turn), no identity line (2026-10-23).
  // The entry is inserted as written (request-entry.inc.js); its code, without
  // comments or layout, is compared token for token in its minimal spelling.
  const cli = compact(fs.readFileSync(path.join(output, 'cli.js'), 'utf8'));
  const lines = '\\{official_cli:ccgPrefix\\(\\{isNonInteractive:!1,hasAppendSystemPrompt:!1\\}\\),official_cli_sdk:ccgPrefix\\(\\{isNonInteractive:!0,hasAppendSystemPrompt:!0\\}\\),agent_sdk:ccgPrefix\\(\\{isNonInteractive:!0,hasAppendSystemPrompt:!1\\}\\)\\}';
  assert.match(cli, new RegExp('\\{yBe:ccgNativeMetadata,t1n:ccgIsPrefix,n1n:ccgPrefix,PAs:ccgHead\\}=await import\\("\\./chunk-t61vswm2\\.js"\\).*let\\{B1s:ccgIsBilling,oJe:ccgHeader\\}=await import\\("\\./chunk-7y2kvacy\\.js"\\).*prefixBuild:\\(b,c\\)=>ccgPrefixBuild\\(b,c,' + lines + ',ccgIsPrefix,ccgIsBilling\\),directBuild:ccgDirect'));
  assert(cli.includes('nativeBilling:()=>ccgHead([],void 0,{fingerprint:ccgFingerprint(ccgPromptRecords(Array.isArray(body.messages)?body.messages:[],ccgReminder)),agentContext:o.agentContext??ccgMainAgent(),promptId:o.promptId,turnOrigin:o.turnOrigin,turnPosition:o.turnPosition})[0]??""})};'));
  assert(cli.includes('PAs:ccgHead}=await import("./chunk-t61vswm2.js")') && !cli.includes('kLo:header'));
  assert.match(cli, /"request_identity_v1","build_identity_line_v1","direct_billing_v1","request_agent_context_v1","build_injection_v1","request_levels_v1","client_user_agent_v1"]/);
  // The loop header names and the layer wording come from the native core,
  // and the date attachment uses the query loop's own date (POo).
  assert(cli.includes('let{ccgatewayLayerVocabulary:ccgLayers,ccgatewayPromptTurn:ccgTurnOf}=await import("./chunk-rncrmfyt.js")') && cli.includes('loopHeaders:ccgLayers().loopHeaders') && cli.includes('turn:ccgTurnOf'));
  assert(fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8').startsWith('import {ZUo as ccgBeta} from "./chunk-4qs43hr1.js";\nimport {POo as ccgDate} from "./chunk-t2p0d04m.js";\n'));
  // The client's system blocks join as the CLI joins two appended prompts:
  // its own function, copied from the main module (which stays unchanged).
  const core = fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8');
  const join = core.slice(core.lastIndexOf('function ccgatewayJoinAppend('));
  const joinContext = vm.createContext({});
  vm.runInContext(join, joinContext);
  assert.equal(joinContext.ccgatewayJoinAppend('a\n', 'b'), 'a\n\nb');
  assert.equal(joinContext.ccgatewayJoinAppend(undefined, 'b'), 'b');
  assert(!patchManifest.files['chunk-wt08cjq1.js']);
  assert(patchManifest.capabilities.includes('request_agent_context_v1'));
  assert(patchManifest.supportFiles['ccgateway-request-agent.js']);
  // The client's kind of request is chosen with CC's own query source naming,
  // billing header and prompt fingerprint text.
  assert.match(cli, /let\{Zoe:ccgQuerySource\}=await import\("\.\/chunk-m5q1b1c4\.js"\).*let ccgBilling=ccgBillingFor\(ccgHeader\);.*directBuild:ccgDirect,agentNative:ccgAgent\}\)\)/);
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header, else CC's (dN); the request command names the
  // entrypoint natively (setEntrypointOnRequests) for the header and dN alike.
  const transport = fs.readFileSync(path.join(output, 'chunk-38xgev2z.js'), 'utf8');
  assert(transport.startsWith('import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n'));
  assert.equal(transport.split('"User-Agent":ccgatewayClientUserAgent()??dN()').length, 2);
  assert(!transport.includes('"User-Agent":dN()'));
  assert(cli.includes('leadingBilling:system=>ccgBilling.leadingBilling(system),entrypoint:(system,requestPolicy)=>ccgBilling.requestEntrypoint(system,requestPolicy),'));
  // A request CC's fast-path policy refuses gets the shared error frame.
  assert(cli.includes('let{encodeErrorFrame:ccgErrorFrame,policyDeniedFrame:ccgDenied}=await import("./ccgateway-request-error.js");process.stderr.write(ccgErrorFrame(ccgDenied()));'));
  // The Mod tool-execution chain is gone: only FH reads the client tools.
  const coreText = fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8');
  assert.equal(coreText.split('./ccgateway-native-tools.js').length, 2);
  assert(coreText.includes('import {isNative as ccgIsNative,nativeDefinition as ccgDefinition} from "./ccgateway-native-tools.js";'));
  for (const name of ['ccgRegister', 'ccgRevision', 'ccgMerge', 'ccgFind', 'ccgDispatch']) assert(!coreText.includes(name), name);
  for (const file of ['chunk-0q47gehe.js', 'chunk-8w3jrzn0.js', 'chunk-g8r6rccx.js', 'chunk-qygf2xvn.js', 'chunk-gzc5bc6y.js']) {
    assert(!patchManifest.files[file], file);
    assert.equal(sha(fs.readFileSync(path.join(output, file))), sha(fs.readFileSync(path.join(baseline, file))), file);
  }
  for (const name of ['Ten', 'N_e', 'mIt', 'bz', 'GYr']) assert.equal(nativeFunction(output, 'chunk-rncrmfyt.js', name), nativeFunction(baseline, 'chunk-rncrmfyt.js', name), name);
  for (const name of ['ccgateway-request-command.js', 'ccgateway-request-build.js']) {
    assert(fs.readFileSync(path.join(output, name), 'utf8').includes("setEntrypointOnRequests } from './chunk-72vwyp9d.js'"), name);
  }
  // Installed support modules import each other by their installed names.
  assert.match(fs.readFileSync(path.join(output, 'ccgateway-direct-billing.js'), 'utf8'), /from '\.\/ccgateway-content-policy\.js'/);
  assert(patchManifest.supportFiles['ccgateway-raw-json.js']);
  assert.match(fs.readFileSync(path.join(output, 'ccgateway-direct-billing.js'), 'utf8'), /from '\.\/ccgateway-raw-json\.js'/);
  assert.doesNotMatch(cli, /identityBody|prefixBody|rewriteDirectIdentity|directCliPrefix/);
  // The attribution fingerprint hashes the first user prompt of the external
  // messages, not their reminder blocks.
  assert.match(fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8'), /let tF=RIs\(J\.ccgatewayBuildOnly===true\?J\.ccgatewayFingerprintMessages:Aa\),/);
});

test('container reporting patches preserve resource admission, Git concurrency and native identity generators', () => {
  for (const [file, names] of [
    ['chunk-rncrmfyt.js', ['Jwn', 'rOr', 'Xnt', 'poo']],
    ['chunk-7p6jp6kj.js', ['ZM', 'I_t', 'd1']],
  ]) for (const name of names) assert.equal(nativeFunction(output, file, name), nativeFunction(baseline, file, name));
});

test('the patched root session is the Worker identity, never a re-derived UUID', () => {
  const mapped = { version: 2, mode: 'replace', rewrite: true, device_id: 'a'.repeat(64),
    session_id: '12345678-1234-4123-8123-123456789012', parent_session_id: '23456789-2345-4234-9234-234567890123',
    carrier: 'json' };
  const old = process.env.CCG_REQUEST_IDENTITY;
  process.env.CCG_REQUEST_IDENTITY = JSON.stringify(mapped);
  try {
    const rootContext = { ccgRequestSessionID: requestSessionID, Xzr: x => x, vn: () => ({}),
      ier: () => assert.fail('must not hash the mapped session through remote UUIDv5'),
      Ure: () => assert.fail('mapped session must not be replaced by a random session') };
    vm.createContext(rootContext);
    vm.runInContext(nativeFunction(output, 'chunk-dxktn51d.js', 'Yi'), rootContext);
    assert.equal(rootContext.Yi('/work').id, mapped.session_id);
  } finally {
    if (old === undefined) delete process.env.CCG_REQUEST_IDENTITY;
    else process.env.CCG_REQUEST_IDENTITY = old;
  }
});

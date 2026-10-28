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
import { requestSessionID } from '../../../request-identity.js';
import { pinned } from '../../artifacts.mjs';
const { restored, profile } = pinned('2.1.304');

const here = path.dirname(fileURLToPath(import.meta.url));
const mods = path.resolve(here, '../../..');
const baseline = fileURLToPath(restored);
const packageFile = process.env.CCG_BABEL_PACKAGE || path.join(mods, 'package.json');
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
  execFileSync(process.execPath, [path.join(mods, 'patch-cli.cjs'), baseline, output], {
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
  assert.equal(patchManifest.extension, 'ccgateway-v37-content-guard');
  assert(patchManifest.capabilities.includes('client_user_agent_v1'));
  assert(patchManifest.capabilities.includes('request_capture_v1'));
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
  // The entry is inserted as written (request-entry.inc.js): a stub with the
  // info line and one import of the command's support module, so the patched
  // entry carries no request wiring.
  const cli = compact(fs.readFileSync(path.join(output, 'cli.js'), 'utf8'));
  assert(cli.includes('if(e[0]==="--ccgateway-info"){console.log(JSON.stringify('));
  assert(cli.includes('if(e[0]==="request"){let{runRequest}=await import("./ccgateway-request-entry.js");process.exit(await runRequest(e.slice(1),s))}'));
  assert.equal(cli.split('./ccgateway-request-entry.js').length, 2);
  assert.doesNotMatch(cli, /ccgPrefix|ccgBilling|ccgDirect|ccgHead/);
  assert.match(cli, /"request_identity_v1","build_identity_line_v1","direct_billing_v1","request_agent_context_v1","build_injection_v1","request_levels_v1","client_user_agent_v1","request_capture_v1","management_http_v1"]/);
  // The command's wiring is its support module: CC's fast-path policy, the
  // native bindings it composes, and the command itself.
  const entry = fs.readFileSync(path.join(output, 'ccgateway-request-entry.js'), 'utf8');
  assert(entry.includes("await import('./ccgateway-native-entry.js')"));
  assert(entry.includes("await import('./ccgateway-request-command.js')"));
  assert(entry.includes("await import('./ccgateway-request-natives.js')"));
  assert(entry.includes('runRequestCommand(args, { agentNative, directBuild, identityBuild, oauthBeta })'));
  // The native bindings are read once, from hash-bound modules, through the
  // generated native groups: each logical name is the profile's binding.
  const reexports = name => Object.fromEntries([...fs.readFileSync(path.join(output, name), 'utf8').matchAll(/export \{ ([^}]*) \} from '\.\/([^']+)';/g)]
    .flatMap(([, list, file]) => list.split(', ').map(item => { const [native, logical = native] = item.split(' as '); return [logical, file + ':' + native]; })));
  for (const [group, bindings] of Object.entries(profile.natives)) assert.deepEqual(reexports('ccgateway-native-' + group + '.js'), bindings, group);
  assert.deepEqual(profile.natives.entry, { loadFastPathPolicy: 'chunk-3nrrbnwj.js:loadFastPathPolicy' });
  assert.deepEqual(profile.natives.natives, { oauthBeta: 'chunk-4qs43hr1.js:gTe', requestIdentity: 'chunk-t61vswm2.js:yBe', attributionHeader: 'chunk-t61vswm2.js:PAs',
    billingHeaderPrefix: 'chunk-7y2kvacy.js:oJe', reminderOpen: 'chunk-jkcb7qdd.js:KF', attributionFingerprint: 'chunk-2gh4h0fv.js:RIs', mainAgentContext: 'chunk-7p6jp6kj.js:Al',
    querySourceFor: 'chunk-m5q1b1c4.js:Zoe', ccgatewayLayerVocabulary: 'chunk-rncrmfyt.js:ccgatewayLayerVocabulary', ccgatewayPromptTurn: 'chunk-rncrmfyt.js:ccgatewayPromptTurn' });
  const natives = fs.readFileSync(path.join(output, 'ccgateway-request-natives.js'), 'utf8');
  assert(natives.includes("from './ccgateway-native-natives.js';"));
  assert(!/from '\.\/chunk-/.test(natives));
  assert(!natives.includes('prefixBuild'));
  assert(!natives.includes('identityLine'), 'the line is rendered by n1n inside the builder');
  assert(!natives.includes('kLo:header'));
  assert.match(natives, /fingerprint: attributionFingerprint\(fingerprintMessages\(Array\.isArray\(body\.messages\) \? body\.messages : \[\], reminderOpen\)\)/);
  assert(natives.includes('export const oauthBeta = oauthAuth.header;'));
  assert(fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8').startsWith('import {ZUo as ccgateway_native_betaFromHeader} from "./chunk-4qs43hr1.js";\nimport {POo as ccgateway_native_currentDate} from "./chunk-t2p0d04m.js";\n'));
  // The beta order is the builder's own list, read by AST from the hash-bound
  // core and installed in its support module; the core exports nothing of it.
  const betas = fs.readFileSync(path.join(output, 'ccgateway-request-betas.js'), 'utf8');
  assert.match(betas, /^import \{ modelBetas \} from '\.\/ccgateway-native-command\.js';\nimport \{ [\w$]+(,[\w$]+)* \} from "\.\/chunk-4qs43hr1\.js";\n/m);
  const builderBetas = /const builderBetas = \[([^\]]*)\];/.exec(betas)[1].split(',');
  assert.equal(builderBetas.length, 12, 'the builder pushes twelve betas');
  assert.equal(new Set(builderBetas).size, builderBetas.length);
  // eS.beta (a plugin's per-request beta) is not a module constant and is not
  // taken; the core keeps the order out of its scope and its builder as it was.
  const coreBytes = fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8');
  assert(!coreBytes.includes('ccgatewayBetaOrder'));
  assert(coreBytes.includes('if(eS)zr.push(eS.beta),Zk=eS.body;'), 'the native builder is otherwise unchanged');
  assert(coreBytes.includes('export {ile as ccgatewaySystemRecord};'), 'the native system record factory is exported');
  // The client's system blocks join as the CLI joins two appended prompts:
  // its own function, copied from the main module (which stays unchanged).
  const joinContext = vm.createContext({});
  vm.runInContext(nativeFunction(output, 'chunk-rncrmfyt.js', 'ccgatewayJoinAppend'), joinContext);
  assert.equal(joinContext.ccgatewayJoinAppend('a\n', 'b'), 'a\n\nb');
  assert.equal(joinContext.ccgatewayJoinAppend(undefined, 'b'), 'b');
  assert(!patchManifest.files['chunk-wt08cjq1.js']);
  assert(patchManifest.capabilities.includes('request_agent_context_v1'));
  assert(patchManifest.supportFiles['ccgateway-request-agent.js']);
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header, else CC's (dN); the request command names the
  // entrypoint natively (setEntrypointOnRequests) for the header and dN alike.
  const transport = fs.readFileSync(path.join(output, 'chunk-38xgev2z.js'), 'utf8');
  assert(transport.startsWith('import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n'));
  assert.equal(transport.split('"User-Agent":ccgatewayClientUserAgent()??dN()').length, 2);
  assert(!transport.includes('"User-Agent":dN()'));
  // The Mod tool-execution chain is gone: only FH reads the client tools, and
  // it hands back the client's own definition as it is.
  const coreText = fs.readFileSync(path.join(output, 'chunk-rncrmfyt.js'), 'utf8');
  assert.equal(coreText.split('./ccgateway-native-tools.js').length, 2);
  assert(coreText.includes('import {isNative as ccgIsNative} from "./ccgateway-native-tools.js";'));
  assert(coreText.includes('if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  assert(!coreText.includes('ccgDefinition'));
  // The identity line comes from the builder's recordedCliPrefix, and the
  // patched PAs hands build the line it put in front of the prompt.
  assert(coreText.includes('recorded:J.recordedCliPrefix'));
  assert(fs.readFileSync(path.join(output, 'chunk-t61vswm2.js'), 'utf8').includes('r.ccgatewayCapturePrefix?.(n);'));
  for (const name of ['ccgRegister', 'ccgRevision', 'ccgMerge', 'ccgFind', 'ccgDispatch']) assert(!coreText.includes(name), name);
  // Direct's endpoint is the native beta Messages post's own, read by AST and
  // filled into the transport; the repository source holds no copy of it.
  const transportSupport = fs.readFileSync(path.join(output, 'ccgateway-model-request.js'), 'utf8');
  assert.match(transportSupport, /export const messagesPath = \/\*CCGATEWAY_MESSAGES_PATH\*\/ ["']\/v1\/messages\?beta=true["'];/);
  assert(transportSupport.includes('client.beta.messages.create(options.body, request).asResponse()'));
  assert(!fs.readFileSync(path.join(mods, 'model-request.js'), 'utf8').includes("'/v1/messages?beta=true'"));
  const nativeTransport = fs.readFileSync(path.join(baseline, 'chunk-38xgev2z.js'), 'utf8');
  const nativePath = one(find(parser.parse(nativeTransport, { sourceType: 'module' }),
    n => n.type === 'StringLiteral' && n.value === '/v1/messages?beta=true'), 'native beta Messages path');
  assert.equal(nativePath.value, '/v1/messages?beta=true');
  for (const file of ['chunk-0q47gehe.js', 'chunk-8w3jrzn0.js', 'chunk-g8r6rccx.js', 'chunk-qygf2xvn.js', 'chunk-gzc5bc6y.js']) {
    assert(!patchManifest.files[file], file);
    assert.equal(sha(fs.readFileSync(path.join(output, file))), sha(fs.readFileSync(path.join(baseline, file))), file);
  }
  for (const name of ['Ten', 'N_e', 'mIt', 'bz', 'GYr']) assert.equal(nativeFunction(output, 'chunk-rncrmfyt.js', name), nativeFunction(baseline, 'chunk-rncrmfyt.js', name), name);
  for (const name of ['command', 'build']) {
    assert(fs.readFileSync(path.join(output, 'ccgateway-request-' + name + '.js'), 'utf8').includes("setEntrypointOnRequests } from './ccgateway-native-" + name + ".js'"), name);
    assert.equal(profile.natives[name].setEntrypointOnRequests, 'chunk-72vwyp9d.js:setEntrypointOnRequests');
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

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
const { restored, profile } = pinned('2.1.312');

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
  assert(fs.existsSync(baseline), 'Recovered 2.1.312 baseline is required; this test must not silently pass without it');
  ownedDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg312-wire-test-'));
  output = path.join(ownedDirectory, 'patched');
  execFileSync(process.execPath, [path.join(mods, 'patch-cli.cjs'), baseline, output], {
    env: { ...process.env, CCG_BABEL_PACKAGE: packageFile },
    encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 120000,
  });
  patchManifest = JSON.parse(fs.readFileSync(path.join(output, 'ccgateway-patch.json'), 'utf8'));
  // 2.1.312 names (2.1.310 in parentheses): core chunk-7dmym6x9.js
  // (chunk-j0tbz6ra.js), query Qmn (rSn), builder x9n (Ceo), final body iu
  // (Vc), extra body fl (sl).
  const source = fs.readFileSync(path.join(output, 'chunk-7dmym6x9.js'), 'utf8');
  const tree = parser.parse(source, { sourceType: 'module' });
  const Qmn = one(find(tree, n => n.type === 'FunctionDeclaration' && n.id?.name === 'Qmn'), 'Qmn');
  const x9n = one(find(Qmn, n => n.type === 'VariableDeclarator' && n.id?.name === 'x9n'), 'Qmn.x9n');
  const body = one(find(x9n.init, n => n.type === 'VariableDeclarator' && n.id?.name === 'iu'), 'Qmn.x9n.iu');
  const extra = one(find(x9n.init, n => n.type === 'VariableDeclarator' && n.id?.name === 'fl'), 'Qmn.x9n.fl');
  finalObject = source.slice(body.init.start, body.init.end);
  extraBodyExpression = source.slice(extra.init.start, extra.init.end);
});

after(() => {
  if (!ownedDirectory) return;
  // Delete only the fresh test-owned directory immediately inside OS temp.
  const target = path.resolve(ownedDirectory), parent = path.resolve(os.tmpdir());
  assert.equal(path.dirname(target), parent);
  assert(path.basename(target).startsWith('ccg312-wire-test-'));
  fs.rmSync(target, { recursive: true, force: true });
});

function assemble({ external, tools, extra = {}, choice = { type: 'auto' }, thinking = { type: 'disabled' } }) {
  let extraBodyCalls = 0;
  const messages = [{ role: 'user', content: [{ type: 'text', text: 'original user' }] }];
  const system = [{ type: 'text', text: 'original system' }];
  const nativeTools = [{ name: 'native_reordered', description: 'native' }];
  // The builder's locals in 2.1.312 (2.1.310 in parentheses): Q (Q), Ll (Rl),
  // jK (K2), hA (tA), oS (kS), qu (ep), Wl (Jh), KS (ub), yF (A$), Qze (zWe),
  // ST (MT), hp (Zf), cie (Jie), kE (wE), tE (DF), N6 (Uie), Yk (mS), ZS (cb),
  // vT (OT), Bl (Tg), pd (yd), tI (eD), jR (RW), fl (sl); each is the name the
  // final literal iu reads in the same place Vc read the old one.
  const Q = {
    ccgatewayBuildOnly: external, ccgatewayWireTools: tools,
    ccgatewayWireMessages: messages, ccgatewaySystemBlocks: system, model: 'claude-sonnet-4-6',
  };
  const context = {
    structuredClone, Q, Ll: [],
    jK() { extraBodyCalls++; return structuredClone(extra); },
    hA: value => value, oS: null, qu: messages, Wl: { system, tools: nativeTools },
    KS: choice, yF: false, Qze: () => ({ user_id: 'native-stub-identity' }),
    ST: 128, hp: thinking, cie: 1, kE: null, tE: false, N6: false,
    Yk: false, ZS: null, vT: null, Bl: {}, pd: { effort: 'high' },
    tI: undefined, jR: () => false,
  };
  vm.createContext(context);
  context.fl = vm.runInContext(`(${extraBodyExpression})`, context);
  const result = vm.runInContext(`(${finalObject})`, context);
  return { result, extraBodyCalls, messages, system, nativeTools };
}

test('312 patch binds baseline hashes and emits a matching native module hash', () => {
  // The capabilities are the profile's, and --ccgateway-info prints the same.
  assert.deepEqual(patchManifest.capabilities, profile.capabilities);
  assert(compact(fs.readFileSync(path.join(output, 'cli.js'), 'utf8')).includes('console.log(JSON.stringify({version:"2.1.312",patch:' + JSON.stringify(profile.extension) + ',capabilities:' + JSON.stringify(profile.capabilities) + '}));return}'));
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
  // 2.1.312 (2.1.310): YOi (nki) in chunk-7cks3gqr.js (chunk-c6dz8eqs.js);
  // pwr (ahr), luo (Aoo), hqr (yWr), _qr (bWr), yqr (_Wr); Pe and N as before.
  const context = {
    ccgContainerResources: () => resources, pwr: () => true, AbortSignal,
    luo: async () => ({ complete: true, profile: { tools: ['fixture'] } }),
    s: 2000, c: [], hqr: 100, _qr: 10000, yqr: 1e6, a: 2n ** 30n,
    d: forbidden, p: forbidden, u: forbidden, Pe: value => value,
    _: JSON.stringify, m: forbidden, l: forbidden, N: value => value, f() {}, g() {},
  };
  vm.createContext(context);
  vm.runInContext(nativeFunction(output, 'chunk-7cks3gqr.js', 'YOi'), context);
  assert.deepEqual(plain(await context.YOi('/work')), { tools: ['fixture'], cpus: 2, memory_gb: 2 });
  context.ccgContainerResources = () => ({ ...resources, disk_free_gb: 7 });
  assert.deepEqual(plain(await context.YOi('/work')), { tools: ['fixture'], cpus: 2, memory_gb: 2, disk_free_gb: 7 });
  context.ccgContainerResources = () => ({});
  assert.deepEqual(plain(await context.YOi('/work')), { tools: ['fixture'] }, 'unknown limits must not fall back to the host');
  context.pwr = () => false;
  context.ccgContainerResources = forbidden;
  assert.equal(await context.YOi('/work'), undefined, 'native feature gate stays ahead of collection');

  // 2.1.312 (2.1.310): V (X) in chunk-rjc7jjmb.js (chunk-c57c64b0.js); Mme
  // (Vfe), F the os module (H), i the environment (i), H (B), P3t (V4t).
  const performance = {
    ccgContainerResources: () => resources,
    Mme: () => ({ getEntriesByType: () => [{ name: 'main_after_run', startTime: 1 }] }),
    pe: {}, ce: new Set(), F: { freemem: forbidden, loadavg: forbidden },
    i: {}, O: undefined, H: undefined, P3t: () => undefined,
  };
  vm.createContext(performance);
  vm.runInContext(nativeFunction(output, 'chunk-rjc7jjmb.js', 'V'), performance);
  const result = performance.V({ firstEmitPhases: new Set(), startupContext: {} }, { late: false });
  assert.equal(result.free_mem_mb, 1536);
  assert(!Object.hasOwn(result, 'load_avg_1m'));
  performance.ccgContainerResources = () => ({});
  const unknown = performance.V({ firstEmitPhases: new Set(), startupContext: {} }, { late: false });
  assert(!Object.hasOwn(unknown, 'free_mem_mb'));
  assert(!Object.hasOwn(unknown, 'load_avg_1m'));
  assert(patchManifest.capabilities.includes('container_resource_reporting_v1'));
  // The 2.1.312 profile names its patch ccgateway-v38-cc-2-1-312 (2.1.310:
  // ccgateway-v39-session-state; 2.1.304: ccgateway-v40-session-state).
  assert.equal(patchManifest.extension, 'ccgateway-v38-cc-2-1-312');
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
  // (f3o over oYs of the first user prompt, with a main-thread prompt's ID and
  // turn), no identity line (2026-10-23).
  // The entry is inserted as written (request-entry.inc.js): a stub with the
  // info line and one import of the command's support module, so the patched
  // entry carries no request wiring.
  const cli = compact(fs.readFileSync(path.join(output, 'cli.js'), 'utf8'));
  assert(cli.includes('if(e[0]==="--ccgateway-info"){console.log(JSON.stringify('));
  assert(cli.includes('if(e[0]==="request"){let{runRequest}=await import("./ccgateway-request-entry.js");process.exit(await runRequest(e.slice(1),r))}'));
  assert.equal(cli.split('./ccgateway-request-entry.js').length, 2);
  assert.doesNotMatch(cli, /ccgPrefix|ccgBilling|ccgDirect|ccgHead/);
  assert.match(cli, /"request_identity_v1","build_identity_line_v1","direct_billing_v1","request_agent_context_v1","build_injection_v1","request_levels_v1","client_user_agent_v1","request_capture_v1","management_http_v1","build_session_state_v1"]/);
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
  assert.deepEqual(profile.natives.entry, { loadFastPathPolicy: 'chunk-44429y21.js:loadFastPathPolicy' });
  assert.deepEqual(profile.natives.natives, { oauthBeta: 'chunk-afamv62a.js:dPe', requestIdentity: 'chunk-pd06as9s.js:Qze', attributionHeader: 'chunk-pd06as9s.js:d2s',
    billingHeaderPrefix: 'chunk-a354k8k1.js:art', reminderOpen: 'chunk-frekxwcp.js:BP', attributionFingerprint: 'chunk-65my4caa.js:oYs', mainAgentContext: 'chunk-f7avdr1b.js:ld',
    querySourceFor: 'chunk-ca54vwf0.js:tde', ccgatewayLayerVocabulary: 'chunk-7dmym6x9.js:ccgatewayLayerVocabulary', ccgatewayPromptTurn: 'chunk-7dmym6x9.js:ccgatewayPromptTurn' });
  const natives = fs.readFileSync(path.join(output, 'ccgateway-request-natives.js'), 'utf8');
  assert(natives.includes("from './ccgateway-native-natives.js';"));
  assert(!/from '\.\/chunk-/.test(natives));
  assert(!natives.includes('prefixBuild'));
  assert(!natives.includes('identityLine'), 'the line is rendered by b6n inside the builder');
  assert(!natives.includes('Y2o:header'));
  assert.match(natives, /fingerprint: attributionFingerprint\(fingerprintMessages\(Array\.isArray\(body\.messages\) \? body\.messages : \[\], reminderOpen\)\)/);
  assert(natives.includes('export const oauthBeta = oauthAuth.header;'));
  assert(fs.readFileSync(path.join(output, 'chunk-7dmym6x9.js'), 'utf8').startsWith('import {FQo as ccgateway_native_betaFromHeader} from "./chunk-afamv62a.js";\nimport {Zqo as ccgateway_native_currentDate} from "./chunk-6hfj944r.js";\n'));
  // The beta order is the builder's own list, read by AST from the hash-bound
  // core and installed in its support module; the core exports nothing of it.
  const betas = fs.readFileSync(path.join(output, 'ccgateway-request-betas.js'), 'utf8');
  assert.match(betas, /^import \{ modelBetas \} from '\.\/ccgateway-native-command\.js';\nimport \{ [\w$]+(,[\w$]+)* \} from "\.\/chunk-afamv62a\.js";\n/m);
  const builderBetas = /const builderBetas = \[([^\]]*)\];/.exec(betas)[1].split(',');
  assert.equal(builderBetas.length, 12, 'the builder pushes twelve betas');
  assert.equal(new Set(builderBetas).size, builderBetas.length);
  // tb.beta (2.1.310 fb.beta; a plugin's per-request beta) is not a module constant and is not
  // taken; the core keeps the order out of its scope and its builder as it was.
  const coreBytes = fs.readFileSync(path.join(output, 'chunk-7dmym6x9.js'), 'utf8');
  assert(!coreBytes.includes('ccgatewayBetaOrder'));
  assert(coreBytes.includes('if(tb)Hr.push(tb.beta),ZS=tb.body;'), 'the native builder is otherwise unchanged');
  // 2.1.312 pushes thinking-token-count (uF) in the query loop instead of the
  // model table (2.1.310 QH): build keeps sending only the client's betas and
  // the ones its body needs, as v36 did.
  assert(coreBytes.includes('if(Q.ccgatewayBuildOnly!==true&&Se(()=>CYn(vt))&&It.thinking.supported&&!ht.includes(uF))ht.push(uF);'), 'build does not add the thinking-token-count beta');
  assert(coreBytes.includes('export {rle as ccgatewaySystemRecord};'), 'the native system record factory is exported');
  // The client's system blocks join as the CLI joins two appended prompts:
  // its own function, copied from the main module (which stays unchanged).
  const joinContext = vm.createContext({});
  vm.runInContext(nativeFunction(output, 'chunk-7dmym6x9.js', 'ccgatewayJoinAppend'), joinContext);
  assert.equal(joinContext.ccgatewayJoinAppend('a\n', 'b'), 'a\n\nb');
  assert.equal(joinContext.ccgatewayJoinAppend(undefined, 'b'), 'b');
  assert(!patchManifest.files['chunk-9ccm4kwh.js']);
  assert(patchManifest.capabilities.includes('request_agent_context_v1'));
  assert(patchManifest.supportFiles['ccgateway-request-agent.js']);
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header, else CC's (lF; 2.1.310 M$); the request command names the
  // entrypoint natively (setEntrypointOnRequests) for the header and lF alike.
  const transport = fs.readFileSync(path.join(output, 'chunk-yagw4eem.js'), 'utf8');
  assert(transport.startsWith('import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n'));
  assert.equal(transport.split('"User-Agent":ccgatewayClientUserAgent()??lF()').length, 2);
  assert(!transport.includes('"User-Agent":lF()'));
  // The Mod tool-execution chain is gone: only YH (2.1.310 rH) reads the client tools, and
  // it hands back the client's own definition as it is.
  const coreText = fs.readFileSync(path.join(output, 'chunk-7dmym6x9.js'), 'utf8');
  assert.equal(coreText.split('./ccgateway-native-tools.js').length, 2);
  assert(coreText.includes('import {isNative as ccgIsNative} from "./ccgateway-native-tools.js";'));
  assert(coreText.includes('if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  assert(!coreText.includes('ccgDefinition'));
  // The identity line comes from the builder's recordedCliPrefix, and the
  // patched d2s hands build the line it put in front of the prompt.
  assert(coreText.includes('recorded:Q.recordedCliPrefix'));
  assert(fs.readFileSync(path.join(output, 'chunk-pd06as9s.js'), 'utf8').includes('r.ccgatewayCapturePrefix?.(n);'));
  for (const name of ['ccgRegister', 'ccgRevision', 'ccgMerge', 'ccgFind', 'ccgDispatch']) assert(!coreText.includes(name), name);
  // Direct's endpoint is the native beta Messages post's own, read by AST and
  // filled into the transport; the repository source holds no copy of it.
  const transportSupport = fs.readFileSync(path.join(output, 'ccgateway-model-request.js'), 'utf8');
  assert.match(transportSupport, /export const messagesPath = \/\*CCGATEWAY_MESSAGES_PATH\*\/ ["']\/v1\/messages\?beta=true["'];/);
  assert(transportSupport.includes('client.beta.messages.create(options.body, request).asResponse()'));
  assert(!fs.readFileSync(path.join(mods, 'model-request.js'), 'utf8').includes("'/v1/messages?beta=true'"));
  const nativeTransport = fs.readFileSync(path.join(baseline, 'chunk-yagw4eem.js'), 'utf8');
  const nativePath = one(find(parser.parse(nativeTransport, { sourceType: 'module' }),
    n => n.type === 'StringLiteral' && n.value === '/v1/messages?beta=true'), 'native beta Messages path');
  assert.equal(nativePath.value, '/v1/messages?beta=true');
  // 2.1.312 (2.1.310): chunk-whkq77a3 (gq77tz5k), chunk-685anx1r (7rnqxvcm),
  // chunk-s1sf6jgq (mdxeekqd), chunk-cz6a8p8d (csvfdyfe), chunk-8dkwr9c9 (tqjdehqd).
  for (const file of ['chunk-whkq77a3.js', 'chunk-685anx1r.js', 'chunk-s1sf6jgq.js', 'chunk-cz6a8p8d.js', 'chunk-8dkwr9c9.js']) {
    assert(!patchManifest.files[file], file);
    assert.equal(sha(fs.readFileSync(path.join(output, file))), sha(fs.readFileSync(path.join(baseline, file))), file);
  }
  // Acn (Din), IQ (ZSe), Rht (r0t), EU (kK), BYr (W7r).
  for (const name of ['Acn', 'IQ', 'Rht', 'EU', 'BYr']) assert.equal(nativeFunction(output, 'chunk-7dmym6x9.js', name), nativeFunction(baseline, 'chunk-7dmym6x9.js', name), name);
  for (const name of ['command', 'build']) {
    assert(fs.readFileSync(path.join(output, 'ccgateway-request-' + name + '.js'), 'utf8').includes("setEntrypointOnRequests } from './ccgateway-native-" + name + ".js'"), name);
    assert.equal(profile.natives[name].setEntrypointOnRequests, 'chunk-c2txqh1z.js:setEntrypointOnRequests');
  }
  // Installed support modules import each other by their installed names.
  assert.match(fs.readFileSync(path.join(output, 'ccgateway-direct-billing.js'), 'utf8'), /from '\.\/ccgateway-content-policy\.js'/);
  assert(patchManifest.supportFiles['ccgateway-raw-json.js']);
  assert.match(fs.readFileSync(path.join(output, 'ccgateway-direct-billing.js'), 'utf8'), /from '\.\/ccgateway-raw-json\.js'/);
  assert.doesNotMatch(cli, /identityBody|prefixBody|rewriteDirectIdentity|directCliPrefix/);
  // The attribution fingerprint hashes the first user prompt of the external
  // messages, not their reminder blocks.
  // wW/oYs/Q/su are 2.1.310 cyt/fWs/Q/ou.
  assert.match(fs.readFileSync(path.join(output, 'chunk-7dmym6x9.js'), 'utf8'), /let wW=oYs\(Q\.ccgatewayBuildOnly===true\?Q\.ccgatewayFingerprintMessages:su\),/);
});

test('container reporting patches preserve resource admission, Git concurrency and native identity generators', () => {
  for (const [file, names] of [
    // Ywn/aTr/fnt/hoo (kxn/_Fr/yit/fao); JH/MAt/XV (_H/GEt/Zj) in chunk-f7avdr1b.js (chunk-ajtyjx88.js).
    ['chunk-7dmym6x9.js', ['Ywn', 'aTr', 'fnt', 'hoo']],
    ['chunk-f7avdr1b.js', ['JH', 'MAt', 'XV']],
  ]) for (const name of names) assert.equal(nativeFunction(output, file, name), nativeFunction(baseline, file, name));
});

test('the patched root session is the Worker identity, never a re-derived UUID', () => {
  const mapped = { version: 2, mode: 'replace', rewrite: true, device_id: 'a'.repeat(64),
    session_id: '12345678-1234-4123-8123-123456789012', parent_session_id: '23456789-2345-4234-9234-234567890123',
    carrier: 'json' };
  const old = process.env.CCG_REQUEST_IDENTITY;
  process.env.CCG_REQUEST_IDENTITY = JSON.stringify(mapped);
  try {
    // 2.1.312 (2.1.310): Rt (Fr) in chunk-zpsbh0wk.js (chunk-wrtp8qz8.js); gto (W9r), tt (Xt), t8t (_Yt), jae (uie).
    const rootContext = { ccgRequestSessionID: requestSessionID, gto: x => x, tt: () => ({}),
      t8t: () => assert.fail('must not hash the mapped session through remote UUIDv5'),
      jae: () => assert.fail('mapped session must not be replaced by a random session') };
    vm.createContext(rootContext);
    vm.runInContext(nativeFunction(output, 'chunk-zpsbh0wk.js', 'Rt'), rootContext);
    assert.equal(rootContext.Rt('/work').id, mapped.session_id);
  } finally {
    if (old === undefined) delete process.env.CCG_REQUEST_IDENTITY;
    else process.env.CCG_REQUEST_IDENTITY = old;
  }
});

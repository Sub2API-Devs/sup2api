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
import { assertRuntimeEntries } from '../../runtime-native.mjs';
const { restored, profile } = pinned('2.1.318');

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
  assert(fs.existsSync(baseline), 'Recovered 2.1.318 baseline is required; this test must not silently pass without it');
  ownedDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg318-wire-test-'));
  output = path.join(ownedDirectory, 'patched');
  execFileSync(process.execPath, [path.join(mods, 'patch-cli.cjs'), baseline, output], {
    env: { ...process.env, CCG_BABEL_PACKAGE: packageFile },
    encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 120000,
  });
  patchManifest = JSON.parse(fs.readFileSync(path.join(output, 'ccgateway-patch.json'), 'utf8'));
  // 2.1.318 names (2.1.316 in parentheses): core chunk-5xgkngpb.js
  // (chunk-e6aww6q8.js), query Z_n (e_n), builder VJn (g5n), final body jf
  // (Qc), extra body Qd (nd).
  const source = fs.readFileSync(path.join(output, 'chunk-5xgkngpb.js'), 'utf8');
  const tree = parser.parse(source, { sourceType: 'module' });
  const Z_n = one(find(tree, n => n.type === 'FunctionDeclaration' && n.id?.name === 'Z_n'), 'Z_n');
  const VJn = one(find(Z_n, n => n.type === 'VariableDeclarator' && n.id?.name === 'VJn'), 'Z_n.VJn');
  const body = one(find(VJn.init, n => n.type === 'VariableDeclarator' && n.id?.name === 'jf'), 'Z_n.VJn.jf');
  const extra = one(find(VJn.init, n => n.type === 'VariableDeclarator' && n.id?.name === 'Qd'), 'Z_n.VJn.Qd');
  finalObject = source.slice(body.init.start, body.init.end);
  extraBodyExpression = source.slice(extra.init.start, extra.init.end);
});

after(() => {
  if (!ownedDirectory) return;
  // Delete only the fresh test-owned directory immediately inside OS temp.
  const target = path.resolve(ownedDirectory), parent = path.resolve(os.tmpdir());
  assert.equal(path.dirname(target), parent);
  assert(path.basename(target).startsWith('ccg318-wire-test-'));
  fs.rmSync(target, { recursive: true, force: true });
});

function assemble({ external, tools, extra = {}, choice = { type: 'auto' }, thinking = { type: 'disabled' } }) {
  let extraBodyCalls = 0;
  const messages = [{ role: 'user', content: [{ type: 'text', text: 'original user' }] }];
  const system = [{ type: 'text', text: 'original system' }];
  const nativeTools = [{ name: 'native_reordered', description: 'native' }];
  // The builder's locals in 2.1.318 (2.1.316 in parentheses), in the order the
  // final literal jf reads them: ne (Z), uk (L_), Yg (Mg), ah (Of), lc (Nu),
  // PA (OC), Lze (wBe), f3e (vVe), Hu (pk), Tg (Am), VG (N3), gM (mP), k0 (JF),
  // Pi (Os), tbe (sle), I9 (j5), lM (cy), Ky (YGe), Ods (mk), Lk (_b), kS (gP),
  // yM (Zg), Ld (nd), nu (Wd), uL (t$), cA (Et), Et (nt), xt (the new
  // previous_message_id) and Kk (zT). Qd is the extra-body object, zRt its
  // reader. The query options are ne now: the new core imports unrelated Z
  // and Q bindings.
  const ne = {
    ccgatewayBuildOnly: external, ccgatewayWireTools: tools,
    ccgatewayWireMessages: messages, ccgatewaySystemBlocks: system, model: 'claude-sonnet-4-6',
  };
  const context = {
    structuredClone, ne, Bd: [], uk: null, Yg: messages, ah: [], lc: { system, tools: nativeTools },
    cL: false, wT: [],
    PA: choice, Lze: () => ({}), f3e: () => ({ user_id: 'native-stub-identity' }),
    Hu: 128, Tg: thinking, VG: 1, gM: null, k0: false, Pi: [],
    tbe: 'context-management-2025-06-27', I9: {}, lM: false, Ky: undefined, Ods: 'safeguards',
    Lk: false, kS: null, yM: null, Ld: {}, nu: { effort: 'high' },
    uL: undefined, cA: () => false, Et: undefined, xt: undefined, Kk: value => value,
    zRt() { extraBodyCalls++; return structuredClone(extra); },
  };
  vm.createContext(context);
  context.Qd = vm.runInContext(`(${extraBodyExpression})`, context);
  const result = vm.runInContext(`(${finalObject})`, context);
  return { result, extraBodyCalls, messages, system, nativeTools };
}

test('318 patch binds baseline hashes and emits a matching native module hash', () => {
  // The capabilities are the profile's, and --ccgateway-info prints the same.
  assert.deepEqual(patchManifest.capabilities, profile.capabilities);
  assert(compact(fs.readFileSync(path.join(output, 'cli.js'), 'utf8')).includes('console.log(JSON.stringify({version:"2.1.318",patch:' + JSON.stringify(profile.extension) + ',capabilities:' + JSON.stringify(profile.capabilities) + '}));return}'));
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
  // 2.1.318 (2.1.316): Foa (BWi) in chunk-rf2v5y5r.js (chunk-5mav84cq.js);
  // CBr (Pxr), wLo (bSo), Zco (xXr), tuo (IXr), euo (PXr), ke (Ce); f/u/d for
  // p/d/u, l/a for the disk block size, c/p, g/g, m/m, a/l, N/N unchanged.
  const context = {
    ccgContainerResources: () => resources, CBr: () => true, AbortSignal,
    wLo: async () => ({ complete: true, profile: { tools: ['fixture'] } }),
    s: 2000, p: [], Zco: 100, tuo: 10000, euo: 1e6, l: 2n ** 30n,
    u: forbidden, d: forbidden, f: forbidden, ke: value => value,
    _: JSON.stringify, m: forbidden, a: forbidden, N: value => value, c() {}, g() {},
  };
  vm.createContext(context);
  vm.runInContext(nativeFunction(output, 'chunk-rf2v5y5r.js', 'Foa'), context);
  assert.deepEqual(plain(await context.Foa('/work')), { tools: ['fixture'], cpus: 2, memory_gb: 2 });
  context.ccgContainerResources = () => ({ ...resources, disk_free_gb: 7 });
  assert.deepEqual(plain(await context.Foa('/work')), { tools: ['fixture'], cpus: 2, memory_gb: 2, disk_free_gb: 7 });
  context.ccgContainerResources = () => ({});
  assert.deepEqual(plain(await context.Foa('/work')), { tools: ['fixture'] }, 'unknown limits must not fall back to the host');
  context.CBr = () => false;
  context.ccgContainerResources = forbidden;
  assert.equal(await context.Foa('/work'), undefined, 'native feature gate stays ahead of collection');
  // The disk block size is the function's l in 2.1.318 (a in 2.1.316); ours
  // multiplies by the same name the native line did.
  const resourceSource = nativeFunction(output, 'chunk-rf2v5y5r.js', 'Foa');
  assert(resourceSource.includes('BigInt(ccgResources.disk_free_gb)*l'));
  assert(resourceSource.includes('Math.round(d()/Number(l))'));
  assert(!resourceSource.includes('BigInt(ccgResources.disk_free_gb)*a'));
  // The startup report's checkpoint count is its own a in 2.1.318 (p in
  // 2.1.316), not the disk block size.
  const performanceSource = nativeFunction(output, 'chunk-eehtd1bk.js', 'N');
  assert(performanceSource.includes('n.checkpoint_count=a.length'));

  // 2.1.318 (2.1.316): N (Z) in chunk-eehtd1bk.js (chunk-eweqvj83.js); qfe
  // ($he), B (fe), H (pe), Din (jQt); M the os module (F), i, g (O) and P (H)
  // as before. The disk block size is now l, not a.
  const performance = {
    ccgContainerResources: () => resources,
    qfe: () => ({ getEntriesByType: () => [{ name: 'main_after_run', startTime: 1 }] }),
    B: {}, H: new Set(), M: { freemem: forbidden, loadavg: forbidden },
    i: {}, g: undefined, P: undefined, Din: () => undefined, _e: value => value,
  };
  vm.createContext(performance);
  vm.runInContext(nativeFunction(output, 'chunk-eehtd1bk.js', 'N'), performance);
  const result = performance.N({ firstEmitPhases: new Set(), startupContext: {} }, { late: false });
  assert.equal(result.free_mem_mb, 1536);
  assert(!Object.hasOwn(result, 'load_avg_1m'));
  performance.ccgContainerResources = () => ({});
  const unknown = performance.N({ firstEmitPhases: new Set(), startupContext: {} }, { late: false });
  assert(!Object.hasOwn(unknown, 'free_mem_mb'));
  assert(!Object.hasOwn(unknown, 'load_avg_1m'));
  assert(patchManifest.capabilities.includes('container_resource_reporting_v1'));
  // The 2.1.318 profile names its patch ccgateway-v56-cc-2-1-318 (numbers run
  // on across Claude Code versions, 2.1.304 was at v55; v48 was the migration
  // candidate without the tools-used header, validated only; 2.1.316:
  // ccgateway-v57-tools-used, v47-count-tokens the released one; 2.1.312:
  // v58, 2.1.310: v59, 2.1.304: v60, patched only).
  assert.equal(patchManifest.extension, 'ccgateway-v56-cc-2-1-318');
  assert(patchManifest.capabilities.includes('request_tools_used_v1'));
  assert(patchManifest.capabilities.includes('build_first_party_shape_v1'));
  assert(patchManifest.capabilities.includes('build_injection_tools_v2'));
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
  // (Dns over Wwi of the first user prompt, with a main-thread prompt's ID and
  // turn), no identity line (2026-10-23).
  // The entry is inserted as written (request-entry.inc.js): a stub with the
  // info line and one import of the command's support module, so the patched
  // entry carries no request wiring.
  const cli = compact(fs.readFileSync(path.join(output, 'cli.js'), 'utf8'));
  assert(cli.includes('if(t[0]==="--ccgateway-info"){console.log(JSON.stringify('));
  assert(cli.includes('if(t[0]==="request"){let{runRequest}=await import("./ccgateway-request-entry.js");process.exit(await runRequest(t.slice(1),s))}'));
  assert.equal(cli.split('./ccgateway-request-entry.js').length, 2);
  assert.doesNotMatch(cli, /ccgPrefix|ccgBilling|ccgDirect|ccgHead/);
  assert.match(cli, /"request_identity_v1","build_identity_line_v1","direct_billing_v1","request_agent_context_v1","build_injection_v1","request_levels_v1","client_user_agent_v1","request_capture_v1","management_http_v1","build_session_state_v1","build_injection_tools_v2","build_first_party_shape_v1","request_count_tokens_v1","request_tools_used_v1"]/);
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
  assert.deepEqual(profile.natives.entry, { loadFastPathPolicy: 'chunk-0xbqqc14.js:loadFastPathPolicy' });
  assert.deepEqual(profile.natives.natives, { oauthBeta: 'chunk-7kayq7nc.js:LAe', requestIdentity: 'chunk-7pwjpdkw.js:f3e', attributionHeader: 'chunk-7pwjpdkw.js:tyi',
    billingHeaderPrefix: 'chunk-8tk33yy7.js:yct', reminderOpen: 'chunk-my2r02mp.js:FD', attributionFingerprint: 'chunk-7jxyna5q.js:Wwi', mainAgentContext: 'chunk-exfmq47h.js:Pd',
    querySourceFor: 'chunk-w3zvfmad.js:Tme', ccgatewayLayerVocabulary: 'chunk-5xgkngpb.js:ccgatewayLayerVocabulary', ccgatewayPromptTurn: 'chunk-5xgkngpb.js:ccgatewayPromptTurn', ccgatewayBuiltInAgents: 'chunk-5xgkngpb.js:ccgatewayBuiltInAgents' });
  const natives = fs.readFileSync(path.join(output, 'ccgateway-request-natives.js'), 'utf8');
  assert(natives.includes("from './ccgateway-native-natives.js';"));
  assert(!/from '\.\/chunk-/.test(natives));
  assert(!natives.includes('prefixBuild'));
  assert(!natives.includes('identityLine'), 'the line is rendered by tcr inside the builder');
  assert(!natives.includes('Y2o:header'));
  assert.match(natives, /fingerprint: attributionFingerprint\(fingerprintMessages\(Array\.isArray\(body\.messages\) \? body\.messages : \[\], reminderOpen\)\)/);
  assert(natives.includes('export const oauthBeta = oauthAuth.header;'));
  assert(fs.readFileSync(path.join(output, 'chunk-5xgkngpb.js'), 'utf8').startsWith('import {yAs as ccgateway_native_betaFromHeader} from "./chunk-7kayq7nc.js";\nimport {yhs as ccgateway_native_currentDate} from "./chunk-v4ach9rb.js";\nimport {Egr as ccgateway_native_turnPosition} from "./chunk-nt9amew5.js";\n'));
  // The beta order is the builder's own list, read by AST from the hash-bound
  // core and installed in its support module; the core exports nothing of it.
  const betas = fs.readFileSync(path.join(output, 'ccgateway-request-betas.js'), 'utf8');
  assert.match(betas, /^import \{ modelBetas, promptCachingScopeBeta, cacheDiagnosisBeta, extendedCacheTtlBeta \} from '\.\/ccgateway-native-command\.js';\nimport \{ [\w$]+(,[\w$]+)* \} from "\.\/chunk-7kayq7nc\.js";\n/m);
  const builderBetas = /const builderBetas = \[([^\]]*)\];/.exec(betas)[1].split(',');
  // 2.1.318 pushes a thirteenth, zHe (claude-code-side-query-2026-09-29), second
  // in the order; build sends none of the builder's own, so it only ranks a
  // client's copy of that beta.
  assert.equal(builderBetas.length, 13, 'the builder pushes thirteen betas');
  assert.equal(new Set(builderBetas).size, builderBetas.length);
  // Gb.beta (2.1.316 jE.beta; a plugin's per-request beta) is not a module constant and is not
  // taken; the core keeps the order out of its scope and its builder as it was.
  const coreBytes = fs.readFileSync(path.join(output, 'chunk-5xgkngpb.js'), 'utf8');
  assert(!coreBytes.includes('ccgatewayBetaOrder'));
  assert(coreBytes.includes('if(Gb)Pi.push(Gb.beta),kS=Gb.body;'), 'the native builder is otherwise unchanged');
  // 2.1.312 moved thinking-token-count (2.1.318 S1) from the model table into
  // the query loop: build keeps sending only the client's betas and the ones
  // its body needs, as v36 did. The wrapper is Ee in 2.1.318.
  assert(coreBytes.includes('if(ne.ccgatewayBuildOnly!==true&&Ee(()=>GRt(At))&&Nt.thinking.supported&&!It.includes(S1))It.push(S1);'), 'build does not add the thinking-token-count beta');
  // 2.1.318 appends program-use-case-ids after the model table when the
  // process saw it sent; build sends the client's betas, so it is skipped too.
  assert(coreBytes.includes('else if(ne.ccgatewayBuildOnly!==true&&pE(mt,dR)&&YNn())It=[...It,dR];'), 'build does not add the program-use-case-ids beta');
  assert(coreBytes.includes('export {Tfe as ccgatewaySystemRecord};'), 'the native system record factory is exported');
  // The client's system blocks join as the CLI joins two appended prompts:
  // its own function, copied from the main module (which stays unchanged).
  const joinContext = vm.createContext({});
  vm.runInContext(nativeFunction(output, 'chunk-5xgkngpb.js', 'ccgatewayJoinAppend'), joinContext);
  assert.equal(joinContext.ccgatewayJoinAppend('a\n', 'b'), 'a\n\nb');
  assert.equal(joinContext.ccgatewayJoinAppend(undefined, 'b'), 'b');
  assert(!patchManifest.files['chunk-hjswk319.js']);
  assert(patchManifest.capabilities.includes('request_agent_context_v1'));
  assert(patchManifest.supportFiles['ccgateway-request-agent.js']);
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header, else CC's (g1; 2.1.316 wU); the request command names the
  // entrypoint natively (setEntrypointOnRequests) for the header and g1 alike.
  const transport = fs.readFileSync(path.join(output, 'chunk-vn3g7zt8.js'), 'utf8');
  assert(transport.startsWith('import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n'));
  assert.equal(transport.split('"User-Agent":ccgatewayClientUserAgent()??g1()').length, 2);
  assert(!transport.includes('"User-Agent":g1()'));
  // The API-key-only route (direct, or build with an API key) skips the same
  // calls as before: the custom headers, the stored credentials, the OAuth
  // decision and proxy auth. Like 2.1.316, 2.1.318 re-reads the stored login,
  // re-decides OAuth and re-reads the custom headers after proxy auth,
  // rebuilding the client when they changed: that block is skipped too. The
  // provider route is kd in this module (2.1.316 Od); this module's jd is the
  // first-party URL check, which takes an object, so jd(s) would refuse every
  // API-key request.
  const factory = nativeFunction(output, 'chunk-vn3g7zt8.js', 'uF');
  assert.equal(factory.split('if(ccgatewayAPIKeyOnly&&(!n||kd(s)!=="firstParty"))throw Error(').length, 2);
  assert(!transport.includes('jd(s)!=="firstParty"'));
  assert.equal(factory.split('ae=ccgatewayAPIKeyOnly?{}:jJt(),').length, 2);
  assert.equal(factory.split('bt=ccgatewayAPIKeyOnly?null:Hn(),Ct=ccgatewayAPIKeyOnly?false:kGe(').length, 2);
  assert.equal(factory.split('if(!ccgatewayAPIKeyOnly)await RZe();').length, 2);
  assert.equal(factory.split('if(!ccgatewayAPIKeyOnly){let Vl=Hn();').length, 2);
  assert.equal(factory.split('Hn()').length, 3, 'both stored-login reads are behind the API-key-only check');
  // The new module's Ul (2.1.316 Ml) is another function and stays native.
  assert.equal(nativeFunction(output, 'chunk-vn3g7zt8.js', 'Ul'), nativeFunction(baseline, 'chunk-vn3g7zt8.js', 'Ul'));
  // The Mod tool-execution chain is gone: only YU (2.1.316 gB) reads the client tools, and
  // it hands back the client's own definition as it is.
  const coreText = fs.readFileSync(path.join(output, 'chunk-5xgkngpb.js'), 'utf8');
  assert.equal(coreText.split('./ccgateway-native-tools.js').length, 2);
  assert(coreText.includes('import {isNative as ccgIsNative} from "./ccgateway-native-tools.js";'));
  assert(coreText.includes('if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  assert(!coreText.includes('ccgDefinition'));
  assert(coreText.includes('async function YU(e,n){if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  // External messages skip X_n, the normalizer the query calls with la (and its
  // new third, timing parameter). The new core still has a Kmn and a Qyn,
  // unrelated functions the 2.1.316 anchor texts would also match: Kmn keeps
  // its native body (Qyn is no longer a one-argument function).
  assert(coreText.includes('function X_n(e,n,r){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,'));
  assert.equal(nativeFunction(output, 'chunk-5xgkngpb.js', 'Kmn'), nativeFunction(baseline, 'chunk-5xgkngpb.js', 'Kmn'));
  // The query reads its options as ne; a Z.ccgateway* or Q.ccgateway* read
  // would resolve to an imported binding and be always false.
  assert.doesNotMatch(nativeFunction(output, 'chunk-5xgkngpb.js', 'Z_n'), /(?<![\w$])[ZQ]\.ccgateway/);
  assert.equal(nativeFunction(output, 'chunk-5xgkngpb.js', 'Z_n').split('ne.ccgateway').length - 1, 29, 'every ccgateway read is the query options');
  // 2.1.318 splits the native message normalizer in two: nRr builds the
  // messages, then the new tool-provenance pass (Xgn) would rewrite ownership
  // metadata in the client's tool_addition blocks. Wire messages skip both,
  // Oy taking jy straight (the counterpart of the 2.1.316 Mg=HS=YSr( anchor).
  assert.equal(nativeFunction(output, 'chunk-5xgkngpb.js', 'Z_n').split('Yg=Oy=(ne.ccgatewayBuildOnly===true&&ne.ccgatewayNativeProbe!==true)?jy:Xgn(').length, 2, 'wire messages skip nRr and Xgn');
  // The identity line comes from the builder's recordedCliPrefix, and the
  // patched tyi hands build the line it put in front of the prompt.
  assert(coreText.includes('recorded:ne.recordedCliPrefix'));
  assert(fs.readFileSync(path.join(output, 'chunk-7pwjpdkw.js'), 'utf8').includes('r.ccgatewayCapturePrefix?.(n);'));
  for (const name of ['ccgRegister', 'ccgRevision', 'ccgMerge', 'ccgFind', 'ccgDispatch']) assert(!coreText.includes(name), name);
  // Direct's endpoint is the native beta Messages post's own, read by AST and
  // filled into the transport; the repository source holds no copy of it.
  const transportSupport = fs.readFileSync(path.join(output, 'ccgateway-model-request.js'), 'utf8');
  assert.match(transportSupport, /export const messagesPath = \/\*CCGATEWAY_MESSAGES_PATH\*\/ ["']\/v1\/messages\?beta=true["'];/);
  assert(transportSupport.includes('client.beta.messages.create(options.body, request).asResponse()'));
  assert(!fs.readFileSync(path.join(mods, 'model-request.js'), 'utf8').includes("'/v1/messages?beta=true'"));
  const nativeTransport = fs.readFileSync(path.join(baseline, 'chunk-vn3g7zt8.js'), 'utf8');
  const nativePath = one(find(parser.parse(nativeTransport, { sourceType: 'module' }),
    n => n.type === 'StringLiteral' && n.value === '/v1/messages?beta=true'), 'native beta Messages path');
  assert.equal(nativePath.value, '/v1/messages?beta=true');
  // 2.1.318 (2.1.316): chunk-j8f885h1 (chunk-4121qate), chunk-0yw3taqg
  // (chunk-tyg7f3ek), chunk-czq1j3j2 (chunk-18hwfzwa), chunk-03tec5k5
  // (chunk-a76knw89), chunk-w3ch4xq2 (chunk-ha3km179).
  for (const file of ['chunk-j8f885h1.js', 'chunk-0yw3taqg.js', 'chunk-czq1j3j2.js', 'chunk-03tec5k5.js', 'chunk-w3ch4xq2.js']) {
    assert(!patchManifest.files[file], file);
    assert.equal(sha(fs.readFileSync(path.join(output, file))), sha(fs.readFileSync(path.join(baseline, file))), file);
  }
  // eAn (ohn), kee (vJ), _Ct (ISt), Cj ($B), i5r (U3r).
  for (const name of ['eAn', 'kee', '_Ct', 'Cj', 'i5r']) assert.equal(nativeFunction(output, 'chunk-5xgkngpb.js', name), nativeFunction(baseline, 'chunk-5xgkngpb.js', name), name);
  for (const name of ['command', 'build']) {
    assert(fs.readFileSync(path.join(output, 'ccgateway-request-' + name + '.js'), 'utf8').includes("setEntrypointOnRequests } from './ccgateway-native-" + name + ".js'"), name);
    assert.equal(profile.natives[name].setEntrypointOnRequests, 'chunk-pfp3j087.js:setEntrypointOnRequests');
  }
  // Installed support modules import each other by their installed names.
  assert.match(fs.readFileSync(path.join(output, 'ccgateway-direct-billing.js'), 'utf8'), /from '\.\/ccgateway-content-policy\.js'/);
  assert(patchManifest.supportFiles['ccgateway-raw-json.js']);
  assert.match(fs.readFileSync(path.join(output, 'ccgateway-direct-billing.js'), 'utf8'), /from '\.\/ccgateway-raw-json\.js'/);
  assert.doesNotMatch(cli, /identityBody|prefixBody|rewriteDirectIdentity|directCliPrefix/);
  // The attribution fingerprint hashes the first user prompt of the external
  // messages, not their reminder blocks.
  // pSt/Wwi/ne/cs are 2.1.316 uI/Vei/Z/_s.
  assert.match(fs.readFileSync(path.join(output, 'chunk-5xgkngpb.js'), 'utf8'), /let pSt=Wwi\(ne\.ccgatewayBuildOnly===true\?ne\.ccgatewayFingerprintMessages:cs\),/);
});

test('container reporting patches preserve resource admission, Git concurrency and native identity generators', () => {
  for (const [file, names] of [
    // YMn/jFr/Ist/gdo (URn/ZAr/xot/fio); kN/aNt/tq (XH/WPt/m2) in chunk-exfmq47h.js (chunk-aepeg2w5.js).
    ['chunk-5xgkngpb.js', ['YMn', 'jFr', 'Ist', 'gdo']],
    ['chunk-exfmq47h.js', ['kN', 'aNt', 'tq']],
  ]) for (const name of names) assert.equal(nativeFunction(output, file, name), nativeFunction(baseline, file, name));
});

test('the patched root session is the Worker identity, never a re-derived UUID', () => {
  const mapped = { version: 2, mode: 'replace', rewrite: true, device_id: 'a'.repeat(64),
    session_id: '12345678-1234-4123-8123-123456789012', parent_session_id: '23456789-2345-4234-9234-234567890123',
    carrier: 'json' };
  const old = process.env.CCG_REQUEST_IDENTITY;
  process.env.CCG_REQUEST_IDENTITY = JSON.stringify(mapped);
  try {
    // 2.1.318 (2.1.316): Tt (Rt) in chunk-5ythzcas.js (chunk-ndmse9kj.js); hTo
    // and st are that module's own, lTo (gco) and dpe (Ude) are imported, and
    // f1s (Sks) is the defaulted argument.
    const rootContext = { ccgRequestSessionID: requestSessionID, hTo: x => x, st: () => ({}),
      f1s: () => '/work',
      lTo: () => assert.fail('must not hash the mapped session through remote UUIDv5'),
      dpe: () => assert.fail('mapped session must not be replaced by a random session') };
    vm.createContext(rootContext);
    vm.runInContext(nativeFunction(output, 'chunk-5ythzcas.js', 'Tt'), rootContext);
    assert.equal(rootContext.Tt('/work').id, mapped.session_id);
  } finally {
    if (old === undefined) delete process.env.CCG_REQUEST_IDENTITY;
    else process.env.CCG_REQUEST_IDENTITY = old;
  }
});

// The compiled entries report the Node.js version the official ELF's Bun
// reports (runtime-version.js; X-Stainless-Runtime-Version upstream).
test('the patched entries install the official runtime version before anything else', () => {
  assertRuntimeEntries({ output, baseline, manifest: patchManifest, profile, parser });
});

// The tools-used header (x-claude-code-sandy-plover, request_tools_used_v1;
// SESSION-MEMORY-TOOLS-USED-DESIGN.md §6.3). The client factory's fetch
// wrapper XS (2.1.316 bw) keeps CC's own gates, sn (a Messages request), tft
// (the first-party route and ci()) and ub (tengu_silly_shore), and inside them
// asks the support module: CC's own value, the value given, or none.
const toolsUsedNative = 'if(H.set(Ulo,Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")';
const toolsUsedPatched = 'let ccgToolsUsed=ccgatewayToolsUsedHeader(H,()=>Nf(wf()));if(ccgToolsUsed===null)H.delete(Ulo);else if(H.set(Ulo,ccgToolsUsed??Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")';
const toolsUsedGate = 'if(sn(J))try{if(tft(L)&&ub()){';

test('the fetch wrapper asks the support module for the tools-used header inside its own gates', () => {
  const before = nativeFunction(baseline, 'chunk-vn3g7zt8.js', 'XS'), after = nativeFunction(output, 'chunk-vn3g7zt8.js', 'XS');
  assert.equal(before.split(toolsUsedGate + toolsUsedNative + '}}catch{}').length, 2, 'the 2.1.318 native statement');
  assert.equal(after.split(toolsUsedGate + toolsUsedPatched + '}}catch{}').length, 2, 'the patched statement, CC gates outside');
  assert(!after.includes(toolsUsedNative));
  // Nothing else of XS changes.
  assert.equal(after.replace(toolsUsedPatched, toolsUsedNative), before);
  const transport = fs.readFileSync(path.join(output, 'chunk-vn3g7zt8.js'), 'utf8');
  assert(transport.startsWith('import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\nimport {ccgatewayToolsUsedHeader} from "./ccgateway-request-tools-used.js";\n'));
  assert.equal(transport.split('ccgatewayToolsUsedHeader').length, 3, 'the import and the one call');
  assert(patchManifest.supportFiles['ccgateway-request-tools-used.js']);
  assert.equal(patchManifest.supportFiles['ccgateway-request-tools-used.js'].source, 'request-tools-used.js');

  // The statement run as patched: CC's own value without a Worker context,
  // the given value, or no header; CC's gates and its catch stay in charge.
  const statement = one(find(parser.parse(after, { sourceType: 'module' }), n => n.type === 'IfStatement' && after.slice(n.start, n.end).startsWith(toolsUsedGate)), 'the tools-used statement');
  const run = ({ answer, messages = true, firstParty = true, enabled = true, preset }) => {
    const calls = { helper: 0, native: 0, telemetry: 0 };
    const H = new Headers(preset === undefined ? {} : { 'x-claude-code-sandy-plover': preset });
    const context = {
      H, J: messages ? 'https://api.anthropic.com/v1/messages?beta=true' : 'https://api.anthropic.com/v1/messages/count_tokens?beta=true', L: 'firstParty',
      Ulo: 'x-claude-code-sandy-plover', sn: url => new URL(url).pathname.endsWith('/v1/messages'), tft: () => firstParty, ub: () => enabled,
      wf: () => 'set', Nf: set => { calls.native++; return `[native ${set}]`; },
      Ps: () => ({ once: () => true }), g: () => { calls.telemetry++; },
      ccgatewayToolsUsedHeader(headers, nativeValue) {
        calls.helper++;
        assert.equal(headers, H);
        if (answer === 'throw') throw Error('broken');
        return answer === 'native-value' ? nativeValue() : answer;
      },
    };
    vm.createContext(context);
    vm.runInContext(after.slice(statement.start, statement.end), context);
    return { value: H.get('x-claude-code-sandy-plover'), calls };
  };
  assert.deepEqual(run({ answer: undefined }), { value: '[native set]', calls: { helper: 1, native: 1, telemetry: 1 } });
  assert.deepEqual(run({ answer: 'native-value' }), { value: '[native set]', calls: { helper: 1, native: 1, telemetry: 1 } });
  assert.deepEqual(run({ answer: '[{"name":"Bash"}]' }), { value: '[{"name":"Bash"}]', calls: { helper: 1, native: 0, telemetry: 1 } });
  assert.deepEqual(run({ answer: null, preset: '[]' }), { value: null, calls: { helper: 1, native: 0, telemetry: 0 } });
  // CC's own gates decide first: no call outside them.
  assert.deepEqual(run({ answer: '[]', messages: false }), { value: null, calls: { helper: 0, native: 0, telemetry: 0 } });
  assert.deepEqual(run({ answer: '[]', firstParty: false }), { value: null, calls: { helper: 0, native: 0, telemetry: 0 } });
  assert.deepEqual(run({ answer: '[]', enabled: false }), { value: null, calls: { helper: 0, native: 0, telemetry: 0 } });
  // A failure is CC's own catch: the request goes, without the header.
  assert.deepEqual(run({ answer: 'throw' }), { value: null, calls: { helper: 1, native: 0, telemetry: 0 } });
});

test('the history module exports its own compact summary reader and nothing changes in it', () => {
  // chunk-sva49n74.js (2.1.316 chunk-a85pcmyw.js) is hash-bound for this: its
  // nD, PZt (the turn companion's list) are exported already, Z (the summary
  // opening's list, regex w) is exported by the patch, as it is.
  assert.equal(profile.modules['chunk-sva49n74.js'], sha(fs.readFileSync(path.join(baseline, 'chunk-sva49n74.js'))));
  assert.equal(patchManifest.files['chunk-sva49n74.js'].before, profile.modules['chunk-sva49n74.js']);
  const text = fs.readFileSync(path.join(baseline, 'chunk-sva49n74.js'), 'utf8');
  assert.equal(fs.readFileSync(path.join(output, 'chunk-sva49n74.js'), 'utf8'), text + '\nexport {Z as ccgatewayCompactSummaryTools};\n');
  assert.equal(nativeFunction(baseline, 'chunk-sva49n74.js', 'Z'), 'function Z(e){let t=e.match(w);return t===null?void 0:t[2]??t[3]}');
  assert.equal(nativeFunction(baseline, 'chunk-sva49n74.js', 'PZt'), 'function PZt(e){return C.exec(e)?.[1]}');
  assert.deepEqual(profile.natives.toolsUsed, {
    toolsUsedFromHistory: 'chunk-sva49n74.js:nD', conversationToolsUsed: 'chunk-pfp3j087.js:getConversationToolsUsed',
    compactSummaryTools: 'chunk-sva49n74.js:ccgatewayCompactSummaryTools', companionTools: 'chunk-sva49n74.js:PZt', toolsUsedUnreadable: 'chunk-5ythzcas.js:UD',
  });
  // getConversationToolsUsed is the facade's name for the session's set (wf).
  assert.match(fs.readFileSync(path.join(baseline, 'chunk-pfp3j087.js'), 'utf8'), /(?<![\w$])wf as getConversationToolsUsed(?![\w$])/);
  assert(!patchManifest.files['chunk-pfp3j087.js']);
});

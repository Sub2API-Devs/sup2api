import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { vocabulary, layers } from './vocabulary.mjs';
import { validateRequestPolicy, injectionChoices } from '../request-policy.js';
import { createContentPolicy } from '../content-policy.js';
import { installSupport } from './support.mjs';

// The layers a request without a billing header is given (2026-10-23).
test('the injection policy takes only known layers, as keys set to true or false', () => {
  const policy = { contract_version: 2, build_injection: { system_prompt: true, attachments: { date: true, environment: true, model: false }, tools: { Read: true, Bash: false } } };
  assert.deepEqual(validateRequestPolicy(policy), policy);
  assert.deepEqual(injectionChoices(policy.build_injection), { systemPrompt: true, attachments: ['environment', 'date'], tools: ['Read'] });
  assert.deepEqual(injectionChoices(undefined), { systemPrompt: false, attachments: [], tools: [] });
  for (const bad of [{ skills: true }, { system_prompt: 'yes' }, { attachments: ['date'] }, { attachments: { skills: true } }, { tools: { Read: 'yes' } }, { tools: { 'bad name': true } }]) {
    assert.throws(() => validateRequestPolicy({ contract_version: 2, build_injection: bad }), /build_injection/);
  }
});

test('a billing header anywhere makes the request Claude Code\'s own', () => {
  const { hasBilling } = createContentPolicy(vocabulary);
  const header = vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=cli;';
  assert.equal(hasBilling([{ type: 'text', text: header }, { type: 'text', text: 'p' }]), true);
  assert.equal(hasBilling([{ type: 'text', text: 'p' }, { type: 'text', text: 'p\n' + header }]), true);
  assert.equal(hasBilling(header + '\np'), true);
  assert.equal(hasBilling([{ type: 'text', text: 'mentions ' + header }]), false);
  assert.equal(hasBilling([{ type: 'text', text: '```\n' + header + '\n```' }]), false);
  assert.equal(hasBilling(undefined), false);
});

// The probe is CC's own request for the chosen layers; its prompt blocks,
// tools and attachment placement are taken around the client's request.
async function fixture(probeBody) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-304-injection-'));
  await installSupport(dir, ['request-input', 'request-options', 'request-policy', 'content-policy', 'request-parameters', 'request-build', 'native-tools']);
  const header = JSON.stringify(vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=sdk-cli;');
  for (const [name, source] of Object.entries({
    'package.json': '{"type":"module"}',
    'chunk-rncrmfyt.js': `export const calls=[]; export const ccgatewaySystemRecord=content=>({type:'api_system',message:{role:'system',content},uuid:'fixture',timestamp:'fixture'}); export const aBe=()=>({isKnownType:true,messages:[]}); export const ccgatewayEnvironment=()=>{throw Error('unexpected facts')}; export const ccgatewayEnvironmentVocabulary=()=>(${JSON.stringify(vocabulary)});
      export const ccgatewayDefaultPrompt=async(tools,model,appended)=>['PROMPT for '+tools.map(t=>t.name).join(','),...appended.length?['APPEND '+appended.join('\\n\\n')]:[]]; export const ccgatewayPermissionContext=()=>({mode:'default'}); export const ccgatewayLayerAttachments=async(kinds)=>kinds.map(type=>({type})); export const ccgatewayMarkTurns=(records,interactive)=>{let n=0,last;for(const r of records){if(r.type!=='user'||(Array.isArray(r.message.content)&&r.message.content.some(b=>b.type==='tool_result')))continue;n++;r.turnOrigin=interactive?'human':'sdk';r.turnPosition={promptIndex:interactive?n:0,turnIndex:n};last=r}return last}; export const ccgatewayLayerVocabulary=()=>(${JSON.stringify(layers)});
      export async function* jOt(input){calls.push(input); const probe=input.options.ccgatewayNativeProbe===true;
        const body=probe?${JSON.stringify(probeBody)}:{model:'m',system:input.options.ccgatewaySystemBlocks,messages:input.options.ccgatewayWireMessages,...input.options.ccgatewayWireTools===undefined?{}:{tools:input.options.ccgatewayWireTools}};
        if(probe) body.system=[{type:'text',text:${header}},{type:'text',text:'LINE'},...body.system];
        yield {type:'ccgateway_request',body}}`,
    'chunk-7y2kvacy.js': `export const oJe=${JSON.stringify(vocabulary.billingHeader)};`,
    'chunk-jkcb7qdd.js': `export const KF=${JSON.stringify(vocabulary.reminder[0])},lKe=${JSON.stringify(vocabulary.reminder[1])};`,
    'chunk-eanw7pgv.js': `export const m4t=()=>[{name:'Agent'},{name:'Bash'},{name:'Read'}];`,
    'chunk-t61vswm2.js': `export const t1n=text=>text==='LINE';`,
    'chunk-7p6jp6kj.js': 'export const Al=()=>({});', 'chunk-72vwyp9d.js': 'export const getRootSession=()=>({});export const entrypoints=[];export const setEntrypointOnRequests=e=>entrypoints.push(e);', 'chunk-4qs43hr1.js': 'export const mBr=()=>true;',
  })) await fs.writeFile(path.join(dir, name), source);
  return { dir, adapter: await import(pathToFileURL(path.join(dir, 'ccgateway-request-build.js'))), native: await import(pathToFileURL(path.join(dir, 'chunk-rncrmfyt.js'))), session: await import(pathToFileURL(path.join(dir, 'chunk-72vwyp9d.js'))) };
}
const injectAll = { contract_version: 2, build_injection: { system_prompt: true, attachments: { environment: true, date: true }, tools: { Read: true, Bash: true } } };
const client = (system, policy = injectAll) => ({ model: 'm', systemPrompt: system, messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'again' }],
  tools: [{ name: 'lookup', inputSchema: { type: 'object' } }], parameters: {}, requestPolicy: policy });

const signal = () => new AbortController().signal;
const probeOf = f => f.native.calls.find(c => c.options.ccgatewayNativeProbe);
const mainOf = f => f.native.calls.find(c => !c.options.ccgatewayNativeProbe);

test('a request without a billing header gets the probe\'s prompt, tools and attachments where CC puts them', async () => {
  const mark = 'CCGATEWAY_FIRST_PROMPT_7d3c1a';
  const f = await fixture({ system: [{ type: 'text', text: 'STATIC', cache_control: { type: 'ephemeral', ttl: '1h', scope: 'global' } }, { type: 'text', text: 'DYNAMIC', cache_control: { type: 'ephemeral', ttl: '1h' } }],
    tools: [{ name: 'Bash' }, { name: 'Read' }], betas: ['prompt-caching-scope-2026-01-05'],
    messages: [{ role: 'user', content: [{ type: 'text', text: '<system-reminder>\nENV\n</system-reminder>' }, { type: 'text', text: mark }] }, { role: 'system', content: 'DATE' }] });
  try {
    const out = await f.adapter.buildRequest(client([{ type: 'text', text: 'client system', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'more' }]), {}, signal());
    const probe = probeOf(f);
    // CC's tools in CC's order, the prompt for every tool with the client's
    // system as the appended prompt, the attachments, and CC's cache markers.
    assert.deepEqual(probe.tools.map(t => t.name), ['Bash', 'Read']);
    assert.deepEqual(probe.systemPrompt, ['PROMPT for Bash,Read,lookup', 'APPEND client system\n\nmore']);
    assert.deepEqual(probe.messages.filter(r => r.type === 'attachment').map(r => r.attachment.type), ['environment', 'date']);
    assert.equal(probe.options.enablePromptCaching, undefined);
    // The client's system is in CC's prompt, so the system is the probe's
    // blocks (the billing header and identity line are added later).
    assert.deepEqual(out.body.system, [{ type: 'text', text: 'STATIC', cache_control: { type: 'ephemeral', ttl: '1h', scope: 'global' } }, { type: 'text', text: 'DYNAMIC', cache_control: { type: 'ephemeral', ttl: '1h' } }]);
    assert.deepEqual(out.body.tools.map(t => t.name), ['Bash', 'Read', 'lookup']);
    assert.deepEqual(out.body.messages, [
      { role: 'user', content: [{ type: 'text', text: '<system-reminder>\nENV\n</system-reminder>' }, { type: 'text', text: 'hi' }] },
      { role: 'system', content: 'DATE' }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'again' }]);
    // The betas CC's markers need come with them.
    assert.match(out.headers['anthropic-beta'], /prompt-caching-scope-2026-01-05/);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('a layer the request already carries is not added again', async () => {
  const f = await fixture({ system: [], tools: [{ name: 'Bash' }], messages: [{ role: 'user', content: 'CCGATEWAY_FIRST_PROMPT_7d3c1a' }] });
  try {
    const environment = layers.attachments.environment[0] + ' \n - Primary working directory: /w';
    const request = client([{ type: 'text', text: 'LINE' }, { type: 'text', text: 'mine\n' + layers.systemPrompt }]);
    request.tools.push({ name: 'Read', inputSchema: { type: 'object' } });
    request.messages.splice(1, 0, { role: 'system', content: environment });
    await f.adapter.buildRequest(request, {}, signal());
    const probe = probeOf(f);
    // CC's prompt is there already; so are the environment and a client Read.
    assert.deepEqual(probe.systemPrompt, []);
    assert.deepEqual(probe.tools.map(t => t.name), ['Bash']);
    assert.deepEqual(probe.messages.filter(r => r.type === 'attachment').map(r => r.attachment.type), ['date']);
    // An attachment's opening inside a prompt is the client's text, not a carrier.
    const prompt = client('s', { contract_version: 2, build_injection: { attachments: { date: true } } });
    prompt.messages[0].content = layers.attachments.date[0] + '2026-10-23.';
    await f.adapter.buildRequest(prompt, {}, signal());
    assert.deepEqual(f.native.calls.filter(c => c.options.ccgatewayNativeProbe).at(-1).messages.filter(r => r.type === 'attachment').map(r => r.attachment.type), ['date']);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('an identity line in the client system stays in front of CC\'s prompt', async () => {
  const f = await fixture({ system: [{ type: 'text', text: 'STATIC' }, { type: 'text', text: 'DYNAMIC' }], tools: [], messages: [{ role: 'user', content: 'CCGATEWAY_FIRST_PROMPT_7d3c1a' }] });
  try {
    const out = await f.adapter.buildRequest(client([{ type: 'text', text: 'LINE' }, { type: 'text', text: 'own' }], { contract_version: 2, build_injection: { system_prompt: true } }), {}, signal());
    assert.deepEqual(probeOf(f).systemPrompt, ['PROMPT for lookup', 'APPEND own']);
    assert.deepEqual(out.body.system.map(b => b.text), ['LINE', 'STATIC', 'DYNAMIC']);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

// Upstream takes four cache breakpoints; CC's markers on the injected prompt
// give way, the dynamic block's first.
test('CC\'s cache markers give way when the request would carry more than four', async () => {
  const f = await fixture({ system: [{ type: 'text', text: 'STATIC', cache_control: { type: 'ephemeral', scope: 'global' } }, { type: 'text', text: 'DYNAMIC', cache_control: { type: 'ephemeral' } }],
    tools: [], messages: [{ role: 'user', content: 'CCGATEWAY_FIRST_PROMPT_7d3c1a' }] });
  try {
    const marked = text => ({ type: 'text', text, cache_control: { type: 'ephemeral' } });
    const request = client('s', { contract_version: 2, build_injection: { system_prompt: true } });
    request.messages = [{ role: 'user', content: [marked('a'), marked('b')] }, { role: 'assistant', content: 'ok' }, { role: 'user', content: [marked('c')] }];
    let out = await f.adapter.buildRequest(request, {}, signal());
    assert.deepEqual(out.body.system.map(b => b.cache_control !== undefined), [true, false]);
    request.messages[0].content.push(marked('d'));
    out = await f.adapter.buildRequest(request, {}, signal());
    assert.deepEqual(out.body.system.map(b => b.cache_control !== undefined), [false, false]);
    // Only CC's prompt blocks give way, found by position: the client's own
    // identity line keeps its marker (here the client's five markers exceed
    // the limit on their own, as the client sent them).
    request.systemPrompt = [{ type: 'text', text: 'LINE', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'own' }];
    out = await f.adapter.buildRequest(request, {}, signal());
    assert.deepEqual(out.body.system.map(b => [b.text, b.cache_control !== undefined]), [['LINE', true], ['STATIC', false], ['DYNAMIC', false]]);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

// The main thread's records name its prompt and turn, which CC's header
// (PAs) writes as cc_prompt_id, cc_turn_origin, cc_prompt_index and cc_turn_index.
test('the client\'s last prompt carries the main thread\'s turn', async () => {
  const f = await fixture({ system: [], tools: [], messages: [] });
  try {
    await f.adapter.buildRequest(client('s', { contract_version: 2 }), {}, signal());
    // Each prompt gets CC's own turn (ccgatewayMarkTurns, stubbed here).
    const prompts = mainOf(f).messages.filter(r => r.type === 'user');
    assert.deepEqual(prompts.map(r => [r.turnOrigin, r.turnPosition]), [['sdk', { promptIndex: 0, turnIndex: 1 }], ['sdk', { promptIndex: 0, turnIndex: 2 }]]);
    // The terminal entrypoint is a human typing.
    f.native.calls.length = 0;
    await f.adapter.buildRequest(client('s', { contract_version: 2, build_billing_entrypoint: 'cli' }), {}, signal());
    assert.equal(mainOf(f).messages.filter(r => r.type === 'user').at(-1).turnOrigin, 'human');
    f.native.calls.length = 0;
    await f.adapter.buildRequest(client('s', { contract_version: 2 }), {}, signal(), () => ({ requestClass: 'main', promptId: 'p-1', querySource: 'sdk' }));
    assert.equal(mainOf(f).messages.filter(r => r.type === 'user').at(-1).promptId, 'p-1');
    f.native.calls.length = 0;
    await f.adapter.buildRequest(client('s', { contract_version: 2 }), {}, signal(), () => ({ requestClass: 'subagent', promptId: 'p-1', querySource: 'agent:custom' }));
    assert(mainOf(f).messages.every(r => r.turnOrigin === undefined && r.promptId === undefined), 'a subagent has no turn');
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

// CC's request entrypoint (setEntrypointOnRequests) is set before the native
// build, so the native header (PAs) and the User-Agent (dN) both carry the
// entrypoint the request's header will have.
test('the request entrypoint is set natively before the build', async () => {
  const f = await fixture({ system: [], tools: [], messages: [] });
  try {
    const own = [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=2.1.310.b17; cc_entrypoint=claude-desktop;' }];
    await f.adapter.buildRequest(client('s', { contract_version: 2 }), {}, signal());
    await f.adapter.buildRequest(client('s', { contract_version: 2, build_billing_entrypoint: 'cli' }), {}, signal());
    await f.adapter.buildRequest(client(own, { contract_version: 2, build_billing_entrypoint: 'cli' }), {}, signal());
    assert.deepEqual(f.session.entrypoints, ['sdk-cli', 'cli', 'claude-desktop']);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('a request with a billing header, or a policy adding nothing, gets no layers', async () => {
  const f = await fixture({ system: [], tools: [], messages: [] });
  try {
    const header = vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=cli;';
    let out = await f.adapter.buildRequest(client([{ type: 'text', text: header }, { type: 'text', text: 'client system' }]), {}, signal());
    assert.deepEqual(out.body.tools.map(t => t.name), ['lookup']);
    assert.equal(out.body.messages.length, 3);
    out = await f.adapter.buildRequest(client('client system', { contract_version: 2, build_injection: { system_prompt: false, tools: { Read: false } } }), {}, signal());
    assert.equal(out.body.messages[0].content, 'hi');
    assert.equal(f.native.calls.filter(c => c.options.ccgatewayNativeProbe).length, 0);
    await assert.rejects(f.adapter.buildRequest(client('s', { contract_version: 2, build_injection: { tools: { Glob: true } } }), {}, signal()), /Claude Code tool Glob is not available; this CLI has Agent, Bash, Read/);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

// The identity line adapts to the entrypoint (2026-10-23): the appended line
// only when the client had a system to append to CC's prompt, and none for a
// request that is Claude Code's own (its side requests have no line).
test('the identity line follows the request', async () => {
  const f = await fixture({ system: [{ type: 'text', text: 'STATIC' }, { type: 'text', text: 'DYNAMIC' }], tools: [], messages: [{ role: 'user', content: 'CCGATEWAY_FIRST_PROMPT_7d3c1a' }] });
  try {
    const prompt = { contract_version: 2, build_injection: { system_prompt: true } };
    let out = await f.adapter.buildRequest(client([{ type: 'text', text: 'own' }], prompt), {}, signal());
    assert.equal(out.identityLine.line, 'official_cli_sdk');
    out = await f.adapter.buildRequest({ ...client(undefined, prompt), systemPrompt: undefined }, {}, signal());
    assert.equal(out.identityLine.line, 'agent_sdk', 'nothing appended');
    out = await f.adapter.buildRequest(client('own', { contract_version: 2 }), {}, signal());
    assert.equal(out.identityLine.line, 'agent_sdk');
    const header = vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=claude-desktop;';
    for (const system of [[{ type: 'text', text: header }, { type: 'text', text: 'side request' }], [{ type: 'text', text: 'p' }, { type: 'text', text: header }]]) {
      out = await f.adapter.buildRequest(client(system, prompt), {}, signal());
      assert.equal(out.identityLine.line, 'none', 'Claude Code\'s own request keeps its system');
    }
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

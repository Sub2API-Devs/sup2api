// The first-party shape (2026-11-03): an official Claude Code client
// connected through a custom ANTHROPIC_BASE_URL sends its third-party shape;
// build converts it to what the same client sends to api.anthropic.com, and
// fixes the inconsistencies of its own output (agent type, betas, body
// order) for every request. The native pieces are stubbed here with their
// native behavior; test/native/<version>/ and the e2e kit run the real ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContentPolicy } from '../content-policy.js';
import { nativeOrder, nativeBodyOrder } from '../request-parameters.js';
import { resolveAgentContext } from '../request-agent.js';
import { vocabulary, layers } from './vocabulary.mjs';
import { installSupport, linkNatives } from './support.mjs';

const prefix = vocabulary.billingHeader;
const { thirdPartyBilling, completeBillingHeader } = createContentPolicy(vocabulary);
const block = text => ({ type: 'text', text });
const P = 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d', Q = '0f4b6d43-5c8e-4b51-9e0a-3a1e8f0c2d11';

test('the third-party header is recognized only alone, readable and from a first-party-capable version', () => {
  const short = prefix + ' cc_version=2.1.316.057; cc_entrypoint=sdk-cli;';
  assert.deepEqual(thirdPartyBilling([block(short), block('line')]), { cc_version: '2.1.316.057', cc_entrypoint: 'sdk-cli' });
  assert.deepEqual(thirdPartyBilling([block(prefix + ' cc_version=2.1.316.18e; cc_entrypoint=sdk-cli; cc_is_subagent=true;')]), { cc_version: '2.1.316.18e', cc_entrypoint: 'sdk-cli', cc_is_subagent: 'true' });
  assert.deepEqual(thirdPartyBilling([block(prefix + ' cc_version=2.1.304.0cd; cc_entrypoint=cli; cc_workload=cron;')]), { cc_version: '2.1.304.0cd', cc_entrypoint: 'cli', cc_workload: 'cron' });
  assert.deepEqual(thirdPartyBilling([block(prefix + ' cc_version=2.2.0.abc; cc_entrypoint=cli;')]).cc_version, '2.2.0.abc');
  for (const system of [
    [block(prefix + ' cc_version=2.1.316.057; cc_entrypoint=sdk-cli; cch=664dc; cc_prompt_id=' + P + ';')], // first-party already
    [block(short + '\nmore text')], [block('lead\n' + short)], [block(prefix + ' cc_version=2.1.303.057; cc_entrypoint=sdk-cli;')],
    [block(prefix + ' cc_version=2.0.999.057; cc_entrypoint=sdk-cli;')], [block(prefix + ' cc_version=2.1.316; cc_entrypoint=sdk-cli;')],
    [block(prefix + ' cc_version=2.1.316.057;')], [block(prefix + ' cc_version=2.1.316.057; cc_entrypoint=cli; cc_is_subagent=false;')],
    [block('plain system')], 'string system', undefined,
  ]) assert.equal(thirdPartyBilling(system), null, JSON.stringify(system));
});

test('the first-party header is the native line with the client\'s own values', () => {
  const native = (fields) => prefix + fields.map(([k, v]) => ` ${k}=${v};`).join('');
  const line = native([['cc_version', '2.1.316.fff'], ['cc_entrypoint', 'sdk-cli'], ['cch', '00000'], ['cc_prompt_id', P], ['cc_turn_origin', 'sdk'], ['cc_prompt_index', '0'], ['cc_turn_index', '1']]);
  const client = { cc_version: '2.1.316.057', cc_entrypoint: 'sdk-cli' };
  assert.equal(completeBillingHeader(line, client), prefix + ` cc_version=2.1.316.057; cc_entrypoint=sdk-cli; cch=00000; cc_prompt_id=${P}; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;`);
  // The Worker may own cc_version: the native value stays.
  assert.equal(completeBillingHeader(line, client, { build_billing_sources: { cc_version: 'worker' } }), line);
  // cc_workload is the client's, in the native place after cch.
  assert.equal(completeBillingHeader(line, { ...client, cc_workload: 'cron' }), prefix + ` cc_version=2.1.316.057; cc_entrypoint=sdk-cli; cch=00000; cc_workload=cron; cc_prompt_id=${P}; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;`);
  const withWorkload = native([['cc_version', '2.1.316.fff'], ['cc_entrypoint', 'sdk-cli'], ['cch', '00000'], ['cc_workload', 'mine'], ['cc_is_subagent', 'true']]);
  assert.equal(completeBillingHeader(withWorkload, { ...client, cc_is_subagent: 'true' }), prefix + ' cc_version=2.1.316.057; cc_entrypoint=sdk-cli; cch=00000; cc_is_subagent=true;');
  assert.equal(completeBillingHeader(withWorkload, { ...client, cc_is_subagent: 'true', cc_workload: 'cron' }), prefix + ' cc_version=2.1.316.057; cc_entrypoint=sdk-cli; cch=00000; cc_workload=cron; cc_is_subagent=true;');
  // A native line that disagrees with the client, or is not first-party, is not used.
  assert.equal(completeBillingHeader(line, { ...client, cc_entrypoint: 'cli' }), null);
  assert.equal(completeBillingHeader(line, { ...client, cc_is_subagent: 'true' }), null);
  assert.equal(completeBillingHeader(native([['cc_version', '2.1.316.fff'], ['cc_entrypoint', 'sdk-cli']]), client), null);
  assert.equal(completeBillingHeader(line.replace('; cch', ';  cch'), client), null);
  assert.equal(completeBillingHeader(undefined, client), null);
  // The Worker owning the entrypoint lets the native one stand.
  assert.equal(completeBillingHeader(line, { ...client, cc_entrypoint: 'cli' }, { build_billing_sources: { cc_entrypoint: 'worker' } }), prefix + ` cc_version=2.1.316.057; cc_entrypoint=sdk-cli; cch=00000; cc_prompt_id=${P}; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;`);
});

test('the body goes in the native member order; members CC never writes keep theirs, after', () => {
  const body = { model: 'm', messages: [], system: [], tools: [], metadata: {}, max_tokens: 1, thinking: {}, context_management: {}, output_config: { effort: 'high' }, x_future: 1, safeguards: [{ type: 's' }], temperature: 'raw', diagnostics: { previous_message_id: null } };
  assert.deepEqual(Object.keys(nativeOrder(body)), ['model', 'messages', 'system', 'tools', 'metadata', 'max_tokens', 'thinking', 'temperature', 'context_management', 'safeguards', 'output_config', 'diagnostics', 'x_future']);
  assert.deepEqual(nativeOrder(body), body);
  assert.equal(nativeBodyOrder.at(-1), 'diagnostics');
});

// CC 2.1.316's query source naming (nue).
const querySourceFor = (type, builtIn) => builtIn ? (type ? `agent:builtin:${type}` : 'agent:default') : (type ? `agent:custom:${type}` : 'agent:custom');
const resolve = (client, billing, extra = {}) => resolveAgentContext({ map: true, key: 'ab'.repeat(32), client }, { billing, prompt: 'task', querySourceFor, loopHeaders: layers.loopHeaders, builtInAgents: ['general-purpose', 'Explore'], ...extra });
const subHeader = { cc_version: '2.1.316.18e', cc_entrypoint: 'sdk-cli', cc_is_subagent: 'true' };

test('a subagent of no known type names none; a built-in type read off its spawn is used', () => {
  // The client sent no type (a third-party client sends none): CC is told
  // agent:default for the headers, which writes the class and no type.
  const unknown = resolve({ agent_id: 'a1' }, subHeader);
  assert.equal(unknown.querySource, 'agent:custom');
  assert.equal(unknown.clientSource, 'agent:default');
  assert.equal(unknown.promptId, undefined);
  // The client's own type wins, custom included.
  assert.equal(resolve({ agent_id: 'a1', agent_type: 'general-purpose' }, subHeader).clientSource, undefined);
  assert.equal(resolve({ agent_id: 'a1', agent_type: 'custom' }, subHeader, { shape: { spawn: { agent_type: 'Explore' } } }).querySource, 'agent:custom');
  // The spawn: the parent's prompt ID and a built-in type.
  const spawned = resolve({ agent_id: 'a1' }, subHeader, { shape: { session: 's', spawn: { prompt_id: P, agent_type: 'general-purpose' } } });
  assert.equal(spawned.querySource, 'agent:builtin:general-purpose');
  assert.equal(spawned.clientSource, undefined);
  assert.equal(spawned.agentType, 'general-purpose');
  assert.equal(spawned.promptId, P, 'already the upstream value: not mapped again');
  assert.equal(spawned.agentContext.parentPromptId, P);
  assert.equal(spawned.shapePrompt, true);
  // A type that is not CC's own is not claimed.
  const custom = resolve({ agent_id: 'a1' }, subHeader, { shape: { spawn: { prompt_id: P, agent_type: 'my-reviewer' } } });
  assert.equal(custom.clientSource, 'agent:default');
  assert.equal(custom.agentType, undefined);
  assert.equal(custom.promptId, P);
  // The thread's own memory goes before the spawn, and only for its thread.
  const later = resolve({ agent_id: 'a1' }, subHeader, { shape: { previous: { thread: 'a1', prompt_id: Q, agent_type: 'Explore' }, spawn: { prompt_id: P } } });
  assert.equal(later.promptId, Q);
  assert.equal(later.agentType, 'Explore');
  assert.equal(resolve({ agent_id: 'a1' }, subHeader, { shape: { previous: { thread: 'a2', prompt_id: Q } } }).promptId, undefined);
  // Without the conversion nothing of the memory is used.
  assert.equal(resolve({ agent_id: 'a1' }, subHeader, {}).promptId, undefined);
});

test('a converted main thread derives its prompt ID per session, turn and prompt', () => {
  const main = { cc_version: '2.1.316.057', cc_entrypoint: 'sdk-cli' };
  const a = resolve({}, main, { shape: { session: 's1' } }), b = resolve({}, main, { shape: { session: 's2' } });
  assert.equal(typeof a.derivePromptId, 'function');
  const id = a.derivePromptId(1, 'h1');
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(a.derivePromptId(1, 'h1'), id, 'a turn\'s requests share it');
  assert.notEqual(a.derivePromptId(2, 'h1'), id);
  assert.notEqual(a.derivePromptId(1, 'h2'), id);
  assert.notEqual(b.derivePromptId(1, 'h1'), id);
  // A client prompt ID (gateway hint headers) is the client's, mapped; no
  // conversion, no derivation.
  assert.equal(resolve({ prompt_id: P }, main, { shape: { session: 's1' } }).derivePromptId, undefined);
  assert.equal(resolve({}, main).derivePromptId, undefined);
});

// A stand-in for CC's builder, header and prompt natives: the builder records
// its input and writes the native header the way Dns does (cch for the
// first-party shape; cc_is_subagent, cc_prev_req from the last answered
// record, cc_prompt_id from the last prompt or the subagent's parent, the
// turn of the last prompt); the prompt is STATIC|DYNAMIC around the boundary,
// and the system blocks are s2o's with vX markers.
async function fixture({ staticSections = ['STATIC ONE', 'STATIC TWO'], entrypoint = 'sdk-cli' } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-first-party-'));
  await installSupport(dir, ['request-build', 'first-party-shape', 'request-identity', 'request-session', 'content-policy']);
  const files = {
    'package.json': '{"type":"module"}',
    'stub-core.js': `export const calls=[];
      export const ccgatewayCompactionOpenings=()=>['CRITICAL COMPACTION OPENING']; export const ccgatewayDeferredToolsOpening=()=>'DEFERRED TOOLS:'; export const cacheDiagnosisBeta={name:'cache_diagnosis',header:'cache-diagnosis-2026-04-07'};
      export const ccgatewaySystemRecord=content=>({type:'api_system',message:{role:'system',content},uuid:'f',timestamp:'f'});
      export const renderAttachment=()=>({isKnownType:true,messages:[]}); export const ccgatewayEnvironment=()=>{throw Error('unexpected')};
      export const ccgatewayEnvironmentVocabulary=()=>(${JSON.stringify(vocabulary)}); export const ccgatewayLayerVocabulary=()=>(${JSON.stringify(layers)});
      export const ccgatewayDefaultPrompt=async()=>[]; export const ccgatewayPermissionContext=()=>({}); export const ccgatewayBuiltInAgents=()=>[];
      export const ccgatewayLayerAttachments=async()=>[];
      export const ccgatewayMarkTurns=(records,interactive)=>{let n=0,last;for(const r of records){if(r.type!=='user'||(Array.isArray(r.message.content)&&r.message.content.some(b=>b.type==='tool_result')))continue;n++;r.turnOrigin=interactive?'human':'sdk';r.turnPosition={promptIndex:interactive?n:0,turnIndex:n};last=r}return last};
      const BOUNDARY='__BOUNDARY__';
      export const ccgatewayPromptSections=async(tools,model)=>{calls.push({sections:{tools:tools.map(t=>t.name),model}});return {static:[...${JSON.stringify(staticSections)},...tools.some(t=>t.name==='TaskCreate')?['USE TASKCREATE']:[]],dynamic:['D'],boundary:BOUNDARY}};
      const vX=({scope,ttl}={})=>({type:'ephemeral',...ttl&&{ttl},...scope==='global'&&{scope}});
      export const ccgatewayFirstPartySystem=(texts,caching,cacheTtl)=>{const at=texts.indexOf(BOUNDARY);const [h,l]=texts;const st=texts.slice(2,at).join('\\n\\n'),dy=texts.slice(at+1).join('\\n\\n');
        return [{type:'text',text:h},{type:'text',text:l},{type:'text',text:st,...caching&&{cache_control:vX({scope:'global',ttl:cacheTtl})}},{type:'text',text:dy,...caching&&{cache_control:vX({ttl:cacheTtl})}}]};
      export async function* queryModel(input){calls.push(input);const o=input.options,records=input.messages;
        const lastAnswer=records.findLast(r=>r.type==='assistant');const prompt=records.findLast(r=>r.type==='user'&&r.turnOrigin);
        const sub=o.agentContext?.agentType==='subagent';const pid=prompt?.promptId??(sub?o.agentContext.parentPromptId:undefined);
        const line=${JSON.stringify(prefix)}+' cc_version=2.1.316.fff; cc_entrypoint=${entrypoint}; cch=00000;'+(sub?' cc_is_subagent=true;':'')+(lastAnswer?.requestId?' cc_prev_req='+lastAnswer.requestId+';':'')+(pid?' cc_prompt_id='+pid+';':'')+(!sub&&prompt?' cc_turn_origin='+prompt.turnOrigin+'; cc_prompt_index='+prompt.turnPosition.promptIndex+'; cc_turn_index='+prompt.turnPosition.turnIndex+';':'');
        o.ccgatewayCaptureBilling?.(line);o.ccgatewayCapturePrefix?.(null);
        yield {type:'ccgateway_request',body:{model:'m',messages:o.ccgatewayWireMessages,system:o.ccgatewaySystemBlocks,...o.ccgatewayWireTools===undefined?{}:{tools:o.ccgatewayWireTools},metadata:{},max_tokens:1,output_config:{effort:'high'},diagnostics:{previous_message_id:'msg_made_up'},betas:['prompt-caching-scope-2026-01-05','cache-diagnosis-2026-04-07']}}}`,
    'stub-billing.js': `export const billingHeaderPrefix=${JSON.stringify(prefix)}; export const isBillingHeader=b=>typeof b?.text==='string'&&b.text.startsWith(billingHeaderPrefix);`,
    'stub-reminder.js': `export const reminderOpen=${JSON.stringify(vocabulary.reminder[0])},reminderClose=${JSON.stringify(vocabulary.reminder[1])};`,
    'stub-tools.js': 'export const toolPool=()=>[];',
    'stub-identity.js': "export const isIdentityLine=text=>text==='LINE'; export const identityLine=()=>'LINE';",
    'stub-context.js': 'export const mainAgentContext=()=>({agentType:"main"});', 'stub-session.js': 'export const getRootSession=()=>({});export const setEntrypointOnRequests=()=>{};',
  };
  for (const [name, source] of Object.entries(files)) await fs.writeFile(path.join(dir, name), source);
  await linkNatives(dir);
  const adapter = await import(pathToFileURL(path.join(dir, 'ccgateway-request-build.js')));
  const agentModule = await import(pathToFileURL(path.join(dir, 'ccgateway-request-agent.js')));
  const native = await import(pathToFileURL(path.join(dir, 'stub-core.js')));
  return { dir, adapter, native, resolver: context => facts => agentModule.resolveAgentContext(context, { ...facts, querySourceFor, loopHeaders: layers.loopHeaders, builtInAgents: ['general-purpose'] }) };
}

const header = (fields = '') => prefix + ' cc_version=2.1.316.057; cc_entrypoint=sdk-cli;' + fields;
const cc1h = { type: 'ephemeral', ttl: '1h' };
const thirdPartySystem = (dynamic = 'DYNAMIC TEXT', fields = '', cache = cc1h) => [block(header(fields)), { ...block('LINE'), ...cache && { cache_control: cache } }, { ...block('STATIC ONE\n\nSTATIC TWO\n\n' + dynamic), ...cache && { cache_control: cache } }];
const request = (system, messages = [{ role: 'user', content: [{ type: 'text', text: 'Reply OK.' }] }]) => ({ model: 'claude-opus-4-8', systemPrompt: system, messages, tools: [{ name: 'Bash', inputSchema: { type: 'object' } }], parameters: {}, requestPolicy: { contract_version: 2 } });
const session = '7e1f5a0c-1b2d-4c3e-8f4a-5b6c7d8e9f00';
const identity = extra => JSON.stringify({ version: 2, mode: 'replace', rewrite: true, session_id: session, ...extra });
const signal = () => new AbortController().signal;
async function withEnv(env, run) {
  const saved = Object.fromEntries(Object.keys(env).map(name => [name, process.env[name]]));
  for (const [name, value] of Object.entries(env)) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  try { return await run(); } finally { for (const [name, value] of Object.entries(saved)) if (value === undefined) delete process.env[name]; else process.env[name] = value; }
}
const firstLine = body => body.system[0].text;

test('a converted main thread: CC\'s header, CC\'s split, its prompt ID, diagnostics and betas', async () => {
  const f = await fixture();
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: {} };
    const out = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem()), {}, signal(), f.resolver(context)));
    const promptId = out.agent.promptId;
    assert.match(promptId, /^[0-9a-f-]{36}$/);
    assert.equal(firstLine(out.body), header(` cch=00000; cc_prompt_id=${promptId}; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;`));
    assert.deepEqual(out.body.system.slice(1), [block('LINE'), { ...block('STATIC ONE\n\nSTATIC TWO'), cache_control: { type: 'ephemeral', ttl: '1h', scope: 'global' } }, { ...block('DYNAMIC TEXT'), cache_control: cc1h }]);
    assert.deepEqual(f.native.calls.find(c => c.sections).sections, { tools: ['Bash'], model: 'claude-opus-4-8' });
    // CC's first request of a thread names no previous answer; the made-up
    // native one never goes out.
    assert.deepEqual(out.body.diagnostics, { previous_message_id: null });
    assert.deepEqual(Object.keys(out.body).slice(-2), ['output_config', 'diagnostics']);
    // The Worker keeps the turn and the prompt ID.
    assert.equal(out.session.thread, 'main');
    assert.equal(out.session.prompt_id, promptId);
    assert.deepEqual(out.session.turn_position, { prompt_index: 0, turn_index: 1 });
    // The same prompt again (a retry, the tool loop) has the same ID.
    const again = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem()), {}, signal(), f.resolver(context)));
    assert.equal(again.agent.promptId, promptId);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

// 2026-11-03 live test (account 82, Sonnet 4.6): the client marks its last
// message for the cache, so the prompt carries the marker on its turn's first
// request and none once a tool result follows it. The turn's requests keep
// one prompt ID (v45 derived another for the continuation), and the
// continuation names the first request's answer.
test('a turn keeps its prompt ID when the cache marker moves off the prompt', async () => {
  const f = await fixture();
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: {} };
    const reminder = { type: 'text', text: '<system-reminder>\nToday\'s date is 2026-11-03.\n</system-reminder>' };
    const prompt = 'Read /w/proj/notes.txt using the Read tool with limit 1, then reply with its first line.';
    const first = [{ role: 'user', content: [reminder, { type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }] }];
    const one = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem(), first), {}, signal(), f.resolver(context)));
    const promptId = one.agent.promptId;
    assert.match(promptId, /^[0-9a-f-]{36}$/);
    const loop = [{ role: 'user', content: [reminder, { type: 'text', text: prompt }] },
      { role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: '/w/proj/notes.txt', limit: 1 } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '1\tfirst line', cache_control: { type: 'ephemeral' } }] }];
    const previous = { thread: 'main', request_id: 'req_one', turn_position: one.session.turn_position, prompt_hash: one.session.prompt_hash, message_id: 'msg_one', prompt_id: one.session.prompt_id };
    const two = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity({ previous }) }, () => f.adapter.buildRequest(request(thirdPartySystem(), loop), {}, signal(), f.resolver(context)));
    assert.equal(two.agent.promptId, promptId);
    assert.equal(firstLine(two.body), header(` cch=00000; cc_prev_req=req_one; cc_prompt_id=${promptId}; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;`));
    assert.deepEqual(two.body.diagnostics, { previous_message_id: 'msg_one' });
    // Without the Worker's memory the same: the ID depends on the prompt's
    // text, not on where the client put its marker.
    const unproven = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem(), loop), {}, signal(), f.resolver(context)));
    assert.equal(unproven.agent.promptId, promptId);
    // A prompt sent as a string is its one text block.
    const plain = [{ role: 'user', content: prompt }];
    const asBlock = [{ role: 'user', content: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }] }];
    const a = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem(), plain), {}, signal(), f.resolver(context)));
    const b = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem(), asBlock), {}, signal(), f.resolver(context)));
    assert.equal(a.agent.promptId, b.agent.promptId);
    // Another prompt is another ID.
    const other = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem(), [{ role: 'user', content: 'Something else.' }]), {}, signal(), f.resolver(context)));
    assert.notEqual(other.agent.promptId, a.agent.promptId);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('a converted later turn continues what the Worker proved, and nothing it did not', async () => {
  const f = await fixture();
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: {} };
    const messages = [{ role: 'user', content: 'Reply OK.' }, { role: 'assistant', content: 'OK' }, { role: 'user', content: 'Again.' }];
    const previous = { thread: 'main', request_id: 'req_one', turn_position: { prompt_index: 0, turn_index: 1 }, prompt_hash: 'a'.repeat(64), message_id: 'msg_one', prompt_id: P };
    const out = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity({ previous }) }, () => f.adapter.buildRequest(request(thirdPartySystem(), messages), {}, signal(), f.resolver(context)));
    assert.equal(firstLine(out.body), header(` cch=00000; cc_prev_req=req_one; cc_prompt_id=${out.agent.promptId}; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=2;`));
    assert.notEqual(out.agent.promptId, P, 'a new prompt, a new ID');
    assert.deepEqual(out.body.diagnostics, { previous_message_id: 'msg_one' });
    // Without the Worker's proof: no previous request or answer, the turn by
    // the history, and no diagnostics.
    const unproven = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem(), messages), {}, signal(), f.resolver(context)));
    assert.doesNotMatch(firstLine(unproven.body), /cc_prev_req/);
    assert.match(firstLine(unproven.body), /cc_turn_index=2;$/);
    assert.equal(unproven.body.diagnostics, undefined);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('a converted subagent takes its spawn\'s prompt ID and type; without the switch nothing is converted', async () => {
  const f = await fixture();
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: { agent_id: 'a1' } };
    const sub = thirdPartySystem('x', ' cc_is_subagent=true;').slice(0, 1).concat([block('subagent prompt')]);
    const out = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity({ spawn: { prompt_id: P, agent_type: 'general-purpose' } }) }, () => f.adapter.buildRequest(request(sub), {}, signal(), f.resolver(context)));
    assert.equal(firstLine(out.body), header(` cch=00000; cc_is_subagent=true; cc_prompt_id=${P};`));
    assert.equal(out.agent.agentType, 'general-purpose');
    assert.deepEqual(out.body.system.slice(1), [block('subagent prompt')], 'not CC\'s main prompt: not split');
    assert.deepEqual(out.body.diagnostics, { previous_message_id: null });
    assert.deepEqual(out.session, { thread: 'a1', prompt_id: P, agent_type: 'general-purpose' });
    // Switch off: the client's header and blocks as they came, no
    // diagnostics, no memory kept.
    const off = await withEnv({ CCG_FIRST_PARTY_SHAPE: undefined, CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem()), {}, signal(), f.resolver({ map: true, key: 'ab'.repeat(32), client: {} })));
    assert.deepEqual(off.body.system, thirdPartySystem());
    assert.equal(off.body.diagnostics, undefined);
    assert.equal(off.session, undefined);
    assert.equal(off.agent.promptId, undefined);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('a prompt that is not CC\'s static sections is not split; a header that cannot be completed is not converted at all', async () => {
  let f = await fixture({ staticSections: ['OTHER STATIC'] });
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: {} };
    const out = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem()), {}, signal(), f.resolver(context)));
    assert.match(firstLine(out.body), /cch=00000;/);
    assert.deepEqual(out.body.system.slice(1), thirdPartySystem().slice(1));
    // Markers that are not CC's leave the prompt whole too.
    const marked = thirdPartySystem(); marked[2].cache_control = { type: 'ephemeral', scope: 'global' };
    const kept = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(marked), {}, signal(), f.resolver(context)));
    assert.equal(kept.body.system.length, 3);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
  f = await fixture({ entrypoint: 'cli' });
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: {} };
    const out = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(thirdPartySystem()), {}, signal(), f.resolver(context)));
    assert.deepEqual(out.body.system, thirdPartySystem());
    assert.equal(out.body.diagnostics, undefined);
    assert.equal(out.session, undefined);
    assert.equal(out.agent.promptId, undefined);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

// The betas a build adds follow its body; the client's own are never touched.
test('added betas agree with the body: global scope, diagnostics, 1-hour markers', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-body-betas-'));
  try {
    await installSupport(dir, ['request-betas']);
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await fs.writeFile(path.join(dir, 'stub-command.js'), 'export const modelBetas=()=>[];export const promptCachingScopeBeta={name:"prompt_caching_scope",header:"scope-beta"},cacheDiagnosisBeta={name:"cache_diagnosis",header:"diag-beta"},extendedCacheTtlBeta={name:"extended_cache_ttl",header:"ttl-beta"};');
    await linkNatives(dir);
    const { bodyBetas } = await import(pathToFileURL(path.join(dir, 'ccgateway-request-betas.js')));
    const added = ['scope-beta', 'effort-beta', 'diag-beta', 'ttl-beta'];
    // A third-party body: no global scope, no diagnostics, 5-minute markers.
    assert.deepEqual(bodyBetas({ system: [block('h'), { ...block('p'), cache_control: { type: 'ephemeral' } }] }, [], added), ['effort-beta']);
    // The first-party shape: all three are used.
    const converted = { system: [block('h'), block('l'), { ...block('s'), cache_control: { type: 'ephemeral', ttl: '1h', scope: 'global' } }], diagnostics: { previous_message_id: null } };
    assert.deepEqual(bodyBetas(converted, [], added), added);
    // One the body uses and nobody sent is added; the client's are left alone.
    assert.deepEqual(bodyBetas(converted, ['diag-beta'], ['effort-beta']), ['effort-beta', 'scope-beta', 'ttl-beta']);
    assert.deepEqual(bodyBetas({ messages: [{ role: 'user', content: [{ ...block('x'), cache_control: { type: 'ephemeral', ttl: '1h' } }] }] }, ['scope-beta'], []), ['ttl-beta']);
    assert.deepEqual(bodyBetas({ tools: [{ name: 't', cache_control: { type: 'ephemeral', ttl: '1h' } }] }, [], ['ttl-beta']), ['ttl-beta']);
    // The first-party shape carries the scope beta on every request (a
    // subagent's prompt has no global block): official 2.1.316 captures.
    assert.deepEqual(bodyBetas({ system: [block('h'), { ...block('agent prompt'), cache_control: { type: 'ephemeral' } }], diagnostics: { previous_message_id: null } }, [], added, { firstParty: true }), ['scope-beta', 'effort-beta', 'diag-beta']);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

// The Worker's first-party shape memory reaches the CLI in its identity
// context (engine session_state.go), checked like the rest of it.
test('the identity context carries the shape memory only in its own form', async () => {
  const { previousSession, spawnContext } = await import('../request-identity.js');
  const read = (extra, reader) => withEnv({ CCG_REQUEST_IDENTITY: identity(extra) }, async () => reader());
  const main = { thread: 'main', request_id: 'req_1', turn_position: { prompt_index: 0, turn_index: 1 }, prompt_hash: 'a'.repeat(64), message_id: 'msg_01AbC', prompt_id: P };
  assert.deepEqual(await read({ previous: main }, previousSession), main);
  assert.deepEqual(await read({ previous: { thread: 'a1', request_id: 'req_2', prompt_id: P, agent_type: 'general-purpose' } }, previousSession), { thread: 'a1', request_id: 'req_2', prompt_id: P, agent_type: 'general-purpose' });
  assert.deepEqual(await read({ spawn: { prompt_id: P, agent_type: 'Explore' } }, spawnContext), { prompt_id: P, agent_type: 'Explore' });
  for (const bad of [{ previous: { ...main, message_id: 'msg-bad' } }, { previous: { ...main, prompt_id: 'nope' } }, { previous: { ...main, agent_type: 'general-purpose' } },
    { previous: { ...main, extra: 1 } }, { spawn: { prompt_id: P, message_id: 'msg_1' } }, { spawn: { agent_type: 'bad type' } }, { spawn: [] }]) {
    await assert.rejects(read(bad, previousSession), /Invalid Worker request identity/, JSON.stringify(bad));
  }
});

test('a converted request whose last prompt is CC\'s compaction prompt is the main thread\'s compaction request', async () => {
  const f = await fixture();
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: {} };
    const messages = [{ role: 'user', content: 'Reply OK.' }, { role: 'assistant', content: 'OK' }, { role: 'user', content: 'CRITICAL COMPACTION OPENING and the rest of it' }];
    const previous = { thread: 'main', request_id: 'req_one', turn_position: { prompt_index: 0, turn_index: 1 }, prompt_hash: 'a'.repeat(64), message_id: 'msg_one', prompt_id: P };
    const out = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity({ previous }) }, () => f.adapter.buildRequest(request(thirdPartySystem(), messages), {}, signal(), f.resolver(context)));
    // As CC's compaction request: no prompt or turn, the main thread's last
    // answered request and answer; not kept as the thread's next turn.
    assert.equal(out.agent.requestClass, 'compaction');
    assert.equal(out.agent.querySource, 'compact');
    assert.equal(out.agent.promptId, undefined);
    assert.equal(firstLine(out.body), header(' cch=00000; cc_prev_req=req_one;'));
    assert.deepEqual(out.body.diagnostics, { previous_message_id: 'msg_one' });
    assert.deepEqual(out.session, { thread: 'main' });
    // Unconverted, the same text is an ordinary prompt.
    const off = await withEnv({ CCG_FIRST_PARTY_SHAPE: undefined, CCG_REQUEST_IDENTITY: identity({ previous }) }, () => f.adapter.buildRequest(request(thirdPartySystem(), messages), {}, signal(), f.resolver(context)));
    assert.equal(off.agent.requestClass, 'main');
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('the static sections are rendered with the deferred tools the client reminder names', async () => {
  const f = await fixture();
  try {
    const context = { map: true, key: 'ab'.repeat(32), client: {} };
    const wrap = body => vocabulary.reminder[0] + '\n' + body + '\n' + vocabulary.reminder[1];
    const reminder = { type: 'text', text: wrap('DEFERRED TOOLS:\nTaskCreate\nWebFetch') };
    const messages = [{ role: 'user', content: [reminder, { type: 'text', text: 'Reply OK.' }] }];
    const system = [block(header()), { ...block('LINE'), cache_control: cc1h }, { ...block('STATIC ONE\n\nSTATIC TWO\n\nUSE TASKCREATE\n\nDYNAMIC'), cache_control: cc1h }];
    const out = await withEnv({ CCG_FIRST_PARTY_SHAPE: '1', CCG_REQUEST_IDENTITY: identity() }, () => f.adapter.buildRequest(request(system, messages), {}, signal(), f.resolver(context)));
    assert.equal(out.body.system[2].text, 'STATIC ONE\n\nSTATIC TWO\n\nUSE TASKCREATE');
    assert.equal(out.body.system[3].text, 'DYNAMIC');
    assert.deepEqual(f.native.calls.filter(c => c.sections).map(c => c.sections.tools), [['Bash', 'TaskCreate', 'WebFetch']]);
    // A reminder that is not CC's (other wording, a name that is not one, an
    // assistant's text) adds nothing.
    const { deferredToolNames } = await import(pathToFileURL(path.join(f.dir, 'ccgateway-first-party-shape.js')));
    assert.deepEqual([...deferredToolNames(messages)], ['TaskCreate', 'WebFetch']);
    assert.deepEqual([...deferredToolNames([{ role: 'user', content: wrap('OTHER:\nTaskCreate') }])], []);
    assert.deepEqual([...deferredToolNames([{ role: 'user', content: wrap('DEFERRED TOOLS:\nTask Create') }])], []);
    assert.deepEqual([...deferredToolNames([{ role: 'assistant', content: wrap('DEFERRED TOOLS:\nTaskCreate') }])], []);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

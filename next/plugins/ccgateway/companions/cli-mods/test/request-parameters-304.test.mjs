import test from 'node:test';
import { vocabulary } from './vocabulary.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateBuildParameters, mergeAdditionalParameters, wireToolDefinitions } from '../request-parameters.js';
import { parseRequestJSON } from '../request-options.js';

const validThinking = { type: 'enabled', budget_tokens: 1024 };
test('304 parameter merge preserves caller extensions and native-owned results independently', () => {
  const parameters = {
    max_tokens: 9000, temperature: 0.25, thinking: validThinking,
    tool_choice: { type: 'tool', name: 'lookup' }, metadata: { user_id: 'client' }, betas: ['client-beta'],
    top_p: 0.7, top_k: 17, stop_sequences: ['STOP'], service_tier: 'standard_only',
    context_management: { edits: [{ type: 'clear_tool_uses_20250919', keep: { type: 'tool_uses', value: 2 } }] },
    x_future: { nested: [1, { retain: true }] },
    output_config: { effort: 'max', format: { type: 'json_schema', schema: { type: 'object' } }, x_opaque: { retain: true }, timing: { now: 123 } },
  };
  const built = { model: 'native-model', system: [], messages: [], max_tokens: 4096, tool_choice: { type: 'auto' }, metadata: { user_id: 'native' }, output_config: { effort: 'low' }, betas: ['native-beta'] };
  const original = structuredClone(parameters), nativeOriginal = structuredClone(built);
  const result = mergeAdditionalParameters(built, parameters);
  assert.deepEqual(result, { ...built, top_p: 0.7, top_k: 17, stop_sequences: ['STOP'], service_tier: 'standard_only', context_management: parameters.context_management, x_future: parameters.x_future,
    output_config: { effort: 'low', x_opaque: { retain: true }, timing: { now: 123 } } });
  assert.ok(!Object.hasOwn(result, 'thinking')); assert.ok(!Object.hasOwn(result, 'temperature'));
  assert.ok(!Object.hasOwn(result.output_config, 'format'));
  assert.deepEqual(parameters, original); assert.deepEqual(built, nativeOriginal);
  result.x_future.nested[1].retain = false;
  result.output_config.x_opaque.retain = false;
  result.messages.push({ role: 'user', content: 'later mutation' });
  assert.deepEqual(parameters, original); assert.deepEqual(built, nativeOriginal);
});

test('304 output_config extensions survive even when native drops all managed output fields', () => {
  assert.deepEqual(mergeAdditionalParameters({}, { output_config: { effort: 'high', format: { type: 'json_schema' }, extra: { a: 1 } } }), { output_config: { extra: { a: 1 } } });
  assert.deepEqual(mergeAdditionalParameters({}, { output_config: { effort: 'high' } }), {});
  assert.deepEqual(mergeAdditionalParameters({}, { output_config: {} }), { output_config: {} });
});

test('304 native diagnostics never replace or invent the client value', () => {
  const native = { diagnostics: { previous_message_id: 'msg_8df8efa6-7b32-4c15-955d-2357bb024089' } };
  assert.deepEqual(mergeAdditionalParameters(native, {}), {});
  assert.deepEqual(mergeAdditionalParameters(native, undefined), {});
  assert.deepEqual(mergeAdditionalParameters(native, { diagnostics: { previous_message_id: 'msg_01client' } }), { diagnostics: { previous_message_id: 'msg_01client' } });
  assert.deepEqual(mergeAdditionalParameters(native, { diagnostics: { previous_message_id: null } }), { diagnostics: { previous_message_id: null } });
  assert.deepEqual(mergeAdditionalParameters({}, { diagnostics: {} }), { diagnostics: {} });
});

test('304 extension keys use own properties and cannot mutate object prototypes', () => {
  const params = JSON.parse('{"__proto__":{"polluted":"caller"},"constructor":{"x":1},"output_config":{"__proto__":{"nested":true},"effort":"high"}}');
  const native = { metadata: { user_id: 'native' } }, result = mergeAdditionalParameters(native, params);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.output_config), Object.prototype);
  assert.equal({}.polluted, undefined);
  assert.ok(Object.hasOwn(result, '__proto__')); assert.ok(Object.hasOwn(result.output_config, '__proto__'));
  assert.deepEqual(JSON.parse(JSON.stringify(result)).__proto__, { polluted: 'caller' });
  assert.deepEqual(result.metadata, { user_id: 'native' });
});

test('304 internal controls and component slots cannot be supplied as generation parameters', () => {
  for (const key of ['model','system','messages','tools','stream','systemPrompt','attachments','requestPolicy','runtimeContext','ccgatewayWireTools','ccgatewayBuildOnly','ccgatewayCaptureBilling','ccgatewayUnknownPrivate']) {
    assert.throws(() => validateBuildParameters({ [key]: 'injected' }), e => e.status === 400 && e.field === `parameters.${key}`);
  }
});

test('304 positive-integer and thinking discriminant contracts reject invalid shapes', () => {
  for (const max_tokens of [0,-1,1.5,null,'12',true,Number.MAX_SAFE_INTEGER+1,Infinity,NaN]) {
    assert.throws(() => validateBuildParameters({ max_tokens }), e => e.field === 'parameters.max_tokens');
  }
  for (const thinking of [null,[],false,'enabled',{}, {type:'other'}, {type:'enabled'}, {type:'enabled',budget_tokens:0}, {type:'enabled',budget_tokens:1.5}, {type:'enabled',budget_tokens:'1024'}, {type:'adaptive',budget_tokens:1024}, {type:'disabled',budget_tokens:null}]) {
    assert.throws(() => validateBuildParameters({ thinking }), e => e.status === 400 && e.field.startsWith('parameters.thinking'));
  }
  for (const output_config of [null,[],true,'invalid']) assert.throws(() => validateBuildParameters({ output_config }), /parameters\.output_config/);
  assert.doesNotThrow(() => validateBuildParameters(undefined));
  assert.doesNotThrow(() => validateBuildParameters({ max_tokens: 1, thinking: { type: 'enabled', budget_tokens: 1 } }));
  assert.doesNotThrow(() => validateBuildParameters({ thinking: { type: 'adaptive' } }));
  assert.doesNotThrow(() => validateBuildParameters({ thinking: { type: 'disabled' } }));
});

test('build lexical numbers cannot hide nonintegral values behind JSON rounding; direct is unchanged', () => {
  for (const token of ['1.00000000000000001','9007199254740991.1','1e-324','1.00000000000000001e0']) {
    const raw = `{"model":"fixture","max_tokens":${token}}`;
    assert.throws(() => parseRequestJSON(raw, 'build'), /unsafe JSON number/);
    assert.deepEqual(parseRequestJSON(raw, 'direct'), JSON.parse(raw));
  }
  for (const token of ['1.0','1e3','1.1e1','9007199254740991.0','0e-999999999','0.5','1.25']) {
    const raw = `{"model":"fixture","value":${token}}`;
    assert.deepEqual(parseRequestJSON(raw, 'build'), JSON.parse(raw));
  }
});

test('304 wire tools retain order, missing description, attributes and absent versus empty tools', () => {
  const tools = [{ name: 'before', inputSchema: { type: 'object' }, strict: true, defer_loading: true, x_extra: { retain: true } }, { name: 'web_search', type: 'web_search_20250305', max_uses: 1 }, { name: 'after', inputSchema: { type: 'object' }, cache_control: { type: 'ephemeral' } }];
  const original = structuredClone(tools), wire = wireToolDefinitions(tools);
  assert.deepEqual(wire.map(t => t.name), ['before','web_search','after']);
  assert.ok(!Object.hasOwn(wire[0], 'description')); assert.ok(!Object.hasOwn(wire[0], 'inputSchema'));
  assert.deepEqual(wire[0].input_schema, { type: 'object' }); assert.equal(wire[0].strict, true); assert.equal(wire[0].defer_loading, true);
  assert.deepEqual(wire[1], original[1]);
  wire[0].x_extra.retain = false; assert.deepEqual(tools, original);
  // The client's key order is kept: input_schema is renamed where inputSchema was.
  assert.deepEqual(Object.keys(wireToolDefinitions([{ name: 'n', inputSchema: { type: 'object' }, description: 'd', cache_control: { type: 'ephemeral' } }])[0]), ['name', 'input_schema', 'description', 'cache_control']);
  assert.equal(wireToolDefinitions(undefined), undefined); assert.deepEqual(wireToolDefinitions([]), []);
});

async function adapterFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-304-params-'));
  for (const name of ['request-input','request-options','request-policy','content-policy','request-parameters']) await fs.copyFile(new URL(`../${name}.js`, import.meta.url), path.join(dir, `ccgateway-${name}.js`));
  await fs.copyFile(new URL('../request-build-2.1.304.js', import.meta.url), path.join(dir, 'ccgateway-request-build.js'));
  for (const [name, source] of Object.entries({
    'package.json':'{"type":"module"}',
    'chunk-kasbfbhj.js': `export let calls=0,captured; export const MDe=()=>{throw Error('unexpected attachment')}; export const ccgatewayEnvironment=()=>{throw Error('unexpected facts')}; export const ccgatewayEnvironmentVocabulary=()=>(${JSON.stringify(vocabulary)}); export const ccgatewayDefaultPrompt=()=>{throw Error('unexpected prompt')}; export const ccgatewayLayerAttachments=()=>{throw Error('unexpected attachments')}; export async function* Kvt(input){calls++;captured=input;yield {type:'ccgateway_request',body:{model:'native-model',system:input.options.ccgatewaySystemBlocks,messages:input.options.ccgatewayWireMessages,...input.options.ccgatewayWireTools===undefined?{}:{tools:input.options.ccgatewayWireTools},max_tokens:4096,tool_choice:{type:'auto'},metadata:{user_id:'native'},output_config:{effort:'low'},betas:['native-beta']}}}`,
    'chunk-7y2kvacy.js':`export const oJe=${JSON.stringify(vocabulary.billingHeader)};`,
    'chunk-jkcb7qdd.js':`export const KF=${JSON.stringify(vocabulary.reminder[0])},lKe=${JSON.stringify(vocabulary.reminder[1])};`,
    'chunk-eanw7pgv.js':'export const e$=()=>[];', 'chunk-t61vswm2.js':'export const t1n=()=>false;',
    'chunk-0ycjphb5.js':'export const El=()=>({});', 'chunk-q61sszgr.js':'export const getRootSession=()=>({});', 'chunk-6dwnw6av.js':'export const YEr=()=>true;',
    'ccgateway-native-tools.js':'const registry=new Map();export const registerNative=(_session,_owner,tool)=>registry.set(tool.name,{});export const findNative=(_session,name)=>registry.get(name);',
  })) await fs.writeFile(path.join(dir,name),source);
  return { dir, adapter: await import(pathToFileURL(path.join(dir,'ccgateway-request-build.js'))), native: await import(pathToFileURL(path.join(dir,'chunk-kasbfbhj.js'))) };
}

test('304 adapter transmits extensions and complete wire tools without undoing native normalization', async () => {
  const fixture=await adapterFixture();
  try {
    const components={model:'client-model',messages:[{role:'user',content:'keep'}],tools:[{name:'before',inputSchema:{type:'object'}},{type:'web_search_20250305',name:'web_search'},{name:'after',inputSchema:{type:'object'}}],parameters:{max_tokens:8192,thinking:validThinking,temperature:0.25,metadata:{user_id:'client'},tool_choice:{type:'tool',name:'before'},top_p:0.7,stop_sequences:['STOP'],x_future:{a:1},output_config:{effort:'high',x_extra:{keep:true}}},stream:false};
    const copy=structuredClone(components);
    const result=await fixture.adapter.buildRequest(components,{},new AbortController().signal);
    assert.equal(fixture.native.calls,1);
    assert.deepEqual(fixture.native.captured.options.ccgatewayWireTools,wireToolDefinitions(components.tools));
    assert.deepEqual(result.body.tools.map(t=>t.name),['before','web_search','after']);
    assert.equal(result.body.top_p,0.7); assert.deepEqual(result.body.stop_sequences,['STOP']); assert.deepEqual(result.body.x_future,{a:1});
    assert.equal(result.body.model,'native-model'); assert.equal(result.body.max_tokens,4096); assert.deepEqual(result.body.tool_choice,{type:'auto'}); assert.deepEqual(result.body.metadata,{user_id:'native'});
    assert.ok(!Object.hasOwn(result.body,'thinking')); assert.ok(!Object.hasOwn(result.body,'temperature'));
    assert.deepEqual(result.body.output_config,{effort:'low',x_extra:{keep:true}});
    assert.ok(!Object.hasOwn(result.body,'betas')); assert.equal(result.headers['anthropic-beta'],'native-beta');
    assert.deepEqual(components,copy);
  } finally { await fs.rm(fixture.dir,{recursive:true,force:true}); }
});

test('304 adapter rejects invalid generation input before any native build invocation', async () => {
  const fixture=await adapterFixture();
  try {
    for(const parameters of [{max_tokens:0},{max_tokens:-1},{thinking:{type:'other'}},{thinking:{type:'enabled'}},{thinking:{type:'adaptive',budget_tokens:1024}},{requestPolicy:{contract_version:2}}]) {
      await assert.rejects(fixture.adapter.buildRequest({model:'fixture',messages:[{role:'user',content:'no send'}],parameters},{},new AbortController().signal), e=>e.status===400 && e.field.startsWith('parameters.'));
    }
    assert.equal(fixture.native.calls,0,'invalid input cannot invoke the native builder or transport');
  } finally { await fs.rm(fixture.dir,{recursive:true,force:true}); }
});

// The agent context decides the kind of request CC builds: it sees the client's
// leading header and first prompt (not its reminders), its query source and
// agent context reach the native builder, and the client's cc_prompt_id is
// rewritten to the mapped prompt ID the request header will carry.
test('304 adapter builds the client kind of request from the agent context', async () => {
  const fixture=await adapterFixture();
  try {
    const header='x-anthropic-billing-header: cc_version=2.1.304.9a4; cc_entrypoint=sdk-cli; cch=10dd7; cc_is_subagent=true; cc_prompt_id=a606b757-b9e1-4f6f-8eb0-88ffd9569a8d;';
    const reminderOpen=vocabulary.reminder[0];
    const components={model:'m',systemPrompt:[{type:'text',text:header},{type:'text',text:'agent prompt'}],messages:[{role:'user',content:[{type:'text',text:reminderOpen+'\nctx\n'+vocabulary.reminder[1]},{type:'text',text:'Reply with OK.'}]}],parameters:{max_tokens:16},stream:false};
    let seen;
    const agentContext={agentType:'subagent',agentId:'a0123456789abcdef'};
    const result=await fixture.adapter.buildRequest(components,{},new AbortController().signal,facts=>{seen=facts;return {querySource:'agent:builtin:general-purpose',agentContext,promptId:'11111111-2222-4333-8444-555555555555',billingPromptId:'11111111-2222-4333-8444-555555555555'};});
    assert.equal(seen.billing.cc_is_subagent,'true');
    assert.equal(seen.prompt,'Reply with OK.');
    assert.equal(fixture.native.captured.options.querySource,'agent:builtin:general-purpose');
    assert.equal(fixture.native.captured.options.agentContext,agentContext);
    assert.equal(result.body.system[0].text,header.replace('a606b757-b9e1-4f6f-8eb0-88ffd9569a8d','11111111-2222-4333-8444-555555555555'));
    assert.equal(result.agent.querySource,'agent:builtin:general-purpose');
    // Without a context the request stays CC's native main thread.
    const plain=await fixture.adapter.buildRequest(components,{},new AbortController().signal);
    assert.equal(fixture.native.captured.options.querySource,'sdk');
    assert.equal(plain.body.system[0].text,header);
    assert.equal(plain.agent,undefined);
  } finally { await fs.rm(fixture.dir,{recursive:true,force:true}); }
});

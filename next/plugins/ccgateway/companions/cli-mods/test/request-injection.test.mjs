import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { vocabulary } from './vocabulary.mjs';
import { validateRequestPolicy, injectionChoices } from '../request-policy.js';
import { createContentPolicy } from '../content-policy.js';

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
  for (const name of ['request-input', 'request-options', 'request-policy', 'content-policy', 'request-parameters']) await fs.copyFile(new URL(`../${name}.js`, import.meta.url), path.join(dir, `ccgateway-${name}.js`));
  await fs.copyFile(new URL('../request-build-2.1.304.js', import.meta.url), path.join(dir, 'ccgateway-request-build.js'));
  const header = JSON.stringify(vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=sdk-cli;');
  for (const [name, source] of Object.entries({
    'package.json': '{"type":"module"}',
    'chunk-kasbfbhj.js': `export const calls=[]; export const MDe=()=>({isKnownType:true,messages:[]}); export const ccgatewayEnvironment=()=>{throw Error('unexpected facts')}; export const ccgatewayEnvironmentVocabulary=()=>(${JSON.stringify(vocabulary)});
      export const ccgatewayDefaultPrompt=async(tools)=>['PROMPT for '+tools.map(t=>t.name).join(',')]; export const ccgatewayLayerAttachments=async(kinds)=>kinds.map(type=>({type}));
      export async function* Kvt(input){calls.push(input); const probe=input.options.ccgatewayNativeProbe===true;
        const body=probe?${JSON.stringify(probeBody)}:{model:'m',system:input.options.ccgatewaySystemBlocks,messages:input.options.ccgatewayWireMessages,...input.options.ccgatewayWireTools===undefined?{}:{tools:input.options.ccgatewayWireTools}};
        if(probe) body.system=[{type:'text',text:${header}},{type:'text',text:'LINE'},...body.system];
        yield {type:'ccgateway_request',body}}`,
    'chunk-7y2kvacy.js': `export const oJe=${JSON.stringify(vocabulary.billingHeader)};`,
    'chunk-jkcb7qdd.js': `export const KF=${JSON.stringify(vocabulary.reminder[0])},lKe=${JSON.stringify(vocabulary.reminder[1])};`,
    'chunk-eanw7pgv.js': `export const e$=()=>[{name:'Bash'},{name:'Read'},{name:'Agent'}];`,
    'chunk-t61vswm2.js': `export const t1n=text=>text==='LINE';`,
    'chunk-0ycjphb5.js': 'export const El=()=>({});', 'chunk-q61sszgr.js': 'export const getRootSession=()=>({});', 'chunk-6dwnw6av.js': 'export const YEr=()=>true;',
    'ccgateway-native-tools.js': 'const registry=new Map();export const registerNative=(_session,_owner,tool)=>registry.set(tool.name,{name:tool.name});export const findNative=(_session,name)=>registry.get(name);',
  })) await fs.writeFile(path.join(dir, name), source);
  return { dir, adapter: await import(pathToFileURL(path.join(dir, 'ccgateway-request-build.js'))), native: await import(pathToFileURL(path.join(dir, 'chunk-kasbfbhj.js'))) };
}
const injectAll = { contract_version: 2, build_injection: { system_prompt: true, attachments: { environment: true, date: true }, tools: { Read: true, Bash: true } } };
const client = (system, policy = injectAll) => ({ model: 'm', systemPrompt: system, messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'again' }],
  tools: [{ name: 'lookup', inputSchema: { type: 'object' } }], parameters: {}, requestPolicy: policy });

test('a request without a billing header gets the probe\'s prompt, tools and attachments where CC puts them', async () => {
  const mark = 'CCGATEWAY_FIRST_PROMPT_7d3c1a';
  const f = await fixture({ system: [{ type: 'text', text: 'STATIC' }, { type: 'text', text: 'DYNAMIC' }], tools: [{ name: 'Bash' }, { name: 'Read' }],
    messages: [{ role: 'user', content: [{ type: 'text', text: '<system-reminder>\nENV\n</system-reminder>' }, { type: 'text', text: mark }] }, { role: 'system', content: 'DATE' }] });
  try {
    const out = await f.adapter.buildRequest(client([{ type: 'text', text: 'client system', cache_control: { type: 'ephemeral' } }]), {}, new AbortController().signal);
    const probe = f.native.calls.find(c => c.options.ccgatewayNativeProbe);
    // The probe has CC's tools in CC's order, the prompt for every tool, and the attachments.
    assert.deepEqual(probe.tools.map(t => t.name), ['Bash', 'Read']);
    assert.deepEqual(probe.systemPrompt, ['PROMPT for Bash,Read,lookup']);
    assert.deepEqual(probe.messages.filter(r => r.type === 'attachment').map(r => r.attachment.type), ['environment', 'date']);
    // The billing header and the identity line are not taken from the probe.
    assert.deepEqual(out.body.system.slice(-3), [{ type: 'text', text: 'STATIC' }, { type: 'text', text: 'DYNAMIC' }, { type: 'text', text: 'client system', cache_control: { type: 'ephemeral' } }]);
    assert.equal(out.body.system.filter(b => b.text === 'LINE').length, 0);
    assert.deepEqual(out.body.tools.map(t => t.name), ['Bash', 'Read', 'lookup']);
    assert.deepEqual(out.body.messages, [
      { role: 'user', content: [{ type: 'text', text: '<system-reminder>\nENV\n</system-reminder>' }, { type: 'text', text: 'hi' }] },
      { role: 'system', content: 'DATE' }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'again' }]);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

test('a request with a billing header, or a policy adding nothing, gets no layers', async () => {
  const f = await fixture({ system: [], tools: [], messages: [] });
  try {
    const header = vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=cli;';
    let out = await f.adapter.buildRequest(client([{ type: 'text', text: header }, { type: 'text', text: 'client system' }]), {}, new AbortController().signal);
    assert.deepEqual(out.body.tools.map(t => t.name), ['lookup']);
    assert.equal(out.body.messages.length, 3);
    out = await f.adapter.buildRequest(client('client system', { contract_version: 2, build_injection: { system_prompt: false, tools: { Read: false } } }), {}, new AbortController().signal);
    assert.equal(out.body.messages[0].content, 'hi');
    assert.equal(f.native.calls.filter(c => c.options.ccgatewayNativeProbe).length, 0);
    await assert.rejects(f.adapter.buildRequest(client('s', { contract_version: 2, build_injection: { tools: { Glob: true } } }), {}, new AbortController().signal), /Claude Code tool Glob is not available; this CLI has Bash, Read, Agent/);
  } finally { await fs.rm(f.dir, { recursive: true, force: true }); }
});

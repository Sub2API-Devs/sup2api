import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

// The request command hands CC's client factory the client's kind of request:
// its query source, agent context and prompt ID decide the headers CC writes.
// Direct also gives them to the native billing header it may fill. Without a
// Worker context the request stays the native main thread.
test('the client factory and direct billing get the client kind of request', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-request-agent-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    for (const name of ['request-command', 'request-options', 'request-output', 'request-error', 'request-policy', 'request-agent']) {
      await fs.copyFile(new URL('../' + name + '.js', import.meta.url), path.join(dir, 'ccgateway-' + name + '.js'));
    }
    for (const [name, code] of Object.entries({
      'chunk-gr4a0fky.js': `import fs from 'node:fs';
        export class rbe {}
        export const eF=async options=>{const {apiKey,...rest}=options;fs.writeFileSync('factory.json',JSON.stringify(rest));return new rbe()};
        export const Zre=()=>{};`,
      'chunk-0ycjphb5.js': 'export const El=()=>({agentType:"main",agentId:"native-session"});',
      'chunk-6dwnw6av.js': 'export const YEr=()=>true;',
      'ccgateway-request-build.js': 'export const buildRequest=async()=>{throw Error("build is not under test")};',
      'ccgateway-model-request.js': `
        export const checkModelRequest=()=>null;
        export const openModelRequest=async(outgoing,owner,signal,factory)=>{await factory({});return {id:'x',ok:true,status:200,headers:{}}};
        export const cancelModelResponse=async()=>{};
        export const readModelResponse=async()=>({done:true,text:''});`,
      'run.mjs': `import fs from 'node:fs';
        import {runRequestCommand} from './ccgateway-request-command.js';
        const agentNative={querySourceFor:(type,builtIn)=>builtIn?'agent:builtin:'+type:'agent:custom',
          leadingBilling:system=>Array.isArray(system)&&system[0]?.text.startsWith('x-anthropic-billing-header:')?Object.fromEntries([...system[0].text.matchAll(/(\\w+)=([^;]+);/g)].map(m=>[m[1],m[2]])):null,
          prompt:messages=>typeof messages[0]?.content==='string'?messages[0].content:''};
        const directBuild=async(raw,body,options)=>{fs.writeFileSync('direct.json',JSON.stringify(options));return raw};
        process.exitCode=await runRequestCommand(process.argv.slice(2),{directBuild,agentNative});`,
    })) await fs.writeFile(path.join(dir, name), code);
    const run = (body, env) => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['run.mjs', '--direct'], { cwd: dir, env: { ...process.env, CCG_DIRECT_POLICY: '{}', ...env } });
      const err = [];
      child.stderr.on('data', b => err.push(b));
      child.on('error', reject);
      child.on('close', code => resolve({ code, stderr: Buffer.concat(err).toString() }));
      child.stdin.end(JSON.stringify(body));
    });
    const read = async name => JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
    const header = 'x-anthropic-billing-header: cc_version=2.1.304.9a4; cc_entrypoint=sdk-cli; cc_is_subagent=true; cc_prompt_id=a606b757-b9e1-4f6f-8eb0-88ffd9569a8d;';
    const subagent = { model: 'm', system: [{ type: 'text', text: header }], messages: [{ role: 'user', content: 'Reply with OK.' }] };
    const context = { version: 1, map: false, key: 'ab'.repeat(32), client: { request_class: 'subagent', agent_id: 'a12268251d7ed891f', agent_type: 'general-purpose', prompt_id: 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d' } };

    let result = await run(subagent, { CCG_REQUEST_AGENT: JSON.stringify(context) });
    assert.equal(result.code, 0, result.stderr);
    let factory = await read('factory.json');
    assert.equal(factory.source, 'agent:builtin:general-purpose');
    assert.equal(factory.querySource, 'agent:builtin:general-purpose');
    assert.deepEqual(factory.agentContext, { agentType: 'subagent', agentId: 'a12268251d7ed891f', parentPromptId: 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d', invocationKind: 'spawn' });
    assert.equal(factory.promptId, 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d', 'direct sends the ID its body carries');
    let direct = await read('direct.json');
    assert.deepEqual(direct.agentContext, factory.agentContext);
    assert.equal(direct.promptId, factory.promptId);

    // A request that is not Claude Code's: a custom subagent with derived IDs,
    // and the header direct fills names the same agent and prompt.
    result = await run({ model: 'm', messages: [{ role: 'user', content: 'hello' }] }, { CCG_REQUEST_AGENT: JSON.stringify({ ...context, client: {} }) });
    assert.equal(result.code, 0, result.stderr);
    factory = await read('factory.json');
    direct = await read('direct.json');
    assert.equal(factory.querySource, 'agent:custom');
    assert.match(factory.agentContext.agentId, /^a[0-9a-f]{16}$/);
    assert.match(factory.promptId, /^[0-9a-f-]{36}$/);
    assert.deepEqual(direct.agentContext, factory.agentContext);
    assert.equal(direct.promptId, factory.promptId);

    // No Worker context: CC's native main thread, as before.
    result = await run(subagent, { CCG_REQUEST_AGENT: '' });
    assert.equal(result.code, 0, result.stderr);
    factory = await read('factory.json');
    assert.equal(factory.querySource, 'sdk');
    assert.deepEqual(factory.agentContext, { agentType: 'main', agentId: 'native-session' });
    assert.equal(factory.promptId, undefined);
    assert.equal((await read('direct.json')).agentContext, undefined);

    // A malformed context is refused before anything is sent.
    result = await run(subagent, { CCG_REQUEST_AGENT: '{"version":1}' });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Invalid Worker agent context/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

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
      // CC's request-scoped entrypoint (TY/H2r), recorded.
      'chunk-q61sszgr.js': "import fs from 'node:fs';export const getRootSession=()=>({});export const setEntrypointOnRequests=e=>fs.writeFileSync('entrypoint.json',JSON.stringify(e));",
      // A build stand-in: the system goes out as it came (the client's header
      // stays), the agent context is resolved as the real build does.
      'ccgateway-request-build.js': "const leading=s=>Array.isArray(s)&&s[0]?.text.startsWith('x-anthropic-billing-header:')?Object.fromEntries([...s[0].text.matchAll(/(\w+)=([^;]+);/g)].map(m=>[m[1],m[2]])):null;export const buildRequest=async(c,headers,signal,resolveAgent)=>({body:{model:c.model,system:c.systemPrompt,messages:c.messages},headers:{},identityLine:{line:'none'},agent:resolveAgent?.({billing:leading(c.systemPrompt),prompt:''})});",
      'ccgateway-model-request.js': `
        export const checkModelRequest=()=>null;
        export const openModelRequest=async(outgoing,owner,signal,factory)=>{(await import('node:fs')).writeFileSync('outgoing.json',JSON.stringify(outgoing.headers??{}));await factory({});return {id:'x',ok:true,status:200,headers:{}}};
        export const cancelModelResponse=async()=>{};
        export const readModelResponse=async()=>({done:true,text:''});`,
      'run.mjs': `import fs from 'node:fs';
        import {runRequestCommand} from './ccgateway-request-command.js';
        import {clientUserAgent} from './ccgateway-request-agent.js';
        const leading=system=>Array.isArray(system)&&system[0]?.text.startsWith('x-anthropic-billing-header:')?Object.fromEntries([...system[0].text.matchAll(/(\\w+)=([^;]+);/g)].map(m=>[m[1],m[2]])):null;
        const agentNative={leadingBilling:leading,entrypoint:(system,policy)=>{const own=leading(system)?.cc_entrypoint;return own!==undefined&&policy.build_billing_sources?.cc_entrypoint!=='worker'?own:policy.build_billing_entrypoint},querySourceFor:(type,builtIn)=>builtIn?'agent:builtin:'+type:'agent:custom',
          loopHeaders:{prev_tool_durations:'x-claude-code-prev-tool-durations',cc_compaction_request:'x-cc-compaction-request',claude_code_compaction:'x-claude-code-compaction',cc_context_compacted:'x-cc-context-compacted',claude_code_context_compacted:'x-claude-code-context-compacted'},
          turn:(messages,interactive)=>({turnOrigin:interactive?'human':'sdk',turnPosition:{promptIndex:0,turnIndex:messages.filter(m=>m.role==='user').length}}),
          requestBilling:system=>Array.isArray(system)&&system[0]?.text.startsWith('x-anthropic-billing-header:')?Object.fromEntries([...system[0].text.matchAll(/(\\w+)=([^;]+);/g)].map(m=>[m[1],m[2]])):null,
          prompt:messages=>typeof messages[0]?.content==='string'?messages[0].content:''};
        // The stand-in rewrites the version when the Worker owns it, as direct-billing does.
        const directBuild=async(raw,body,options)=>{fs.writeFileSync('direct.json',JSON.stringify(options));return options.policy.build_billing_sources?.cc_version==='worker'?raw.replace('cc_version=2.1.304.9a4','cc_version=2.1.304.fff'):raw};
        process.exitCode=await runRequestCommand(process.argv.slice(2),{directBuild,agentNative});
        fs.writeFileSync('user-agent.json',JSON.stringify(clientUserAgent()??null));`,
    })) await fs.writeFile(path.join(dir, name), code);
    const run = (body, env, mode = '--direct') => new Promise((resolve, reject) => {
      for (const name of ['entrypoint.json', 'user-agent.json']) fs.rm(path.join(dir, name), { force: true });
      const child = spawn(process.execPath, ['run.mjs', mode], { cwd: dir, env: { ...process.env, CCG_DIRECT_POLICY: '{}', ...env } });
      const err = [];
      child.stderr.on('data', b => err.push(b));
      child.on('error', reject);
      child.on('close', code => resolve({ code, stderr: Buffer.concat(err).toString() }));
      child.stdin.end(JSON.stringify(body));
    });
    const read = async name => JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
    const header = 'x-anthropic-billing-header: cc_version=2.1.304.9a4; cc_entrypoint=sdk-cli; cc_is_subagent=true; cc_prompt_id=a606b757-b9e1-4f6f-8eb0-88ffd9569a8d;';
    const subagent = { model: 'm', system: [{ type: 'text', text: header }], messages: [{ role: 'user', content: 'Reply with OK.' }] };
    const userAgent = 'claude-cli/2.1.304 (external, sdk-cli, agent-sdk/0.2.71)';
    const context = { version: 1, map: false, key: 'ab'.repeat(32), client: { request_class: 'subagent', agent_id: 'a12268251d7ed891f', agent_type: 'general-purpose', prompt_id: 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d', prev_tool_durations: 'Agent=76', user_agent: userAgent } };

    let result = await run(subagent, { CCG_REQUEST_AGENT: JSON.stringify(context) });
    assert.equal(result.code, 0, result.stderr);
    // The request keeps the client's header, so it keeps the client's
    // User-Agent, and CC's request entrypoint is the header's.
    assert.equal(await read('user-agent.json'), userAgent);
    assert.equal(await read('entrypoint.json'), 'sdk-cli');
    let factory = await read('factory.json');
    assert.equal(factory.source, 'agent:builtin:general-purpose');
    assert.equal(factory.querySource, 'agent:builtin:general-purpose');
    assert.deepEqual(factory.agentContext, { agentType: 'subagent', agentId: 'a12268251d7ed891f', parentPromptId: 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d', invocationKind: 'spawn' });
    assert.equal(factory.promptId, 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d', 'direct sends the ID its body carries');
    assert.equal((await read('outgoing.json'))['x-claude-code-prev-tool-durations'], 'Agent=76');
    let direct = await read('direct.json');
    assert.deepEqual(direct.agentContext, factory.agentContext);
    assert.equal(direct.promptId, factory.promptId);
    assert.equal(direct.turnOrigin, undefined, 'a subagent has no turn');

    // Build reads the client's system from the components; the User-Agent
    // follows the same rule.
    result = await run({ model: 'm', systemPrompt: subagent.system, messages: subagent.messages }, { CCG_REQUEST_AGENT: JSON.stringify(context) }, '--build');
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await read('user-agent.json'), userAgent);
    result = await run({ model: 'm', messages: subagent.messages }, { CCG_REQUEST_AGENT: JSON.stringify(context) }, '--build');
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await read('user-agent.json'), null, 'no header of its own in build either');

    // The Worker owns the version: the header is no longer the client's, so
    // the User-Agent is CC's own (for the entrypoint the header carries).
    result = await run(subagent, { CCG_REQUEST_AGENT: JSON.stringify(context), CCG_DIRECT_POLICY: '{"build_billing_sources":{"cc_version":"worker"}}' });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await read('user-agent.json'), null);
    assert.equal(await read('entrypoint.json'), 'sdk-cli');
    // The Worker owns the entrypoint: the configured one names the request.
    result = await run(subagent, { CCG_REQUEST_AGENT: JSON.stringify(context), CCG_DIRECT_POLICY: '{"build_billing_entrypoint":"cli","build_billing_sources":{"cc_entrypoint":"worker"}}' });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await read('entrypoint.json'), 'cli');

    // A request that is not Claude Code's: the main thread with a derived
    // prompt ID (2026-10-23), and the header direct fills names the same
    // prompt and its turn.
    result = await run({ model: 'm', messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }, { role: 'user', content: 'again' }] }, { CCG_REQUEST_AGENT: JSON.stringify({ ...context, client: { user_agent: 'anthropic-sdk-python/0.40.0' } }) });
    assert.notEqual(result.code, 0, 'a User-Agent that is not Claude Code\'s is refused by the context check');
    result = await run({ model: 'm', messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }, { role: 'user', content: 'again' }] }, { CCG_REQUEST_AGENT: JSON.stringify({ ...context, client: {} }), CCG_DIRECT_POLICY: '{"build_billing_entrypoint":"sdk-ts"}' });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await read('user-agent.json'), null, 'no header of its own, no User-Agent of its own');
    assert.equal(await read('entrypoint.json'), 'sdk-ts');
    factory = await read('factory.json');
    direct = await read('direct.json');
    assert.equal(factory.querySource, 'sdk');
    assert.deepEqual(factory.agentContext, { agentType: 'main', agentId: 'native-session' });
    assert.match(factory.promptId, /^[0-9a-f-]{36}$/);
    assert.equal(direct.agentContext, undefined);
    assert.equal(direct.promptId, factory.promptId);
    assert.equal(direct.turnOrigin, 'sdk');
    assert.deepEqual(direct.turnPosition, { promptIndex: 0, turnIndex: 2 });

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

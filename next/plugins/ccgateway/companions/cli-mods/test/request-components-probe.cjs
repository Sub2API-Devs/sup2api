// Only the mock harness is JS. Every CLI call executes the compiled native ELF.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const http = require('node:http'), zlib = require('node:zlib'), { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const [binary, output] = process.argv.slice(2);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-v6-'));
const requests = [], reports = [];
const reply = { id: 'msg_test', type: 'message', role: 'assistant', model: 'fixture', content: [{ type: 'tool_use', id: 't_new', name: 'Bash', input: { arbitrary: true } }], stop_reason: 'tool_use', usage: { input_tokens: 1, output_tokens: 1 } };
const sse = `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: reply })}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`;
const server = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  let bytes = Buffer.concat(chunks); if (req.headers['content-encoding'] === 'gzip') bytes = zlib.gunzipSync(bytes);
  const raw = bytes.toString('utf8'), body = JSON.parse(raw);
  // Fake credentials only. Never use this harness against a real account.
  requests.push({ raw, body, headers: req.headers, path: req.url });
  if (body.probe === 'error') { res.writeHead(429, { 'content-type': 'application/json' }); res.end('{ "error": "fixture" }'); return; }
  if (body.stream) { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.end(sse); }
  else { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(reply)); }
});
async function run(name, body, args = [], { file = false, env = {} } = {}) {
  const home = fs.mkdtempSync(path.join(root, name+'-')), before = requests.length;
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  if (file) { const filename = path.join(home, 'input.json'); fs.writeFileSync(filename, raw); args = [...args, filename]; }
  const child = spawn(binary, ['request', ...args], { cwd: home, env: { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home,'config'),
    ANTHROPIC_API_KEY: 'fake-api-key', ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.address().port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ANTHROPIC_CUSTOM_HEADERS: 'anthropic-beta: ENV_BETA\nAuthorization: Bearer ENV_AUTH\nX-Api-Key: ENV_KEY\nUser-Agent: ENV_UA\nX-Private-Test: ENV_PRIVATE',
    CLAUDE_CODE_CONTAINER_ID: 'ENV_CONTAINER', CLAUDE_CODE_REMOTE_SESSION_ID: 'ENV_SESSION', CLAUDE_AGENT_SDK_CLIENT_APP: 'ENV_APP', ...env,
  } });
  let stdout = '', stderr = ''; child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  child.stdin.end(file ? undefined : raw);
  const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
  const result = await new Promise(resolve => child.on('close', (code, signal) => { clearTimeout(timer); resolve({ name, code, signal, stdout, stderr, requests: requests.slice(before) }); }));
  reports.push(result); return result;
}
function cleanHeaders(request) {
  assert.equal(request.headers['x-api-key'], 'fake-api-key');
  assert.equal(request.headers['user-agent'], 'ccgateway-request');
  for (const key of Object.keys(request.headers)) assert.ok(!key.startsWith('x-stainless-') && !key.startsWith('x-claude-') && !['authorization','x-app','x-client-app','x-private-test','x-is-refusal-fallback'].includes(key), key);
  assert.ok(!JSON.stringify(request.headers).includes('ENV_'));
}
server.listen(0, '127.0.0.1', async () => {
  try {
    const direct = '{ "model":"claude-haiku-4-5-20251001", "max_tokens":32, "messages":[{"role":"user","content":"DIRECT"}], "large":9007199254740993 }\n';
    let r = await run('direct-file-betas', direct, ['--direct','--betas','alpha, beta,alpha','--header','Anthropic-Beta: gamma'], { file: true });
    assert.equal(r.code,0,r.stderr); assert.equal(r.requests.length,1); assert.equal(r.requests[0].raw,direct); assert.equal(r.requests[0].headers['anthropic-beta'],'alpha,beta,gamma'); cleanHeaders(r.requests[0]);
    r = await run('direct-no-betas', direct, ['--direct']); assert.equal(r.code,0,r.stderr); assert.equal(r.requests.length,1); assert.equal(r.requests[0].headers['anthropic-beta'],undefined); cleanHeaders(r.requests[0]);
    const reminder = { type:'text',text:'<system-reminder>FIRST_CONTEXT</system-reminder>',cache_control:{type:'ephemeral'} };
    const modern = {role:'system',content:[{type:'text',text:'MODERN_A',cache_control:{type:'ephemeral'}},{type:'text',text:'MODERN_B'}],clear_at:'next_user_message',output_config:{effort:'low'}};
    const components = { model:'claude-haiku-4-5-20251001',systemPrompt:[{type:'text',text:'GLOBAL',cache_control:{type:'ephemeral'}}],
      messages:[{role:'user',content:[{type:'text',text:'BEFORE'},{type:'ccgateway_attachment',id:'r'},{type:'text',text:'AFTER'}]},{attachment:'s'},{role:'assistant',content:[{type:'tool_use',id:'old_tool',name:'Bash',input:{arbitrary:1}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'old_tool',content:'TOOL_DONE'},{type:'text',text:'LAST'}]}],
      attachments:[{id:'r',kind:'reminder',block:reminder},{id:'s',kind:'system',message:modern}],
      tools:[{name:'Bash',description:'CUSTOM_BASH',inputSchema:{type:'object',properties:{arbitrary:{type:'integer'}},required:['arbitrary']}}],parameters:{max_tokens:64},stream:false };
    r = await run('build-extracted-system', components, ['--build','--betas','client-beta'], {file:true});
    assert.equal(r.code,0,r.stderr); assert.equal(r.requests.length,1); cleanHeaders(r.requests[0]);
    const b=r.requests[0].body;
    assert.deepEqual(b.system,components.systemPrompt); assert.deepEqual(b.messages.find(m=>m.role==='system'),modern);
    const text=JSON.stringify(b.messages); for(const marker of ['FIRST_CONTEXT','MODERN_A','MODERN_B','BEFORE','AFTER','TOOL_DONE','LAST']) assert.equal(text.split(marker).length-1,1,marker);
    assert.ok(text.indexOf('BEFORE')<text.indexOf('FIRST_CONTEXT')&&text.indexOf('FIRST_CONTEXT')<text.indexOf('AFTER'));
    assert.equal(b.tools.find(t=>t.name==='Bash').input_schema.required[0],'arbitrary');
    assert.ok(r.requests[0].headers['anthropic-beta'].split(',').includes('client-beta'));
    assert.ok(!r.requests[0].headers['anthropic-beta'].includes('claude-code-20250219'));
    assert.deepEqual(JSON.parse(r.stdout),reply);
    const template = {type:'ccgateway_text',block:{type:'text',cache_control:{type:'ephemeral'}},parts:[{text:'PREFIX 中文 '},{attachment:'r'},{text:' SUFFIX'}]};
    const nested = {...components,messages:[{role:'user',content:[template]},{attachment:'s'},{role:'assistant',content:[{type:'tool_use',id:'old_tool',name:'Bash',input:{arbitrary:1}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'old_tool',content:[{...template,parts:[{text:'RESULT '},{attachment:'r2'}]}]},{type:'text',text:'LAST'}]}],attachments:[...components.attachments,{id:'r2',kind:'reminder',block:{type:'text',text:'<system-reminder>NESTED</system-reminder>'}}]};
    r=await run('build-worker-text-templates',nested,['--build','--betas','mid-conversation-system-2026-04-07,mid-conversation-system-clear-at-2026-08-21']);
    assert.equal(r.code,0,r.stderr);assert.equal(r.requests.length,1);cleanHeaders(r.requests[0]);
    const nt=JSON.stringify(r.requests[0].body.messages);
    assert.ok(nt.includes('PREFIX 中文 <system-reminder>FIRST_CONTEXT</system-reminder> SUFFIX'));
    assert.ok(nt.includes('RESULT <system-reminder>NESTED</system-reminder>'));
    assert.equal(nt.split('NESTED').length-1,1);assert.deepEqual(r.requests[0].body.messages.find(m=>m.role==='system'),modern);
    r=await run('build-no-betas',{...components,messages:[{role:'user',content:'BASIC'}],attachments:[]},['--build']);
    assert.equal(r.code,0,r.stderr); assert.equal(r.requests.length,1); cleanHeaders(r.requests[0]); assert.equal(r.requests[0].headers['anthropic-beta'],undefined);
    r=await run('build-stream',{...components,stream:true},['--build','--betas','client-beta']); assert.equal(r.code,0,r.stderr);assert.equal(r.requests.length,1);assert.equal(r.stdout,sse);
    r=await run('build-http-error',{...components,parameters:{max_tokens:64,probe:'error'}},['--build']); assert.equal(r.code,2,r.stderr);assert.equal(r.requests.length,1);assert.equal(r.stdout,'{ "error": "fixture" }');
    r=await run('missing-api-key',direct,['--direct'],{env:{ANTHROPIC_API_KEY:'',CLAUDE_CODE_OAUTH_TOKEN:'fake-subscription'}});assert.equal(r.code,1);assert.equal(r.requests.length,0);
    r=await run('unsafe-build-number','{"model":"fixture","messages":[{"role":"user","content":"x"}],"parameters":{"large":9007199254740993}}',['--build']);assert.equal(r.code,1);assert.equal(r.requests.length,0);
    r=await run('duplicate-reference',{...components,messages:[{attachment:'s'},{attachment:'s'}],attachments:[components.attachments[1]]},['--build']);assert.equal(r.code,1);assert.equal(r.requests.length,0);
    r=await run('forbidden-header',direct,['--direct','--header','X-Claude-Code-Session-Id: fake']);assert.equal(r.code,1);assert.equal(r.requests.length,0);
    fs.writeFileSync(output,JSON.stringify({passed:true,reports},null,2));console.log(JSON.stringify({passed:true,scenarios:reports.map(r=>({name:r.name,code:r.code,requests:r.requests.length}))}));
  } catch(error) { fs.writeFileSync(output,JSON.stringify({passed:false,error:String(error),reports},null,2)); console.log(JSON.stringify({passed:false,error:String(error),last:reports.at(-1)})); process.exitCode=1; }
  finally {server.closeAllConnections?.();server.close();}
});

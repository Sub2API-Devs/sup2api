const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const http = require('node:http'), { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const [binary, entry, output] = process.argv.slice(2);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-request-modes-'));
const requests = [], reports = [];
const response = { id: 'msg_fixture', type: 'message', role: 'assistant', model: 'claude-haiku-4-5-20251001', content: [{ type: 'tool_use', id: 'tool_fixture', name: 'ClientTool', input: { value: 'client handles this' } }], stop_reason: 'tool_use', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } };
const sse = `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: response })}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`;
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  requests.push({ raw, body, path: req.url, beta: req.headers['anthropic-beta'] });
  if (body.probe === 'blocked') { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.end('data: ' + 'x'.repeat(8 * 1024 * 1024) + '\n\n'); return; }
  if (body.probe === 'error') { res.writeHead(429, { 'content-type': 'application/json' }); res.end('{ "error": "MOCK_LIMIT" }'); return; }
  if (body.stream) { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.end(sse); }
  else { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(response)); }
});
async function run(name, body, args) {
  const home = fs.mkdtempSync(path.join(root, name + '-')), before = requests.length;
  const child = spawn(binary, [...entry === '-' ? [] : [entry], 'request', ...args], {
    cwd: home, env: { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, 'config'), ANTHROPIC_API_KEY: 'mock-only', ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.address().port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' },
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  child.stdin.end(typeof body === 'string' ? body : JSON.stringify(body));
  const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
  const result = await new Promise(resolve => child.on('close', (code, signal) => { clearTimeout(timer); resolve({ name, code, signal, stdout, stderr, requests: requests.slice(before) }); }));
  reports.push(result); return result;
}
async function blocked(name, body, mode) {
  const home = fs.mkdtempSync(path.join(root, name + '-')), before = requests.length;
  const child = spawn(binary, [...entry === '-' ? [] : [entry], 'request', mode, '--timeout-ms', '500'], { cwd: home, env: { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, 'config'), ANTHROPIC_API_KEY: 'mock-only', ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.address().port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' } });
  let exited = false, code, signal, stderr = '';
  child.stderr.on('data', b => stderr += b);
  child.on('exit', (c, s) => { exited = true; code = c; signal = s; });
  const closed = new Promise(resolve => child.on('close', resolve));
  child.stdin.end(JSON.stringify(body));
  await new Promise(resolve => setTimeout(resolve, 1800));
  const alivePastDeadline = !exited;
  child.stdout.resume(); if (!exited) child.kill('SIGKILL'); await closed;
  reports.push({ name, code, signal, stderr, alivePastDeadline, requests: requests.slice(before) });
  assert.equal(alivePastDeadline, false, name + ' failed to cancel blocked output');
  assert.equal(code, 1, stderr); assert.equal(requests.length - before, 1);
}
server.listen(0, '127.0.0.1', async () => {
  try {
    const base = { model: 'claude-haiku-4-5-20251001', max_tokens: 42, system: 'CLIENT_GLOBAL', messages: [{ role: 'user', content: 'CLIENT_PROMPT' }], tools: [{ name: 'ClientTool', description: 'CLIENT_TOOL', input_schema: { type: 'object', properties: { value: { type: 'string' } } }, strict: true }] };
    // The gateway supplies components for build; the direct input stays an
    // unmodified HTTP body. This fixture conversion is not part of the CLI.
    const components = ({ model, messages, system, tools, stream, ...parameters }) => ({ model, messages, systemPrompt: system, tools: tools.map(({ input_schema, ...t }) => ({ ...t, inputSchema: input_schema })), parameters, stream: stream === true });
    let r = await run('direct', base, ['--direct']); assert.equal(r.code, 0, r.stderr); assert.equal(r.requests.length, 1); assert.deepEqual(r.requests[0].body, base);
    r = await run('conflict', base, ['--direct', '--build']); assert.equal(r.code, 1); assert.equal(r.requests.length, 0);
    r = await run('build-reject-http-body', base, ['--build']); assert.equal(r.code, 1); assert.equal(r.requests.length, 0);
    r = await run('build-basic', components(base), ['--build']); assert.equal(r.code, 0, r.stderr); assert.equal(r.requests.length, 1); assert.deepEqual(JSON.parse(r.stdout), response); assert.ok(JSON.stringify(r.requests[0].body.system).includes('CLIENT_GLOBAL')); assert.ok(JSON.stringify(r.requests[0].body.messages).includes('CLIENT_PROMPT')); assert.deepEqual(r.requests[0].body.tools.find(t => t.name === 'ClientTool'), base.tools[0]);
    const reminder = '<system-reminder>\nCONTEXT_SENTINEL\n</system-reminder>';
    const image = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1kAAAAASUVORK5CYII=' } };
    const mixed = components({ ...base, messages: [{ role: 'user', content: 'OLD_USER' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'tool_old', name: 'ClientTool', input: { value: 'old' } }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool_old', content: 'OLD_RESULT' }, image, { type: 'text', text: 'NEW_USER' }] }, { role: 'system', content: 'CLIENT_SYSTEM_TURN' }] });
    mixed.attachments = [{ afterMessage: 2, text: reminder, role: 'user' }, { afterMessage: 2, role: 'user', attachment: { type: 'hook_additional_context', hookName: 'FixtureHook', hookEvent: 'UserPromptSubmit', content: ['TYPED_CONTEXT'] } }];
    r = await run('build-mixed', mixed, ['--build']); assert.equal(r.code, 0, r.stderr); assert.equal(r.requests.length, 1);
    const b = r.requests[0].body, text = JSON.stringify(b.messages);
    for (const value of ['OLD_USER', 'OLD_RESULT', 'CONTEXT_SENTINEL', 'NEW_USER', 'CLIENT_SYSTEM_TURN', 'FixtureHook hook additional context: TYPED_CONTEXT']) assert.ok(text.includes(value), value);
    assert.equal(text.split('CONTEXT_SENTINEL').length - 1, 1); assert.ok(!text.includes('client hook additional context'));
    assert.equal(b.messages.at(-1).role, 'system'); assert.ok(b.messages.some(m => Array.isArray(m.content) && m.content.some(x => x.type === 'image' && x.source.data === image.source.data)));
    r = await run('build-stream', components({ ...base, stream: true }), ['--build']); assert.equal(r.code, 0, r.stderr); assert.equal(r.requests.length, 1); assert.equal(r.stdout, sse);
    r = await run('build-error', components({ ...base, probe: 'error' }), ['--build']); assert.equal(r.code, 2, r.stderr); assert.equal(r.requests.length, 1); assert.equal(r.stdout, '{ "error": "MOCK_LIMIT" }');
    const blockedBody = { ...base, probe: 'blocked', stream: true };
    await blocked('direct-blocked-output', blockedBody, '--direct');
    await blocked('build-blocked-output', components(blockedBody), '--build');
    fs.writeFileSync(output, JSON.stringify({ passed: true, reports }, null, 2)); console.log(JSON.stringify({ passed: true, scenarios: reports.map(r => ({ name: r.name, code: r.code, requests: r.requests.length })) }));
  } catch (error) { fs.writeFileSync(output, JSON.stringify({ passed: false, error: String(error), reports }, null, 2)); console.log(JSON.stringify({ passed: false, error: String(error), last: reports.at(-1) })); process.exitCode = 1; }
  finally { server.closeAllConnections?.(); server.close(); }
});

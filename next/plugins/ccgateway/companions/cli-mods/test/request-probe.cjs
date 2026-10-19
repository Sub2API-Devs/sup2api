const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const http = require('node:http'), { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
function failure(r) { assert.equal(r.stdout, ''); const line=r.stderr.split('\n').find(l=>l.startsWith('CCG_REQUEST_ERROR ')); assert.ok(line,r.stderr); const f=JSON.parse(line.slice('CCG_REQUEST_ERROR '.length)); assert.equal(f.protocol,'ccgateway.request.error.v1'); return f; }
const [binary, entry, output] = process.argv.slice(2);
if (!output) throw Error('request-probe.cjs binary entry-or-dash output.json');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-request-probe-'));
const seen = [], reports = [];
const sse = 'event: message_start\ndata: {"text":"中文🙂"}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n';
let streamEnded = false;
const webResponse = { id: 'local-search', type: 'message', content: [
  { type: 'server_tool_use', id: 'search-1', name: 'web_search', input: { query: 'fixture query' } },
  { type: 'web_search_tool_result', tool_use_id: 'search-1', content: [{ type: 'web_search_result', url: 'https://example.test/', title: 'Fixture', encrypted_content: 'opaque-result' }] },
  { type: 'text', text: 'Fixture answer', citations: [{ type: 'web_search_result_location', url: 'https://example.test/', title: 'Fixture', cited_text: 'fixture' }] },
], usage: { server_tool_use: { web_search_requests: 1 } } };
const errorText = '{ "type": "error", "error": { "type": "rate_limit_error", "message": "LOCAL_ONLY" } }\n';
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw); seen.push({ raw, body, authPresent: req.headers['x-api-key'] === 'local-mock-key', beta: req.headers['anthropic-beta'] });
  if (body.probe === 'timeout') { const timer = setTimeout(() => res.end('{}'), 2000); res.on('close', () => clearTimeout(timer)); return; }
  if (body.probe === 'error') { res.writeHead(429, { 'content-type': 'application/json', 'x-probe-error': 'kept' }); res.end(errorText); return; }
  if (body.probe === 'string-error') {
    res.writeHead(429, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body.nested ? { error: 'quota exceeded' } : 'quota exceeded') + (body.large ? ' '.repeat(70000) : '')); return;
  }
  if (body.probe === 'http-error') {
    res.writeHead(body.error_status, { 'content-type': 'application/json', 'retry-after': '7', 'x-should-retry': 'true' });
    res.end(JSON.stringify({ type: 'error', error: { type: 'fixture_error', code: 'PROVIDER_CODE', message: 'fixture detail' } })); return;
  }
  if (body.probe === 'large-error') { res.writeHead(503); res.end('x'.repeat(100000)); return; }
  if (body.probe === 'empty-error') { res.writeHead(401); res.end(); return; }
  if (body.probe === 'stream-reset') {
    res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write('event: message_start\ndata: {}\n\n');
    setTimeout(() => res.destroy(), 150); return;
  }
  if (body.stream) {
    streamEnded = false;
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const bytes = Buffer.from(sse), cut = bytes.indexOf(Buffer.from('中')) + 1;
    res.write(bytes.subarray(0, cut));
    const timer = setTimeout(() => { streamEnded = true; res.end(bytes.subarray(cut)); }, 350);
    res.on('close', () => clearTimeout(timer)); return;
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body.probe === 'websearch' ? webResponse : { received: body }));
});

async function run(name, body, extra = [], inputFile = false) {
  const home = fs.mkdtempSync(path.join(root, name + '-'));
  const args = [...entry === '-' ? [] : [entry], 'request', ...extra];
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  if (inputFile) { const filename = path.join(home, 'request.json'); fs.writeFileSync(filename, text); args.push('--input', filename); }
  const env = { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, 'config'), ANTHROPIC_API_KEY: 'local-mock-key', ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.address().port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };
  return await new Promise(resolve => {
    const before = seen.length, child = spawn(binary, args, { env, cwd: home });
    let stdout = '', stderr = '', incremental = false;
    child.stdout.on('data', chunk => { stdout += chunk; if (body?.stream && !streamEnded) incremental = true; if (name === 'interrupt') child.kill('SIGINT'); });
    child.stderr.on('data', chunk => stderr += chunk);
    let interruptPoll;
    if (name === 'interrupt-input') {
      const meta = extra[extra.indexOf('--response-meta') + 1];
      // Metadata cleanup proves that the signal handler is installed. Keep
      // stdin open to interrupt the input phase, without timing assumptions.
      interruptPoll = setInterval(() => { if (!fs.existsSync(meta)) { clearInterval(interruptPoll); child.kill('SIGINT'); } }, 10);
    } else child.stdin.end(inputFile ? undefined : text);
    const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
    child.on('close', (code, signal) => { clearTimeout(timer); clearInterval(interruptPoll); resolve({ name, code, signal, stdout, stderr, incremental, requests: seen.slice(before) }); });
  });
}

server.listen(0, '127.0.0.1', async () => {
  try {
    const base = { model: 'claude-haiku-4-5-20251001', max_tokens: 42, system: [{ type: 'text', text: 'CLIENT_SYSTEM' }], messages: [{ role: 'user', content: 'CLIENT_MESSAGE' }], output_format: { type: 'json_schema', schema: { type: 'object' } }, unknown_field: { preserve: true } };
    const metaFile = path.join(root, 'meta.json');
    let r = await run('json', base, ['--response-meta', metaFile, '--header', 'anthropic-beta:probe-beta']); reports.push(r);
    assert.equal(r.code, 0, r.stderr); assert.equal(r.requests.length, 1); assert.deepEqual(r.requests[0].body, base); assert.equal(r.requests[0].authPresent, true); assert.equal(r.requests[0].beta, 'probe-beta'); assert.deepEqual(JSON.parse(r.stdout), { received: base }); assert.equal(JSON.parse(fs.readFileSync(metaFile)).status, 200);
    r = await run('file', { ...base, probe: 'file' }, [], true); reports.push(r); assert.equal(r.code, 0, r.stderr); assert.equal(r.requests.length, 1);
    const streaming = { ...base, stream: true };
    r = await run('sse', streaming); reports.push(r); assert.equal(r.code, 0, r.stderr); assert.equal(r.stdout, sse); assert.equal(r.incremental, true); assert.deepEqual(r.requests[0].body, streaming);
    r = await run('error', { ...base, probe: 'error' }, ['--response-meta', metaFile]); reports.push(r); assert.equal(r.code, 2, r.stderr); assert.equal(r.requests.length, 1); assert.equal(failure(r).status,429); assert.equal(failure(r).body,errorText); assert.equal(fs.existsSync(metaFile),false);
    for (const nested of [false, true]) for (const large of [false, true]) {
      r = await run('string-error', { ...base, probe: 'string-error', nested, large }); reports.push(r);
      assert.equal(r.code, 2, r.stderr); const frame = failure(r);
      assert.equal(frame.status, 429); assert.equal(frame.error.message, 'quota exceeded');
      if (large) { assert.equal(frame.truncated, true); assert.equal(frame.body, undefined); }
      else assert.equal(frame.body, JSON.stringify(nested ? { error: 'quota exceeded' } : 'quota exceeded'));
    }
    fs.writeFileSync(metaFile, '{}');
    r = await run('interrupt-input', base, ['--response-meta', metaFile]); reports.push(r);
    assert.equal(r.code, 130, r.stderr); assert.equal(r.requests.length, 0);
    assert.deepEqual(failure(r).error, {type:'api_error',code:'cli_interrupted',message:'CC request was interrupted'});
    assert.equal(failure(r).source,'interrupted'); assert.equal(failure(r).status,502);
    for (const status of [400, 401, 403, 429, 500, 529]) {
      r = await run('http-'+status, { ...base, probe:'http-error', error_status:status }); reports.push(r);
      assert.equal(r.code,2,r.stderr); const f=failure(r); assert.equal(f.status,status); assert.equal(f.error.code,'PROVIDER_CODE'); assert.equal(f.error.message,'fixture detail'); assert.equal(f.headers['retry-after'],'7');
    }
    r=await run('large-error',{...base,probe:'large-error'});reports.push(r);assert.equal(r.code,2);assert.equal(failure(r).status,503);assert.equal(failure(r).truncated,true);assert.ok(r.stderr.length<4096);
    r=await run('empty-error',{...base,probe:'empty-error'});reports.push(r);assert.equal(r.code,2);assert.equal(failure(r).status,401);
    r=await run('stream-reset',{...base,stream:true,probe:'stream-reset'});reports.push(r);assert.equal(r.code,1);assert.ok(r.stdout.includes('message_start'));assert.ok(!r.stdout.includes('message_stop'));assert.ok(r.stderr.includes('CCG_REQUEST_ERROR '));
    const search = { ...base, probe: 'websearch', tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }], tool_choice: { type: 'tool', name: 'web_search' } };
    r = await run('websearch', search); reports.push(r); assert.equal(r.code, 0, r.stderr); assert.deepEqual(r.requests[0].body, search); assert.deepEqual(JSON.parse(r.stdout), webResponse);
    r = await run('timeout', { ...base, probe: 'timeout' }, ['--timeout-ms', '100']); reports.push(r); assert.equal(r.code, 1); assert.equal(failure(r).status, 504); assert.equal(failure(r).error.code,'cli_timeout');
    r = await run('invalid-json', '{'); reports.push(r); assert.equal(r.code, 1); assert.equal(r.requests.length, 0);
    r = await run('auth-header', base, ['--header', 'Authorization:should-not-forward']); reports.push(r); assert.equal(r.code, 1); assert.equal(r.requests.length, 0);
    r = await run('help', '', ['--help']); reports.push(r); assert.equal(r.code, 0); assert.equal(r.requests.length, 0); assert.ok(r.stdout.includes('Usage: claude request'));
    r = await run('interrupt', { ...base, stream: true }); reports.push(r); assert.equal(r.code, 130, r.stderr); assert.ok(r.stdout.length > 0 && r.stdout.length < sse.length);
    const precise = '{ "model":"claude-haiku-4-5-20251001", "max_tokens":42, "messages":[{"role":"user","content":"fixture"}], "large_integer":9007199254740993123456789 }\n';
    r = await run('exact-body', precise, ['--direct']); reports.push(r); assert.equal(r.code, 0, r.stderr); assert.equal(r.requests[0].raw, precise);
    fs.writeFileSync(output, JSON.stringify({ passed: true, reports }, null, 2));
    console.log(JSON.stringify({ passed: true, scenarios: reports.map(r => ({ name: r.name, code: r.code, requests: r.requests.length, incremental: r.incremental })) }));
  } catch (error) {
    fs.writeFileSync(output, JSON.stringify({ passed: false, error: String(error), reports }, null, 2));
    console.log(JSON.stringify({ passed: false, error: String(error), last: reports.at(-1) })); process.exitCode = 1;
  } finally { server.closeAllConnections?.(); server.close(); }
});

// Shared runtime harness for native assembly acceptance (not business code).
// Reuses the verified matrix setup: sealed active CLI, UID 1000 Worker, local
// model stub, no real credentials, and one capture per HTTP model request.
const fs = require('node:fs'), cp = require('node:child_process'), http = require('node:http');
const assert = require('node:assert/strict');
const { sha } = require('./replay-helpers.cjs');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startRuntime(options = {}) {
  for (const [key, value] of Object.entries(options.environment ?? {})) {
    if (!['CLAUDE_CODE_EXTRA_BODY', 'CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING'].includes(key) || typeof value !== 'string') throw Error('Unsupported test runtime environment override');
  }
  if (process.env.CCG_ASSEMBLY_DISPOSABLE !== '1' || !fs.existsSync('/.dockerenv') ||
      process.getuid?.() !== 0 || fs.existsSync('/var/run/docker.sock')) throw Error('Disposable --network none container required');
  const cliInput = process.env.PROBE_CLI || '/input/claude-linux-assembly-fix';
  const workerInput = process.env.PROBE_WORKER || '/input/ccg-worker-304-assembly-fix-linux';
  const root = '/opt/ccgateway/cli/ccg304-assembly', workingDirectory = '/work/assembly-context';
  fs.mkdirSync(root, { recursive: true, mode: 0o755 });
  fs.copyFileSync(cliInput, root + '/claude'); fs.chownSync(root + '/claude', 0, 0); fs.chmodSync(root + '/claude', 0o755);
  const cliSHA = sha(fs.readFileSync(root + '/claude'));
  const expectedSHA = process.env.PROBE_EXPECT_CLI_SHA || '138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd';
  assert.equal(cliSHA, expectedSHA);
  const info = JSON.parse(cp.execFileSync(root + '/claude', ['--ccgateway-info'], { encoding: 'utf8' }));
  assert.equal(info.version, '2.1.304');
  fs.writeFileSync(root + '/manifest.json', JSON.stringify({ versions: { '2.1.304': {
    path: 'claude', sha256: cliSHA, patch: info.patch, modes: ['direct', 'build'],
  } } }), { mode: 0o644 });
  fs.writeFileSync('/opt/ccgateway/cli/active-runtime.json', JSON.stringify({
    schema_version: 1, manifest: 'ccg304-assembly/manifest.json', version: '2.1.304', request_mode: 'build',
  }), { mode: 0o644 });
  for (const directory of [workingDirectory, '/work/assembly-home', '/work/assembly-home/config', '/work/assembly-data', '/work/assembly-data/cache']) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); fs.chownSync(directory, 1000, 1000);
  }
  const captures = [];
  let responseFixture = {}, workerLog = '', worker;
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const bytes of req) raw += bytes;
    const body = JSON.parse(raw);
    const capture = { body, raw, method: req.method, url: req.url, authorization_present: Boolean(req.headers.authorization),
      headers: Object.fromEntries(['anthropic-beta', 'anthropic-version', 'content-type'].filter(k => req.headers[k]).map(k => [k, req.headers[k]])),
      auth_uses_worker_credential: req.headers['x-api-key'] === 'assembly-model-mock-key',
      leaked_policy_header: req.headers['x-ccgateway-request-policy'] !== undefined };
    captures.push(capture);
    const fixture = responseFixture;
    if (fixture.status && fixture.status >= 400) {
      capture.response = { status: fixture.status, raw: fixture.raw, headers: { 'content-type': 'application/json', 'retry-after': '2', 'request-id': 'assembly-upstream-request' } };
      res.writeHead(fixture.status, capture.response.headers); res.end(fixture.raw); return;
    }
    const message = { id: 'msg_assembly', type: 'message', role: 'assistant', model: body.model,
      content: [{ type: 'text', text: 'ASSEMBLY' }], stop_reason: 'end_turn', stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 } };
    if (body.stream) {
      let stream = '';
      const event = (type, data) => { stream += `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`; };
      event('message_start', { message: { ...message, content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 0 } } });
      event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'ASSEMBLY' } });
      event('content_block_stop', { index: 0 });
      event('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } });
      event('message_stop', {});
      capture.response = { status: 200, raw: stream, headers: { 'content-type': 'text/event-stream' } };
    } else capture.response = { status: 200, raw: JSON.stringify(message), headers: { 'content-type': 'application/json' } };
    res.writeHead(capture.response.status, capture.response.headers); res.end(capture.response.raw);
  });
  await new Promise(resolve => server.listen(18080, '127.0.0.1', resolve));
  const environment = {
    PATH: process.env.PATH, HOME: '/work/assembly-home', SHELL: '/bin/bash', LANG: 'C.UTF-8',
    CCG_API_KEY: 'assembly-gateway-key', CCG_ADMIN_KEY: 'assembly-admin-key', CCG_BIND: '127.0.0.1:18087',
    CCG_WORKING_DIRECTORY: workingDirectory, CCG_DATA_DIR: '/work/assembly-data', CACHE_DIR: '/work/assembly-data/cache',
    CLAUDE_CONFIG_DIR: '/work/assembly-home/config', CLAUDE_SECURESTORAGE_CONFIG_DIR: '/work/assembly-home/config',
    ANTHROPIC_API_KEY: 'assembly-model-mock-key', ANTHROPIC_BASE_URL: 'http://127.0.0.1:18080',
    CLAUDE_CODE_SESSION_KIND: 'bg', CCG_REQUEST_MODE: 'build', REQUEST_TIMEOUT: '60s', CLI_TIMEOUT: '60s',
    DISABLE_AUTOUPDATER: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
  for (const [key, value] of Object.entries(options.environment ?? {})) {
    if (!['CLAUDE_CODE_EXTRA_BODY', 'CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING'].includes(key) || typeof value !== 'string') throw Error('Unsupported test runtime environment override');
    environment[key] = value;
  }
  async function close() {
    if (worker && worker.exitCode === null) {
      worker.kill('SIGTERM'); await Promise.race([new Promise(resolve => worker.once('exit', resolve)), sleep(5000)]);
      if (worker.exitCode === null) worker.kill('SIGKILL');
    }
    await new Promise(resolve => server.close(resolve));
  }
  worker = cp.spawn(workerInput, [], { uid: 1000, gid: 1000, cwd: workingDirectory, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [worker.stdout, worker.stderr]) stream.on('data', data => { workerLog = (workerLog + data).slice(-12000); });
  let workerCapabilities = [];
  try {
    let healthy = false;
    for (let i = 0; i < 300; i++) {
      if (worker.exitCode !== null) throw Error('Worker exited: ' + workerLog);
      try { const r = await fetch('http://127.0.0.1:18087/health'); const health = await r.json();
        if (r.status === 200) { assert.equal(health.cli_sha256, cliSHA); workerCapabilities = health.capabilities ?? []; healthy = true; break; } } catch (error) { if (error.code === 'ERR_ASSERTION') throw error; }
      await sleep(100);
    }
    assert(healthy, 'Worker readiness timed out');
    assert.equal(captures.length, 0, 'readiness probes cannot issue model calls');
  } catch (error) { await close(); throw error; }
  return {
    identity: { cli: info, cli_sha256: cliSHA, worker_sha256: sha(fs.readFileSync(workerInput)), worker_capabilities: workerCapabilities },
    captures, workingDirectory, close,
    async send(test) {
      responseFixture = test.response_fixture ?? {};
      const before = captures.length;
      const policy = { schema_version: 1, relay_mode: test.mode ?? 'build', cli_version: '2.1.304', ...(test.policy ?? {}) };
      const started = Date.now();
      const sentRaw = test.raw_body ?? JSON.stringify(test.body);
      if (test.transport === 'standalone-cli') {
        let output = '', errors = '';
        const child = cp.spawn(root + '/claude', ['request', '--build', '--input', '-'], {
          uid: 1000, gid: 1000, cwd: workingDirectory, env: environment, stdio: ['pipe', 'pipe', 'pipe'],
        });
        child.stdout.on('data', data => { output += data; });
        child.stderr.on('data', data => { errors += data; });
        child.stdin.end(sentRaw);
        const exitCode = await new Promise((resolve, reject) => {
          const deadline = setTimeout(() => { child.kill('SIGKILL'); reject(Error('Standalone CLI timed out after 60s')); }, 60000);
          child.once('error', error => { clearTimeout(deadline); reject(error); });
          child.once('close', code => { clearTimeout(deadline); resolve(code); });
        });
        return { status: null, cli_exit_code: exitCode, text: errors || output, sent_raw: sentRaw,
          headers: {}, captures: captures.slice(before), duration_ms: Date.now() - started };
      }
      const response = await fetch('http://127.0.0.1:18087/v1/messages', { method: 'POST', headers: {
        'x-api-key': 'assembly-gateway-key', 'content-type': 'application/json', ...(test.headers ?? {}),
        'x-ccgateway-request-policy': JSON.stringify(policy),
      }, body: sentRaw, signal: AbortSignal.timeout(60000) });
      const text = await response.text();
      return { status: response.status, text, sent_raw: sentRaw, headers: Object.fromEntries(response.headers), captures: captures.slice(before),
        duration_ms: Date.now() - started, worker_log: workerLog.slice(-2000) };
    },
  };
}
module.exports = { startRuntime };

// Real Worker -> pinned native CLI -> loopback HTTP acceptance matrix.
// Run ONLY in a disposable --network none container; see the adjacent README.
// Expected content is assembled from native golden field spans, without
// importing the production recognizer, transformer, or policy merger.
// CC_VERSION (default 2.1.304) selects fixtures/native-environment-<version>.json
// and the CLI version the policies must name; artifact SHAs are pinned by the
// caller (PROBE_EXPECT_CLI_SHA, PROBE_EXPECT_WORKER_SHA) or reported unpinned.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { ccVersion, readFixture, pin, anyUnpinned, nativeCCVersion, nativeHeaderBlock } = require('./replay-helpers.cjs');

if (process.env.CCG_MATRIX_DISPOSABLE !== '1' || !fs.existsSync('/.dockerenv') ||
    process.getuid?.() !== 0 || fs.existsSync('/var/run/docker.sock')) {
  throw Error('Use a disposable Linux container, --network none, root harness, without Docker socket');
}
const version = ccVersion();
const cliInput = process.env.PROBE_CLI || '/input/claude-linux';
const workerInput = process.env.PROBE_WORKER || '/input/ccg-worker-linux';
const policiesFile = process.env.PROBE_POLICIES || '/input/config-matrix-policies.json';
const fixture = readFixture('native-environment', version, `the native environment renderer of ${version} with the inputs of native-environment-2.1.304.json`);
assert.equal(fixture.cli_version, version);
const matrix = JSON.parse(fs.readFileSync(policiesFile, 'utf8'));
assert.equal(matrix.cli_version, version);
assert(Array.isArray(matrix.cases) && matrix.cases.length >= 30);
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const environmentFields = ['platform_name', 'os_version', 'shell', 'primary_directory', 'additional_directories',
  'git_repository', 'worktree', 'scratchpad_directory', 'github_cli', 'agent_proxy'];
const fieldStarts = [
  ['primary_directory', ' - Primary working directory:'],
  ['worktree', ' - This is a git worktree'],
  ['worktree', ' - The git stash stack is shared'],
  ['git_repository', ' - Is a git repository:'],
  ['additional_directories', ' - Additional working directories'],
  ['platform_name', ' - Platform:'],
  ['shell', ' - Shell:'],
  ['os_version', ' - OS Version:'],
  ['scratchpad_directory', ' - Scratchpad directory:'],
  ['agent_proxy', ' - Outbound HTTPS goes through'],
  ['github_cli', ' - `gh` here is Claude Code'],
];
function segments(text) {
  const out = [];
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) || []) {
    let field = fieldStarts.find(([, prefix]) => line.startsWith(prefix))?.[0];
    if (line.startsWith('  - ') && out.at(-1)?.field === 'additional_directories') field = 'additional_directories';
    if (field && out.at(-1)?.field === field) out.at(-1).text += line;
    else out.push({ field, text: line });
  }
  return out;
}
const fullClient = fixture.nativeFullClient + '\n';
const fullUpdate = fixture.nativeUpdate + '\n';
const clientParts = segments(fullClient);
for (const field of environmentFields) assert(clientParts.some(part => part.field === field), 'golden fixture must cover ' + field);
const stableDirectory = '/work/matrix-context';
const serverFields = {
  primary_directory: ` - Primary working directory: ${stableDirectory}\n`,
  git_repository: ' - Is a git repository: false\n',
  platform_name: ' - Platform: linux\n',
  shell: ' - Shell: bash\n',
  os_version: ` - OS Version: ${os.type()} ${os.release()}\n`,
  // The controlled runtime has no additional roots, worktree, GitHub stand-in
  // or agent-proxy context. bg explicitly disables native scratchpad output.
  additional_directories: '', worktree: '', scratchpad_directory: '', github_cli: '', agent_proxy: '',
};
function expectedFull(sources) {
  return clientParts.map(part => {
    if (!part.field || !sources[part.field] || sources[part.field] === 'client') return part.text;
    return sources[part.field] === 'erase' ? '' : serverFields[part.field];
  }).join('');
}
function expectedUpdate(sources) {
  // This update follows the complete baseline in the same request. A selected
  // field already expresses the stable Worker snapshot (or its absence), so
  // the client's redundant old/new event must disappear as a whole.
  return segments(fullUpdate).map(part =>
    part.field && sources[part.field] && sources[part.field] !== 'client' ? '' : part.text).join('');
}
const wrap = text => '<system-reminder>\n' + text + '</system-reminder>';
const billingText = 'x-anthropic-billing-header: cc_version=2.1.302.b50; cc_entrypoint=client-fixture; cc_workload=keep;';
const baseBody = {
  model: 'claude-sonnet-4-6', max_tokens: 32, stream: false,
  system: [
    { type: 'text', text: billingText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'Unrelated system policy; Platform: win32 must stay verbatim.', cache_control: { type: 'ephemeral' } },
  ],
  messages: [{ role: 'user', content: [
    { type: 'text', text: wrap(fullClient), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'Ordinary user prose: Platform: win32; Shell: pwsh; never replace this.' },
    { type: 'text', text: '  \n', cache_control: { type: 'ephemeral' } },
  ] }],
  tools: [{ name: 'fixture_lookup', description: 'Opaque schema and tool text must survive.', input_schema: {
    type: 'object', properties: { marker: { type: 'string', description: 'Platform: win32; /client; cc_version=opaque;' } },
  } }],
};

const root = '/opt/ccgateway/cli/ccg-matrix';
fs.mkdirSync(root, { recursive: true, mode: 0o755 });
fs.copyFileSync(cliInput, root + '/claude');
fs.chownSync(root + '/claude', 0, 0);
fs.chmodSync(root + '/claude', 0o755);
const pins = {
  cli: { ...pin('Patched CLI', root + '/claude', ['PROBE_EXPECT_CLI_SHA']), path: cliInput },
  worker: pin('Worker', workerInput, ['PROBE_EXPECT_WORKER_SHA']),
};
const cliSHA = pins.cli.sha256;
const cli = JSON.parse(cp.execFileSync(root + '/claude', ['--ccgateway-info'], { encoding: 'utf8' }));
assert.equal(cli.version, version);
// The patch tag is the caller's to pin (the 2026-10-20 run fixed
// ccgateway-v12-feature-policy; profiles/linux-x64-<version>.json extension).
if (process.env.PROBE_EXPECT_CLI_PATCH) assert.equal(cli.patch, process.env.PROBE_EXPECT_CLI_PATCH);
fs.writeFileSync(root + '/manifest.json', JSON.stringify({ versions: { [version]: {
  path: 'claude', sha256: cliSHA, patch: cli.patch, modes: ['build', 'direct'],
} } }), { mode: 0o644 });
fs.writeFileSync('/opt/ccgateway/cli/active-runtime.json', JSON.stringify({
  schema_version: 1, manifest: 'ccg-matrix/manifest.json', version, request_mode: 'build',
}), { mode: 0o644 });
for (const directory of [stableDirectory, '/work/matrix-config', '/work/matrix-data', '/work/matrix-data/cache']) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chownSync(directory, 1000, 1000);
}
const captured = [], requestLines = [];
// Both modes' request line since CLI v24 (REQUEST-MODES §1.1).
const messagesPath = '/v1/messages?beta=true';
const server = http.createServer(async (req, res) => {
  let text = '';
  for await (const bytes of req) text += bytes;
  if (!req.url.startsWith('/v1/messages')) { res.writeHead(404).end(); return; }
  captured.push(JSON.parse(text));
  requestLines.push(req.url);
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ id: 'msg_matrix', type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
    content: [{ type: 'text', text: 'local matrix fixture only' }], stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 } }));
});
const baseURL = 'http://127.0.0.1:18087';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let worker, workerLog = '';
const record = {
  cc_version: version, cli, cli_sha256: cliSHA, worker_sha256: pins.worker.sha256, artifact_identity: pins, sha_unpinned: anyUnpinned(pins),
  policies_sha256: hash(fs.readFileSync(policiesFile)), fixture_sha256: hash(fixture),
  runtime: { working_directory: stableDirectory, shell: 'bash', session_kind: 'bg', account: 'API key',
    optional_fields_absent: ['additional_directories', 'worktree', 'scratchpad_directory', 'github_cli', 'agent_proxy'] },
  generated_parameters: ['thinking, temperature, output_config: native model parameter normalization (not compared here)'],
  cases: [],
};
async function waitHealthy() {
  for (let count = 0; count < 300; count++) {
    if (worker.exitCode !== null) throw Error('Worker exited: ' + workerLog);
    try {
      const response = await fetch(baseURL + '/health');
      const health = await response.json();
      if (response.status === 200) {
        assert.equal(health.cli_version, cli.version); assert.equal(health.cli_sha256, cliSHA);
        for (const capability of ['build_attachment_sources_v2', 'build_billing_sources_v1', 'build_content_preservation_v1', 'request_policy_mode_v1']) {
          assert(health.capabilities.includes(capability), 'unobserved capability: ' + capability);
        }
        return;
      }
    } catch (error) { if (error.code === 'ERR_ASSERTION') throw error; }
    await sleep(100);
  }
  throw Error('Worker did not become healthy: ' + workerLog);
}
function billingValue(system, field) {
  const text = (typeof system === 'string' ? [system] : system.map(block => block.text)).join('\n');
  return new RegExp('\\b' + field + '=([^;\\s]+);').exec(text)?.[1];
}
const billingPrefix = 'x-anthropic-billing-header:';
// The native values of the billing fields for a request, computed here:
// cc_version is the independent fingerprint of the first prompt
// (replay-helpers nativeCCVersion; request-input.js firstPromptText),
// cc_entrypoint the configured entrypoint, default sdk-cli (content-policy.js
// requestEntrypoint). The 2026-10-20 oracle read the actual values back and
// only checked their shape.
const nativeValues = (body, policy) => ({ cc_version: nativeCCVersion(body.messages, version), cc_entrypoint: policy.build_billing_entrypoint ?? 'sdk-cli' });
// expectedSystem applies the current billing rules (content-policy.js
// mergeBillingAttribution; build design §5.5), in both modes (direct since
// CLI v17, direct-billing.js):
// - no header opening the first block (billingMode missing / not_leading):
//   the native whole line goes in front, a client header elsewhere stays as
//   it is (2026-10-22); the 2026-10-20 oracle inserted only worker fields;
// - a leading header: worker-sourced fields take the native value, a missing
//   field is appended with the native value whatever its source.
// A header that cannot be edited is a refusal (runCase, billingMode ambiguous).
function expectedSystem(body, policy, outgoing, billingMode) {
  const blocks = typeof body.system === 'string' ? [{ type: 'text', text: body.system }] : structuredClone(body.system ?? []);
  const native = nativeValues(body, policy);
  if (billingMode === 'missing' || billingMode === 'not_leading') {
    const header = nativeHeaderBlock(outgoing.system?.[0], native);
    assert(header.ok, 'native billing header: ' + header.problems.join('; '));
    return [header.expected, ...blocks];
  }
  const sources = policy.build_billing_sources ?? {};
  const first = blocks[0];
  if (first?.type === 'text' && first.text.startsWith(billingPrefix)) {
    const end = first.text.indexOf('\n') < 0 ? first.text.length : first.text.indexOf('\n');
    let line = first.text.slice(0, end);
    const missing = [];
    for (const field of ['cc_version', 'cc_entrypoint']) {
      const pattern = new RegExp('(\\b' + field + '=)[^;\\s]+;');
      if (!pattern.test(line)) missing.push(field);
      else if (sources[field] === 'worker') line = line.replace(pattern, `$1${native[field]};`);
    }
    if (missing.length) {
      const trimmed = line.trimEnd();
      line = trimmed + (trimmed.endsWith(';') || trimmed.endsWith(':') ? ' ' : '; ') + missing.map(field => `${field}=${native[field]};`).join(' ') + line.slice(trimmed.length);
    }
    first.text = line + first.text.slice(end);
  }
  return blocks;
}
function carrierText(text, sources, variant) {
  if (variant === 'fenced' || variant === 'long_fence' || variant === 'absent' || variant === 'missing_field') return text;
  const eol = variant === 'crlf' ? '\r\n' : '\n';
  let next = text.replaceAll(fullClient.replaceAll('\n', eol), expectedFull(sources).replaceAll('\n', eol));
  if (variant === 'history_update') next = next.replaceAll(fullUpdate, expectedUpdate(sources));
  return next;
}
function assertContent(body, policy, outgoing, variant, billingMode) {
  if (policy.relay_mode === 'direct') {
    // Direct: the client's body with only the billing sources applied to its
    // header (CLI v17); the 2026-10-20 check required the body unchanged.
    assert.deepEqual(outgoing, { ...structuredClone(body), system: expectedSystem(body, policy, outgoing, billingMode) });
    return;
  }
  const sources = policy.build_attachment_sources ?? {};
  const expected = structuredClone(body);
  expected.system = expectedSystem(body, policy, outgoing, billingMode).map(block => ({ ...block,
    text: carrierText(block.text, sources, variant) }));
  for (const message of expected.messages) {
    if (message.role !== 'user' && message.role !== 'system') continue;
    if (typeof message.content === 'string') message.content = carrierText(message.content, sources, variant);
    else for (const block of message.content) {
      if (block.type === 'text') block.text = carrierText(block.text, sources, variant);
    }
  }
  assert.deepEqual(outgoing.system, expected.system, 'system content or cache attributes changed outside selected fields');
  assert.deepEqual(outgoing.messages, expected.messages, 'message content, role, ordering or metadata changed outside selected spans');
  assert.deepEqual(outgoing.tools, body.tools, 'tool definitions are not content-policy targets');
  for (const key of ['model', 'max_tokens', 'stream']) assert.deepEqual(outgoing[key], body[key], key + ' changed');
}
function policyFor(field, source) {
  const item = matrix.cases.find(item => item.expected_mode === 'build' && item.field === field && item.expected_source === source);
  assert(item, 'missing core-resolved matrix policy: ' + field + '=' + source);
  return item.worker_policy;
}
async function runCase(name, body, policy, details = {}, variant = 'full', billingMode) {
  const before = captured.length, started = Date.now();
  const result = { name, ...details, mode: policy.relay_mode, variant, status: 'failed' };
  try {
    const response = await fetch(baseURL + '/v1/messages', { method: 'POST',
      headers: { 'x-api-key': 'matrix-local-only', 'content-type': 'application/json', 'x-ccgateway-request-policy': JSON.stringify(policy) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    const text = await response.text();
    if (billingMode === 'ambiguous') {
      // Two header lines with a Worker-sourced field: refused with 400 before
      // any model call (build design §5.5 table, §8; content-policy.js
      // mergeBillingAttribution). The 2026-10-20 oracle sent it unchanged.
      assert.equal(response.status, 400, text.slice(0, 2000));
      assert.equal(captured.length, before, 'a refused request must not reach the model');
      result.status = 'passed'; result.refused = text.slice(0, 500);
    } else {
      assert.equal(response.status, 200, text.slice(0, 2000));
      assert.equal(captured.length, before + 1, 'a successful request must issue exactly one model POST');
      assert.equal(requestLines.at(-1), messagesPath, 'request line');
      const outgoing = captured.at(-1);
      assertContent(body, policy, outgoing, variant, billingMode);
      result.status = 'passed';
      result.non_target_content_equal = true;
      result.system_sha256 = hash(outgoing.system);
      result.messages_sha256 = hash(outgoing.messages);
      result.billing = { cc_version: billingValue(outgoing.system, 'cc_version'), cc_entrypoint: billingValue(outgoing.system, 'cc_entrypoint') };
      result.environment_actions = Object.fromEntries(environmentFields.map(field => {
        const source = policy.relay_mode === 'direct' ? 'client' : policy.build_attachment_sources?.[field] ?? 'client';
        return [field, source === 'worker' && serverFields[field] === '' ? 'removed_server_absent' : source];
      }));
    }
  } catch (error) {
    result.error = String(error.stack ?? error).slice(0, 7000);
    result.worker_log = workerLog.slice(-2000);
  }
  result.upstream_requests = captured.length - before;
  result.duration_ms = Date.now() - started;
  record.cases.push(result);
  process.stderr.write(`${result.status} ${name}\n`);
}
async function runSupplemental() {
  const platform = policyFor('build_attachment_sources.platform_name', 'worker');
  for (const variant of ['empty_reminders', 'crlf', 'absent', 'missing_field', 'fenced', 'long_fence', 'system_string', 'tool_result']) {
    const body = structuredClone(baseBody);
    let target = body.messages[0].content[0];
    if (variant === 'empty_reminders') target.text = '<system-reminder></system-reminder>\n' + target.text + '\n<system-reminder> \n </system-reminder>';
    if (variant === 'crlf') target.text = target.text.replaceAll('\n', '\r\n');
    if (variant === 'absent') target.text = 'No environment was provided.';
    if (variant === 'missing_field') target.text = wrap('# Environment\nYou have been invoked in the following environment: \n - Shell: pwsh\n');
    if (variant === 'fenced' || variant === 'long_fence') {
      target.text = 'The machine environment appears only as a code example in system.';
      body.system.push({ type: 'text', text: variant === 'fenced' ? '```\n' + fullClient + '```\n' :
        '````\n```\n' + fullClient + '```\n````\n', cache_control: { type: 'ephemeral' } });
    }
    if (variant === 'system_string') {
      body.system = 'Custom system prefix\n' + target.text + '\n' + billingText;
      target.text = 'Environment was moved into the supplied custom system.';
    }
    if (variant === 'tool_result') {
      body.messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: 'lookup-1', name: 'fixture_lookup', input: { marker: 'unchanged' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'lookup-1',
          content: [{ type: 'text', text: wrap(fullClient), cache_control: { type: 'ephemeral' } }] }] });
    }
    // A string system whose header is not at its start: the native line goes
    // in front (billingMode not_leading).
    await runCase('carrier-' + variant, body, platform, { source: 'core-resolved-policy-reused' }, variant, variant === 'system_string' ? 'not_leading' : undefined);
  }
  for (const field of ['primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory', 'github_cli', 'agent_proxy']) {
    for (const source of ['worker', 'erase']) {
      const body = structuredClone(baseBody);
      body.messages.push({ role: 'assistant', content: 'Continue the same session.' },
        { role: 'user', content: [{ type: 'text', text: wrap(fullUpdate), cache_control: { type: 'ephemeral' } }] });
      await runCase(`history-update-${field}-${source}`, body, policyFor('build_attachment_sources.' + field, source),
        { source: 'core-resolved-policy-reused' }, 'history_update');
    }
  }
  for (const field of ['cc_version', 'cc_entrypoint']) {
    const policy = policyFor('build_billing_sources.' + field, 'worker');
    const absent = structuredClone(baseBody);
    absent.system.shift();
    await runCase('billing-missing-block-' + field, absent, policy, {}, 'full', 'missing');
    const missing = structuredClone(baseBody);
    missing.system[0].text = billingText.replace(new RegExp('\\b' + field + '=[^;]+; ?'), '').trimEnd();
    await runCase('billing-missing-field-' + field, missing, policy);
  }
  const ambiguous = structuredClone(baseBody);
  ambiguous.system[0].text += '\nx-anthropic-billing-header: cc_version=duplicate;';
  // Two headers with a Worker-sourced field are refused (runCase, ambiguous).
  await runCase('billing-duplicate-worker-refused', ambiguous, policyFor('build_billing_sources.cc_entrypoint', 'worker'), {}, 'full', 'ambiguous');
  for (const source of ['worker', 'erase', 'client', 'worker', 'client']) {
    await runCase('adjacent-switch-shell-' + source + '-' + record.cases.length, structuredClone(baseBody),
      policyFor('build_attachment_sources.shell', source), { source: 'core-resolved-policy-reused' });
  }
}
(async () => {
  await new Promise(resolve => server.listen(18080, '127.0.0.1', resolve));
  const environment = {
    ...process.env, HOME: '/work', SHELL: '/bin/bash', CLAUDE_CODE_SESSION_KIND: 'bg',
    CCG_API_KEY: 'matrix-local-only', CCG_ADMIN_KEY: 'matrix-admin-local-only', CCG_BIND: '127.0.0.1:18087',
    CCG_WORKING_DIRECTORY: stableDirectory, CCG_DATA_DIR: '/work/matrix-data', CACHE_DIR: '/work/matrix-data/cache',
    CLAUDE_CONFIG_DIR: '/work/matrix-config', CLAUDE_SECURESTORAGE_CONFIG_DIR: '/work/matrix-config',
    ANTHROPIC_BASE_URL: 'http://127.0.0.1:18080', ANTHROPIC_API_KEY: 'local-mock-no-real-credentials',
    CCG_REQUEST_MODE: 'build', REQUEST_TIMEOUT: '60s', CLI_TIMEOUT: '60s',
    DISABLE_AUTOUPDATER: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'CLAUDE_CODE_ENTRYPOINT']) delete environment[key];
  worker = cp.spawn(workerInput, [], { uid: 1000, gid: 1000, cwd: stableDirectory, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [worker.stdout, worker.stderr]) stream.on('data', bytes => { workerLog = (workerLog + bytes).slice(-12000); });
  await waitHealthy();
  assert.equal(captured.length, 0, 'health and native capability probes must not issue model requests');
  for (const item of matrix.cases) {
    assert.equal(item.worker_policy.relay_mode, item.expected_mode);
    if (item.expected_mode === 'direct') {
      // Level none sends the billing entrypoint and sources, never attachment
      // sources (core feature_policy.go workerPolicy); direct applies them.
      assert(!item.worker_policy.build_attachment_sources, 'direct wire policy must not carry attachment sources');
    } else if (item.field?.includes('.')) {
      const [group, field] = item.field.split('.');
      assert.equal(item.worker_policy[group]?.[field] ?? 'client', item.expected_source, 'wire policy differs from core matrix expectation');
    } else if (item.expected_sources) {
      for (const [field, source] of Object.entries(item.expected_sources)) {
        assert.equal(item.worker_policy[item.field]?.[field] ?? 'client', source);
      }
    }
    await runCase(item.name, structuredClone(baseBody), item.worker_policy, {
      source: 'actual-Go-ResolveFeaturePolicy', field: item.field, expected_source: item.expected_source,
      expected_sources: item.expected_sources, expected_origin: item.expected_origin,
    });
  }
  await runSupplemental();
  record.status = record.cases.every(item => item.status === 'passed') ? 'passed' : 'failed';
  record.total = record.cases.length;
  record.passed = record.cases.filter(item => item.status === 'passed').length;
  record.failed = record.total - record.passed;
  record.upstream_requests = captured.length;
  if (record.failed) process.exitCode = 1;
})().catch(error => {
  record.status = 'failed'; record.fatal = String(error.stack ?? error); record.worker_log = workerLog;
  process.exitCode = 1;
}).finally(async () => {
  if (worker && worker.exitCode === null) {
    worker.kill('SIGTERM');
    await Promise.race([new Promise(resolve => worker.once('exit', resolve)), sleep(5000)]);
    if (worker.exitCode === null) worker.kill('SIGKILL');
  }
  server.close();
  const text = JSON.stringify(record, null, 2) + '\n';
  if (process.env.PROBE_REPORT) fs.writeFileSync(process.env.PROBE_REPORT, text);
  process.stdout.write(text);
});

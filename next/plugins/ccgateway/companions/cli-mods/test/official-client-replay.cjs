// Fresh official CC capture, then real Worker/CLI replay and ordinary
// Anthropic Messages fixtures. Disposable --network none container only.
// CC_VERSION (default 2.1.304) is the version of both the official client and
// the patched CLI; artifact SHAs are pinned by the caller (PROBE_OFFICIAL_SHA,
// PROBE_EXPECT_CLI_SHA, PROBE_EXPECT_WORKER_SHA) or reported as sha_unpinned.
// Expectations follow the current request rules (CLI-TEST-PLAN §9): the
// request line is /v1/messages?beta=true, build keeps the client's tool
// catalog and generation parameters, and both modes put the native billing
// header in front of a system without one.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const http = require('node:http'), cp = require('node:child_process');
const assert = require('node:assert/strict');
const { sha, normalizeSystem, same, differences, ccVersion, pin, anyUnpinned, nativeCCVersion, nativeHeaderBlock,
  billingLines, nativeDefaultPermitted, withoutTopLevelMember } = require('./replay-helpers.cjs');
if (process.env.CCG_REPLAY_DISPOSABLE !== '1' || !fs.existsSync('/.dockerenv') ||
    process.getuid?.() !== 0 || fs.existsSync('/var/run/docker.sock')) throw Error('Disposable isolated container required');
const version = ccVersion();
const officialPath = process.env.PROBE_OFFICIAL || `/input/claude-official-${version}`;
const patchedPath = process.env.PROBE_CLI || '/input/claude-linux';
const workerPath = process.env.PROBE_WORKER || '/input/ccg-worker-linux';
const pins = {
  official: pin('Official CLI', officialPath, ['PROBE_OFFICIAL_SHA']),
  cli: pin('Patched CLI', patchedPath, ['PROBE_EXPECT_CLI_SHA']),
  worker: pin('Worker', workerPath, ['PROBE_EXPECT_WORKER_SHA', 'PROBE_EXPECTED_WORKER_SHA256']),
};
const officialSHA = pins.official.sha256, patchedSHA = pins.cli.sha256;
// Both modes' request line since CLI v24 (REQUEST-MODES §1.1).
const messagesPath = '/v1/messages?beta=true';
const root = '/opt/ccgateway/cli/ccg-official-replay';
fs.mkdirSync(root, { recursive: true, mode: 0o755 });
fs.copyFileSync(patchedPath, root + '/claude'); fs.chownSync(root + '/claude', 0, 0); fs.chmodSync(root + '/claude', 0o755);
const cli = JSON.parse(cp.execFileSync(root + '/claude', ['--ccgateway-info'], { encoding: 'utf8' }));
assert.equal(cli.version, version, `patched CLI is Claude Code ${cli.version}, CC_VERSION is ${version}`);
fs.writeFileSync(root + '/manifest.json', JSON.stringify({ versions: { [version]: {
  path: 'claude', sha256: patchedSHA, patch: cli.patch, modes: ['build', 'direct'],
} } }), { mode: 0o644 });
fs.writeFileSync('/opt/ccgateway/cli/active-runtime.json', JSON.stringify({
  schema_version: 1, manifest: 'ccg-official-replay/manifest.json', version, request_mode: 'build',
}), { mode: 0o644 });
const clientHome = '/work/fresh-official-home', clientDirectory = '/work/fresh-official-project';
const workerHome = '/work/fresh-worker-home', workerDirectory = '/work/fresh-worker-project';
for (const directory of [clientHome, clientHome + '/config', clientDirectory, workerHome, workerHome + '/config',
  workerHome + '/data', workerHome + '/data/cache', workerDirectory]) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); fs.chownSync(directory, 1000, 1000);
}
const captured = [], auxiliary = [];
let phase = 'official', worker, workerLog = '', officialLog = '', officialHeaders = {};
const record = {
  cc_version: version, official_cli_sha256: officialSHA, patched_cli_sha256: patchedSHA, worker_sha256: pins.worker.sha256,
  cli, artifact_identity: pins, sha_unpinned: anyUnpinned(pins),
  freshness: { new_home: clientHome, new_working_directory: clientDirectory, credentials: 'synthetic mock API key',
    network: 'disposable container --network none; only loopback model stub' }, cases: [],
};
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const data of req) raw += data;
  if (req.method !== 'POST' || req.url.split('?')[0] !== '/v1/messages') {
    auxiliary.push({ phase, method: req.method, path: req.url });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(req.url.includes('count_tokens') ? { input_tokens: 1 } : {})); return;
  }
  const body = raw ? JSON.parse(raw) : {};
  captured.push({ phase, body, raw, url: req.url, headers: Object.fromEntries(['anthropic-version', 'anthropic-beta'].filter(k => req.headers[k]).map(k => [k, req.headers[k]])) });
  const message = { id: 'msg_official_fixture', type: 'message', role: 'assistant', model: body.model,
    content: [{ type: 'text', text: 'CAPTURED' }], stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 } };
  if (!body.stream) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(message)); return; }
  res.setHeader('content-type', 'text/event-stream');
  const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  event('message_start', { message: { ...message, content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 0 } } });
  event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'CAPTURED' } });
  event('content_block_stop', { index: 0 });
  event('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } });
  event('message_stop', {}); res.end();
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const baseEnvironment = {
  PATH: process.env.PATH, HOME: clientHome, SHELL: '/bin/bash', LANG: 'C.UTF-8',
  CLAUDE_CONFIG_DIR: clientHome + '/config', CLAUDE_SECURESTORAGE_CONFIG_DIR: clientHome + '/config',
  ANTHROPIC_API_KEY: 'fresh-local-mock-key-not-real', ANTHROPIC_BASE_URL: 'http://127.0.0.1:18080',
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_AUTOUPDATER: '1',
};
function runOfficial() {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--model', 'claude-sonnet-4-6', '--max-turns', '1', '--no-session-persistence',
      '--output-format', 'json', 'Reply with CAPTURED. Do not call any tools.'];
    const child = cp.spawn(officialPath, args, { uid: 1000, gid: 1000, cwd: clientDirectory, env: baseEnvironment, stdio: ['ignore', 'pipe', 'pipe'] });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 60000);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { officialLog = (officialLog + data).slice(-16000); });
    child.once('error', reject);
    child.once('exit', (code, signal) => { clearTimeout(timer); record.official_process = { code, signal, timed_out: timedOut, args };
      code === 0 ? resolve() : reject(Error('Official fresh capture failed: ' + officialLog)); });
  });
}
function stripContent(value) { return Object.fromEntries(Object.entries(value).filter(([key]) => !['system', 'messages', 'tools'].includes(key))); }
function mapCarriers(body, change) {
  const out = structuredClone(body);
  if (typeof out.system === 'string') out.system = change(out.system, 'system');
  else if (out.system) out.system = out.system.map((block, i) => block.type === 'text' ? { ...block, text: change(block.text, `system[${i}]`) } : block);
  for (const [index, message] of out.messages.entries()) {
    if (message.role !== 'user' && message.role !== 'system') continue;
    if (typeof message.content === 'string') message.content = change(message.content, `messages[${index}].content`);
    else message.content = message.content.map((block, i) => block.type === 'text' ? { ...block, text: change(block.text, `messages[${index}].content[${i}]`) } : block);
  }
  return out;
}
const environmentIntro = '# Environment\nYou have been invoked in the following environment:';
function environmentOnly(body, platform, osVersion, locations = []) {
  return mapCarriers(body, (text, location) => {
    if (!text.includes(environmentIntro)) return text;
    return text.replace(/^( - (?:Platform|OS Version): )([^\r\n]*)/gm, (line, prefix, value) => {
      locations.push({ location, field: prefix.includes('Platform') ? 'platform_name' : 'os_version', original: value });
      return prefix + (prefix.includes('Platform') ? platform : osVersion);
    });
  });
}
function billingCount(system) { return billingLines(system).length; }
function billingFieldsOf(system) {
  const text = normalizeSystem(system).map(block => block.text ?? '').join('\n');
  return Object.fromEntries([...text.matchAll(/\b(cc_version|cc_entrypoint)=([^;\s]+);/g)].map(match => [match[1], match[2]]));
}
const opensWithCompleteHeader = system => {
  const first = normalizeSystem(system)[0];
  if (first?.type !== 'text' || !first.text?.startsWith('x-anthropic-billing-header:')) return false;
  const line = first.text.split('\n')[0];
  return /\bcc_version=[^;\s]+;/.test(line) && /\bcc_entrypoint=[^;\s]+;/.test(line);
};
// withBilling is expected with the native header in front when its system
// does not open with a complete one (build always since CLI v16, direct
// since v17: content-policy.js mergeBillingAttribution, direct-billing.js;
// build design §5.5, §6.3). The header's cc_version is the independent
// fingerprint of the first prompt; cc_entrypoint is sdk-cli (no configured
// one). A string system becomes blocks in both modes (v20).
function withBilling(expected, wire, result) {
  const out = structuredClone(expected);
  const system = normalizeSystem(out.system);
  if (opensWithCompleteHeader(system)) { if (typeof out.system === 'string') out.system = system; return out; }
  const header = nativeHeaderBlock(normalizeSystem(wire.system)[0], { cc_version: nativeCCVersion(out.messages, version), cc_entrypoint: 'sdk-cli' });
  result.native_header = { ok: header.ok, problems: header.problems, fields: header.fields };
  assert(header.ok, 'native billing header: ' + header.problems.join('; '));
  out.system = [header.expected, ...system];
  return out;
}
async function replay(name, body, mode = 'build', sources = {}, billing = {}, expectedInput = body) {
  if (process.env.PROBE_CASE_FILTER && !name.includes(process.env.PROBE_CASE_FILTER)) return;
  const before = captured.filter(item => item.phase === 'worker').length;
  const result = { name, mode, status: 'failed', request_sha256: sha(body) };
  const sent = JSON.stringify(body);
  try {
    const response = await fetch('http://127.0.0.1:18087/v1/messages', { method: 'POST', headers: {
      ...(name.startsWith('official-') ? officialHeaders : {}),
      'x-api-key': 'replay-worker-key', 'content-type': 'application/json',
      'x-ccgateway-request-policy': JSON.stringify({ schema_version: 1, relay_mode: mode, cli_version: version,
        ...(mode === 'build' ? { build_attachment_sources: sources, build_billing_sources: billing } : {}) }),
    }, body: sent, signal: AbortSignal.timeout(60000) });
    const responseText = await response.text();
    result.http_status = response.status;
    assert.equal(response.status, 200, responseText.slice(0, 2000));
    const calls = captured.filter(item => item.phase === 'worker');
    assert.equal(calls.length, before + 1, 'exactly one upstream call per replay');
    const call = calls.at(-1), wire = call.body;
    result.request_line = call.url;
    assert.equal(call.url, messagesPath, 'request line');
    const expected = withBilling(typeof expectedInput === 'function' ? expectedInput(wire) : expectedInput, wire, result);
    result.system_equal = same(normalizeSystem(wire.system), normalizeSystem(expected.system));
    result.messages_equal = same(wire.messages, expected.messages);
    result.tools_equal = same(wire.tools ?? [], expected.tools ?? []);
    result.tool_names_before = (expected.tools ?? []).map(tool => tool.name);
    result.tool_names_after = (wire.tools ?? []).map(tool => tool.name);
    result.tools_by_name_differences = differences(
      Object.fromEntries((expected.tools ?? []).map(tool => [tool.name, tool])),
      Object.fromEntries((wire.tools ?? []).map(tool => [tool.name, tool])), 'tools_by_name');
    result.content_differences = [
      ...differences(normalizeSystem(expected.system), normalizeSystem(wire.system), 'system'),
      ...differences(expected.messages, wire.messages, 'messages'),
      ...differences(expected.tools ?? [], wire.tools ?? [], 'tools'),
    ];
    result.generation_parameter_differences = differences(stripContent(body), stripContent(wire));
    result.billing_count = billingCount(wire.system);
    result.billing_fields = billingFieldsOf(wire.system);
    result.full_body_equal = same(body, wire);
    assert(result.system_equal && result.messages_equal, 'non-target prompt content changed');
    // The tool catalog is the client's own in build too (CLI v26 FH,
    // ccgatewayWireTools): ToolSearch stays and a missing description stays
    // missing (CLI-TEST-PLAN §9).
    assert(result.tools_equal, 'tool catalog changed');
    if (mode === 'direct') {
      // Direct: the client's bytes except the system member (direct-billing.js).
      const expectedBody = { ...structuredClone(body), ...(body.system !== undefined || expected.system.length ? { system: expected.system } : {}) };
      assert(same(wire, expectedBody), 'direct body differs outside the billing header');
      if (same(expected.system, body.system)) assert.equal(call.raw, sent, 'direct raw bytes');
      else assert.equal(withoutTopLevelMember(call.raw, 'system'), withoutTopLevelMember(sent, 'system'), 'direct bytes outside system');
    } else {
      // Build generation parameters: the client's own except where the native
      // builder fills an absent control (mergeAdditionalParameters keeps
      // top_p, stop_sequences, context_management...: REQUEST-MODES §1.1).
      // metadata is the client's or none on this API-key runtime (build design §7).
      const changed = [...new Set([...Object.keys(stripContent(body)), ...Object.keys(stripContent(wire))])]
        .filter(key => !same(body[key], wire[key]) && !nativeDefaultPermitted(key, body, wire));
      result.unauthorized_parameter_changes = changed;
      assert.deepEqual(changed, [], 'generation parameters changed: ' + changed.join(','));
    }
    result.status = 'passed';
  } catch (error) { result.error = String(error.stack ?? error).slice(0, 5000); }
  result.upstream_requests = captured.filter(item => item.phase === 'worker').length - before;
  record.cases.push(result);
  process.stderr.write(`${result.status} ${name}\n`);
}
async function waitWorker() {
  for (let i = 0; i < 300; i++) {
    if (worker.exitCode !== null) throw Error('Worker startup failed: ' + workerLog);
    try { const response = await fetch('http://127.0.0.1:18087/health'); const health = await response.json();
      if (response.status === 200) { assert.equal(health.cli_sha256, patchedSHA); return; } } catch (error) { if (error.code === 'ERR_ASSERTION') throw error; }
    await sleep(100);
  }
  throw Error('Worker readiness timed out: ' + workerLog);
}
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';
const image = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pixel } };
(async () => {
  await new Promise(resolve => server.listen(18080, '127.0.0.1', resolve));
  await runOfficial();
  const officialRequests = captured.filter(item => item.phase === 'official');
  assert.equal(officialRequests.length, 1, 'fresh one-turn capture must generate one model request');
  const original = officialRequests[0].body;
  officialHeaders = officialRequests[0].headers;
  const locations = [];
  const sameMachine = environmentOnly(original, 'linux', `${os.type()} ${os.release()}`, locations);
  record.official_capture = {
    count: officialRequests.length, body_sha256: sha(original), body_keys: Object.keys(original), request_line: officialRequests[0].url,
    system_blocks: normalizeSystem(original.system).length, message_count: original.messages.length, tool_count: original.tools?.length ?? 0,
    environment_fields: locations, billing_count: billingCount(original.system), billing_fields: billingFieldsOf(original.system),
    headers: officialRequests[0].headers, generated_metadata_sha256: sha(original.metadata ?? null),
  };
  assert(locations.some(item => item.field === 'platform_name') && locations.some(item => item.field === 'os_version'), 'official capture contains no machine environment');
  assert.equal(billingCount(original.system), 1);
  // The official client's own cc_version is the independent oracle's value
  // (request-input.js firstPromptText reproduces what the client hashed).
  assert.equal(billingFieldsOf(original.system).cc_version, nativeCCVersion(original.messages, version), 'official fingerprint oracle');
  if (process.env.PROBE_CAPTURE) fs.writeFileSync(process.env.PROBE_CAPTURE, JSON.stringify(original, null, 2) + '\n');
  phase = 'worker';
  worker = cp.spawn(workerPath, [], { uid: 1000, gid: 1000, cwd: workerDirectory, env: {
    ...baseEnvironment, HOME: workerHome, CLAUDE_CONFIG_DIR: workerHome + '/config', CLAUDE_SECURESTORAGE_CONFIG_DIR: workerHome + '/config',
    CCG_BIND: '127.0.0.1:18087', CCG_API_KEY: 'replay-worker-key', CCG_ADMIN_KEY: 'replay-admin-key', CCG_REQUEST_MODE: 'build',
    CCG_WORKING_DIRECTORY: workerDirectory, CCG_DATA_DIR: workerHome + '/data', CACHE_DIR: workerHome + '/data/cache',
    REQUEST_TIMEOUT: '60s', CLI_TIMEOUT: '60s',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [worker.stdout, worker.stderr]) stream.on('data', data => { workerLog = (workerLog + data).slice(-12000); });
  await waitWorker();
  await replay('official-original-all-client', original);
  await replay('official-original-direct', original, 'direct');
  await replay('official-platform-os-native-same-machine', original, 'build',
    { platform_name: 'worker', os_version: 'worker' }, {}, sameMachine);
  const perturbed = environmentOnly(original, 'derived-client-platform-fixture', 'derived-client-os-fixture');
  await replay('official-derived-two-field-variant-only-platform-os-change', perturbed, 'build',
    { platform_name: 'worker', os_version: 'worker' }, {}, sameMachine);
  const missingBilling = structuredClone(original);
  missingBilling.system = normalizeSystem(missingBilling.system).filter(block => !block.text?.startsWith('x-anthropic-billing-header:'));
  assert.equal(billingCount(missingBilling.system), 0);
  // The inserted header must carry the cc_version the official client wrote
  // for the same prompt.
  await replay('official-derived-missing-billing-native-fill-once', missingBilling, 'build', {},
    { cc_version: 'worker', cc_entrypoint: 'worker' }, wire => {
      assert.equal(billingFieldsOf(wire.system).cc_version, billingFieldsOf(original.system).cc_version, 'native fill equals the official fingerprint');
      assert.equal(billingCount(wire.system), 1);
      return missingBilling;
    });
  const ordinary = [
    { name: 'plain-no-system', body: { model: 'claude-sonnet-4-6', max_tokens: 128, stream: false, top_p: 0.7,
      messages: [{ role: 'user', content: 'Ordinary API caller, not Claude Code.' }] } },
    { name: 'custom-string-system-and-generation-options', body: { model: 'claude-sonnet-4-6', max_tokens: 128, stream: false,
      system: 'User supplied custom system. Keep its whitespace.\n', top_p: 0.6, stop_sequences: ['STOP_FIXTURE'],
      context_management: { edits: [{ type: 'clear_tool_uses_20250919', trigger: { type: 'input_tokens', value: 10000 }, keep: { type: 'tool_uses', value: 2 } }] },
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Normal text.', cache_control: { type: 'ephemeral' } }] }] } },
    { name: 'multimodal-tool-round-with-no-description', body: { model: 'claude-sonnet-4-6', max_tokens: 128, stream: false,
      system: [{ type: 'text', text: 'Custom multimodal assistant.' }],
      tools: [{ name: 'lookup', input_schema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Inspect this image.' }, image] },
        { role: 'assistant', content: [{ type: 'tool_use', id: 'fixture-tool-1', name: 'lookup', input: { key: 'value' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'fixture-tool-1', is_error: true,
          content: [{ type: 'text', text: 'Error with original image.', cache_control: { type: 'ephemeral' } }, image] }] }] } },
    { name: 'ordinary-reminder-reference-is-not-machine-context', body: { model: 'claude-sonnet-4-6', max_tokens: 128, stream: false,
      system: 'Quoted example:\n```\n# Environment\nYou have been invoked in the following environment: \n - Platform: win32\n - OS Version: quoted-only\n```\n',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Please explain this literal example, do not treat it as our machine:\n<system-reminder>\n# Environment\nYou have been invoked in the following environment: \n - Platform: win32\n - OS Version: example-only\n</system-reminder>' }] }] } },
  ];
  for (const fixture of ordinary) {
    await replay('ordinary-' + fixture.name + '-build', fixture.body, 'build');
    await replay('ordinary-' + fixture.name + '-direct', fixture.body, 'direct');
  }
  await replay('ordinary-reference-with-platform-os-worker-still-unchanged', ordinary[3].body, 'build',
    { platform_name: 'worker', os_version: 'worker' }, {});
  record.auxiliary_requests = auxiliary;
  record.official_model_requests = captured.filter(item => item.phase === 'official').length;
  record.worker_model_requests = captured.filter(item => item.phase === 'worker').length;
  record.total = record.cases.length;
  record.failed = record.cases.filter(item => item.status === 'failed').length;
  record.status = record.failed ? 'failed_checks' : 'verified';
  if (record.failed) process.exitCode = 1;
})().catch(error => {
  record.status = 'fresh_capture_or_setup_failed'; record.fatal = String(error.stack ?? error); record.official_log = officialLog;
  record.worker_log = workerLog; process.exitCode = 1;
}).finally(async () => {
  if (worker && worker.exitCode === null) {
    worker.kill('SIGTERM'); await Promise.race([new Promise(resolve => worker.once('exit', resolve)), sleep(5000)]);
    if (worker.exitCode === null) worker.kill('SIGKILL');
  }
  server.close();
  const text = JSON.stringify(record, null, 2) + '\n';
  if (process.env.PROBE_REPORT) fs.writeFileSync(process.env.PROBE_REPORT, text);
  process.stdout.write(text);
});

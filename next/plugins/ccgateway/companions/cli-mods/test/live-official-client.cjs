// Unmodified official CLI -> byte-preserving recording ingress -> real Worker
// -> patched CLI -> loopback SSE model stub -> official CLI result.
// No captured-body replay and no production recognizer in the expected oracle.
// CC_VERSION (default 2.1.304) is the version of the official client and of
// the patched CLI; the official SHA is pinned by PROBE_OFFICIAL_SHA, the CLI
// and Worker by assembly-runtime.cjs (PROBE_EXPECT_CLI_SHA,
// PROBE_EXPECT_WORKER_SHA), else reported as sha_unpinned.
const fs = require('node:fs'), http = require('node:http'), cp = require('node:child_process');
const crypto = require('node:crypto'), assert = require('node:assert/strict'), os = require('node:os');
const { startRuntime } = require('./assembly-runtime.cjs');
const { sha, normalizeSystem, differences, same, ccVersion, pin, anyUnpinned, nativeCCVersion, nativeDefaultPermitted, withoutTopLevelMember } = require('./replay-helpers.cjs');
const version = ccVersion();
const official = process.env.PROBE_OFFICIAL || `/input/claude-official-${version}`;
const officialPin = pin('Official CLI', official, ['PROBE_OFFICIAL_SHA']);
const officialSHA = officialPin.sha256;
const officialVersion = cp.execFileSync(official, ['--version'], { encoding: 'utf8', timeout: 15000 }).trim();
assert(officialVersion === version || officialVersion.startsWith(version + ' '), `official client reports ${officialVersion}, CC_VERSION is ${version}`);
// Both modes' request line since CLI v24 (REQUEST-MODES §1.1).
const messagesPath = '/v1/messages?beta=true';
const clientKey = 'assembly-gateway-key';
const clientBase = '/work/live-official';
const sessionID = crypto.randomUUID();
const multi = { build_attachment_sources: { primary_directory: 'worker', shell: 'erase' },
  build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' } };
const scenarios = [
  { id: 'default_client', policy: {} },
  { id: 'single_directory', policy: { build_attachment_sources: { primary_directory: 'worker' } }, must_change: ['primary_directory'] },
  { id: 'single_billing_entrypoint', entrypoint: 'sdk-ts', policy: { build_billing_sources: { cc_entrypoint: 'worker' } }, must_change: ['cc_entrypoint'] },
  { id: 'multiple_fields', entrypoint: 'sdk-ts', policy: multi, must_change: ['primary_directory', 'shell', 'cc_entrypoint'] },
  { id: 'mixed_sources', entrypoint: 'sdk-ts', policy: {
    build_attachment_sources: { primary_directory: 'client', platform_name: 'worker', shell: 'erase', os_version: 'client' },
    build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'client' },
  }, must_change: ['shell'] },
  { id: 'direct_with_policy', entrypoint: 'sdk-ts', mode: 'direct', policy: multi },
  { id: 'exclude_dynamic_sections', entrypoint: 'sdk-ts', flags: ['--exclude-dynamic-system-prompt-sections'], policy: multi,
    must_change: ['primary_directory', 'shell', 'cc_entrypoint'] },
  { id: 'custom_system', entrypoint: 'sdk-ts', flags: ['--system-prompt', 'LIVE CUSTOM SYSTEM: keep this text exactly.', '--exclude-dynamic-system-prompt-sections'],
    policy: multi, custom_system: true },
  { id: 'session_first', entrypoint: 'sdk-ts', session: true, flags: ['--session-id', sessionID], policy: {} },
  { id: 'session_resume', entrypoint: 'sdk-ts', session: true, flags: ['--resume', sessionID], policy: multi,
    must_change: ['primary_directory', 'shell', 'cc_entrypoint'], resumed: true },
];
const report = {
  suite: `live-unmodified-official-${version}-through-worker`, cc_version: version,
  source_cli_sha256: officialSHA, source_cli_version: officialVersion, harness_sha256: sha(fs.readFileSync(__filename)),
  provenance: 'Every model request is freshly emitted by the official executable during this run; the ingress forwards its original bytes and only supplies the trusted test policy header.',
  byte_evidence: 'Ingress passes the original Buffer to fetch without reserialization (source-level evidence). Direct compares every byte outside the system member (all bytes when the billing policy changes nothing); the system member is compared structurally. Build compares structured content and selected transformations; no raw-byte tap inside Worker is claimed.',
  scope: 'One isolated network-none Docker container, separate official and patched CLI processes, synthetic API keys, loopback model responses. No real Anthropic model calls and no production gateway deployment.',
  cases: [], auxiliary_requests: [], ingress_errors: [],
};
let runtime, proxy, active;
const ingress = [];
function textCarriers(body, change) {
  if (typeof body.system === 'string') body.system = change(body.system, 'system');
  else for (const [i, block] of (body.system ?? []).entries())
    if (block.type === 'text') block.text = change(block.text, `system[${i}]`);
  for (const [i, message] of body.messages.entries()) {
    if (!['user', 'system'].includes(message.role)) continue;
    if (typeof message.content === 'string') message.content = change(message.content, `messages[${i}].content`);
    else for (const [j, block] of message.content.entries())
      if (block.type === 'text') block.text = change(block.text, `messages[${i}].content[${j}]`);
  }
}
function billingLines(body) {
  return normalizeSystem(body.system).flatMap(block => (block.text ?? '').split('\n'))
    .filter(line => line.startsWith('x-anthropic-billing-header:'));
}
// Direct applies only the billing sources to the client's leading header
// (CLI v17, direct-billing.js; build design §6.3): the environment stays as
// sent. Build applies both.
function expectedFor(input, scenario) {
  const expected = structuredClone(input), changes = [], locations = [];
  const selected = scenario.mode === 'direct' ? {} : scenario.policy.build_attachment_sources ?? {};
  const names = { 'Primary working directory': 'primary_directory', Platform: 'platform_name', Shell: 'shell', 'OS Version': 'os_version' };
  const worker = { primary_directory: runtime.workingDirectory, platform_name: 'linux', shell: 'bash', os_version: `${os.type()} ${os.release()}` };
  textCarriers(expected, (text, location) => {
    const marker = '# Environment\nYou have been invoked in the following environment:';
    const start = text.indexOf(marker);
    if (start < 0) return text;
    let end = text.indexOf('</system-reminder>', start);
    if (end < 0) end = text.length;
    const nextHeading = /\n#{1,6} /.exec(text.slice(start + marker.length, end));
    if (nextHeading) end = start + marker.length + nextHeading.index;
    const section = text.slice(start, end);
    locations.push(location);
    const replacement = section.replace(/^ - (Primary working directory|Platform|Shell|OS Version): ([^\r\n]*)(\r?\n|$)/gm,
      (line, title, originalValue, newline) => {
        const field = names[title], source = selected[field] ?? 'client';
        const next = source === 'erase' ? '' : source === 'worker' ? ` - ${title}: ${worker[field]}${newline}` : line;
        if (next !== line) changes.push({ field, location, source, before: originalValue, after: source === 'erase' ? null : worker[field] });
        return next;
      });
    return text.slice(0, start) + replacement + text.slice(end);
  });
  // The native cc_version fingerprints the first prompt, not the reminder in
  // front of it (request-input.js firstPromptText, 2026-10-21).
  const nativeVersion = nativeCCVersion(expected.messages, version);
  const billing = scenario.policy.build_billing_sources ?? {};
  const server = { cc_version: nativeVersion, cc_entrypoint: 'sdk-cli' };
  for (const [i, block] of normalizeSystem(expected.system).entries()) {
    if (!block.text?.startsWith('x-anthropic-billing-header:')) continue;
    for (const field of ['cc_version', 'cc_entrypoint']) if (billing[field] === 'worker') {
      const pattern = new RegExp(`\\b${field}=([^;\\s]+);`);
      assert(pattern.test(block.text), `Official billing field missing: ${field}`);
      block.text = block.text.replace(pattern, (whole, previous) => {
        if (previous !== server[field]) changes.push({ field, location: `system[${i}]`, source: 'worker', before: previous, after: server[field] });
        return `${field}=${server[field]};`;
      });
    }
  }
  assert.equal(billingLines(input).length, 1, 'Fresh official input must contain one billing block');
  return { expected, changes, locations };
}
function createDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); fs.chownSync(directory, 1000, 1000);
}
async function runOfficial(scenario) {
  const context = scenario.session ? 'conversation' : scenario.id;
  const home = `${clientBase}/${context}/home`, cwd = `${clientBase}/${context}/project`;
  for (const directory of [clientBase, `${clientBase}/${context}`, home, home + '/config', cwd]) createDirectory(directory);
  const prompt = scenario.resumed ? 'LIVE SECOND TURN: continue our existing conversation. Reply with ASSEMBLY. Do not call tools.'
    : 'LIVE FIRST TURN: reply with ASSEMBLY. Do not call tools.';
  const args = ['--print', '--model', 'claude-sonnet-4-6', '--max-turns', '1', '--output-format', 'json',
    ...(scenario.session ? [] : ['--no-session-persistence']), ...(scenario.flags ?? []), prompt];
  const environment = {
    PATH: process.env.PATH, HOME: home, SHELL: '/bin/bash', LANG: 'C.UTF-8',
    CLAUDE_CONFIG_DIR: home + '/config', CLAUDE_SECURESTORAGE_CONFIG_DIR: home + '/config',
    CLAUDE_CODE_ENTRYPOINT: scenario.entrypoint ?? 'sdk-cli',
    ANTHROPIC_API_KEY: clientKey, ANTHROPIC_BASE_URL: 'http://127.0.0.1:18089',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_AUTOUPDATER: '1',
  };
  return await new Promise((resolve, reject) => {
    const child = cp.spawn(official, args, { uid: 1000, gid: 1000, cwd, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 90000);
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-16000); });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timeout);
      let result; try { result = JSON.parse(stdout); } catch {}
      resolve({ args, home, cwd, code, signal, timed_out: timedOut, stdout, stderr, result });
    });
  });
}
function nativeMetadata(value) {
  try {
    const parsed = JSON.parse(value.user_id);
    return same(Object.keys(value).sort(), ['user_id']) &&
      same(Object.keys(parsed).filter(k => k !== 'parent_session_id').sort(), ['account_uuid', 'device_id', 'session_id']) &&
      (parsed.parent_session_id === undefined || /^[a-f0-9-]{36}$/.test(parsed.parent_session_id)) &&
      /^[a-f0-9]{64}$/.test(parsed.device_id) && parsed.account_uuid === '' &&
      /^[a-f0-9-]{36}$/.test(parsed.session_id);
  } catch { return false; }
}
(async () => {
  runtime = await startRuntime();
  report.identity = runtime.identity;
  report.artifact_identity = { official: officialPin, ...runtime.identity.pins };
  report.sha_unpinned = anyUnpinned(report.artifact_identity);
  proxy = http.createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks), requestPath = req.url.split('?')[0];
      if (req.method !== 'POST' || requestPath !== '/v1/messages') {
        report.auxiliary_requests.push({ case: active?.id, method: req.method, path: req.url });
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(requestPath.endsWith('count_tokens') ? { input_tokens: 1 } : {})); return;
      }
      assert(active, 'No active official scenario');
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers))
        if (!['host', 'content-length', 'connection', 'transfer-encoding'].includes(key) && value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      const policy = { schema_version: 1, relay_mode: active.mode ?? 'build', cli_version: version, ...active.policy };
      headers.set('x-ccgateway-request-policy', JSON.stringify(policy));
      const entry = { case_id: active.id, raw: raw.toString('utf8'), body: JSON.parse(raw.toString('utf8')), raw_sha256: sha(raw),
        client_key_matched: req.headers['x-api-key'] === clientKey,
        client_supplied_policy: req.headers['x-ccgateway-request-policy'] !== undefined,
        client_headers: Object.fromEntries(['user-agent', 'anthropic-beta', 'anthropic-version'].filter(k => req.headers[k]).map(k => [k, req.headers[k]])) };
      ingress.push(entry);
      const upstream = await fetch('http://127.0.0.1:18087' + req.url, {
        method: 'POST', headers, body: raw, signal: AbortSignal.timeout(75000),
      });
      entry.http_status = upstream.status;
      const responseHeaders = Object.fromEntries(['content-type', 'retry-after', 'request-id'].filter(k => upstream.headers.has(k)).map(k => [k, upstream.headers.get(k)]));
      res.writeHead(upstream.status, responseHeaders);
      const responseChunks = [];
      for await (const chunk of upstream.body) { responseChunks.push(Buffer.from(chunk)); res.write(chunk); }
      entry.worker_response = Buffer.concat(responseChunks).toString('utf8');
      res.end();
    } catch (error) {
      report.ingress_errors.push({ case_id: active?.id, message: String(error.stack ?? error) });
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { type: 'api_error', message: String(error.message) } }));
    }
  });
  await new Promise(resolve => proxy.listen(18089, '127.0.0.1', resolve));
  for (const scenario of scenarios) {
    active = scenario;
    const start = Date.now(), before = runtime.captures.length, ingressBefore = ingress.length;
    const row = { id: scenario.id, policy: scenario.policy, mode: scenario.mode ?? 'build', checks: [], status: 'pass' };
    const check = (id, condition, evidence) => row.checks.push({ id, status: condition ? 'pass' : 'fail', ...(evidence ? { evidence } : {}) });
    try {
      row.process = await runOfficial(scenario);
      check('official.exit-zero', row.process.code === 0 && !row.process.timed_out);
      check('official.result-received', row.process.result?.result === 'ASSEMBLY' && row.process.result?.is_error === false);
      const received = ingress.slice(ingressBefore), sent = runtime.captures.slice(before);
      check('official.one-live-request', received.length === 1, { count: received.length });
      check('worker.one-upstream-request', sent.length === 1, { count: sent.length });
      if (received.length === 1 && sent.length === 1) {
        const inbound = received[0], outgoing = sent[0], input = inbound.body, wire = outgoing.body;
        row.input = input; row.output = wire; row.client_headers = inbound.client_headers;
        row.ingress_sha256 = inbound.raw_sha256; row.outgoing_sha256 = sha(outgoing.raw);
        check('ingress.client-auth', inbound.client_key_matched && !inbound.client_supplied_policy);
        check('ingress.official-user-agent', String(inbound.client_headers['user-agent']).startsWith(`claude-cli/${version} `));
        check('worker.http-200', inbound.http_status === 200);
        row.outgoing_transport = { method: outgoing.method, path: outgoing.url };
        check('worker.method-and-endpoint', outgoing.method === 'POST' && outgoing.url === messagesPath, { url: outgoing.url, expected: messagesPath });
        check('worker.auth-isolated', outgoing.auth_uses_worker_credential && !outgoing.authorization_present && !outgoing.leaked_policy_header);
        check('worker.sse-complete', inbound.worker_response.includes('event: message_stop\n'));
        const { expected, changes, locations } = expectedFor(input, scenario);
        row.expected_changes = changes; row.environment_locations = locations;
        row.diffs = {
          system: differences(normalizeSystem(expected.system), normalizeSystem(wire.system)),
          messages: differences(expected.messages, wire.messages), tools: differences(expected.tools, wire.tools),
        };
        check('content.system', row.diffs.system.length === 0);
        check('content.messages', row.diffs.messages.length === 0);
        check('content.tools', row.diffs.tools.length === 0);
        check('billing.one-block', billingLines(wire).length === 1);
        if (scenario.mode === 'direct') {
          // Direct keeps every byte outside the system member; with nothing to
          // change in the header, every byte (direct-billing.js). The
          // 2026-10-20 check required all bytes whatever the policy.
          const outside = raw => withoutTopLevelMember(raw, 'system');
          if (changes.length) check('direct.raw-bytes-outside-system', outside(outgoing.raw) !== null && outside(outgoing.raw) === outside(inbound.raw));
          else check('direct.raw-bytes', outgoing.raw === inbound.raw);
          check('direct.whole-body', same(wire, { ...input, system: expected.system }), { diff: differences({ ...input, system: expected.system }, wire) });
        }
        else {
          // The Worker resolves an API-key account's identity as client: the
          // official client's own metadata goes out unchanged (engine
          // request_identity.go resolveRequestIdentity; request-identity.js
          // applyBuildMetadata; build design §7). The 2026-10-20 check only
          // asked for native-shaped metadata.
          check('metadata.client-value', nativeMetadata(input.metadata) && same(wire.metadata, input.metadata), { input: input.metadata, output: wire.metadata });
          const parameters = object => Object.fromEntries(Object.entries(object).filter(([k]) => !['system', 'messages', 'tools', 'metadata'].includes(k)));
          row.diffs.parameters = differences(parameters(input), parameters(wire))
            .filter(diff => !nativeDefaultPermitted(diff.path.split(/[.[]/)[0], input, wire));
          check('parameters.preserved', row.diffs.parameters.length === 0);
        }
        for (const field of scenario.must_change ?? []) check('actual-change.' + field, changes.some(c => c.field === field));
        if (scenario.id === 'exclude_dynamic_sections')
          check('exclude.environment-in-first-user', locations.length > 0 && locations.every(location => location.startsWith('messages[0].content')));
        if (scenario.custom_system) check('custom-system.retained', normalizeSystem(wire.system).some(b => b.text?.includes('LIVE CUSTOM SYSTEM: keep this text exactly.')));
        if (scenario.session) check('session.expected-id', row.process.result?.session_id === sessionID);
        if (scenario.resumed) {
          check('resume.history-present', input.messages.some(m => m.role === 'assistant' && JSON.stringify(m.content).includes('ASSEMBLY')));
          check('resume.first-user-turn', JSON.stringify(input.messages).includes('LIVE FIRST TURN:'));
          check('resume.second-user-turn', JSON.stringify(input.messages).includes('LIVE SECOND TURN:'));
          check('resume.same-session', row.process.result?.session_id === sessionID);
        }
        const inputBetas = String(inbound.client_headers['anthropic-beta'] ?? '').split(',').filter(Boolean);
        const outputBetas = String(outgoing.headers['anthropic-beta'] ?? '').split(',');
        check('headers.client-betas-retained', inputBetas.every(beta => outputBetas.includes(beta)));
      }
    } catch (error) { row.error = String(error.stack ?? error); row.status = 'fail'; }
    row.model_requests = runtime.captures.length - before;
    row.duration_ms = Date.now() - start;
    if (row.checks.some(c => c.status === 'fail')) row.status = 'fail';
    report.cases.push(row);
    process.stderr.write(`${row.status} ${scenario.id}\n`);
  }
  report.summary = { pass: report.cases.filter(c => c.status === 'pass').length, fail: report.cases.filter(c => c.status === 'fail').length };
  report.model_requests = runtime.captures.length;
  report.status = report.summary.fail || report.ingress_errors.length || report.cases.length !== scenarios.length ? 'fail' : 'pass';
  if (report.status !== 'pass') process.exitCode = 1;
})().catch(error => { report.status = 'fail'; report.fatal = String(error.stack ?? error); process.exitCode = 1; })
  .finally(async () => {
    if (proxy) await new Promise(resolve => proxy.close(resolve));
    if (runtime) await runtime.close();
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  });

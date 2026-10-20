// Grouped native assembly suite. HTTP 200 is not a pass oracle.
// Known tool/parameter drops fail; unproved native-model rules remain unknown.
const fs = require('node:fs'), path = require('node:path');
const { startRuntime } = require('./assembly-runtime.cjs');
const { sha, normalizeSystem, same, differences, definitionHash } = require('./replay-helpers.cjs');
const manifestPath = process.env.PROBE_MANIFEST || path.join(__dirname, 'fixtures/assembly-cases.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const record = { suite: manifest.suite, scope: manifest.scope, manifest_sha256: sha(fs.readFileSync(manifestPath)),
  cases: [], branch_coverage_claim: 'Cases exercise named assembly contracts; this is not complete AST branch coverage.' };
let runtime, currentEnvironment = '';
const stripContent = body => Object.fromEntries(Object.entries(body).filter(([key]) => !['system', 'messages', 'tools'].includes(key)));
function validNativeMetadata(value) {
  try {
    if (!same(Object.keys(value).sort(), ['user_id'])) return false;
    const identity = JSON.parse(value.user_id);
    return same(Object.keys(identity).sort(), ['account_uuid', 'device_id', 'session_id']) &&
      /^[a-f0-9]{64}$/.test(identity.device_id) && identity.account_uuid === '' &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(identity.session_id);
  } catch { return false; }
}
function applyPatch(target, patch) {
  let parent = target;
  for (const key of patch.path.slice(0, -1)) parent = parent[key];
  parent[patch.path.at(-1)] = structuredClone(patch.value);
}
function expectedContent(test, wire, checks) {
  const expected = structuredClone(test.body);
  expected.system = normalizeSystem(expected.system);
  for (const patch of test.contract.patches ?? []) applyPatch(expected, patch);
  if (test.contract.content === 'billing_insert') {
    const lines = (wire.system ?? []).flatMap(block => (block.text ?? '').split('\n')).filter(line => line.startsWith('x-anthropic-billing-header:'));
    const version = /\bcc_version=([^;\s]+);/.exec(lines[0] ?? '')?.[1];
    const entrypoint = /\bcc_entrypoint=([^;\s]+);/.exec(lines[0] ?? '')?.[1];
    checks('billing.native-version', /^2\.1\.304\.[a-f0-9]{3}$/.test(version ?? ''), { actual: version });
    // Wire message.isMeta is not lifted onto the native CC record.
    const firstUser = expected.messages.find(message => message.role === 'user');
    const text = typeof firstUser?.content === 'string' ? firstUser.content :
      firstUser?.content?.find(block => block.type === 'text')?.text ?? '';
    const fingerprint = sha('59cf53e54c78' + [4, 7, 20].map(index => text[index] ?? '0').join('') + '2.1.304').slice(0, 3);
    const expectedVersion = '2.1.304.' + fingerprint;
    checks('billing.independent-fingerprint', version === expectedVersion, { expected: expectedVersion, actual: version });
    checks('billing.native-entrypoint', entrypoint === 'sdk-cli', { actual: entrypoint });
    checks('billing.unique-block', lines.length === 1, { actual: lines.length });
    expected.system.unshift({ type: 'text', text: `x-anthropic-billing-header: cc_version=${expectedVersion}; cc_entrypoint=sdk-cli;` });
  }
  return expected;
}
function evaluate(test, response) {
  const result = { id: test.id, group: test.group, source_symbols: test.source_symbols, mode: test.mode,
    fixture_source: test.fixture_source, transport: test.transport ?? 'worker-http', definition_sha256: definitionHash(test),
    contract: test.contract, runtime_environment: test.runtime_environment ?? {},
    actual_identity: runtime.identity, status: 'pass', checks: [], diffs: {},
    actual_http_status: response.status, upstream_requests: response.captures.length, duration_ms: response.duration_ms };
  function check(id, ok, evidence) { result.checks.push({ id, status: ok ? 'pass' : 'fail', ...(evidence ? { evidence } : {}) }); }
  const contract = test.contract;
  check('response.status', response.status === contract.response_status, { expected: contract.response_status, actual: response.status });
  if (contract.cli_exit_code !== undefined) check('cli.exit-code', response.cli_exit_code === contract.cli_exit_code, { expected: contract.cli_exit_code, actual: response.cli_exit_code });
  check('send.upstream-count', response.captures.length === contract.upstream_requests, { expected: contract.upstream_requests, actual: response.captures.length });
  if (contract.upstream_requests === 0) {
    check('input.refused-before-model', (response.status >= 400 || response.cli_exit_code === 1) && response.captures.length === 0);
    result.rejection = response.text.slice(0, 1500);
  } else if (response.captures.length) {
    const capture = response.captures.at(-1), wire = capture.body;
    check('send.method-and-endpoint', capture.method === 'POST' && capture.url === '/v1/messages', { method: capture.method, url: capture.url });
    check('send.worker-auth-only', capture.auth_uses_worker_credential && !capture.authorization_present && !capture.leaked_policy_header);
    result.request_sha256 = sha(test.body);
    result.outgoing_sha256 = sha(wire);
    result.observed_parameter_values = stripContent(wire);
    result.diffs.generation_parameters = differences(stripContent(test.body), stripContent(wire));
    const expected = expectedContent(test, wire, check);
    result.diffs.system = differences(expected.system, normalizeSystem(wire.system), 'system');
    result.diffs.messages = differences(expected.messages, wire.messages, 'messages');
    result.diffs.tools = differences(expected.tools, wire.tools, 'tools');
    result.diffs.tools_by_name = differences(
      Object.fromEntries((expected.tools ?? []).map(tool => [tool.name, tool])),
      Object.fromEntries((wire.tools ?? []).map(tool => [tool.name, tool])), 'tools_by_name');
    result.tool_names_before = (expected.tools ?? []).map(tool => tool.name);
    result.tool_names_after = (wire.tools ?? []).map(tool => tool.name);
    check('content.system', result.diffs.system.length === 0);
    check('content.messages', result.diffs.messages.length === 0);
    if (contract.tools === 'exact') check('content.tools-exact', result.diffs.tools.length === 0);
    if (test.mode === 'direct' || contract.whole_body === 'exact') {
      check('send.direct-whole-body', same(wire, test.body), { diff: differences(test.body, wire) });
      check('send.direct-raw-bytes', capture.raw === response.sent_raw, { expected_sha256: sha(response.sent_raw), actual_sha256: sha(capture.raw) });
    }
    for (const [key, value] of Object.entries(contract.parameters ?? {})) {
      check('parameter.' + key, same(wire[key], value), { expected: value, actual: wire[key] ?? '<absent>' });
    }
    if (test.mode !== 'direct') {
      for (const key of new Set([...Object.keys(stripContent(test.body)), ...Object.keys(stripContent(wire))])) {
        if (Object.hasOwn(contract.parameters ?? {}, key) || same(test.body[key], wire[key])) continue;
        let permitted = false;
        if (Object.hasOwn(contract.native_authorized ?? {}, key)) {
          if (key === 'metadata') permitted = validNativeMetadata(wire.metadata);
          else if (key === 'thinking' && test.body.thinking === undefined) permitted = same(wire.thinking, { type: 'disabled' });
          else if (key === 'temperature' && test.body.temperature === undefined) permitted = wire.temperature === 1 && wire.thinking?.type === 'disabled';
          else if (key === 'output_config' && test.body.output_config === undefined) permitted = same(wire.output_config, { effort: 'high' });
          else if (key === 'thinking' && test.unknown_reason) {
            result.checks.push({ id: 'parameter.closed-world.thinking', status: 'unknown', evidence: { reason: test.unknown_reason, actual: wire.thinking } });
            continue;
          }
        }
        check('parameter.closed-world.' + key, permitted, { before: test.body[key] ?? '<absent>', after: wire[key] ?? '<absent>' });
      }
    }
    result.native_authorized_transformations = Object.fromEntries(Object.entries(contract.native_authorized ?? {}).map(([field, rule]) => [field, {
      rule, changed: !same(test.body[field], wire[field]),
      note: 'Authorized native normalization is recorded separately; it does not satisfy a stricter supplied parameter contract.',
    }]));
    for (const assertion of contract.assertions ?? []) {
      if (assertion === 'metadata_regenerated') check(assertion, validNativeMetadata(wire.metadata) && wire.metadata.user_id !== test.body.metadata?.user_id);
      else if (assertion === 'beta_forwarded') {
        const expectedBetas = test.headers['anthropic-beta'].split(',');
        const actual = (capture.headers['anthropic-beta'] ?? '').split(',');
        check(assertion, expectedBetas.every(beta => actual.includes(beta)), { expected: expectedBetas, actual });
      } else if (assertion === 'worker_auth_only') check(assertion, capture.auth_uses_worker_credential && !capture.authorization_present && !capture.leaked_policy_header);
      else if (assertion === 'raw_response_exact') check(assertion, response.text === capture.response.raw,
        { expected_sha256: sha(capture.response.raw), actual_sha256: sha(response.text) });
      else if (assertion === 'retry_after') check(assertion, response.headers['retry-after'] === '2');
      else if (assertion === 'sse_complete') check(assertion, response.headers['content-type']?.includes('text/event-stream') && response.text.includes('event: message_stop\n'));
      else check('known-assertion', false, { unsupported_assertion: assertion });
    }
  } else result.response_preview = response.text.slice(0, 1500);
  if (result.checks.some(item => item.status === 'fail')) result.status = 'fail';
  else if (test.unknown_reason || result.checks.some(item => item.status === 'unknown')) { result.status = 'unknown'; result.unknown_reason = test.unknown_reason; }
  return result;
}
(async () => {
  const selected = process.env.PROBE_CASE_IDS?.split(',');
  const cases = manifest.cases.filter(test => (!process.env.PROBE_CASE_FILTER || test.id.includes(process.env.PROBE_CASE_FILTER)) && (!selected || selected.includes(test.id)));
  if (!cases.length) throw Error('No matching assembly cases');
  // Execute default-runtime cases together, then isolated controlled env cases.
  cases.sort((a, b) => Number(Boolean(a.runtime_environment)) - Number(Boolean(b.runtime_environment)));
  for (const test of cases) {
    const environment = JSON.stringify(test.runtime_environment ?? {});
    if (!runtime || environment !== currentEnvironment) {
      if (runtime) await runtime.close();
      runtime = await startRuntime({ environment: test.runtime_environment });
      currentEnvironment = environment;
      if (runtime.identity.cli_sha256 !== manifest.expected_cli_sha256) throw Error('Manifest and actual CLI SHA differ');
      if (runtime.identity.worker_sha256 !== manifest.expected_worker_sha256) throw Error('Manifest and actual Worker SHA differ');
    }
    let result;
    try { result = evaluate(test, await runtime.send(test)); }
    catch (error) { result = { id: test.id, group: test.group, contract: test.contract, source_symbols: test.source_symbols,
      actual_identity: runtime.identity, status: 'fail', harness_or_transport_error: String(error.stack ?? error) }; }
    record.cases.push(result);
    process.stderr.write(`${result.status} ${test.id}\n`);
  }
  record.summary = Object.fromEntries(['pass', 'fail', 'unknown'].map(status => [status, record.cases.filter(item => item.status === status).length]));
  record.groups = Object.fromEntries([...new Set(record.cases.map(item => item.group))].map(group => [group,
    Object.fromEntries(['pass', 'fail', 'unknown'].map(status => [status, record.cases.filter(item => item.group === group && item.status === status).length]))]));
  record.total = record.cases.length;
  record.upstream_requests = record.cases.reduce((total, item) => total + (item.upstream_requests ?? 0), 0);
  record.status = record.summary.fail ? 'fail' : record.summary.unknown ? 'unknown' : 'pass';
  if (record.status !== 'pass') process.exitCode = 1;
})().catch(error => { record.status = 'fail'; record.fatal = String(error.stack ?? error); process.exitCode = 1; })
  .finally(async () => {
    if (runtime) await runtime.close();
    const text = JSON.stringify(record, null, 2) + '\n';
    if (process.env.PROBE_REPORT) fs.writeFileSync(process.env.PROBE_REPORT, text);
    process.stdout.write(text);
  });

// Grouped native assembly suite. HTTP 200 is not a pass oracle.
// Known tool/parameter drops fail; unproved native-model rules remain unknown.
// CC_VERSION (default 2.1.304) selects fixtures/assembly-cases-<version>.json
// unless PROBE_MANIFEST names another; artifact SHAs are pinned by the caller
// (assembly-runtime.cjs), never here.
const fs = require('node:fs'), path = require('node:path');
const { startRuntime } = require('./assembly-runtime.cjs');
const { sha, normalizeSystem, same, differences, definitionHash, ccVersion, fixturePath, anyUnpinned,
  nativeCCVersion, nativeHeaderBlock, billingLines, nativeDefaultPermitted, withoutTopLevelMember } = require('./replay-helpers.cjs');
const version = ccVersion();
const manifestPath = process.env.PROBE_MANIFEST || fixturePath('assembly-cases', version);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
// A manifest carries the version its fixtures and fingerprints were built for.
if (manifest.cc_version !== undefined && manifest.cc_version !== version)
  throw Error(`${manifestPath} is for Claude Code ${manifest.cc_version}, CC_VERSION is ${version}`);
const record = { suite: manifest.suite, scope: manifest.scope, cc_version: version, manifest_sha256: sha(fs.readFileSync(manifestPath)),
  cases: [], branch_coverage_claim: 'Cases exercise named assembly contracts; this is not complete AST branch coverage.' };
let runtime, currentEnvironment = '';
const stripContent = body => Object.fromEntries(Object.entries(body).filter(([key]) => !['system', 'messages', 'tools'].includes(key)));
// The request line both modes send since CLI v24 (plugin 0.1.88): the native
// SDK's create path with ?beta=true (REQUEST-MODES §1.1; cli-mods
// model-request.js messagesPath is taken from the SDK's create at patch time).
const messagesPath = '/v1/messages?beta=true';
const defaultEntrypoint = 'sdk-cli';
function validNativeMetadata(value) {
  try {
    if (!same(Object.keys(value).sort(), ['user_id'])) return false;
    const identity = JSON.parse(value.user_id);
    return same(Object.keys(identity).filter(k => k !== 'parent_session_id').sort(), ['account_uuid', 'device_id', 'session_id']) &&
      (identity.parent_session_id === undefined || /^[a-f0-9-]{36}$/.test(identity.parent_session_id)) &&
      /^[a-f0-9]{64}$/.test(identity.device_id) && identity.account_uuid === '' &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(identity.session_id);
  } catch { return false; }
}
function applyPatch(target, patch) {
  let parent = target;
  for (const key of patch.path.slice(0, -1)) parent = parent[key];
  parent[patch.path.at(-1)] = structuredClone(patch.value);
}
// expectedContent is the client's body with the contract's edits. billing_insert:
// the client's system has no usable leading header, so build (always, since
// CLI v16) and direct (since v17) put the CLI's own whole header line in
// front (content-policy.js mergeBillingAttribution; direct-billing.js;
// BUILD-REQUEST-COMPONENTS-DESIGN §5.5, §6.3). Its cc_version is computed here
// independently from the first prompt (replay-helpers nativeCCVersion), its
// cc_entrypoint is the request's (no client header, no configured one:
// sdk-cli, request-policy.js defaultEntrypoint).
function expectedContent(test, wire, checks) {
  const expected = structuredClone(test.body);
  expected.system = normalizeSystem(expected.system);
  for (const patch of test.contract.patches ?? []) applyPatch(expected, patch);
  if (test.contract.content === 'billing_insert') {
    const expectedVersion = nativeCCVersion(expected.messages, version);
    const entrypoint = test.policy?.build_billing_entrypoint ?? defaultEntrypoint;
    const header = nativeHeaderBlock(normalizeSystem(wire.system)[0], { cc_version: expectedVersion, cc_entrypoint: entrypoint });
    checks('billing.native-version', new RegExp(`^${version.replaceAll('.', '\\.')}\\.[a-f0-9]{3}$`).test(header.fields?.cc_version ?? ''), { actual: header.fields?.cc_version });
    checks('billing.independent-fingerprint', header.fields?.cc_version === expectedVersion, { expected: expectedVersion, actual: header.fields?.cc_version });
    checks('billing.native-entrypoint', header.fields?.cc_entrypoint === entrypoint, { expected: entrypoint, actual: header.fields?.cc_entrypoint });
    checks('billing.native-fields', header.ok, { problems: header.problems, fields: header.fields });
    // The inserted line is the only new one; a client header elsewhere stays.
    const clientLines = billingLines(expected.system).length;
    checks('billing.unique-block', billingLines(wire.system).length === clientLines + 1, { expected: clientLines + 1, actual: billingLines(wire.system).length });
    expected.system.unshift(header.expected);
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
    check('send.method-and-endpoint', capture.method === 'POST' && capture.url === messagesPath, { method: capture.method, url: capture.url, expected: messagesPath });
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
      // Direct sends the client's body except the billing header (CLI v17;
      // direct-billing.js, BUILD-REQUEST-COMPONENTS-DESIGN §6.3): the expected
      // body is the client's with the contracted system edits, and every byte
      // outside the system member must be the client's. With no system edit
      // the whole raw body must be identical. Direct never touches metadata
      // (build design §7: "direct 原样转发").
      const body = structuredClone(test.body);
      const systemEdited = !same(expected.system, normalizeSystem(test.body.system)) || typeof test.body.system === 'string';
      if (test.body.system !== undefined || expected.system.length) body.system = expected.system;
      check('send.direct-whole-body', same(wire, body), { diff: differences(body, wire) });
      if (!systemEdited) check('send.direct-raw-bytes', capture.raw === response.sent_raw, { expected_sha256: sha(response.sent_raw), actual_sha256: sha(capture.raw) });
      else {
        const before = withoutTopLevelMember(response.sent_raw, 'system'), after = withoutTopLevelMember(capture.raw, 'system');
        check('send.direct-raw-bytes', before !== null && before === after, { scope: 'every byte outside the system member', expected_sha256: before && sha(before), actual_sha256: after && sha(after) });
      }
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
          else if (key === 'thinking' && test.unknown_reason) {
            result.checks.push({ id: 'parameter.closed-world.thinking', status: 'unknown', evidence: { reason: test.unknown_reason, actual: wire.thinking } });
            continue;
          } else permitted = nativeDefaultPermitted(key, test.body, wire);
        }
        check('parameter.closed-world.' + key, permitted, { before: test.body[key] ?? '<absent>', after: wire[key] ?? '<absent>' });
      }
    }
    result.native_authorized_transformations = Object.fromEntries(Object.entries(contract.native_authorized ?? {}).map(([field, rule]) => [field, {
      rule, changed: !same(test.body[field], wire[field]),
      note: 'Authorized native normalization is recorded separately; it does not satisfy a stricter supplied parameter contract.',
    }]));
    // Literal texts the outgoing bytes must carry as the client wrote them
    // (numbers beyond 2^53 since CLI v29: REQUEST-MODES §1.1).
    for (const text of contract.raw_texts ?? []) check('send.raw-text', capture.raw.includes(text) && response.sent_raw.includes(text), { text });
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
  // Pins: the caller's environment, else a legacy manifest's fixed SHAs.
  const expect = { cli: manifest.expected_cli_sha256, worker: manifest.expected_worker_sha256 };
  for (const test of cases) {
    const environment = JSON.stringify(test.runtime_environment ?? {});
    if (!runtime || environment !== currentEnvironment) {
      if (runtime) await runtime.close();
      runtime = await startRuntime({ environment: test.runtime_environment, expect });
      currentEnvironment = environment;
      if (record.artifact_identity && (record.artifact_identity.cli.sha256 !== runtime.identity.cli_sha256 || record.artifact_identity.worker.sha256 !== runtime.identity.worker_sha256))
        throw Error('Artifacts changed between runtimes of one run');
      record.artifact_identity = runtime.identity.pins;
      record.sha_unpinned = anyUnpinned(runtime.identity.pins);
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

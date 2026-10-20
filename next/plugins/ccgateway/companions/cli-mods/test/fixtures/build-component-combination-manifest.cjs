// Independent expected spans from the native client golden fixture.
// Run inside the disposable Linux test container, so os.type/release describe
// its controlled environment, not the Windows authoring host.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { sha } = require('../replay-helpers.cjs');
const baseline = require('./assembly-cases.json');
const official = require('./official-request-2.1.304.json');
const golden = require('./native-environment-2.1.304.json');
const template = baseline.cases.find(c => c.id === 'messages.official_304_build');
const ordinary = baseline.cases.find(c => c.id === 'messages.error_tool_result_media').body;
if (process.platform !== 'linux' || !fs.existsSync('/.dockerenv') || process.env.CCG_ASSEMBLY_DISPOSABLE !== '1')
  throw Error('Generate expected runtime facts only inside the disposable Linux container');
const clone = value => structuredClone(value);
const fields = ['primary_directory', 'worktree', 'git_repository', 'additional_directories',
  'platform_name', 'shell', 'os_version', 'scratchpad_directory', 'agent_proxy', 'github_cli'];
const billingFields = ['cc_version', 'cc_entrypoint'], allFields = [...fields, ...billingFields];
const [header, ...parts] = golden.nativeFullClient.split(/\n(?= - )/);
parts.splice(1, 2, parts[1] + '\n' + parts[2]);
assert.equal(parts.length, 10);
const client = Object.fromEntries(parts.map((text, i) => [fields[i], text + '\n']));
const server = {
  primary_directory: ' - Primary working directory: /work/assembly-context\n',
  git_repository: ' - Is a git repository: false\n', platform_name: ' - Platform: linux\n',
  shell: ' - Shell: bash\n', os_version: ` - OS Version: ${os.type()} ${os.release()}\n`,
  worktree: '', additional_directories: '', scratchpad_directory: '', agent_proxy: '', github_cli: '',
};
const unchanged = ' - Unknown future client field: KEEP EXACTLY\n';
const wrap = text => '<system-reminder>\n' + text + '</system-reminder>';
const initialBilling = 'x-anthropic-billing-header: cc_version=2.1.302.b50; cc_entrypoint=client-fixture; opaque=KEEP;';
const environment = sources => wrap(header + '\n' + fields.map(key =>
  sources[key] === 'worker' ? server[key] : sources[key] === 'erase' ? '' : client[key]).join('') + unchanged);
function bodyFor(origin) {
  const body = clone(origin === 'cc' ? official : ordinary);
  body.system = origin === 'cc' ? body.system : [
    { type: 'text', text: '', cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'Ordinary application instructions must stay unchanged.' },
  ];
  body.system[0].text = initialBilling;
  if (origin === 'cc') body.messages[0].content[0].text = environment({});
  else body.messages[0].content = [
    { type: 'text', text: environment({}), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: body.messages[0].content },
  ];
  return body;
}
function expectedFor(body, policy) {
  const expected = clone(body);
  expected.messages[0].content[0].text = environment(policy.build_attachment_sources ?? {});
  const text = expected.messages[0].content[0].text;
  const fingerprint = sha('59cf53e54c78' + [4, 7, 20].map(i => text[i] ?? '0').join('') + '2.1.304').slice(0, 3);
  const bill = policy.build_billing_sources ?? {};
  expected.system[0].text = initialBilling
    .replace('2.1.302.b50', bill.cc_version === 'worker' ? `2.1.304.${fingerprint}` : '2.1.302.b50')
    .replace('client-fixture', bill.cc_entrypoint === 'worker' ? 'sdk-cli' : 'client-fixture');
  return expected;
}
function selection(keys, source = 'worker') {
  return {
    build_attachment_sources: Object.fromEntries(keys.filter(k => fields.includes(k)).map(k => [k, source])),
    build_billing_sources: Object.fromEntries(keys.filter(k => billingFields.includes(k)).map(k => [k, source === 'erase' ? 'client' : source])),
  };
}
const cases = [];
function add(origin, group, label, policy, overrides = {}) {
  const body = overrides.body ?? bodyFor(origin);
  const expected = overrides.expected ?? expectedFor(body, policy);
  cases.push({
    id: `components.${origin}.${label}`, group, mode: overrides.mode ?? 'build',
    fixture_source: {
      kind: origin === 'cc' ? 'derived_official_capture' : 'synthetic_ordinary_messages',
      official_body_sha256: origin === 'cc' ? sha(official) : undefined,
      environment_fixture_sha256: sha(golden.nativeFullClient),
      derivation: 'Full native client Environment and billing sentinels; all unrelated original components retained',
    },
    source_symbols: ['applyContentPolicy', 'mergeBillingAttribution', 'ccgatewayEnvironment', 'qmn.uXn'],
    body, policy,
    contract: {
      ...clone(template.contract), parameters: {}, content: 'expected_patches',
      patches: [{ path: ['system'], value: expected.system }, { path: ['messages'], value: expected.messages }],
      ...(overrides.mode === 'direct' ? { whole_body: 'exact' } : {}),
    },
  });
}
for (const origin of ['cc', 'noncc']) {
  add(origin, 'CLIENT_BASELINE', 'all_client', selection(allFields, 'client'));
  for (const key of allFields) add(origin, 'SINGLE_WORKER', `single_worker.${key}`, selection([key]));
  for (const key of fields) add(origin, 'SINGLE_ERASE', `single_erase.${key}`, selection([key], 'erase'));
  for (let a = 0; a < allFields.length; a++) for (let b = a + 1; b < allFields.length; b++)
    add(origin, 'PAIR_WORKER', `pair.${allFields[a]}.${allFields[b]}`, selection([allFields[a], allFields[b]]));
  for (const size of [3, 4, 6, 10, 12])
    add(origin, 'MULTI_WORKER', `multi_${size}`, selection(allFields.slice(0, size)));
  for (let rotation = 0; rotation < 6; rotation++) {
    const policy = {
      build_attachment_sources: Object.fromEntries(fields.map((key, i) => [key, ['client', 'worker', 'erase'][(i + rotation) % 3]])),
      build_billing_sources: { cc_version: rotation & 1 ? 'worker' : 'client', cc_entrypoint: rotation & 2 ? 'worker' : 'client' },
    };
    add(origin, 'MIXED_SOURCES', `mixed_${rotation}`, policy);
  }
  for (const [i, source] of ['worker', 'erase', 'client', 'worker', 'client', 'erase'].entries())
    add(origin, 'SEQUENTIAL_SWITCH', `switch_${i}_${source}`, selection(allFields, source));
  const allWorker = selection(allFields), changed = expectedFor(bodyFor(origin), allWorker);
  add(origin, 'REPEAT', 'repeat_all_worker', allWorker, { body: changed, expected: changed });
  const raw = bodyFor(origin);
  add(origin, 'DIRECT', 'direct_with_all_worker', allWorker, { body: raw, expected: raw, mode: 'direct' });
}
assert.equal(cases.length, 216);
assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
const output = process.argv[2];
if (!output) throw Error('An output manifest path is required');
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, JSON.stringify({
  schema_version: 1, suite: 'client-components-single-multiple-combinations-2.1.304',
  expected_cli_sha256: baseline.expected_cli_sha256, expected_worker_sha256: baseline.expected_worker_sha256,
  scope: { provider: 'firstParty', client_types: ['official capture with full native golden fields', 'ordinary Messages with tool history'],
    dimensions: { environment: fields, billing: billingFields }, runtime_server_facts: server,
    exclusions: 'Not a complete runtime Cartesian matrix, not live cloud model calls, and not all carriers/models/providers.',
    oracle: 'Static native golden spans plus controlled OS facts; no production recognizer/transformer/merger is used to derive expectations.' },
  cases,
}, null, 2) + '\n');
console.error(JSON.stringify({ output, cases: cases.length, groups: Object.fromEntries([...new Set(cases.map(c => c.group))].map(g => [g, cases.filter(c => c.group === g).length])) }));

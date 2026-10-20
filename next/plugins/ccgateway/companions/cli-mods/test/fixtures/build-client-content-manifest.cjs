// Explicit client-origin × content-policy matrix. Fixture/expected construction
// is independent of the production recognizer, collector and merge functions.
const fs = require('node:fs'), path = require('node:path');
const { sha } = require('../replay-helpers.cjs');
const baseline = require('./assembly-cases.json');
const official = require('./official-request-2.1.304.json');
const officialCase = baseline.cases.find(c => c.id === 'messages.official_304_build');
const ordinaryCase = baseline.cases.find(c => c.id === 'system.cached_blocks');
const clone = value => structuredClone(value);
const env = '<system-reminder>\n# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /ordinary/client\n - Platform: client-platform\n - Shell: client-shell\n - OS Version: Client OS\n</system-reminder>';
const originalEnv = official.messages[0].content[0].text;
if (!originalEnv.includes(' - Primary working directory: /work/fresh-official-project\n') ||
    !originalEnv.includes(' - Shell: bash\n')) throw Error('Official fixture environment changed');
const sentinel = 'x-anthropic-billing-header: cc_version=0.0.1.abc; cc_entrypoint=fixture-client; future_key=KEEP;';
const ordinary = {
  model: 'claude-sonnet-4-6', max_tokens: 128, stream: false,
  system: [{ type: 'text', text: 'Ordinary Messages application instructions.', cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Ordinary request without CC content.' }] }],
  tools: [{ name: 'lookup', input_schema: { type: 'object', properties: { key: { type: 'string' } } } }],
  top_p: 0.6, x_fixture_preserve: { client: 'ordinary' },
};
const policy = {
  build_attachment_sources: { primary_directory: 'worker', shell: 'erase' },
  build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' },
};
function version(messages) {
  const user = messages.find(m => m.role === 'user');
  const text = typeof user?.content === 'string' ? user.content : user?.content?.find(b => b.type === 'text')?.text ?? '';
  return '2.1.304.' + sha('59cf53e54c78' + [4, 7, 20].map(i => text[i] ?? '0').join('') + '2.1.304').slice(0, 3);
}
const cases = [];
function add(client, scenario, body, selected, expected, extra = {}) {
  const template = client === 'cc' ? officialCase : ordinaryCase;
  const source = client === 'cc'
    ? { kind: scenario === 'original_client' ? 'official_fresh_capture' : 'derived_official_capture',
        source_cli_sha256: officialCase.fixture_source.source_cli_sha256,
        original_body_sha256: sha(official), derivation: scenario }
    : { kind: 'synthetic_ordinary_messages', derivation: scenario };
  cases.push({
    id: `client_content.${client}.${scenario}`, group: 'BILL_ENV', mode: 'build',
    fixture_source: source, source_symbols: ['prepareBuildInput', 'applyContentPolicy', 'mergeBillingAttribution', 'qmn.uXn'],
    body, policy: selected,
    contract: { ...clone(template.contract), parameters: {},
      content: expected ? 'expected_patches' : 'preserve',
      ...(expected ? { patches: [
        { path: ['system'], value: expected.system },
        { path: ['messages'], value: expected.messages },
      ] } : {}),
      ...extra.contract,
    }, ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== 'contract')),
  });
}
for (const client of ['cc', 'noncc']) {
  const raw = client === 'cc' ? clone(official) : clone(ordinary);
  add(client, 'original_client', clone(raw), {
    build_attachment_sources: { primary_directory: 'client', shell: 'client' },
    build_billing_sources: { cc_version: 'client', cc_entrypoint: 'client' },
  });

  const populated = clone(raw);
  if (client === 'cc') populated.system[0].text = sentinel;
  else {
    populated.system.unshift({ type: 'text', text: sentinel, cache_control: { type: 'ephemeral' } });
    populated.messages[0].content.unshift({ type: 'text', text: env });
  }
  const modified = clone(populated);
  const oldText = populated.messages[0].content[0].text;
  const oldDirectory = client === 'cc' ? '/work/fresh-official-project' : '/ordinary/client';
  const oldShell = client === 'cc' ? 'bash' : 'client-shell';
  modified.messages[0].content[0].text = oldText
    .replace(` - Primary working directory: ${oldDirectory}\n`, ' - Primary working directory: /work/assembly-context\n')
    .replace(` - Shell: ${oldShell}\n`, '');
  modified.system[0].text = `x-anthropic-billing-header: cc_version=${version(modified.messages)}; cc_entrypoint=sdk-cli; future_key=KEEP;`;
  if (modified.system[0].text === populated.system[0].text || modified.messages[0].content[0].text === oldText)
    throw Error('Modification case must require an actual change');
  add(client, 'modify_existing', populated, clone(policy), modified);
  add(client, 'repeat_modified_is_idempotent', clone(modified), clone(policy), clone(modified));
  add(client, 'direct_with_policy', clone(populated), clone(policy), undefined,
    { mode: 'direct', contract: { whole_body: 'exact' } });

  const missingBilling = clone(raw);
  if (client === 'cc') missingBilling.system.shift();
  add(client, 'inject_missing_billing', missingBilling,
    { build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' } }, undefined,
    { contract: { content: 'billing_insert' } });

  const missingEnv = clone(raw);
  if (client === 'cc') missingEnv.messages[0].content.shift();
  add(client, 'absent_environment_is_not_injected', missingEnv,
    { build_attachment_sources: { primary_directory: 'worker', platform_name: 'worker', shell: 'worker' } });

  const missingField = clone(raw);
  if (client === 'cc') missingField.messages[0].content[0].text = originalEnv.replace(' - Platform: linux\n', '');
  else missingField.messages[0].content.unshift({ type: 'text', text: env.replace(' - Platform: client-platform\n', '') });
  add(client, 'absent_environment_field_is_not_injected', missingField,
    { build_attachment_sources: { platform_name: 'worker' } });
}
const output = path.join(__dirname, 'client-content-cases.json');
fs.writeFileSync(output, JSON.stringify({
  schema_version: 1, suite: 'client-origin-content-policy-2.1.304',
  scope: { provider: 'first-party Anthropic Messages', client_sources: ['official capture + explicitly derived variants', 'synthetic ordinary Messages'],
    injection_contract: 'Missing worker-selected billing may be inserted; missing environment blocks/fields are preserved as absent. No arbitrary attachments are injected.' },
  expected_cli_sha256: baseline.expected_cli_sha256, expected_worker_sha256: baseline.expected_worker_sha256, cases,
}, null, 2) + '\n');
console.log(JSON.stringify({ output, cases: cases.length }));

// Explicit client-origin × content-policy matrix. Fixture/expected construction
// is independent of the production recognizer, collector and merge functions.
// CC_VERSION=<version> (default 2.1.304) node fixtures/build-client-content-manifest.cjs
// writes fixtures/client-content-cases-<version>.json, run with
// PROBE_MANIFEST=/tests/fixtures/client-content-cases-<version>.json assembly-replay.cjs.
const fs = require('node:fs'), path = require('node:path');
const { sha, ccVersion, readFixture, fixturePath, nativeCCVersion } = require('../replay-helpers.cjs');
const version = ccVersion();
const baseline = readFixture('assembly-cases', version, 'CC_VERSION=' + version + ' node fixtures/build-assembly-manifest.cjs');
const official = readFixture('official-request', version, 'test/e2e/capture-official.sh');
const officialCase = baseline.cases.find(c => c.id === 'messages.official_capture_build');
const ordinaryCase = baseline.cases.find(c => c.id === 'system.cached_blocks');
const clone = value => structuredClone(value);
const env = '<system-reminder>\n# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /ordinary/client\n - Platform: client-platform\n - Shell: client-shell\n - OS Version: Client OS\n</system-reminder>';
// The capture's own directory and shell (2.1.304: /work/fresh-official-project
// and bash; capture-official.sh: /tmp/work/fresh-official-project, unknown).
const originalEnv = official.messages[0].content[0].text;
const officialDirectory = /^ - Primary working directory: ([^\n]*)$/m.exec(originalEnv)?.[1];
const officialShell = /^ - Shell: ([^\n]*)$/m.exec(originalEnv)?.[1];
if (!officialDirectory || !officialShell || !originalEnv.includes(' - Platform: linux\n')) throw Error('Official fixture environment changed');
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
// The native cc_version of a body: the first prompt's fingerprint, not the
// first text block's (request-input.js firstPromptText, 2026-10-21).
const nativeVersion = messages => nativeCCVersion(messages, version);
// Build always carries a header (CLI v16): a body whose system does not open
// with one gets the native line in front (build design §5.5), which the
// runner checks as billing_insert.
const opensWithHeader = body => Array.isArray(body.system) && body.system[0]?.text?.startsWith('x-anthropic-billing-header:');
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
      content: expected ? 'expected_patches' : extra.mode !== 'direct' && !opensWithHeader(body) ? 'billing_insert' : 'preserve',
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
  const oldDirectory = client === 'cc' ? officialDirectory : '/ordinary/client';
  const oldShell = client === 'cc' ? officialShell : 'client-shell';
  modified.messages[0].content[0].text = oldText
    .replace(` - Primary working directory: ${oldDirectory}\n`, ' - Primary working directory: /work/assembly-context\n')
    .replace(` - Shell: ${oldShell}\n`, '');
  modified.system[0].text = `x-anthropic-billing-header: cc_version=${nativeVersion(modified.messages)}; cc_entrypoint=sdk-cli; future_key=KEEP;`;
  if (modified.system[0].text === populated.system[0].text || modified.messages[0].content[0].text === oldText)
    throw Error('Modification case must require an actual change');
  add(client, 'modify_existing', populated, clone(policy), modified);
  add(client, 'repeat_modified_is_idempotent', clone(modified), clone(policy), clone(modified));
  // Direct applies the billing sources to the leading header (CLI v17,
  // direct-billing.js; build design §6.3) and leaves the environment as sent:
  // only system[0] changes (the 2026-10-20 contract expected no change).
  const direct = clone(populated);
  direct.system[0].text = modified.system[0].text;
  add(client, 'direct_with_policy', clone(populated), clone(policy), direct,
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
const output = fixturePath('client-content-cases', version);
fs.writeFileSync(output, JSON.stringify({
  schema_version: 2, suite: 'client-origin-content-policy-' + version, cc_version: version,
  scope: { provider: 'first-party Anthropic Messages', client_sources: ['official capture + explicitly derived variants', 'synthetic ordinary Messages'],
    injection_contract: 'Build always carries a billing header: a body without a leading one gets the native line in front. Missing environment blocks/fields are preserved as absent. No arbitrary attachments are injected (no build_injection).' },
  artifact_pins: baseline.artifact_pins, cases,
}, null, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(process.cwd(), output), cases: cases.length,
  billing_insert: cases.filter(item => item.contract.content === 'billing_insert').map(item => item.id) }));

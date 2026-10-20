// Explicit slow suite: node next/plugins/ccgateway/companions/cli-mods/test/analysis/client-combination-unit.mjs
// Oracle uses ordered, captured native golden spans; it never imports the recognizer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { applyContentPolicy } from '../../content-policy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../..');
const fixturePath = path.resolve(here, '../fixtures/native-environment-2.1.304.json');
const productionPath = path.resolve(here, '../../content-policy.js');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceFiles = [fileURLToPath(import.meta.url), fixturePath, productionPath];
const hashes = sourceFiles.map(file => ({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: sha(file) }));
const golden = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
assert.equal(golden.cli_version, '2.1.304');
const order = ['primary_directory', 'worktree', 'git_repository', 'additional_directories', 'platform_name', 'shell', 'os_version', 'scratchpad_directory', 'agent_proxy', 'github_cli'];
const envSources = ['client', 'worker', 'erase'];
const billingSources = ['client', 'worker'];
const billingFields = ['cc_version', 'cc_entrypoint'];
function segments(text) {
  const [header, ...rows] = text.split(/\n(?= - )/);
  // Exact native fixture order: worktree warning and stash warning are one field.
  rows.splice(1, 2, rows[1] + '\n' + rows[2]);
  assert.equal(rows.length, 10, 'golden shape changed: review the independent span map');
  assert.equal(header, '# Environment\nYou have been invoked in the following environment: ');
  return { header: header + '\n', fields: Object.fromEntries(rows.map((row, i) => [order[i], row + '\n'])) };
}
const client = segments(golden.nativeFullClient), worker = segments(golden.nativeFullWorker);
const retained = ' - Unknown future instruction: KEEP EXACTLY\n  - Platform: nested opaque client text\n';
function environment(selection) {
  return client.header + order.map(field => selection[field] === 'erase' ? ''
    : selection[field] === 'worker' ? worker.fields[field] : client.fields[field]).join('') + retained;
}
const billing = 'x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=sdk-cli; cc_workload=server-only;';
function body(env, version = '0.0.0.client', entry = 'client-entry') {
  return {
    model: 'claude-sonnet-4-6', stream: true, max_tokens: 2048,
    metadata: { user_id: 'client-metadata' }, opaque_request: { nested: [null, false, 1, 'KEEP'] },
    tools: [{ name: 'opaque_tool', input_schema: { type: 'object', properties: {} }, strict: true }],
    system: [
      { type: 'text', text: `x-anthropic-billing-header: cc_version = ${version}; cc_entrypoint=${entry}; opaque=KEEP;`, cache_control: { type: 'ephemeral', ttl: '5m' } },
      { type: 'text', text: 'UNCHANGED SYSTEM', opaque: { keep: true } },
    ],
    messages: [
      { role: 'user', content: [
        { type: 'text', text: '<system-reminder>\n</system-reminder>\n<system-reminder>\n' + env + '</system-reminder>\n<system-reminder>\n</system-reminder>', cache_control: { type: 'ephemeral' } },
        { type: 'text', text: 'UNRELATED BLOCK' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'opaque-image' } },
      ] },
      { role: 'assistant', content: [{ type: 'thinking', thinking: 'opaque-thinking', signature: 'KEEP' }, { type: 'tool_use', id: 't1', name: 'opaque_tool', input: { keep: true } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'opaque result\nPlatform: client' }, { type: 'text', text: 'continue unchanged' }] },
    ],
  };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const original = body(environment({})), input = freeze(structuredClone(original));
const total = 3 ** 10 * 2 ** 2, started = performance.now();
const counts = { executed: 0, passed: 0, failed: 0, idempotency: 0, immutable: 0, zeroReadCases: 0, oneReadCases: 0 };
const byNonClientFields = Array(13).fill(0);
const fieldSources = Object.fromEntries([...order, ...billingFields].map(field => [field, {}]));
const failures = [], digest = crypto.createHash('sha256');
for (let envIndex = 0; envIndex < 3 ** 10; envIndex++) {
  let value = envIndex;
  const selected = Object.fromEntries(order.map(field => { const source = envSources[value % 3]; value = Math.floor(value / 3); return [field, source]; }));
  const needed = order.filter(field => selected[field] === 'worker');
  for (let billIndex = 0; billIndex < 4; billIndex++) {
    const version = billingSources[billIndex % 2], entry = billingSources[Math.floor(billIndex / 2)];
    const policy = freeze({ schema_version: 2, relay_mode: 'build', build_attachment_sources: selected, build_billing_sources: { cc_version: version, cc_entrypoint: entry } });
    const id = envIndex * 4 + billIndex;
    const expected = body(environment(selected), version === 'worker' ? '2.1.304.abc' : '0.0.0.client', entry === 'worker' ? 'sdk-cli' : 'client-entry');
    let reads = 0;
    const native = { billing, readEnvironment(requested) {
      reads++;
      assert.equal(requested.length, needed.length, 'collector requested duplicate or extra fields');
      assert.deepEqual([...requested].sort(), [...needed].sort(), 'collector field set');
      return golden.nativeFullWorker;
    } };
    try {
      const output = await applyContentPolicy(input, policy, native);
      assert.deepEqual(output, expected, 'whole body exact independent golden expectation');
      assert.equal(reads, needed.length ? 1 : 0, 'one snapshot or zero facts');
      needed.length ? counts.oneReadCases++ : counts.zeroReadCases++;
      reads = 0;
      const repeated = await applyContentPolicy(output, policy, native);
      assert.deepEqual(repeated, expected, 'idempotency against independent golden expectation');
      assert.deepEqual(output, expected, 'second application did not mutate its input');
      assert.equal(reads, needed.length ? 1 : 0, 'idempotent collector one snapshot or zero facts');
      counts.idempotency++;
      assert.deepEqual(input, original, 'original input not mutated');
      counts.immutable++;
      counts.passed++;
      digest.update(`${id}:pass\n`);
    } catch (error) {
      counts.failed++;
      digest.update(`${id}:fail\n`);
      if (failures.length < 20) failures.push({ id, envIndex, billIndex, policy, message: error.message.slice(0, 2000), stack: error.stack?.split('\n').slice(0, 5) });
    }
    counts.executed++;
    const selections = { ...selected, ...policy.build_billing_sources };
    byNonClientFields[Object.values(selections).filter(source => source !== 'client').length]++;
    for (const [field, source] of Object.entries(selections)) fieldSources[field][source] = (fieldSources[field][source] || 0) + 1;
  }
  if ((envIndex + 1) % 12500 === 0) console.log(JSON.stringify({ progress: counts.executed, total, failed: counts.failed, seconds: Math.round((performance.now() - started) / 1000) }));
}
assert.equal(counts.executed, total);
const unchangedSources = sourceFiles.every((file, i) => sha(file) === hashes[i].sha256);
const report = {
  schema: 'ccgateway.client-combination-unit.v1', cli_version: '2.1.304',
  generated_at: new Date().toISOString(), elapsed_ms: Math.round(performance.now() - started),
  command: 'node next/plugins/ccgateway/companions/cli-mods/test/analysis/client-combination-unit.mjs',
  status: counts.failed === 0 && unchangedSources ? 'passed' : 'failed',
  total, counts, by_non_client_field_count: byNonClientFields, per_field_source_counts: fieldSources,
  enumeration: 'envIndex base-3 digits in field_order, billingIndex base-2: cc_version then cc_entrypoint; id = envIndex * 4 + billingIndex',
  field_order: order, source_order: envSources, billing_source_order: billingSources,
  case_result_digest_sha256: digest.digest('hex'), source_hashes: hashes, sources_unchanged_during_run: unchangedSources,
  assertions: ['exact complete body compared with independent ordered golden spans', 'only selected worker fields collected, no duplicates, exactly one call', 'no worker source means zero native environment calls', 'input remains unchanged', 'second application produces exact same independent expected body and leaves first output unchanged'],
  scope: {
    carrier: 'messages[0].role=user, content[0].text system-reminder; system[0] billing',
    facts: 'collector stub returns captured native 2.1.304 golden, billing fixed native fixture; does not execute native collector or Worker',
    retained: 'unknown environment instruction, nested opaque Platform, full request params/tools, cache attributes, assistant thinking/tool use, tool result, images, non-target system/message blocks',
    identical_client_worker_golden_fields: order.filter(field => client.fields[field] === worker.fields[field]),
    limitations: ['single fixed carrier and complete recognized baseline', 'no actual CLI binary/Worker/network/collector verification', 'same-valued client/worker golden fields checked through collector requests and erase, replacement text alone cannot distinguish their sources', 'missing/ambiguous/fenced/history/optional-absent cases remain in separate existing tests', 'existing 150 carrier and 1620 pair suites unchanged'],
  },
  failures, failures_truncated: counts.failed > failures.length,
};
const destination = path.join(root, 'artifacts/claude-2.1.304/client-combination-unit-report.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: destination, status: report.status, ...counts, elapsed_ms: report.elapsed_ms }));
if (report.status !== 'passed') process.exitCode = 1;

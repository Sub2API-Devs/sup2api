import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRequestPolicy, runtimeContext } from '../request-policy.js';
import { prepareBuildInput } from '../request-input.js';

test('304 policy rejects unknown fields, contract, and manual billing values', () => {
  assert.deepEqual(validateRequestPolicy(), {});
  for (const value of [
    null, [], {}, { contract_version: 1 },
    { contract_version: 2, build_billing_sources: { cc_version: '2.1.304' } },
    { contract_version: 2, build_billing_sources: { cc_entrypoint: 'erase' } },
    { contract_version: 2, build_attachment_sources: { unrelated: 'worker' } },
    { contract_version: 2, arbitrary: true },
    // The entrypoint is one of the six, and each takes only its own lines.
    { contract_version: 2, build_billing_entrypoint: 'claude-desktop-3p' },
    { contract_version: 2, build_billing_entrypoint: 'sdk-cli; cch=1' },
    { contract_version: 2, build_identity_lines: { cli: 'agent_sdk' } },
    { contract_version: 2, build_identity_lines: { 'sdk-ts': 'official_cli' } },
    { contract_version: 2, build_identity_lines: { remote: 'none' } },
    { contract_version: 2, build_identity_lines: [] },
  ]) assert.throws(() => validateRequestPolicy(value));
  const value = { contract_version: 2, build_attachment_sources: { platform_name: 'erase', shell: 'worker' }, build_billing_sources: { cc_version: 'client' },
    build_billing_entrypoint: 'claude-vscode', build_identity_lines: { cli: 'none', 'sdk-ts': 'official_cli_sdk', 'claude-desktop': 'agent_sdk' } };
  const copy = validateRequestPolicy(value);
  assert.deepEqual(copy, value);
  copy.build_attachment_sources.shell = 'client';
  assert.equal(value.build_attachment_sources.shell, 'worker');
});

test('runtime facts cannot claim a different startup directory', () => {
  const context = runtimeContext({ workingDirectory: process.cwd() });
  assert.deepEqual(context.additionalWorkingDirectories, []);
  assert.throws(() => runtimeContext({ workingDirectory: 'relative' }));
  assert.throws(() => runtimeContext({ workingDirectory: process.cwd(), additionalWorkingDirectories: [null] }));
  assert.throws(() => runtimeContext({ workingDirectory: process.cwd(), secret: true }));
});

test('304 input preserves string system, missing system and wire metadata', () => {
  const base = { model: 'test', messages: [
    { role: 'user', content: 'first', cache_control: { type: 'ephemeral' } },
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'opaque', signature: 'keep' }, { type: 'tool_use', id: 't', name: 'Read', input: {} }] },
    { role: 'system', content: [{ type: 'text', text: 'lifecycle' }], clear_at: 'next_user_message' },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', is_error: true, content: [{ type: 'image', source: { type: 'base64', data: 'opaque' } }] }] },
  ] };
  const parsed = prepareBuildInput({ ...base, systemPrompt: 'exact system' }, undefined, { preserveContent: true });
  assert.deepEqual(parsed.systemBlocks, [{ type: 'text', text: 'exact system' }]);
  assert.deepEqual(parsed.messages.map(row => row.ccgatewayWireMessage ?? row.ccgatewayWireSystem), base.messages);
  assert.deepEqual(prepareBuildInput(base, undefined, { preserveContent: true }).systemBlocks, []);
  for (const content of [[null], [{ type: 'text', text: null }], [{ type: 'tool_result', content: null }]]) {
    assert.throws(() => prepareBuildInput({ model: 'test', messages: [{ role: 'user', content }] }, undefined, { preserveContent: true }));
  }
  assert.throws(() => prepareBuildInput({ model: 'test', messages: [{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'orphan', content: 'x' }] }] }, undefined, { preserveContent: true }));
});

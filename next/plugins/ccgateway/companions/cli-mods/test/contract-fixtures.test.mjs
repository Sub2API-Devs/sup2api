// Consumer half of the Worker → CLI contract. The fixture holds what the actual
// Worker writes to the CLI (engine/contract_fixture_test.go regenerates it);
// here the same bytes go through the CLI's own parsing, validation, content
// policy and identity handling. A Worker change the CLI rejects fails this
// test instead of every production request.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRequestJSON } from '../request-options.js';
import { validateRequestPolicy, runtimeContext, identityLineFor } from '../request-policy.js';
import { validateBuildParameters } from '../request-parameters.js';
import { prepareBuildInput } from '../request-input.js';
import { createContentPolicy } from '../content-policy.js';
import { vocabulary } from './vocabulary.mjs';
import { applyBuildMetadata, applyBuildCliPrefix } from '../request-identity.js';

const fixture = JSON.parse(fs.readFileSync(new URL('../../contracts/testdata/worker-cli-requests.json', import.meta.url), 'utf8'));
const environment = fields => '# Environment\nYou have been invoked in the following environment: \n' + fields.map(line => ' - ' + line).join('\n') + '\n';
const native = {
  readEnvironment: async () => environment(['Primary working directory: /worker', 'Platform: linux', 'Shell: bash', 'OS Version: Worker OS']),
  billing: 'x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=sdk-cli;',
};
const nativeIdentity = () => ({ user_id: JSON.stringify({ device_id: 'b'.repeat(64), account_uuid: 'worker-account', session_id: '23456789-2345-4234-9234-234567890123' }) });
// The CC attachment renderer is native; the contract only needs the rows to resolve.
const render = row => ({ isKnownType: true, messages: [{ message: { role: 'user', content: row.rendered?.[0]?.content ?? JSON.stringify(row.attachment ?? null) } }] });
async function withIdentity(value, run) {
  const old = process.env.CCG_REQUEST_IDENTITY;
  if (value) process.env.CCG_REQUEST_IDENTITY = value; else delete process.env.CCG_REQUEST_IDENTITY;
  try { return await run(); } finally { if (old === undefined) delete process.env.CCG_REQUEST_IDENTITY; else process.env.CCG_REQUEST_IDENTITY = old; }
}

test('the fixture covers both modes and every identity decision', () => {
  assert.ok(fixture.cases.some(c => c.mode === 'build') && fixture.cases.some(c => c.mode === 'direct'));
  const identities = fixture.cases.map(c => c.identity && JSON.parse(c.identity)).filter(Boolean);
  for (const mode of ['client', 'worker', 'replace']) assert.ok(identities.some(i => i.mode === mode), mode);
  assert.ok(identities.some(i => i.rewrite) && identities.some(i => !i.rewrite));
});

for (const c of fixture.cases) {
  test(`Worker → CLI ${c.name}`, async () => {
    const stdin = c.stdin.replaceAll('{{cwd}}', JSON.stringify(process.cwd()).slice(1, -1));
    const body = parseRequestJSON(stdin, c.mode);
    await withIdentity(c.identity, async () => {
      if (c.mode === 'direct') {
        // Direct is a pure passthrough: the Worker gives the CLI no identity
        // context and the body is forwarded as it is.
        assert.equal(c.identity, undefined);
        return;
      }
      // The identity context never travels in the envelope: the CLI's policy
      // validator only knows the content keys.
      const { requestPolicy, runtimeContext: context, ...external } = body;
      validateBuildParameters(external.parameters);
      const policy = validateRequestPolicy(requestPolicy);
      runtimeContext(context);
      const initial = prepareBuildInput(external, render, { preserveContent: true });
      const messages = initial.messages.flatMap(row => row.type !== 'attachment'
        ? [structuredClone(row.ccgatewayWireSystem ?? row.ccgatewayWireMessage ?? row.message)]
        : render(row).messages.map(item => ({ role: row.renderedRole ?? item.message.role, content: item.message.content })));
      const content = createContentPolicy(vocabulary);
      const transformed = await content.applyContentPolicy({ system: initial.systemBlocks, messages }, policy, native);
      // The header and the identity line it selects, as request-build and the
      // request command apply them (lines stand in for CC's own n1n three).
      const system = content.mergeBillingAttribution(transformed.system, policy, native.billing);
      const lines = { official_cli: 'Interactive line.', official_cli_sdk: 'SDK appended line.', agent_sdk: 'SDK line.' };
      const opened = applyBuildCliPrefix({ system }, identityLineFor(policy, content.billingEntrypoint(system)), lines,
        value => Object.values(lines).includes(value), block => block.text.startsWith(vocabulary.billingHeader)).system;
      if (c.name === 'build-identity-lines') {
        // The client's cli header keeps its entrypoint, and cli's line is none.
        assert.deepEqual(opened.map(block => block.text), ['x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=cli;', 'plain system']);
        assert.equal(policy.build_billing_entrypoint, 'claude-vscode');
      }
      const client = external.parameters?.metadata;
      const built = applyBuildMetadata({ metadata: { user_id: nativeIdentity().user_id } }, client, nativeIdentity);
      const identity = JSON.parse(c.identity);
      if (!client) assert.ok(!Object.hasOwn(built, 'metadata'));
      else if (identity.rewrite) {
        assert.notDeepEqual(built.metadata.user_id, client.user_id);
        assert.equal(typeof built.metadata.user_id, typeof client.user_id);
      } else assert.deepEqual(built.metadata, client);
    });
  });
}

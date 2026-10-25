import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBuildMetadata, requestSessionID } from '../request-identity.js';

const device = 'a'.repeat(64);
const session = '12345678-1234-4123-8123-123456789012';
const parent = '23456789-2345-4234-9234-234567890123';
const payload = (extra = {}) => ({ version: 2, mode: 'replace', rewrite: true,
  device_id: device, session_id: session, parent_session_id: parent, carrier: 'json', ...extra });
// The CLI's own identity, as yBe produces it: a JSON string.
const native = () => ({ user_id: JSON.stringify({ device_id: 'b'.repeat(64),
  account_uuid: 'worker-account', session_id: session, native_extra: 'kept' }) });
async function context(value, run) {
  const old = process.env.CCG_REQUEST_IDENTITY;
  if (value === undefined) delete process.env.CCG_REQUEST_IDENTITY;
  else process.env.CCG_REQUEST_IDENTITY = JSON.stringify(value);
  try { return await run(); }
  finally { if (old === undefined) delete process.env.CCG_REQUEST_IDENTITY; else process.env.CCG_REQUEST_IDENTITY = old; }
}

test('build metadata follows the configured identity source', async () => {
  const client = { user_id: '{"device_id":"client","session_id":"client-session"}' };
  const built = () => ({ model: 'fixture', metadata: { user_id: '{"native":true}' } });
  await context(payload(), () => {
    const result = applyBuildMetadata(built(), client, native);
    assert.deepEqual(JSON.parse(result.metadata.user_id), { device_id: device, account_uuid: 'worker-account',
      session_id: session, native_extra: 'kept', parent_session_id: parent });
  });
  await context(payload({ mode: 'worker', device_id: undefined, session_id: undefined, parent_session_id: undefined }), () => {
    assert.equal(applyBuildMetadata(built(), client, native).metadata.user_id, native().user_id);
  });
  await context(payload({ mode: 'client', rewrite: false }), () => {
    assert.deepEqual(applyBuildMetadata(built(), client, native).metadata, client);
    // The client's own source never invents one either.
    assert.ok(!Object.hasOwn(applyBuildMetadata(built(), undefined, native), 'metadata'));
    assert.deepEqual(applyBuildMetadata(built(), { other: 1 }, native).metadata, { other: 1 });
  });
  // A forwarded client value is never rewritten with this CLI's identity.
  await context(payload({ mode: 'client', rewrite: true }), () => {
    assert.throws(() => applyBuildMetadata(built(), client, native), /Invalid Worker request identity/);
  });
  // A client that sent no identity gets the account's own when the Worker
  // generated one (2026-10-25): the CLI's device and account, the Worker's
  // conversation session, in Claude Code's JSON string, next to the client's
  // other metadata.
  const generated = { version: 2, mode: 'replace', rewrite: true, session_id: parent, carrier: 'json' };
  const own = { device_id: 'b'.repeat(64), account_uuid: 'worker-account', session_id: parent, native_extra: 'kept' };
  await context(generated, () => {
    for (const client of [undefined, {}, { user_id: null }, { user_id: '' }])
      assert.deepEqual(JSON.parse(applyBuildMetadata(built(), client, native).metadata.user_id), own, JSON.stringify(client));
    const kept = applyBuildMetadata(built(), { other: 1 }, native).metadata;
    assert.equal(kept.other, 1);
    assert.deepEqual(JSON.parse(kept.user_id), own);
  });
  // Without the Worker's decision (no mapping key) it still gets none.
  await context({ version: 2, mode: 'worker', rewrite: false }, () => {
    assert.ok(!Object.hasOwn(applyBuildMetadata(built(), undefined, native), 'metadata'));
    assert.deepEqual(applyBuildMetadata(built(), { other: 1 }, native).metadata, { other: 1 });
  });
  // The carrier the client used is preserved.
  await context(payload({ carrier: 'object' }), () => {
    assert.equal(typeof applyBuildMetadata(built(), { user_id: { device_id: 'c' } }, native).metadata.user_id, 'object');
  });
  await context(payload({ carrier: 'flat' }), () => {
    assert.match(applyBuildMetadata(built(), { user_id: 'user_x_account_y_session_z' }, native).metadata.user_id,
      /^user_[a-f0-9]{64}_account_worker-account_session_[a-f0-9-]{36}$/);
  });
  // Without a Worker context the CLI behaves natively.
  await context(undefined, () => {
    const value = { model: 'fixture', metadata: { user_id: 'native' } };
    const before = structuredClone(value);
    assert.deepEqual(applyBuildMetadata(value, client, native), before, 'no Worker context keeps the native metadata');
    assert.equal(requestSessionID(), undefined);
  });
});

// The Worker decides whether the client value is replaced. Direct never
// reaches the CLI with an identity context: it is a pure passthrough.
test('build follows the Worker rewrite decision in every carrier', async () => {
  const built = () => ({ model: 'fixture', metadata: { user_id: native().user_id } });
  // What the Worker sends without a usable field: rewrite false, no carrier.
  const unusable = [{ foo: 'x' }, { device_id: '', session_id: null }, { device_id: null }, '{"device_id":""}', '{"session_id":null}'];
  for (const mode of ['worker', 'replace']) {
    await context({ version: 2, mode, rewrite: false }, () => {
      for (const userID of unusable) {
        assert.deepEqual(applyBuildMetadata(built(), { user_id: userID }, native).metadata, { user_id: userID }, `${mode} build ${JSON.stringify(userID)}`);
      }
      // Missing, null, empty string and empty object: nothing to replace.
      assert.ok(!Object.hasOwn(applyBuildMetadata(built(), undefined, native), 'metadata'));
      for (const userID of [null, '', {}]) assert.deepEqual(applyBuildMetadata(built(), { user_id: userID }, native).metadata, { user_id: userID });
      assert.deepEqual(applyBuildMetadata(built(), { other: 1 }, native).metadata, { other: 1 });
    });
  }
  const carriers = [
    ['object', { device_id: 'c'.repeat(64), session_id: session }],
    ['json', JSON.stringify({ device_id: 'c'.repeat(64), session_id: session })],
    ['flat', `user_${'c'.repeat(64)}_account__session_${session}`],
  ];
  for (const mode of ['worker', 'replace']) {
    for (const [carrier, userID] of carriers) {
      await context(mode === 'replace' ? payload({ carrier }) : { version: 2, mode, rewrite: true, carrier }, () => {
        const fromBuild = applyBuildMetadata(built(), { user_id: userID }, native).metadata.user_id;
        assert.equal(typeof fromBuild, carrier === 'object' ? 'object' : 'string', `${mode}/${carrier}`);
        assert.notDeepEqual(fromBuild, userID, `${mode}/${carrier} was replaced`);
      });
    }
  }
});

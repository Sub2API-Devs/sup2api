import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBuildMetadata, rewriteDirectIdentity, requestSessionID } from '../request-identity.js';
import { openModelRequest, readModelResponse } from '../model-request.js';
import comparisons from './replay-helpers.cjs';

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
  });
  // A client that sent no identity gets none: the native value is discarded.
  await context(payload(), () => {
    assert.ok(!Object.hasOwn(applyBuildMetadata(built(), undefined, native), 'metadata'));
    assert.ok(!Object.hasOwn(applyBuildMetadata(built(), {}, native), 'metadata'));
    assert.deepEqual(applyBuildMetadata(built(), { user_id: null }, native).metadata, { user_id: null });
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

test('direct replaces only the identity span, keeping the client carrier', async () => {
  await context(payload(), () => {
    const before = '{\r\n"model":"fixture","n":9007199254740993,"tool":{"metadata":{"user_id":"untouched"}},' +
      '"messages":[{"role":"user","content":"quote \\"user_id\\"; 中文🙂"}], "meta\\u0064ata": { "other":1e999, "user_\\u0069d" : ';
    const after = ', "suffix": [null, {"deep":[1,2]}] } }\n';
    const source = before + JSON.stringify('{"device_id":"client","account_uuid":"client-account","session_id":"client-session"}') + after;
    const result = rewriteDirectIdentity(source, native);
    const value = JSON.parse(result.slice(before.length, result.length - after.length));
    assert.deepEqual(JSON.parse(value), { device_id: device, account_uuid: 'worker-account',
      session_id: session, native_extra: 'kept', parent_session_id: parent });
    assert(!result.includes('client-account'));
    assert(comparisons.onlyUserIDChanged(source, result));
    assert(!comparisons.onlyUserIDChanged(source, result.replace('9007199254740993', '9007199254740992')));
  });
  await context(payload({ carrier: 'object' }), () => {
    const raw = '{ "metadata": { "user_id": {"device_id":"client","session_id":"s"} }, "n": 1 }';
    const result = rewriteDirectIdentity(raw, native);
    assert.deepEqual(JSON.parse(result), { metadata: { user_id: { device_id: device, account_uuid: 'worker-account',
      session_id: session, native_extra: 'kept', parent_session_id: parent } }, n: 1 });
  });
  await context(payload({ carrier: 'flat' }), () => {
    const raw = `{"metadata":{"user_id":"user_${'ab'.repeat(32)}_account__session_${session}"}}`;
    assert.match(JSON.parse(rewriteDirectIdentity(raw, native)).metadata.user_id,
      /^user_[a-f0-9]{64}_account_worker-account_session_[a-f0-9-]{36}$/);
  });
  // Nothing to replace, or the source is the client's own: exact bytes.
  await context(payload({ mode: 'client', rewrite: false }), () => {
    const raw = '{ "metadata": {"user_id":"client"}, "n": 1 }';
    assert.equal(rewriteDirectIdentity(raw, () => assert.fail('unexpected native read')), raw);
  });
  await context(payload(), () => {
    for (const raw of ['{ "model":"fixture", "messages":[] }',
      '{ "model":"fixture", "metadata": null }',
      '{ "model":"fixture", "metadata": {} }']) {
      assert.equal(rewriteDirectIdentity(raw, () => assert.fail('unexpected native read')), raw, raw);
    }
  });
});

test('identity replacement is resolved after native authentication and sends exactly once', async () => {
  await context(payload(), async () => {
    let authenticated = false, calls = 0;
    const raw = '{ "model":"fixture", "metadata":{"user_id":"client"}, "n":9007199254740993 }';
    const response = await openModelRequest({
      body: { model: 'fixture' }, rawBody: raw,
      transformBody: value => rewriteDirectIdentity(value, () => { assert(authenticated); return native(); }),
    }, 'identity-test', undefined, async () => {
      authenticated = true;
      return { post: (url, request) => ({ asResponse: async () => {
        calls++;
        assert(request.body.includes('worker-account'));
        assert(request.body.includes('9007199254740993'));
        assert(!request.body.includes('client'));
        return new Response('ok');
      } }) };
    }, () => assert.fail('unexpected network'));
    assert.equal((await readModelResponse(response.id, 'identity-test')).text, 'ok');
    assert.equal((await readModelResponse(response.id, 'identity-test')).done, true);
    assert.equal(calls, 1);
  });
});

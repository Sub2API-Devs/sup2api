import test from 'node:test';
import assert from 'node:assert/strict';
import { httpErrorFrame, localErrorFrame, encodeErrorFrame, errorPrefix } from '../request-error.js';

test('HTTP error frame preserves status, provider code, JSON bytes and safe headers', () => {
  const body = '{ "type":"error", "error":{"type":"rate_limit_error","code":"provider_quota","message":"line1\\nline2"},"request_id":"r" }\n';
  const frame = httpErrorFrame({ status: 429, headers: { 'retry-after': '7', 'x-should-retry': 'true', authorization: 'secret', 'set-cookie': 'secret' } }, body);
  assert.equal(frame.status, 429);
  assert.equal(frame.error.code, 'provider_quota');
  assert.equal(frame.body, body);
  assert.deepEqual(frame.headers, { 'retry-after': '7', 'x-should-retry': 'true' });
  const wire = encodeErrorFrame(frame);
  assert.equal(wire.split('\n').length, 2);
  assert.deepEqual(JSON.parse(wire.slice(errorPrefix.length)), frame);
});

test('HTML, empty and oversized HTTP errors have usable bounded fallback fields', () => {
  for (const status of [400, 401, 403, 429, 500, 529]) {
    const frame = httpErrorFrame({ status, headers: {} }, '<html>bad gateway</html>');
    assert.equal(frame.status, status);
    assert.ok(frame.error.type && frame.error.code && frame.error.message);
  }
  assert.equal(httpErrorFrame({ status: 500 }, 'large', true).body, undefined);
});

test('local exceptions expose stable codes without leaking exception messages or stacks', () => {
  const error = Object.assign(new Error('https://user:secret@host/?token=private'), { code: 'ECONNRESET' });
  const frame = localErrorFrame(error, { phase: 'transport' });
  assert.equal(frame.status, 502);
  assert.equal(frame.error.code, 'ECONNRESET');
  assert.ok(!encodeErrorFrame(frame).includes('private'));
  assert.ok(!encodeErrorFrame(frame).includes('secret'));
  assert.equal(localErrorFrame(error, { phase: 'input' }).status, 400);
  assert.equal(localErrorFrame(error, { timedOut: true }).status, 504);
  assert.equal(localErrorFrame(error, { responseStarted: true }).responseStarted, true);
});

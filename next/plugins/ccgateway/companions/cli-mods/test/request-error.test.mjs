import test from 'node:test';
import assert from 'node:assert/strict';
import { httpErrorFrame, localErrorFrame, encodeErrorFrame, errorPrefix, maxErrorBody } from '../request-error.js';

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

test('a JSON string error body supplies the message instead of the fallback', () => {
  const frame = httpErrorFrame({ status: 429, headers: {} }, JSON.stringify('quota exceeded'));
  assert.equal(frame.error.message, 'quota exceeded');
  assert.equal(frame.body, '"quota exceeded"');
});

test('string error fields remain supported alongside object and top-level messages', () => {
  for (const payload of [{ error: 'quota exceeded' }, { error: { message: 'quota exceeded' } }, { message: 'quota exceeded' }]) {
    const body = JSON.stringify(payload);
    const frame = httpErrorFrame({ status: 429, headers: {} }, body);
    assert.equal(frame.error.message, 'quota exceeded');
    assert.equal(frame.body, body);
  }
  const frame = httpErrorFrame({ status: 429 }, '{"error":"secondary","message":"primary"}');
  assert.equal(frame.error.message, 'primary');
});

test('a truncated JSON response retains its string error for the Worker envelope', () => {
  for (const payload of ['quota exceeded', { error: 'quota exceeded' }]) {
    const prefix = JSON.stringify(payload).padEnd(maxErrorBody, ' ');
    const frame = httpErrorFrame({ status: 429 }, prefix, true);
    assert.equal(frame.error.message, 'quota exceeded');
    assert.equal(frame.status, 429);
    assert.equal(frame.truncated, true);
    assert.equal(frame.body, undefined);
  }
});

test('interruption keeps the type consistent with its 502 status', () => {
  for (const phase of ['input', 'build', 'transport', 'output']) {
    const frame = localErrorFrame(new Error('interrupted'), { phase, interrupted: true });
    assert.equal(frame.source, 'interrupted');
    assert.equal(frame.status, 502);
    assert.equal(frame.error.type, 'api_error');
    assert.equal(frame.error.code, 'cli_interrupted');
  }
});

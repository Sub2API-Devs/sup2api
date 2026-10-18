import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBetas, parseRequestOptions, parseRequestJSON, apiKeyRequestHeaders } from '../request-options.js';

test('betas have one canonical representation across flags and differently cased headers', () => {
  const parsed = parseRequestOptions(['--build', '--betas', 'a, b,,a', '--header', 'Anthropic-Beta: c,b', '--header', 'anthropic-beta: D', 'body.json']);
  assert.equal(parsed.input, 'body.json');
  assert.deepEqual(parsed.betas, ['a', 'b', 'c', 'D']);
  assert.equal(parsed.headers['anthropic-beta'], 'a,b,c,D');
  assert.deepEqual(normalizeBetas('', ['a', 'a', 'B']), ['a', 'B']);
  assert.throws(() => normalizeBetas('a\r\nX-Test: x'), /tokens/);
  assert.throws(() => normalizeBetas('a，b'), /token/);
});

test('positional file, stdin and input conflicts are explicit', () => {
  assert.equal(parseRequestOptions(['--direct', '-']).input, '-');
  assert.equal(parseRequestOptions(['--direct']).input, '-');
  assert.equal(parseRequestOptions(['--input', 'x']).input, 'x');
  assert.throws(() => parseRequestOptions(['x', '--input', 'y']), /one input/);
  assert.throws(() => parseRequestOptions(['--build', '--direct']), /mutually/);
  for (const key of ['Authorization', 'X-Api-Key', 'X-Claude-Code-Session-Id', 'Content-Encoding', 'User-Agent']) {
    assert.throws(() => parseRequestOptions(['--header', `${key}:sentinel`]), /not a client protocol header/);
  }
});

test('API-key header policy excludes environment, CC and SDK header pollution', () => {
  const native = new Headers({ 'x-api-key': 'fake', 'anthropic-beta': 'environment-beta,oauth-2025-04-20', 'x-app': 'cli', 'x-stainless-os': 'worker', 'x-client-request-id': 'worker-id', 'user-agent': 'sentinel', 'content-length': '99', 'x-is-refusal-fallback': '1' });
  const result = apiKeyRequestHeaders(native, { apiKey: 'fake', betas: ['client-beta'] });
  assert.deepEqual([...result.keys()].sort(), ['accept', 'anthropic-beta', 'anthropic-version', 'content-type', 'user-agent', 'x-api-key']);
  assert.equal(result.get('user-agent'), 'ccgateway-request');
  assert.equal(result.get('anthropic-beta'), 'client-beta');
  assert.equal(apiKeyRequestHeaders(native, { apiKey: 'fake', betas: [] }).has('anthropic-beta'), false);
  assert.throws(() => apiKeyRequestHeaders(native, { apiKey: 'different' }), /authentication/);
  native.set('authorization', 'Bearer fake-subscription');
  assert.throws(() => apiKeyRequestHeaders(native, { apiKey: 'fake' }), /authentication/);
});

test('build rejects unsafe numbers before parsing, direct keeps raw-source eligibility', () => {
  const raw = '{"large":9007199254740993,"text":"9007199254740993"}';
  assert.throws(() => parseRequestJSON(raw, 'build'), /unsafe JSON number/);
  assert.doesNotThrow(() => parseRequestJSON(raw, 'direct'));
  assert.equal(parseRequestJSON('{"text":"9007199254740993","n":12.5}', 'build').n, 12.5);
});

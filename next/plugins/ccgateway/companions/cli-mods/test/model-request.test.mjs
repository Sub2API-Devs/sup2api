import test from 'node:test';
import assert from 'node:assert/strict';
import { checkModelRequest, openModelRequest, readModelResponse, cancelModelResponse } from '../model-request.js';

const options = { body: { model: 'fixture', messages: [], unknown: { keep: true } } };
const factory = response => async () => ({ post: () => ({ asResponse: async () => response }) });
const unusedFetch = () => assert.fail('unexpected network access');

test('the request goes to the beta Messages path, as Claude Code sends it', async () => {
  let path;
  await openModelRequest(options, undefined, async () => ({ post: p => { path = p; return { asResponse: async () => new Response('{}') }; } }), unusedFetch);
  assert.equal(path, '/v1/messages?beta=true');
});

test('binary error reads preserve invalid UTF-8, NUL and bodies larger than 64 KiB', async () => {
  const bytes = Buffer.concat([Buffer.from([0xff, 0, 0x80]), Buffer.alloc(150000, 0x61)]);
  const response = await openModelRequest(options, undefined, factory(new Response(bytes, { status: 400 })), unusedFetch);
  const parts = [];
  for (;;) { const part = await readModelResponse(response, undefined, true); parts.push(part.bytes); if (part.done) break; }
  assert.deepEqual(Buffer.concat(parts), bytes);
});

test('authentication belongs to CC, while beta headers and body fields remain available', () => {
  assert.equal(checkModelRequest({ ...options, headers: { 'anthropic-beta': 'fixture' } }), undefined);
  assert.match(checkModelRequest({ ...options, headers: { AUTHORIZATION: 'bad' } }), /owned by the CC transport/);
  assert.match(checkModelRequest({ ...options, headers: { 'X-Api-Key': 'bad' } }), /owned by the CC transport/);
  assert.match(checkModelRequest({ ...options, timeoutMs: NaN }), /timeoutMs/);
});

test('chunking preserves split UTF-8 and large streams and closes at EOF', async () => {
  const expected = '中文🙂' + 'a'.repeat(140000);
  const bytes = new TextEncoder().encode(expected);
  const stream = new ReadableStream({ start(c) { c.enqueue(bytes.subarray(0, 1)); c.enqueue(bytes.subarray(1)); c.close(); } });
  const response = await openModelRequest(options, undefined, factory(new Response(stream)), unusedFetch);
  let text = '', reads = 0;
  for (;;) { const part = await readModelResponse(response); reads++; text += part.text; if (part.done) break; }
  assert.equal(text, expected);
  assert.ok(reads >= 4);
  await assert.rejects(readModelResponse(response), /closed/);
});

test('a cancelled response cannot be read, and cancelling twice is harmless', async () => {
  const response = await openModelRequest(options, undefined, factory(new Response('private')), unusedFetch);
  assert.equal((await readModelResponse(response)).text, 'private');
  await cancelModelResponse(response);
  await cancelModelResponse(response);
  await assert.rejects(readModelResponse(response), /closed/);
});

test('cancellation closes the response body and aborts the CC transport signal', async () => {
  let cancelled = false, signal;
  const response = await openModelRequest(options, undefined, async init => {
    signal = init.signal;
    return factory(new Response(new ReadableStream({ cancel() { cancelled = true; } })))();
  }, unusedFetch);
  await cancelModelResponse(response);
  assert.equal(cancelled, true);
  assert.equal(signal.aborted, true);
});

test('captured HTTP errors preserve their exact response body', async () => {
  const text = '{ "error": "fixture" }\n';
  const response = await openModelRequest(options, undefined, async init => ({ post: () => ({ asResponse: async () => {
    const raw = await init.fetchOverride('http://fixture.invalid');
    await raw.text();
    throw new Error('SDK HTTP exception');
  } }) }), async () => new Response(text, { status: 400, headers: { 'x-fixture': 'kept' } }));
  assert.equal(response.status, 400);
  assert.equal(response.headers['x-fixture'], 'kept');
  let actual = '';
  for (;;) { const part = await readModelResponse(response); actual += part.text; if (part.done) break; }
  assert.equal(actual, text);
});

test('OAuth direct fetch preserves body bytes and exposes only safe authentication metadata', async () => {
  const rawBody = '{ "model":"fixture", "messages":[], "n":9007199254740993 }';
  // The request command places the login's beta in the request's final list
  // (request-headers.js finalBetas); the transport writes it as it is.
  const response = await openModelRequest({ ...options, rawBody, headerPolicy: { betas: ['client-beta', 'oauth-fixture'], oauthBeta: 'oauth-fixture' } }, undefined,
    async init => ({ post: (url, request) => ({ asResponse: () => init.fetchOverride(url, { body: request.body, headers: { authorization: 'Bearer native-secret', 'user-agent': 'native-cc' } }) }) }),
    async (url, init) => {
      assert.equal(init.body, rawBody);
      assert.equal(init.headers.get('authorization'), 'Bearer native-secret');
      assert.equal(init.headers.get('anthropic-beta'), 'client-beta,oauth-fixture');
      return new Response('ok');
    });
  assert.deepEqual(response.request, { authProfile: 'oauth', betas: ['client-beta', 'oauth-fixture'] });
  assert.equal(JSON.stringify(response).includes('native-secret'), false);
  await cancelModelResponse(response);
});

// x-stainless-timeout comes from the client's own timeout: Claude Code's
// default 600 s, not the gateway's longer deadline, which bounds the exchange
// separately. A shorter deadline still wins.
test('the client timeout stays Claude Code default unless the deadline is shorter', async () => {
  for (const [timeoutMs, expected] of [[undefined, 600000], [3600000, 600000], [120000, 120000]]) {
    let seen;
    const response = await openModelRequest({ ...options, timeoutMs }, undefined, async () => ({ post: (path, request) => { seen = request.timeout; return { asResponse: async () => new Response('ok') }; } }), unusedFetch);
    await cancelModelResponse(response);
    assert.equal(seen, expected, String(timeoutMs));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { checkModelRequest, openModelRequest, readModelResponse, cancelModelResponse, messagesPath } from '../model-request.js';

const options = { body: { model: 'fixture', messages: [], unknown: { keep: true } }, nativeCreate: true };
// The SDK client as the transport uses it: the beta Messages create (build) and
// a raw post (direct). A route the caller did not expect fails the test.
const route = ({ create, post } = {}) => ({
  post: (...args) => ({ asResponse: async () => (post ? post(...args) : assert.fail('unexpected raw post')) }),
  beta: { messages: { create: (...args) => ({ asResponse: async () => (create ? create(...args) : assert.fail('unexpected beta create')) }) } },
});
const factory = response => async () => route({ create: () => response });
const unusedFetch = () => assert.fail('unexpected network access');

// Build sends through the SDK's own beta Messages call: the path, ?beta=true,
// the betas header, the non-streaming timeout rule and x-stainless-helper are
// the SDK's. Direct sends its raw bytes to the endpoint that call posts to.
test('build goes through the native beta Messages create, direct posts raw bytes to its endpoint', async () => {
  // The endpoint is filled in at patch time from the native SDK's own create
  // (patch-wire-preservation checks the installed module against it).
  let created;
  await openModelRequest(options, undefined, async () => route({ create: (body, request) => { created = { body, request }; return new Response('{}'); } }), unusedFetch);
  assert.deepEqual(created.body, options.body);
  // The request's own headers and the client's timeout travel with it; the
  // native non-streaming timeout rule never applies because the caller sets it.
  assert.ok(created.request.headers instanceof Headers);
  assert.equal(created.request.timeout, 600000);
  assert.equal(created.request.maxRetries, 0);
  let posted;
  await openModelRequest({ ...options, nativeCreate: false, rawBody: '{"model":"fixture"}' }, undefined, async () => route({ post: (path, request) => { posted = { path, request }; return new Response('{}'); } }), unusedFetch);
  assert.equal(posted.path, messagesPath);
  assert.equal(posted.request.body, '{"model":"fixture"}');
  assert.equal(posted.request.headers.get('content-type'), 'application/json');
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
    return route({ create: () => new Response(new ReadableStream({ cancel() { cancelled = true; } })) });
  }, unusedFetch);
  await cancelModelResponse(response);
  assert.equal(cancelled, true);
  assert.equal(signal.aborted, true);
});

test('captured HTTP errors preserve their exact response body', async () => {
  const text = '{ "error": "fixture" }\n';
  const response = await openModelRequest(options, undefined, async init => route({ create: async () => {
    const raw = await init.fetchOverride('http://fixture.invalid');
    await raw.text();
    throw new Error('SDK HTTP exception');
  } }), async () => new Response(text, { status: 400, headers: { 'x-fixture': 'kept' } }));
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
  const response = await openModelRequest({ ...options, nativeCreate: false, rawBody, headerPolicy: { betas: ['client-beta', 'oauth-fixture'], oauthBeta: 'oauth-fixture' } }, undefined,
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
    const response = await openModelRequest({ ...options, timeoutMs }, undefined, async () => route({ create: (body, request) => { seen = request.timeout; return new Response('ok'); } }), unusedFetch);
    await cancelModelResponse(response);
    assert.equal(seen, expected, String(timeoutMs));
  }
});

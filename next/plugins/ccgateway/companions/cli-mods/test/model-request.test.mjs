import test from 'node:test';
import assert from 'node:assert/strict';
import { checkModelRequest, openModelRequest, readModelResponse, cancelModelResponse } from '../model-request.js';

const options = { body: { model: 'fixture', messages: [], unknown: { keep: true } } };
const factory = response => async () => ({ post: () => ({ asResponse: async () => response }) });
const unusedFetch = () => assert.fail('unexpected network access');

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
  const response = await openModelRequest(options, 'owner', undefined, factory(new Response(stream)), unusedFetch);
  let text = '', reads = 0;
  for (;;) { const part = await readModelResponse(response.id, 'owner'); reads++; text += part.text; if (part.done) break; }
  assert.equal(text, expected);
  assert.ok(reads >= 4);
  await assert.rejects(readModelResponse(response.id, 'owner'), /closed/);
});

test('only the request owner can read or cancel a response', async () => {
  const response = await openModelRequest(options, 'owner', undefined, factory(new Response('private')), unusedFetch);
  await assert.rejects(readModelResponse(response.id, 'other'), /another mod/);
  await assert.rejects(cancelModelResponse(response.id, 'other'), /another mod/);
  assert.equal((await readModelResponse(response.id, 'owner')).text, 'private');
  await cancelModelResponse(response.id, 'owner');
  await cancelModelResponse(response.id, 'owner');
});

test('cancellation closes the response body and aborts the CC transport signal', async () => {
  let cancelled = false, signal;
  const response = await openModelRequest(options, 'owner', undefined, async init => {
    signal = init.signal;
    return factory(new Response(new ReadableStream({ cancel() { cancelled = true; } })))();
  }, unusedFetch);
  await cancelModelResponse(response.id, 'owner');
  assert.equal(cancelled, true);
  assert.equal(signal.aborted, true);
});

test('captured HTTP errors preserve their exact response body', async () => {
  const text = '{ "error": "fixture" }\n';
  const response = await openModelRequest(options, 'owner', undefined, async init => ({ post: () => ({ asResponse: async () => {
    const raw = await init.fetchOverride('http://fixture.invalid');
    await raw.text();
    throw new Error('SDK HTTP exception');
  } }) }), async () => new Response(text, { status: 400, headers: { 'x-fixture': 'kept' } }));
  assert.equal(response.status, 400);
  assert.equal(response.headers['x-fixture'], 'kept');
  let actual = '';
  for (;;) { const part = await readModelResponse(response.id, 'owner'); actual += part.text; if (part.done) break; }
  assert.equal(actual, text);
});

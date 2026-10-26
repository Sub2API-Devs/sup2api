// The request command's raw Messages transport. The caller supplies CC's
// authenticated client factory; credentials and fetch policy stay inside it.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { authenticatedRequestHeaders, normalizeBetas } from './request-headers.js';
const forbiddenHeaders = new Set(['authorization', 'proxy-authorization', 'x-api-key', 'host', 'cookie', 'connection', 'content-length', 'transfer-encoding']);
// The deadline of a request without --timeout-ms, and Claude Code's own
// client timeout.
export const defaultTimeout = 600000;
// A response handle's stream state, kept off its JSON.
const stream = Symbol('ccgateway.model-response');

// checkModelRequest is the reason a request cannot be sent, or undefined.
export function checkModelRequest(options) {
  if (!options || typeof options !== 'object' || !options.body || typeof options.body !== 'object' || Array.isArray(options.body)) return 'the request body must be a Messages JSON object';
  if (typeof options.body.model !== 'string' || !options.body.model.trim()) return 'body.model must be a non-empty string';
  if (options.rawBody !== undefined && typeof options.rawBody !== 'string') return 'rawBody must be JSON text';
  if (options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 2147483647)) return 'timeoutMs must be a positive 32-bit integer';
  if (options.headers !== undefined) {
    if (!options.headers || typeof options.headers !== 'object' || Array.isArray(options.headers)) return 'headers must be a string-valued object';
    for (const [name, value] of Object.entries(options.headers)) {
      if (forbiddenHeaders.has(name.toLowerCase())) return `header ${name} is owned by the CC transport`;
      if (typeof value !== 'string') return `header ${name} must be a string`;
    }
  }
}

async function close(entry, reason) {
  if (entry.closed) return;
  entry.closed = true;
  clearTimeout(entry.timer);
  entry.signal?.removeEventListener('abort', entry.onAbort);
  if (reason !== undefined) entry.controller.abort(reason);
  try { await entry.reader?.cancel(reason); } catch { /* Closing is idempotent. */ }
}

// openEntry is a response handle's stream state and the two deadlines that
// close it: the caller's signal and the request's own timeout.
function openEntry(options, signal) {
  const entry = { controller: new AbortController(), signal, closed: false, busy: false, decoder: new TextDecoder(), pending: new Uint8Array() };
  entry.onAbort = () => { void close(entry, signal.reason ?? new Error('model request aborted')); };
  signal?.addEventListener('abort', entry.onAbort, { once: true });
  entry.timer = setTimeout(() => { void close(entry, new Error('model request timed out')); }, options.timeoutMs ?? defaultTimeout);
  entry.timer.unref?.();
  return entry;
}

// requestCapture is the record of what a request sent (--capture-request,
// request_capture_v1): <prefix>.json, the facts and headers of the last send,
// and with body also <prefix>.body, its bytes. The fetch boundary calls sent()
// with the final url and init; the record never delays or fails the send: only
// the headers (and a binary body, which the transport may reuse) are copied
// before it, everything else is done once the send has started, one send after
// another, and a failed write is dropped. settle() is the command's wait for
// the writes before it exits. Each send overwrites the files; attempts counts.
export function requestCapture({ prefix, body = false, mode }) {
  const capture = { prefix, body, mode, attempts: 0, written: Promise.resolve() };
  capture.sent = (url, init) => {
    const attempts = ++capture.attempts, sentAt = new Date().toISOString();
    let sent;
    try { sent = sendSnapshot(url, init); } catch { return; }
    capture.written = capture.written
      .then(() => new Promise(resolve => setImmediate(resolve)))
      .then(() => writeCapture(capture, sent, attempts, sentAt))
      .catch(() => {});
  };
  capture.settle = async () => {
    for (let last; last !== capture.written;) await (last = capture.written);
  };
  return capture;
}

// The values of these headers are secrets: the record names them only.
const secretHeaders = new Set(['authorization', 'proxy-authorization', 'x-api-key', 'cookie']);

// sendSnapshot is what a send carries, read at its fetch boundary: the headers
// as fetch combines them (lower-case names, sorted, secrets redacted), and the
// body as a string, a copy of its bytes, or null when it is neither (a stream,
// which the record does not read).
function sendSnapshot(url, init = {}) {
  const headers = {};
  const entries = [...new Headers(init.headers ?? undefined)].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [name, value] of entries) headers[name] = secretHeaders.has(name) ? '[REDACTED]' : value;
  const href = typeof url === 'string' ? url : url instanceof URL ? url.href : String(url?.url ?? url);
  const method = String(init.method ?? url?.method ?? 'GET').toUpperCase();
  const { body } = init;
  let sentBody = null, encoding = 'identity';
  if (body === undefined || body === null) sentBody = '';
  else if (typeof body === 'string') sentBody = body;
  else if (body instanceof ArrayBuffer) sentBody = Buffer.from(new Uint8Array(body));
  else if (ArrayBuffer.isView(body)) sentBody = Buffer.from(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
  if (sentBody instanceof Buffer && headers['content-encoding']) encoding = headers['content-encoding'];
  return { method, url: href, headers, body: sentBody, encoding };
}

// sentFacts is the model and stream flag of a JSON body the record can read;
// an encoded or unreadable body has neither.
function sentFacts(bytes, encoding) {
  if (encoding !== 'identity') return { model: '', stream: null };
  try {
    const body = JSON.parse(bytes.toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { model: '', stream: null };
    return { model: typeof body.model === 'string' ? body.model : '', stream: body.stream === true };
  } catch { return { model: '', stream: null }; }
}

// contentBytes is a JSON body without the whitespace after it: CC's own
// transport pads a large first-party body with a newline and random blanks
// before this boundary (chunk-38xgev2z.js cy), so the content digest compares
// what was asked for, not that padding.
function contentBytes(bytes) {
  let end = bytes.length;
  while (end > 0 && (bytes[end - 1] === 0x20 || bytes[end - 1] === 0x09 || bytes[end - 1] === 0x0a || bytes[end - 1] === 0x0d)) end--;
  return bytes.subarray(0, end);
}

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function writeCapture(capture, sent, attempts, sentAt) {
  const bytes = typeof sent.body === 'string' ? Buffer.from(sent.body, 'utf8') : sent.body;
  const { model, stream } = bytes ? sentFacts(bytes, sent.encoding) : { model: '', stream: null };
  const readable = bytes && sent.encoding === 'identity';
  const record = {
    schema: 1, mode: capture.mode, attempts, sent_at: sentAt, method: sent.method, url: sent.url, headers: sent.headers,
    body_encoding: bytes ? sent.encoding : 'binary', body_bytes: bytes ? bytes.length : -1,
    body_sha256: bytes ? sha256(bytes) : '', content_sha256: readable ? sha256(contentBytes(bytes)) : '', model, stream,
  };
  // The body goes first, so a record on disk never names bytes not yet there.
  if (capture.body) {
    if (bytes) await fs.writeFile(capture.prefix + '.body', bytes, { mode: 0o600 });
    else await fs.rm(capture.prefix + '.body', { force: true });
  }
  await fs.writeFile(capture.prefix + '.json', JSON.stringify(record, null, 2), { mode: 0o600 });
}

// captureErrorResponse wraps the transport so the header policy is applied and
// the last HTTP error answer is kept: the client throws its own error for a
// non-2xx answer, and that response is what the caller reads. request is the
// authentication and betas actually sent, once the transport supplied headers.
function captureErrorResponse(options, transportFetch) {
  const captured = { response: undefined, request: undefined };
  captured.fetchOverride = async (...args) => {
    if (options.headerPolicy) {
      const [url, init] = args;
      if (!init || init.headers === undefined) throw Error('CC transport did not supply request headers');
      const headers = authenticatedRequestHeaders(init.headers, options.headerPolicy);
      captured.request = { authProfile: headers.has('authorization') ? 'oauth' : 'api-key', betas: normalizeBetas(headers.get('anthropic-beta')) };
      args = [url, { ...init, headers }];
    }
    // A build's numbers go as the client wrote them (request-options.js).
    if (options.restoreNumbers) {
      const [url, init] = args;
      if (typeof init?.body !== 'string') throw Error('CC transport did not supply a JSON request body');
      args = [url, { ...init, body: options.restoreNumbers(init.body) }];
    }
    // What leaves for the transport, once nothing here changes it any more.
    options.capture?.sent(...args);
    const response = await transportFetch(...args);
    if (!response.ok) {
      await captured.response?.body?.cancel().catch(() => {});
      captured.response = response.clone();
    }
    return response;
  };
  return captured;
}

// Build sends through the SDK's own beta Messages call (chunk-38xgev2z.js
// Ps.create): the path with ?beta=true, the betas header, the non-streaming
// timeout rule and x-stainless-helper are the SDK's. Direct sends raw bytes, so
// it posts to the endpoint that call uses; patch-cli-2.1.304.cjs reads the path
// from that native create (AST) and fills it here, so no copy is written down.
export const messagesPath = /*CCGATEWAY_MESSAGES_PATH*/ '';

// sendOnce is the client's one send: build as the SDK's beta Messages call (the
// caller built an object body), direct as its raw bytes to the same endpoint.
// The deadline of openEntry bounds the whole exchange, and the client's own
// timeout (sent as x-stainless-timeout) stays Claude Code's default, as a
// native request carries it, unless the deadline is shorter. Passing it
// explicitly keeps the native non-streaming timeout rule out of a build's way.
function sendOnce(client, options, entry) {
  const headers = new Headers(options.headers);
  const request = {
    headers, signal: entry.controller.signal,
    maxRetries: 0, timeout: Math.min(options.timeoutMs ?? defaultTimeout, defaultTimeout),
  };
  // Build hands the SDK an object body; direct's raw JSON bytes go to the
  // endpoint the beta Messages call posts to.
  if (options.nativeCreate === true) return client.beta.messages.create(options.body, request).asResponse();
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return client.post(messagesPath, {
    body: options.rawBody, stream: options.body.stream === true, ...request,
  }).asResponse();
}

// openModelRequest sends the request; the response it returns is read with
// readModelResponse and closed with cancelModelResponse. The caller checked its
// input once, at the request boundary (checkModelRequest): this module sends
// the request it was given.
export async function openModelRequest(options, signal, createClient, transportFetch) {
  if (signal?.aborted) throw new Error('model request aborted');
  const entry = openEntry(options, signal);
  const captured = captureErrorResponse(options, transportFetch);
  try {
    const client = await createClient({
      model: options.body.model, signal: entry.controller.signal, fetchOverride: captured.fetchOverride,
    });
    let response;
    try {
      response = await sendOnce(client, options, entry);
    } catch (error) {
      if (!captured.response || entry.controller.signal.aborted) throw error;
      response = captured.response;
      captured.response = undefined;
    }
    if (entry.closed) { await response.body?.cancel(); throw new Error('model request aborted'); }
    await captured.response?.body?.cancel().catch(() => {});
    entry.reader = response.body?.getReader();
    const { request } = captured;
    return { [stream]: entry, status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers), ok: response.ok, ...(request && { request }) };
  } catch (error) {
    await close(entry, error);
    await captured.response?.body?.cancel().catch(() => {});
    throw error;
  }
}

export async function readModelResponse(response, signal, binary = false) {
  const entry = response[stream];
  if (entry.closed) throw new Error('model response is closed');
  if (entry.busy) throw new Error('model response already has an active reader');
  entry.busy = true;
  const abort = () => { void close(entry, signal.reason ?? new Error('model response aborted')); };
  if (signal?.aborted) { await close(entry, signal.reason); throw new Error('model response aborted'); }
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (!entry.pending.length) {
      const read = await entry.reader?.read() ?? { done: true };
      if (entry.controller.signal.aborted) throw entry.controller.signal.reason;
      if (read.done) {
        const text = binary ? undefined : entry.decoder.decode();
        await close(entry);
        return binary ? { done: true, bytes: new Uint8Array() } : { done: true, text };
      }
      entry.pending = read.value;
    }
    const part = entry.pending.subarray(0, 65536);
    entry.pending = entry.pending.subarray(part.length);
    return binary ? { done: false, bytes: part } : { done: false, text: entry.decoder.decode(part, { stream: true }) };
  } catch (error) { await close(entry, error); throw error; }
  finally { entry.busy = false; signal?.removeEventListener('abort', abort); }
}

export async function cancelModelResponse(response) {
  await close(response[stream], new Error('model response cancelled'));
}

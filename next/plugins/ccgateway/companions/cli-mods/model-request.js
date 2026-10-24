// The request command's raw Messages transport. The caller supplies CC's
// authenticated client factory; credentials and fetch policy stay inside it.
import { authenticatedRequestHeaders, normalizeBetas } from './request-options.js';
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
    const response = await transportFetch(...args);
    if (!response.ok) {
      await captured.response?.body?.cancel().catch(() => {});
      captured.response = response.clone();
    }
    return response;
  };
  return captured;
}

// sendOnce is the client's one POST of the request; the deadline of openEntry
// bounds the whole exchange, and the client's own timeout (sent as
// x-stainless-timeout) stays Claude Code's default, as a native request
// carries it, unless the deadline is shorter.
function sendOnce(client, options, entry) {
  const headers = new Headers(options.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  const body = options.rawBody ?? options.body;
  return client.post('/v1/messages', {
    body, stream: options.body.stream === true,
    headers, signal: entry.controller.signal,
    maxRetries: 0, timeout: Math.min(options.timeoutMs ?? defaultTimeout, defaultTimeout),
  }).asResponse();
}

// openModelRequest sends the request; the response it returns is read with
// readModelResponse and closed with cancelModelResponse.
export async function openModelRequest(options, signal, createClient, transportFetch) {
  const error = checkModelRequest(options);
  if (error) throw new Error(error);
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

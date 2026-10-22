// Host-side raw Messages transport. The caller supplies CC's authenticated
// client factory; credentials and fetch policy stay inside that factory.
import { authenticatedRequestHeaders, normalizeBetas } from './request-options.js';
const streams = new Map();
const forbiddenHeaders = new Set(['authorization', 'proxy-authorization', 'x-api-key', 'host', 'cookie', 'connection', 'content-length', 'transfer-encoding']);
const defaultTimeout = 600000;

export function checkModelRequest(options) {
  if (!options || typeof options !== 'object' || !options.body || typeof options.body !== 'object' || Array.isArray(options.body)) return 'takes { body: a Messages JSON object, headers?, timeoutMs? }';
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

function owned(id, owner) {
  const entry = streams.get(id);
  if (!entry || entry.owner !== owner) throw new Error('model response is closed or belongs to another mod');
  return entry;
}

async function close(entry, reason) {
  if (entry.closed) return;
  entry.closed = true;
  streams.delete(entry.id);
  clearTimeout(entry.timer);
  entry.signal?.removeEventListener('abort', entry.onAbort);
  if (reason !== undefined) entry.controller.abort(reason);
  try { await entry.reader?.cancel(reason); } catch { /* Closing is idempotent. */ }
}

export async function openModelRequest(options, owner, signal, createClient, transportFetch) {
  const error = checkModelRequest(options);
  if (error) throw new Error(error);
  if (signal?.aborted) throw new Error('model request aborted');
  const entry = { id: crypto.randomUUID(), owner, controller: new AbortController(), signal, closed: false, busy: false, decoder: new TextDecoder(), pending: new Uint8Array() };
  entry.onAbort = () => { void close(entry, signal.reason ?? new Error('model request aborted')); };
  signal?.addEventListener('abort', entry.onAbort, { once: true });
  entry.timer = setTimeout(() => { void close(entry, new Error('model request timed out')); }, options.timeoutMs ?? defaultTimeout);
  entry.timer.unref?.();
  let errorResponse, request;
  try {
    const client = await createClient({
      model: options.body.model, signal: entry.controller.signal,
      fetchOverride: async (...args) => {
        if (options.headerPolicy) {
          const [url, init] = args;
          if (!init || init.headers === undefined) throw Error('CC transport did not supply request headers');
          const headers = authenticatedRequestHeaders(init.headers, options.headerPolicy);
          request = { authProfile: headers.has('authorization') ? 'oauth' : 'api-key', betas: normalizeBetas(headers.get('anthropic-beta')) };
          args = [url, { ...init, headers }];
        }
        const response = await transportFetch(...args);
        if (!response.ok) {
          await errorResponse?.body?.cancel().catch(() => {});
          errorResponse = response.clone();
        }
        return response;
      },
    });
    let response;
    try {
      const headers = new Headers(options.headers);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      const body = options.transformBody ? options.transformBody(options.rawBody ?? options.body) : options.rawBody ?? options.body;
      // The deadline above bounds the whole exchange. The client's own timeout
      // (sent as x-stainless-timeout) stays Claude Code's default, as a native
      // request carries it, unless the deadline is shorter.
      response = await client.post('/v1/messages', {
        body, stream: options.body.stream === true,
        headers, signal: entry.controller.signal,
        maxRetries: 0, timeout: Math.min(options.timeoutMs ?? defaultTimeout, defaultTimeout),
      }).asResponse();
    } catch (error) {
      if (!errorResponse || entry.controller.signal.aborted) throw error;
      response = errorResponse;
      errorResponse = undefined;
    }
    if (entry.closed) { await response.body?.cancel(); throw new Error('model request aborted'); }
    await errorResponse?.body?.cancel().catch(() => {});
    entry.reader = response.body?.getReader();
    streams.set(entry.id, entry);
    return { id: entry.id, status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers), ok: response.ok, ...(request && { request }) };
  } catch (error) {
    await close(entry, error);
    await errorResponse?.body?.cancel().catch(() => {});
    throw error;
  }
}

export async function readModelResponse(id, owner, signal, binary = false) {
  const entry = owned(id, owner);
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

export async function cancelModelResponse(id, owner) {
  const entry = streams.get(id);
  if (!entry) return { closed: true };
  if (entry.owner !== owner) throw new Error('model response belongs to another mod');
  await close(entry, new Error('model response cancelled'));
  return { closed: true };
}

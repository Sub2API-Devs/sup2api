// One bounded JSON line on stderr. stdout is exclusively successful response data.
export const errorPrefix = 'CCG_REQUEST_ERROR ';
export const errorProtocol = 'ccgateway.request.error.v1';
export const maxErrorBody = 64 * 1024;

function errorType(status) {
  return ({ 400: 'invalid_request_error', 401: 'authentication_error', 403: 'permission_error',
    404: 'not_found_error', 413: 'request_too_large', 429: 'rate_limit_error',
    503: 'overloaded_error', 504: 'timeout_error', 529: 'overloaded_error' })[status] ?? 'api_error';
}

function text(value, fallback, max = 2048) {
  return typeof value === 'string' && value ? value.slice(0, max) : fallback;
}

export function httpErrorFrame(response, body, truncated = false) {
  const status = response.status >= 400 && response.status <= 599 ? response.status : 502;
  let parsed;
  try { parsed = JSON.parse(body); } catch { /* Diagnostics only; HTTP bytes remain opaque. */ }
  const detail = parsed?.error;
  const type = text(detail?.type, errorType(status), 128);
  const nativeCode = typeof detail?.code === 'number' && Number.isFinite(detail.code) ? String(detail.code) : detail?.code;
  const code = text(nativeCode, type, 128);
  const message = text(detail?.message ?? parsed?.message ?? (typeof detail === 'string' ? detail : undefined) ?? (typeof parsed === 'string' ? parsed : undefined), `Upstream returned HTTP ${response.status}`);
  const headers = {};
  const original = new Headers(response.headers);
  const hop = new Set((original.get('connection') ?? '').split(',').map(name => name.trim().toLowerCase()));
  for (const [name, value] of original) {
    if (!hop.has(name) && /^(content-type|request-id|anthropic-request-id|retry-after|x-should-retry|anthropic-ratelimit-[\w-]+|anthropic-fast-[\w-]+)$/.test(name) && value.length <= 1024) headers[name] = value;
  }
  // Bound header metadata even if an upstream sends many distinct names.
  const selected = Object.fromEntries(Object.entries(headers).slice(0, 32));
  return { protocol: errorProtocol, source: 'http', status, error: { type, code, message },
    headers: selected, ...(truncated ? { truncated: true } : { body }) };
}

export function localErrorFrame(error, { phase, timedOut, interrupted, responseStarted } = {}) {
  let source = 'transport', status = 502, type = 'api_error', code = 'cli_transport_error', message = 'CC request transport failed';
  // CC refusing to send without a usable login is the account's verdict, as
  // an upstream 401 would be: the account needs a new authorization, so it
  // must not read as a transport failure the gateway retries (2026-11-01).
  const login = loginFailure(error);
  if (login) {
    return { protocol: errorProtocol, source: phase === 'input' || phase === 'build' ? 'input' : 'transport', status: login.status,
      error: { type: errorType(login.status), code: login.code, message: login.message }, responseStarted: !!responseStarted };
  }
  if (phase === 'input' || phase === 'build') {
    source = 'input'; status = 400; type = 'invalid_request_error'; code = 'cli_invalid_request';
    message = phase === 'build' ? 'CC could not build the request components' : 'Invalid CLI request input or options';
    // A Worker-side value the build needs but cannot get (native billing
    // attribution) is this Worker's failure, not the request's: answer 503 so
    // another account can take it. It used to leave as a 400.
    if (error?.status === 503) { source = 'internal'; status = 503; type = 'api_error'; code = 'cli_source_unavailable'; }
  }
  if (timedOut) {
    source = 'timeout'; status = 504; type = 'timeout_error'; code = 'cli_timeout'; message = 'CC request timed out';
  } else if (interrupted) {
    source = 'interrupted'; status = 502; type = 'api_error'; code = 'cli_interrupted'; message = 'CC request was interrupted';
  } else if (phase === 'output') {
    source = 'internal'; status = 502; code = 'cli_output_error'; message = 'CC response output failed';
  }
  // Return the actual CC exception message, without redaction, truncation or
  // an inferred explanation. The envelope is not an exception stack dump.
  if (typeof error?.message === 'string') message = error.message;
  const nativeCode = error?.code ?? error?.cause?.code;
  if (source === 'transport' && typeof nativeCode === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(nativeCode)) code = nativeCode;
  return { protocol: errorProtocol, source, status, error: { type, code, message }, responseStarted: !!responseStarted };
}

export function encodeErrorFrame(frame) {
  return errorPrefix + JSON.stringify(frame) + '\n';
}

// CC's login errors by class name (the names are literals in CC's build, so
// they survive minification), with the status an upstream gives the same
// verdict: a dead refresh token is an expired/revoked login (401); an account
// on hold is the account's standing (403). Both disable the account
// (ClassifyError); the message is CC's own, unchanged.
const loginErrors = {
  OAuthRefreshDeadError: { status: 401, code: 'oauth_refresh_dead' },
  OAuthAccountOnHoldError: { status: 403, code: 'oauth_account_on_hold' },
};

// LoginRequiredError is the request command's own refusal to send without
// CC's OAuth login (request-headers.js): the runtime is signed out.
export class LoginRequiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoginRequiredError';
    this.code = 'not_logged_in';
  }
}

// loginFailure finds a login error in error or its causes.
export function loginFailure(error) {
  for (let e = error, depth = 0; e && typeof e === 'object' && depth < 4; e = e.cause, depth++) {
    const message = typeof e.message === 'string' && e.message ? e.message : undefined;
    if (e instanceof LoginRequiredError || e.name === 'LoginRequiredError') {
      return { status: 401, code: 'not_logged_in', message: message ?? 'Claude Code is not signed in' };
    }
    const known = Object.hasOwn(loginErrors, e.name) ? loginErrors[e.name] : undefined;
    if (known) return { ...known, message: message ?? e.name };
  }
  return undefined;
}

// policyDeniedFrame is the frame for a request CC's own fast-path policy refuses.
export function policyDeniedFrame() {
  return { protocol: errorProtocol, source: 'input', status: 403, error: { type: 'permission_error', code: 'cli_policy_denied', message: 'CC policy denied this request' } };
}

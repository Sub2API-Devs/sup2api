// Request-boundary parsing only. Native CC owns model feature handling and HTTP.
export function normalizeBetas(...sources) {
  const result = new Set();
  for (const source of sources) {
    if (source === undefined || source === null) continue;
    for (const value of Array.isArray(source) ? source : [source]) {
      if (typeof value !== 'string' || /[\r\n\0]/.test(value)) throw Error('betas must contain comma-separated HTTP tokens');
      for (const part of value.split(',')) {
        const beta = part.trim();
        if (!beta) continue;
        if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(beta)) throw Error(`Invalid beta token: ${beta}`);
        result.add(beta);
      }
    }
  }
  return [...result];
}

export function parseRequestOptions(args) {
  const options = { input: '-', headers: {}, betas: [] };
  let inputSet = false;
  const setInput = value => { if (inputSet) throw Error('Specify one input file, either positional or --input'); inputSet = true; options.input = value; };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (arg === '--direct' || arg === '--build') {
      if (options.mode && options.mode !== arg.slice(2)) throw Error('--direct and --build are mutually exclusive');
      options.mode = arg.slice(2); continue;
    }
    if (arg === '--') { if (i + 2 !== args.length) throw Error('Expected one input file after --'); setInput(args[++i]); continue; }
    if (arg === '-' || !arg.startsWith('-')) { setInput(arg); continue; }
    if (!['--input', '--betas', '--header', '--timeout-ms', '--response-meta'].includes(arg)) throw Error(`Unknown request option: ${arg}`);
    const value = args[++i];
    if (value === undefined) throw Error(`Missing value for ${arg}`);
    if (arg === '--input') setInput(value);
    if (arg === '--betas') options.betas = normalizeBetas(options.betas, value);
    if (arg === '--timeout-ms') options.timeoutMs = Number(value);
    if (arg === '--response-meta') options.meta = value;
    if (arg === '--header') addHeader(options, value);
  }
  options.mode ??= 'direct';
  if (options.betas.length) options.headers['anthropic-beta'] = options.betas.join(',');
  return options;
}

// Only the client protocol headers are taken: the betas, and the one API version.
function addHeader(options, value) {
  const colon = value.indexOf(':');
  if (colon < 1 || /[\r\n\0]/.test(value)) throw Error('--header must be name:value without control characters');
  const name = value.slice(0, colon).trim().toLowerCase(), content = value.slice(colon + 1).trim();
  if (name === 'anthropic-beta') { options.betas = normalizeBetas(options.betas, content); return; }
  if (name !== 'anthropic-version') throw Error(`Header ${name} is not a client protocol header; CC owns authentication and transport`);
  if (content !== '2023-06-01') throw Error('Unsupported anthropic-version');
  options.headers[name] = content;
}

// JSON.parse may round a nonintegral token such as 1.00000000000000001 to 1.
// Check only that integer-looking Number result against the original decimal
// token; ordinary fractional values retain the established JSON Number rules.
function exactIntegerToken(token) {
  const match = /^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!match) return false;
  const fraction = match[2] ?? '', digits = match[1] + fraction;
  if (/^0+$/.test(digits)) return true;
  const removed = fraction.length - Number(match[3] ?? 0);
  if (removed <= 0) return true;
  if (removed > digits.length) return false;
  return /^0+$/.test(digits.slice(-removed));
}

export function parseRequestJSON(raw, mode) {
  if (mode === 'build') {
    // A native JS builder cannot round-trip an unsafe integer. Reject it
    // before JSON.parse loses the original digits; direct keeps raw JSON.
    const tokens = /"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    for (const match of raw.matchAll(tokens)) {
      if (match[1] === undefined) continue;
      const value = Number(match[1]);
      if (!Number.isFinite(value) || Number.isInteger(value) && (!Number.isSafeInteger(value) || !exactIntegerToken(match[1]))) {
        throw Error('request --build cannot represent an unsafe JSON number; use --direct');
      }
    }
  }
  return JSON.parse(raw);
}

// Runs at the final native fetch boundary. Both routes keep the identity and
// transport headers CC built, as Claude Code itself sends them with an API key
// or a login (2026-10-22); only the version and betas are the request's.
export function authenticatedRequestHeaders(nativeHeaders, policy) {
  if (policy.apiKey) return apiKeyRequestHeaders(nativeHeaders, policy);
  const headers = new Headers(nativeHeaders);
  if (!/^Bearer \S+$/i.test(headers.get('authorization') ?? '') || headers.has('x-api-key')) {
    throw Error('CC did not provide OAuth authentication; sign in or configure ANTHROPIC_API_KEY');
  }
  return setProtocolHeaders(headers, placeBetas(policy.betas, [policy.oauthBeta], policy.betaOrder), policy.version ?? '2023-06-01');
}

// placeBetas adds betas to a list in Claude Code's own order (order, from
// ccgatewayBetaOrder): each goes in front of the first listed beta CC writes
// after it, or last when CC does not order it. The listed ones keep their
// order, the client's.
export function placeBetas(betas, additions, order = []) {
  const rank = beta => order.indexOf(beta);
  const placed = [...betas];
  for (const beta of additions) {
    if (!beta || placed.includes(beta)) continue;
    const at = rank(beta) < 0 ? -1 : placed.findIndex(listed => rank(listed) > rank(beta));
    if (at < 0) placed.push(beta);
    else placed.splice(at, 0, beta);
  }
  return placed;
}

// An API key is not a login: the login's beta goes only with a login, as
// Claude Code itself never sends it with an API key.
export function apiKeyRequestHeaders(nativeHeaders, { apiKey, betas, oauthBeta, version = '2023-06-01' }) {
  const headers = new Headers(nativeHeaders);
  if (!apiKey || headers.get('x-api-key') !== apiKey || headers.has('authorization')) {
    throw Error('Request requires the configured API-key authentication route');
  }
  return setProtocolHeaders(headers, normalizeBetas(betas).filter(beta => beta !== oauthBeta), version);
}

// setProtocolHeaders writes the request's betas (none: no header) and, when
// given, its API version.
export function setProtocolHeaders(headers, betas, version) {
  if (version !== undefined) headers.set('anthropic-version', version);
  if (betas.length) headers.set('anthropic-beta', betas.join(','));
  else headers.delete('anthropic-beta');
  return headers;
}

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
    if (arg === '--header') {
      const colon = value.indexOf(':');
      if (colon < 1 || /[\r\n\0]/.test(value)) throw Error('--header must be name:value without control characters');
      const name = value.slice(0, colon).trim().toLowerCase(), content = value.slice(colon + 1).trim();
      if (name === 'anthropic-beta') options.betas = normalizeBetas(options.betas, content);
      else if (name === 'anthropic-version') {
        if (content !== '2023-06-01') throw Error('Unsupported anthropic-version');
        options.headers[name] = content;
      } else throw Error(`Header ${name} is not a client protocol header; CC owns authentication and transport`);
    }
  }
  options.mode ??= 'direct';
  if (options.betas.length) options.headers['anthropic-beta'] = options.betas.join(',');
  return options;
}

export function parseRequestJSON(raw, mode) {
  if (mode === 'build') {
    // A native JS builder cannot round-trip an unsafe integer. Reject it
    // before JSON.parse loses the original digits; direct keeps raw JSON.
    const tokens = /"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    for (const match of raw.matchAll(tokens)) {
      if (match[1] === undefined) continue;
      const value = Number(match[1]);
      if (!Number.isFinite(value) || Number.isInteger(value) && !Number.isSafeInteger(value)) {
        throw Error('request --build cannot represent an unsafe JSON number; use --direct');
      }
    }
  }
  return JSON.parse(raw);
}

// Runs at the final native fetch boundary. Explicit API keys retain their
// isolated headers; OAuth keeps the identity/transport headers built by CC.
export function authenticatedRequestHeaders(nativeHeaders, policy) {
  if (policy.apiKey) return apiKeyRequestHeaders(nativeHeaders, policy);
  const headers = new Headers(nativeHeaders);
  if (!/^Bearer \S+$/i.test(headers.get('authorization') ?? '') || headers.has('x-api-key')) {
    throw Error('CC did not provide OAuth authentication; sign in or configure ANTHROPIC_API_KEY');
  }
  headers.set('anthropic-version', policy.version ?? '2023-06-01');
  const tokens = normalizeBetas(policy.betas, policy.oauthBeta);
  if (tokens.length) headers.set('anthropic-beta', tokens.join(','));
  else headers.delete('anthropic-beta');
  return headers;
}

export function apiKeyRequestHeaders(nativeHeaders, { apiKey, betas, version = '2023-06-01' }) {
  const original = new Headers(nativeHeaders);
  if (!apiKey || original.get('x-api-key') !== apiKey || original.has('authorization')) {
    throw Error('Request requires the configured API-key authentication route');
  }
  const headers = new Headers({
    'x-api-key': original.get('x-api-key'),
    'anthropic-version': version,
    'content-type': 'application/json',
    'user-agent': 'ccgateway-request',
    accept: original.get('accept') ?? 'application/json',
  });
  const tokens = normalizeBetas(betas);
  if (tokens.length) headers.set('anthropic-beta', tokens.join(','));
  return headers;
}

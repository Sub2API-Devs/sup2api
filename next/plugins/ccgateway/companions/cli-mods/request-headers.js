// The request's protocol headers: its version and the betas Claude Code writes
// for it, set over the headers CC built at the transport boundary. The list is
// already final (request-betas.js); this module only validates and writes it.
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

// finalBetas is the request's betas as Claude Code writes them: the client's
// own in the client's order, then the ones the request adds (build's
// per-request betas, and a login's) where CC orders them. A beta already in
// the client's list is never added twice; one CC does not order goes last.
export function finalBetas(client, additions, order = []) {
  const rank = beta => order.indexOf(beta), placed = [...client];
  for (const beta of additions) {
    if (!beta || placed.includes(beta)) continue;
    const at = rank(beta) < 0 ? -1 : placed.findIndex(listed => rank(listed) > rank(beta));
    if (at < 0) placed.push(beta);
    else placed.splice(at, 0, beta);
  }
  return placed;
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
  return setProtocolHeaders(headers, normalizeBetas(policy.betas), policy.version ?? '2023-06-01');
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

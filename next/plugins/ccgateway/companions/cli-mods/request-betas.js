// CC's own order for the betas of a request. patch-cli-2.1.304.cjs fills the
// two markers below from the hash-bound source: the builder's betas come from
// its request builder (uXn), through an AST read, in the order it pushes them;
// checkImports then verifies every name is exported by the module it comes
// from. Nothing of the order is written down here.
import { modelBetas, promptCachingScopeBeta, cacheDiagnosisBeta, extendedCacheTtlBeta } from './native-command.js';
//CCGATEWAY_BETA_IMPORTS

const builderBetas = [/*CCGATEWAY_BETA_LIST*/];

// betaOrder is the beta header names in Claude Code's order for a model: its
// model list (modelBetas, which places the login's beta in its own place) and
// then what its request builder adds, in the builder's order (from
// order.builderAt). A model the native model table cannot name must not fail
// the request: the caller appends the beta it adds instead (v24's behavior),
// and one diagnostic says why.
export function betaOrder(model) {
  try {
    const order = [];
    for (const beta of modelBetas(model, { isAgenticQuery: true })) if (beta && !order.includes(beta.header)) order.push(beta.header);
    // Where the builder's betas start: CC's main query writes the betas
    // neither list names between the two (finalBetas).
    order.builderAt = order.length;
    for (const beta of builderBetas) if (beta && !order.includes(beta.header)) order.push(beta.header);
    return order;
  } catch (error) {
    process.stderr.write('CCG_BETA_ORDER_UNAVAILABLE ' + JSON.stringify({ protocol: 'ccgateway.beta_order.v1', status: 'source_unavailable', reason: String(error?.message ?? error).slice(0, 200) }) + '\n');
    return [];
  }
}

// bodyBetas is the betas a build adds, made to agree with the body it sends
// (2026-11-03): Claude Code writes the prompt caching scope beta in its
// first-party shape (a billing header with cch: every request, a subagent's
// without a global-scope block included, as the official captures show) and
// otherwise only with a global-scope cache marker; the cache diagnosis beta
// with diagnostics; the extended cache lifetime beta with a 1-hour marker.
// CC's builder in this CLI adds them by the CLI's own shape (first party, a
// subscription login), not by the body it was given, so one the body does not
// use is dropped, and one it uses that neither the client nor the build sent
// is added. The client's own betas are never touched. firstParty says the
// body's billing header is the first-party shape; the betas are CC's
// descriptors.
export function bodyBetas(body, clientBetas, addedBetas, { firstParty = false } = {}) {
  const markers = cacheMarkers(body);
  const wanted = [
    [promptCachingScopeBeta.header, firstParty || markers.some(marker => marker.scope === 'global')],
    [cacheDiagnosisBeta.header, body?.diagnostics !== undefined],
    [extendedCacheTtlBeta.header, markers.some(marker => marker.ttl === '1h')],
  ];
  if (wanted.some(([header]) => typeof header !== 'string' || !header)) throw Error('Missing native beta descriptors');
  const out = addedBetas.filter(beta => wanted.every(([header, used]) => beta !== header || used));
  for (const [header, used] of wanted) if (used && !clientBetas.includes(header) && !out.includes(header)) out.push(header);
  return out;
}

// cacheMarkers are the body's cache_control objects: on its system blocks,
// its tools and its messages' blocks.
function cacheMarkers(body) {
  const blocks = content => Array.isArray(content) ? content : [];
  return [...blocks(body?.system), ...blocks(body?.tools), ...blocks(body?.messages).flatMap(message => blocks(message?.content))]
    .map(block => block?.cache_control).filter(marker => marker !== null && typeof marker === 'object');
}

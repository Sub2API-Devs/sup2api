// CC's own order for the betas of a request. patch-cli-2.1.304.cjs fills the
// two markers below from the hash-bound source: the builder's betas come from
// its request builder (uXn), through an AST read, in the order it pushes them;
// checkImports then verifies every name is exported by the module it comes
// from. Nothing of the order is written down here.
import { S8n } from './chunk-7p6jp6kj.js';
//CCGATEWAY_BETA_IMPORTS

const builderBetas = [/*CCGATEWAY_BETA_LIST*/];

// betaOrder is the beta header names in Claude Code's order for a model: its
// model list (S8n, which places the login's beta in its own place) and then
// what its request builder adds, in the builder's order. A model the native
// model table cannot name must not fail the request: the caller appends the
// beta it adds instead (v24's behavior), and one diagnostic says why.
export function betaOrder(model) {
  try {
    const order = [];
    for (const beta of [...S8n(model, { isAgenticQuery: true }), ...builderBetas]) if (beta && !order.includes(beta.header)) order.push(beta.header);
    return order;
  } catch (error) {
    process.stderr.write('CCG_BETA_ORDER_UNAVAILABLE ' + JSON.stringify({ protocol: 'ccgateway.beta_order.v1', status: 'source_unavailable', reason: String(error?.message ?? error).slice(0, 200) }) + '\n');
    return [];
  }
}

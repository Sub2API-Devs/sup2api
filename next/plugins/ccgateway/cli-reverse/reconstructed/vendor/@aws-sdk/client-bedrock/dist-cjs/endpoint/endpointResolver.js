/**
 * @aws-sdk/client-bedrock/dist-cjs/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-gkj73j15.js (2)
 * attribution: esm-fingerprint 2
 */
import { import_index_browser_2, import_util_endpoints } from "../index.js";
import { ruleSet } from "./ruleset.js";
import { deferInit, beginDeferredInits } from "../../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 4 modules closed by ../index.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@aws-sdk/client-bedrock/dist-cjs/index.js");
//@ chunk-gkj73j15.js:7771-7947 esm-fingerprint
var ruleSet_2; // deferred: uses import_util_endpoints (../index.js) of its import cycle while loading; runs once the cycle is complete
var defaultEndpointResolver;
deferInit("chunk-gkj73j15.js:7771", () => {
  ruleSet_2 = new import_index_browser_2.EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
  });
  defaultEndpointResolver = (endpointParams, context = {}) =>
    ruleSet_2.get(endpointParams, () =>
      import_index_browser_2.resolveEndpoint(ruleSet, {
        endpointParams,
        logger: context.logger,
      }),
    );
});
//@ chunk-gkj73j15.js:7947-8001 esm-fingerprint
// deferred: uses import_util_endpoints (../index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:7947", () => {
  import_index_browser_2.customEndpointFunctions.aws = import_util_endpoints.awsEndpointFunctions;
});
export { defaultEndpointResolver };

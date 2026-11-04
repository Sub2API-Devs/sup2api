/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (2)
 * attribution: esm-fingerprint 2
 */
import { import_index_browser, import_util_endpoints } from "../../../../_unknown/bedrockRuntimeConfig.js";
import { ruleSet } from "./ruleset.js";

//@ chunk-3cddmtk7.js:23181-23357 esm-fingerprint
var ruleSet_2 = new import_index_browser.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
});
var defaultEndpointResolver = (endpointParams, context = {}) =>
  ruleSet_2.get(endpointParams, () =>
    import_index_browser.resolveEndpoint(ruleSet, {
      endpointParams,
      logger: context.logger,
    }),
  );
//@ chunk-3cddmtk7.js:23357-23411 esm-fingerprint
import_index_browser.customEndpointFunctions.aws = import_util_endpoints.awsEndpointFunctions;
export { defaultEndpointResolver };

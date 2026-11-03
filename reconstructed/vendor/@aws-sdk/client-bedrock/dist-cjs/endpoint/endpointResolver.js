/**
 * @aws-sdk/client-bedrock/dist-cjs/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-0dmzgg46.js (2)
 * attribution: esm-fingerprint 2
 */
import { import_index_browser_2, import_util_endpoints } from "../index.js";
import { se } from "./ruleset.js";

//@ chunk-0dmzgg46.js:7771-7947 esm-fingerprint
var Ke = new import_index_browser_2.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
});
var defaultEndpointResolver = (endpointParams, context = {}) =>
  Ke.get(endpointParams, () =>
    import_index_browser_2.resolveEndpoint(se, {
      endpointParams,
      logger: context.logger,
    }),
  );
//@ chunk-0dmzgg46.js:7947-8001 esm-fingerprint
import_index_browser_2.customEndpointFunctions.aws = import_util_endpoints.awsEndpointFunctions;
export { defaultEndpointResolver };

/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (2)
 * attribution: esm-fingerprint 2
 */
import { A, We } from "../../../../_unknown/bedrockRuntimeConfig.js";
import { Ue } from "./ruleset.js";

//@ chunk-3cddmtk7.js:23181-23357 esm-fingerprint
var $t = new A.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
});
var defaultEndpointResolver = (endpointParams, context = {}) =>
  $t.get(endpointParams, () =>
    A.resolveEndpoint(Ue, {
      endpointParams,
      logger: context.logger,
    }),
  );
//@ chunk-3cddmtk7.js:23357-23411 esm-fingerprint
A.customEndpointFunctions.aws = We.awsEndpointFunctions;
export { defaultEndpointResolver };

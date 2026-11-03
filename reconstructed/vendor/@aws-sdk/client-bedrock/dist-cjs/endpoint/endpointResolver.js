/**
 * @aws-sdk/client-bedrock/dist-cjs/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-0dmzgg46.js (2)
 * attribution: esm-fingerprint 2
 */
import { p, re } from "../index.js";
import { se } from "./ruleset.js";

//@ chunk-0dmzgg46.js:7771-7947 esm-fingerprint
var Ke = new p.EndpointCache({ size: 50, params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"] }),
  ae = (e, o = {}) => Ke.get(e, () => p.resolveEndpoint(se, { endpointParams: e, logger: o.logger }));
//@ chunk-0dmzgg46.js:7947-8001 esm-fingerprint
p.customEndpointFunctions.aws = re.awsEndpointFunctions;

export { ae };

/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-ddzww9ex.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../../runtime/bun-runtime.js";
import { Iae } from "../../../../../util-endpoints/dist-cjs/index.js";
import { YJ } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { ae } from "./ruleset.js";

//@ chunk-ddzww9ex.js:3961-4361 cjs-require-graph
var he = x(function (ue) {
  Object.defineProperty(ue, "__esModule", { value: !0 });
  ue.defaultEndpointResolver = void 0;
  var pe = Iae(),
    C = YJ(),
    de = ae(),
    Et = new C.EndpointCache({ size: 50, params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"] }),
    gt = (e, t = {}) =>
      Et.get(e, () => C.resolveEndpoint(de.ruleSet, { endpointParams: e, logger: t.logger }));
  ue.defaultEndpointResolver = gt;
  C.customEndpointFunctions.aws = pe.awsEndpointFunctions;
});

export { he };

/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-kejz1rpb.js (1), chunk-y366fgzk.js (1)
 * attribution: esm-fingerprint 1, cjs-require-graph 1
 */
import { p } from "../../sso/index.js";
import { Y } from "../../sso/endpoint/ruleset.js";
import { x } from "../../../../../../../runtime/bun-runtime.js";
import { Iae } from "../../../../../util-endpoints/dist-cjs/index.js";
import { YJ } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { de } from "./ruleset.js";

//@ chunk-kejz1rpb.js:7442-7616 esm-fingerprint
var De = new p.EndpointCache({ size: 50, params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"] }),
  Z = (e, t = {}) => De.get(e, () => p.resolveEndpoint(Y, { endpointParams: e, logger: t.logger }));
//@ chunk-y366fgzk.js:4373-4773 cjs-require-graph
var _e = x(function (he) {
  Object.defineProperty(he, "__esModule", { value: !0 });
  he.defaultEndpointResolver = void 0;
  var pe = Iae(),
    v = YJ(),
    le = de(),
    ft = new v.EndpointCache({ size: 50, params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"] }),
    vt = (e, t = {}) =>
      ft.get(e, () => v.resolveEndpoint(le.ruleSet, { endpointParams: e, logger: t.logger }));
  he.defaultEndpointResolver = vt;
  v.customEndpointFunctions.aws = pe.awsEndpointFunctions;
});

export { Z, _e };

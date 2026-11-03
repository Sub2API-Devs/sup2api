/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/endpoint/endpointResolver.js
 *
 * AWS STS 端点解析（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1), chunk-heg39xxp.js (3)
 * attribution: cjs-require-graph 1, placement 1, esm-fingerprint 2
 */
import { Re, x as x_2 } from "../../../../../../../runtime/bun-runtime.js";
import { Iae } from "../../../../../util-endpoints/dist-cjs/index.js";
import { YJ } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { me } from "./ruleset.js";
import { Je } from "../../../../../client-sts/dist-cjs/endpoint/ruleset.js";

//@ chunk-heg39xxp.js:5391-5419 placement
var _e = Re(Iae()),
  m = Re(YJ());
//@ chunk-heg39xxp.js:10036-10232 esm-fingerprint
var Ze = new m.EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"],
  }),
  he = (e, t = {}) => Ze.get(e, () => m.resolveEndpoint(me, { endpointParams: e, logger: t.logger }));
//@ chunk-heg39xxp.js:10232-10286 esm-fingerprint
m.customEndpointFunctions.aws = _e.awsEndpointFunctions;
//@ chunk-a8ee6x44.js:6233-6653 cjs-require-graph
var ot = x_2(function (et) {
  Object.defineProperty(et, "__esModule", { value: !0 });
  et.defaultEndpointResolver = void 0;
  var Xe = Iae(),
    H = YJ(),
    Ze = Je(),
    Io = new H.EndpointCache({
      size: 50,
      params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"],
    }),
    To = (e, t = {}) =>
      Io.get(e, () => H.resolveEndpoint(Ze.ruleSet, { endpointParams: e, logger: t.logger }));
  et.defaultEndpointResolver = To;
  H.customEndpointFunctions.aws = Xe.awsEndpointFunctions;
});

export { he, ot };

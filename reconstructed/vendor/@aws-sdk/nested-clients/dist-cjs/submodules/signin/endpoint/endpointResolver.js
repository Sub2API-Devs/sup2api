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
import { require_util_endpoints } from "../../../../../util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { require_ruleset } from "./ruleset.js";

//@ chunk-kejz1rpb.js:7442-7616 esm-fingerprint
var De = new p.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
});
var defaultEndpointResolver = (endpointParams, context = {}) =>
  De.get(endpointParams, () =>
    p.resolveEndpoint(Y, {
      endpointParams,
      logger: context.logger,
    }),
  );
//@ chunk-y366fgzk.js:4373-4773 cjs-require-graph
var require_endpointResolver = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.defaultEndpointResolver = undefined;
  var util_endpoints_1 = require_util_endpoints();
  var util_endpoints_2 = require_index_browser();
  var ruleset_1 = require_ruleset();
  var cache = new util_endpoints_2.EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
  });
  var defaultEndpointResolver = (endpointParams, context = {}) =>
    cache.get(endpointParams, () =>
      util_endpoints_2.resolveEndpoint(ruleset_1.ruleSet, {
        endpointParams,
        logger: context.logger,
      }),
    );
  cjsExports.defaultEndpointResolver = defaultEndpointResolver;
  util_endpoints_2.customEndpointFunctions.aws = util_endpoints_1.awsEndpointFunctions;
});
export { defaultEndpointResolver, require_endpointResolver };

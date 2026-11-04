/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-ddzww9ex.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_util_endpoints } from "../../../../../util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { require_ruleset } from "./ruleset.js";

//@ chunk-ddzww9ex.js:3961-4361 cjs-require-graph
var require_endpointResolver = __commonJS(function (cjsExports) {
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
export { require_endpointResolver };

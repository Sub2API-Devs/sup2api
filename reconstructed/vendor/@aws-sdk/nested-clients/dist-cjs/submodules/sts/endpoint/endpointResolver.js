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
import { Re, x } from "../../../../../../../runtime/bun-runtime.js";
import { require_util_endpoints } from "../../../../../util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { me } from "./ruleset.js";
import { require_ruleset } from "../../../../../client-sts/dist-cjs/endpoint/ruleset.js";

//@ chunk-heg39xxp.js:5391-5419 placement
var cache = Re(require_util_endpoints());
var import_index_browser_2 = Re(require_index_browser());
//@ chunk-heg39xxp.js:10036-10232 esm-fingerprint
var Ze = new import_index_browser_2.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"],
});
var defaultEndpointResolver = (endpointParams, context = {}) =>
  Ze.get(endpointParams, () =>
    import_index_browser_2.resolveEndpoint(me, {
      endpointParams,
      logger: context.logger,
    }),
  );
//@ chunk-heg39xxp.js:10232-10286 esm-fingerprint
import_index_browser_2.customEndpointFunctions.aws = cache.awsEndpointFunctions;
//@ chunk-a8ee6x44.js:6233-6653 cjs-require-graph
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
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"],
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

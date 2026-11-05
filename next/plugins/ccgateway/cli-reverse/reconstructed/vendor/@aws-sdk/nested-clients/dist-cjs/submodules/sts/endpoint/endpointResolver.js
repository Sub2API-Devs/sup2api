/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/endpoint/endpointResolver.js
 *
 * AWS STS 端点解析（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-539esr4f.js (3), chunk-brqnbz3r.js (1)
 * attribution: placement 1, esm-fingerprint 2, cjs-require-graph 1
 */
import { __toESM, __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_util_endpoints } from "../../../../../util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { ruleSet } from "./ruleset.js";
import { require_ruleset } from "../../../../../client-sts/dist-cjs/endpoint/ruleset.js";

//@ chunk-539esr4f.js:5391-5419 placement
var cache = __toESM(require_util_endpoints());
var import_index_browser_2 = __toESM(require_index_browser());
//@ chunk-539esr4f.js:10036-10232 esm-fingerprint
var endpointCache = new import_index_browser_2.EndpointCache({
  size: 50,
  params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"],
});
var defaultEndpointResolver = (endpointParams, context = {}) =>
  endpointCache.get(endpointParams, () =>
    import_index_browser_2.resolveEndpoint(ruleSet, {
      endpointParams,
      logger: context.logger,
    }),
  );
//@ chunk-539esr4f.js:10232-10286 esm-fingerprint
import_index_browser_2.customEndpointFunctions.aws = cache.awsEndpointFunctions;
//@ chunk-brqnbz3r.js:6233-6653 cjs-require-graph
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

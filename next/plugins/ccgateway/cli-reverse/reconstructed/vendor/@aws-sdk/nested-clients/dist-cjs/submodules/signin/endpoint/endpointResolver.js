/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/endpoint/endpointResolver.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-csa0qt1j.js (1), chunk-tvcdn76c.js (1)
 * attribution: cjs-require-graph 1, esm-fingerprint 1
 */
import { import_index_browser } from "../../sso/index.js";
import { ruleSet } from "../../sso/endpoint/ruleset.js";
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_util_endpoints } from "../../../../../util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { require_ruleset } from "./ruleset.js";
import {
  deferInit,
  beginDeferredInits,
  runDeferredInits,
} from "../../../../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ../../../../../client-sso/dist-cjs/index.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@aws-sdk/client-sso/dist-cjs/index.js");
//@ chunk-tvcdn76c.js:7442-7616 esm-fingerprint
var endpointCache; // deferred: uses import_util_endpoints (../../sso/index.js) of its import cycle while loading; runs once the cycle is complete
var defaultEndpointResolver;
deferInit("chunk-tvcdn76c.js:7442", () => {
  endpointCache = new import_index_browser.EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
  });
  defaultEndpointResolver = (endpointParams, context = {}) =>
    endpointCache.get(endpointParams, () =>
      import_index_browser.resolveEndpoint(ruleSet, {
        endpointParams,
        logger: context.logger,
      }),
    );
});
//@ chunk-csa0qt1j.js:4373-4773 cjs-require-graph
var require_endpointResolver; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-csa0qt1j.js:4373", () => {
  require_endpointResolver = __commonJS(function (cjsExports) {
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
});

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/@aws-sdk/nested-clients/dist-cjs/submodules/signin/endpoint/endpointResolver.js");
export { require_endpointResolver, defaultEndpointResolver };

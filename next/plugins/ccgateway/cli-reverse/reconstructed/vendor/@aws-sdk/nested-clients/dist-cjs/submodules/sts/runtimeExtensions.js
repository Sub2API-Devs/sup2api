/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/runtimeExtensions.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-brqnbz3r.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_region_config_resolver } from "../../../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_httpAuthExtensionConfiguration } from "./auth/httpAuthExtensionConfiguration.js";

//@ chunk-brqnbz3r.js:10562-11130 cjs-require-graph
var require_runtimeExtensions = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.resolveRuntimeExtensions = undefined;
  var region_config_resolver_1 = require_region_config_resolver();
  var protocol_http_1 = require_protocol_http();
  var smithy_client_1 = require_client();
  var httpAuthExtensionConfiguration_1 = require_httpAuthExtensionConfiguration();
  var resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    let extensionConfiguration = Object.assign(
      region_config_resolver_1.getAwsRegionExtensionConfiguration(runtimeConfig),
      smithy_client_1.getDefaultExtensionConfiguration(runtimeConfig),
      protocol_http_1.getHttpHandlerExtensionConfiguration(runtimeConfig),
      httpAuthExtensionConfiguration_1.getHttpAuthExtensionConfiguration(runtimeConfig),
    );
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(
      runtimeConfig,
      region_config_resolver_1.resolveAwsRegionExtensionConfiguration(extensionConfiguration),
      smithy_client_1.resolveDefaultRuntimeConfig(extensionConfiguration),
      protocol_http_1.resolveHttpHandlerRuntimeConfig(extensionConfiguration),
      httpAuthExtensionConfiguration_1.resolveHttpAuthRuntimeConfig(extensionConfiguration),
    );
  };
  cjsExports.resolveRuntimeExtensions = resolveRuntimeExtensions;
});
export { require_runtimeExtensions };

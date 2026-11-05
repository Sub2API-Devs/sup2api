/**
 * @smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointFromConfig.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/middleware-endpoint@4.3.0..4.3.15
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_node_config_provider } from "../../../node-config-provider/dist-cjs/index.js";
import { require_getEndpointUrlConfig } from "./getEndpointUrlConfig.js";

//@ chunk-3p78mpxm.js:116280-116495 cjs-fingerprint
var require_getEndpointFromConfig = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getEndpointFromConfig = undefined;
  var node_config_provider_1 = require_node_config_provider();
  var getEndpointUrlConfig_1 = require_getEndpointUrlConfig();
  var getEndpointFromConfig = async (serviceId) =>
    node_config_provider_1.loadConfig(getEndpointUrlConfig_1.getEndpointUrlConfig(serviceId ?? ""))();
  cjsExports.getEndpointFromConfig = getEndpointFromConfig;
});
export { require_getEndpointFromConfig };

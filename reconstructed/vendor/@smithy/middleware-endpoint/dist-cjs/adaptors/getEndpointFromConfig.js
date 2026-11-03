/**
 * @smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointFromConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/middleware-endpoint@4.3.0..4.3.15
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_node_config_provider } from "../../../node-config-provider/dist-cjs/index.js";
import { require_getEndpointUrlConfig } from "./getEndpointUrlConfig.js";

//@ chunk-edce4vxq.js:116280-116495 cjs-fingerprint
var require_getEndpointFromConfig = x(function (cjsExports) {
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

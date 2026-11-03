/**
 * @aws-sdk/region-config-resolver/dist-cjs/regionConfig/stsRegionDefaultResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/region-config-resolver@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_index_native } from "../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_node_config_provider } from "../../../../@smithy/node-config-provider/dist-cjs/index.js";

//@ chunk-edce4vxq.js:168080-168567 cjs-fingerprint
var require_stsRegionDefaultResolver = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.warning = undefined;
  cjsExports.stsRegionDefaultResolver = stsRegionDefaultResolver;
  var config_resolver_1 = require_index_native();
  var node_config_provider_1 = require_node_config_provider();
  function stsRegionDefaultResolver(loaderConfig = {}) {
    return node_config_provider_1.loadConfig(
      {
        ...config_resolver_1.NODE_REGION_CONFIG_OPTIONS,
        async default() {
          if (!cjsExports.warning.silence)
            console.warn(
              "@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.",
            );
          return "us-east-1";
        },
      },
      {
        ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS,
        ...loaderConfig,
      },
    );
  }
  cjsExports.warning = {
    silence: false,
  };
});
export { require_stsRegionDefaultResolver };

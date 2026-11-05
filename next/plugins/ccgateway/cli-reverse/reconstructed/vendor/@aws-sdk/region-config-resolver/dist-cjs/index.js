/**
 * @aws-sdk/region-config-resolver/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/region-config-resolver@3.936.0
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_index_native } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_stsRegionDefaultResolver } from "./regionConfig/stsRegionDefaultResolver.js";

//@ chunk-3p78mpxm.js:168567-169536 cjs-fingerprint
var require_region_config_resolver = __commonJS(function (cjsExports) {
  var configResolver = require_index_native();
  var stsRegionDefaultResolver = require_stsRegionDefaultResolver();
  var getAwsRegionExtensionConfiguration = (runtimeConfig) => ({
    setRegion(region) {
      runtimeConfig.region = region;
    },
    region() {
      return runtimeConfig.region;
    },
  });
  var resolveAwsRegionExtensionConfiguration = (awsRegionExtensionConfiguration) => ({
    region: awsRegionExtensionConfiguration.region(),
  });
  Object.defineProperty(cjsExports, "NODE_REGION_CONFIG_FILE_OPTIONS", {
    enumerable: true,
    get: function () {
      return configResolver.NODE_REGION_CONFIG_FILE_OPTIONS;
    },
  });
  Object.defineProperty(cjsExports, "NODE_REGION_CONFIG_OPTIONS", {
    enumerable: true,
    get: function () {
      return configResolver.NODE_REGION_CONFIG_OPTIONS;
    },
  });
  Object.defineProperty(cjsExports, "REGION_ENV_NAME", {
    enumerable: true,
    get: function () {
      return configResolver.REGION_ENV_NAME;
    },
  });
  Object.defineProperty(cjsExports, "REGION_INI_NAME", {
    enumerable: true,
    get: function () {
      return configResolver.REGION_INI_NAME;
    },
  });
  Object.defineProperty(cjsExports, "resolveRegionConfig", {
    enumerable: true,
    get: function () {
      return configResolver.resolveRegionConfig;
    },
  });
  cjsExports.getAwsRegionExtensionConfiguration = getAwsRegionExtensionConfiguration;
  cjsExports.resolveAwsRegionExtensionConfiguration = resolveAwsRegionExtensionConfiguration;
  Object.keys(stsRegionDefaultResolver).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return stsRegionDefaultResolver[k];
        },
      });
  });
});
export { require_region_config_resolver };

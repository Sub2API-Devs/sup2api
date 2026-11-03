/**
 * @aws-sdk/region-config-resolver/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/region-config-resolver@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { dR } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { Si } from "./regionConfig/stsRegionDefaultResolver.js";

//@ chunk-edce4vxq.js:168567-169536 cjs-fingerprint
var Dae = x(function (Se) {
  var He = dR(),
    wi = Si(),
    oh = (e) => ({
      setRegion(t) {
        e.region = t;
      },
      region() {
        return e.region;
      },
    }),
    ah = (e) => ({ region: e.region() });
  Object.defineProperty(Se, "NODE_REGION_CONFIG_FILE_OPTIONS", {
    enumerable: !0,
    get: function () {
      return He.NODE_REGION_CONFIG_FILE_OPTIONS;
    },
  });
  Object.defineProperty(Se, "NODE_REGION_CONFIG_OPTIONS", {
    enumerable: !0,
    get: function () {
      return He.NODE_REGION_CONFIG_OPTIONS;
    },
  });
  Object.defineProperty(Se, "REGION_ENV_NAME", {
    enumerable: !0,
    get: function () {
      return He.REGION_ENV_NAME;
    },
  });
  Object.defineProperty(Se, "REGION_INI_NAME", {
    enumerable: !0,
    get: function () {
      return He.REGION_INI_NAME;
    },
  });
  Object.defineProperty(Se, "resolveRegionConfig", {
    enumerable: !0,
    get: function () {
      return He.resolveRegionConfig;
    },
  });
  Se.getAwsRegionExtensionConfiguration = oh;
  Se.resolveAwsRegionExtensionConfiguration = ah;
  Object.keys(wi).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(Se, e))
      Object.defineProperty(Se, e, {
        enumerable: !0,
        get: function () {
          return wi[e];
        },
      });
  });
});

export { Dae };

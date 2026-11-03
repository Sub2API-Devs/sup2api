/**
 * @aws-sdk/region-config-resolver/dist-cjs/regionConfig/stsRegionDefaultResolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/region-config-resolver@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { dR } from "../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { wD } from "../../../../@smithy/node-config-provider/dist-cjs/index.js";

//@ chunk-edce4vxq.js:168080-168567 cjs-fingerprint
var Si = x(function (Ei) {
  Object.defineProperty(Ei, "__esModule", { value: !0 });
  Ei.warning = void 0;
  Ei.stsRegionDefaultResolver = nh;
  var ft = dR(),
    yi = wD();
  function nh(e = {}) {
    return yi.loadConfig(
      {
        ...ft.NODE_REGION_CONFIG_OPTIONS,
        async default() {
          if (!Ei.warning.silence)
            console.warn(
              "@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.",
            );
          return "us-east-1";
        },
      },
      { ...ft.NODE_REGION_CONFIG_FILE_OPTIONS, ...e },
    );
  }
  Ei.warning = { silence: !1 };
});

export { Si };

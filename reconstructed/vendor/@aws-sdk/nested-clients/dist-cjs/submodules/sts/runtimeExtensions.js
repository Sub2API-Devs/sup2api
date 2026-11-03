/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/runtimeExtensions.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-require-graph 1
 */
import { x as x_2 } from "../../../../../../runtime/bun-runtime.js";
import { Dae } from "../../../../region-config-resolver/dist-cjs/index.js";
import { Kg } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { It } from "./auth/httpAuthExtensionConfiguration.js";

//@ chunk-a8ee6x44.js:10562-11130 cjs-require-graph
var bt = x_2(function (Tt) {
  Object.defineProperty(Tt, "__esModule", { value: !0 });
  Tt.resolveRuntimeExtensions = void 0;
  var B = Dae(),
    Q = Kg(),
    Y = ff(),
    J = It(),
    Ho = (e, t) => {
      let merged = Object.assign(
        B.getAwsRegionExtensionConfiguration(e),
        Y.getDefaultExtensionConfiguration(e),
        Q.getHttpHandlerExtensionConfiguration(e),
        J.getHttpAuthExtensionConfiguration(e),
      );
      return (
        t.forEach((u) => u.configure(merged)),
        Object.assign(
          e,
          B.resolveAwsRegionExtensionConfiguration(merged),
          Y.resolveDefaultRuntimeConfig(merged),
          Q.resolveHttpHandlerRuntimeConfig(merged),
          J.resolveHttpAuthRuntimeConfig(merged),
        )
      );
    };
  Tt.resolveRuntimeExtensions = Ho;
});

export { bt };

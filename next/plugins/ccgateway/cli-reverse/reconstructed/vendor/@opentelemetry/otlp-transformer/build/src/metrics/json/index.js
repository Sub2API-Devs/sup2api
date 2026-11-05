/**
 * @opentelemetry/otlp-transformer/build/src/metrics/json/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_metrics_2 } from "./metrics.js";

//@ chunk-vxhm2nqe.js:254279-254511 cjs-fingerprint
var require_json_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JsonMetricsSerializer = undefined;
  var metrics_1 = require_metrics_2();
  Object.defineProperty(cjsExports, "JsonMetricsSerializer", {
    enumerable: true,
    get: function () {
      return metrics_1.JsonMetricsSerializer;
    },
  });
});
export { require_json_2 };

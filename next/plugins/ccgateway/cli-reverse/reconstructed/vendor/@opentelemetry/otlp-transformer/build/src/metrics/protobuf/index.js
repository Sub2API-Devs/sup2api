/**
 * @opentelemetry/otlp-transformer/build/src/metrics/protobuf/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_metrics } from "./metrics.js";

//@ chunk-798ashq9.js:250008-250252 cjs-fingerprint
var require_protobuf_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProtobufMetricsSerializer = undefined;
  var metrics_1 = require_metrics();
  Object.defineProperty(cjsExports, "ProtobufMetricsSerializer", {
    enumerable: true,
    get: function () {
      return metrics_1.ProtobufMetricsSerializer;
    },
  });
});
export { require_protobuf_2 };

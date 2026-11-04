/**
 * @opentelemetry/exporter-metrics-otlp-grpc/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-grpc@0.208.0
 * pieces: chunk-6n5d7gpq.js (2)
 * attribution: cjs-fingerprint+context 1, affinity 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_OTLPMetricExporter } from "./OTLPMetricExporter.js";

//@ chunk-6n5d7gpq.js:776-991 cjs-fingerprint+context
var require_exporter_metrics_otlp_grpc = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPMetricExporter = undefined;
  var OTLPMetricExporter_1 = require_OTLPMetricExporter();
  Object.defineProperty(cjsExports, "OTLPMetricExporter", {
    enumerable: true,
    get: function () {
      return OTLPMetricExporter_1.OTLPMetricExporter;
    },
  });
});
//@ chunk-6n5d7gpq.js:991-1010 affinity
export default require_exporter_metrics_otlp_grpc();

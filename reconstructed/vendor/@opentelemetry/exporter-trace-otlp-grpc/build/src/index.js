/**
 * @opentelemetry/exporter-trace-otlp-grpc/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-trace-otlp-grpc@0.208.0
 * pieces: chunk-qz9ye512.js (2)
 * attribution: cjs-fingerprint+context 1, affinity 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_OTLPTraceExporter } from "./OTLPTraceExporter.js";

//@ chunk-qz9ye512.js:721-933 cjs-fingerprint+context
var require_exporter_trace_otlp_grpc = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPTraceExporter = undefined;
  var OTLPTraceExporter_1 = require_OTLPTraceExporter();
  Object.defineProperty(cjsExports, "OTLPTraceExporter", {
    enumerable: true,
    get: function () {
      return OTLPTraceExporter_1.OTLPTraceExporter;
    },
  });
});
//@ chunk-qz9ye512.js:933-952 affinity
export default require_exporter_trace_otlp_grpc();

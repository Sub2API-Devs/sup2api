/**
 * @opentelemetry/exporter-logs-otlp-grpc/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-logs-otlp-grpc@0.208.0
 * pieces: chunk-vt7p2m92.js (2)
 * attribution: cjs-fingerprint+context 1, affinity 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_OTLPLogExporter } from "./OTLPLogExporter.js";

//@ chunk-vt7p2m92.js:711-917 cjs-fingerprint+context
var require_exporter_logs_otlp_grpc = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPLogExporter = undefined;
  var OTLPLogExporter_1 = require_OTLPLogExporter();
  Object.defineProperty(cjsExports, "OTLPLogExporter", {
    enumerable: true,
    get: function () {
      return OTLPLogExporter_1.OTLPLogExporter;
    },
  });
});
//@ chunk-vt7p2m92.js:917-936 affinity
export default require_exporter_logs_otlp_grpc();

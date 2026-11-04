/**
 * @opentelemetry/otlp-exporter-base/build/src/types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:612-849 cjs-fingerprint
var require_types = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPExporterError = undefined;
  class OTLPExporterError extends Error {
    code;
    name = "OTLPExporterError";
    data;
    constructor(message, code, data) {
      super(message);
      this.data = data;
      this.code = code;
    }
  }
  cjsExports.OTLPExporterError = OTLPExporterError;
});
export { require_types };

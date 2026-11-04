/**
 * @opentelemetry/otlp-exporter-base/build/src/OTLPExporterBase.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:305-612 cjs-fingerprint
var require_OTLPExporterBase = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPExporterBase = undefined;
  class OTLPExporterBase {
    _delegate;
    constructor(_delegate) {
      this._delegate = _delegate;
    }
    export(items, resultCallback) {
      this._delegate.export(items, resultCallback);
    }
    forceFlush() {
      return this._delegate.forceFlush();
    }
    shutdown() {
      return this._delegate.shutdown();
    }
  }
  cjsExports.OTLPExporterBase = OTLPExporterBase;
});
export { require_OTLPExporterBase };

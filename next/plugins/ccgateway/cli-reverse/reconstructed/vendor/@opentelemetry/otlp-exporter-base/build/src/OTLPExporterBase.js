/**
 * @opentelemetry/otlp-exporter-base/build/src/OTLPExporterBase.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:305-612 cjs-fingerprint
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

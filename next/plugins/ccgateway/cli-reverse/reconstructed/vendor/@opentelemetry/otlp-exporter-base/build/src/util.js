/**
 * @opentelemetry/otlp-exporter-base/build/src/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";

//@ chunk-798ashq9.js:256116-256460 cjs-fingerprint
var require_util = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateAndNormalizeHeaders = undefined;
  var api_1 = require_api();
  function validateAndNormalizeHeaders(partialHeaders) {
    let headers = {};
    Object.entries(partialHeaders ?? {}).forEach(([key, value]) => {
      if (typeof value !== "undefined") headers[key] = String(value);
      else api_1.diag.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
    });
    return headers;
  }
  cjsExports.validateAndNormalizeHeaders = validateAndNormalizeHeaders;
});
export { require_util };

/**
 * @opentelemetry/otlp-exporter-base/build/src/is-export-retryable.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:258116-258518 cjs-fingerprint
var require_is_export_retryable = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parseRetryAfterToMills = cjsExports.isExportRetryable = undefined;
  function isExportRetryable(statusCode) {
    return [429, 502, 503, 504].includes(statusCode);
  }
  cjsExports.isExportRetryable = isExportRetryable;
  function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) return;
    let seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) return seconds > 0 ? seconds * 1000 : -1;
    let delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) return delay;
    return 0;
  }
  cjsExports.parseRetryAfterToMills = parseRetryAfterToMills;
});
export { require_is_export_retryable };

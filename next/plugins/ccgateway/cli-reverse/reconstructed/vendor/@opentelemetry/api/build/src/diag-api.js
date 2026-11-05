/**
 * @opentelemetry/api/build/src/diag-api.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_diag } from "./api/diag.js";

//@ chunk-7kayq7nc.js:46119-46250 cjs-fingerprint
var require_diag_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.diag = undefined;
  var diag_1 = require_diag();
  cjsExports.diag = diag_1.DiagAPI.instance();
});
export { require_diag_api };

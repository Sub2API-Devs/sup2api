/**
 * qrcode/lib/core/version-check.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:7990-8067 cjs-fingerprint
var require_version_check = __commonJS(function (cjsExports) {
  cjsExports.isValid = function (version) {
    return !isNaN(version) && version >= 1 && version <= 40;
  };
});
export { require_version_check };

/**
 * qrcode/lib/core/format-info.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-spjgqa4y.js:11234-11429 cjs-fingerprint
var require_format_info = __commonJS(function (cjsExports) {
  var Utils = require_utils();
  var G15_BCH = Utils.getBCHDigit(1335);
  cjsExports.getEncodedBits = function (errorCorrectionLevel, mask) {
    let data = (errorCorrectionLevel.bit << 3) | mask;
    let d = data << 10;
    while (Utils.getBCHDigit(d) - G15_BCH >= 0) d ^= 1335 << (Utils.getBCHDigit(d) - G15_BCH);
    return ((data << 10) | d) ^ 21522;
  };
});
export { require_format_info };

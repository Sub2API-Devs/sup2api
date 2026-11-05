/**
 * @opentelemetry/otlp-transformer/build/src/common/hex-to-binary.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:242266-242618 cjs-fingerprint
var require_hex_to_binary = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.hexToBinary = undefined;
  function intValue(charCode) {
    if (charCode >= 48 && charCode <= 57) return charCode - 48;
    if (charCode >= 97 && charCode <= 102) return charCode - 87;
    return charCode - 55;
  }
  function hexToBinary(hexStr) {
    let buf = new Uint8Array(hexStr.length / 2);
    let offset = 0;
    for (let i_2 = 0; i_2 < hexStr.length; i_2 += 2) {
      let hi = intValue(hexStr.charCodeAt(i_2));
      let lo = intValue(hexStr.charCodeAt(i_2 + 1));
      buf[offset++] = (hi << 4) | lo;
    }
    return buf;
  }
  cjsExports.hexToBinary = hexToBinary;
});
export { require_hex_to_binary };

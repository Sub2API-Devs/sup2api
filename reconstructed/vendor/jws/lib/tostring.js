/**
 * jws/lib/tostring.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-82d8c88w.js:7580-7773 cjs-fingerprint
var C = x(function (Lr, ve) {
  var ir = importMetaRequire("buffer").Buffer;
  ve.exports = function (r) {
    if (typeof r === "string") return r;
    if (typeof r === "number" || ir.isBuffer(r)) return r.toString();
    return JSON.stringify(r);
  };
});

export { C };

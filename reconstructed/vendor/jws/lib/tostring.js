/**
 * jws/lib/tostring.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-82d8c88w.js:7580-7773 cjs-fingerprint
var require_tostring = x(function (cjsExports, cjsModule) {
  var ir = importMetaRequire("buffer").Buffer;
  cjsModule.exports = function (obj) {
    if (typeof obj === "string") return obj;
    if (typeof obj === "number" || ir.isBuffer(obj)) return obj.toString();
    return JSON.stringify(obj);
  };
});
export { require_tostring };

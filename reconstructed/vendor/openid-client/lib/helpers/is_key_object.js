/**
 * openid-client/lib/helpers/is_key_object.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:7171-7302 cjs-fingerprint
var kO = x(function (Cve, SO) {
  var wO = importMetaRequire("util"),
    OO = importMetaRequire("crypto");
  SO.exports = wO.types.isKeyObject || ((e) => e && e instanceof OO.KeyObject);
});

export { kO };

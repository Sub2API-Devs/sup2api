/**
 * openid-client/lib/helpers/is_key_object.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:7171-7302 cjs-fingerprint
var require_is_key_object = x(function (cjsExports, cjsModule) {
  var util = importMetaRequire("util");
  var OO = importMetaRequire("crypto");
  cjsModule.exports = util.types.isKeyObject || ((obj) => obj && obj instanceof OO.KeyObject);
});
export { require_is_key_object };

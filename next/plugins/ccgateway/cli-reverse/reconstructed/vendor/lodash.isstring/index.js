/**
 * lodash.isstring/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.isstring@4.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:15499-15734 cjs-fingerprint
var require_lodash_isstring = __commonJS(function (cjsExports, cjsModule) {
  var stringTag = "[object String]";
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  var isArray = Array.isArray;
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isString(value) {
    return (
      typeof value == "string" ||
      (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag)
    );
  }
  cjsModule.exports = isString;
});
export { require_lodash_isstring };

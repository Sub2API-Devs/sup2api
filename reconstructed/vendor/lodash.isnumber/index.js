/**
 * lodash.isnumber/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.isnumber@3.0.3
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:14678-14888 cjs-fingerprint
var require_lodash_isnumber = x(function (cjsExports, cjsModule) {
  var numberTag = "[object Number]";
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isNumber(value) {
    return typeof value == "number" || (isObjectLike(value) && objectToString.call(value) == numberTag);
  }
  cjsModule.exports = isNumber;
});
export { require_lodash_isnumber };

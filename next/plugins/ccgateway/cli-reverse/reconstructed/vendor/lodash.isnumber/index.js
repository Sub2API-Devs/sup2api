/**
 * lodash.isnumber/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash.isnumber@3.0.3
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-b5df2wx1.js:14678-14888 cjs-fingerprint
var require_lodash_isnumber = __commonJS(function (cjsExports, cjsModule) {
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

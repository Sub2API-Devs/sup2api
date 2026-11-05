/**
 * lodash.isstring/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash.isstring@4.0.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-b5df2wx1.js:15499-15734 cjs-fingerprint
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

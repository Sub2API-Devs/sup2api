/**
 * lodash.isboolean/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash.isboolean@3.0.3
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-b5df2wx1.js:13288-13495 cjs-fingerprint
var require_lodash_isboolean = __commonJS(function (cjsExports, cjsModule) {
  var boolTag = "[object Boolean]";
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isBoolean(value) {
    return (
      value === true || value === false || (isObjectLike(value) && objectToString.call(value) == boolTag)
    );
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  cjsModule.exports = isBoolean;
});
export { require_lodash_isboolean };

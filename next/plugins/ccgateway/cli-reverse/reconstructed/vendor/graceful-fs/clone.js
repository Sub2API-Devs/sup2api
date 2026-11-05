/**
 * graceful-fs/clone.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: graceful-fs@4.2.11
 * pieces: chunk-3c7mkwg0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-3c7mkwg0.js:5806-6170 cjs-fingerprint
var require_clone = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = clone;
  var getPrototypeOf =
    Object.getPrototypeOf ||
    function (obj) {
      return obj.__proto__;
    };
  function clone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Object)
      var copy = {
        __proto__: getPrototypeOf(obj),
      };
    else var copy = Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
    });
    return copy;
  }
});
export { require_clone };

/**
 * fast-deep-equal/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: fast-deep-equal@3.1.3
 * pieces: chunk-8zgjzcry.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-8zgjzcry.js:226-953 cjs-fingerprint
var require_fast_deep_equal = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = function equal(a, b) {
    if (a === b) return true;
    if (a && b && typeof a == "object" && typeof b == "object") {
      if (a.constructor !== b.constructor) return false;
      var length;
      var i;
      var keys;
      if (Array.isArray(a)) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0;) if (!equal(a[i], b[i])) return false;
        return true;
      }
      if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
      if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
      if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
      keys = Object.keys(a);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;
      for (i = length; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
      for (i = length; i-- !== 0;) {
        var key = keys[i];
        if (!equal(a[key], b[key])) return false;
      }
      return true;
    }
    return a !== a && b !== b;
  };
});
export { require_fast_deep_equal };

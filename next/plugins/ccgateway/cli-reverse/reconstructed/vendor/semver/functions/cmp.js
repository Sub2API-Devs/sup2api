/**
 * semver/functions/cmp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_eq_3, require_eq_4, require_eq, require_eq_5, require_eq_2, require_eq_6 } from "./eq.js";

//@ chunk-7kayq7nc.js:12684-13209 cjs-fingerprint
var require_cmp = __commonJS(function (cjsExports, cjsModule) {
  var eq = require_eq_3();
  var neq = require_eq_4();
  var gt = require_eq();
  var gte = require_eq_5();
  var lt = require_eq_2();
  var lte = require_eq_6();
  var cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") a = a.version;
        if (typeof b === "object") b = b.version;
        return a === b;
      case "!==":
        if (typeof a === "object") a = a.version;
        if (typeof b === "object") b = b.version;
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw TypeError(`Invalid operator: ${op}`);
    }
  };
  cjsModule.exports = cmp;
});
export { require_cmp };

/**
 * openid-client/lib/helpers/defaults.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_is_plain_object } from "./is_plain_object.js";

//@ chunk-1hnjmk23.js:8470-8799 cjs-fingerprint
var require_defaults = __commonJS(function (cjsExports, cjsModule) {
  var isPlainObject = require_is_plain_object();
  function defaults(deep, target, ...sources) {
    for (let source of sources) {
      if (!isPlainObject(source)) continue;
      for (let [key, value] of Object.entries(source)) {
        if (key === "__proto__" || key === "constructor") continue;
        if (typeof target[key] === "undefined" && typeof value !== "undefined") target[key] = value;
        if (deep && isPlainObject(target[key]) && isPlainObject(value)) defaults(true, target[key], value);
      }
    }
    return target;
  }
  cjsModule.exports = defaults.bind(undefined, false);
  cjsModule.exports.deep = defaults.bind(undefined, true);
});
export { require_defaults };

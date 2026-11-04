/**
 * openid-client/lib/helpers/merge.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_is_plain_object } from "./is_plain_object.js";

//@ chunk-1ny7cxrt.js:27191-27454 cjs-fingerprint
var require_merge = __commonJS(function (cjsExports, cjsModule) {
  var isPlainObject = require_is_plain_object();
  function merge(target, ...sources) {
    for (let source of sources) {
      if (!isPlainObject(source)) continue;
      for (let [key, value] of Object.entries(source)) {
        if (key === "__proto__" || key === "constructor") continue;
        if (isPlainObject(target[key]) && isPlainObject(value)) target[key] = merge(target[key], value);
        else if (typeof value !== "undefined") target[key] = value;
      }
    }
    return target;
  }
  cjsModule.exports = merge;
});
export { require_merge };

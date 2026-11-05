/**
 * @opentelemetry/resources/build/src/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:136426-136614 cjs-fingerprint
var require_utils_3 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isPromiseLike = undefined;
  var isPromiseLike = (val) => val !== null && typeof val === "object" && typeof val.then === "function";
  cjsExports.isPromiseLike = isPromiseLike;
});
export { require_utils_3 };

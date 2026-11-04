/**
 * @opentelemetry/resources/build/src/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:136332-136520 cjs-fingerprint
var require_utils_3 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isPromiseLike = undefined;
  var isPromiseLike = (val) => val !== null && typeof val === "object" && typeof val.then === "function";
  cjsExports.isPromiseLike = isPromiseLike;
});
export { require_utils_3 };

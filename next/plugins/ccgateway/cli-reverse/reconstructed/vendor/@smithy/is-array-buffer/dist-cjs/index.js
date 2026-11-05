/**
 * @smithy/is-array-buffer/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/is-array-buffer@2.2.0..3.0.0
 * pieces: chunk-2v4fe6xx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-2v4fe6xx.js:269-440 cjs-fingerprint
var require_is_array_buffer = __commonJS(function (cjsExports) {
  var isArrayBuffer = (arg) =>
    (typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer) ||
    Object.prototype.toString.call(arg) === "[object ArrayBuffer]";
  cjsExports.isArrayBuffer = isArrayBuffer;
});
export { require_is_array_buffer };

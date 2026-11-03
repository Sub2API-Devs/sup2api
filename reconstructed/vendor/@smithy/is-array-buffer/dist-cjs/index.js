/**
 * @smithy/is-array-buffer/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/is-array-buffer@2.2.0..3.0.0
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-wr8v03d0.js:269-440 cjs-fingerprint
var s_s = x(function (N) {
  var G = (e) =>
    (typeof ArrayBuffer === "function" && e instanceof ArrayBuffer) ||
    Object.prototype.toString.call(e) === "[object ArrayBuffer]";
  N.isArrayBuffer = G;
});

export { s_s };

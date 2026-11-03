/**
 * qrcode/lib/can-promise.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:229-357 cjs-require-graph
var require_can_promise = x(function (cjsExports, cjsModule) {
  cjsModule.exports = function () {
    return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
  };
});
export { require_can_promise };

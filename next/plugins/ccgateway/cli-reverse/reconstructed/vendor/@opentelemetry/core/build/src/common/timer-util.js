/**
 * @opentelemetry/core/build/src/common/timer-util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:120019-120179 cjs-fingerprint
var require_timer_util = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.unrefTimer = undefined;
  function unrefTimer(timer) {
    if (typeof timer !== "number") timer.unref();
  }
  cjsExports.unrefTimer = unrefTimer;
});
export { require_timer_util };

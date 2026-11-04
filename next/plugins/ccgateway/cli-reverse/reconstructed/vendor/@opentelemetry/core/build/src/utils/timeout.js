/**
 * @opentelemetry/core/build/src/utils/timeout.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:127291-127741 cjs-fingerprint
var require_timeout = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.callWithTimeout = cjsExports.TimeoutError = undefined;
  class TimeoutError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, TimeoutError.prototype);
    }
  }
  cjsExports.TimeoutError = TimeoutError;
  function callWithTimeout(promise, timeout) {
    let timeoutHandle;
    let timeoutPromise = new Promise(function (_resolve, reject) {
      timeoutHandle = setTimeout(function () {
        reject(new TimeoutError("Operation timed out."));
      }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then(
      (result) => {
        clearTimeout(timeoutHandle);
        return result;
      },
      (reason) => {
        clearTimeout(timeoutHandle);
        throw reason;
      },
    );
  }
  cjsExports.callWithTimeout = callWithTimeout;
});
export { require_timeout };

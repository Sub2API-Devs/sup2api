/**
 * @opentelemetry/core/build/src/utils/timeout.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:127385-127835 cjs-fingerprint
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

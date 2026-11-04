/**
 * @typespec/ts-http-runtime/dist/esm/retryStrategies/exponentialRetryStrategy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { isThrottlingRetryResponse } from "./throttlingRetryStrategy.js";
import { calculateRetryDelay } from "../util/delay.js";

//@ chunk-mrx6y2r5.js:44526-44547 esm-layout
var DEFAULT_CLIENT_RETRY_INTERVAL = 1000;
var DEFAULT_CLIENT_MAX_RETRY_INTERVAL = 64000;
//@ chunk-mrx6y2r5.js:44547-44975 esm-fingerprint
function exponentialRetryStrategy(options = {}) {
  var _a;
  var _b;
  let retryInterval =
    (_a = options.retryDelayInMs) !== null && _a !== undefined ? _a : DEFAULT_CLIENT_RETRY_INTERVAL;
  let maxRetryInterval =
    (_b = options.maxRetryDelayInMs) !== null && _b !== undefined ? _b : DEFAULT_CLIENT_MAX_RETRY_INTERVAL;
  return {
    name: "exponentialRetryStrategy",
    retry({ retryCount, response, responseError }) {
      let matchedSystemError = isSystemError(responseError);
      let ignoreSystemErrors = matchedSystemError && options.ignoreSystemErrors;
      let isExponential = isExponentialRetryResponse(response);
      let ignoreHttpStatusCodes = isExponential && options.ignoreHttpStatusCodes;
      if (
        (response && (isThrottlingRetryResponse(response) || !isExponential)) ||
        ignoreHttpStatusCodes ||
        ignoreSystemErrors
      )
        return {
          skipStrategy: true,
        };
      if (responseError && !matchedSystemError && !isExponential)
        return {
          errorToThrow: responseError,
        };
      return calculateRetryDelay(retryCount, {
        retryDelayInMs: retryInterval,
        maxRetryDelayInMs: maxRetryInterval,
      });
    },
  };
}
//@ chunk-mrx6y2r5.js:44975-45092 esm-layout
function isExponentialRetryResponse(response) {
  return Boolean(
    response &&
    response.status !== undefined &&
    (response.status >= 500 || response.status === 408) &&
    response.status !== 501 &&
    response.status !== 505,
  );
}
//@ chunk-mrx6y2r5.js:45092-45267 esm-fingerprint
function isSystemError(err) {
  if (!err) return false;
  return (
    err.code === "ETIMEDOUT" ||
    err.code === "ESOCKETTIMEDOUT" ||
    err.code === "ECONNREFUSED" ||
    err.code === "ECONNRESET" ||
    err.code === "ENOENT" ||
    err.code === "ENOTFOUND"
  );
}
export { exponentialRetryStrategy };

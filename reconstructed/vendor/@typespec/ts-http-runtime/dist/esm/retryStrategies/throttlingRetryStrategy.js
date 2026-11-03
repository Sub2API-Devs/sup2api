/**
 * @typespec/ts-http-runtime/dist/esm/retryStrategies/throttlingRetryStrategy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-fingerprint 4
 */
import { parseHeaderValueAsNumber } from "../util/helpers.js";

//@ chunk-mrx6y2r5.js:43991-44059 esm-fingerprint
var RetryAfterHeader = "Retry-After";
var AllRetryAfterHeaders = ["retry-after-ms", "x-ms-retry-after-ms", RetryAfterHeader];
//@ chunk-mrx6y2r5.js:44059-44323 esm-fingerprint
function getRetryAfterInMs(response) {
  if (!(response && [429, 503].includes(response.status))) return;
  try {
    for (let header of AllRetryAfterHeaders) {
      let retryAfterValue = parseHeaderValueAsNumber(response, header);
      if (retryAfterValue === 0 || retryAfterValue)
        return retryAfterValue * (header === RetryAfterHeader ? 1000 : 1);
    }
    let retryAfterHeader = response.headers.get(RetryAfterHeader);
    if (!retryAfterHeader) return;
    let diff = Date.parse(retryAfterHeader) - Date.now();
    return Number.isFinite(diff) ? Math.max(0, diff) : undefined;
  } catch (_a) {
    return;
  }
}
//@ chunk-mrx6y2r5.js:44323-44368 esm-fingerprint
function isThrottlingRetryResponse(response) {
  return Number.isFinite(getRetryAfterInMs(response));
}
//@ chunk-mrx6y2r5.js:44368-44526 esm-fingerprint
function throttlingRetryStrategy() {
  return {
    name: "throttlingRetryStrategy",
    retry({ response }) {
      let retryAfterInMs = getRetryAfterInMs(response);
      if (!Number.isFinite(retryAfterInMs))
        return {
          skipStrategy: true,
        };
      return {
        retryAfterInMs,
      };
    },
  };
}
export { isThrottlingRetryResponse, throttlingRetryStrategy };

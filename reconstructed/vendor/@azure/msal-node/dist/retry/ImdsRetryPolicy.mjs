/**
 * @azure/msal-node/dist/retry/ImdsRetryPolicy.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { HttpStatus } from "../../../msal-common/lib/index-node-DhUjlPuB.js";
import { ExponentialRetryStrategy } from "../../lib/msal-node.cjs";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-mrx6y2r5.js:277618-277725 esm-fingerprint
var HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXPONENTIAL_STRATEGY_NUM_RETRIES;
var LINEAR_STRATEGY_NUM_RETRIES;
var MIN_EXPONENTIAL_BACKOFF_MS;
var MAX_EXPONENTIAL_BACKOFF_MS;
var EXPONENTIAL_DELTA_BACKOFF_MS;
var HTTP_STATUS_GONE_RETRY_AFTER_MS;
deferInit("chunk-mrx6y2r5.js:277618", () => {
  HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY = [
    HttpStatus.NOT_FOUND,
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.GONE,
    HttpStatus.TOO_MANY_REQUESTS,
  ];
  EXPONENTIAL_STRATEGY_NUM_RETRIES = 3;
  LINEAR_STRATEGY_NUM_RETRIES = 7;
  MIN_EXPONENTIAL_BACKOFF_MS = 1000;
  MAX_EXPONENTIAL_BACKOFF_MS = 4000;
  EXPONENTIAL_DELTA_BACKOFF_MS = 2000;
  HTTP_STATUS_GONE_RETRY_AFTER_MS = 1e4;
});
//@ chunk-mrx6y2r5.js:277725-278573 esm-fingerprint
class ImdsRetryPolicy {
  constructor() {
    this.exponentialRetryStrategy = new ExponentialRetryStrategy(
      ImdsRetryPolicy.MIN_EXPONENTIAL_BACKOFF_MS,
      ImdsRetryPolicy.MAX_EXPONENTIAL_BACKOFF_MS,
      ImdsRetryPolicy.EXPONENTIAL_DELTA_BACKOFF_MS,
    );
  }
  static get MIN_EXPONENTIAL_BACKOFF_MS() {
    return MIN_EXPONENTIAL_BACKOFF_MS;
  }
  static get MAX_EXPONENTIAL_BACKOFF_MS() {
    return MAX_EXPONENTIAL_BACKOFF_MS;
  }
  static get EXPONENTIAL_DELTA_BACKOFF_MS() {
    return EXPONENTIAL_DELTA_BACKOFF_MS;
  }
  static get HTTP_STATUS_GONE_RETRY_AFTER_MS() {
    return HTTP_STATUS_GONE_RETRY_AFTER_MS;
  }
  set isNewRequest(value) {
    this._isNewRequest = value;
  }
  async pauseForRetry(httpStatusCode, currentRetry, logger) {
    if (this._isNewRequest) {
      this._isNewRequest = false;
      this.maxRetries =
        httpStatusCode === HttpStatus.GONE ? LINEAR_STRATEGY_NUM_RETRIES : EXPONENTIAL_STRATEGY_NUM_RETRIES;
    }
    if (
      (HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY.includes(httpStatusCode) ||
        (httpStatusCode >= HttpStatus.SERVER_ERROR_RANGE_START &&
          httpStatusCode <= HttpStatus.SERVER_ERROR_RANGE_END &&
          currentRetry < this.maxRetries)) &&
      currentRetry < this.maxRetries
    ) {
      let retryAfterDelay =
        httpStatusCode === HttpStatus.GONE
          ? ImdsRetryPolicy.HTTP_STATUS_GONE_RETRY_AFTER_MS
          : this.exponentialRetryStrategy.calculateDelay(currentRetry);
      logger.verbose(`Retrying request in ${retryAfterDelay}ms (retry attempt: ${currentRetry + 1})`);
      await new Promise((resolve) => setTimeout(resolve, retryAfterDelay));
      return true;
    }
    return false;
  }
}
export { ImdsRetryPolicy };

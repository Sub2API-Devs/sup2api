/**
 * @opentelemetry/otlp-exporter-base/build/src/retrying-transport.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:260741-261456 cjs-fingerprint
var require_retrying_transport = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createRetryingTransport = undefined;
  var MAX_ATTEMPTS = 5;
  var INITIAL_BACKOFF = 1000;
  var MAX_BACKOFF = 5000;
  var BACKOFF_MULTIPLIER = 1.5;
  var JITTER = 0.2;
  function getJitter() {
    return Math.random() * (2 * JITTER) - JITTER;
  }
  class RetryingTransport {
    _transport;
    constructor(_transport) {
      this._transport = _transport;
    }
    retry(data, timeoutMillis, inMillis) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this._transport.send(data, timeoutMillis).then(resolve, reject);
        }, inMillis);
      });
    }
    async send(data, timeoutMillis) {
      let deadline = Date.now() + timeoutMillis;
      let result = await this._transport.send(data, timeoutMillis);
      let attempts = MAX_ATTEMPTS;
      let nextBackoff = INITIAL_BACKOFF;
      while (result.status === "retryable" && attempts > 0) {
        attempts--;
        let backoff = Math.max(Math.min(nextBackoff, MAX_BACKOFF) + getJitter(), 0);
        nextBackoff = nextBackoff * BACKOFF_MULTIPLIER;
        let retryInMillis = result.retryInMillis ?? backoff;
        let remainingTimeoutMillis = deadline - Date.now();
        if (retryInMillis > remainingTimeoutMillis) return result;
        result = await this.retry(data, remainingTimeoutMillis, retryInMillis);
      }
      return result;
    }
    shutdown() {
      return this._transport.shutdown();
    }
  }
  function createRetryingTransport(options) {
    return new RetryingTransport(options.transport);
  }
  cjsExports.createRetryingTransport = createRetryingTransport;
});
export { require_retrying_transport };

/**
 * @opentelemetry/otlp-exporter-base/build/src/bounded-queue-export-promise-handler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:1935-2585 cjs-fingerprint
var require_bounded_queue_export_promise_handler = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createBoundedQueueExportPromiseHandler = undefined;
  class BoundedQueueExportPromiseHandler {
    _concurrencyLimit;
    _sendingPromises = [];
    constructor(concurrencyLimit) {
      this._concurrencyLimit = concurrencyLimit;
    }
    pushPromise(promise) {
      if (this.hasReachedLimit()) throw Error("Concurrency Limit reached");
      this._sendingPromises.push(promise);
      let popPromise = () => {
        let index = this._sendingPromises.indexOf(promise);
        this._sendingPromises.splice(index, 1);
      };
      promise.then(popPromise, popPromise);
    }
    hasReachedLimit() {
      return this._sendingPromises.length >= this._concurrencyLimit;
    }
    async awaitAll() {
      await Promise.all(this._sendingPromises);
    }
  }
  function createBoundedQueueExportPromiseHandler(options) {
    return new BoundedQueueExportPromiseHandler(options.concurrencyLimit);
  }
  cjsExports.createBoundedQueueExportPromiseHandler = createBoundedQueueExportPromiseHandler;
});
export { require_bounded_queue_export_promise_handler };

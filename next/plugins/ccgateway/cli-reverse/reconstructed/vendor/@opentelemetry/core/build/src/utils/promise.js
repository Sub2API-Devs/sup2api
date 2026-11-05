/**
 * @opentelemetry/core/build/src/utils/promise.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:128135-128449 cjs-fingerprint
var require_promise = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Deferred = undefined;
  class Deferred {
    _promise;
    _resolve;
    _reject;
    constructor() {
      this._promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }
    get promise() {
      return this._promise;
    }
    resolve(val) {
      this._resolve(val);
    }
    reject(err) {
      this._reject(err);
    }
  }
  cjsExports.Deferred = Deferred;
});
export { require_promise };

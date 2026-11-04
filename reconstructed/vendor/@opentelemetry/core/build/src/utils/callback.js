/**
 * @opentelemetry/core/build/src/utils/callback.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_promise } from "./promise.js";

//@ chunk-bwbq4xvm.js:128355-128919 cjs-fingerprint
var require_callback = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BindOnceFuture = undefined;
  var promise_1 = require_promise();
  class BindOnceFuture {
    _isCalled = false;
    _deferred = new promise_1.Deferred();
    _callback;
    _that;
    constructor(callback, that) {
      this._callback = callback;
      this._that = that;
    }
    get isCalled() {
      return this._isCalled;
    }
    get promise() {
      return this._deferred.promise;
    }
    call(...args) {
      if (!this._isCalled) {
        this._isCalled = true;
        try {
          Promise.resolve(this._callback.call(this._that, ...args)).then(
            (val) => this._deferred.resolve(val),
            (err) => this._deferred.reject(err),
          );
        } catch (err) {
          this._deferred.reject(err);
        }
      }
      return this._deferred.promise;
    }
  }
  cjsExports.BindOnceFuture = BindOnceFuture;
});
export { require_callback };

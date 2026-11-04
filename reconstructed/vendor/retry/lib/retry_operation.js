/**
 * retry/lib/retry_operation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: retry@0.12.0
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:11354-13629 cjs-fingerprint
var require_retry_operation = __commonJS(function (cjsExports, cjsModule) {
  function RetryOperation(timeouts, options) {
    if (typeof options === "boolean")
      options = {
        forever: options,
      };
    this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
    this._timeouts = timeouts;
    this._options = options || {};
    this._maxRetryTime = (options && options.maxRetryTime) || 1 / 0;
    this._fn = null;
    this._errors = [];
    this._attempts = 1;
    this._operationTimeout = null;
    this._operationTimeoutCb = null;
    this._timeout = null;
    this._operationStart = null;
    if (this._options.forever) this._cachedTimeouts = this._timeouts.slice(0);
  }
  cjsModule.exports = RetryOperation;
  RetryOperation.prototype.reset = function () {
    this._attempts = 1;
    this._timeouts = this._originalTimeouts;
  };
  RetryOperation.prototype.stop = function () {
    if (this._timeout) clearTimeout(this._timeout);
    this._timeouts = [];
    this._cachedTimeouts = null;
  };
  RetryOperation.prototype.retry = function (err) {
    if (this._timeout) clearTimeout(this._timeout);
    if (!err) return false;
    var currentTime = new Date().getTime();
    if (err && currentTime - this._operationStart >= this._maxRetryTime) {
      this._errors.unshift(Error("RetryOperation timeout occurred"));
      return false;
    }
    this._errors.push(err);
    var timeout = this._timeouts.shift();
    if (timeout === undefined)
      if (this._cachedTimeouts) {
        this._errors.splice(this._errors.length - 1, this._errors.length);
        this._timeouts = this._cachedTimeouts.slice(0);
        timeout = this._timeouts.shift();
      } else return false;
    var operation = this;
    var timer = setTimeout(function () {
      operation._attempts++;
      if (operation._operationTimeoutCb) {
        operation._timeout = setTimeout(function () {
          operation._operationTimeoutCb(operation._attempts);
        }, operation._operationTimeout);
        if (operation._options.unref) operation._timeout.unref();
      }
      operation._fn(operation._attempts);
    }, timeout);
    if (this._options.unref) timer.unref();
    return true;
  };
  RetryOperation.prototype.attempt = function (fn, timeoutOps) {
    this._fn = fn;
    if (timeoutOps) {
      if (timeoutOps.timeout) this._operationTimeout = timeoutOps.timeout;
      if (timeoutOps.cb) this._operationTimeoutCb = timeoutOps.cb;
    }
    var operation = this;
    if (this._operationTimeoutCb)
      this._timeout = setTimeout(function () {
        operation._operationTimeoutCb();
      }, operation._operationTimeout);
    this._operationStart = new Date().getTime();
    this._fn(this._attempts);
  };
  RetryOperation.prototype.try = function (fn) {
    console.log("Using RetryOperation.try() is deprecated");
    this.attempt(fn);
  };
  RetryOperation.prototype.start = function (fn) {
    console.log("Using RetryOperation.start() is deprecated");
    this.attempt(fn);
  };
  RetryOperation.prototype.start = RetryOperation.prototype.try;
  RetryOperation.prototype.errors = function () {
    return this._errors;
  };
  RetryOperation.prototype.attempts = function () {
    return this._attempts;
  };
  RetryOperation.prototype.mainError = function () {
    if (this._errors.length === 0) return null;
    var counts = {};
    var mainError = null;
    var mainErrorCount = 0;
    for (var errorIndex = 0; errorIndex < this._errors.length; errorIndex++) {
      var error = this._errors[errorIndex];
      var message = error.message;
      var count = (counts[message] || 0) + 1;
      counts[message] = count;
      if (count >= mainErrorCount) {
        mainError = error;
        mainErrorCount = count;
      }
    }
    return mainError;
  };
});
export { require_retry_operation };

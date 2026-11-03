/**
 * retry/lib/retry_operation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: retry@0.12.0
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:11354-13629 cjs-fingerprint
var Qe = x(function (tr, Ke) {
  function q(e, r) {
    if (typeof r === "boolean") r = { forever: r };
    if (
      ((this._originalTimeouts = JSON.parse(JSON.stringify(e))),
      (this._timeouts = e),
      (this._options = r || {}),
      (this._maxRetryTime = (r && r.maxRetryTime) || 1 / 0),
      (this._fn = null),
      (this._errors = []),
      (this._attempts = 1),
      (this._operationTimeout = null),
      (this._operationTimeoutCb = null),
      (this._timeout = null),
      (this._operationStart = null),
      this._options.forever)
    )
      this._cachedTimeouts = this._timeouts.slice(0);
  }
  Ke.exports = q;
  q.prototype.reset = function () {
    ((this._attempts = 1), (this._timeouts = this._originalTimeouts));
  };
  q.prototype.stop = function () {
    if (this._timeout) clearTimeout(this._timeout);
    ((this._timeouts = []), (this._cachedTimeouts = null));
  };
  q.prototype.retry = function (e) {
    if (this._timeout) clearTimeout(this._timeout);
    if (!e) return !1;
    var time = new Date().getTime();
    if (e && time - this._operationStart >= this._maxRetryTime)
      return (this._errors.unshift(Error("RetryOperation timeout occurred")), !1);
    this._errors.push(e);
    var n = this._timeouts.shift();
    if (n === void 0)
      if (this._cachedTimeouts)
        (this._errors.splice(this._errors.length - 1, this._errors.length),
          (this._timeouts = this._cachedTimeouts.slice(0)),
          (n = this._timeouts.shift()));
      else return !1;
    var i = this,
      u = setTimeout(function () {
        if ((i._attempts++, i._operationTimeoutCb)) {
          if (
            ((i._timeout = setTimeout(function () {
              i._operationTimeoutCb(i._attempts);
            }, i._operationTimeout)),
            i._options.unref)
          )
            i._timeout.unref();
        }
        i._fn(i._attempts);
      }, n);
    if (this._options.unref) u.unref();
    return !0;
  };
  q.prototype.attempt = function (e, r) {
    if (((this._fn = e), r)) {
      if (r.timeout) this._operationTimeout = r.timeout;
      if (r.cb) this._operationTimeoutCb = r.cb;
    }
    var n = this;
    if (this._operationTimeoutCb)
      this._timeout = setTimeout(function () {
        n._operationTimeoutCb();
      }, n._operationTimeout);
    ((this._operationStart = new Date().getTime()), this._fn(this._attempts));
  };
  q.prototype.try = function (e) {
    (console.log("Using RetryOperation.try() is deprecated"), this.attempt(e));
  };
  q.prototype.start = function (e) {
    (console.log("Using RetryOperation.start() is deprecated"), this.attempt(e));
  };
  q.prototype.start = q.prototype.try;
  q.prototype.errors = function () {
    return this._errors;
  };
  q.prototype.attempts = function () {
    return this._attempts;
  };
  q.prototype.mainError = function () {
    if (this._errors.length === 0) return null;
    var e = {},
      r = null,
      n = 0;
    for (var i = 0; i < this._errors.length; i++) {
      var u = this._errors[i],
        message = u.message,
        h = (e[message] || 0) + 1;
      if (((e[message] = h), h >= n)) ((r = u), (n = h));
    }
    return r;
  };
});

export { Qe };

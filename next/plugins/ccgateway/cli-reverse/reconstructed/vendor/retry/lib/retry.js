/**
 * retry/lib/retry.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: retry@0.12.0
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_retry_operation } from "./retry_operation.js";

//@ chunk-bmbhxpfm.js:13629-14791 cjs-fingerprint
var require_retry = __commonJS(function (cjsExports) {
  var RetryOperation = require_retry_operation();
  cjsExports.operation = function (options) {
    var timeouts = cjsExports.timeouts(options);
    return new RetryOperation(timeouts, {
      forever: options && options.forever,
      unref: options && options.unref,
      maxRetryTime: options && options.maxRetryTime,
    });
  };
  cjsExports.timeouts = function (options) {
    if (options instanceof Array) return [].concat(options);
    var opts = {
      retries: 10,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 1 / 0,
      randomize: false,
    };
    for (var key in options) opts[key] = options[key];
    if (opts.minTimeout > opts.maxTimeout) throw Error("minTimeout is greater than maxTimeout");
    var timeouts = [];
    for (var i = 0; i < opts.retries; i++) timeouts.push(this.createTimeout(i, opts));
    if (options && options.forever && !timeouts.length) timeouts.push(this.createTimeout(i, opts));
    timeouts.sort(function (a, b) {
      return a - b;
    });
    return timeouts;
  };
  cjsExports.createTimeout = function (attempt, opts) {
    var random = opts.randomize ? Math.random() + 1 : 1;
    var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
    timeout = Math.min(timeout, opts.maxTimeout);
    return timeout;
  };
  cjsExports.wrap = function (obj, options, methods) {
    if (options instanceof Array) {
      methods = options;
      options = null;
    }
    if (!methods) {
      methods = [];
      for (var key in obj) if (typeof obj[key] === "function") methods.push(key);
    }
    for (var i = 0; i < methods.length; i++) {
      var method = methods[i];
      var original = obj[method];
      obj[method] = function (original) {
        var op = cjsExports.operation(options);
        var args = Array.prototype.slice.call(arguments, 1);
        var callback = args.pop();
        args.push(function (err) {
          if (op.retry(err)) return;
          if (err) arguments[0] = op.mainError();
          callback.apply(this, arguments);
        });
        op.attempt(function () {
          original.apply(obj, args);
        });
      }.bind(obj, original);
      obj[method].options = options;
    }
  };
});
export { require_retry };

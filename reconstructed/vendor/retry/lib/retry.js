/**
 * retry/lib/retry.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: retry@0.12.0
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Qe } from "./retry_operation.js";

//@ chunk-bmbhxpfm.js:13629-14791 cjs-fingerprint
var He = x(function (Ee) {
  var gt = Qe();
  Ee.operation = function (e) {
    var timeouts = Ee.timeouts(e);
    return new gt(timeouts, {
      forever: e && e.forever,
      unref: e && e.unref,
      maxRetryTime: e && e.maxRetryTime,
    });
  };
  Ee.timeouts = function (e) {
    if (e instanceof Array) return [].concat(e);
    var r = { retries: 10, factor: 2, minTimeout: 1000, maxTimeout: 1 / 0, randomize: !1 };
    for (var key in e) r[key] = e[key];
    if (r.minTimeout > r.maxTimeout) throw Error("minTimeout is greater than maxTimeout");
    var i = [];
    for (var u = 0; u < r.retries; u++) i.push(this.createTimeout(u, r));
    if (e && e.forever && !i.length) i.push(this.createTimeout(u, r));
    return (
      i.sort(function (c, h) {
        return c - h;
      }),
      i
    );
  };
  Ee.createTimeout = function (e, r) {
    var n = r.randomize ? Math.random() + 1 : 1,
      rounded = Math.round(n * r.minTimeout * Math.pow(r.factor, e));
    return ((rounded = Math.min(rounded, r.maxTimeout)), rounded);
  };
  Ee.wrap = function (e, r, n) {
    if (r instanceof Array) ((n = r), (r = null));
    if (!n) {
      n = [];
      for (var key in e) if (typeof e[key] === "function") n.push(key);
    }
    for (var u = 0; u < n.length; u++) {
      var c = n[u],
        h = e[c];
      ((e[c] = function (E) {
        var operation = Ee.operation(r),
          o = Array.prototype.slice.call(arguments, 1),
          p = o.pop();
        (o.push(function (f) {
          if (operation.retry(f)) return;
          if (f) arguments[0] = operation.mainError();
          p.apply(this, arguments);
        }),
          operation.attempt(function () {
            E.apply(e, o);
          }));
      }.bind(e, h)),
        (e[c].options = r));
    }
  };
});

export { He };

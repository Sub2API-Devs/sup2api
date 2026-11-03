/**
 * signal-exit/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: signal-exit@4.1.0
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { Ve } from "./signals.js";

//@ chunk-bmbhxpfm.js:15044-17126 cjs-fingerprint
var Xe = x(function (ir, J) {
  var g = global.process,
    B = function (e) {
      return (
        e &&
        typeof e === "object" &&
        typeof e.removeListener === "function" &&
        typeof e.emit === "function" &&
        typeof e.reallyExit === "function" &&
        typeof e.listeners === "function" &&
        typeof e.kill === "function" &&
        typeof e.pid === "number" &&
        typeof e.on === "function"
      );
    };
  if (!B(g))
    J.exports = function () {
      return function () {};
    };
  else {
    if (
      ((Te = importMetaRequire("assert")),
      (z = Ve()),
      (xe = /^win/i.test(g.platform)),
      (X = importMetaRequire("events")),
      typeof X !== "function")
    )
      X = X.EventEmitter;
    if (g.__signal_exit_emitter__) D = g.__signal_exit_emitter__;
    else ((D = g.__signal_exit_emitter__ = new X()), (D.count = 0), (D.emitted = {}));
    if (!D.infinite) (D.setMaxListeners(1 / 0), (D.infinite = !0));
    ((J.exports = function (e, r) {
      if (!B(global.process)) return function () {};
      if ((Te.equal(typeof e, "function", "a callback must be provided for exit handler"), H === !1)) se();
      var n = "exit";
      if (r && r.alwaysLast) n = "afterexit";
      var i = function () {
        if (
          (D.removeListener(n, e), D.listeners("exit").length === 0 && D.listeners("afterexit").length === 0)
        )
          ee();
      };
      return (D.on(n, e), i);
    }),
      (ee = function () {
        if (!H || !B(global.process)) return;
        ((H = !1),
          z.forEach(function (r) {
            try {
              g.removeListener(r, te[r]);
            } catch (error) {}
          }),
          (g.emit = re),
          (g.reallyExit = he),
          (D.count -= 1));
      }),
      (J.exports.unload = ee),
      (Y = function (r, n, i) {
        if (D.emitted[r]) return;
        ((D.emitted[r] = !0), D.emit(r, n, i));
      }),
      (te = {}),
      z.forEach(function (e) {
        te[e] = function () {
          if (!B(global.process)) return;
          var listeners = g.listeners(e);
          if (listeners.length === D.count) {
            if ((ee(), Y("exit", null, e), Y("afterexit", null, e), xe && e === "SIGHUP")) e = "SIGINT";
            g.kill(g.pid, e);
          }
        };
      }),
      (J.exports.signals = function () {
        return z;
      }),
      (H = !1),
      (se = function () {
        if (H || !B(global.process)) return;
        ((H = !0),
          (D.count += 1),
          (z = z.filter(function (r) {
            try {
              return (g.on(r, te[r]), !0);
            } catch (error) {
              return !1;
            }
          })),
          (g.emit = Ie),
          (g.reallyExit = ke));
      }),
      (J.exports.load = se),
      (he = g.reallyExit),
      (ke = function (r) {
        if (!B(global.process)) return;
        ((g.exitCode = r || 0),
          Y("exit", g.exitCode, null),
          Y("afterexit", g.exitCode, null),
          he.call(g, g.exitCode));
      }),
      (re = g.emit),
      (Ie = function (r, n) {
        if (r === "exit" && B(global.process)) {
          if (n !== void 0) g.exitCode = n;
          var i = re.apply(this, arguments);
          return (Y("exit", g.exitCode, null), Y("afterexit", g.exitCode, null), i);
        } else return re.apply(this, arguments);
      }));
  }
  var Te, z, xe, X, D, ee, Y, te, H, se, he, ke, re, Ie;
});

export { Xe };

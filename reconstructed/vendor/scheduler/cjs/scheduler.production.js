/**
 * scheduler/cjs/scheduler.production.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: scheduler@0.26.0..0.28.0
 * pieces: chunk-bzr73sfg.js (11)
 * attribution: esm-layout 4, esm-fingerprint 7
 */
import { Wi } from "./scheduler-unstable_post_task.development.js";
import { Xa } from "../../../runtime/bun-runtime.js";

//@ chunk-bzr73sfg.js:3596-3717 esm-layout
function id(n, u) {
  var f = n.length;
  n.push(u);
  e: for (; 0 < f;) {
    var m = (f - 1) >>> 1,
      p = n[m];
    if (0 < $a(p, u)) ((n[m] = u), (n[f] = p), (f = m));
    else break e;
  }
}
//@ chunk-bzr73sfg.js:3717-3762 esm-layout
function oi(n) {
  return n.length === 0 ? null : n[0];
}
//@ chunk-bzr73sfg.js:3762-4050 esm-layout
function is(n) {
  if (n.length === 0) return null;
  var u = n[0],
    f = n.pop();
  if (f !== u) {
    n[0] = f;
    e: for (var m = 0, p = n.length, g = p >>> 1; m < g;) {
      var E = 2 * (m + 1) - 1,
        T = n[E],
        A = E + 1,
        D = n[A];
      if (0 > $a(T, f))
        A < p && 0 > $a(D, T) ? ((n[m] = D), (n[A] = f), (m = A)) : ((n[m] = T), (n[E] = f), (m = E));
      else if (A < p && 0 > $a(D, f)) ((n[m] = D), (n[A] = f), (m = A));
      else break e;
    }
  }
  return u;
}
//@ chunk-bzr73sfg.js:4050-4122 esm-fingerprint
function $a(n, u) {
  var f = n.sortIndex - u.sortIndex;
  return f !== 0 ? f : n.id - u.id;
}
//@ chunk-bzr73sfg.js:4122-4282 esm-fingerprint
function ts(n) {
  for (var u = oi(Ki); u !== null;) {
    if (u.callback === null) is(Ki);
    else if (u.startTime <= n) (is(Ki), (u.sortIndex = u.expirationTime), id(Ci, u));
    else break;
    u = oi(Ki);
  }
}
//@ chunk-bzr73sfg.js:4282-4406 esm-fingerprint
function ud(n) {
  if (((pl = !1), ts(n), !ml))
    if (oi(Ci) !== null) ((ml = !0), po || ((po = !0), mo()));
    else {
      var u = oi(Ki);
      u !== null && cd(ud, u.startTime - n);
    }
}
//@ chunk-bzr73sfg.js:4406-4463 esm-fingerprint
function Ny() {
  return sd ? !0 : Wi.unstable_now() - wy < Ay ? !1 : !0;
}
//@ chunk-bzr73sfg.js:4463-5029 esm-fingerprint
function nd() {
  if (((sd = !1), po)) {
    var unstable_now = Wi.unstable_now();
    wy = unstable_now;
    var u = !0;
    try {
      e: {
        ((ml = !1), pl && ((pl = !1), Ty(yl), (yl = -1)), (ld = !0));
        var f = Kt;
        try {
          t: {
            ts(unstable_now);
            for (On = oi(Ci); On !== null && !(On.expirationTime > unstable_now && Ny());) {
              var callback = On.callback;
              if (typeof callback === "function") {
                ((On.callback = null), (Kt = On.priorityLevel));
                var p = callback(On.expirationTime <= unstable_now);
                if (((unstable_now = Wi.unstable_now()), typeof p === "function")) {
                  ((On.callback = p), ts(unstable_now), (u = !0));
                  break t;
                }
                (On === oi(Ci) && is(Ci), ts(unstable_now));
              } else is(Ci);
              On = oi(Ci);
            }
            if (On !== null) u = !0;
            else {
              var g = oi(Ki);
              (g !== null && cd(ud, g.startTime - unstable_now), (u = !1));
            }
          }
          break e;
        } finally {
          ((On = null), (Kt = f), (ld = !1));
        }
        u = void 0;
      }
    } finally {
      u ? mo() : (po = !1);
    }
  }
}
//@ chunk-bzr73sfg.js:5029-5088 esm-fingerprint
function cd(n, u) {
  yl = My(function () {
    n(Wi.unstable_now());
  }, u);
}
//@ chunk-bzr73sfg.js:5088-6328 esm-layout
var Yn = void 0,
  rd,
  es,
  od,
  Ci,
  Ki,
  Dx = 1,
  On = null,
  Kt = 3,
  ld = !1,
  ml = !1,
  pl = !1,
  sd = !1,
  My,
  Ty,
  Ry,
  po = !1,
  yl = -1,
  Ay = 5,
  wy = -1,
  mo,
  ns,
  ad,
  rs = 5,
  os = 1,
  Dy = 4,
  gl = 3,
  _y = null,
  ls = 2,
  as = function (n) {
    n.callback = null;
  },
  Oy = function (n) {
    0 > n || 125 < n
      ? console.error(
          "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
        )
      : (Ay = 0 < n ? Math.floor(1000 / n) : 5);
  },
  Hy = function () {
    return Kt;
  },
  Ly = function (n) {
    switch (Kt) {
      case 1:
      case 2:
      case 3:
        var u = 3;
        break;
      default:
        u = Kt;
    }
    var f = Kt;
    Kt = u;
    try {
      return n();
    } finally {
      Kt = f;
    }
  },
  ss = function () {
    sd = !0;
  },
  Py = function (n, u) {
    switch (n) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        n = 3;
    }
    var f = Kt;
    Kt = n;
    try {
      return u();
    } finally {
      Kt = f;
    }
  },
  bl = function (n, u, f) {
    var unstable_now = Wi.unstable_now();
    switch (
      (typeof f === "object" && f !== null
        ? ((f = f.delay), (f = typeof f === "number" && 0 < f ? unstable_now + f : unstable_now))
        : (f = unstable_now),
      n)
    ) {
      case 1:
        var p = -1;
        break;
      case 2:
        p = 250;
        break;
      case 5:
        p = 1073741823;
        break;
      case 4:
        p = 1e4;
        break;
      default:
        p = 5000;
    }
    return (
      (p = f + p),
      (n = { id: Dx++, callback: u, priorityLevel: n, startTime: f, expirationTime: p, sortIndex: -1 }),
      f > unstable_now
        ? ((n.sortIndex = f),
          id(Ki, n),
          oi(Ci) === null && n === oi(Ki) && (pl ? (Ty(yl), (yl = -1)) : (pl = !0), cd(ud, f - unstable_now)))
        : ((n.sortIndex = p), id(Ci, n), ml || ld || ((ml = !0), po || ((po = !0), mo()))),
      n
    );
  },
  us,
  By = function (n) {
    var u = Kt;
    return function () {
      var f = Kt;
      Kt = u;
      try {
        return n.apply(this, arguments);
      } finally {
        Kt = f;
      }
    };
  };
//@ chunk-bzr73sfg.js:6328-6890 esm-fingerprint
var ky = Xa(() => {
  if (typeof performance === "object" && typeof performance.now === "function")
    ((rd = performance),
      (Yn = function () {
        return rd.now();
      }));
  else
    ((es = Date),
      (od = es.now()),
      (Yn = function () {
        return es.now() - od;
      }));
  ((Ci = []),
    (Ki = []),
    (My = typeof setTimeout === "function" ? setTimeout : null),
    (Ty = typeof clearTimeout === "function" ? clearTimeout : null),
    (Ry = typeof setImmediate < "u" ? setImmediate : null));
  if (typeof Ry === "function")
    mo = function () {
      Ry(nd);
    };
  else if (typeof MessageChannel < "u")
    ((ns = new MessageChannel()),
      (ad = ns.port2),
      (ns.port1.onmessage = nd),
      (mo = function () {
        ad.postMessage(null);
      }));
  else
    mo = function () {
      My(nd, 0);
    };
  us = Ny;
});

export { Yn, rs, os, Dy, gl, _y, ls, as, Oy, Hy, Ly, ss, Py, bl, us, By, ky };

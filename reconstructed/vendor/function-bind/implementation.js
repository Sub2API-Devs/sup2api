/**
 * function-bind/implementation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: function-bind@1.1.2
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:9877-10856 cjs-fingerprint
var Lo = x(function (up, Fo) {
  var Za = "Function.prototype.bind called on incompatible ",
    toString = Object.prototype.toString,
    max = Math.max,
    ru = "[object Function]",
    Po = function (t, r) {
      var n = [];
      for (var o = 0; o < t.length; o += 1) n[o] = t[o];
      for (var s = 0; s < r.length; s += 1) n[s + t.length] = r[s];
      return n;
    },
    nu = function (t, r) {
      var n = [];
      for (var o = r || 0, s = 0; o < t.length; o += 1, s += 1) n[s] = t[o];
      return n;
    },
    ou = function (e, t) {
      var r = "";
      for (var n = 0; n < e.length; n += 1) if (((r += e[n]), n + 1 < e.length)) r += t;
      return r;
    };
  Fo.exports = function (t) {
    var r = this;
    if (typeof r !== "function" || toString.apply(r) !== ru) throw TypeError(Za + r);
    var n = nu(arguments, 1),
      o,
      s = function () {
        if (this instanceof o) {
          var c = r.apply(this, Po(n, arguments));
          if (Object(c) === c) return c;
          return this;
        }
        return r.apply(t, Po(n, arguments));
      },
      i = max(0, r.length - n.length),
      a = [];
    for (var l = 0; l < i; l++) a[l] = "$" + l;
    if (
      ((o = Function(
        "binder",
        "return function (" + ou(a, ",") + "){ return binder.apply(this,arguments); }",
      )(s)),
      r.prototype)
    ) {
      var f = function () {};
      ((f.prototype = r.prototype), (o.prototype = new f()), (f.prototype = null));
    }
    return o;
  };
});

export { Lo };

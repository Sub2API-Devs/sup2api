/**
 * extend/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: extend@3.0.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-na3pph4p.js:273-1502 cjs-fingerprint
var Sr = x(function (xd, Fs) {
  var hasOwnProperty = Object.prototype.hasOwnProperty,
    toString = Object.prototype.toString,
    { defineProperty: defineProperty, getOwnPropertyDescriptor: getOwnPropertyDescriptor } = Object,
    Is = function (t) {
      if (typeof Array.isArray === "function") return Array.isArray(t);
      return toString.call(t) === "[object Array]";
    },
    Us = function (t) {
      if (!t || toString.call(t) !== "[object Object]") return !1;
      var r = hasOwnProperty.call(t, "constructor"),
        s =
          t.constructor &&
          t.constructor.prototype &&
          hasOwnProperty.call(t.constructor.prototype, "isPrototypeOf");
      if (t.constructor && !r && !s) return !1;
      var n;
      for (n in t);
      return typeof n > "u" || hasOwnProperty.call(t, n);
    },
    js = function (t, r) {
      if (defineProperty && r.name === "__proto__")
        defineProperty(t, r.name, { enumerable: !0, configurable: !0, value: r.newValue, writable: !0 });
      else t[r.name] = r.newValue;
    },
    Ds = function (t, r) {
      if (r === "__proto__") {
        if (!hasOwnProperty.call(t, r)) return;
        else if (getOwnPropertyDescriptor) return getOwnPropertyDescriptor(t, r).value;
      }
      return t[r];
    };
  Fs.exports = function e() {
    var t,
      r,
      s,
      n,
      a,
      h,
      g = arguments[0],
      E = 1,
      k = arguments.length,
      T = !1;
    if (typeof g === "boolean") ((T = g), (g = arguments[1] || {}), (E = 2));
    if (g == null || (typeof g !== "object" && typeof g !== "function")) g = {};
    for (; E < k; ++E)
      if (((t = arguments[E]), t != null)) {
        for (r in t)
          if (((s = Ds(g, r)), (n = Ds(t, r)), g !== n)) {
            if (T && n && (Us(n) || (a = Is(n)))) {
              if (a) ((a = !1), (h = s && Is(s) ? s : []));
              else h = s && Us(s) ? s : {};
              js(g, { name: r, newValue: e(T, h, n) });
            } else if (typeof n < "u") js(g, { name: r, newValue: n });
          }
      }
    return g;
  };
});

export { Sr };

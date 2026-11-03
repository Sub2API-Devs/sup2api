/**
 * has-symbols/shams.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: has-symbols@1.1.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:8571-9455 cjs-fingerprint
var rr = x(function (op, So) {
  So.exports = function () {
    if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") return !1;
    if (typeof Symbol.iterator === "symbol") return !0;
    var t = {},
      r = Symbol("test"),
      n = Object(r);
    if (typeof r === "string") return !1;
    if (Object.prototype.toString.call(r) !== "[object Symbol]") return !1;
    if (Object.prototype.toString.call(n) !== "[object Symbol]") return !1;
    var o = 42;
    t[r] = o;
    for (var key in t) return !1;
    if (typeof Object.keys === "function" && Object.keys(t).length !== 0) return !1;
    if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(t).length !== 0)
      return !1;
    var ownPropertySymbols = Object.getOwnPropertySymbols(t);
    if (ownPropertySymbols.length !== 1 || ownPropertySymbols[0] !== r) return !1;
    if (!Object.prototype.propertyIsEnumerable.call(t, r)) return !1;
    if (typeof Object.getOwnPropertyDescriptor === "function") {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, r);
      if (ownPropertyDescriptor.value !== o || ownPropertyDescriptor.enumerable !== !0) return !1;
    }
    return !0;
  };
});

export { rr };

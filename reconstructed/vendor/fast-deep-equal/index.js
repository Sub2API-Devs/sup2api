/**
 * fast-deep-equal/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-deep-equal@3.1.3
 * pieces: chunk-dxsqk077.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-dxsqk077.js:226-953 cjs-fingerprint
var SZo = x(function (p, s) {
  s.exports = function o(r, e) {
    if (r === e) return !0;
    if (r && e && typeof r == "object" && typeof e == "object") {
      if (r.constructor !== e.constructor) return !1;
      var u, t, f;
      if (Array.isArray(r)) {
        if (((u = r.length), u != e.length)) return !1;
        for (t = u; t-- !== 0;) if (!o(r[t], e[t])) return !1;
        return !0;
      }
      if (r.constructor === RegExp) return r.source === e.source && r.flags === e.flags;
      if (r.valueOf !== Object.prototype.valueOf) return r.valueOf() === e.valueOf();
      if (r.toString !== Object.prototype.toString) return r.toString() === e.toString();
      if (((f = Object.keys(r)), (u = f.length), u !== Object.keys(e).length)) return !1;
      for (t = u; t-- !== 0;) if (!Object.prototype.hasOwnProperty.call(e, f[t])) return !1;
      for (t = u; t-- !== 0;) {
        var n = f[t];
        if (!o(r[n], e[n])) return !1;
      }
      return !0;
    }
    return r !== r && e !== e;
  };
});

export { SZo };

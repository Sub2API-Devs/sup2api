/**
 * lodash.isinteger/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.isinteger@4.0.4
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:13495-14678 cjs-fingerprint
var hf = x(function (dL, uf) {
  var cf = 1 / 0,
    CT = 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
    lf = NaN,
    AT = "[object Symbol]",
    IT = /^\s+|\s+$/g,
    _T = /^[-+]0x[0-9a-f]+$/i,
    ST = /^0b[01]+$/i,
    RT = /^0o[0-7]+$/i,
    wT = parseInt,
    vT = Object.prototype,
    toString = vT.toString;
  function bT(e) {
    return typeof e == "number" && e == xT(e);
  }
  function df(e) {
    var t = typeof e;
    return !!e && (t == "object" || t == "function");
  }
  function PT(e) {
    return !!e && typeof e == "object";
  }
  function OT(e) {
    return typeof e == "symbol" || (PT(e) && toString.call(e) == AT);
  }
  function NT(e) {
    if (!e) return e === 0 ? e : 0;
    if (((e = MT(e)), e === cf || e === -cf)) {
      var t = e < 0 ? -1 : 1;
      return t * CT;
    }
    return e === e ? e : 0;
  }
  function xT(e) {
    var t = NT(e),
      r = t % 1;
    return t === t ? (r ? t - r : t) : 0;
  }
  function MT(e) {
    if (typeof e == "number") return e;
    if (OT(e)) return lf;
    if (df(e)) {
      var t = typeof e.valueOf == "function" ? e.valueOf() : e;
      e = df(t) ? t + "" : t;
    }
    if (typeof e != "string") return e === 0 ? e : +e;
    e = e.replace(IT, "");
    var matches = ST.test(e);
    return matches || RT.test(e) ? wT(e.slice(2), matches ? 2 : 8) : _T.test(e) ? lf : +e;
  }
  uf.exports = bT;
});

export { hf };

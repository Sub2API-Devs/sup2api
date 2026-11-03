/**
 * lodash.once/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.once@4.1.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:15734-17076 cjs-fingerprint
var Rf = x(function (mL, Sf) {
  var rE = "Expected a function",
    Af = 1 / 0,
    nE = 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
    If = NaN,
    oE = "[object Symbol]",
    iE = /^\s+|\s+$/g,
    sE = /^[-+]0x[0-9a-f]+$/i,
    aE = /^0b[01]+$/i,
    cE = /^0o[0-7]+$/i,
    lE = parseInt,
    dE = Object.prototype,
    toString = dE.toString;
  function hE(e, t) {
    var r;
    if (typeof t != "function") throw TypeError(rE);
    return (
      (e = yE(e)),
      function () {
        if (--e > 0) r = t.apply(this, arguments);
        if (e <= 1) t = void 0;
        return r;
      }
    );
  }
  function fE(e) {
    return hE(2, e);
  }
  function _f(e) {
    var t = typeof e;
    return !!e && (t == "object" || t == "function");
  }
  function mE(e) {
    return !!e && typeof e == "object";
  }
  function pE(e) {
    return typeof e == "symbol" || (mE(e) && toString.call(e) == oE);
  }
  function gE(e) {
    if (!e) return e === 0 ? e : 0;
    if (((e = TE(e)), e === Af || e === -Af)) {
      var t = e < 0 ? -1 : 1;
      return t * nE;
    }
    return e === e ? e : 0;
  }
  function yE(e) {
    var t = gE(e),
      r = t % 1;
    return t === t ? (r ? t - r : t) : 0;
  }
  function TE(e) {
    if (typeof e == "number") return e;
    if (pE(e)) return If;
    if (_f(e)) {
      var t = typeof e.valueOf == "function" ? e.valueOf() : e;
      e = _f(t) ? t + "" : t;
    }
    if (typeof e != "string") return e === 0 ? e : +e;
    e = e.replace(iE, "");
    var matches = aE.test(e);
    return matches || cE.test(e) ? lE(e.slice(2), matches ? 2 : 8) : sE.test(e) ? If : +e;
  }
  Sf.exports = fE;
});

export { Rf };

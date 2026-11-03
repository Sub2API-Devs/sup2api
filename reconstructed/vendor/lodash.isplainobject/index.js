/**
 * lodash.isplainobject/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.isplainobject@4.0.6
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:14888-15499 cjs-fingerprint
var Tf = x(function (hL, yf) {
  var $T = "[object Object]";
  function BT(e) {
    var t = !1;
    if (e != null && typeof e.toString != "function")
      try {
        t = !!(e + "");
      } catch (error) {}
    return t;
  }
  function zT(e, t) {
    return function (r) {
      return e(t(r));
    };
  }
  var GT = Function.prototype,
    pf = Object.prototype,
    toString = GT.toString,
    hasOwnProperty = pf.hasOwnProperty,
    KT = toString.call(Object),
    toString_2 = pf.toString,
    jT = zT(Object.getPrototypeOf, Object);
  function YT(e) {
    return !!e && typeof e == "object";
  }
  function WT(e) {
    if (!YT(e) || toString_2.call(e) != $T || BT(e)) return !1;
    var t = jT(e);
    if (t === null) return !0;
    var r = hasOwnProperty.call(t, "constructor") && t.constructor;
    return typeof r == "function" && r instanceof r && toString.call(r) == KT;
  }
  yf.exports = WT;
});

export { Tf };

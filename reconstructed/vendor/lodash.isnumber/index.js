/**
 * lodash.isnumber/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.isnumber@3.0.3
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:14678-14888 cjs-fingerprint
var mf = x(function (uL, ff) {
  var DT = "[object Number]",
    UT = Object.prototype,
    toString = UT.toString;
  function HT(e) {
    return !!e && typeof e == "object";
  }
  function FT(e) {
    return typeof e == "number" || (HT(e) && toString.call(e) == DT);
  }
  ff.exports = FT;
});

export { mf };

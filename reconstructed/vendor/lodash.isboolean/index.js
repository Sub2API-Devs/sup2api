/**
 * lodash.isboolean/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.isboolean@3.0.3
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:13288-13495 cjs-fingerprint
var af = x(function (lL, sf) {
  var pT = "[object Boolean]",
    gT = Object.prototype,
    toString = gT.toString;
  function TT(e) {
    return e === !0 || e === !1 || (ET(e) && toString.call(e) == pT);
  }
  function ET(e) {
    return !!e && typeof e == "object";
  }
  sf.exports = TT;
});

export { af };

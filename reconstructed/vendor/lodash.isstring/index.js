/**
 * lodash.isstring/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.isstring@4.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:15499-15734 cjs-fingerprint
var Cf = x(function (fL, Ef) {
  var QT = "[object String]",
    JT = Object.prototype,
    toString = JT.toString,
    isArray = Array.isArray;
  function eE(e) {
    return !!e && typeof e == "object";
  }
  function tE(e) {
    return typeof e == "string" || (!isArray(e) && eE(e) && toString.call(e) == QT);
  }
  Ef.exports = tE;
});

export { Cf };

/**
 * lodash-es/toInteger.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-bwbq4xvm.js (5)
 * attribution: placement 5
 */
import { toNumberExport } from "./toNumber.js";

//@ chunk-bwbq4xvm.js:150523-150847 placement
var INFINITY = 1 / 0;
var FR = 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000;
//@ chunk-bwbq4xvm.js:150847-150958 placement
function toFinite(e) {
  if (!e) return e === 0 ? e : 0;
  e = toNumberExport(e);
  if (e === INFINITY || e === -INFINITY) {
    var s = e < 0 ? -1 : 1;
    return s * FR;
  }
  return e === e ? e : 0;
}
//@ chunk-bwbq4xvm.js:150958-150968 placement
var toFiniteExport = toFinite;
//@ chunk-bwbq4xvm.js:150968-151024 placement
function toInteger(e) {
  var finiteExport = toFiniteExport(e);
  var remainder = finiteExport % 1;
  return finiteExport === finiteExport ? (remainder ? finiteExport - remainder : finiteExport) : 0;
}
//@ chunk-bwbq4xvm.js:151024-151035 placement
var toInteger_default = toInteger;
export { toInteger_default };

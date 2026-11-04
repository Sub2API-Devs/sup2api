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
var MAX_INTEGER = 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000;
//@ chunk-bwbq4xvm.js:150847-150958 placement
function toFinite(value) {
  if (!value) return value === 0 ? value : 0;
  value = toNumberExport(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = value < 0 ? -1 : 1;
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}
//@ chunk-bwbq4xvm.js:150958-150968 placement
var toFiniteExport = toFinite;
//@ chunk-bwbq4xvm.js:150968-151024 placement
function toInteger(value) {
  var finiteExport = toFiniteExport(value);
  var remainder = finiteExport % 1;
  return finiteExport === finiteExport ? (remainder ? finiteExport - remainder : finiteExport) : 0;
}
//@ chunk-bwbq4xvm.js:151024-151035 placement
var toInteger_default = toInteger;
export { toInteger_default };

/**
 * lodash-es/toString.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-byv2e1t5.js (11)
 * attribution: placement 11
 */
import { isSymbol } from "../../src/utils/bash/shellQuote.js";
import { symbolExport } from "./_root.js";

//@ chunk-byv2e1t5.js:231-280 placement
function value(value) {
  return value != null && typeof value == "object";
}
//@ chunk-byv2e1t5.js:280-289 placement
var import_isObjectLike = value;
//@ chunk-byv2e1t5.js:289-314 placement
var isArray = Array.isArray;
var isArrayAlias = isArray;
//@ chunk-byv2e1t5.js:396-406 placement
var isSymbolAlias = isSymbol;
//@ chunk-byv2e1t5.js:406-501 placement
function arrayMap(array, iteratee) {
  var index = -1;
  var length = array == null ? 0 : array.length;
  var result = Array(length);
  while (++index < length) result[index] = iteratee(array[index], index, array);
  return result;
}
//@ chunk-byv2e1t5.js:501-511 placement
var import_arrayMap = arrayMap;
//@ chunk-byv2e1t5.js:511-568 placement
var INFINITY = 1 / 0;
var symbolProto = symbolExport ? symbolExport.prototype : undefined;
var toString = symbolProto ? symbolProto.toString : undefined;
//@ chunk-byv2e1t5.js:568-714 placement
function baseToString(value) {
  if (typeof value == "string") return value;
  if (isArrayAlias(value)) return import_arrayMap(value, baseToString) + "";
  if (isSymbolAlias(value)) return toString ? toString.call(value) : "";
  var result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
//@ chunk-byv2e1t5.js:714-722 placement
var import_baseToString = baseToString;
//@ chunk-byv2e1t5.js:722-759 placement
function toStringInline(value) {
  return value == null ? "" : import_baseToString(value);
}
//@ chunk-byv2e1t5.js:759-769 placement
var toStringExport = toStringInline;
export { import_arrayMap, toStringExport, isArrayAlias, import_isObjectLike, isSymbolAlias };

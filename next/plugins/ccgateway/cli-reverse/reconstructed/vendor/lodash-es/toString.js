/**
 * lodash-es/toString.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-pjaz7mpk.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSymbol } from "../../src/utils/bash/shellQuote.js";
import { symbolExport } from "./_root.js";

//@ chunk-pjaz7mpk.js:231-280 placement
function value(value) {
  return value != null && typeof value == "object";
}
//@ chunk-pjaz7mpk.js:280-289 placement
var import_isObjectLike = value;
//@ chunk-pjaz7mpk.js:289-314 placement
var isArray = Array.isArray;
var isArrayAlias = isArray;
//@ chunk-pjaz7mpk.js:396-405 placement
var isSymbolAlias = isSymbol;
//@ chunk-pjaz7mpk.js:405-500 placement
function arrayMap(array, iteratee) {
  var index = -1;
  var length = array == null ? 0 : array.length;
  var result = Array(length);
  while (++index < length) result[index] = iteratee(array[index], index, array);
  return result;
}
//@ chunk-pjaz7mpk.js:500-510 placement
var import_arrayMap = arrayMap;
//@ chunk-pjaz7mpk.js:510-567 placement
var INFINITY = 1 / 0;
var symbolProto = symbolExport ? symbolExport.prototype : undefined;
var toString = symbolProto ? symbolProto.toString : undefined;
//@ chunk-pjaz7mpk.js:567-712 placement
function baseToString(value) {
  if (typeof value == "string") return value;
  if (isArrayAlias(value)) return import_arrayMap(value, baseToString) + "";
  if (isSymbolAlias(value)) return toString ? toString.call(value) : "";
  var result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
//@ chunk-pjaz7mpk.js:712-720 placement
var import_baseToString = baseToString;
//@ chunk-pjaz7mpk.js:720-757 placement
function toStringInline(value) {
  return value == null ? "" : import_baseToString(value);
}
//@ chunk-pjaz7mpk.js:757-767 placement
var toStringExport = toStringInline;
export { isSymbolAlias, import_arrayMap, isArrayAlias, import_isObjectLike, toStringExport };

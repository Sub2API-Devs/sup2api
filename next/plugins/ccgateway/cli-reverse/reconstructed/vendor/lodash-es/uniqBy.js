/**
 * lodash-es/uniqBy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-ktpw8eqa.js (20)
 * attribution: placement 20
 */
import {
  SetCtorAlias,
  setToArrayAlias,
  setCacheHasAlias,
  initSetCacheAlias,
  baseIterateeAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-ktpw8eqa.js:243-342 placement
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length;
  var index = fromIndex + (fromRight ? 1 : -1);
  while (fromRight ? index-- : ++index < length) if (predicate(array[index], index, array)) return index;
  return -1;
}
//@ chunk-ktpw8eqa.js:342-350 placement
var import_baseFindIndex = baseFindIndex;
//@ chunk-ktpw8eqa.js:350-377 placement
function baseIsNaN(value) {
  return value !== value;
}
//@ chunk-ktpw8eqa.js:377-385 placement
var import_baseIsNaN = baseIsNaN;
//@ chunk-ktpw8eqa.js:385-466 placement
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1;
  var length = array.length;
  while (++index < length) if (array[index] === value) return index;
  return -1;
}
//@ chunk-ktpw8eqa.js:466-474 placement
var import_strictIndexOf = strictIndexOf;
//@ chunk-ktpw8eqa.js:474-523 placement
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? import_strictIndexOf(array, value, fromIndex)
    : import_baseFindIndex(array, import_baseIsNaN, fromIndex);
}
//@ chunk-ktpw8eqa.js:523-531 placement
var import_baseIndexOf = baseIndexOf;
//@ chunk-ktpw8eqa.js:531-595 placement
function arrayIncludes(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && import_baseIndexOf(array, value, 0) > -1;
}
//@ chunk-ktpw8eqa.js:595-603 placement
var import_arrayIncludes = arrayIncludes;
//@ chunk-ktpw8eqa.js:603-694 placement
function arrayIncludesWith(array, value, comparator) {
  var index = -1;
  var length = array == null ? 0 : array.length;
  while (++index < length) if (comparator(value, array[index])) return true;
  return false;
}
//@ chunk-ktpw8eqa.js:694-702 placement
var import_arrayIncludesWith = arrayIncludesWith;
//@ chunk-ktpw8eqa.js:702-716 placement
function noop() {}
//@ chunk-ktpw8eqa.js:716-726 placement
var import_noop = noop;
//@ chunk-ktpw8eqa.js:726-813 placement
var INFINITY = 1 / 0;
var createSet = !(SetCtorAlias && 1 / setToArrayAlias(new SetCtorAlias([, -0]))[1] == INFINITY)
  ? import_noop
  : function (values) {
      return new SetCtorAlias(values);
    };
var createSetAlias = createSet;
//@ chunk-ktpw8eqa.js:813-823 placement
var LARGE_ARRAY_SIZE = 200;
//@ chunk-ktpw8eqa.js:823-1175 placement
function baseUniq(array, iteratee, comparator) {
  var index = -1;
  var includes = import_arrayIncludes;
  var length = array.length;
  var isCommon = true;
  var result = [];
  var seen = result;
  if (comparator) {
    isCommon = false;
    includes = import_arrayIncludesWith;
  } else if (length >= LARGE_ARRAY_SIZE) {
    var set = iteratee ? null : createSetAlias(array);
    if (set) return setToArrayAlias(set);
    isCommon = false;
    includes = setCacheHasAlias;
    seen = new initSetCacheAlias();
  } else seen = iteratee ? [] : result;
  e: while (++index < length) {
    var value = array[index];
    var computed = iteratee ? iteratee(value) : value;
    value = comparator || value !== 0 ? value : 0;
    if (isCommon && computed === computed) {
      var seenIndex = seen.length;
      while (seenIndex--) if (seen[seenIndex] === computed) continue e;
      if (iteratee) seen.push(computed);
      result.push(value);
    } else if (!includes(seen, computed, comparator)) {
      if (seen !== result) seen.push(computed);
      result.push(value);
    }
  }
  return result;
}
//@ chunk-ktpw8eqa.js:1175-1185 placement
var import_baseUniq = baseUniq;
//@ chunk-ktpw8eqa.js:1185-1238 placement
function uniqBy(array, iteratee) {
  return array && array.length ? import_baseUniq(array, baseIterateeAlias(iteratee, 2)) : [];
}
//@ chunk-ktpw8eqa.js:1238-1247 placement
var uniqByExport = uniqBy;
export { uniqByExport, import_noop, import_baseUniq };

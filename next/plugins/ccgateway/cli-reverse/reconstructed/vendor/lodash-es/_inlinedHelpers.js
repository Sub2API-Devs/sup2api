/**
 * lodash-es/_inlinedHelpers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-1p0bwqzj.js (7), chunk-6sf70a86.js (10), chunk-z20c443b.js (30)
 * attribution: placement 47
 */
import {
  keysAlias,
  baseIterateeAlias,
  cloneBuffer_default,
  baseIsEqualAlias,
  isArrayLikeAlias,
  hasPathInAlias,
  toKeyAlias_2,
  identityAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { assignValueRaw, getPrototype, pickByBase } from "../../src/utils/git/gitSafeEnv.js";
import { __export } from "../../runtime/bun-runtime.js";
import { import_isObjectLike, isArrayAlias, isSymbolAlias } from "./toString.js";
import { baseGetTagExport } from "./_baseGetTag.js";
import { reject } from "./reject.js";
import { getTag } from "../fuse.js/dist/fuse.mjs";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1p0bwqzj.js:268-408 placement
function createBaseEach(eachFunc) {
  return function (collection, iteratee, iterable) {
    var index = -1;
    var arrValue = Object(collection);
    var props = iterable(collection);
    var length = props.length;
    while (length--) {
      var key = props[eachFunc ? length : ++index];
      if (iteratee(arrValue[key], key, arrValue) === false) break;
    }
    return collection;
  };
}
//@ chunk-1p0bwqzj.js:408-416 placement
var import_createBaseEach = createBaseEach;
//@ chunk-1p0bwqzj.js:416-432 placement
var baseEach; // deferred: uses import_createBaseEach of its import cycle while loading; runs once the cycle is complete
var baseEachAlias;
deferInit("chunk-1p0bwqzj.js:416", () => {
  baseEach = import_createBaseEach();
  baseEachAlias = baseEach;
});
//@ chunk-1p0bwqzj.js:432-471 placement
function baseForOwn(object, iteratee) {
  return object && baseEachAlias(object, iteratee, keysAlias);
}
//@ chunk-1p0bwqzj.js:471-481 placement
var import_baseForOwn = baseForOwn;
//@ chunk-1p0bwqzj.js:481-567 placement
function mapValues(object, iteratee) {
  var result = {};
  iteratee = baseIterateeAlias(iteratee, 3);
  import_baseForOwn(object, function (value, key, object2) {
    assignValueRaw(result, key, iteratee(value, key, object2));
  });
  return result;
}
//@ chunk-1p0bwqzj.js:567-576 placement
var import_mapValues = mapValues;
//@ chunk-z20c443b.js:3029-3039 placement
var cloneBufferModule = {};
//@ chunk-z20c443b.js:3039-3063 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:3039", () => {
  __export(cloneBufferModule, {
    default: () => cloneBuffer_default,
  });
});
//@ chunk-z20c443b.js:3063-3096 placement
function sortedIndex_2(array, value) {
  return baseIsEqualAlias(array, value);
}
//@ chunk-z20c443b.js:3096-3106 placement
var import_sortedIndex_2 = sortedIndex_2;
//@ chunk-z20c443b.js:3106-3228 placement
var objectTag; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var funcProto;
var objectProto;
var toString;
var hasOwnProperty_3;
var funcToString;
deferInit("chunk-z20c443b.js:3106", () => {
  objectTag = "[object Object]";
  funcProto = Function.prototype;
  objectProto = Object.prototype;
  toString = funcProto.toString;
  hasOwnProperty_3 = objectProto.hasOwnProperty;
  funcToString = toString.call(Object);
});
//@ chunk-z20c443b.js:3228-3414 placement
function isPlainObjectInline(value) {
  if (!import_isObjectLike(value) || baseGetTagExport(value) != objectTag) return false;
  var proto = getPrototype(value);
  if (proto === null) return true;
  var ctor = hasOwnProperty_3.call(proto, "constructor") && proto.constructor;
  return typeof ctor == "function" && ctor instanceof ctor && toString.call(ctor) == funcToString;
}
//@ chunk-z20c443b.js:3414-3425 placement
var import_isPlainObject = isPlainObjectInline;
//@ chunk-z20c443b.js:10264-10274 placement
var import_reject = reject;
//@ chunk-z20c443b.js:10274-10372 placement
function arrayAggregator(collection, setter, iteratee, accumulator) {
  var index = -1;
  var length = collection == null ? 0 : collection.length;
  while (++index < length) {
    var value = collection[index];
    setter(accumulator, value, iteratee(value), collection);
  }
  return accumulator;
}
//@ chunk-z20c443b.js:10372-10382 placement
var import_arrayAggregator = arrayAggregator;
//@ chunk-z20c443b.js:10382-10555 placement
function createBaseEachInline2(eachFunc, fromRight) {
  return function (collection, iteratee) {
    if (collection == null) return collection;
    if (!isArrayLikeAlias(collection)) return eachFunc(collection, iteratee);
    var length = collection.length;
    var index = fromRight ? length : -1;
    var arrValue = Object(collection);
    while (fromRight ? index-- : ++index < length)
      if (iteratee(arrValue[index], index, arrValue) === false) break;
    return collection;
  };
}
//@ chunk-z20c443b.js:10555-10565 placement
var import_createBaseEachInline2 = createBaseEachInline2;
//@ chunk-z20c443b.js:10565-10587 placement
var baseEachInline2; // deferred: uses import_createBaseEachInline2 of its import cycle while loading; runs once the cycle is complete
var baseEachInline2Alias;
deferInit("chunk-z20c443b.js:10565", () => {
  baseEachInline2 = import_createBaseEachInline2(import_baseForOwn);
  baseEachInline2Alias = baseEachInline2;
});
//@ chunk-z20c443b.js:10587-10655 placement
function baseAggregator(collection, setter, iteratee, accumulator) {
  baseEachInline2Alias(collection, function (value, key, object) {
    setter(accumulator, value, iteratee(value), object);
  });
  return accumulator;
}
//@ chunk-z20c443b.js:10655-10665 placement
var import_baseAggregator = baseAggregator;
//@ chunk-z20c443b.js:10665-10757 placement
function createAggregator(setter, initializer) {
  return function (collection, iteratee) {
    var func = isArrayAlias(collection) ? import_arrayAggregator : import_baseAggregator;
    var accumulator = initializer ? initializer() : {};
    return func(collection, setter, baseIterateeAlias(iteratee, 2), accumulator);
  };
}
//@ chunk-z20c443b.js:10757-10768 placement
var import_createAggregator = createAggregator;
//@ chunk-z20c443b.js:10768-10846 placement
var partition; // deferred: uses import_createAggregator of its import cycle while loading; runs once the cycle is complete
var partitionAlias;
deferInit("chunk-z20c443b.js:10768", () => {
  partition = import_createAggregator(
    function (result, value, key) {
      result[key ? 0 : 1].push(value);
    },
    function () {
      return [[], []];
    },
  );
  partitionAlias = partition;
});
//@ chunk-z20c443b.js:10846-10910 placement
function pickByPredicate(object, predicate) {
  return pickByBase(object, predicate, function (value, key) {
    return hasPathInAlias(object, key);
  });
}
//@ chunk-z20c443b.js:10910-10920 placement
var import_pickByPredicate = pickByPredicate;
//@ chunk-z20c443b.js:10920-10978 placement
var pick; // deferred: uses toKeyAlias_2 (../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs) of its import cycle while loading; runs once the cycle is complete
var pickAlias;
deferInit("chunk-z20c443b.js:10920", () => {
  pick = toKeyAlias_2(function (object, paths) {
    return object == null ? {} : import_pickByPredicate(object, paths);
  });
  pickAlias = pick;
});
//@ chunk-z20c443b.js:26810-26888 placement
function isArrayInline(value) {
  return !Array.isArray ? getTag(value) === "[object Array]" : Array.isArray(value);
}
//@ chunk-z20c443b.js:26888-26899 placement
var INFINITY = 1 / 0;
//@ chunk-z20c443b.js:26899-26987 placement
function baseToString(value) {
  if (typeof value == "string") return value;
  let result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
//@ chunk-z20c443b.js:26987-27026 placement
function toStringInline(value) {
  return value == null ? "" : baseToString(value);
}
//@ chunk-z20c443b.js:27026-27068 placement
function isString(value) {
  return typeof value === "string";
}
//@ chunk-z20c443b.js:27068-27110 placement
function isNumber(value) {
  return typeof value === "number";
}
//@ chunk-z20c443b.js:27110-27181 placement
function isBoolean(value) {
  return value === true || value === false || (isObjectLike(value) && getTag(value) == "[object Boolean]");
}
//@ chunk-z20c443b.js:27181-27223 placement
function isObject(value) {
  return typeof value === "object";
}
//@ chunk-z20c443b.js:27223-27261 placement
function isObjectLike(value) {
  return isObject(value) && value !== null;
}
//@ chunk-6sf70a86.js:1147-1196 placement
var MAX_ARRAY_LENGTH_PRIMARY = 4294967295;
var MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH_PRIMARY - 1;
var { floor, min } = Math;
//@ chunk-6sf70a86.js:1196-1560 placement
function baseSortedIndexBy(array, value, iteratee, retHighest) {
  var low = 0;
  var high = array == null ? 0 : array.length;
  if (high === 0) return 0;
  value = iteratee(value);
  var valIsNaN = value !== value;
  var valIsNull = value === null;
  var valIsSymbol = isSymbolAlias(value);
  var valIsUndefined = value === undefined;
  while (low < high) {
    var mid = floor((low + high) / 2);
    var computed = iteratee(array[mid]);
    var othIsDefined = computed !== undefined;
    var othIsNull = computed === null;
    var othIsReflexive = computed === computed;
    var othIsSymbol = isSymbolAlias(computed);
    if (valIsNaN) var setLow = retHighest || othIsReflexive;
    else if (valIsUndefined) setLow = othIsReflexive && (retHighest || othIsDefined);
    else if (valIsNull) setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
    else if (valIsSymbol)
      setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
    else if (othIsNull || othIsSymbol) setLow = false;
    else setLow = retHighest ? computed <= value : computed < value;
    if (setLow) low = mid + 1;
    else high = mid;
  }
  return min(high, MAX_ARRAY_INDEX);
}
//@ chunk-6sf70a86.js:1560-1570 placement
var import_baseSortedIndexBy = baseSortedIndexBy;
//@ chunk-6sf70a86.js:1570-1598 placement
var MAX_ARRAY_LENGTH = 4294967295;
var HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
//@ chunk-6sf70a86.js:1598-1794 placement
function baseSortedIndex(array, value, retHighest) {
  var low = 0;
  var high = array == null ? low : array.length;
  if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
    while (low < high) {
      var mid = (low + high) >>> 1;
      var computed = array[mid];
      if (
        computed !== null &&
        !isSymbolAlias(computed) &&
        (retHighest ? computed <= value : computed < value)
      )
        low = mid + 1;
      else high = mid;
    }
    return high;
  }
  return import_baseSortedIndexBy(array, value, identityAlias, retHighest);
}
//@ chunk-6sf70a86.js:1794-1804 placement
var import_baseSortedIndexBy_2 = baseSortedIndex;
//@ chunk-6sf70a86.js:1804-1836 placement
function sortedIndex(array, value) {
  return import_baseSortedIndexBy_2(array, value);
}
//@ chunk-6sf70a86.js:1836-1846 placement
var import_sortedIndex = sortedIndex;
//@ chunk-6sf70a86.js:1846-1881 placement
function sortedLastIndex(array, value) {
  return import_baseSortedIndexBy_2(array, value, true);
}
//@ chunk-6sf70a86.js:1881-1891 placement
var import_sortedLastIndex = sortedLastIndex;
export {
  import_sortedIndex_2,
  import_reject,
  import_mapValues,
  partitionAlias,
  baseEachInline2Alias,
  pickAlias,
  import_isPlainObject,
  import_createAggregator,
  import_sortedLastIndex,
  import_sortedIndex,
  cloneBufferModule,
  import_baseForOwn,
  isString,
  isArrayInline,
  isNumber,
  isBoolean,
  toStringInline,
  isObject,
  baseEachAlias,
};

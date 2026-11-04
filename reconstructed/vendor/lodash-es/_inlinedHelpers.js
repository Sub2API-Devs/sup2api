/**
 * lodash-es/_inlinedHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-bfnfj4kx.js (10), chunk-dcmhvw5a.js (37)
 * attribution: placement 47
 */
import { __export } from "../../runtime/bun-runtime.js";
import {
  cloneBuffer_default,
  baseIsEqualAlias,
  keysAlias,
  baseIterateeAlias,
  isArrayLikeAlias,
  hasPathInAlias,
  toKeyAlias,
  identityAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { import_isObjectLike, isArrayAlias, isSymbolAlias } from "./toString.js";
import { baseGetTagExport } from "./_baseGetTag.js";
import { getPrototype, assignValueRaw, pickByBase } from "../../src/utils/git/gitSafeEnv.js";
import { reject } from "./reject.js";
import { getTag } from "../fuse.js/dist/fuse.mjs";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:2838-2848 placement
var cloneBufferModule = {};
//@ chunk-dcmhvw5a.js:2848-2872 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:2848", () => {
  __export(cloneBufferModule, {
    default: () => cloneBuffer_default,
  });
});
//@ chunk-dcmhvw5a.js:2872-2905 placement
function sortedIndex_2(array, value) {
  return baseIsEqualAlias(array, value);
}
//@ chunk-dcmhvw5a.js:2905-2915 placement
var import_sortedIndex_2 = sortedIndex_2;
//@ chunk-dcmhvw5a.js:2915-3037 placement
var objectTag; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var funcProto;
var objectProto;
var toString;
var hasOwnProperty_3;
var funcToString;
deferInit("chunk-dcmhvw5a.js:2915", () => {
  objectTag = "[object Object]";
  funcProto = Function.prototype;
  objectProto = Object.prototype;
  toString = funcProto.toString;
  hasOwnProperty_3 = objectProto.hasOwnProperty;
  funcToString = toString.call(Object);
});
//@ chunk-dcmhvw5a.js:3037-3223 placement
function isPlainObjectInline(value) {
  if (!import_isObjectLike(value) || baseGetTagExport(value) != objectTag) return false;
  var proto = getPrototype(value);
  if (proto === null) return true;
  var ctor = hasOwnProperty_3.call(proto, "constructor") && proto.constructor;
  return typeof ctor == "function" && ctor instanceof ctor && toString.call(ctor) == funcToString;
}
//@ chunk-dcmhvw5a.js:3223-3234 placement
var import_isPlainObject = isPlainObjectInline;
//@ chunk-dcmhvw5a.js:3234-3375 placement
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
//@ chunk-dcmhvw5a.js:3375-3385 placement
var import_createBaseEach = createBaseEach;
//@ chunk-dcmhvw5a.js:3385-3403 placement
var baseEach; // deferred: uses import_createBaseEach of its import cycle while loading; runs once the cycle is complete
var baseEachAlias;
deferInit("chunk-dcmhvw5a.js:3385", () => {
  baseEach = import_createBaseEach();
  baseEachAlias = baseEach;
});
//@ chunk-dcmhvw5a.js:3403-3442 placement
function baseForOwn(object, iteratee) {
  return object && baseEachAlias(object, iteratee, keysAlias);
}
//@ chunk-dcmhvw5a.js:3442-3453 placement
var import_baseForOwn = baseForOwn;
//@ chunk-dcmhvw5a.js:3453-3540 placement
function mapValues(object, iteratee) {
  var result = {};
  iteratee = baseIterateeAlias(iteratee, 3);
  import_baseForOwn(object, function (value, key, object2) {
    assignValueRaw(result, key, iteratee(value, key, object2));
  });
  return result;
}
//@ chunk-dcmhvw5a.js:3540-3550 placement
var import_mapValues = mapValues;
//@ chunk-dcmhvw5a.js:10387-10397 placement
var import_reject = reject;
//@ chunk-dcmhvw5a.js:10397-10495 placement
function arrayAggregator(collection, setter, iteratee, accumulator) {
  var index = -1;
  var length = collection == null ? 0 : collection.length;
  while (++index < length) {
    var value = collection[index];
    setter(accumulator, value, iteratee(value), collection);
  }
  return accumulator;
}
//@ chunk-dcmhvw5a.js:10495-10505 placement
var import_arrayAggregator = arrayAggregator;
//@ chunk-dcmhvw5a.js:10505-10678 placement
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
//@ chunk-dcmhvw5a.js:10678-10688 placement
var import_createBaseEachInline2 = createBaseEachInline2;
//@ chunk-dcmhvw5a.js:10688-10710 placement
var baseEachInline2; // deferred: uses import_createBaseEachInline2 of its import cycle while loading; runs once the cycle is complete
var baseEachInline2Alias;
deferInit("chunk-dcmhvw5a.js:10688", () => {
  baseEachInline2 = import_createBaseEachInline2(import_baseForOwn);
  baseEachInline2Alias = baseEachInline2;
});
//@ chunk-dcmhvw5a.js:10710-10778 placement
function baseAggregator(collection, setter, iteratee, accumulator) {
  baseEachInline2Alias(collection, function (value, key, object) {
    setter(accumulator, value, iteratee(value), object);
  });
  return accumulator;
}
//@ chunk-dcmhvw5a.js:10778-10788 placement
var import_baseAggregator = baseAggregator;
//@ chunk-dcmhvw5a.js:10788-10880 placement
function createAggregator(setter, initializer) {
  return function (collection, iteratee) {
    var func = isArrayAlias(collection) ? import_arrayAggregator : import_baseAggregator;
    var accumulator = initializer ? initializer() : {};
    return func(collection, setter, baseIterateeAlias(iteratee, 2), accumulator);
  };
}
//@ chunk-dcmhvw5a.js:10880-10891 placement
var import_createAggregator = createAggregator;
//@ chunk-dcmhvw5a.js:10891-10969 placement
var partition; // deferred: uses import_createAggregator of its import cycle while loading; runs once the cycle is complete
var partitionAlias;
deferInit("chunk-dcmhvw5a.js:10891", () => {
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
//@ chunk-dcmhvw5a.js:10969-11033 placement
function pickByPredicate(object, predicate) {
  return pickByBase(object, predicate, function (value, key) {
    return hasPathInAlias(object, key);
  });
}
//@ chunk-dcmhvw5a.js:11033-11043 placement
var import_pickByPredicate = pickByPredicate;
//@ chunk-dcmhvw5a.js:11043-11101 placement
var pick; // deferred: uses toKeyAlias (../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs) of its import cycle while loading; runs once the cycle is complete
var pickAlias;
deferInit("chunk-dcmhvw5a.js:11043", () => {
  pick = toKeyAlias(function (object, paths) {
    return object == null ? {} : import_pickByPredicate(object, paths);
  });
  pickAlias = pick;
});
//@ chunk-dcmhvw5a.js:26800-26878 placement
function isArrayInline(value) {
  return !Array.isArray ? getTag(value) === "[object Array]" : Array.isArray(value);
}
//@ chunk-dcmhvw5a.js:26878-26889 placement
var INFINITY = 1 / 0;
//@ chunk-dcmhvw5a.js:26889-26977 placement
function baseToString(value) {
  if (typeof value == "string") return value;
  let result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
//@ chunk-dcmhvw5a.js:26977-27016 placement
function toStringInline(value) {
  return value == null ? "" : baseToString(value);
}
//@ chunk-dcmhvw5a.js:27016-27058 placement
function isString(value) {
  return typeof value === "string";
}
//@ chunk-dcmhvw5a.js:27058-27100 placement
function isNumber(value) {
  return typeof value === "number";
}
//@ chunk-dcmhvw5a.js:27100-27171 placement
function isBoolean(value) {
  return value === true || value === false || (isObjectLike(value) && getTag(value) == "[object Boolean]");
}
//@ chunk-dcmhvw5a.js:27171-27213 placement
function isObject(value) {
  return typeof value === "object";
}
//@ chunk-dcmhvw5a.js:27213-27251 placement
function isObjectLike(value) {
  return isObject(value) && value !== null;
}
//@ chunk-bfnfj4kx.js:1116-1165 placement
var MAX_ARRAY_LENGTH_PRIMARY = 4294967295;
var MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH_PRIMARY - 1;
var { floor, min } = Math;
//@ chunk-bfnfj4kx.js:1165-1531 placement
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
//@ chunk-bfnfj4kx.js:1531-1541 placement
var import_baseSortedIndexBy = baseSortedIndexBy;
//@ chunk-bfnfj4kx.js:1541-1569 placement
var MAX_ARRAY_LENGTH = 4294967295;
var HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
//@ chunk-bfnfj4kx.js:1569-1766 placement
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
//@ chunk-bfnfj4kx.js:1766-1776 placement
var import_baseSortedIndexBy_2 = baseSortedIndex;
//@ chunk-bfnfj4kx.js:1776-1808 placement
function sortedIndex(array, value) {
  return import_baseSortedIndexBy_2(array, value);
}
//@ chunk-bfnfj4kx.js:1808-1818 placement
var import_sortedIndex = sortedIndex;
//@ chunk-bfnfj4kx.js:1818-1853 placement
function sortedLastIndex(array, value) {
  return import_baseSortedIndexBy_2(array, value, true);
}
//@ chunk-bfnfj4kx.js:1853-1863 placement
var import_sortedLastIndex = sortedLastIndex;
export {
  import_mapValues,
  import_reject,
  import_sortedIndex_2,
  pickAlias,
  partitionAlias,
  baseEachInline2Alias,
  import_isPlainObject,
  import_sortedLastIndex,
  import_sortedIndex,
  cloneBufferModule,
  isString,
  isArrayInline,
  isNumber,
  isBoolean,
  toStringInline,
  isObject,
  baseEachAlias,
  import_createAggregator,
  import_baseForOwn,
};

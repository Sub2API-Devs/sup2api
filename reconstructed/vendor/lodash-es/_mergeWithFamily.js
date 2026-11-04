/**
 * lodash-es/_mergeWithFamily.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (15)
 * attribution: placement 15
 */
import {
  eqAlias,
  isArrayLikeAlias,
  copyObject_default,
  isBufferDefault,
  baseIsTypedArrayAlias,
  copyArrayAlias,
  cloneBuffer_default,
  cloneTypedArray_default,
  baseIsArgumentsAlias,
  isObjectAlias,
  isFunctionAlias,
  initCloneObject_default,
  setToStringAlias,
  createWrapAlias,
  identityAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { assignValueRaw, keysInAlias } from "../../src/utils/git/gitSafeEnv.js";
import { import_isObjectLike, isArrayAlias } from "./toString.js";
import { safeGet } from "./_safeGet.js";
import { import_isPlainObject } from "./_inlinedHelpers.js";
import { baseMerge } from "./_baseMerge.js";
import { isIterateeCall } from "./_isIterateeCall.js";
import { createAssigner } from "./_createAssigner.js";
import { deferInit, runDeferredInits } from "../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:142574-142655 placement
function safeSet(target, key, value) {
  if ((value !== undefined && !eqAlias(target[key], value)) || (value === undefined && !(key in target)))
    assignValueRaw(target, key, value);
}
//@ chunk-dcmhvw5a.js:142655-142665 placement
/**
 * safeSet_2：safeSet 的别名。
 */
var safeSet_2 = safeSet;
//@ chunk-dcmhvw5a.js:142665-142701 placement
function baseIsEqualWith(value) {
  return import_isObjectLike(value) && isArrayLikeAlias(value);
}
//@ chunk-dcmhvw5a.js:142701-142711 placement
var baseIsEqualWith_2 = baseIsEqualWith;
//@ chunk-dcmhvw5a.js:142819-142829 placement
/**
 * safeGet_2：lodash safeGet 的别名。
 */
var safeGet_2 = safeGet;
//@ chunk-dcmhvw5a.js:142829-142864 placement
function cloneDeepWithClone(value) {
  return copyObject_default(value, keysInAlias(value));
}
//@ chunk-dcmhvw5a.js:142864-142874 placement
var cloneDeepWith_2 = cloneDeepWithClone;
//@ chunk-dcmhvw5a.js:142874-143303 placement
/**
 * 深度合并（lodash 风格）。
 */
function mergeDeep(target, source, key, sourceIndex, assignKey, customizer, stack) {
  var targetValue = safeGet_2(target, key);
  var sourceValue = safeGet_2(source, key);
  var stacked = stack.get(sourceValue);
  if (stacked) {
    safeSet_2(target, key, stacked);
    return;
  }
  var result = customizer ? customizer(targetValue, sourceValue, key + "", target, source, stack) : undefined;
  var isNew = result === undefined;
  if (isNew) {
    var isPlain = isArrayAlias(sourceValue);
    var isBuffer = !isPlain && isBufferDefault(sourceValue);
    var isTypedArray = !isPlain && !isBuffer && baseIsTypedArrayAlias(sourceValue);
    result = sourceValue;
    if (isPlain || isBuffer || isTypedArray) {
      if (isArrayAlias(targetValue)) result = targetValue;
      else if (baseIsEqualWith_2(targetValue)) result = copyArrayAlias(targetValue);
      else if (isBuffer) {
        isNew = false;
        result = cloneBuffer_default(sourceValue, true);
      } else if (isTypedArray) {
        isNew = false;
        result = cloneTypedArray_default(sourceValue, true);
      } else result = [];
    } else if (import_isPlainObject(sourceValue) || baseIsArgumentsAlias(sourceValue)) {
      result = targetValue;
      if (baseIsArgumentsAlias(targetValue)) result = cloneDeepWith_2(targetValue);
      else if (!isObjectAlias(targetValue) || isFunctionAlias(targetValue))
        result = initCloneObject_default(sourceValue);
    } else isNew = false;
  }
  if (isNew) {
    stack.set(sourceValue, result);
    assignKey(result, sourceValue, sourceIndex, customizer, stack);
    stack.delete(sourceValue);
  }
  safeSet_2(target, key, result);
}
//@ chunk-dcmhvw5a.js:143303-143313 placement
/**
 * mergeDeep_2：mergeDeep 的别名。
 */
var mergeDeep_2 = mergeDeep;
//@ chunk-dcmhvw5a.js:143493-143503 placement
var baseMerge_2 = baseMerge;
//@ chunk-dcmhvw5a.js:143503-143548 placement
function toKeyString(object, key) {
  return setToStringAlias(createWrapAlias(object, key, identityAlias), object + "");
}
//@ chunk-dcmhvw5a.js:143548-143558 placement
/**
 * mergeKeys：eS 的别名。
 */
var mergeKeys = toKeyString;
//@ chunk-dcmhvw5a.js:143700-143711 placement
/**
 * isIterateeCall_2：lodash isIterateeCall 的别名。
 */
var isIterateeCall_2 = isIterateeCall;
//@ chunk-dcmhvw5a.js:143963-143973 placement
var createAssigner_2 = createAssigner;
//@ chunk-dcmhvw5a.js:143973-144021 placement
/**
 * mergeWithAssigner：自定义合并器；mergeWithAssigner_2：mergeWithAssigner 的别名（同一声明共 2 个绑定）。
 */
var mergeWithAssigner; // deferred: uses createAssigner_2 of its import cycle while loading; runs once the cycle is complete
var mergeWithAssigner_2;
deferInit("chunk-dcmhvw5a.js:143973", () => {
  mergeWithAssigner = createAssigner_2(function (target, source, sourceIndex, stack) {
    baseMerge_2(target, source, sourceIndex, stack);
  });
  mergeWithAssigner_2 = mergeWithAssigner;
});

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/lodash-es/_mergeWithFamily.js");
runDeferredInits("worker:vendor/lodash-es/_mergeWithFamily.js");
export { mergeWithAssigner_2, isIterateeCall_2, mergeDeep_2, safeGet_2, safeSet_2, mergeKeys };

/**
 * @opentelemetry/core/build/src/utils/merge.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_lodash_merge } from "./lodash.merge.js";

//@ chunk-7kayq7nc.js:125818-127385 cjs-fingerprint
var require_merge = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.merge = undefined;
  var lodash_merge_1 = require_lodash_merge();
  var MAX_LEVEL = 20;
  function merge(...args) {
    let result = args.shift();
    let objects = new WeakMap();
    while (args.length > 0) result = mergeTwoObjects(result, args.shift(), 0, objects);
    return result;
  }
  cjsExports.merge = merge;
  function takeValue(value) {
    if (isArray(value)) return value.slice();
    return value;
  }
  function mergeTwoObjects(one, two, level = 0, objects) {
    let result;
    if (level > MAX_LEVEL) return;
    level++;
    if (isPrimitive(one) || isPrimitive(two) || isFunction(two)) result = takeValue(two);
    else if (isArray(one)) {
      result = one.slice();
      if (isArray(two)) for (let i = 0, j = two.length; i < j; i++) result.push(takeValue(two[i]));
      else if (isObject(two)) {
        let keys = Object.keys(two);
        for (let i = 0, j = keys.length; i < j; i++) {
          let key = keys[i];
          if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
          result[key] = takeValue(two[key]);
        }
      }
    } else if (isObject(one))
      if (isObject(two)) {
        if (!shouldMerge(one, two)) return two;
        result = Object.assign({}, one);
        let keys = Object.keys(two);
        for (let i = 0, j = keys.length; i < j; i++) {
          let key = keys[i];
          if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
          let twoValue = two[key];
          if (isPrimitive(twoValue)) {
            if (typeof twoValue === "undefined") delete result[key];
            else result[key] = twoValue;
          } else {
            let obj1 = result[key];
            let obj2 = twoValue;
            if (wasObjectReferenced(one, key, objects) || wasObjectReferenced(two, key, objects))
              delete result[key];
            else {
              if (isObject(obj1) && isObject(obj2)) {
                let arr1 = objects.get(obj1) || [];
                let arr2 = objects.get(obj2) || [];
                arr1.push({
                  obj: one,
                  key,
                });
                arr2.push({
                  obj: two,
                  key,
                });
                objects.set(obj1, arr1);
                objects.set(obj2, arr2);
              }
              result[key] = mergeTwoObjects(result[key], twoValue, level, objects);
            }
          }
        }
      } else result = two;
    return result;
  }
  function wasObjectReferenced(obj, key, objects) {
    let arr = objects.get(obj[key]) || [];
    for (let i = 0, j = arr.length; i < j; i++) {
      let info = arr[i];
      if (info.key === key && info.obj === obj) return true;
    }
    return false;
  }
  function isArray(value) {
    return Array.isArray(value);
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function isObject(value) {
    return !isPrimitive(value) && !isArray(value) && !isFunction(value) && typeof value === "object";
  }
  function isPrimitive(value) {
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "undefined" ||
      value instanceof Date ||
      value instanceof RegExp ||
      value === null
    );
  }
  function shouldMerge(one, two) {
    if (!lodash_merge_1.isPlainObject(one) || !lodash_merge_1.isPlainObject(two)) return false;
    return true;
  }
});
export { require_merge };

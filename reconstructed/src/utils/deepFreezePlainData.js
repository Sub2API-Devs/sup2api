/**
 * utils/deepFreezePlainData.ts
 *
 * 纯数据深冻结（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xkyzvvf1.js (7)
 * attribution: placement 7
 */
import { custom } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-xkyzvvf1.js:257-285 placement
/**
 * 深度冻结工具名（占位实现，转调 hu）。
 */
function deepFreezeToolName(toolName) {
  return custom(toolName);
}
//@ chunk-xkyzvvf1.js:285-310 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze(value) {
  return value;
}
//@ chunk-xkyzvvf1.js:310-335 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze2(value) {
  return value;
}
//@ chunk-xkyzvvf1.js:335-360 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze3(value) {
  return value;
}
//@ chunk-xkyzvvf1.js:360-385 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze4(value) {
  return value;
}
//@ chunk-xkyzvvf1.js:385-857 placement
function mintDisplayedUpdates(input) {
  if (Object.getPrototypeOf(input) !== Array.prototype)
    throw TypeError("mintDisplayedUpdates: non-plain array in mint input \u2014 plain data only");
  if (!Number.isSafeInteger(input.length) || input.length < 0)
    throw TypeError("mintDisplayedUpdates: non-integer length in mint input \u2014 plain data only");
  let frozen = [];
  for (let i = 0; i < input.length; i++) {
    if (!(i in input)) throw TypeError("mintDisplayedUpdates: sparse mint input \u2014 plain data only");
    frozen.push(deepFreezePlainData(input[i]));
  }
  return Object.freeze(frozen);
}
//@ chunk-xkyzvvf1.js:857-2216 placement
/**
 * 深度冻结纯数据（拒绝函数、非纯原型、稀疏数组）
 */
function deepFreezePlainData(value, seen = new WeakMap()) {
  if (typeof value === "function")
    throw TypeError("deepFreezePlainData: function in mint input \u2014 plain data only");
  if (value !== null && typeof value === "object") {
    let memo = seen.get(value);
    if (memo !== undefined) return memo;
    let prototypeOf = Object.getPrototypeOf(value);
    if (
      !(Array.isArray(value)
        ? prototypeOf === Array.prototype
        : prototypeOf === Object.prototype || prototypeOf === null)
    )
      throw TypeError("deepFreezePlainData: non-plain prototype in mint input \u2014 plain data only");
    let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(value);
    for (let key of Object.keys(ownPropertyDescriptors)) {
      let descriptor = ownPropertyDescriptors[key];
      if (descriptor && (descriptor.get !== undefined || descriptor.set !== undefined))
        throw TypeError("deepFreezePlainData: accessor property in mint input \u2014 plain data only");
    }
    if (Object.getOwnPropertySymbols(value).length > 0)
      throw TypeError("deepFreezePlainData: symbol-keyed property in mint input \u2014 plain data only");
    for (let key of Object.keys(ownPropertyDescriptors)) {
      let descriptor = ownPropertyDescriptors[key];
      if (descriptor && descriptor.enumerable === false && !(Array.isArray(value) && key === "length"))
        throw TypeError("deepFreezePlainData: non-enumerable property in mint input \u2014 plain data only");
    }
    let copy = Array.isArray(value) ? [] : {};
    seen.set(value, copy);
    for (let key of Object.keys(ownPropertyDescriptors)) {
      if (Array.isArray(value) && key === "length") continue;
      if (key === "__proto__" || key === "constructor")
        throw TypeError("deepFreezePlainData: prototype-key property in mint input \u2014 plain data only");
      let descriptor = ownPropertyDescriptors[key];
      Object.defineProperty(copy, key, {
        value: deepFreezePlainData(descriptor?.value, seen),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }
    Object.freeze(copy);
    return copy;
  }
  return value;
}
export {
  identityFreeze4,
  identityFreeze3,
  mintDisplayedUpdates,
  deepFreezeToolName,
  identityFreeze,
  identityFreeze2,
};

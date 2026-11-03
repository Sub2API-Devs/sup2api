/**
 * utils/deepFreezePlainData.ts
 *
 * 纯数据深冻结（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xkyzvvf1.js (8)
 * attribution: placement 8
 */
import { hu } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-xkyzvvf1.js:227-257 placement
/**
 * 无效工具名使用的占位文本。
 */
var INVALID_TOOL_NAME_TEXT = "(invalid tool name)";
//@ chunk-xkyzvvf1.js:257-285 placement
/**
 * 深度冻结工具名（占位实现，转调 hu）。
 */
function deepFreezeToolName(e) {
  return hu(e);
}
//@ chunk-xkyzvvf1.js:285-310 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:310-335 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze2(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:335-360 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze3(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:360-385 placement
/**
 * 原样返回输入（占位）。
 */
function identityFreeze4(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:385-857 placement
function mintDisplayedUpdates(e) {
  if (Object.getPrototypeOf(e) !== Array.prototype)
    throw TypeError("mintDisplayedUpdates: non-plain array in mint input \u2014 plain data only");
  if (!Number.isSafeInteger(e.length) || e.length < 0)
    throw TypeError("mintDisplayedUpdates: non-integer length in mint input \u2014 plain data only");
  let o = [];
  for (let i = 0; i < e.length; i++) {
    if (!(i in e)) throw TypeError("mintDisplayedUpdates: sparse mint input \u2014 plain data only");
    o.push(deepFreezePlainData(e[i]));
  }
  return Object.freeze(o);
}
//@ chunk-xkyzvvf1.js:857-2216 placement
/**
 * 深度冻结纯数据（拒绝函数、非纯原型、稀疏数组）
 */
function deepFreezePlainData(e, o = new WeakMap()) {
  if (typeof e === "function")
    throw TypeError("deepFreezePlainData: function in mint input \u2014 plain data only");
  if (e !== null && typeof e === "object") {
    let r = o.get(e);
    if (r !== undefined) return r;
    let prototypeOf = Object.getPrototypeOf(e);
    if (
      !(Array.isArray(e)
        ? prototypeOf === Array.prototype
        : prototypeOf === Object.prototype || prototypeOf === null)
    )
      throw TypeError("deepFreezePlainData: non-plain prototype in mint input \u2014 plain data only");
    let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(e);
    for (let key of Object.keys(ownPropertyDescriptors)) {
      let n = ownPropertyDescriptors[key];
      if (n && (n.get !== undefined || n.set !== undefined))
        throw TypeError("deepFreezePlainData: accessor property in mint input \u2014 plain data only");
    }
    if (Object.getOwnPropertySymbols(e).length > 0)
      throw TypeError("deepFreezePlainData: symbol-keyed property in mint input \u2014 plain data only");
    for (let key of Object.keys(ownPropertyDescriptors)) {
      let n = ownPropertyDescriptors[key];
      if (n && n.enumerable === false && !(Array.isArray(e) && key === "length"))
        throw TypeError("deepFreezePlainData: non-enumerable property in mint input \u2014 plain data only");
    }
    let a = Array.isArray(e) ? [] : {};
    o.set(e, a);
    for (let key of Object.keys(ownPropertyDescriptors)) {
      if (Array.isArray(e) && key === "length") continue;
      if (key === "__proto__" || key === "constructor")
        throw TypeError("deepFreezePlainData: prototype-key property in mint input \u2014 plain data only");
      let n = ownPropertyDescriptors[key];
      Object.defineProperty(a, key, {
        value: deepFreezePlainData(n?.value, o),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }
    Object.freeze(a);
    return a;
  }
  return e;
}
export {
  INVALID_TOOL_NAME_TEXT,
  identityFreeze4,
  identityFreeze3,
  mintDisplayedUpdates,
  deepFreezeToolName,
  identityFreeze,
  identityFreeze2,
};

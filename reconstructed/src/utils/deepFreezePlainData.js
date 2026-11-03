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
var y3e = "(invalid tool name)";
//@ chunk-xkyzvvf1.js:257-285 placement
function Fh(e) {
  return hu(e);
}
//@ chunk-xkyzvvf1.js:285-310 placement
function ple(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:310-335 placement
function Yls(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:335-360 placement
function pAi(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:360-385 placement
function mAi(e) {
  return e;
}
//@ chunk-xkyzvvf1.js:385-857 placement
function mintDisplayedUpdates(e) {
  if (Object.getPrototypeOf(e) !== Array.prototype)
    throw TypeError("mintDisplayedUpdates: non-plain array in mint input \u2014 plain data only");
  if (!Number.isSafeInteger(e.length) || e.length < 0)
    throw TypeError("mintDisplayedUpdates: non-integer length in mint input \u2014 plain data only");
  let o = [];
  for (let r = 0; r < e.length; r++) {
    if (!(r in e)) throw TypeError("mintDisplayedUpdates: sparse mint input \u2014 plain data only");
    o.push(deepFreezePlainData(e[r]));
  }
  return Object.freeze(o);
}
/**
 * 深度冻结纯数据（拒绝函数、非纯原型、稀疏数组）
 */
//@ chunk-xkyzvvf1.js:857-2216 placement
function deepFreezePlainData(e, o = new WeakMap()) {
  if (typeof e === "function")
    throw TypeError("deepFreezePlainData: function in mint input \u2014 plain data only");
  if (e !== null && typeof e === "object") {
    let r = o.get(e);
    if (r !== void 0) return r;
    let prototypeOf = Object.getPrototypeOf(e);
    if (
      !(Array.isArray(e)
        ? prototypeOf === Array.prototype
        : prototypeOf === Object.prototype || prototypeOf === null)
    )
      throw TypeError("deepFreezePlainData: non-plain prototype in mint input \u2014 plain data only");
    let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(e);
    for (let t of Object.keys(ownPropertyDescriptors)) {
      let n = ownPropertyDescriptors[t];
      if (n && (n.get !== void 0 || n.set !== void 0))
        throw TypeError("deepFreezePlainData: accessor property in mint input \u2014 plain data only");
    }
    if (Object.getOwnPropertySymbols(e).length > 0)
      throw TypeError("deepFreezePlainData: symbol-keyed property in mint input \u2014 plain data only");
    for (let t of Object.keys(ownPropertyDescriptors)) {
      let n = ownPropertyDescriptors[t];
      if (n && n.enumerable === !1 && !(Array.isArray(e) && t === "length"))
        throw TypeError("deepFreezePlainData: non-enumerable property in mint input \u2014 plain data only");
    }
    let a = Array.isArray(e) ? [] : {};
    o.set(e, a);
    for (let t of Object.keys(ownPropertyDescriptors)) {
      if (Array.isArray(e) && t === "length") continue;
      if (t === "__proto__" || t === "constructor")
        throw TypeError("deepFreezePlainData: prototype-key property in mint input \u2014 plain data only");
      let n = ownPropertyDescriptors[t];
      Object.defineProperty(a, t, {
        value: deepFreezePlainData(n?.value, o),
        enumerable: !0,
        writable: !1,
        configurable: !1,
      });
    }
    return (Object.freeze(a), a);
  }
  return e;
}

export { y3e, mAi, pAi, mintDisplayedUpdates, Fh, ple, Yls };

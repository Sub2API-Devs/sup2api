/**
 * utils/untrustedValues.ts
 *
 * 2.1.316 新增：识别 Proxy/vm 上下文等不可信对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f4c4vzny.js (4)
 * attribution: placement 4
 */
import { types } from "util";
import { isContext } from "vm";

//@ chunk-f4c4vzny.js:251-336 placement
var { isProxy } = types;
var isVmContext = isContext;
var { add: weakSetAdd, has: weakSetHas } = WeakSet.prototype;
var { apply: applyReflect } = Reflect;
var weakSet = new WeakSet();
//@ chunk-f4c4vzny.js:336-390 placement
/**
 * 登记一个对象为不可信（可附带另一对象）。
 */
function markUntrusted(value, extraValue) {
  applyReflect(weakSetAdd, weakSet, [value]);
  if (extraValue !== undefined) applyReflect(weakSetAdd, weakSet, [extraValue]);
}
//@ chunk-f4c4vzny.js:390-422 placement
function wasMarkedUntrusted(value) {
  return applyReflect(weakSetHas, weakSet, [value]);
}
//@ chunk-f4c4vzny.js:422-492 placement
/**
 * 判断对象是否为 Proxy、vm 上下文中的对象或登记过的不可信对象。
 */
function isUntrustedObject(value) {
  return (
    isProxy(value) ||
    wasMarkedUntrusted(value) ||
    (typeof value === "object" && value !== null && isVmContext(value))
  );
}
export { isUntrustedObject, markUntrusted };

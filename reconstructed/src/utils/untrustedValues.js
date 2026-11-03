/**
 * utils/untrustedValues.ts
 *
 * 2.1.316 新增：识别 Proxy/vm 上下文等不可信对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f640a6hn.js (4)
 * attribution: placement 4
 */
import { types } from "util";
import { isContext } from "vm";

//@ chunk-f640a6hn.js:251-336 placement
var { isProxy: isProxy } = types,
  d = isContext,
  { add: r, has: p } = WeakSet.prototype,
  { apply: e } = Reflect,
  weakSet = new WeakSet();
//@ chunk-f640a6hn.js:336-390 placement
function jSi(t, n) {
  if ((e(r, weakSet, [t]), n !== void 0)) e(r, weakSet, [n]);
}
//@ chunk-f640a6hn.js:390-422 placement
function x(t) {
  return e(p, weakSet, [t]);
}
//@ chunk-f640a6hn.js:422-492 placement
function Pf(t) {
  return isProxy(t) || x(t) || (typeof t === "object" && t !== null && d(t));
}

export { Pf, jSi };

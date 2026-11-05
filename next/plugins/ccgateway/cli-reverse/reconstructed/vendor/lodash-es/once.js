/**
 * lodash-es/once.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-k1t1w9mg.js (5)
 * attribution: placement 5
 */
import { toInteger_default } from "./toInteger.js";

//@ chunk-k1t1w9mg.js:1465-1493 placement
var FUNC_ERROR_TEXT = "Expected a function";
//@ chunk-k1t1w9mg.js:1493-1647 placement
function before(nArg, func) {
  var result;
  if (typeof func != "function") throw TypeError(FUNC_ERROR_TEXT);
  nArg = toInteger_default(nArg);
  return function () {
    if (--nArg > 0) result = func.apply(this, arguments);
    if (nArg <= 1) func = undefined;
    return result;
  };
}
//@ chunk-k1t1w9mg.js:1647-1655 placement
var beforeExport = before;
//@ chunk-k1t1w9mg.js:1655-1683 placement
function once(func) {
  return beforeExport(2, func);
}
//@ chunk-k1t1w9mg.js:1683-1692 placement
/**
 * lodash-es once：包装函数只执行一次并缓存结果（316 中被 FileEdit/WebFetch 等使用）。
 */
var onceExport = once;
export { onceExport };

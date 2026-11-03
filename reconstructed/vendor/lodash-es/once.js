/**
 * lodash-es/once.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-bwbq4xvm.js (5)
 * attribution: placement 5
 */
import { toIntegerExport } from "./toInteger.js";

//@ chunk-bwbq4xvm.js:151035-151064 placement
var FUNC_ERROR_TEXT = "Expected a function";
//@ chunk-bwbq4xvm.js:151064-151220 placement
function before(e, s) {
  var n;
  if (typeof s != "function") throw TypeError(FUNC_ERROR_TEXT);
  return (
    (e = toIntegerExport(e)),
    function () {
      if (--e > 0) n = s.apply(this, arguments);
      if (e <= 1) s = void 0;
      return n;
    }
  );
}
//@ chunk-bwbq4xvm.js:151220-151230 placement
var beforeExport = before;
//@ chunk-bwbq4xvm.js:151230-151260 placement
function once(e) {
  return beforeExport(2, e);
}
/**
 * lodash-es once：包装函数只执行一次并缓存结果（316 中被 FileEdit/WebFetch 等使用）。
 */
//@ chunk-bwbq4xvm.js:151260-151270 placement
var onceExport = once;

export { onceExport };

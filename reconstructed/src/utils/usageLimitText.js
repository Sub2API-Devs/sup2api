/**
 * utils/usageLimitText.ts
 *
 * 2.1.316 新增：用量限额文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6rgkw5kr.js (5)
 * attribution: placement 5
 */
import { xk } from "./format.js";

//@ chunk-6rgkw5kr.js:340-384 placement
var Ehn = "usage limit",
  w7n = ` (after ${Ehn})`;
/**
 * 生成用量限额重置时间文本（resets at 时刻 / resets 日期）。
 */
//@ chunk-6rgkw5kr.js:384-491 placement
function resetsAtText(e, i = !1) {
  let l = xk(e, i);
  if (l === void 0) return;
  return /^\d/.test(l) ? `resets at ${l}` : `resets ${l}`;
}
//@ chunk-6rgkw5kr.js:491-554 placement
function d(e) {
  let i = resetsAtText(e);
  return i === void 0 ? Ehn : `${Ehn} ${i}`;
}
//@ chunk-6rgkw5kr.js:554-598 placement
function OJs(e) {
  return `Paused \xB7 ${d(e)}`;
}
//@ chunk-6rgkw5kr.js:598-664 placement
function S2o(e) {
  return [["paused", d(e)], ["paused", Ehn], ["paused"]];
}

export { S2o, resetsAtText, w7n, Ehn, OJs };

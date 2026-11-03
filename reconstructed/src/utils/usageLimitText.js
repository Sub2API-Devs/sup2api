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
import { formatResetTimeWithLocale } from "./format.js";

//@ chunk-6rgkw5kr.js:340-384 placement
/**
 * 用量限额文案「usage limit」。
 */
var USAGE_LIMIT_TEXT = "usage limit";
var USAGE_LIMIT_SUFFIX = ` (after ${USAGE_LIMIT_TEXT})`;
//@ chunk-6rgkw5kr.js:384-491 placement
/**
 * 生成用量限额重置时间文本（resets at 时刻 / resets 日期）。
 */
function resetsAtText(resetsAt, i = false) {
  let l = formatResetTimeWithLocale(resetsAt, i);
  if (l === undefined) return;
  return /^\d/.test(l) ? `resets at ${l}` : `resets ${l}`;
}
//@ chunk-6rgkw5kr.js:491-554 placement
function usageLimitLine(e) {
  let i = resetsAtText(e);
  return i === undefined ? USAGE_LIMIT_TEXT : `${USAGE_LIMIT_TEXT} ${i}`;
}
//@ chunk-6rgkw5kr.js:554-598 placement
/**
 * 「Paused · 用量限额（重置时间）」文案。
 */
function pausedUsageLine(resetsAt) {
  return `Paused \xB7 ${usageLimitLine(resetsAt)}`;
}
//@ chunk-6rgkw5kr.js:598-664 placement
/**
 * 暂停行的分段（文案、限额、空段）。
 */
function pausedUsageParts(resetsAt) {
  return [["paused", usageLimitLine(resetsAt)], ["paused", USAGE_LIMIT_TEXT], ["paused"]];
}
export { pausedUsageParts, resetsAtText, USAGE_LIMIT_SUFFIX, USAGE_LIMIT_TEXT, pausedUsageLine };

/**
 * constants/common.ts
 *
 * 通用小常量与日期辅助（本地"月份 年"字符串）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/common.ts
 * pieces: chunk-d0k42hx1.js (1)
 * attribution: fingerprint 1
 */

/**
 * 当前本地日期的 "Month YYYY"（en-US）。
 */
//@ chunk-d0k42hx1.js:1326-1413 fingerprint = getLocalMonthYear (0.92)
function getLocalMonthYear() {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

export { getLocalMonthYear };

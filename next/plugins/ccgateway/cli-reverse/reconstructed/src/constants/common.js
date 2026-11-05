/**
 * constants/common.ts
 *
 * 通用小常量与日期辅助（本地"月份 年"字符串）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/common.ts
 * pieces: chunk-v4ach9rb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-v4ach9rb.js:1357-1444 fingerprint (2.1.88 match: getLocalMonthYear, 0.919)
/**
 * 当前本地日期的 "Month YYYY"（en-US）。
 */
function getLocalMonthYear() {
  return new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}
export { getLocalMonthYear };

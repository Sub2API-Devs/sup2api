/**
 * utils/truncationNotice.ts
 *
 * 2.1.316 新增：截断提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qs2bes42.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stripNonPrintable } from "./truncateGraphemes.js";
import { truncateToLength } from "./stringUtils.js";

//@ chunk-qs2bes42.js:262-323 placement
/**
 * 把行分隔符替换为空格。
 */
function collapseLineBreaks(text) {
  return text.replace(/[\r\n\u2028\u2029]+/g, " ");
}
//@ chunk-qs2bes42.js:323-514 placement
/**
 * 去除不可打印字符后按长度截断，并注明还有多少字符未显示。
 */
function truncateWithNotice(text, max) {
  let cleaned = stripNonPrintable(text);
  if (cleaned.length <= max) return cleaned;
  let head = truncateToLength(cleaned, max);
  let remainingCount = Array.from(cleaned.slice(head.length)).length;
  return `${head} \u2026 (${remainingCount} more characters follow that are NOT shown in this message)`;
}
export { truncateWithNotice, collapseLineBreaks };

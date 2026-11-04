/**
 * utils/truncationNotice.ts
 *
 * 2.1.316 新增：截断提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-33en6jc2.js (2)
 * attribution: placement 2
 */
import { stripNonPrintable } from "./truncateGraphemes.js";
import { truncateToLength } from "./stringUtils.js";

//@ chunk-33en6jc2.js:263-324 placement
/**
 * 把行分隔符替换为空格。
 */
function collapseLineBreaks(text) {
  return text.replace(/[\r\n\u2028\u2029]+/g, " ");
}
//@ chunk-33en6jc2.js:324-516 placement
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

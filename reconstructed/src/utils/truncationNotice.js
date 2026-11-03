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
function gQe(n) {
  return n.replace(/[\r\n\u2028\u2029]+/g, " ");
}
/**
 * 去除不可打印字符后按长度截断，并注明还有多少字符未显示。
 */
//@ chunk-33en6jc2.js:324-516 placement
function truncateWithNotice(n, r) {
  let e = stripNonPrintable(n);
  if (e.length <= r) return e;
  let t = truncateToLength(e, r),
    o = Array.from(e.slice(t.length)).length;
  return `${t} \u2026 (${o} more characters follow that are NOT shown in this message)`;
}

export { truncateWithNotice, gQe };

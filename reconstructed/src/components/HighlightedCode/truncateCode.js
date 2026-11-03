/**
 * components/HighlightedCode/truncateCode.ts
 *
 * 2.1.316 新增：高亮代码的截断辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cwwxybjc.js (4)
 * attribution: placement 4
 */
import { truncateToLength } from "../../utils/stringUtils.js";
import { tUn } from "../../utils/cliHighlightLanguages.js";

//@ chunk-cwwxybjc.js:692-705 placement
var XFn = 2000;
/**
 * 截断过长代码并返回截掉字符数。
 */
//@ chunk-cwwxybjc.js:705-872 placement
function truncateCode(e, n = 0) {
  if (e.length - n <= XFn) return { code: e.slice(n), truncatedChars: 0 };
  let sliced = e.slice(n, n + XFn + 1),
    c = truncateToLength(sliced, XFn);
  return { code: c, truncatedChars: e.length - n - c.length };
}
//@ chunk-cwwxybjc.js:872-918 placement
function bJe(e) {
  return ` \u2026 [+${e} chars]`;
}
//@ chunk-cwwxybjc.js:965-991 placement
function j() {
  return tUn();
}

export { XFn, truncateCode, bJe, j };

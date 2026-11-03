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
import { highlightCore } from "../../utils/cliHighlightLanguages.js";

//@ chunk-cwwxybjc.js:692-705 placement
/**
 * 导出值：MAX_CODE_CHARS（2000：代码字符上限）。
 */
var MAX_CODE_CHARS = 2000;
//@ chunk-cwwxybjc.js:705-872 placement
/**
 * 截断过长代码并返回截掉字符数。
 */
function truncateCode(e, n = 0) {
  if (e.length - n <= MAX_CODE_CHARS)
    return {
      code: e.slice(n),
      truncatedChars: 0,
    };
  let sliced = e.slice(n, n + MAX_CODE_CHARS + 1);
  let c = truncateToLength(sliced, MAX_CODE_CHARS);
  return {
    code: c,
    truncatedChars: e.length - n - c.length,
  };
}
//@ chunk-cwwxybjc.js:872-918 placement
/**
 * 函数 truncatedCharsSuffix（" … [+N chars]"）。
 */
function truncatedCharsSuffix(truncatedChars) {
  return ` \u2026 [+${truncatedChars} chars]`;
}
//@ chunk-cwwxybjc.js:965-991 placement
function getMaxCodeChars() {
  return highlightCore();
}
export { MAX_CODE_CHARS, truncateCode, truncatedCharsSuffix, getMaxCodeChars };

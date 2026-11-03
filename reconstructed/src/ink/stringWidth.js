/**
 * ink/stringWidth.ts
 *
 * 字符串显示宽度（Bun.stringWidth 包装、长行分块）；部分声明误归
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/stringWidth.ts
 * pieces: chunk-gfseh2w1.js (2), chunk-t0gq9gyw.js (2)
 * attribution: fingerprint 3, sole-consumer 1
 */
import { getGraphemeSegmenter } from "../utils/intl.js";
import { RS } from "../utils/sanitization.js";

/**
 * Bun.stringWidth 选项：东亚歧义宽度按窄。
 */
//@ chunk-gfseh2w1.js:191-220 fingerprint = BUN_STRING_WIDTH_OPTS (1)
var BUN_STRING_WIDTH_OPTS = { ambiguousIsNarrow: !0 };
/**
 * 字符串显示宽度：Bun.stringWidth（歧义宽度按窄）。
 */
//@ chunk-gfseh2w1.js:220-263 fingerprint = bunStringWidth (0.617)
function bunStringWidth(t) {
  return Bun.stringWidth(t, BUN_STRING_WIDTH_OPTS);
}
/**
 * 找出文本里会被渲染成零宽的字符（不可见格式符、零宽字素等），返回其码点；没有返回 undefined。
 */
//@ chunk-t0gq9gyw.js:5412-5691 fingerprint = stringWidthJavaScript (0.677)
function findZeroWidthCodePoint(text) {
  let match = INVISIBLE_CHAR_RE.exec(text);
  if (match !== null) return match[0].codePointAt(0);
  if (PRINTABLE_ASCII_RE.test(text)) return;
  for (let { segment: grapheme } of getGraphemeSegmenter().segment(text)) {
    if (CONTROL_WHITESPACE_RE.test(grapheme)) continue;
    let o = bunStringWidth(grapheme);
    if (o === 0) return grapheme.codePointAt(0);
    if (o > 2 && grapheme.length > 1) {
      for (let char of grapheme) if (bunStringWidth(char) === 0) return char.codePointAt(0);
    }
  }
  return;
}
//@ chunk-t0gq9gyw.js:5691-5782 sole-consumer
var INVISIBLE_CHAR_RE = new RegExp(`(?![\\t\\n\\r])[${RS}]`, "u"),
  CONTROL_WHITESPACE_RE = /^[\t\n\r]+$/,
  PRINTABLE_ASCII_RE = /^[\t\n\r\x20-\x7e]*$/;

export { bunStringWidth, findZeroWidthCodePoint };

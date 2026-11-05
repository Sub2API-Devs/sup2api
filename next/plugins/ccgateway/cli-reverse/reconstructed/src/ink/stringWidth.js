/**
 * ink/stringWidth.ts
 *
 * 字符串显示宽度（Bun.stringWidth 包装、长行分块）；部分声明误归
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/stringWidth.ts
 * pieces: chunk-85eyj5gy.js (2), chunk-bjt8vq6r.js (2)
 * attribution: fingerprint 3, sole-consumer 1
 */
import { getGraphemeSegmenter } from "../utils/intl.js";
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../utils/sanitization.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bjt8vq6r.js:191-220 fingerprint (2.1.88 match: BUN_STRING_WIDTH_OPTS, 1)
/**
 * Bun.stringWidth 选项：东亚歧义宽度按窄。
 */
var BUN_STRING_WIDTH_OPTS = {
  ambiguousIsNarrow: true,
};
//@ chunk-bjt8vq6r.js:220-263 fingerprint (2.1.88 match: bunStringWidth, 0.617)
/**
 * 字符串显示宽度：Bun.stringWidth（歧义宽度按窄）。
 */
function bunStringWidth(str) {
  return Bun.stringWidth(str, BUN_STRING_WIDTH_OPTS);
}
//@ chunk-85eyj5gy.js:5482-5761 fingerprint (2.1.88 match: stringWidthJavaScript, 0.677)
/**
 * 找出文本里会被渲染成零宽的字符（不可见格式符、零宽字素等），返回其码点；没有返回 undefined。
 */
function findZeroWidthCodePoint(text) {
  let match = INVISIBLE_CHAR_RE.exec(text);
  if (match !== null) return match[0].codePointAt(0);
  if (PRINTABLE_ASCII_RE.test(text)) return;
  for (let { segment: grapheme } of getGraphemeSegmenter().segment(text)) {
    if (CONTROL_WHITESPACE_RE.test(grapheme)) continue;
    let width = bunStringWidth(grapheme);
    if (width === 0) return grapheme.codePointAt(0);
    if (width > 2 && grapheme.length > 1) {
      for (let char of grapheme) if (bunStringWidth(char) === 0) return char.codePointAt(0);
    }
  }
  return;
}
//@ chunk-85eyj5gy.js:5761-5852 sole-consumer
var INVISIBLE_CHAR_RE; // deferred: uses INVISIBLE_CHAR_CLASSES (../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
var CONTROL_WHITESPACE_RE;
var PRINTABLE_ASCII_RE;
deferInit("chunk-85eyj5gy.js:5761", () => {
  INVISIBLE_CHAR_RE = new RegExp(`(?![\\t\\n\\r])[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
  CONTROL_WHITESPACE_RE = /^[\t\n\r]+$/;
  PRINTABLE_ASCII_RE = /^[\t\n\r\x20-\x7e]*$/;
});
export { bunStringWidth, findZeroWidthCodePoint };

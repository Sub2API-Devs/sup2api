/**
 * components/permissions/wrapWidth.ts
 *
 * 2.1.316 新增：按显示宽度换行
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j2qwgqcr.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-j2qwgqcr.js:191-200 placement
/**
 * 导出值：MAX_VISIBLE_ITEMS（8：列表/应用数超过该值即折叠）。
 */
var MAX_VISIBLE_ITEMS = 8;
//@ chunk-j2qwgqcr.js:200-328 placement
/**
 * 按显示宽度把字符序列切分成多行。
 */
function wrapByWidth(text, width) {
  let lines = [];
  let current = "";
  let currentWidth = 0;
  for (let char of text) {
    let charWidth = charWidth_2(char);
    if (currentWidth + charWidth > width && current !== "") {
      lines.push(current);
      current = "";
      currentWidth = 0;
    }
    current += char;
    currentWidth += charWidth;
  }
  lines.push(current);
  return lines;
}
//@ chunk-j2qwgqcr.js:328-376 placement
function charWidth_2(char) {
  return char.length === 1 && char < "\x80" ? 1 : 2;
}
export { MAX_VISIBLE_ITEMS, wrapByWidth };

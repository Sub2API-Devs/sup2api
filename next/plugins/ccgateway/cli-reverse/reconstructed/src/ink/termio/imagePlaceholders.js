/**
 * ink/termio/imagePlaceholders.ts
 *
 * 2.1.316 新增：终端图片占位格的编码/解码（U+2800 加行列与 id 的附加符号）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2avr6cej.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { COMBINING_MARK_CODES } from "../../utils/unicode/combiningMarks.js";
import {
  PLACEHOLDER_CHAR,
  DIACRITIC_COUNT,
  assertImageInt,
  MAX_ITERM_IMAGE_ID,
  MAX_PLACEHOLDER_INDEX,
} from "./iterm2Image.js";

//@ chunk-2avr6cej.js:265818-265869 placement
function diacritic(index) {
  return String.fromCodePoint(COMBINING_MARK_CODES[index]);
}
//@ chunk-2avr6cej.js:265869-265992 placement (2.1.88 match: GUTTER_MAP, 0.562)
/**
 * 把 {id,row,column} 编码成一个占位字素：U+2800 + 行、列、id 高中低三位的附加符号。
 */
function encodeImagePlaceholder(cell) {
  let { id, row, column } = cell;
  return (
    PLACEHOLDER_CHAR +
    diacritic(row) +
    diacritic(column) +
    diacritic(Math.floor(id / (DIACRITIC_COUNT * DIACRITIC_COUNT))) +
    diacritic(Math.floor(id / DIACRITIC_COUNT) % DIACRITIC_COUNT) +
    diacritic(id % DIACRITIC_COUNT)
  );
}
//@ chunk-2avr6cej.js:265992-266158 placement
/**
 * 生成 rows×columns 的占位字素网格文本（每行一串占位字符），放进 Ink 文本里占住图片的位置。
 */
function buildImagePlaceholderGrid(id, columns, rows) {
  assertImageInt(id, MAX_ITERM_IMAGE_ID - 1);
  assertImageInt(columns, MAX_PLACEHOLDER_INDEX);
  assertImageInt(rows, MAX_PLACEHOLDER_INDEX);
  let placeholders = [];
  for (let idx = 0; idx < rows; idx++) {
    let encoded = "";
    for (let idx_2 = 0; idx_2 < columns; idx_2++)
      encoded += encodeImagePlaceholder({
        id,
        row: idx,
        column: idx_2,
      });
    placeholders.push(encoded);
  }
  return placeholders.join(`
`);
}
export { buildImagePlaceholderGrid };

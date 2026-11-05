/**
 * utils/stripAnsi.ts
 *
 * 2.1.316 新增。去除 ANSI。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0eqmdcgk.js (3)
 * attribution: placement 3
 */
import { toWellFormedString } from "./stringUtils.js";

//@ chunk-0eqmdcgk.js:227-266 placement
/**
 * 去掉 ANSI 转义（Bun.stripANSI）。
 */
function stripAnsi(text) {
  return Bun.stripANSI(text);
}
//@ chunk-0eqmdcgk.js:266-311 placement
/**
 * 先转良构再除 ANSI，用于云端文本。
 */
function sanitizeAnsiText(value) {
  return toWellFormedString(stripAnsi(toWellFormedString(String(value))));
}
//@ chunk-0eqmdcgk.js:311-387 placement
/**
 * 逐段除 ANSI，保留换行与分隔符。
 */
function stripAnsiPerLine(text) {
  return text.replace(/[^\n\r\v\f\x85\u2028\u2029]+/g, (line) => stripAnsi(line));
}
export { stripAnsi, stripAnsiPerLine, sanitizeAnsiText };

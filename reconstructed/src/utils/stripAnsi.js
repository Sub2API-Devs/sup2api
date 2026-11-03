/**
 * utils/stripAnsi.ts
 *
 * 2.1.316 新增。去除 ANSI。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-58wc6nbw.js (3)
 * attribution: placement 3
 */
import { toWellFormedString } from "./stringUtils.js";

//@ chunk-58wc6nbw.js:227-266 placement
/**
 * 去掉 ANSI 转义（Bun.stripANSI）。
 */
function stripAnsi(r) {
  return Bun.stripANSI(r);
}
//@ chunk-58wc6nbw.js:266-311 placement
/**
 * 先转良构再除 ANSI，用于云端文本。
 */
function sanitizeAnsiText(r) {
  return toWellFormedString(stripAnsi(toWellFormedString(String(r))));
}
//@ chunk-58wc6nbw.js:311-387 placement
/**
 * 逐段除 ANSI，保留换行与分隔符。
 */
function stripAnsiPerLine(r) {
  return r.replace(/[^\n\r\v\f\x85\u2028\u2029]+/g, (n) => stripAnsi(n));
}
export { stripAnsi, stripAnsiPerLine, sanitizeAnsiText };

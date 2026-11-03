/**
 * components/diff/diffText.ts
 *
 * 2.1.316 新增：diff 行转纯文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yr5hx1r4.js (1)
 * attribution: placement 1
 */
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { Yn } from "../../utils/stripAnsi.js";

//@ chunk-yr5hx1r4.js:264-326 placement
function diffLineToPlainText(t) {
  return stripInvisibleChars(Yn(t)).text.replace(/[\t\n]+/g, " ");
}

export { diffLineToPlainText };

/**
 * vim/motions.ts
 *
 * vim 移动：h l j k gj gk w b e W B E 0 ^ $ G % 及计数解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/motions.ts
 * pieces: chunk-530hfzwb.js (4)
 * attribution: fingerprint 2, layout 2
 */
import { BACKSPACE_KEY } from "./types.js";
import { rIs, Cursor } from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";

/**
 * 执行一次基础移动：h/l 不跨行；空格/退格可跨行；j/k 按逻辑行、gj/gk 按折行后的屏幕行；w b e / W B E 单词移动；0 ^ $ 行首/首个非空/行尾；G 到最后一行；% 跳到行内下一个括号的配对括号。
 */
//@ chunk-530hfzwb.js:3592-4356 fingerprint = applySingleMotion (0.926)
function applySingleMotion(key, cursor) {
  switch (key) {
    case "h":
      return cursor.offset === cursor.startOfLogicalLine().offset ? cursor : cursor.left();
    case "l":
      return cursor.offset === cursor.endOfLogicalLine().offset ? cursor : cursor.right();
    case " ":
      return cursor.right();
    case BACKSPACE_KEY:
      return cursor.left();
    case "j":
      return cursor.downLogicalLine();
    case "k":
      return cursor.upLogicalLine();
    case "gj":
      return cursor.down();
    case "gk":
      return cursor.up();
    case "w":
      return cursor.nextVimWord();
    case "b":
      return cursor.prevVimWord();
    case "e":
      return cursor.endOfVimWord();
    case "W":
      return cursor.nextWORD();
    case "B":
      return cursor.prevWORD();
    case "E":
      return cursor.endOfWORD();
    case "0":
      return cursor.startOfLogicalLine();
    case "^":
      return cursor.firstNonBlankInLogicalLine();
    case "$":
      return cursor.lastCharInLogicalLine();
    case "G":
      return cursor.startOfLastLine();
    case "%": {
      let r = findMatchingBracketOffset(rIs(cursor.text), cursor.offset);
      return r === null ? cursor : new Cursor(cursor.measuredText, r);
    }
    default:
      return cursor;
  }
}
/**
 * % 移动：在光标到行尾之间找第一个 ()[]{}，返回其配对括号的位置。
 */
//@ chunk-530hfzwb.js:4356-4554 layout
function findMatchingBracketOffset(text, offset) {
  let index = text.indexOf(
      `
`,
      offset,
    ),
    n = index === -1 ? text.length : index,
    search = text.slice(offset, n).search(/[()[\]{}]/);
  if (search === -1) return null;
  let o = offset + search,
    i = findTextObject(text, o, text[o], !1);
  if (!i) return null;
  return i.start === o ? i.end - 1 : i.start;
}
//@ chunk-530hfzwb.js:4554-4594 layout
function isInclusiveMotion(e) {
  return "eE$%".includes(e);
}
//@ chunk-530hfzwb.js:4594-4643 fingerprint = isLinewiseMotion (1)
function isLinewiseMotion(key) {
  return "jkG".includes(key) || key === "gg";
}

export { applySingleMotion, isLinewiseMotion, isInclusiveMotion };

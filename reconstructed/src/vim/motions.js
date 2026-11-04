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
import { replaceWithSpaces, Cursor } from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";

//@ chunk-530hfzwb.js:3592-4356 fingerprint = applySingleMotion (0.926)
/**
 * 执行一次基础移动：h/l 不跨行；空格/退格可跨行；j/k 按逻辑行、gj/gk 按折行后的屏幕行；w b e / W B E 单词移动；0 ^ $ 行首/首个非空/行尾；G 到最后一行；% 跳到行内下一个括号的配对括号。
 */
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
      let matchingBracketOffset = findMatchingBracketOffset(replaceWithSpaces(cursor.text), cursor.offset);
      return matchingBracketOffset === null ? cursor : new Cursor(cursor.measuredText, matchingBracketOffset);
    }
    default:
      return cursor;
  }
}
//@ chunk-530hfzwb.js:4356-4554 layout
/**
 * % 移动：在光标到行尾之间找第一个 ()[]{}，返回其配对括号的位置。
 */
function findMatchingBracketOffset(text, offset) {
  let index = text.indexOf(
    `
`,
    offset,
  );
  let lineEnd = index === -1 ? text.length : index;
  let relativeIndex = text.slice(offset, lineEnd).search(/[()[\]{}]/);
  if (relativeIndex === -1) return null;
  let offset_2 = offset + relativeIndex;
  let textObject = findTextObject(text, offset_2, text[offset_2], false);
  if (!textObject) return null;
  return textObject.start === offset_2 ? textObject.end - 1 : textObject.start;
}
//@ chunk-530hfzwb.js:4554-4594 layout
function isInclusiveMotion(key) {
  return "eE$%".includes(key);
}
//@ chunk-530hfzwb.js:4594-4643 fingerprint = isLinewiseMotion (1)
function isLinewiseMotion(key) {
  return "jkG".includes(key) || key === "gg";
}
export { applySingleMotion, isLinewiseMotion, isInclusiveMotion };

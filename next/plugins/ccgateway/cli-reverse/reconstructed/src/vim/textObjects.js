/**
 * vim/textObjects.ts
 *
 * 并入旧版已有路径：vim 文本对象。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/textObjects.ts
 * pieces: chunk-530hfzwb.js (4)
 * attribution: fingerprint 1, placement 3
 */
import { truncateToWidthNoEllipsis } from "../utils/truncate.js";
import { isWordChar, isWhitespaceChar } from "../utils/Cursor.js";

//@ chunk-530hfzwb.js:1194-1381 fingerprint (2.1.88 match: PAIRS, 1)
/**
 * 文本对象的括号/引号配对表：( ) b → ()；[ ] → []；{ } B → {}；< > → <>；" ' ` 成对引号。
 */
var PAIRS = {
  "(": ["(", ")"],
  ")": ["(", ")"],
  b: ["(", ")"],
  "[": ["[", "]"],
  "]": ["[", "]"],
  "{": ["{", "}"],
  "}": ["{", "}"],
  B: ["{", "}"],
  "<": ["<", ">"],
  ">": ["<", ">"],
  '"': ['"', '"'],
  "'": ["'", "'"],
  "`": ["`", "`"],
};
//@ chunk-530hfzwb.js:1381-1555 placement
/**
 * 按类型求文本对象范围：w/W 单词，成对引号在同一行内配对，括号按嵌套深度向外找。
 */
function findTextObject(text, offset, objType, isInner) {
  if (objType === "w") return truncateToWidthNoEllipsis(text, offset, isInner, isWordChar);
  if (objType === "W") return truncateToWidthNoEllipsis(text, offset, isInner, (ch) => !isWhitespaceChar(ch));
  let pair = PAIRS[objType];
  if (pair) {
    let [open, close] = pair;
    return open === close
      ? findQuoteObject(text, offset, open, isInner)
      : findBracketObject(text, offset, open, close, isInner);
  }
  return null;
}
//@ chunk-530hfzwb.js:2385-2681 placement
function findQuoteObject(text, offset, quote, isInner) {
  let lineStart =
    text.lastIndexOf(
      `
`,
      offset - 1,
    ) + 1;
  let lineEnd = text.indexOf(
    `
`,
    offset,
  );
  let effectiveEnd = lineEnd === -1 ? text.length : lineEnd;
  let line = text.slice(lineStart, effectiveEnd);
  let posInLine = offset - lineStart;
  let positions = [];
  for (let i = 0; i < line.length; i++) if (line[i] === quote) positions.push(i);
  for (let i = 0; i < positions.length - 1; i += 2) {
    let openIndex = positions[i];
    let closeIndex = positions[i + 1];
    if (openIndex <= posInLine && posInLine <= closeIndex)
      return isInner
        ? {
            start: lineStart + openIndex + 1,
            end: lineStart + closeIndex,
          }
        : {
            start: lineStart + openIndex,
            end: lineStart + closeIndex + 1,
          };
  }
  return null;
}
//@ chunk-530hfzwb.js:2681-2992 placement
function findBracketObject(text, offset, open, close, isInner) {
  let depth = 0;
  let start = -1;
  for (let i = offset; i >= 0; i--)
    if (text[i] === close && i !== offset) depth++;
    else if (text[i] === open) {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  if (start === -1) return null;
  depth = 0;
  let end = -1;
  for (let i = start + 1; i < text.length; i++)
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      if (depth === 0) {
        end = i;
        break;
      }
      depth--;
    }
  if (end === -1) return null;
  return isInner
    ? {
        start: start + 1,
        end,
      }
    : {
        start,
        end: end + 1,
      };
}
export { findTextObject };

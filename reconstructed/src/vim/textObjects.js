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
import { xJe, zWe } from "../utils/Cursor.js";

/**
 * 文本对象的括号/引号配对表：( ) b → ()；[ ] → []；{ } B → {}；< > → <>；" ' ` 成对引号。
 */
//@ chunk-530hfzwb.js:1194-1381 fingerprint = PAIRS (1)
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
/**
 * 按类型求文本对象范围：w/W 单词，成对引号在同一行内配对，括号按嵌套深度向外找。
 */
//@ chunk-530hfzwb.js:1381-1555 placement
function findTextObject(text, offset, objType, isInner) {
  if (objType === "w") return truncateToWidthNoEllipsis(text, offset, isInner, xJe);
  if (objType === "W") return truncateToWidthNoEllipsis(text, offset, isInner, (ch) => !zWe(ch));
  let pair = PAIRS[objType];
  if (pair) {
    let [o, i] = pair;
    return o === i
      ? findQuoteObject(text, offset, o, isInner)
      : findBracketObject(text, offset, o, i, isInner);
  }
  return null;
}
//@ chunk-530hfzwb.js:2385-2681 placement
function findQuoteObject(text, offset, quote, isInner) {
  let s =
      text.lastIndexOf(
        `
`,
        offset - 1,
      ) + 1,
    index = text.indexOf(
      `
`,
      offset,
    ),
    effectiveEnd = index === -1 ? text.length : index,
    line = text.slice(s, effectiveEnd),
    f = offset - s,
    positions = [];
  for (let p = 0; p < line.length; p++) if (line[p] === quote) positions.push(p);
  for (let p = 0; p < positions.length - 1; p += 2) {
    let h = positions[p],
      x = positions[p + 1];
    if (h <= f && f <= x)
      return isInner ? { start: s + h + 1, end: s + x } : { start: s + h, end: s + x + 1 };
  }
  return null;
}
//@ chunk-530hfzwb.js:2681-2992 placement
function findBracketObject(text, offset, open, close, isInner) {
  let depth = 0,
    start = -1;
  for (let f = offset; f >= 0; f--)
    if (text[f] === close && f !== offset) depth++;
    else if (text[f] === open) {
      if (depth === 0) {
        start = f;
        break;
      }
      depth--;
    }
  if (start === -1) return null;
  depth = 0;
  let end = -1;
  for (let f = start + 1; f < text.length; f++)
    if (text[f] === open) depth++;
    else if (text[f] === close) {
      if (depth === 0) {
        end = f;
        break;
      }
      depth--;
    }
  if (end === -1) return null;
  return isInner ? { start: start + 1, end: end } : { start: start, end: end + 1 };
}

export { findTextObject };

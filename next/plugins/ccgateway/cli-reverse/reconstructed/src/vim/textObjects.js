/**
 * vim/textObjects.ts
 *
 * 并入旧版已有路径：vim 文本对象。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/textObjects.ts
 * pieces: chunk-880p06ha.js (5)
 * attribution: fingerprint 1, placement 3, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isWordChar, isWhitespaceChar, isPunctuationChar } from "../utils/Cursor.js";
import { getGraphemeSegmenter } from "../utils/intl.js";

//@ chunk-880p06ha.js:1195-1382 fingerprint (2.1.88 match: PAIRS, 1)
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
//@ chunk-880p06ha.js:1382-1556 placement
/**
 * 按类型求文本对象范围：w/W 单词，成对引号在同一行内配对，括号按嵌套深度向外找。
 */
function findTextObject(text, offset, objType, isInner) {
  if (objType === "w") return textObjectAt(text, offset, isInner, isWordChar);
  if (objType === "W") return textObjectAt(text, offset, isInner, (char) => !isWhitespaceChar(char));
  let pair = PAIRS[objType];
  if (pair) {
    let [open, close] = pair;
    return open === close
      ? findQuoteObject(text, offset, open, isInner)
      : findBracketObject(text, offset, open, close, isInner);
  }
  return null;
}
//@ chunk-880p06ha.js:1556-2386 layout
/**
 * 按显示宽度截断文本（不加省略号）。
 */
function textObjectAt(text, offset, isInner, maxWidth) {
  let segments = [];
  for (let { segment, index } of getGraphemeSegmenter().segment(text))
    segments.push({
      segment,
      index,
    });
  if (segments.length === 0) return null;
  let anchorIndex = segments.length - 1;
  for (let k = 0; k < segments.length; k++) {
    let entry = segments[k];
    let nextIndex = k + 1 < segments.length ? segments[k + 1].index : text.length;
    if (offset >= entry.index && offset < nextIndex) {
      anchorIndex = k;
      break;
    }
  }
  let segmentAt = (index) => segments[index]?.segment ?? "";
  let offsetAt = (index) => (index < segments.length ? segments[index].index : text.length);
  let isInlineWhitespaceAt = (index) =>
    segmentAt(index) !==
      `
` && isWhitespaceChar(segmentAt(index));
  let segmentWidthAt = (index) => maxWidth(segmentAt(index));
  let isPunctuationAt = (index) => isPunctuationChar(segmentAt(index));
  let startIndex = anchorIndex;
  let endIndex = anchorIndex;
  if (segmentWidthAt(anchorIndex)) {
    while (startIndex > 0 && segmentWidthAt(startIndex - 1)) startIndex--;
    while (endIndex < segments.length && segmentWidthAt(endIndex)) endIndex++;
  } else if (isWhitespaceChar(segmentAt(anchorIndex))) {
    let isWhitespaceAt = (idx) => isWhitespaceChar(segmentAt(idx));
    let offsetAtTextEnd = offset >= text.length;
    let shouldExpand = isInner && !offsetAtTextEnd ? isInlineWhitespaceAt : isWhitespaceAt;
    while (endIndex < segments.length && shouldExpand(endIndex)) endIndex++;
    let atTextEnd = !isInner && endIndex === segments.length;
    let isWhitespace = offsetAtTextEnd || atTextEnd ? isWhitespaceAt : isInlineWhitespaceAt;
    while (startIndex > 0 && isWhitespace(startIndex - 1)) startIndex--;
    return {
      start: offsetAt(startIndex),
      end: offsetAt(endIndex),
    };
  } else if (isPunctuationAt(anchorIndex)) {
    while (startIndex > 0 && isPunctuationAt(startIndex - 1)) startIndex--;
    while (endIndex < segments.length && isPunctuationAt(endIndex)) endIndex++;
  }
  if (!isInner)
    if (endIndex < segments.length && isInlineWhitespaceAt(endIndex))
      while (endIndex < segments.length && isInlineWhitespaceAt(endIndex)) endIndex++;
    else {
      let wordStart = startIndex;
      while (wordStart > 0 && isInlineWhitespaceAt(wordStart - 1)) wordStart--;
      if (
        wordStart > 0 &&
        segmentAt(wordStart - 1) !==
          `
`
      )
        startIndex = wordStart;
    }
  return {
    start: offsetAt(startIndex),
    end: offsetAt(endIndex),
  };
}
//@ chunk-880p06ha.js:2386-2682 placement
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
//@ chunk-880p06ha.js:2682-2993 placement
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

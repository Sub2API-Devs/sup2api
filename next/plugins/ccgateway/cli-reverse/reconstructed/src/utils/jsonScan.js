/**
 * utils/jsonScan.ts
 *
 * 2.1.316 新增：JSON 扫描
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b3p23hjd.js (17)
 * attribution: placement 17
 */
import { jsonParseRaw } from "./slowOperations.js";

//@ chunk-b3p23hjd.js:227-251 placement
var JSON_LEADING_RE = /^[\t\n\r ]*[[{]/;
//@ chunk-b3p23hjd.js:251-593 placement
/**
 * 统计 JSON 文本的成员数（冒号数），超过粗略上限时再精确扫描字符串外的冒号，超过限制返回 undefined。
 */
function countJsonMembers(text, maxMembers, maxColons = maxMembers) {
  if (!JSON_LEADING_RE.test(text))
    return {
      members: 0,
      outsideStringsOnly: true,
    };
  let colonCount = 0;
  let index = text.indexOf(":");
  while (index !== -1 && colonCount <= maxColons) {
    colonCount++;
    index = text.indexOf(":", index + 1);
  }
  if (colonCount <= maxColons)
    return {
      members: colonCount,
      outsideStringsOnly: false,
    };
  let memberCount = 0;
  for (let j = 0; j < text.length; j++) {
    let code = text.charCodeAt(j);
    if (code === 58) {
      if (++memberCount > maxMembers) return;
    } else if (code === 34) j = closingQuoteIndex(text, j);
  }
  return {
    members: memberCount,
    outsideStringsOnly: true,
  };
}
//@ chunk-b3p23hjd.js:593-900 placement
/**
 * 判断 JSON 文本的嵌套深度是否在限制内（先粗数括号，必要时精确扫描字符串外的括号）。
 */
function isJsonNestingWithin(text, maxDepth) {
  if (!JSON_LEADING_RE.test(text)) return true;
  let approxOpeners = 0;
  for (let opener of ["[", "{"]) {
    let index = text.indexOf(opener);
    while (index !== -1 && approxOpeners <= maxDepth) {
      approxOpeners++;
      index = text.indexOf(opener, index + 1);
    }
  }
  if (approxOpeners <= maxDepth) return true;
  let depth = 0;
  for (let j = 0; j < text.length; j++) {
    let code = text.charCodeAt(j);
    if (code === 91 || code === 123) {
      if (++depth > maxDepth) return false;
    } else if (code === 93 || code === 125) depth--;
    else if (code === 34) j = closingQuoteIndex(text, j);
  }
  return true;
}
//@ chunk-b3p23hjd.js:900-1192 placement
/**
 * 估算 JSON 按给定缩进美化后的长度是否不超过上限。
 */
function fitsWhenPrettyPrinted(text, indentWidth, maxLength) {
  let prettyLength = text.length;
  let depth = 0;
  for (let j = 0; j < text.length && prettyLength <= maxLength; j++) {
    let code = text.charCodeAt(j);
    if (code === 34) j = closingQuoteIndex(text, j);
    else if (code === 91 || code === 123) {
      let code = text.charCodeAt(j + 1);
      if (code === 93 || code === 125) j++;
      else prettyLength += 1 + indentWidth * ++depth;
    } else if (code === 93 || code === 125) prettyLength += 1 + indentWidth * --depth;
    else if (code === 44) prettyLength += 1 + indentWidth * depth;
    else if (code === 58) prettyLength++;
  }
  return prettyLength <= maxLength;
}
//@ chunk-b3p23hjd.js:1192-1203 placement
/**
 * JSON 嵌套深度上限。
 */
var MAX_JSON_NESTING = 64;
//@ chunk-b3p23hjd.js:1203-1358 placement
function closingQuoteIndex(text, startIndex) {
  for (let index = text.indexOf('"', startIndex + 1); index !== -1; index = text.indexOf('"', index + 1)) {
    let backslashRun = 0;
    while (text.charCodeAt(index - 1 - backslashRun) === 92) backslashRun++;
    if (backslashRun % 2 === 0) return index;
  }
  return text.length - 1;
}
//@ chunk-b3p23hjd.js:1358-1409 placement
function isJsonWhitespaceCode(code) {
  return code === 32 || code === 9 || code === 10 || code === 13;
}
//@ chunk-b3p23hjd.js:1409-1424 placement
var JSON_INDENT_WIDTH = 16;
var PRETTY_PRINT_SLACK = 6 * JSON_INDENT_WIDTH;
//@ chunk-b3p23hjd.js:1424-1522 placement
/**
 * 取出顶层 JSON 对象中指定键的原样文本片段。
 */
function sliceTopLevelValues(text, keys) {
  let slices = new Map();
  return scanTopLevelObject(text, (key, valueStart, valueEnd) => {
    if (keys.has(key)) slices.set(key, text.slice(valueStart, valueEnd));
  })
    ? slices
    : undefined;
}
//@ chunk-b3p23hjd.js:1522-1669 placement
/**
 * 对顶层 JSON 对象的每个值调用改写函数并拼回原文，未改动部分保持原样；不是合法对象时返回 undefined。
 */
function rewriteTopLevelValues(text, rewriteValue) {
  let parts = [];
  let copiedUntil = 0;
  return scanTopLevelObject(text, (key, valueStart, valueEnd) => {
    let sliced = text.slice(valueStart, valueEnd);
    let rewritten = rewriteValue(key, sliced);
    if (rewritten !== sliced) {
      parts.push(text.slice(copiedUntil, valueStart), rewritten);
      copiedUntil = valueEnd;
    }
  })
    ? parts.join("") + text.slice(copiedUntil)
    : undefined;
}
//@ chunk-b3p23hjd.js:1669-2162 placement
/**
 * 扫描顶层 JSON 对象的键值对，对每个值回调键名与值的起止位置；格式不符时返回 false。
 */
function scanTopLevelObject(text, onMember) {
  let position = skipJsonWhitespace(text, 0);
  if (text.charCodeAt(position) !== OPEN_BRACE_CODE) return false;
  position = skipJsonWhitespace(text, position + 1);
  if (text.charCodeAt(position) === CLOSE_BRACE_CODE) return isAtEndAfterWhitespace(text, position + 1);
  for (;;) {
    if (text.charCodeAt(position) !== JSON_CHAR_CODES) return false;
    let quoteEnd = stringEndIndex(text, position);
    if (quoteEnd === -1) return false;
    let sliced = text.slice(position + 1, quoteEnd - 1);
    if (sliced.includes("\\"))
      try {
        let decodedKey = jsonParseRaw(text.slice(position, quoteEnd));
        if (typeof decodedKey !== "string") return false;
        sliced = decodedKey;
      } catch {
        return false;
      }
    position = skipJsonWhitespace(text, quoteEnd);
    if (text.charCodeAt(position) !== COLON_CODE) return false;
    position = skipJsonWhitespace(text, position + 1);
    let valueEnd = valueEndIndex(text, position);
    if (valueEnd === -1) return false;
    onMember(sliced, position, valueEnd);
    position = skipJsonWhitespace(text, valueEnd);
    let code = text.charCodeAt(position);
    if (code === COMMA_CODE) {
      position = skipJsonWhitespace(text, position + 1);
      continue;
    }
    if (code === CLOSE_BRACE_CODE) return isAtEndAfterWhitespace(text, position + 1);
    return false;
  }
}
//@ chunk-b3p23hjd.js:2162-2208 placement
var JSON_CHAR_CODES = 34;
var BACKSLASH_CODE = 92;
var COMMA_CODE = 44;
var COLON_CODE = 58;
var OPEN_BRACE_CODE = 123;
var CLOSE_BRACE_CODE = 125;
var OPEN_BRACKET_CODE = 91;
var CLOSE_BRACKET_CODE = 93;
//@ chunk-b3p23hjd.js:2208-2262 placement
function skipJsonWhitespace(text, position) {
  while (isJsonWhitespaceCode(text.charCodeAt(position))) position++;
  return position;
}
//@ chunk-b3p23hjd.js:2262-2303 placement
function isAtEndAfterWhitespace(text, position) {
  return skipJsonWhitespace(text, position) === text.length;
}
//@ chunk-b3p23hjd.js:2303-2442 placement
function stringEndIndex(text, openQuoteIndex) {
  let quoteIndex = openQuoteIndex;
  for (;;) {
    quoteIndex = text.indexOf('"', quoteIndex + 1);
    if (quoteIndex === -1) return -1;
    let backslashRun = 0;
    while (text.charCodeAt(quoteIndex - 1 - backslashRun) === BACKSLASH_CODE) backslashRun++;
    if ((backslashRun & 1) === 0) return quoteIndex + 1;
  }
}
//@ chunk-b3p23hjd.js:2442-2638 placement
function valueEndIndex(text, start) {
  let code = text.charCodeAt(start);
  if (code === JSON_CHAR_CODES) return stringEndIndex(text, start);
  if (code === OPEN_BRACE_CODE || code === OPEN_BRACKET_CODE) return containerEndIndex(text, start);
  let cursor = start;
  while (cursor < text.length) {
    let code = text.charCodeAt(cursor);
    if (
      code === COMMA_CODE ||
      code === CLOSE_BRACE_CODE ||
      code === CLOSE_BRACKET_CODE ||
      isJsonWhitespaceCode(code)
    )
      break;
    cursor++;
  }
  return cursor === start ? -1 : cursor;
}
//@ chunk-b3p23hjd.js:2638-2832 placement
function containerEndIndex(text, start) {
  let depth = 0;
  let cursor = start;
  while (cursor < text.length) {
    let code = text.charCodeAt(cursor);
    if (code === JSON_CHAR_CODES) {
      cursor = stringEndIndex(text, cursor);
      if (cursor === -1) return -1;
      continue;
    }
    if (code === OPEN_BRACE_CODE || code === OPEN_BRACKET_CODE) depth++;
    else if (code === CLOSE_BRACE_CODE || code === CLOSE_BRACKET_CODE) {
      depth--;
      if (depth === 0) return cursor + 1;
    }
    cursor++;
  }
  return -1;
}
export {
  isJsonNestingWithin,
  countJsonMembers,
  MAX_JSON_NESTING,
  fitsWhenPrettyPrinted,
  sliceTopLevelValues,
  rewriteTopLevelValues,
};

/**
 * utils/jsonScan.ts
 *
 * 2.1.316 新增：JSON 扫描
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g9r4vapd.js (17)
 * attribution: placement 17
 */
import { jsonParseRaw } from "./slowOperations.js";

//@ chunk-g9r4vapd.js:227-251 placement
var JSON_LEADING_RE = /^[\t\n\r ]*[[{]/;
//@ chunk-g9r4vapd.js:251-661 placement
/**
 * 统计 JSON 文本的成员数（冒号数），超过粗略上限时再精确扫描字符串外的冒号，超过限制返回 undefined。
 */
function countJsonMembers(e, i, n = i) {
  if (!JSON_LEADING_RE.test(e))
    return {
      members: 0,
      outsideStringsOnly: true,
    };
  let r = 0;
  let index = e.indexOf(":");
  while (index !== -1 && r <= n) {
    r++;
    index = e.indexOf(":", index + 1);
  }
  if (r <= n)
    return {
      members: r,
      outsideStringsOnly: false,
    };
  let o = 0;
  for (let j = 0; j < e.length; j++) {
    let code = e.charCodeAt(j);
    if (code === 58) {
      if (++o > i) return;
    } else if (code === 34)
      for (j++; j < e.length; j++) {
        let code = e.charCodeAt(j);
        if (code === 34) break;
        if (code === 92) j++;
      }
  }
  return {
    members: o,
    outsideStringsOnly: true,
  };
}
//@ chunk-g9r4vapd.js:661-1036 placement
/**
 * 判断 JSON 文本的嵌套深度是否在限制内（先粗数括号，必要时精确扫描字符串外的括号）。
 */
function isJsonNestingWithin(e, i) {
  if (!JSON_LEADING_RE.test(e)) return true;
  let n = 0;
  for (let t of ["[", "{"]) {
    let index = e.indexOf(t);
    while (index !== -1 && n <= i) {
      n++;
      index = e.indexOf(t, index + 1);
    }
  }
  if (n <= i) return true;
  let r = 0;
  for (let j = 0; j < e.length; j++) {
    let code = e.charCodeAt(j);
    if (code === 91 || code === 123) {
      if (++r > i) return false;
    } else if (code === 93 || code === 125) r--;
    else if (code === 34)
      for (j++; j < e.length; j++) {
        let code = e.charCodeAt(j);
        if (code === 34) break;
        if (code === 92) j++;
      }
  }
  return true;
}
//@ chunk-g9r4vapd.js:1036-1328 placement
/**
 * 估算 JSON 按给定缩进美化后的长度是否不超过上限。
 */
function fitsWhenPrettyPrinted(e, i, n) {
  let r = e.length;
  let t = 0;
  for (let j = 0; j < e.length && r <= n; j++) {
    let code = e.charCodeAt(j);
    if (code === 34) j = closingQuoteIndex(e, j);
    else if (code === 91 || code === 123) {
      let code = e.charCodeAt(j + 1);
      if (code === 93 || code === 125) j++;
      else r += 1 + i * ++t;
    } else if (code === 93 || code === 125) r += 1 + i * --t;
    else if (code === 44) r += 1 + i * t;
    else if (code === 58) r++;
  }
  return r <= n;
}
//@ chunk-g9r4vapd.js:1328-1339 placement
/**
 * JSON 嵌套深度上限。
 */
var MAX_JSON_NESTING = 64;
//@ chunk-g9r4vapd.js:1339-1494 placement
function closingQuoteIndex(e, i) {
  for (let index = e.indexOf('"', i + 1); index !== -1; index = e.indexOf('"', index + 1)) {
    let r = 0;
    while (e.charCodeAt(index - 1 - r) === 92) r++;
    if (r % 2 === 0) return index;
  }
  return e.length - 1;
}
//@ chunk-g9r4vapd.js:1494-1545 placement
function isJsonWhitespaceCode(e) {
  return e === 32 || e === 9 || e === 10 || e === 13;
}
//@ chunk-g9r4vapd.js:1545-1560 placement
var JSON_INDENT_WIDTH = 16;
var PRETTY_PRINT_SLACK = 6 * JSON_INDENT_WIDTH;
//@ chunk-g9r4vapd.js:1560-1658 placement
/**
 * 取出顶层 JSON 对象中指定键的原样文本片段。
 */
function sliceTopLevelValues(e, i) {
  let n = new Map();
  return scanTopLevelObject(e, (r, t, o) => {
    if (i.has(r)) n.set(r, e.slice(t, o));
  })
    ? n
    : undefined;
}
//@ chunk-g9r4vapd.js:1658-1805 placement
/**
 * 对顶层 JSON 对象的每个值调用改写函数并拼回原文，未改动部分保持原样；不是合法对象时返回 undefined。
 */
function rewriteTopLevelValues(e, i) {
  let n = [];
  let r = 0;
  return scanTopLevelObject(e, (t, o, s) => {
    let sliced = e.slice(o, s);
    let f = i(t, sliced);
    if (f !== sliced) {
      n.push(e.slice(r, o), f);
      r = s;
    }
  })
    ? n.join("") + e.slice(r)
    : undefined;
}
//@ chunk-g9r4vapd.js:1805-2298 placement
/**
 * 扫描顶层 JSON 对象的键值对，对每个值回调键名与值的起止位置；格式不符时返回 false。
 */
function scanTopLevelObject(e, i) {
  let n = skipJsonWhitespace(e, 0);
  if (e.charCodeAt(n) !== OPEN_BRACE_CODE) return false;
  n = skipJsonWhitespace(e, n + 1);
  if (e.charCodeAt(n) === CLOSE_BRACE_CODE) return isAtEndAfterWhitespace(e, n + 1);
  for (;;) {
    if (e.charCodeAt(n) !== JSON_CHAR_CODES) return false;
    let r = stringEndIndex(e, n);
    if (r === -1) return false;
    let sliced = e.slice(n + 1, r - 1);
    if (sliced.includes("\\"))
      try {
        let u = jsonParseRaw(e.slice(n, r));
        if (typeof u !== "string") return false;
        sliced = u;
      } catch {
        return false;
      }
    n = skipJsonWhitespace(e, r);
    if (e.charCodeAt(n) !== COLON_CODE) return false;
    n = skipJsonWhitespace(e, n + 1);
    let o = valueEndIndex(e, n);
    if (o === -1) return false;
    i(sliced, n, o);
    n = skipJsonWhitespace(e, o);
    let code = e.charCodeAt(n);
    if (code === COMMA_CODE) {
      n = skipJsonWhitespace(e, n + 1);
      continue;
    }
    if (code === CLOSE_BRACE_CODE) return isAtEndAfterWhitespace(e, n + 1);
    return false;
  }
}
//@ chunk-g9r4vapd.js:2298-2344 placement
var JSON_CHAR_CODES = 34;
var BACKSLASH_CODE = 92;
var COMMA_CODE = 44;
var COLON_CODE = 58;
var OPEN_BRACE_CODE = 123;
var CLOSE_BRACE_CODE = 125;
var OPEN_BRACKET_CODE = 91;
var CLOSE_BRACKET_CODE = 93;
//@ chunk-g9r4vapd.js:2344-2398 placement
function skipJsonWhitespace(e, i) {
  while (isJsonWhitespaceCode(e.charCodeAt(i))) i++;
  return i;
}
//@ chunk-g9r4vapd.js:2398-2439 placement
function isAtEndAfterWhitespace(e, i) {
  return skipJsonWhitespace(e, i) === e.length;
}
//@ chunk-g9r4vapd.js:2439-2578 placement
function stringEndIndex(e, i) {
  let n = i;
  for (;;) {
    n = e.indexOf('"', n + 1);
    if (n === -1) return -1;
    let r = 0;
    while (e.charCodeAt(n - 1 - r) === BACKSLASH_CODE) r++;
    if ((r & 1) === 0) return n + 1;
  }
}
//@ chunk-g9r4vapd.js:2578-2774 placement
function valueEndIndex(e, i) {
  let code = e.charCodeAt(i);
  if (code === JSON_CHAR_CODES) return stringEndIndex(e, i);
  if (code === OPEN_BRACE_CODE || code === OPEN_BRACKET_CODE) return containerEndIndex(e, i);
  let r = i;
  while (r < e.length) {
    let code = e.charCodeAt(r);
    if (
      code === COMMA_CODE ||
      code === CLOSE_BRACE_CODE ||
      code === CLOSE_BRACKET_CODE ||
      isJsonWhitespaceCode(code)
    )
      break;
    r++;
  }
  return r === i ? -1 : r;
}
//@ chunk-g9r4vapd.js:2774-2968 placement
function containerEndIndex(e, i) {
  let n = 0;
  let r = i;
  while (r < e.length) {
    let code = e.charCodeAt(r);
    if (code === JSON_CHAR_CODES) {
      r = stringEndIndex(e, r);
      if (r === -1) return -1;
      continue;
    }
    if (code === OPEN_BRACE_CODE || code === OPEN_BRACKET_CODE) n++;
    else if (code === CLOSE_BRACE_CODE || code === CLOSE_BRACKET_CODE) {
      n--;
      if (n === 0) return r + 1;
    }
    r++;
  }
  return -1;
}
export {
  fitsWhenPrettyPrinted,
  sliceTopLevelValues,
  MAX_JSON_NESTING,
  isJsonNestingWithin,
  countJsonMembers,
  rewriteTopLevelValues,
};

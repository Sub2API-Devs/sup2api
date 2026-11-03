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
var C = /^[\t\n\r ]*[[{]/;
/**
 * 统计 JSON 文本的成员数（冒号数），超过粗略上限时再精确扫描字符串外的冒号，超过限制返回 undefined。
 */
//@ chunk-g9r4vapd.js:251-661 placement
function countJsonMembers(e, i, n = i) {
  if (!C.test(e)) return { members: 0, outsideStringsOnly: !0 };
  let r = 0,
    index = e.indexOf(":");
  while (index !== -1 && r <= n) (r++, (index = e.indexOf(":", index + 1)));
  if (r <= n) return { members: r, outsideStringsOnly: !1 };
  let o = 0;
  for (let s = 0; s < e.length; s++) {
    let code = e.charCodeAt(s);
    if (code === 58) {
      if (++o > i) return;
    } else if (code === 34)
      for (s++; s < e.length; s++) {
        let code = e.charCodeAt(s);
        if (code === 34) break;
        if (code === 92) s++;
      }
  }
  return { members: o, outsideStringsOnly: !0 };
}
/**
 * 判断 JSON 文本的嵌套深度是否在限制内（先粗数括号，必要时精确扫描字符串外的括号）。
 */
//@ chunk-g9r4vapd.js:661-1036 placement
function isJsonNestingWithin(e, i) {
  if (!C.test(e)) return !0;
  let n = 0;
  for (let t of ["[", "{"]) {
    let index = e.indexOf(t);
    while (index !== -1 && n <= i) (n++, (index = e.indexOf(t, index + 1)));
  }
  if (n <= i) return !0;
  let r = 0;
  for (let t = 0; t < e.length; t++) {
    let code = e.charCodeAt(t);
    if (code === 91 || code === 123) {
      if (++r > i) return !1;
    } else if (code === 93 || code === 125) r--;
    else if (code === 34)
      for (t++; t < e.length; t++) {
        let code = e.charCodeAt(t);
        if (code === 34) break;
        if (code === 92) t++;
      }
  }
  return !0;
}
/**
 * 估算 JSON 按给定缩进美化后的长度是否不超过上限。
 */
//@ chunk-g9r4vapd.js:1036-1328 placement
function fitsWhenPrettyPrinted(e, i, n) {
  let r = e.length,
    t = 0;
  for (let o = 0; o < e.length && r <= n; o++) {
    let code = e.charCodeAt(o);
    if (code === 34) o = closingQuoteIndex(e, o);
    else if (code === 91 || code === 123) {
      let code = e.charCodeAt(o + 1);
      if (code === 93 || code === 125) o++;
      else r += 1 + i * ++t;
    } else if (code === 93 || code === 125) r += 1 + i * --t;
    else if (code === 44) r += 1 + i * t;
    else if (code === 58) r++;
  }
  return r <= n;
}
//@ chunk-g9r4vapd.js:1328-1339 placement
var vdi = 64;
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
function d(e) {
  return e === 32 || e === 9 || e === 10 || e === 13;
}
//@ chunk-g9r4vapd.js:1545-1560 placement
var p = 16,
  L = 6 * p;
//@ chunk-g9r4vapd.js:1560-1658 placement
function Bpe(e, i) {
  let n = new Map();
  return scanTopLevelObject(e, (r, t, o) => {
    if (i.has(r)) n.set(r, e.slice(t, o));
  })
    ? n
    : void 0;
}
/**
 * 对顶层 JSON 对象的每个值调用改写函数并拼回原文，未改动部分保持原样；不是合法对象时返回 undefined。
 */
//@ chunk-g9r4vapd.js:1658-1805 placement
function rewriteTopLevelValues(e, i) {
  let n = [],
    r = 0;
  return scanTopLevelObject(e, (t, o, s) => {
    let sliced = e.slice(o, s),
      f = i(t, sliced);
    if (f !== sliced) (n.push(e.slice(r, o), f), (r = s));
  })
    ? n.join("") + e.slice(r)
    : void 0;
}
/**
 * 扫描顶层 JSON 对象的键值对，对每个值回调键名与值的起止位置；格式不符时返回 false。
 */
//@ chunk-g9r4vapd.js:1805-2298 placement
function scanTopLevelObject(e, i) {
  let n = c(e, 0);
  if (e.charCodeAt(n) !== h) return !1;
  if (((n = c(e, n + 1)), e.charCodeAt(n) === l)) return g(e, n + 1);
  for (;;) {
    if (e.charCodeAt(n) !== a) return !1;
    let r = stringEndIndex(e, n);
    if (r === -1) return !1;
    let sliced = e.slice(n + 1, r - 1);
    if (sliced.includes("\\"))
      try {
        let u = jsonParseRaw(e.slice(n, r));
        if (typeof u !== "string") return !1;
        sliced = u;
      } catch {
        return !1;
      }
    if (((n = c(e, r)), e.charCodeAt(n) !== _)) return !1;
    n = c(e, n + 1);
    let o = valueEndIndex(e, n);
    if (o === -1) return !1;
    (i(sliced, n, o), (n = c(e, o)));
    let code = e.charCodeAt(n);
    if (code === b) {
      n = c(e, n + 1);
      continue;
    }
    if (code === l) return g(e, n + 1);
    return !1;
  }
}
//@ chunk-g9r4vapd.js:2298-2344 placement
var a = 34,
  O = 92,
  b = 44,
  _ = 58,
  h = 123,
  l = 125,
  T = 91,
  m = 93;
//@ chunk-g9r4vapd.js:2344-2398 placement
function c(e, i) {
  while (d(e.charCodeAt(i))) i++;
  return i;
}
//@ chunk-g9r4vapd.js:2398-2439 placement
function g(e, i) {
  return c(e, i) === e.length;
}
//@ chunk-g9r4vapd.js:2439-2578 placement
function stringEndIndex(e, i) {
  let n = i;
  for (;;) {
    if (((n = e.indexOf('"', n + 1)), n === -1)) return -1;
    let r = 0;
    while (e.charCodeAt(n - 1 - r) === O) r++;
    if ((r & 1) === 0) return n + 1;
  }
}
//@ chunk-g9r4vapd.js:2578-2774 placement
function valueEndIndex(e, i) {
  let code = e.charCodeAt(i);
  if (code === a) return stringEndIndex(e, i);
  if (code === h || code === T) return containerEndIndex(e, i);
  let r = i;
  while (r < e.length) {
    let code = e.charCodeAt(r);
    if (code === b || code === l || code === m || d(code)) break;
    r++;
  }
  return r === i ? -1 : r;
}
//@ chunk-g9r4vapd.js:2774-2968 placement
function containerEndIndex(e, i) {
  let n = 0,
    r = i;
  while (r < e.length) {
    let code = e.charCodeAt(r);
    if (code === a) {
      if (((r = stringEndIndex(e, r)), r === -1)) return -1;
      continue;
    }
    if (code === h || code === T) n++;
    else if (code === l || code === m) {
      if ((n--, n === 0)) return r + 1;
    }
    r++;
  }
  return -1;
}

export { fitsWhenPrettyPrinted, Bpe, vdi, isJsonNestingWithin, countJsonMembers, rewriteTopLevelValues };

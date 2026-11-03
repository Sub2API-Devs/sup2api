/**
 * utils/truncateGraphemes.ts
 *
 * 2.1.316 新增：按字素截断每行；图片尺寸与大小上限等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (26)
 * attribution: placement 26
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { getGraphemeSegmenter } from "./intl.js";
import { Che } from "../ink/wrapAnsi.js";

//@ chunk-t0gq9gyw.js:2230-2284 placement
var nOi = 10485760,
  rOi = 2000,
  oOi = 2000,
  aQt = 3000,
  vY = 512000;
//@ chunk-t0gq9gyw.js:2284-2438 placement
var DIRECT_MEDIA_LIMITS = { imageMaxRawBytes: 307200, wholePdfMaxRawBytes: 0, pdfMaxPagesPerRead: 3 },
  RELAY_MEDIA_LIMITS = { imageMaxRawBytes: 512000, wholePdfMaxRawBytes: 2500000, pdfMaxPagesPerRead: 6 };
/**
 * 按发送路径（session/relay 或 bridge/direct）取媒体大小限制。
 */
//@ chunk-t0gq9gyw.js:2438-2565 placement
function mediaLimitsForRoute(e) {
  switch (e) {
    case "session":
    case "relay":
      return RELAY_MEDIA_LIMITS;
    case "bridge":
    case "direct":
      return DIRECT_MEDIA_LIMITS;
    default: {
      let n = e;
      return DIRECT_MEDIA_LIMITS;
    }
  }
}
//@ chunk-t0gq9gyw.js:2565-2575 placement
var vt = 28;
/**
 * 图片切块数量。
 */
//@ chunk-t0gq9gyw.js:2575-2655 placement
function imageTileCount(e, n) {
  if (e <= 0 || n <= 0) return 0;
  return Math.ceil(e / vt) * Math.ceil(n / vt);
}
/**
 * 图片尺寸与大小上限。
 */
//@ chunk-t0gq9gyw.js:2655-2904 placement
var IMAGE_LIMITS = { maxWidth: 2000, maxHeight: 2000, maxBase64Size: 5242880, targetRawSize: 3932160 },
  put = 33554432,
  vSr = 20971520,
  sOi = 100,
  OMn = 104857600,
  H8 = 20,
  mut = 10,
  iOi = 100,
  Alo = 600,
  Bhs = 20,
  aOi = [510, 255, 127],
  lOi = 78643200,
  jhs = put - 8388608,
  dOi = 25165824,
  Whs = 10485760,
  MMn = 64000;
//@ chunk-t0gq9gyw.js:3025-3094 placement
function Ct(e) {
  if (e === 9 || e === 10) return !1;
  return e < 32 || (e >= 127 && e <= 159);
}
//@ chunk-t0gq9gyw.js:3094-3161 placement
function At(e) {
  return e === 1564 || (e >= 8234 && e <= 8238) || (e >= 8294 && e <= 8297);
}
//@ chunk-t0gq9gyw.js:3161-3204 placement
function Nr(e) {
  return e === 65038 || e === 65039;
}
//@ chunk-t0gq9gyw.js:3204-3245 placement
function jr(e) {
  return e >= 55296 && e <= 57343;
}
//@ chunk-t0gq9gyw.js:3245-3373 placement
function graphemeWidth(e) {
  let codePoint = e.codePointAt(0);
  if (e.length === 1) {
    if (codePoint <= 31) return 0;
    if (At(codePoint)) return 1;
  }
  let r = bunStringWidth(e);
  return r === 0 ? 0 : r === 1 ? 1 : r;
}
//@ chunk-t0gq9gyw.js:3373-3434 placement
var RMt = 4096,
  X1e = /\u2026 \[\+\d+ graphemes\]/,
  Mr = 4064,
  Br = 256;
/**
 * 把过长的行按字素切分换行（每段长度有上限），短文本原样返回。
 */
//@ chunk-t0gq9gyw.js:3434-3698 placement
function wrapLongLines(e) {
  if (e.length <= RMt) return e;
  return e
    .split(
      `
`,
    )
    .map((n) => {
      if (n.length <= RMt) return n;
      let r = [],
        o = "";
      for (let { segment: segment } of getGraphemeSegmenter().segment(n))
        if (o.length > 0 && o.length + segment.length > Br) (r.push(o), (o = segment));
        else o += segment;
      if (o.length > 0) r.push(o);
      return r.join(`
`);
    }).join(`
`);
}
//@ chunk-t0gq9gyw.js:3698-3822 placement
function hasConsistentWidths(e) {
  let n = "",
    r = 0;
  for (let { segment: segment } of getGraphemeSegmenter().segment(e)) {
    n += segment;
    let s = bunStringWidth(n),
      a = s - r;
    if (((r = s), a !== graphemeWidth(segment))) return !1;
  }
  return !0;
}
//@ chunk-t0gq9gyw.js:3822-3953 placement
function replaceMismeasuredGraphemes(e) {
  let n = "",
    r = "",
    o = 0;
  for (let { segment: segment } of getGraphemeSegmenter().segment(e)) {
    r += segment;
    let a = bunStringWidth(r),
      c = a - o;
    ((o = a), (n += c === graphemeWidth(segment) ? segment : "\uFFFD"));
  }
  return n;
}
//@ chunk-t0gq9gyw.js:3953-4119 placement
function normalizeGraphemeWidths(e) {
  let n = e;
  for (let r = 0; r < 16; r++) {
    if (hasConsistentWidths(n)) return n;
    let o = replaceMismeasuredGraphemes(n);
    if (o === n) break;
    n = o;
  }
  if (hasConsistentWidths(n)) return n;
  return [...getGraphemeSegmenter().segment(n)].map(() => "\uFFFD").join("");
}
//@ chunk-t0gq9gyw.js:4119-4226 placement
function takeGraphemesUpTo(e, n) {
  let r = "";
  for (let { segment: segment } of getGraphemeSegmenter().segment(e)) {
    if (r.length + segment.length > n) break;
    r += segment;
  }
  return r;
}
//@ chunk-t0gq9gyw.js:4226-4257 placement
function Kr(e) {
  return truncateGraphemesSafe(e, Mr);
}
//@ chunk-t0gq9gyw.js:4257-4405 placement
function truncateGraphemesSafe(e, n) {
  let r = takeGraphemesUpTo(e, n);
  if (r.length > 0) return r;
  let min = Math.min(n, e.length),
    code = e.charCodeAt(min - 1);
  if (code >= 55296 && code <= 56319) min -= 1;
  return e.slice(0, min);
}
//@ chunk-t0gq9gyw.js:4405-4442 placement
var Wr = 4 * RMt * RMt,
  st = 1024,
  $r = 64 * st * st;
/**
 * 按字素截断每行。
 */
//@ chunk-t0gq9gyw.js:4442-5054 placement
function truncateLinesByGraphemes(e) {
  let n = Wr,
    r = $r,
    o = (s) => [...getGraphemeSegmenter().segment(s)].length;
  return e
    .split(
      `
`,
    )
    .map((s) => {
      if (s === "") return s;
      if (/^\u2026 \[\+\d+ graphemes\]$/.test(s)) return s;
      let match = s.match(/\u2026 \[\+\d+ graphemes\]$/),
        c = match ? match[0] : "",
        u = match ? s.slice(0, s.length - c.length) : s,
        p = u.length > RMt,
        y = p ? Kr(u) : u,
        w = p ? `\u2026 [+${o(u.slice(y.length))} graphemes]` : "",
        E = y.length + w.length + c.length,
        h = E * E;
      if (h <= n) return ((n -= h), normalizeGraphemeWidths(y) + w + c);
      let b = truncateGraphemesSafe(u, st),
        v = b.length < u.length ? `\u2026 [+${o(u.slice(b.length))} graphemes]` : "",
        _ = b.length + v.length + c.length,
        R = _ * _;
      if (b.length > 0 && R <= r) return ((r -= R), normalizeGraphemeWidths(b) + v + c);
      return `\u2026 [+${o(u)} graphemes]` + c;
    }).join(`
`);
}
/**
 * 是否全部为可打印字符。
 */
//@ chunk-t0gq9gyw.js:5054-5137 placement
function isAllPrintable(e) {
  for (let n = 0; n < e.length; n++) if (Ct(e.charCodeAt(n))) return !1;
  return !0;
}
/**
 * 去除不可打印字符。
 */
//@ chunk-t0gq9gyw.js:5137-5168 placement
function stripNonPrintable(e) {
  return sanitizeDisplayChars(e, !0);
}
/**
 * 清理显示文本：删除特定字符，把不可显示字符替换为 U+FFFD，可选按字素截断行。
 */
//@ chunk-t0gq9gyw.js:5168-5315 placement
function sanitizeDisplayChars(e, n) {
  let r = "";
  for (let s of e) {
    let codePoint = s.codePointAt(0);
    if (Nr(codePoint)) continue;
    r += Ct(codePoint) || At(codePoint) || jr(codePoint) ? "\uFFFD" : s;
  }
  let o = Che(r);
  return n ? truncateLinesByGraphemes(o) : o;
}
//@ chunk-t0gq9gyw.js:5315-5333 placement
var Vr = /\p{DI}/gu;
/**
 * 去除变体选择符。
 */
//@ chunk-t0gq9gyw.js:5333-5373 placement
function stripVariationSelectors(e) {
  return e.replace(Vr, "");
}

export {
  Alo,
  mut,
  H8,
  stripNonPrintable,
  X1e,
  IMAGE_LIMITS,
  RMt,
  MMn,
  Whs,
  jhs,
  lOi,
  dOi,
  iOi,
  Bhs,
  aOi,
  stripVariationSelectors,
  vY,
  aQt,
  isAllPrintable,
  mediaLimitsForRoute,
  imageTileCount,
  sOi,
  vSr,
  OMn,
  put,
  rOi,
  oOi,
  wrapLongLines,
  nOi,
  sanitizeDisplayChars,
};

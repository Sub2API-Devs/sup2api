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
import { expandTabsInText } from "../ink/wrapAnsi.js";

//@ chunk-t0gq9gyw.js:2230-2284 placement
/**
 * 媒体相关上限：base64 字节、PDF 分块尺寸、图片边长与模型副本阈值。
 */
var MAX_MEDIA_BASE64_BYTES = 10485760;
var PDF_TILE_WIDTH = 2000;
var PDF_TILE_HEIGHT = 2000;
var MAX_IMAGE_SIDE_PX = 3000;
var MODEL_COPY_IMAGE_BYTES = 512000;
//@ chunk-t0gq9gyw.js:2284-2438 placement
var DIRECT_MEDIA_LIMITS = {
  imageMaxRawBytes: 307200,
  wholePdfMaxRawBytes: 0,
  pdfMaxPagesPerRead: 3,
};
var RELAY_MEDIA_LIMITS = {
  imageMaxRawBytes: 512000,
  wholePdfMaxRawBytes: 2500000,
  pdfMaxPagesPerRead: 6,
};
//@ chunk-t0gq9gyw.js:2438-2565 placement
/**
 * 按发送路径（session/relay 或 bridge/direct）取媒体大小限制。
 */
function mediaLimitsForRoute(transport) {
  switch (transport) {
    case "session":
    case "relay":
      return RELAY_MEDIA_LIMITS;
    case "bridge":
    case "direct":
      return DIRECT_MEDIA_LIMITS;
    default: {
      let n = transport;
      return DIRECT_MEDIA_LIMITS;
    }
  }
}
//@ chunk-t0gq9gyw.js:2565-2575 placement
var IMAGE_TILE_SIZE_PX = 28;
//@ chunk-t0gq9gyw.js:2575-2655 placement
/**
 * 图片切块数量。
 */
function imageTileCount(e, n) {
  if (e <= 0 || n <= 0) return 0;
  return Math.ceil(e / IMAGE_TILE_SIZE_PX) * Math.ceil(n / IMAGE_TILE_SIZE_PX);
}
//@ chunk-t0gq9gyw.js:2655-2904 placement
/**
 * 图片尺寸与大小上限。
 */
var IMAGE_LIMITS = {
  maxWidth: 2000,
  maxHeight: 2000,
  maxBase64Size: 5242880,
  targetRawSize: 3932160,
};
var MAX_REQUEST_BYTES = 33554432;
var MAX_PDF_BYTES = 20971520;
var MAX_PDF_PAGES = 100;
var MAX_PERSIST_BYTES = 104857600;
var MAX_PDF_PAGES_PER_READ = 20;
var MAX_PDF_PAGES_PER_TURN = 10;
var MAX_MEDIA_ITEMS = 100;
var MAX_MEDIA_ITEMS_LARGE_CONTEXT = 600;
var MEDIA_BYTES_PER_ITEM_SLACK = 20;
var MEDIA_ITEM_COUNT_FALLBACKS = [510, 255, 127];
var MEDIA_TOTAL_BYTES_DEFAULT = 78643200;
var MEDIA_TOTAL_BYTES_ANTHROPIC = MAX_REQUEST_BYTES - 8388608;
var DOCUMENT_TOTAL_BYTES_DEFAULT = 25165824;
var MEDIA_BYTE_CAP_MIN = 10485760;
var MAX_OUTPUT_TOKENS_CAP = 64000;
//@ chunk-t0gq9gyw.js:3025-3094 placement
function isDisallowedControlCode(e) {
  if (e === 9 || e === 10) return false;
  return e < 32 || (e >= 127 && e <= 159);
}
//@ chunk-t0gq9gyw.js:3094-3161 placement
function isFormatControlCode(e) {
  return e === 1564 || (e >= 8234 && e <= 8238) || (e >= 8294 && e <= 8297);
}
//@ chunk-t0gq9gyw.js:3161-3204 placement
function isVariationSelectorCode(e) {
  return e === 65038 || e === 65039;
}
//@ chunk-t0gq9gyw.js:3204-3245 placement
function isSurrogateCode(e) {
  return e >= 55296 && e <= 57343;
}
//@ chunk-t0gq9gyw.js:3245-3373 placement
function graphemeWidth(segment) {
  let codePoint = segment.codePointAt(0);
  if (segment.length === 1) {
    if (codePoint <= 31) return 0;
    if (isFormatControlCode(codePoint)) return 1;
  }
  let r = bunStringWidth(segment);
  return r === 0 ? 0 : r === 1 ? 1 : r;
}
//@ chunk-t0gq9gyw.js:3373-3434 placement
/**
 * 行内字素上限与分段长度常量组（含截断提示正则）。
 */
var MAX_INLINE_GRAPHEME_CHARS = 4096;
var GRAPHEME_TRUNCATION_MARKER_RE = /\u2026 \[\+\d+ graphemes\]/;
var MAX_INLINE_GRAPHEME_CUT = 4064;
var MAX_GRAPHEME_SEGMENT_CHARS = 256;
//@ chunk-t0gq9gyw.js:3434-3698 placement
/**
 * 把过长的行按字素切分换行（每段长度有上限），短文本原样返回。
 */
function wrapLongLines(e) {
  if (e.length <= MAX_INLINE_GRAPHEME_CHARS) return e;
  return e
    .split(
      `
`,
    )
    .map((line) => {
      if (line.length <= MAX_INLINE_GRAPHEME_CHARS) return line;
      let r = [];
      let o = "";
      for (let { segment } of getGraphemeSegmenter().segment(line))
        if (o.length > 0 && o.length + segment.length > MAX_GRAPHEME_SEGMENT_CHARS) {
          r.push(o);
          o = segment;
        } else o += segment;
      if (o.length > 0) r.push(o);
      return r.join(`
`);
    }).join(`
`);
}
//@ chunk-t0gq9gyw.js:3698-3822 placement
function hasConsistentWidths(e) {
  let n = "";
  let r = 0;
  for (let { segment } of getGraphemeSegmenter().segment(e)) {
    n += segment;
    let s = bunStringWidth(n);
    let a = s - r;
    r = s;
    if (a !== graphemeWidth(segment)) return false;
  }
  return true;
}
//@ chunk-t0gq9gyw.js:3822-3953 placement
function replaceMismeasuredGraphemes(e) {
  let n = "";
  let r = "";
  let o = 0;
  for (let { segment } of getGraphemeSegmenter().segment(e)) {
    r += segment;
    let a = bunStringWidth(r);
    let c = a - o;
    o = a;
    n += c === graphemeWidth(segment) ? segment : "\uFFFD";
  }
  return n;
}
//@ chunk-t0gq9gyw.js:3953-4119 placement
function normalizeGraphemeWidths(e) {
  let n = e;
  for (let j = 0; j < 16; j++) {
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
  for (let { segment } of getGraphemeSegmenter().segment(e)) {
    if (r.length + segment.length > n) break;
    r += segment;
  }
  return r;
}
//@ chunk-t0gq9gyw.js:4226-4257 placement
function truncateToInlineCut(e) {
  return truncateGraphemesSafe(e, MAX_INLINE_GRAPHEME_CUT);
}
//@ chunk-t0gq9gyw.js:4257-4405 placement
function truncateGraphemesSafe(e, n) {
  let r = takeGraphemesUpTo(e, n);
  if (r.length > 0) return r;
  let min = Math.min(n, e.length);
  let code = e.charCodeAt(min - 1);
  if (code >= 55296 && code <= 56319) min -= 1;
  return e.slice(0, min);
}
//@ chunk-t0gq9gyw.js:4405-4442 placement
var MAX_WRAP_TOTAL_CHARS = 4 * MAX_INLINE_GRAPHEME_CHARS * MAX_INLINE_GRAPHEME_CHARS;
var MAX_TRUNCATE_LINE_CHARS = 1024;
var MAX_TRUNCATE_TOTAL_CHARS = 64 * MAX_TRUNCATE_LINE_CHARS * MAX_TRUNCATE_LINE_CHARS;
//@ chunk-t0gq9gyw.js:4442-5054 placement
/**
 * 按字素截断每行。
 */
function truncateLinesByGraphemes(e) {
  let n = MAX_WRAP_TOTAL_CHARS;
  let r = MAX_TRUNCATE_TOTAL_CHARS;
  let o = (s) => [...getGraphemeSegmenter().segment(s)].length;
  return e
    .split(
      `
`,
    )
    .map((line) => {
      if (line === "") return line;
      if (/^\u2026 \[\+\d+ graphemes\]$/.test(line)) return line;
      let match = line.match(/\u2026 \[\+\d+ graphemes\]$/);
      let c = match ? match[0] : "";
      let u = match ? line.slice(0, line.length - c.length) : line;
      let p = u.length > MAX_INLINE_GRAPHEME_CHARS;
      let y = p ? truncateToInlineCut(u) : u;
      let w = p ? `\u2026 [+${o(u.slice(y.length))} graphemes]` : "";
      let E = y.length + w.length + c.length;
      let h = E * E;
      if (h <= n) {
        n -= h;
        return normalizeGraphemeWidths(y) + w + c;
      }
      let b = truncateGraphemesSafe(u, MAX_TRUNCATE_LINE_CHARS);
      let v = b.length < u.length ? `\u2026 [+${o(u.slice(b.length))} graphemes]` : "";
      let _ = b.length + v.length + c.length;
      let R = _ * _;
      if (b.length > 0 && R <= r) {
        r -= R;
        return normalizeGraphemeWidths(b) + v + c;
      }
      return `\u2026 [+${o(u)} graphemes]` + c;
    }).join(`
`);
}
//@ chunk-t0gq9gyw.js:5054-5137 placement
/**
 * 是否全部为可打印字符。
 */
function isAllPrintable(script) {
  for (let j = 0; j < script.length; j++) if (isDisallowedControlCode(script.charCodeAt(j))) return false;
  return true;
}
//@ chunk-t0gq9gyw.js:5137-5168 placement
/**
 * 去除不可打印字符。
 */
function stripNonPrintable(e) {
  return sanitizeDisplayChars(e, true);
}
//@ chunk-t0gq9gyw.js:5168-5315 placement
/**
 * 清理显示文本：删除特定字符，把不可显示字符替换为 U+FFFD，可选按字素截断行。
 */
function sanitizeDisplayChars(e, n) {
  let r = "";
  for (let s of e) {
    let codePoint = s.codePointAt(0);
    if (isVariationSelectorCode(codePoint)) continue;
    r +=
      isDisallowedControlCode(codePoint) || isFormatControlCode(codePoint) || isSurrogateCode(codePoint)
        ? "\uFFFD"
        : s;
  }
  let o = expandTabsInText(r);
  return n ? truncateLinesByGraphemes(o) : o;
}
//@ chunk-t0gq9gyw.js:5315-5333 placement
var DEFAULT_IGNORABLE_RE = /\p{DI}/gu;
//@ chunk-t0gq9gyw.js:5333-5373 placement
/**
 * 去除变体选择符。
 */
function stripVariationSelectors(e) {
  return e.replace(DEFAULT_IGNORABLE_RE, "");
}
export {
  MAX_MEDIA_ITEMS_LARGE_CONTEXT,
  MAX_PDF_PAGES_PER_TURN,
  MAX_PDF_PAGES_PER_READ,
  stripNonPrintable,
  GRAPHEME_TRUNCATION_MARKER_RE,
  IMAGE_LIMITS,
  MAX_INLINE_GRAPHEME_CHARS,
  MAX_OUTPUT_TOKENS_CAP,
  MEDIA_BYTE_CAP_MIN,
  MEDIA_TOTAL_BYTES_ANTHROPIC,
  MEDIA_TOTAL_BYTES_DEFAULT,
  DOCUMENT_TOTAL_BYTES_DEFAULT,
  MAX_MEDIA_ITEMS,
  MEDIA_BYTES_PER_ITEM_SLACK,
  MEDIA_ITEM_COUNT_FALLBACKS,
  stripVariationSelectors,
  MODEL_COPY_IMAGE_BYTES,
  MAX_IMAGE_SIDE_PX,
  isAllPrintable,
  mediaLimitsForRoute,
  imageTileCount,
  MAX_PDF_PAGES,
  MAX_PDF_BYTES,
  MAX_PERSIST_BYTES,
  MAX_REQUEST_BYTES,
  PDF_TILE_WIDTH,
  PDF_TILE_HEIGHT,
  wrapLongLines,
  MAX_MEDIA_BASE64_BYTES,
  sanitizeDisplayChars,
};

/**
 * utils/truncateGraphemes.ts
 *
 * 2.1.316 新增：按字素截断每行；图片尺寸与大小上限等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (20)
 * attribution: placement 20
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { getGraphemeSegmenter } from "./intl.js";
import { expandTabsInText } from "../ink/wrapAnsi.js";

//@ chunk-t0gq9gyw.js:3025-3094 placement
function isDisallowedControlCode(code) {
  if (code === 9 || code === 10) return false;
  return code < 32 || (code >= 127 && code <= 159);
}
//@ chunk-t0gq9gyw.js:3094-3161 placement
function isFormatControlCode(code) {
  return code === 1564 || (code >= 8234 && code <= 8238) || (code >= 8294 && code <= 8297);
}
//@ chunk-t0gq9gyw.js:3161-3204 placement
function isVariationSelectorCode(code) {
  return code === 65038 || code === 65039;
}
//@ chunk-t0gq9gyw.js:3204-3245 placement
function isSurrogateCode(code) {
  return code >= 55296 && code <= 57343;
}
//@ chunk-t0gq9gyw.js:3245-3373 placement
function graphemeWidth(segment) {
  let code = segment.codePointAt(0);
  if (segment.length === 1) {
    if (code <= 31) return 0;
    if (isFormatControlCode(code)) return 1;
  }
  let width = bunStringWidth(segment);
  return width === 0 ? 0 : width === 1 ? 1 : width;
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
function wrapLongLines(text) {
  if (text.length <= MAX_INLINE_GRAPHEME_CHARS) return text;
  return text
    .split(
      `
`,
    )
    .map((line) => {
      if (line.length <= MAX_INLINE_GRAPHEME_CHARS) return line;
      let chunks = [];
      let currentChunk = "";
      for (let { segment } of getGraphemeSegmenter().segment(line))
        if (currentChunk.length > 0 && currentChunk.length + segment.length > MAX_GRAPHEME_SEGMENT_CHARS) {
          chunks.push(currentChunk);
          currentChunk = segment;
        } else currentChunk += segment;
      if (currentChunk.length > 0) chunks.push(currentChunk);
      return chunks.join(`
`);
    }).join(`
`);
}
//@ chunk-t0gq9gyw.js:3698-3822 placement
function hasConsistentWidths(text) {
  let accumulated = "";
  let previousWidth = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    accumulated += segment;
    let accumulatedWidth = bunStringWidth(accumulated);
    let deltaWidth = accumulatedWidth - previousWidth;
    previousWidth = accumulatedWidth;
    if (deltaWidth !== graphemeWidth(segment)) return false;
  }
  return true;
}
//@ chunk-t0gq9gyw.js:3822-3953 placement
function replaceMismeasuredGraphemes(text) {
  let result = "";
  let accumulated = "";
  let previousWidth = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    accumulated += segment;
    let accumulatedWidth = bunStringWidth(accumulated);
    let deltaWidth = accumulatedWidth - previousWidth;
    previousWidth = accumulatedWidth;
    result += deltaWidth === graphemeWidth(segment) ? segment : "\uFFFD";
  }
  return result;
}
//@ chunk-t0gq9gyw.js:3953-4119 placement
function normalizeGraphemeWidths(text) {
  let current = text;
  for (let j = 0; j < 16; j++) {
    if (hasConsistentWidths(current)) return current;
    let replaced = replaceMismeasuredGraphemes(current);
    if (replaced === current) break;
    current = replaced;
  }
  if (hasConsistentWidths(current)) return current;
  return [...getGraphemeSegmenter().segment(current)].map(() => "\uFFFD").join("");
}
//@ chunk-t0gq9gyw.js:4119-4226 placement
function takeGraphemesUpTo(text, maxWidth) {
  let taken = "";
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    if (taken.length + segment.length > maxWidth) break;
    taken += segment;
  }
  return taken;
}
//@ chunk-t0gq9gyw.js:4226-4257 placement
function truncateToInlineCut(text) {
  return truncateGraphemesSafe(text, MAX_INLINE_GRAPHEME_CUT);
}
//@ chunk-t0gq9gyw.js:4257-4405 placement
function truncateGraphemesSafe(text, max) {
  let taken = takeGraphemesUpTo(text, max);
  if (taken.length > 0) return taken;
  let min = Math.min(max, text.length);
  let code = text.charCodeAt(min - 1);
  if (code >= 55296 && code <= 56319) min -= 1;
  return text.slice(0, min);
}
//@ chunk-t0gq9gyw.js:4405-4442 placement
var MAX_WRAP_TOTAL_CHARS = 4 * MAX_INLINE_GRAPHEME_CHARS * MAX_INLINE_GRAPHEME_CHARS;
var MAX_TRUNCATE_LINE_CHARS = 1024;
var MAX_TRUNCATE_TOTAL_CHARS = 64 * MAX_TRUNCATE_LINE_CHARS * MAX_TRUNCATE_LINE_CHARS;
//@ chunk-t0gq9gyw.js:4442-5054 placement
/**
 * 按字素截断每行。
 */
function truncateLinesByGraphemes(text) {
  let wrapBudget = MAX_WRAP_TOTAL_CHARS;
  let truncateBudget = MAX_TRUNCATE_TOTAL_CHARS;
  let countGraphemes = (str) => [...getGraphemeSegmenter().segment(str)].length;
  return text
    .split(
      `
`,
    )
    .map((line) => {
      if (line === "") return line;
      if (/^\u2026 \[\+\d+ graphemes\]$/.test(line)) return line;
      let match = line.match(/\u2026 \[\+\d+ graphemes\]$/);
      let suffix = match ? match[0] : "";
      let body = match ? line.slice(0, line.length - suffix.length) : line;
      let needsTruncate = body.length > MAX_INLINE_GRAPHEME_CHARS;
      let cutText = needsTruncate ? truncateToInlineCut(body) : body;
      let cutSuffix = needsTruncate
        ? `\u2026 [+${countGraphemes(body.slice(cutText.length))} graphemes]`
        : "";
      let totalChars = cutText.length + cutSuffix.length + suffix.length;
      let cost = totalChars * totalChars;
      if (cost <= wrapBudget) {
        wrapBudget -= cost;
        return normalizeGraphemeWidths(cutText) + cutSuffix + suffix;
      }
      let safeText = truncateGraphemesSafe(body, MAX_TRUNCATE_LINE_CHARS);
      let safeSuffix =
        safeText.length < body.length
          ? `\u2026 [+${countGraphemes(body.slice(safeText.length))} graphemes]`
          : "";
      let safeTotalChars = safeText.length + safeSuffix.length + suffix.length;
      let safeCost = safeTotalChars * safeTotalChars;
      if (safeText.length > 0 && safeCost <= truncateBudget) {
        truncateBudget -= safeCost;
        return normalizeGraphemeWidths(safeText) + safeSuffix + suffix;
      }
      return `\u2026 [+${countGraphemes(body)} graphemes]` + suffix;
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
function stripNonPrintable(text) {
  return sanitizeDisplayChars(text, true);
}
//@ chunk-t0gq9gyw.js:5168-5315 placement
/**
 * 清理显示文本：删除特定字符，把不可显示字符替换为 U+FFFD，可选按字素截断行。
 */
function sanitizeDisplayChars(text, truncateLines) {
  let result = "";
  for (let char of text) {
    let code = char.codePointAt(0);
    if (isVariationSelectorCode(code)) continue;
    result +=
      isDisallowedControlCode(code) || isFormatControlCode(code) || isSurrogateCode(code) ? "\uFFFD" : char;
  }
  let expanded = expandTabsInText(result);
  return truncateLines ? truncateLinesByGraphemes(expanded) : expanded;
}
//@ chunk-t0gq9gyw.js:5315-5333 placement
var DEFAULT_IGNORABLE_RE = /\p{DI}/gu;
//@ chunk-t0gq9gyw.js:5333-5373 placement
/**
 * 去除变体选择符。
 */
function stripVariationSelectors(text) {
  return text.replace(DEFAULT_IGNORABLE_RE, "");
}
export {
  stripNonPrintable,
  GRAPHEME_TRUNCATION_MARKER_RE,
  MAX_INLINE_GRAPHEME_CHARS,
  stripVariationSelectors,
  isAllPrintable,
  wrapLongLines,
  sanitizeDisplayChars,
};

/**
 * ink/graphemeCells.ts
 *
 * 2.1.316 新增：字符画布网格与宽字符/框线方向位（mermaid 渲染用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (14)
 * attribution: placement 14
 */
//@ chunk-yb0ajcmt.js:4703-6609 placement
/**
 * 字素宽度判定用的字符类：双宽字符、零宽/组合字符、亚太多数传统终端按窄算的字符，以及区域指示符（国旗）。
 */
var WIDE_CHAR_REGEX =
  /[\u1100-\u115F\u231A\u231B\u2329\u232A\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55\u2E80-\u3029\u302E-\u303E\u3041-\u3096\u309B-\u31E3\u31EF-\u3247\u3250-\u4DBF\u4E00-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6\u{16FE0}-\u{16FE3}\u{16FF0}\u{16FF1}\u{17000}-\u{187F7}\u{18800}-\u{18CD5}\u{18D00}-\u{18D08}\u{1AFF0}-\u{1B2FB}\u{1F004}\u{1F0CF}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F200}-\u{1F320}\u{1F32D}-\u{1F335}\u{1F337}-\u{1F37C}\u{1F37E}-\u{1F393}\u{1F3A0}-\u{1F3CA}\u{1F3CF}-\u{1F3D3}\u{1F3E0}-\u{1F3F0}\u{1F3F4}\u{1F3F8}-\u{1F43E}\u{1F440}\u{1F442}-\u{1F4FC}\u{1F4FF}-\u{1F53D}\u{1F54B}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F57A}\u{1F595}\u{1F596}\u{1F5A4}\u{1F5FB}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CC}\u{1F6D0}-\u{1F6D2}\u{1F6D5}-\u{1F6D7}\u{1F6DC}-\u{1F6DF}\u{1F6EB}\u{1F6EC}\u{1F6F4}-\u{1F6FC}\u{1F7E0}-\u{1F7F0}\u{1F90C}-\u{1F93A}\u{1F93C}-\u{1F945}\u{1F947}-\u{1F9FF}\u{1FA70}-\u{1FA88}\u{1FA90}-\u{1FABD}\u{1FABF}-\u{1FAC5}\u{1FACE}-\u{1FADB}\u{1FAE0}-\u{1FAE8}\u{1FAF0}-\u{1FAF8}\u{20000}-\u{3FFFD}]/u;
var ZERO_WIDTH_CHAR_REGEX =
  /[\u00AD\u0300-\u036F\u0600-\u0605\u06DD\u070F\u08E2\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECD\u1AB0-\u1AFF\u1DC0-\u1DFF\u200B-\u200F\u2060-\u2064\u20D0-\u20FF\uFE00-\uFE0F\uFE20-\uFE2F\uFEFF\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/u;
var AMBIGUOUS_WIDTH_CHAR_REGEX =
  /[\p{Mn}\p{Me}\p{Cf}\p{Cn}\p{Co}\u1160-\u11FF\uD7B0-\uD7FF\u2630-\u2637\u268A-\u268F\u302A-\u302D\u3099\u309A\u31E4\u31E5\u4DC0-\u4DFF\u{16FE4}\u{16FF2}-\u{16FF6}\u{187F8}-\u{187FF}\u{18CFF}\u{18D09}-\u{18DF2}\u{1D300}-\u{1D376}\u{1F6D8}\u{1FA89}-\u{1FA8F}\u{1FABE}\u{1FAC6}-\u{1FACD}\u{1FADC}-\u{1FADF}\u{1FAE9}-\u{1FAEF}]/u;
var REGIONAL_INDICATOR_REGEX = /[\u{1F1E6}-\u{1F1FF}]/u;
//@ chunk-yb0ajcmt.js:6609-6667 placement
/**
 * ZWJ 与肤色修饰符
 */
var ZWJ_OR_SKIN_TONE_REGEX = /[\u200D\u{1F3FB}-\u{1F3FF}]/u;
var VARIATION_SELECTOR_RE = /[\uFE0E\uFE0F]/;
//@ chunk-yb0ajcmt.js:6667-6800 placement
var EMOJI_RE = /\p{Emoji}/u;
var NARROW_SAFE_RE = /^[\u0020-\u007E\u00A0-\u00AC\u00AE-\u02FF\u2190-\u22FF\u2500-\u25FC]*$/;
var BR_TAG_RE = /<br\s*\/?>/i;
var WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
//@ chunk-yb0ajcmt.js:6800-6811 placement
/**
 * 单个字素允许的最大显示宽度（超过按 128 处理）。
 */
var MAX_CELL_WIDTH = 128;
//@ chunk-yb0ajcmt.js:6811-7310 placement = getGraphemeSegmenter (0.781)
/**
 * 按字素切分字符串并给出每段显示宽度（处理 emoji、组合字符、全角）。
 */
function segmentGraphemesWithWidth(text) {
  if (NARROW_SAFE_RE.test(text))
    return Array.from(text, (text) => ({
      text,
      width: 1,
    }));
  let segmenter = new Intl.Segmenter(undefined, {
    granularity: "grapheme",
  });
  return Array.from(segmenter.segment(text), ({ segment }) => {
    let list = Array.from(segment, (char) => graphemeCellWidth(char) ?? 1);
    let codePoint = segment.codePointAt(0) ?? 0;
    let isEmoji =
      codePoint >= 8252 &&
      (codePoint < 11264 || codePoint >= 126976) &&
      EMOJI_RE.test(String.fromCodePoint(codePoint));
    let hasVariationSelector =
      VARIATION_SELECTOR_RE.test(segment) && !VARIATION_SELECTOR_RE.test(segment[0] ?? "");
    let width = REGIONAL_INDICATOR_REGEX.test(segment)
      ? Math.min(list.length, 2)
      : segment.includes("\u20E3") || (isEmoji && ZWJ_OR_SKIN_TONE_REGEX.test(segment))
        ? 2
        : hasVariationSelector
          ? list[0] === 2 || (segment.includes("\uFE0F") && codePoint >= 128)
            ? 2
            : 1
          : list.reduce((acc, width) => acc + width, 0);
    return {
      text: segment,
      width,
    };
  });
}
//@ chunk-yb0ajcmt.js:7310-7385 placement
/**
 * 每段都有确定宽度
 */
function isAllNarrowSafe(text) {
  return NARROW_SAFE_RE.test(text) || Array.from(text).every((char) => graphemeCellWidth(char) !== undefined);
}
//@ chunk-yb0ajcmt.js:7385-7439 placement
/**
 * 字符串显示宽度合计
 */
function textDisplayWidth(text) {
  return segmentGraphemesWithWidth(text).reduce((acc, grapheme) => acc + grapheme.width, 0);
}
//@ chunk-yb0ajcmt.js:7439-7673 placement
function parseLabelLines(label) {
  let trimmed = label.trim();
  return (
    trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed
  )
    .split(BR_TAG_RE)
    .map((line) => {
      let cleaned = "";
      for (let char of line) {
        let codePoint = char.codePointAt(0) ?? 0;
        let isControl = codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
        cleaned += isControl ? (codePoint === 9 ? " " : "") : char;
      }
      return cleaned.trim();
    });
}
//@ chunk-yb0ajcmt.js:7673-7813 placement
function identifierWidth(word, tokens) {
  if (tokens.length === 1 && tokens[0] === word) return 0;
  let width = textDisplayWidth(word);
  return Array.from(word).every((char) => WORD_CHAR_RE.test(char)) && width <= 16
    ? width
    : Number.POSITIVE_INFINITY;
}
//@ chunk-yb0ajcmt.js:7813-8003 placement
function graphemeCellWidth(char) {
  let codePoint = char.codePointAt(0) ?? 0;
  let lowBits = codePoint & 127;
  if (
    (codePoint >= 2304 &&
      codePoint <= 3407 &&
      (lowBits <= 2 ||
        (lowBits >= 58 && lowBits <= 77 && lowBits !== 61) ||
        (lowBits >= 81 && lowBits <= 87) ||
        lowBits === 98 ||
        lowBits === 99)) ||
    ZERO_WIDTH_CHAR_REGEX.test(char)
  )
    return 0;
  return AMBIGUOUS_WIDTH_CHAR_REGEX.test(char) ? undefined : WIDE_CHAR_REGEX.test(char) ? 2 : 1;
}
//@ chunk-yb0ajcmt.js:8003-8392 placement
/**
 * 字符画布用的框线方向位（上/左/右与本位）、16 种直线组合的字符表、圆角变体、实线/点线/粗线三套样式，以及画布单元格上限。
 */
var BOX_DIRECTION_BITS = 1;
var BOX_UP_BIT = 2;
var BOX_LEFT_BIT = 4;
var BOX_RIGHT_BIT = 8;
var BOX_LINE_GLYPHS = [
  " ",
  "\u2502",
  "\u2502",
  "\u2502",
  "\u2500",
  "\u2518",
  "\u2510",
  "\u2524",
  "\u2500",
  "\u2514",
  "\u250C",
  "\u251C",
  "\u2500",
  "\u2534",
  "\u252C",
  "\u253C",
];
var BOX_ROUND_CORNERS = {
  [BOX_DIRECTION_BITS | BOX_LEFT_BIT]: "\u256F",
  [BOX_UP_BIT | BOX_LEFT_BIT]: "\u256E",
  [BOX_DIRECTION_BITS | BOX_RIGHT_BIT]: "\u2570",
  [BOX_UP_BIT | BOX_RIGHT_BIT]: "\u256D",
};
var BOX_STYLE_GLYPHS = {
  solid: {
    across: "\u2500",
    down: "\u2502",
  },
  dotted: {
    across: "\u2504",
    down: "\u2506",
  },
  thick: {
    across: "\u2501",
    down: "\u2503",
  },
};
var BOX_STYLES = ["solid", "dotted", "thick"];
var MAX_CANVAS_CELLS = 400000;
//@ chunk-yb0ajcmt.js:8549-8942 placement
function linkCells(canvas, from, to, style = "solid") {
  let inBounds =
    Math.min(from.x, to.x) >= 0 &&
    Math.min(from.y, to.y) >= 0 &&
    Math.max(from.x, to.x) < canvas.width &&
    Math.max(from.y, to.y) < canvas.height;
  let isAdjacent = Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
  if (!inBounds || !isAdjacent) return;
  let fromBits =
    to.x > from.x
      ? BOX_RIGHT_BIT
      : to.x < from.x
        ? BOX_LEFT_BIT
        : to.y > from.y
          ? BOX_UP_BIT
          : BOX_DIRECTION_BITS;
  let toBits =
    fromBits === BOX_RIGHT_BIT
      ? BOX_LEFT_BIT
      : fromBits === BOX_LEFT_BIT
        ? BOX_RIGHT_BIT
        : fromBits === BOX_UP_BIT
          ? BOX_DIRECTION_BITS
          : BOX_UP_BIT;
  let index = BOX_STYLES.indexOf(style);
  for (let [cell, bits] of [
    [from, fromBits],
    [to, toBits],
  ]) {
    let index_2 = cell.y * canvas.width + cell.x;
    canvas.links[index_2] = (canvas.links[index_2] ?? 0) | bits;
    canvas.styles[index_2] = Math.max(canvas.styles[index_2] ?? 0, index);
  }
}
//@ chunk-yb0ajcmt.js:8942-9047 placement = diff (0.775)
function unlinkCell(boxCanvas, toward, cell) {
  let bits =
    cell.x > toward.x
      ? BOX_RIGHT_BIT
      : cell.x < toward.x
        ? BOX_LEFT_BIT
        : cell.y > toward.y
          ? BOX_UP_BIT
          : BOX_DIRECTION_BITS;
  let index = toward.y * boxCanvas.width + toward.x;
  boxCanvas.links[index] = (boxCanvas.links[index] ?? 0) & ~bits;
}
//@ chunk-yb0ajcmt.js:9047-9141 placement
function linkPath(boxCanvas, points, line = "solid") {
  for (let k = 1; k < points.length; k++) {
    let previous = points[k - 1];
    let current = points[k];
    if (previous && current) linkCells(boxCanvas, previous, current, line);
  }
}
export {
  isAllNarrowSafe,
  segmentGraphemesWithWidth,
  linkCells,
  textDisplayWidth,
  BOX_STYLE_GLYPHS,
  BOX_STYLES,
  BOX_DIRECTION_BITS,
  BOX_UP_BIT,
  BOX_LEFT_BIT,
  BOX_RIGHT_BIT,
  BOX_ROUND_CORNERS,
  BOX_LINE_GLYPHS,
  MAX_CANVAS_CELLS,
  linkPath,
  unlinkCell,
  identifierWidth,
  MAX_CELL_WIDTH,
  parseLabelLines,
  WORD_CHAR_RE,
};

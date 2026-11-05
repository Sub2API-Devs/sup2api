/**
 * ink/render-border.ts
 *
 * 并入边框渲染的分段拼接辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/render-border.ts
 * pieces: chunk-2avr6cej.js (4), chunk-ptrwzav4.js (4), chunk-sz26a4x2.js (8)
 * attribution: fingerprint 3, layout 5, placement 5, sole-consumer 3
 */
import { isPlainObject } from "../utils/isPlainObject.js";
import { __toESM } from "../../runtime/bun-runtime.js";
import { cliBoxesModule } from "../../vendor/unresolved-cjs/index.js";
import { squashSingleText } from "./layout/node.js";
import { bunStringWidth } from "./stringWidth.js";
import { sliceAnsiToWidth } from "./styles.js";
import { repeatString } from "../utils/stringUtils.js";
import { applyColor, applyTextStyles } from "./colorize.js";
import { sequential } from "../utils/sequential.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-sz26a4x2.js:1479-1565 sole-consumer
var BOX_KEYS = ["top", "left", "right", "bottom", "topLeft", "topRight", "bottomLeft", "bottomRight"];
//@ chunk-sz26a4x2.js:1565-1619 sole-consumer
var isBoxStyle = (style) => isPlainObject(style) && BOX_KEYS.every((key) => typeof style[key] === "string");
//@ chunk-sz26a4x2.js:1619-1635 sole-consumer
var cliBoxes; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sz26a4x2.js:1619", () => {
  cliBoxes = __toESM(cliBoxesModule(), 1);
});
//@ chunk-sz26a4x2.js:1635-1873 fingerprint (2.1.88 match: CUSTOM_BORDER_STYLES, 0.948)
/**
 * 在 cli-boxes 之外新增的边框样式：dashed（虚线）、quote（只有左侧竖条 ▎，用于引用块）。
 */
var CUSTOM_BORDER_STYLES = {
  dashed: {
    top: "\u254C",
    left: "\u254E",
    right: "\u254E",
    bottom: "\u254C",
    topLeft: " ",
    topRight: " ",
    bottomLeft: " ",
    bottomRight: " ",
  },
  quote: {
    top: " ",
    left: "\u258E",
    right: " ",
    bottom: " ",
    topLeft: " ",
    topRight: " ",
    bottomLeft: " ",
    bottomRight: " ",
  },
};
//@ chunk-sz26a4x2.js:1873-1899 layout
var BORDER_STYLES; // deferred: uses cliBoxes of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sz26a4x2.js:1873", () => {
  BORDER_STYLES = {
    ...cliBoxes.default,
    ...CUSTOM_BORDER_STYLES,
  };
});
//@ chunk-sz26a4x2.js:1899-1989 layout
/**
 * borderStyle 名或自定义字符集 → 八个方向的边框字符；不合法返回 undefined。
 */
function resolveBorderStyle(borderStyle) {
  let style =
    typeof borderStyle === "string" && Object.hasOwn(BORDER_STYLES, borderStyle)
      ? BORDER_STYLES[borderStyle]
      : borderStyle;
  return isBoxStyle(style) ? style : undefined;
}
//@ chunk-sz26a4x2.js:1989-2041 layout
var BORDER_STYLE_NAMES; // deferred: uses BORDER_STYLES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sz26a4x2.js:1989", () => {
  BORDER_STYLE_NAMES = Object.keys(BORDER_STYLES).filter((key) => resolveBorderStyle(key) !== undefined);
});
//@ chunk-sz26a4x2.js:2041-2225 placement
var BIDI_CONTROL_RANGES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var joined;
var regExp;
deferInit("chunk-sz26a4x2.js:2041", () => {
  BIDI_CONTROL_RANGES = Object.freeze([
    [1564, 1564],
    [8234, 8238],
    [8294, 8297],
  ]);
  joined = BIDI_CONTROL_RANGES.map(
    ([start, end]) => `\\u{${start.toString(16)}}` + (end > start ? `-\\u{${end.toString(16)}}` : ""),
  ).join("");
  regExp = new RegExp(`[${joined}]`, "gu");
});
//@ chunk-ptrwzav4.js:7263-7311 placement
function joinRawSegments(segments) {
  return segments.map((segment) => segment.raw).join("");
}
//@ chunk-ptrwzav4.js:7311-7357 placement
/**
 * 行首引用标记
 */
var BLOCKQUOTE_PREFIX_RE = /^[ \t>]+/gm;
var INNER_SPACES_RE = /[ \t]+/g;
var EXCESS_NEWLINES_RE = /\n{3,}/g;
//@ chunk-ptrwzav4.js:7357-7539 placement
function createNestingGuard() {
  let weakMap = new WeakMap();
  let isAtLimit = (key) => (weakMap.get(key) ?? 0) >= 100;
  return {
    isAtMaxNesting: isAtLimit,
    lexLevel: (key, fn) => {
      if (isAtLimit(key)) return;
      let depth = weakMap.get(key) ?? 0;
      weakMap.set(key, depth + 1);
      try {
        return fn();
      } finally {
        weakMap.set(key, depth);
      }
    },
  };
}
//@ chunk-ptrwzav4.js:7539-7634 placement
/**
 * 渲染嵌套深度守卫
 */
var nestingGuard; // deferred: uses createNestingGuard of its import cycle while loading; runs once the cycle is complete
var normalizeBlockText;
deferInit("chunk-ptrwzav4.js:7539", () => {
  nestingGuard = createNestingGuard();
  normalizeBlockText = (text) =>
    text
      .replace(BLOCKQUOTE_PREFIX_RE, (prefix) => prefix.replace(INNER_SPACES_RE, " ").trimStart())
      .replace(
        EXCESS_NEWLINES_RE,
        `

`,
      )
      .trimEnd();
});
//@ chunk-2avr6cej.js:287798-288126 fingerprint (2.1.88 match: embedTextInBorder, 1)
/**
 * 把标题文字嵌进一条边框线：按 start/center/end 与 offset 定位，太长则截断；返回 [左段, 文字, 右段]。
 */
function embedTextInBorder(borderLine, text, align, offset = 0, borderChar) {
  text = squashSingleText(text);
  let textLength = bunStringWidth(text);
  let borderLength = borderLine.length;
  if (textLength >= borderLength - 2) {
    let slice = sliceAnsiToWidth(text, 0, borderLength);
    let filler = borderChar.repeat(Math.max(0, borderLength - bunStringWidth(slice)));
    return ["", slice, filler];
  }
  let position;
  if (align === "center") position = Math.floor((borderLength - textLength) / 2);
  else if (align === "start") position = offset + 1;
  else position = borderLength - textLength - offset - 1;
  position = Math.max(1, Math.min(position, borderLength - textLength - 1));
  let before = borderLine.substring(0, 1) + repeatString(borderChar, position - 1);
  let after =
    repeatString(borderChar, borderLength - position - textLength - 1) +
    borderLine.substring(borderLength - 1);
  return [before, text, after];
}
//@ chunk-2avr6cej.js:288126-288186 layout
function colorBorderSegment(text, color, dim) {
  let styled = applyColor(text, color);
  if (dim) styled = sequential.dim(styled);
  return styled;
}
//@ chunk-2avr6cej.js:288186-288241 layout
function withBorderBackground(text, backgroundColor) {
  return backgroundColor
    ? applyTextStyles(text, {
        backgroundColor,
      })
    : text;
}
//@ chunk-2avr6cej.js:288241-289789 fingerprint (2.1.88 match: renderBorder, 1)
/**
 * 画 ink-box 的边框：按 borderStyle 取字符集，四边可单独关闭、单独着色/变暗；borderText 可把文字嵌进上或下边框；继承的背景色也涂到边框上。
 */
var renderBorder = (x, y, node, output, backgroundColor) => {
  let box = resolveBorderStyle(node.style.borderStyle);
  if (box !== undefined) {
    let width = Math.floor(node.yogaNode.getComputedWidth());
    let height = Math.floor(node.yogaNode.getComputedHeight());
    let topBorderColor = node.style.borderTopColor ?? node.style.borderColor;
    let bottomBorderColor = node.style.borderBottomColor ?? node.style.borderColor;
    let leftBorderColor = node.style.borderLeftColor ?? node.style.borderColor;
    let rightBorderColor = node.style.borderRightColor ?? node.style.borderColor;
    let dimTopBorderColor = node.style.borderTopDimColor ?? node.style.borderDimColor;
    let dimBottomBorderColor = node.style.borderBottomDimColor ?? node.style.borderDimColor;
    let dimLeftBorderColor = node.style.borderLeftDimColor ?? node.style.borderDimColor;
    let dimRightBorderColor = node.style.borderRightDimColor ?? node.style.borderDimColor;
    let showTopBorder = node.style.borderTop !== false;
    let showBottomBorder = node.style.borderBottom !== false;
    let showLeftBorder = node.style.borderLeft !== false;
    let showRightBorder = node.style.borderRight !== false;
    let innerWidth = Math.max(0, width - (showLeftBorder ? 1 : 0) - (showRightBorder ? 1 : 0));
    let topLine = showTopBorder
      ? (showLeftBorder ? box.topLeft : "") +
        box.top.repeat(innerWidth) +
        (showRightBorder ? box.topRight : "")
      : "";
    let styledTop;
    if (showTopBorder && node.style.borderText?.position === "top") {
      let [before, text, after] = embedTextInBorder(
        topLine,
        node.style.borderText.content,
        node.style.borderText.align,
        node.style.borderText.offset,
        box.top,
      );
      styledTop =
        colorBorderSegment(before, topBorderColor, dimTopBorderColor) +
        text +
        colorBorderSegment(after, topBorderColor, dimTopBorderColor);
    } else if (showTopBorder) styledTop = colorBorderSegment(topLine, topBorderColor, dimTopBorderColor);
    let sideHeight = height;
    if (showTopBorder) sideHeight -= 1;
    if (showBottomBorder) sideHeight -= 1;
    sideHeight = Math.max(0, sideHeight);
    let leftColumn = (
      applyColor(box.left, leftBorderColor) +
      `
`
    ).repeat(sideHeight);
    if (dimLeftBorderColor) leftColumn = sequential.dim(leftColumn);
    let rightColumn = (
      applyColor(box.right, rightBorderColor) +
      `
`
    ).repeat(sideHeight);
    if (dimRightBorderColor) rightColumn = sequential.dim(rightColumn);
    let bottomLine = showBottomBorder
      ? (showLeftBorder ? box.bottomLeft : "") +
        box.bottom.repeat(innerWidth) +
        (showRightBorder ? box.bottomRight : "")
      : "";
    let styledBottom;
    if (showBottomBorder && node.style.borderText?.position === "bottom") {
      let [before, text, after] = embedTextInBorder(
        bottomLine,
        node.style.borderText.content,
        node.style.borderText.align,
        node.style.borderText.offset,
        box.bottom,
      );
      styledBottom =
        colorBorderSegment(before, bottomBorderColor, dimBottomBorderColor) +
        text +
        colorBorderSegment(after, bottomBorderColor, dimBottomBorderColor);
    } else if (showBottomBorder)
      styledBottom = colorBorderSegment(bottomLine, bottomBorderColor, dimBottomBorderColor);
    let offsetY = showTopBorder ? 1 : 0;
    if (styledTop) output.write(x, y, withBorderBackground(styledTop, backgroundColor));
    if (showLeftBorder) output.write(x, y + offsetY, withBorderBackground(leftColumn, backgroundColor));
    if (showRightBorder)
      output.write(x + width - 1, y + offsetY, withBorderBackground(rightColumn, backgroundColor));
    if (styledBottom) output.write(x, y + height - 1, withBorderBackground(styledBottom, backgroundColor));
  }
};
var renderBorderAlias = renderBorder;
export {
  joined,
  regExp,
  resolveBorderStyle,
  renderBorderAlias,
  BIDI_CONTROL_RANGES,
  joinRawSegments,
  BORDER_STYLE_NAMES,
  nestingGuard,
  normalizeBlockText,
};

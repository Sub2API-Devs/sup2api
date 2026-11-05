/**
 * ink/styles.ts
 *
 * 并入已有模块：把 overflow/margin/padding 等样式应用到 yoga 节点的函数组；省略号字符。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/styles.ts
 * pieces: chunk-2avr6cej.js (5)
 * attribution: fingerprint 2, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  toYogaPositionType,
  toYogaWrap,
  toYogaFlexDirection,
  toYogaAlign,
  toYogaJustify,
  toYogaDisplay,
} from "./layout/node.js";
import { resolveBorderStyle } from "./render-border.js";
import { bunStringWidth } from "./stringWidth.js";

//@ chunk-2avr6cej.js:177616-177804 fingerprint (2.1.88 match: applyPositionStyles, 0.943)
/**
 * 把 position/top/bottom/left/right 样式写进 yoga 节点。
 */
var applyPositionStyles = (node, style) => {
  if ("position" in style) node.setPositionType(toYogaPositionType(style.position));
  if ("top" in style) applyPositionEdge(node, 1, style.top);
  if ("bottom" in style) applyPositionEdge(node, 3, style.bottom);
  if ("left" in style) applyPositionEdge(node, 0, style.left);
  if ("right" in style) applyPositionEdge(node, 2, style.right);
};
//@ chunk-2avr6cej.js:177804-177972 fingerprint (2.1.88 match: applyPositionEdge, 1)
/**
 * 写一个定位边：字符串按百分比、数字按点、其它清空（NaN）。
 */
function applyPositionEdge(node, edge, v) {
  if (typeof v === "string") node.setPositionPercent(edge, Number.parseInt(v, 10));
  else if (typeof v === "number") node.setPosition(edge, v);
  else node.setPosition(edge, Number.NaN);
}
//@ chunk-2avr6cej.js:177972-181224 placement
/**
 * 把 ink 样式映射到 yoga 节点：overflow、margin、padding、flex、宽高与 min/max、display、边框与 gap；$x 汇总全部。
 */
var applyOverflowStyles = (node, style) => {
  let y = style.overflowY ?? style.overflow;
  let x = style.overflowX ?? style.overflow;
  if (y === "scroll" || x === "scroll") node.setOverflow(2);
  else if (y === "hidden" || x === "hidden") node.setOverflow(1);
  else if ("overflow" in style || "overflowX" in style || "overflowY" in style) node.setOverflow(0);
};
var applyMarginStyles = (node, style) => {
  if ("margin" in style) node.setMargin(8, style.margin);
  if ("marginX" in style) node.setMargin(6, style.marginX);
  if ("marginY" in style) node.setMargin(7, style.marginY);
  if ("marginLeft" in style) {
    let marginLeft = style.marginLeft;
    if (marginLeft === "auto") node.setMarginAuto(4);
    else node.setMargin(4, marginLeft);
  }
  if ("marginRight" in style) {
    let marginRight = style.marginRight;
    if (marginRight === "auto") node.setMarginAuto(5);
    else node.setMargin(5, marginRight);
  }
  if ("marginTop" in style) node.setMargin(1, style.marginTop);
  if ("marginBottom" in style) node.setMargin(3, style.marginBottom);
};
var applyPaddingStyles = (node, style) => {
  if ("padding" in style) node.setPadding(8, style.padding);
  if ("paddingX" in style) node.setPadding(6, style.paddingX);
  if ("paddingY" in style) node.setPadding(7, style.paddingY);
  if ("paddingLeft" in style) node.setPadding(0, style.paddingLeft);
  if ("paddingRight" in style) node.setPadding(2, style.paddingRight);
  if ("paddingTop" in style) node.setPadding(1, style.paddingTop);
  if ("paddingBottom" in style) node.setPadding(3, style.paddingBottom);
};
var applyFlexStyles = (node, style) => {
  if ("flexGrow" in style) node.setFlexGrow(style.flexGrow ?? 0);
  if ("flexShrink" in style) {
    let flexShrink = style.flexShrink;
    node.setFlexShrink(typeof flexShrink === "number" ? flexShrink : 1);
  }
  if ("flexWrap" in style) node.setFlexWrap(toYogaWrap(style.flexWrap));
  if ("flexDirection" in style) node.setFlexDirection(toYogaFlexDirection(style.flexDirection));
  if ("flexBasis" in style) {
    let flexBasis = style.flexBasis;
    if (typeof flexBasis === "number") node.setFlexBasis(flexBasis);
    else if (typeof flexBasis === "string") node.setFlexBasisPercent(Number.parseInt(flexBasis, 10));
    else node.setFlexBasis(Number.NaN);
  }
  if ("alignItems" in style) node.setAlignItems(toYogaAlign(style.alignItems, 4));
  if ("alignSelf" in style) node.setAlignSelf(toYogaAlign(style.alignSelf, 0));
  if ("justifyContent" in style) node.setJustifyContent(toYogaJustify(style.justifyContent));
};
var applyDimensionStyles = (node, style) => {
  if ("width" in style) {
    let width = style.width;
    if (typeof width === "number") node.setWidth(width);
    else if (typeof width === "string") node.setWidthPercent(Number.parseInt(width, 10));
    else node.setWidthAuto();
  }
  if ("height" in style) {
    let height = style.height;
    if (typeof height === "number") node.setHeight(height);
    else if (typeof height === "string") node.setHeightPercent(Number.parseInt(height, 10));
    else node.setHeightAuto();
  }
  if ("minWidth" in style) {
    let minWidth = style.minWidth;
    if (typeof minWidth === "string") node.setMinWidthPercent(Number.parseInt(minWidth, 10));
    else node.setMinWidth(minWidth ?? 0);
  }
  if ("minHeight" in style) {
    let minHeight = style.minHeight;
    if (typeof minHeight === "string") node.setMinHeightPercent(Number.parseInt(minHeight, 10));
    else node.setMinHeight(minHeight ?? 0);
  }
  if ("maxWidth" in style) {
    let maxWidth = style.maxWidth;
    if (typeof maxWidth === "string") node.setMaxWidthPercent(Number.parseInt(maxWidth, 10));
    else node.setMaxWidth(maxWidth);
  }
  if ("maxHeight" in style) {
    let maxHeight = style.maxHeight;
    if (typeof maxHeight === "string") node.setMaxHeightPercent(Number.parseInt(maxHeight, 10));
    else node.setMaxHeight(maxHeight);
  }
};
var applyDisplayStyle = (node, style) => {
  if ("display" in style) node.setDisplay(toYogaDisplay(style.display));
};
var applyBorderStyles = (node, style, resolvedStyle) => {
  let resolved = resolvedStyle ?? style;
  if ("borderStyle" in style) {
    let borderWidth = resolveBorderStyle(style.borderStyle) ? 1 : 0;
    node.setBorder(1, resolved.borderTop !== false ? borderWidth : 0);
    node.setBorder(3, resolved.borderBottom !== false ? borderWidth : 0);
    node.setBorder(0, resolved.borderLeft !== false ? borderWidth : 0);
    node.setBorder(2, resolved.borderRight !== false ? borderWidth : 0);
  } else {
    let borderWidth = resolveBorderStyle(resolved.borderStyle) ? 1 : 0;
    if ("borderTop" in style) node.setBorder(1, style.borderTop === false ? 0 : borderWidth);
    if ("borderBottom" in style) node.setBorder(3, style.borderBottom === false ? 0 : borderWidth);
    if ("borderLeft" in style) node.setBorder(0, style.borderLeft === false ? 0 : borderWidth);
    if ("borderRight" in style) node.setBorder(2, style.borderRight === false ? 0 : borderWidth);
  }
};
var applyGapStyles = (node, style) => {
  if ("gap" in style) node.setGap(2, style.gap);
  if ("columnGap" in style) node.setGap(0, style.columnGap);
  if ("rowGap" in style) node.setGap(1, style.rowGap);
};
var applyAllStyles = (node, style = {}, resolvedStyle) => {
  applyPositionStyles(node, style);
  applyOverflowStyles(node, style);
  applyMarginStyles(node, style);
  applyPaddingStyles(node, style);
  applyFlexStyles(node, style);
  applyDimensionStyles(node, style);
  applyDisplayStyle(node, style);
  applyBorderStyles(node, style, resolvedStyle);
  applyGapStyles(node, style);
};
var applyAllStylesAlias = applyAllStyles;
//@ chunk-2avr6cej.js:181224-181241 placement
/**
 * 省略号字符。
 */
var ELLIPSIS = "\u2026";
//@ chunk-2avr6cej.js:181241-181344 placement
/**
 * 按显示宽度截取含 ANSI 的字符串：先 Bun.sliceAnsi，宽度超出时逐个缩短终点直到不超过 end-start 列。
 */
function sliceAnsiToWidth(text, from, to) {
  let sliced = Bun.sliceAnsi(text, from, to);
  while (to > from && bunStringWidth(sliced) > to - from) {
    to--;
    sliced = Bun.sliceAnsi(text, from, to);
  }
  return sliced;
}
export { sliceAnsiToWidth, ELLIPSIS, applyAllStylesAlias };

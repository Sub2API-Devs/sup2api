/**
 * ink/styles.ts
 *
 * 并入已有模块：把 overflow/margin/padding 等样式应用到 yoga 节点的函数组；省略号字符。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/styles.ts
 * pieces: chunk-bzr73sfg.js (5)
 * attribution: fingerprint 2, placement 3
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

/**
 * 把 position/top/bottom/left/right 样式写进 yoga 节点。
 */
//@ chunk-bzr73sfg.js:177867-178055 fingerprint = applyPositionStyles (0.943)
var applyPositionStyles = (node, style) => {
  if ("position" in style) node.setPositionType(toYogaPositionType(style.position));
  if ("top" in style) applyPositionEdge(node, 1, style.top);
  if ("bottom" in style) applyPositionEdge(node, 3, style.bottom);
  if ("left" in style) applyPositionEdge(node, 0, style.left);
  if ("right" in style) applyPositionEdge(node, 2, style.right);
};
/**
 * 写一个定位边：字符串按百分比、数字按点、其它清空（NaN）。
 */
//@ chunk-bzr73sfg.js:178055-178223 fingerprint = applyPositionEdge (1)
function applyPositionEdge(node, edge, v) {
  if (typeof v === "string") node.setPositionPercent(edge, Number.parseInt(v, 10));
  else if (typeof v === "number") node.setPosition(edge, v);
  else node.setPosition(edge, Number.NaN);
}
/**
 * 把 overflow/margin/padding 等样式应用到 yoga 节点的函数组。
 */
//@ chunk-bzr73sfg.js:178223-181475 placement
var applyOverflowStyles = (n, u) => {
    let f = u.overflowY ?? u.overflow,
      m = u.overflowX ?? u.overflow;
    if (f === "scroll" || m === "scroll") n.setOverflow(2);
    else if (f === "hidden" || m === "hidden") n.setOverflow(1);
    else if ("overflow" in u || "overflowX" in u || "overflowY" in u) n.setOverflow(0);
  },
  jx = (n, u) => {
    if ("margin" in u) n.setMargin(8, u.margin);
    if ("marginX" in u) n.setMargin(6, u.marginX);
    if ("marginY" in u) n.setMargin(7, u.marginY);
    if ("marginLeft" in u) {
      let marginLeft = u.marginLeft;
      if (marginLeft === "auto") n.setMarginAuto(4);
      else n.setMargin(4, marginLeft);
    }
    if ("marginRight" in u) {
      let marginRight = u.marginRight;
      if (marginRight === "auto") n.setMarginAuto(5);
      else n.setMargin(5, marginRight);
    }
    if ("marginTop" in u) n.setMargin(1, u.marginTop);
    if ("marginBottom" in u) n.setMargin(3, u.marginBottom);
  },
  Vx = (n, u) => {
    if ("padding" in u) n.setPadding(8, u.padding);
    if ("paddingX" in u) n.setPadding(6, u.paddingX);
    if ("paddingY" in u) n.setPadding(7, u.paddingY);
    if ("paddingLeft" in u) n.setPadding(0, u.paddingLeft);
    if ("paddingRight" in u) n.setPadding(2, u.paddingRight);
    if ("paddingTop" in u) n.setPadding(1, u.paddingTop);
    if ("paddingBottom" in u) n.setPadding(3, u.paddingBottom);
  },
  qx = (n, u) => {
    if ("flexGrow" in u) n.setFlexGrow(u.flexGrow ?? 0);
    if ("flexShrink" in u) {
      let flexShrink = u.flexShrink;
      n.setFlexShrink(typeof flexShrink === "number" ? flexShrink : 1);
    }
    if ("flexWrap" in u) n.setFlexWrap(toYogaWrap(u.flexWrap));
    if ("flexDirection" in u) n.setFlexDirection(toYogaFlexDirection(u.flexDirection));
    if ("flexBasis" in u) {
      let flexBasis = u.flexBasis;
      if (typeof flexBasis === "number") n.setFlexBasis(flexBasis);
      else if (typeof flexBasis === "string") n.setFlexBasisPercent(Number.parseInt(flexBasis, 10));
      else n.setFlexBasis(Number.NaN);
    }
    if ("alignItems" in u) n.setAlignItems(toYogaAlign(u.alignItems, 4));
    if ("alignSelf" in u) n.setAlignSelf(toYogaAlign(u.alignSelf, 0));
    if ("justifyContent" in u) n.setJustifyContent(toYogaJustify(u.justifyContent));
  },
  Xx = (n, u) => {
    if ("width" in u) {
      let width = u.width;
      if (typeof width === "number") n.setWidth(width);
      else if (typeof width === "string") n.setWidthPercent(Number.parseInt(width, 10));
      else n.setWidthAuto();
    }
    if ("height" in u) {
      let height = u.height;
      if (typeof height === "number") n.setHeight(height);
      else if (typeof height === "string") n.setHeightPercent(Number.parseInt(height, 10));
      else n.setHeightAuto();
    }
    if ("minWidth" in u) {
      let minWidth = u.minWidth;
      if (typeof minWidth === "string") n.setMinWidthPercent(Number.parseInt(minWidth, 10));
      else n.setMinWidth(minWidth ?? 0);
    }
    if ("minHeight" in u) {
      let minHeight = u.minHeight;
      if (typeof minHeight === "string") n.setMinHeightPercent(Number.parseInt(minHeight, 10));
      else n.setMinHeight(minHeight ?? 0);
    }
    if ("maxWidth" in u) {
      let maxWidth = u.maxWidth;
      if (typeof maxWidth === "string") n.setMaxWidthPercent(Number.parseInt(maxWidth, 10));
      else n.setMaxWidth(maxWidth);
    }
    if ("maxHeight" in u) {
      let maxHeight = u.maxHeight;
      if (typeof maxHeight === "string") n.setMaxHeightPercent(Number.parseInt(maxHeight, 10));
      else n.setMaxHeight(maxHeight);
    }
  },
  Qx = (n, u) => {
    if ("display" in u) n.setDisplay(toYogaDisplay(u.display));
  },
  Zx = (n, u, f) => {
    let m = f ?? u;
    if ("borderStyle" in u) {
      let p = resolveBorderStyle(u.borderStyle) ? 1 : 0;
      (n.setBorder(1, m.borderTop !== !1 ? p : 0),
        n.setBorder(3, m.borderBottom !== !1 ? p : 0),
        n.setBorder(0, m.borderLeft !== !1 ? p : 0),
        n.setBorder(2, m.borderRight !== !1 ? p : 0));
    } else {
      let p = resolveBorderStyle(m.borderStyle) ? 1 : 0;
      if ("borderTop" in u) n.setBorder(1, u.borderTop === !1 ? 0 : p);
      if ("borderBottom" in u) n.setBorder(3, u.borderBottom === !1 ? 0 : p);
      if ("borderLeft" in u) n.setBorder(0, u.borderLeft === !1 ? 0 : p);
      if ("borderRight" in u) n.setBorder(2, u.borderRight === !1 ? 0 : p);
    }
  },
  Jx = (n, u) => {
    if ("gap" in u) n.setGap(2, u.gap);
    if ("columnGap" in u) n.setGap(0, u.columnGap);
    if ("rowGap" in u) n.setGap(1, u.rowGap);
  },
  $x = (n, u = {}, f) => {
    (applyPositionStyles(n, u),
      applyOverflowStyles(n, u),
      jx(n, u),
      Vx(n, u),
      qx(n, u),
      Xx(n, u),
      Qx(n, u),
      Zx(n, u, f),
      Jx(n, u));
  },
  Wy = $x;
/**
 * 省略号字符。
 */
//@ chunk-bzr73sfg.js:181475-181492 placement
var ELLIPSIS = "\u2026";
/**
 * 按显示宽度截取含 ANSI 的字符串：先 Bun.sliceAnsi，宽度超出时逐个缩短终点直到不超过 end-start 列。
 */
//@ chunk-bzr73sfg.js:181492-181595 placement
function sliceAnsiToWidth(n, u, f) {
  let sliceAnsi = Bun.sliceAnsi(n, u, f);
  while (f > u && bunStringWidth(sliceAnsi) > f - u) (f--, (sliceAnsi = Bun.sliceAnsi(n, u, f)));
  return sliceAnsi;
}

export { ELLIPSIS, Wy, sliceAnsiToWidth };

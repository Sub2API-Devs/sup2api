/**
 * ink/render-border.ts
 *
 * 并入边框渲染的分段拼接辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/render-border.ts
 * pieces: chunk-bzr73sfg.js (4), chunk-wj577vf9.js (4), chunk-zxbmtfmw.js (8)
 * attribution: fingerprint 3, layout 5, placement 5, sole-consumer 3
 */
import { isPlainObject } from "../utils/isPlainObject.js";
import { Re } from "../../runtime/bun-runtime.js";
import { cliBoxesModule } from "../../vendor/unresolved-cjs/index.js";
import { QWe } from "./layout/node.js";
import { bunStringWidth } from "./stringWidth.js";
import { sliceAnsiToWidth } from "./styles.js";
import { repeatString } from "../utils/stringUtils.js";
import { applyColor, applyTextStyles } from "./colorize.js";
import { sequential } from "../utils/sequential.js";

//@ chunk-zxbmtfmw.js:1479-1565 sole-consumer
var BOX_KEYS = ["top", "left", "right", "bottom", "topLeft", "topRight", "bottomLeft", "bottomRight"];
//@ chunk-zxbmtfmw.js:1565-1619 sole-consumer
var isBoxStyle = (t) => isPlainObject(t) && BOX_KEYS.every((o) => typeof t[o] === "string");
//@ chunk-zxbmtfmw.js:1619-1635 sole-consumer
var cliBoxes = Re(cliBoxesModule(), 1);
/**
 * 在 cli-boxes 之外新增的边框样式：dashed（虚线）、quote（只有左侧竖条 ▎，用于引用块）。
 */
//@ chunk-zxbmtfmw.js:1635-1873 fingerprint = CUSTOM_BORDER_STYLES (0.948)
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
//@ chunk-zxbmtfmw.js:1873-1899 layout
var BORDER_STYLES = { ...cliBoxes.default, ...CUSTOM_BORDER_STYLES };
/**
 * borderStyle 名或自定义字符集 → 八个方向的边框字符；不合法返回 undefined。
 */
//@ chunk-zxbmtfmw.js:1899-1989 layout
function resolveBorderStyle(borderStyle) {
  let i =
    typeof borderStyle === "string" && Object.hasOwn(BORDER_STYLES, borderStyle)
      ? BORDER_STYLES[borderStyle]
      : borderStyle;
  return isBoxStyle(i) ? i : void 0;
}
//@ chunk-zxbmtfmw.js:1989-2041 layout
var BORDER_STYLE_NAMES = Object.keys(BORDER_STYLES).filter((t) => resolveBorderStyle(t) !== void 0);
//@ chunk-zxbmtfmw.js:2041-2225 placement
var BIDI_CONTROL_RANGES = Object.freeze([
    [1564, 1564],
    [8234, 8238],
    [8294, 8297],
  ]),
  joined = BIDI_CONTROL_RANGES.map(
    ([t, o]) => `\\u{${t.toString(16)}}` + (o > t ? `-\\u{${o.toString(16)}}` : ""),
  ).join(""),
  regExp = new RegExp(`[${joined}]`, "gu");
/**
 * 把标题文字嵌进一条边框线：按 start/center/end 与 offset 定位，太长则截断；返回 [左段, 文字, 右段]。
 */
//@ chunk-bzr73sfg.js:288217-288545 fingerprint = embedTextInBorder (1)
function embedTextInBorder(borderLine, text, align, offset = 0, borderChar) {
  text = QWe(text);
  let textLength = bunStringWidth(text),
    borderLength = borderLine.length;
  if (textLength >= borderLength - 2) {
    let O = sliceAnsiToWidth(text, 0, borderLength),
      repeat = borderChar.repeat(Math.max(0, borderLength - bunStringWidth(O)));
    return ["", O, repeat];
  }
  let position;
  if (align === "center") position = Math.floor((borderLength - textLength) / 2);
  else if (align === "start") position = offset + 1;
  else position = borderLength - textLength - offset - 1;
  position = Math.max(1, Math.min(position, borderLength - textLength - 1));
  let A = borderLine.substring(0, 1) + repeatString(borderChar, position - 1),
    D =
      repeatString(borderChar, borderLength - position - textLength - 1) +
      borderLine.substring(borderLength - 1);
  return [A, text, D];
}
//@ chunk-bzr73sfg.js:288545-288605 layout
function colorBorderSegment(text, color, dim) {
  let m = applyColor(text, color);
  if (dim) m = sequential.dim(m);
  return m;
}
//@ chunk-bzr73sfg.js:288605-288660 layout
function withBorderBackground(text, backgroundColor) {
  return backgroundColor ? applyTextStyles(text, { backgroundColor: backgroundColor }) : text;
}
/**
 * 画 ink-box 的边框：按 borderStyle 取字符集，四边可单独关闭、单独着色/变暗；borderText 可把文字嵌进上或下边框；继承的背景色也涂到边框上。
 */
//@ chunk-bzr73sfg.js:288660-290208 fingerprint = renderBorder (1)
var renderBorder = (x, y, node, output, backgroundColor) => {
    let box = resolveBorderStyle(node.style.borderStyle);
    if (box !== void 0) {
      let width = Math.floor(node.yogaNode.getComputedWidth()),
        height = Math.floor(node.yogaNode.getComputedHeight()),
        A = node.style.borderTopColor ?? node.style.borderColor,
        D = node.style.borderBottomColor ?? node.style.borderColor,
        O = node.style.borderLeftColor ?? node.style.borderColor,
        _ = node.style.borderRightColor ?? node.style.borderColor,
        U = node.style.borderTopDimColor ?? node.style.borderDimColor,
        L = node.style.borderBottomDimColor ?? node.style.borderDimColor,
        P = node.style.borderLeftDimColor ?? node.style.borderDimColor,
        z = node.style.borderRightDimColor ?? node.style.borderDimColor,
        G = node.style.borderTop !== !1,
        X = node.style.borderBottom !== !1,
        K = node.style.borderLeft !== !1,
        q = node.style.borderRight !== !1,
        innerWidth = Math.max(0, width - (K ? 1 : 0) - (q ? 1 : 0)),
        topLine = G ? (K ? box.topLeft : "") + box.top.repeat(innerWidth) + (q ? box.topRight : "") : "",
        styledTop;
      if (G && node.style.borderText?.position === "top") {
        let [ue, ce, pe] = embedTextInBorder(
          topLine,
          node.style.borderText.content,
          node.style.borderText.align,
          node.style.borderText.offset,
          box.top,
        );
        styledTop = colorBorderSegment(ue, A, U) + ce + colorBorderSegment(pe, A, U);
      } else if (G) styledTop = colorBorderSegment(topLine, A, U);
      let sideHeight = height;
      if (G) sideHeight -= 1;
      if (X) sideHeight -= 1;
      sideHeight = Math.max(0, sideHeight);
      let leftColumn = (
        applyColor(box.left, O) +
        `
`
      ).repeat(sideHeight);
      if (P) leftColumn = sequential.dim(leftColumn);
      let rightColumn = (
        applyColor(box.right, _) +
        `
`
      ).repeat(sideHeight);
      if (z) rightColumn = sequential.dim(rightColumn);
      let bottomLine = X
          ? (K ? box.bottomLeft : "") + box.bottom.repeat(innerWidth) + (q ? box.bottomRight : "")
          : "",
        styledBottom;
      if (X && node.style.borderText?.position === "bottom") {
        let [ue, ce, pe] = embedTextInBorder(
          bottomLine,
          node.style.borderText.content,
          node.style.borderText.align,
          node.style.borderText.offset,
          box.bottom,
        );
        styledBottom = colorBorderSegment(ue, D, L) + ce + colorBorderSegment(pe, D, L);
      } else if (X) styledBottom = colorBorderSegment(bottomLine, D, L);
      let ye = G ? 1 : 0;
      if (styledTop) output.write(x, y, withBorderBackground(styledTop, backgroundColor));
      if (K) output.write(x, y + ye, withBorderBackground(leftColumn, backgroundColor));
      if (q) output.write(x + width - 1, y + ye, withBorderBackground(rightColumn, backgroundColor));
      if (styledBottom) output.write(x, y + height - 1, withBorderBackground(styledBottom, backgroundColor));
    }
  },
  renderBorderAlias = renderBorder;
//@ chunk-wj577vf9.js:7263-7311 placement
function joinRawSegments(e) {
  return e.map((t) => t.raw).join("");
}
//@ chunk-wj577vf9.js:7311-7357 placement
var Rt = /^[ \t>]+/gm,
  St = /[ \t]+/g,
  _t = /\n{3,}/g;
//@ chunk-wj577vf9.js:7357-7539 placement
function createNestingGuard() {
  let weakMap = new WeakMap(),
    t = (n) => (weakMap.get(n) ?? 0) >= 100;
  return {
    isAtMaxNesting: t,
    lexLevel: (n, r) => {
      if (t(n)) return;
      let s = weakMap.get(n) ?? 0;
      weakMap.set(n, s + 1);
      try {
        return r();
      } finally {
        weakMap.set(n, s);
      }
    },
  };
}
//@ chunk-wj577vf9.js:7539-7634 placement
var F = createNestingGuard(),
  Ie = (e) =>
    e
      .replace(Rt, (t) => t.replace(St, " ").trimStart())
      .replace(
        _t,
        `

`,
      )
      .trimEnd();

export {
  joined,
  regExp,
  joinRawSegments,
  BORDER_STYLE_NAMES,
  BIDI_CONTROL_RANGES,
  resolveBorderStyle,
  renderBorderAlias,
  F,
  Ie,
};

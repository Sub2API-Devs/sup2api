/**
 * ink/layout/node.ts
 *
 * 并入已有模块：布局节点补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/layout/node.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-bzr73sfg.js (12)
 * attribution: fingerprint 6, placement 6, layout 1
 */
import { squashTextNodes } from "../squash-text-nodes.js";
import { joined, regExp as regExp_3 } from "../render-border.js";
import { hasExpandableControls, expandTabs } from "../wrapAnsi.js";
import { useHasAutoDialog, useTopUserDialog } from "../../state/dialogQueue.js";
import { getActiveBottomSurface } from "../../screens/repl/storeHooks.js";

//@ chunk-bzr73sfg.js:176949-176959 placement
var Gy = squashTextNodes;
//@ chunk-bzr73sfg.js:176959-177027 placement
var regExp = new RegExp(`[${joined}]`, "u"),
  regExp_2 = new RegExp(`[\\t${joined}]`, "u");
//@ chunk-bzr73sfg.js:177027-177086 placement
function hd(n) {
  return regExp.test(n) ? n.replace(regExp_3, "\uFFFD") : n;
}
//@ chunk-bzr73sfg.js:177086-177118 placement
function QWe(n) {
  return nrn([n]);
}
//@ chunk-bzr73sfg.js:177118-177160 placement
function nrn(n) {
  return (md(n) ?? n).join("");
}
//@ chunk-bzr73sfg.js:177160-177245 placement
function md(n) {
  return n.some((u) => regExp_2.test(u)) || hasExpandableControls(n)
    ? expandTabs(n.map((u) => hd(u)))
    : void 0;
}
/**
 * position 样式 → yoga PositionType（absolute=2，其余 relative=1）。
 */
//@ chunk-bzr73sfg.js:177245-177286 fingerprint = LayoutPositionType (0.606)
function toYogaPositionType(position) {
  return position === "absolute" ? 2 : 1;
}
/**
 * display 样式 → yoga Display（none=1，其余 flex=0）。
 */
//@ chunk-bzr73sfg.js:177286-177323 layout
function toYogaDisplay(display) {
  return display === "none" ? 1 : 0;
}
//@ chunk-bzr73sfg.js:177323-177414 fingerprint = LayoutWrap (0.792)
function toYogaWrap(flexWrap) {
  switch (flexWrap) {
    case "wrap":
      return 1;
    case "wrap-reverse":
      return 2;
    default:
      return 0;
  }
}
//@ chunk-bzr73sfg.js:177414-177533 fingerprint = LayoutFlexDirection (0.909)
function toYogaFlexDirection(flexDirection) {
  switch (flexDirection) {
    case "row":
      return 2;
    case "row-reverse":
      return 3;
    case "column-reverse":
      return 1;
    default:
      return 0;
  }
}
//@ chunk-bzr73sfg.js:177533-177693 fingerprint = LayoutAlign (1)
function toYogaAlign(align, fallback) {
  switch (align) {
    case "auto":
      return 0;
    case "stretch":
      return 4;
    case "flex-start":
      return 1;
    case "center":
      return 2;
    case "flex-end":
      return 3;
    default:
      return fallback;
  }
}
//@ chunk-bzr73sfg.js:177693-177867 fingerprint = LayoutJustify (0.917)
function toYogaJustify(justify) {
  switch (justify) {
    case "center":
      return 1;
    case "flex-end":
      return 2;
    case "space-between":
      return 3;
    case "space-around":
      return 4;
    case "space-evenly":
      return 5;
    default:
      return 0;
  }
}
//@ chunk-18hwfzwa.js:329889-329999 fingerprint = LayoutOverflow (0.368)
function LayoutOverflow() {
  let h = useHasAutoDialog(),
    x = useTopUserDialog() !== null,
    D = getActiveBottomSurface();
  if (x || (h && D === null)) return "visible";
  return h ? "suppressed" : "none";
}

export {
  LayoutOverflow,
  QWe,
  Gy,
  nrn,
  hd,
  toYogaPositionType,
  toYogaWrap,
  toYogaFlexDirection,
  toYogaAlign,
  toYogaJustify,
  toYogaDisplay,
  md,
  regExp_2,
};

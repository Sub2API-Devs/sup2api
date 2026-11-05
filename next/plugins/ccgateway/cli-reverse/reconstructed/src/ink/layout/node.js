/**
 * ink/layout/node.ts
 *
 * 并入已有模块：布局节点补充。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/layout/node.ts
 * pieces: chunk-2avr6cej.js (12), chunk-czq1j3j2.js (1)
 * attribution: placement 6, fingerprint 6, layout 1
 */
import { squashTextNodes } from "../squash-text-nodes.js";
import { joined, regExp as regExp_3 } from "../render-border.js";
import { hasExpandableControls, expandTabs } from "../wrapAnsi.js";
import { useHasAutoDialog, useTopUserDialog } from "../../state/dialogQueue.js";
import { getActiveBottomSurface } from "../../screens/repl/storeHooks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:176698-176708 placement
/**
 * squashTextNodes 的别名
 */
var squashTextNodesAlias = squashTextNodes;
//@ chunk-2avr6cej.js:176708-176776 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_2;
deferInit("chunk-2avr6cej.js:176708", () => {
  regExp = new RegExp(`[${joined}]`, "u");
  regExp_2 = new RegExp(`[\\t${joined}]`, "u");
});
//@ chunk-2avr6cej.js:176776-176835 placement
/**
 * 非法 UTF-16 代理项替换为替换字符
 */
function replaceInvalidUtf16(text) {
  return regExp.test(text) ? text.replace(regExp_3, "\uFFFD") : text;
}
//@ chunk-2avr6cej.js:176835-176867 placement
/**
 * 把单个文本节点压平成显示字符串（含制表符展开与代理对修复）。
 */
function squashSingleText(node) {
  return squashTextOf([node]);
}
//@ chunk-2avr6cej.js:176867-176909 placement
/**
 * 用 squashTextNodesToSegments 把节点压平并用空串拼接成文本。
 */
function squashTextOf(texts) {
  return (needsTextNormalization(texts) ?? texts).join("");
}
//@ chunk-2avr6cej.js:176909-176994 placement
/**
 * 判断文本节点是否需要归一化（含可展开控制字符或非法代理项）。
 */
function needsTextNormalization(texts) {
  return texts.some((text) => regExp_2.test(text)) || hasExpandableControls(texts)
    ? expandTabs(texts.map((text) => replaceInvalidUtf16(text)))
    : undefined;
}
//@ chunk-2avr6cej.js:176994-177035 fingerprint (2.1.88 match: LayoutPositionType, 0.607)
/**
 * position 样式 → yoga PositionType（absolute=2，其余 relative=1）。
 */
function toYogaPositionType(position) {
  return position === "absolute" ? 2 : 1;
}
//@ chunk-2avr6cej.js:177035-177072 layout
/**
 * display 样式 → yoga Display（none=1，其余 flex=0）。
 */
function toYogaDisplay(display) {
  return display === "none" ? 1 : 0;
}
//@ chunk-2avr6cej.js:177072-177163 fingerprint (2.1.88 match: LayoutWrap, 0.792)
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
//@ chunk-2avr6cej.js:177163-177282 fingerprint (2.1.88 match: LayoutFlexDirection, 0.909)
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
//@ chunk-2avr6cej.js:177282-177442 fingerprint (2.1.88 match: LayoutAlign, 1)
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
//@ chunk-2avr6cej.js:177442-177616 fingerprint (2.1.88 match: LayoutJustify, 0.917)
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
//@ chunk-czq1j3j2.js:368914-369024 fingerprint (2.1.88 match: LayoutOverflow, 0.368)
function LayoutOverflow() {
  let hasAutoDialog = useHasAutoDialog();
  let hasDialog = useTopUserDialog() !== null;
  let activeBottomSurface = getActiveBottomSurface();
  if (hasDialog || (hasAutoDialog && activeBottomSurface === null)) return "visible";
  return hasAutoDialog ? "suppressed" : "none";
}
export {
  toYogaPositionType,
  toYogaWrap,
  toYogaFlexDirection,
  toYogaAlign,
  toYogaJustify,
  toYogaDisplay,
  squashSingleText,
  needsTextNormalization,
  regExp_2,
  squashTextNodesAlias,
  squashTextOf,
  replaceInvalidUtf16,
  LayoutOverflow,
};

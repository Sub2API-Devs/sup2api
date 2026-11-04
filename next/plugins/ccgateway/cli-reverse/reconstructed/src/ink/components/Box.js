/**
 * ink/components/Box.tsx
 *
 * 并入旧版已有路径：Ink Box。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/Box.tsx
 * pieces: chunk-24t3dkzb.js (3)
 * attribution: fingerprint 1, placement 2
 */
import { ifNotInteger } from "../warn.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { buildAccessibility } from "../dom.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-24t3dkzb.js:6874-8555 fingerprint = Box (0.8)
/**
 * <Box>：Ink 的 flex 容器（ink-box）。默认 flexDirection row、flexWrap nowrap、flexGrow 0、flexShrink 1、overflow visible；margin/padding/gap 非整数告警。透传焦点（tabIndex/autoFocus）、键盘/粘贴/滚轮/action 事件（含捕获阶段）、点击、悬停、onPointer、keybindingScope、textEntry、aria-* 无障碍属性。
 */
function Box({
  children,
  ref,
  tabIndex,
  autoFocus,
  onClick,
  onFocus,
  onFocusCapture,
  onBlur,
  onBlurCapture,
  onMouseEnter,
  onMouseLeave,
  onPointer,
  hoverIgnoresBlankCells,
  hoverFollowsPaint,
  renderEvent,
  renderComponent,
  drawPending,
  elementKey,
  elementPlugin,
  onKeyDown,
  onKeyDownCapture,
  onPaste,
  onPasteCapture,
  onWheel,
  onWheelCapture,
  keybindingScope,
  textEntry,
  onAction,
  onActionCapture,
  "aria-hidden": hidden,
  "aria-label": label,
  "aria-role": role,
  "aria-state": state,
  "aria-preserve-whitespace": preserveWhitespace,
  ...style
}) {
  ifNotInteger(style.margin, "margin");
  ifNotInteger(style.marginX, "marginX");
  ifNotInteger(style.marginY, "marginY");
  ifNotInteger(style.marginTop, "marginTop");
  ifNotInteger(style.marginBottom, "marginBottom");
  if (style.marginLeft !== "auto") ifNotInteger(style.marginLeft, "marginLeft");
  if (style.marginRight !== "auto") ifNotInteger(style.marginRight, "marginRight");
  ifNotInteger(style.padding, "padding");
  ifNotInteger(style.paddingX, "paddingX");
  ifNotInteger(style.paddingY, "paddingY");
  ifNotInteger(style.paddingTop, "paddingTop");
  ifNotInteger(style.paddingBottom, "paddingBottom");
  ifNotInteger(style.paddingLeft, "paddingLeft");
  ifNotInteger(style.paddingRight, "paddingRight");
  ifNotInteger(style.gap, "gap");
  ifNotInteger(style.columnGap, "columnGap");
  ifNotInteger(style.rowGap, "rowGap");
  style.flexWrap ??= "nowrap";
  style.flexDirection ??= "row";
  style.flexGrow ??= 0;
  style.flexShrink ??= 1;
  style.overflowX = style.overflowX ?? style.overflow ?? "visible";
  style.overflowY = style.overflowY ?? style.overflow ?? "visible";
  return jsxProd_default("ink-box", {
    ref,
    tabIndex,
    autoFocus,
    onClick,
    onFocus,
    onFocusCapture,
    onBlur,
    onBlurCapture,
    onMouseEnter,
    onMouseLeave,
    onPointer,
    hoverIgnoresBlankCells,
    hoverFollowsPaint,
    renderEvent,
    renderComponent,
    drawPending,
    elementKey,
    elementPlugin,
    onKeyDown,
    onKeyDownCapture,
    onPaste,
    onPasteCapture,
    onWheel,
    onWheelCapture,
    keybindingScope,
    textEntry,
    onAction,
    onActionCapture,
    accessibility: buildAccessibility(hidden, label, role, state, preserveWhitespace),
    style,
    children,
  });
}
//@ chunk-24t3dkzb.js:8555-8565 placement
var BaseBox = Box;
//@ chunk-24t3dkzb.js:8565-8569 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-24t3dkzb.js:8565", () => {
  init_react_production();
});
export { BaseBox };

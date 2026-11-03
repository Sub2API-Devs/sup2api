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
  ...l
}) {
  ifNotInteger(l.margin, "margin");
  ifNotInteger(l.marginX, "marginX");
  ifNotInteger(l.marginY, "marginY");
  ifNotInteger(l.marginTop, "marginTop");
  ifNotInteger(l.marginBottom, "marginBottom");
  if (l.marginLeft !== "auto") ifNotInteger(l.marginLeft, "marginLeft");
  if (l.marginRight !== "auto") ifNotInteger(l.marginRight, "marginRight");
  ifNotInteger(l.padding, "padding");
  ifNotInteger(l.paddingX, "paddingX");
  ifNotInteger(l.paddingY, "paddingY");
  ifNotInteger(l.paddingTop, "paddingTop");
  ifNotInteger(l.paddingBottom, "paddingBottom");
  ifNotInteger(l.paddingLeft, "paddingLeft");
  ifNotInteger(l.paddingRight, "paddingRight");
  ifNotInteger(l.gap, "gap");
  ifNotInteger(l.columnGap, "columnGap");
  ifNotInteger(l.rowGap, "rowGap");
  l.flexWrap ??= "nowrap";
  l.flexDirection ??= "row";
  l.flexGrow ??= 0;
  l.flexShrink ??= 1;
  l.overflowX = l.overflowX ?? l.overflow ?? "visible";
  l.overflowY = l.overflowY ?? l.overflow ?? "visible";
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
    style: l,
    children,
  });
}
//@ chunk-24t3dkzb.js:8555-8565 placement
var BaseBox = Box;
//@ chunk-24t3dkzb.js:8565-8569 placement
init_react_production();
export { BaseBox };

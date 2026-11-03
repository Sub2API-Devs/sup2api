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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { buildAccessibility } from "../dom.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

/**
 * <Box>：Ink 的 flex 容器（ink-box）。默认 flexDirection row、flexWrap nowrap、flexGrow 0、flexShrink 1、overflow visible；margin/padding/gap 非整数告警。透传焦点（tabIndex/autoFocus）、键盘/粘贴/滚轮/action 事件（含捕获阶段）、点击、悬停、onPointer、keybindingScope、textEntry、aria-* 无障碍属性。
 */
//@ chunk-24t3dkzb.js:6874-8555 fingerprint = Box (0.8)
function Box({
  children: children,
  ref: ref,
  tabIndex: tabIndex,
  autoFocus: autoFocus,
  onClick: onClick,
  onFocus: onFocus,
  onFocusCapture: onFocusCapture,
  onBlur: onBlur,
  onBlurCapture: onBlurCapture,
  onMouseEnter: onMouseEnter,
  onMouseLeave: onMouseLeave,
  onPointer: onPointer,
  hoverIgnoresBlankCells: hoverIgnoresBlankCells,
  hoverFollowsPaint: hoverFollowsPaint,
  renderEvent: renderEvent,
  renderComponent: renderComponent,
  drawPending: drawPending,
  elementKey: elementKey,
  elementPlugin: elementPlugin,
  onKeyDown: onKeyDown,
  onKeyDownCapture: onKeyDownCapture,
  onPaste: onPaste,
  onPasteCapture: onPasteCapture,
  onWheel: onWheel,
  onWheelCapture: onWheelCapture,
  keybindingScope: keybindingScope,
  textEntry: textEntry,
  onAction: onAction,
  onActionCapture: onActionCapture,
  "aria-hidden": z,
  "aria-label": Z,
  "aria-role": ee,
  "aria-state": te,
  "aria-preserve-whitespace": re,
  ...l
}) {
  if (
    (ifNotInteger(l.margin, "margin"),
    ifNotInteger(l.marginX, "marginX"),
    ifNotInteger(l.marginY, "marginY"),
    ifNotInteger(l.marginTop, "marginTop"),
    ifNotInteger(l.marginBottom, "marginBottom"),
    l.marginLeft !== "auto")
  )
    ifNotInteger(l.marginLeft, "marginLeft");
  if (l.marginRight !== "auto") ifNotInteger(l.marginRight, "marginRight");
  return (
    ifNotInteger(l.padding, "padding"),
    ifNotInteger(l.paddingX, "paddingX"),
    ifNotInteger(l.paddingY, "paddingY"),
    ifNotInteger(l.paddingTop, "paddingTop"),
    ifNotInteger(l.paddingBottom, "paddingBottom"),
    ifNotInteger(l.paddingLeft, "paddingLeft"),
    ifNotInteger(l.paddingRight, "paddingRight"),
    ifNotInteger(l.gap, "gap"),
    ifNotInteger(l.columnGap, "columnGap"),
    ifNotInteger(l.rowGap, "rowGap"),
    (l.flexWrap ??= "nowrap"),
    (l.flexDirection ??= "row"),
    (l.flexGrow ??= 0),
    (l.flexShrink ??= 1),
    (l.overflowX = l.overflowX ?? l.overflow ?? "visible"),
    (l.overflowY = l.overflowY ?? l.overflow ?? "visible"),
    e("ink-box", {
      ref: ref,
      tabIndex: tabIndex,
      autoFocus: autoFocus,
      onClick: onClick,
      onFocus: onFocus,
      onFocusCapture: onFocusCapture,
      onBlur: onBlur,
      onBlurCapture: onBlurCapture,
      onMouseEnter: onMouseEnter,
      onMouseLeave: onMouseLeave,
      onPointer: onPointer,
      hoverIgnoresBlankCells: hoverIgnoresBlankCells,
      hoverFollowsPaint: hoverFollowsPaint,
      renderEvent: renderEvent,
      renderComponent: renderComponent,
      drawPending: drawPending,
      elementKey: elementKey,
      elementPlugin: elementPlugin,
      onKeyDown: onKeyDown,
      onKeyDownCapture: onKeyDownCapture,
      onPaste: onPaste,
      onPasteCapture: onPasteCapture,
      onWheel: onWheel,
      onWheelCapture: onWheelCapture,
      keybindingScope: keybindingScope,
      textEntry: textEntry,
      onAction: onAction,
      onActionCapture: onActionCapture,
      accessibility: buildAccessibility(z, Z, ee, te, re),
      style: l,
      children: children,
    })
  );
}
//@ chunk-24t3dkzb.js:8555-8565 placement
var BaseBox = Box;
//@ chunk-24t3dkzb.js:8565-8569 placement
j();

export { BaseBox };

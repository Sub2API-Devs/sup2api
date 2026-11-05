/**
 * ink/events/click-event.ts
 *
 * 并入已有模块：Ink 点击事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/click-event.ts
 * pieces: chunk-2avr6cej.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { InkEvent } from "./event.js";
import { NO_MOUSE_MODS } from "../components/ErrorBoundary.js";
import { PointerEvent } from "./pointer-event.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:172153-172561 placement
/**
 * 鼠标事件基类（继承 TerminalEvent 的基础 Event）：屏幕坐标 col/row 与相对目标的 localCol/localRow、目标格是否空白、所在格的 OSC 8 链接、是否为窗口激活点击、修饰键；allowDefault()/dropAsStray()/endClickChain() 供处理器影响默认行为（选区、多击链）。
 */
let ClickEvent; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:172153", () => {
  ClickEvent = class ClickEvent extends InkEvent {
    col;
    row;
    localCol = 0;
    localRow = 0;
    cellIsBlank;
    hyperlinkUrl;
    isWindowActivation;
    mods;
    defaultAllowed = false;
    allowDefault() {
      this.defaultAllowed = true;
    }
    droppedAsStray = false;
    dropAsStray() {
      this.droppedAsStray = true;
    }
    endsClickChain = false;
    endClickChain() {
      this.endsClickChain = true;
    }
    constructor(col, row, cellIsBlank, hyperlinkUrl, isWindowActivation = false, mods = NO_MOUSE_MODS) {
      super();
      this.col = col;
      this.row = row;
      this.cellIsBlank = cellIsBlank;
      this.hyperlinkUrl = hyperlinkUrl;
      this.isWindowActivation = isWindowActivation;
      this.mods = mods;
    }
  };
});
//@ chunk-2avr6cej.js:257931-258217 fingerprint (2.1.88 match: ClickEvent, 0.495)
/**
 * 把指针事件派给节点的 onPointer，换算成节点内的局部坐标（含像素精度 fine）；节点已从树上摘下时只派发 up。
 */
function dispatchPointer(node, event) {
  let onPointer = node._eventHandlers?.onPointer;
  let cachedLayout = node.cachedLayout;
  if (!(
    onPointer !== undefined &&
    cachedLayout !== undefined &&
    (node.parentNode !== undefined || event.kind === "up")
  ))
    return;
  let floored = Math.floor(cachedLayout.x);
  let floored_2 = Math.floor(cachedLayout.y);
  onPointer(
    new PointerEvent({
      ...event,
      localCol: event.col - floored,
      localRow: event.row - floored_2,
      fine: event.fine && {
        col: event.fine.col - floored,
        row: event.fine.row - floored_2,
      },
    }),
  );
}
export { ClickEvent, dispatchPointer };

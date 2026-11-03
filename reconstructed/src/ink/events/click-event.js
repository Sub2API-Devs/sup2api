/**
 * ink/events/click-event.ts
 *
 * 并入已有模块：Ink 点击事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/click-event.ts
 * pieces: chunk-bzr73sfg.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { InkEvent } from "./event.js";
import { NO_MOUSE_MODS } from "../components/ErrorBoundary.js";
import { PointerEvent } from "./pointer-event.js";

/**
 * 鼠标事件基类（继承 TerminalEvent 的基础 Event）：屏幕坐标 col/row 与相对目标的 localCol/localRow、目标格是否空白、所在格的 OSC 8 链接、是否为窗口激活点击、修饰键；allowDefault()/dropAsStray()/endClickChain() 供处理器影响默认行为（选区、多击链）。
 */
//@ chunk-bzr73sfg.js:172404-172812 placement
class ClickEvent extends InkEvent {
  col;
  row;
  localCol = 0;
  localRow = 0;
  cellIsBlank;
  hyperlinkUrl;
  isWindowActivation;
  mods;
  defaultAllowed = !1;
  allowDefault() {
    this.defaultAllowed = !0;
  }
  droppedAsStray = !1;
  dropAsStray() {
    this.droppedAsStray = !0;
  }
  endsClickChain = !1;
  endClickChain() {
    this.endsClickChain = !0;
  }
  constructor(col, row, cellIsBlank, hyperlinkUrl, isWindowActivation = !1, mods = NO_MOUSE_MODS) {
    super();
    ((this.col = col),
      (this.row = row),
      (this.cellIsBlank = cellIsBlank),
      (this.hyperlinkUrl = hyperlinkUrl),
      (this.isWindowActivation = isWindowActivation),
      (this.mods = mods));
  }
}
/**
 * 把指针事件派给节点的 onPointer，换算成节点内的局部坐标（含像素精度 fine）；节点已从树上摘下时只派发 up。
 */
//@ chunk-bzr73sfg.js:258255-258541 fingerprint = ClickEvent (0.495)
function dispatchPointer(node, event) {
  let f = node._eventHandlers?.onPointer,
    cachedLayout = node.cachedLayout;
  if (!(f !== void 0 && cachedLayout !== void 0 && (node.parentNode !== void 0 || event.kind === "up")))
    return;
  let floored = Math.floor(cachedLayout.x),
    floored_2 = Math.floor(cachedLayout.y);
  f(
    new PointerEvent({
      ...event,
      localCol: event.col - floored,
      localRow: event.row - floored_2,
      fine: event.fine && { col: event.fine.col - floored, row: event.fine.row - floored_2 },
    }),
  );
}

export { ClickEvent, dispatchPointer };

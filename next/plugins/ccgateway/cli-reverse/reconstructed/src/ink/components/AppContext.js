/**
 * ink/components/AppContext.ts
 *
 * 并入已有模块：Ink 应用上下文补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/AppContext.ts
 * pieces: chunk-bzr73sfg.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { init_react_production, createContext } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-bzr73sfg.js:223585-223727 placement
var toCellPoint = (point) => ({
  col: Math.max(1, Math.floor(point.col) + 1),
  row: Math.max(1, Math.floor(point.row) + 1),
  fine: point,
});
var pixelToCellPoint = (col, row, cellPixels) =>
  toCellPoint({
    col: col / cellPixels.width,
    row: row / cellPixels.height,
  });
//@ chunk-bzr73sfg.js:223727-223731 placement
init_react_production();
//@ chunk-bzr73sfg.js:223731-224014 placement
/**
 * Ink 内部应用上下文：exit、focusManager、根节点、粘贴事件分发、布局/帧/点击订阅、悬停跟踪、精确指针（像素鼠标）引用、事件循环延迟观察、终端图片能力。
 */
var AppContext = createContext({
  exit() {},
  focusManager: null,
  rootNode: null,
  dispatchPasteEvent() {},
  subscribeLayout: () => () => {},
  subscribeFrames: () => () => {},
  subscribeClicks: () => () => {},
  isHoverTracked: () => false,
  subscribeHoverTracked: () => () => {},
  retainFinePointer: () => () => {},
  watchLoop: () => () => {},
  terminalImages: null,
});
//@ chunk-bzr73sfg.js:224014-224050 fingerprint
AppContext.displayName = "InternalAppContext";
export { AppContext, pixelToCellPoint };

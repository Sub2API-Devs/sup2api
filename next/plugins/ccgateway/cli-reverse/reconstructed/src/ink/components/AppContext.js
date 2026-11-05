/**
 * ink/components/AppContext.ts
 *
 * 并入已有模块：Ink 应用上下文补充。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/AppContext.ts
 * pieces: chunk-2avr6cej.js (4)
 * attribution: placement 3, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, createContext } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-2avr6cej.js:223180-223322 placement
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
//@ chunk-2avr6cej.js:223322-223326 placement
init_react_production();
//@ chunk-2avr6cej.js:223326-223609 placement
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
//@ chunk-2avr6cej.js:223609-223645 fingerprint
AppContext.displayName = "InternalAppContext";
export { AppContext, pixelToCellPoint };

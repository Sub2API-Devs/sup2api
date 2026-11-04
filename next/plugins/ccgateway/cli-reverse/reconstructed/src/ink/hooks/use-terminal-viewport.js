/**
 * ink/hooks/use-terminal-viewport.ts
 *
 * useTerminalViewport：元素在终端视口中的可见性与所在行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-terminal-viewport.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { clampScrollTop } from "../events/event-handlers.js";

//@ chunk-18hwfzwa.js:1822566-1822891 fingerprint (2.1.88 match: useTerminalViewport, 0.89)
function findRowOwner(row, container, entries) {
  let baseTop = 0;
  for (let ancestor = container ?? undefined; ancestor; ancestor = ancestor.parentNode)
    baseTop += ancestor.yogaNode?.getComputedTop() ?? 0;
  if (row < baseTop) return;
  for (let [key, node] of entries) {
    let top = 0;
    for (let ancestor = node; ancestor; ancestor = ancestor.parentNode) {
      top += ancestor.yogaNode?.getComputedTop() ?? 0;
      if (ancestor.scrollTop) top -= clampScrollTop(ancestor);
    }
    let height = node.yogaNode?.getComputedHeight() ?? 0;
    if (row >= top && row < top + height) return key;
  }
  return;
}
export { findRowOwner };

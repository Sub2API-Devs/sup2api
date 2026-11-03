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

//@ chunk-18hwfzwa.js:1822566-1822891 fingerprint = useTerminalViewport (0.89)
function findRowOwner(row, container, entries) {
  let L = 0;
  for (let ee = container ?? void 0; ee; ee = ee.parentNode) L += ee.yogaNode?.getComputedTop() ?? 0;
  if (row < L) return;
  for (let [ee, ke] of entries) {
    let Re = 0;
    for (let He = ke; He; He = He.parentNode)
      if (((Re += He.yogaNode?.getComputedTop() ?? 0), He.scrollTop)) Re -= clampScrollTop(He);
    let Be = ke.yogaNode?.getComputedHeight() ?? 0;
    if (row >= Re && row < Re + Be) return ee;
  }
  return;
}

export { findRowOwner };

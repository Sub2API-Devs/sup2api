/**
 * utils/terminalPanel.ts
 *
 * 终端面板显示条件辅助（progress/panel/draft/typing 时隐藏）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/terminalPanel.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { O_o, useTopUserDialog } from "../state/dialogQueue.js";

//@ chunk-18hwfzwa.js:329730-329787 fingerprint = TMUX_SESSION (1)
function TMUX_SESSION() {
  let h = O_o("panel");
  return useTopUserDialog() !== null && h;
}

export { TMUX_SESSION };

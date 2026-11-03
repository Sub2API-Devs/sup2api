/**
 * hooks/useTerminalSize.ts
 *
 * 读取 Ink 终端尺寸（columns/rows）的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTerminalSize.ts
 * pieces: chunk-9ks6yv81.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { j, Se } from "../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";

//@ chunk-9ks6yv81.js:265-269 placement
j();
//@ chunk-9ks6yv81.js:269-383 fingerprint = useTerminalSize (1)
function useTerminalSize() {
  let size = Se(TerminalSizeContext);
  if (!size) throw Error("useTerminalSize must be used within an Ink App component");
  return size;
}

export { useTerminalSize };

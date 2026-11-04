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
import { init_react_production, useContext } from "../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9ks6yv81.js:265-269 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9ks6yv81.js:265", () => {
  init_react_production();
});
//@ chunk-9ks6yv81.js:269-383 fingerprint (2.1.88 match: useTerminalSize, 1)
function useTerminalSize() {
  let size = useContext(TerminalSizeContext);
  if (!size) throw Error("useTerminalSize must be used within an Ink App component");
  return size;
}
export { useTerminalSize };

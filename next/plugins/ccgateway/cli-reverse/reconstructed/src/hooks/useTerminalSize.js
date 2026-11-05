/**
 * hooks/useTerminalSize.ts
 *
 * 读取 Ink 终端尺寸（columns/rows）的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTerminalSize.ts
 * pieces: chunk-9n68jj1e.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useContext } from "../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9n68jj1e.js:265-269 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9n68jj1e.js:265", () => {
  init_react_production();
});
//@ chunk-9n68jj1e.js:269-383 fingerprint (2.1.88 match: useTerminalSize, 1)
function useTerminalSize() {
  let size = useContext(TerminalSizeContext);
  if (!size) throw Error("useTerminalSize must be used within an Ink App component");
  return size;
}
export { useTerminalSize };

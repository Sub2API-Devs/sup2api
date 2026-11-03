/**
 * components/_new/DesktopHandoff.helpers-5nte.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5nte8cwj.js (1)
 * attribution: sole-consumer-new 1
 */
import { openCurrentSessionInDesktop } from "../../utils/desktopDeepLink.js";
import { getSessionId } from "../../bootstrap/state.js";

//@ chunk-5nte8cwj.js:3680-3743 sole-consumer-new
async function vFs() {
  return openCurrentSessionInDesktop({ kind: "resume", sessionId: getSessionId() });
}

export { vFs };

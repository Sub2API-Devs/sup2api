/**
 * components/PromptInput/_new/useSwarmBanner.helpers-7s4y.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7s4yj2r0.js (1)
 * attribution: sole-consumer-new 1
 */
import { getTeamName } from "../../../utils/teammate.js";

//@ chunk-7s4yj2r0.js:227-317 sole-consumer-new
function uWs(t) {
  if (getTeamName()) return;
  return t.remoteSessionName ?? t.standaloneAgentContext?.name;
}

export { uWs };

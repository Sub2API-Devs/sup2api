/**
 * utils/sessionSurface.ts
 *
 * 2.1.316 新增：会话界面类型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1gpnajts.js (2)
 * attribution: placement 2
 */
import { isChildSession, hostScheduledRun, getSessionEntrypoint, isTopHostSession } from "./sessionShape.js";
import { mn } from "./remoteEnvironment.js";
import { Fdo } from "./entrypointKinds.js";
import { isActingAsBot } from "../services/ccrAgentProxy/agentProxy.js";
import { env } from "./env.js";

//@ chunk-1gpnajts.js:348-559 placement
function getSessionSurface() {
  if (isChildSession() || hostScheduledRun()) return null;
  if (mn()) {
    let t = getSessionEntrypoint();
    if (t === void 0 || !t.startsWith("remote") || Fdo.has(t)) return null;
    return isActingAsBot() ? null : "cloud";
  }
  if (env.CLAUDE_CODE_REMOTE) return null;
  return isTopHostSession() ? "desktop" : null;
}
//@ chunk-1gpnajts.js:559-627 placement
function a6n() {
  return env.CLAUDE_CODE_ARTIFACT_SHARE === !0 && getSessionSurface() !== null;
}

export { a6n };

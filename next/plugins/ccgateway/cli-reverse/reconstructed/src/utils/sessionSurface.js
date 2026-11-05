/**
 * utils/sessionSurface.ts
 *
 * 2.1.316 新增：会话界面类型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h7aqxg1r.js (2)
 * attribution: placement 2
 */
import { isChildSession, hostScheduledRun, getSessionEntrypoint, isTopHostSession } from "./sessionShape.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { REMOTE_TRIGGER_ENTRYPOINTS_SET } from "./entrypointKinds.js";
import { isActingAsBot } from "../services/ccrAgentProxy/agentProxy.js";
import { env } from "./env.js";

//@ chunk-h7aqxg1r.js:349-561 placement
function getSessionSurface() {
  if (isChildSession() || hostScheduledRun()) return null;
  if (isRemoteManagedEnvironment()) {
    let sessionEntrypoint = getSessionEntrypoint();
    if (
      sessionEntrypoint === undefined ||
      !sessionEntrypoint.startsWith("remote") ||
      REMOTE_TRIGGER_ENTRYPOINTS_SET.has(sessionEntrypoint)
    )
      return null;
    return isActingAsBot() ? null : "cloud";
  }
  if (env.CLAUDE_CODE_REMOTE) return null;
  return isTopHostSession() ? "desktop" : null;
}
//@ chunk-h7aqxg1r.js:561-629 placement
/**
 * isArtifactShareSession：开启了 Artifact 共享且有会话表面。
 */
function isArtifactShareSession() {
  return env.CLAUDE_CODE_ARTIFACT_SHARE === true && getSessionSurface() !== null;
}
export { isArtifactShareSession };

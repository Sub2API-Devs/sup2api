/**
 * utils/filePersistence/filePersistence.ts
 *
 * 云会话文件持久化开关与执行器（混有 OpenTelemetry Span 类）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/filePersistence/filePersistence.ts
 * pieces: chunk-a76knw89.js (1), chunk-azz22fvc.js (1)
 * attribution: fingerprint 2
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getSessionUploadsDirOverride } from "../../bootstrap/state.js";
import { isClaudeAiChatOrigin } from "../entrypointKinds.js";
import { isFirstPartyRemoteSession } from "../userDataRoots.js";
import { env } from "../env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a76knw89.js:18781-18828 fingerprint = executeCloudPersistence (0.657)
/**
 * 云端文件持久化执行器的单例占位（默认返回 ok:false）。
 */
var executeCloudPersistence; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a76knw89.js:18781", () => {
  executeCloudPersistence = new SessionRootSlot(() => ({
    ok: false,
    kept: false,
    failed: false,
  }));
});
//@ chunk-azz22fvc.js:1314-1422 fingerprint = isFilePersistenceEnabled (0.39)
/**
 * 是否启用文件持久化：无覆盖、满足前置条件且设置了 CLAUDE_CODE_REMOTE_SESSION_ID 与 CLAUDE_CODE_ENVIRONMENT_KIND。
 */
function isFilePersistenceEnabled() {
  return (
    getSessionUploadsDirOverride() === null &&
    isClaudeAiChatOrigin() &&
    isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)
  );
}
export { isFilePersistenceEnabled, executeCloudPersistence };

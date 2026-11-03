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
import { S1 } from "../userDataRoots.js";
import { env } from "../env.js";

/**
 * 云端文件持久化执行器的单例占位（默认返回 ok:false）。
 */
//@ chunk-a76knw89.js:18781-18828 fingerprint = executeCloudPersistence (0.657)
var executeCloudPersistence = new SessionRootSlot(() => ({ ok: !1, kept: !1, failed: !1 }));
/**
 * 是否启用文件持久化：无覆盖、满足前置条件且设置了 CLAUDE_CODE_REMOTE_SESSION_ID 与 CLAUDE_CODE_ENVIRONMENT_KIND。
 */
//@ chunk-azz22fvc.js:1314-1422 fingerprint = isFilePersistenceEnabled (0.39)
function isFilePersistenceEnabled() {
  return (
    getSessionUploadsDirOverride() === null &&
    isClaudeAiChatOrigin() &&
    S1(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)
  );
}

export { isFilePersistenceEnabled, executeCloudPersistence };

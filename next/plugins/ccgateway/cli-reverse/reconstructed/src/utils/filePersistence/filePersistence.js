/**
 * utils/filePersistence/filePersistence.ts
 *
 * 云会话文件持久化开关与执行器（混有 OpenTelemetry Span 类）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/filePersistence/filePersistence.ts
 * pieces: chunk-h6gkxbpm.js (1)
 * attribution: fingerprint 1
 */
import { getSessionUploadsDirOverride } from "../../bootstrap/state.js";
import { isClaudeAiChatOrigin } from "../entrypointKinds.js";
import { isFirstPartyRemoteSession } from "../userDataRoots.js";
import { env } from "../env.js";

//@ chunk-h6gkxbpm.js:1279-1387 fingerprint (2.1.88 match: isFilePersistenceEnabled, 0.392)
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
export { isFilePersistenceEnabled };

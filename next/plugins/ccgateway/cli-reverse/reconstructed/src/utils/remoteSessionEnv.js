/**
 * utils/remoteSessionEnv.ts
 *
 * 2.1.316 新增：远程会话环境判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7xyncxy1.js (1), chunk-r28w8ktt.js (1)
 * attribution: placement 2
 */
import { env } from "./env.js";
import { isSelfAddressableSessionId, toCompatSessionId } from "../bridge/sessionIdCompat.js";
import { isFirstPartyProvider } from "./model/providers.js";

//@ chunk-7xyncxy1.js:265-384 placement
/**
 * 远程会话中返回本会话可被寻址的兼容会话 id，非远程或 id 不合法时返回 undefined。
 */
function ownRemoteSessionId() {
  if (env.CLAUDE_CODE_REMOTE !== true) return;
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "";
  return isSelfAddressableSessionId(CLAUDE_CODE_REMOTE_SESSION_ID)
    ? toCompatSessionId(CLAUDE_CODE_REMOTE_SESSION_ID)
    : undefined;
}
//@ chunk-r28w8ktt.js:262-311 placement
/**
 * isRemoteFirstPartySession：远程且第一方提供方。
 */
function isRemoteFirstPartySession() {
  return env.CLAUDE_CODE_REMOTE && isFirstPartyProvider();
}
export { ownRemoteSessionId, isRemoteFirstPartySession };

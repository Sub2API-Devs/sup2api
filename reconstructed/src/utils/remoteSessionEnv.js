/**
 * utils/remoteSessionEnv.ts
 *
 * 2.1.316 新增：远程会话环境判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m00wdbj6.js (1), chunk-pwqvnehp.js (1)
 * attribution: placement 2
 */
import { env } from "./env.js";
import { isFirstPartyProvider } from "./model/providers.js";
import { isSelfAddressableSessionId, toCompatSessionId } from "../bridge/sessionIdCompat.js";

//@ chunk-m00wdbj6.js:262-311 placement
function gHe() {
  return env.CLAUDE_CODE_REMOTE && isFirstPartyProvider();
}
/**
 * 远程会话中返回本会话可被寻址的兼容会话 id，非远程或 id 不合法时返回 undefined。
 */
//@ chunk-pwqvnehp.js:265-384 placement
function ownRemoteSessionId() {
  if (env.CLAUDE_CODE_REMOTE !== !0) return;
  let e = env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "";
  return isSelfAddressableSessionId(e) ? toCompatSessionId(e) : void 0;
}

export { ownRemoteSessionId, gHe };

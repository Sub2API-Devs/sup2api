/**
 * utils/claudeAiSync/sessionRefsGate.ts
 *
 * 2.1.316 新增：取会话引用使用的 CCR 会话 id，必要时从环境变量锁存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (2)
 * attribution: placement 2
 */
import { env } from "../env.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isKnownCcrSessionRef } from "../../services/plugins/accountSync/listPlugins.js";

//@ chunk-f9asxqh1.js:20883-21047 placement
/**
 * 取会话引用使用的 CCR 会话 id（必要时从环境变量锁存）。
 */
function ccrSessionIdForRefs(e) {
  let sessionRefsGate = e.sessionRefsGate;
  if (sessionRefsGate.ccrSessionID() === undefined) {
    let CLAUDE_CODE_SESSION_ID = env.CLAUDE_CODE_SESSION_ID;
    if (CLAUDE_CODE_SESSION_ID && sessionIdBody(CLAUDE_CODE_SESSION_ID) !== CLAUDE_CODE_SESSION_ID)
      sessionRefsGate.latchCcrSessionID(CLAUDE_CODE_SESSION_ID);
  }
  return sessionRefsGate.ccrSessionID();
}
//@ chunk-f9asxqh1.js:21085-21245 placement
/**
 * 判断会话引用同步是否启用（环境变量与条件满足时锁存为真）。
 */
function isSessionRefsSyncEnabled(e) {
  let n = e.sessionRefsGate.syncEnabled();
  if (n !== undefined) return n;
  return e.sessionRefsGate.latchSyncEnabled(!!env.CLAUDE_CODE_SYNC_SESSION_REFS && isKnownCcrSessionRef(e));
}
export { ccrSessionIdForRefs, isSessionRefsSyncEnabled };

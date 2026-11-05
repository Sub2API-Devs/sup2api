/**
 * utils/claudeAiSync/sessionRefsGate.ts
 *
 * 2.1.316 新增：取会话引用使用的 CCR 会话 id，必要时从环境变量锁存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q1gbn2mn.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../env.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isKnownCcrSessionRef } from "../../services/plugins/accountSync/listPlugins.js";

//@ chunk-q1gbn2mn.js:22566-22730 placement
/**
 * 取会话引用使用的 CCR 会话 id（必要时从环境变量锁存）。
 */
function ccrSessionIdForRefs(session) {
  let sessionRefsGate = session.sessionRefsGate;
  if (sessionRefsGate.ccrSessionID() === undefined) {
    let CLAUDE_CODE_SESSION_ID = env.CLAUDE_CODE_SESSION_ID;
    if (CLAUDE_CODE_SESSION_ID && sessionIdBody(CLAUDE_CODE_SESSION_ID) !== CLAUDE_CODE_SESSION_ID)
      sessionRefsGate.latchCcrSessionID(CLAUDE_CODE_SESSION_ID);
  }
  return sessionRefsGate.ccrSessionID();
}
//@ chunk-q1gbn2mn.js:22768-22928 placement
/**
 * 判断会话引用同步是否启用（环境变量与条件满足时锁存为真）。
 */
function isSessionRefsSyncEnabled(session) {
  let latched = session.sessionRefsGate.syncEnabled();
  if (latched !== undefined) return latched;
  return session.sessionRefsGate.latchSyncEnabled(
    !!env.CLAUDE_CODE_SYNC_SESSION_REFS && isKnownCcrSessionRef(session),
  );
}
export { isSessionRefsSyncEnabled, ccrSessionIdForRefs };

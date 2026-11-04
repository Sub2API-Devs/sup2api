/**
 * utils/claudeSubprocessEnv.ts
 *
 * Claude 子进程环境（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (3)
 * attribution: placement 3
 */
import { envSessionKind } from "./sessionShape.js";
import { aiAgentEnvValue } from "./http.js";
import { shouldPropagateTraceContext } from "./model/providers.js";
import { getActiveSpanId } from "./telemetry/sessionTracing.js";
import { env } from "./env.js";

//@ chunk-s61vbvea.js:309947-310287 placement
function claudeSubprocessEnv(context) {
  let env = {
    CLAUDECODE: "1",
    CLAUDE_CODE_SESSION_ID: context.sessionId,
    CLAUDE_CODE_CHILD_SESSION: "1",
    CLAUDE_CODE_SESSION_ATTENDED: envSessionKind() ? "1" : "0",
    CLAUDE_PID: String(process.pid),
  };
  if (context.source === "agent") env.AI_AGENT = aiAgentEnvValue("agent");
  if (context.effortLevel !== undefined) env.CLAUDE_EFFORT = context.effortLevel;
  if (shouldPropagateTraceContext()) {
    let activeSpanId = getActiveSpanId();
    if (activeSpanId !== undefined) env.TRACEPARENT = activeSpanId;
  }
  return env;
}
//@ chunk-s61vbvea.js:310287-310379 placement
function claudeEnvContextFrom(context) {
  return {
    sessionId: context.session_id,
    effortLevel: context.effort?.level,
    source: "harness",
  };
}
//@ chunk-s61vbvea.js:310379-310452 placement
function isSpawnedByClaudeCodeSession() {
  return Boolean(env.CLAUDE_CODE_CHILD_SESSION || env.CLAUDECODE);
}
export { claudeEnvContextFrom, isSpawnedByClaudeCodeSession, claudeSubprocessEnv };

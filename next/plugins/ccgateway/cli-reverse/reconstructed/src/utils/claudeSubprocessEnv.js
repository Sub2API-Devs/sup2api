/**
 * utils/claudeSubprocessEnv.ts
 *
 * Claude 子进程环境（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (3)
 * attribution: placement 3
 */
import { envSessionKind } from "./sessionShape.js";
import { aiAgentEnvValue } from "./http.js";
import { shouldPropagateTraceContext } from "./model/providers.js";
import { getActiveSpanId } from "./telemetry/sessionTracing.js";
import { env } from "./env.js";

//@ chunk-7jxyna5q.js:233382-233722 placement
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
//@ chunk-7jxyna5q.js:233722-233814 placement
function claudeEnvContextFrom(context) {
  return {
    sessionId: context.session_id,
    effortLevel: context.effort?.level,
    source: "harness",
  };
}
//@ chunk-7jxyna5q.js:233814-233887 placement
function isSpawnedByClaudeCodeSession() {
  return Boolean(env.CLAUDE_CODE_CHILD_SESSION || env.CLAUDECODE);
}
export { claudeEnvContextFrom, claudeSubprocessEnv, isSpawnedByClaudeCodeSession };

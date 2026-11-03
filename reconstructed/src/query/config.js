/**
 * query/config.ts
 *
 * 每轮查询的静态配置快照：会话 id 与开关（EMIT_TOOL_USE_SUMMARIES、fast mode 是否禁用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/query/config.ts
 * pieces: chunk-ha3km179.js (1)
 * attribution: fingerprint 1
 */
import { getSessionId } from "../bootstrap/state.js";
import { env } from "../utils/env.js";

/**
 * buildQueryConfig：{sessionId, gates:{emitToolUseSummaries: CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES, isAnt:false, fastModeEnabled: !CLAUDE_CODE_DISABLE_FAST_MODE}}。
 */
//@ chunk-ha3km179.js:142768-142929 fingerprint = buildQueryConfig (0.827)
function buildQueryConfig() {
  return {
    sessionId: getSessionId(),
    gates: {
      emitToolUseSummaries: env.CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES,
      isAnt: !1,
      fastModeEnabled: !env.CLAUDE_CODE_DISABLE_FAST_MODE,
    },
  };
}

export { buildQueryConfig };

/**
 * query/config.ts
 *
 * 每轮查询的静态配置快照：会话 id 与开关（EMIT_TOOL_USE_SUMMARIES、fast mode 是否禁用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/query/config.ts
 * pieces: chunk-w3ch4xq2.js (1)
 * attribution: fingerprint 1
 */
import { getSessionId } from "../bootstrap/state.js";
import { env } from "../utils/env.js";

//@ chunk-w3ch4xq2.js:151679-151840 fingerprint (2.1.88 match: buildQueryConfig, 0.829)
/**
 * buildQueryConfig：{sessionId, gates:{emitToolUseSummaries: CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES, isAnt:false, fastModeEnabled: !CLAUDE_CODE_DISABLE_FAST_MODE}}。
 */
function buildQueryConfig() {
  return {
    sessionId: getSessionId(),
    gates: {
      emitToolUseSummaries: env.CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES,
      isAnt: false,
      fastModeEnabled: !env.CLAUDE_CODE_DISABLE_FAST_MODE,
    },
  };
}
export { buildQueryConfig };

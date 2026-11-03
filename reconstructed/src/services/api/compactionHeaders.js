/**
 * services/api/compactionHeaders.ts
 *
 * 2.1.316 新增：服务端压缩相关请求头
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";

//@ chunk-e6aww6q8.js:1537857-1537989 placement
var X_CC_CONTEXT_COMPACTED = "x-cc-context-compacted",
  X_CC_COMPACTION_REQUEST = "x-cc-compaction-request",
  X_CLAUDE_CODE_COMPACTION = "x-claude-code-compaction",
  X_CLAUDE_CODE_CONTEXT_COMPACTED = "x-claude-code-context-compacted";
//@ chunk-e6aww6q8.js:1537989-1538049 placement
var X_CLAUDE_CODE_PREV_TOOL_DURATIONS = "x-claude-code-prev-tool-durations",
  O4o = 32,
  I4o = 4096;
//@ chunk-e6aww6q8.js:1538049-1538140 placement
function L4o(e) {
  return normalizeFullWidthSpace(e).replace(/%|[;=, ]|[^\x20-\x7e]/gu, (n) => encodeURIComponent(n));
}

export {
  X_CC_CONTEXT_COMPACTED,
  X_CLAUDE_CODE_CONTEXT_COMPACTED,
  X_CC_COMPACTION_REQUEST,
  X_CLAUDE_CODE_COMPACTION,
  X_CLAUDE_CODE_PREV_TOOL_DURATIONS,
  O4o,
  L4o,
  I4o,
};

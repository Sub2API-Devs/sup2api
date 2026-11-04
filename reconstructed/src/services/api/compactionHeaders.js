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
var X_CC_CONTEXT_COMPACTED = "x-cc-context-compacted";
var X_CC_COMPACTION_REQUEST = "x-cc-compaction-request";
var X_CLAUDE_CODE_COMPACTION = "x-claude-code-compaction";
var X_CLAUDE_CODE_CONTEXT_COMPACTED = "x-claude-code-context-compacted";
//@ chunk-e6aww6q8.js:1537989-1538049 placement
/**
 * 压缩请求里工具耗时头 x-claude-code-prev-tool-durations 的限额：最多 32 项、头值 4096 字符。
 */
var X_CLAUDE_CODE_PREV_TOOL_DURATIONS = "x-claude-code-prev-tool-durations";
var MAX_TOOL_DURATION_ENTRIES = 32;
var MAX_TOOL_DURATION_HEADER_CHARS = 4096;
//@ chunk-e6aww6q8.js:1538049-1538140 placement
function encodeToolNameForHeader(toolName) {
  return normalizeFullWidthSpace(toolName).replace(/%|[;=, ]|[^\x20-\x7e]/gu, (char) =>
    encodeURIComponent(char),
  );
}
export {
  X_CC_CONTEXT_COMPACTED,
  X_CLAUDE_CODE_CONTEXT_COMPACTED,
  X_CC_COMPACTION_REQUEST,
  X_CLAUDE_CODE_COMPACTION,
  X_CLAUDE_CODE_PREV_TOOL_DURATIONS,
  MAX_TOOL_DURATION_ENTRIES,
  encodeToolNameForHeader,
  MAX_TOOL_DURATION_HEADER_CHARS,
};

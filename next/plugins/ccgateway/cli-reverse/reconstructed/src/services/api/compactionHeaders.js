/**
 * services/api/compactionHeaders.ts
 *
 * 2.1.316 新增：服务端压缩相关请求头
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 3, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";

//@ chunk-5xgkngpb.js:1603299-1603431 placement
var X_CC_CONTEXT_COMPACTED = "x-cc-context-compacted";
var X_CC_COMPACTION_REQUEST = "x-cc-compaction-request";
var X_CLAUDE_CODE_COMPACTION = "x-claude-code-compaction";
var X_CLAUDE_CODE_CONTEXT_COMPACTED = "x-claude-code-context-compacted";
//@ chunk-5xgkngpb.js:1603431-1603491 placement
/**
 * 压缩请求里工具耗时头 x-claude-code-prev-tool-durations 的限额：最多 32 项、头值 4096 字符。
 */
var X_CLAUDE_CODE_PREV_TOOL_DURATIONS = "x-claude-code-prev-tool-durations";
var MAX_TOOL_DURATION_ENTRIES = 32;
var MAX_TOOL_DURATION_HEADER_CHARS = 4096;
//@ chunk-5xgkngpb.js:1603491-1603582 placement
function encodeToolNameForHeader(toolName) {
  return normalizeFullWidthSpace(toolName).replace(/%|[;=, ]|[^\x20-\x7e]/gu, (char) =>
    encodeURIComponent(char),
  );
}
//@ chunk-5xgkngpb.js:1603582-1603859 affinity
/**
 * 把工具耗时列表编码为 "tool=ms;tool=ms"（数量与总长有上限），用于请求头。
 */
function formatToolDurationsHeader(prevToolDurations) {
  let entries = [];
  let totalMs = 0;
  for (let { toolName, durationMs } of prevToolDurations) {
    if (entries.length >= MAX_TOOL_DURATION_ENTRIES) break;
    if (!Number.isFinite(durationMs)) continue;
    let max = Math.max(0, Math.round(durationMs));
    let entry = `${encodeToolNameForHeader(toolName)}=${max}`;
    let entryDurationMs = entries.length > 0 ? 1 : 0;
    if (totalMs + entryDurationMs + entry.length > MAX_TOOL_DURATION_HEADER_CHARS) break;
    totalMs += entryDurationMs + entry.length;
    entries.push(entry);
  }
  return entries.length > 0 ? entries.join(";") : undefined;
}
export {
  X_CC_CONTEXT_COMPACTED,
  X_CLAUDE_CODE_CONTEXT_COMPACTED,
  X_CC_COMPACTION_REQUEST,
  X_CLAUDE_CODE_COMPACTION,
  X_CLAUDE_CODE_PREV_TOOL_DURATIONS,
  formatToolDurationsHeader,
};

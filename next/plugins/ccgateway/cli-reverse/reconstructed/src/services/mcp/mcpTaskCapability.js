/**
 * services/mcp/mcpTaskCapability.ts
 *
 * 2.1.316 新增：去掉控制/格式字符并截断任务标签；MCP 任务标签长度、格式与能力名常量等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2xs8gvc4.js (4)
 * attribution: placement 4
 */
import { truncateToLength } from "../../utils/stringUtils.js";
import { formatDuration } from "../../utils/format.js";

//@ chunk-2xs8gvc4.js:262-330 placement
/**
 * 任务标签允许的字符（可打印 ASCII）。
 */
var MCP_TASK_LABEL_MAX = 128;
var LABEL_PATTERN = /^[\x21-\x7e]+$/;
var IO_MODELCONTEXTPROTOCOL_TASKS = "io.modelcontextprotocol/tasks";
//@ chunk-2xs8gvc4.js:330-434 placement
/**
 * 去掉控制/格式字符并截断任务标签。
 */
function sanitizeTaskLabel(mcpTaskId) {
  return truncateToLength(
    mcpTaskId.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu, ""),
    MCP_TASK_LABEL_MAX,
  );
}
//@ chunk-2xs8gvc4.js:434-468 placement
/**
 * 截断为短标签。
 */
function shortTaskLabel(mcpTaskId) {
  return truncateToLength(sanitizeTaskLabel(mcpTaskId), 8);
}
//@ chunk-2xs8gvc4.js:468-549 placement
/**
 * 把毫秒格式化成简短时长（<1s 用 ms）。
 */
function formatShortDuration(pollIntervalMs) {
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) return;
  return pollIntervalMs < 1000 ? `${pollIntervalMs}ms` : formatDuration(pollIntervalMs);
}
export {
  IO_MODELCONTEXTPROTOCOL_TASKS,
  shortTaskLabel,
  MCP_TASK_LABEL_MAX,
  LABEL_PATTERN,
  sanitizeTaskLabel,
  formatShortDuration,
};

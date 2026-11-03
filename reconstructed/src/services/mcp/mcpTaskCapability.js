/**
 * services/mcp/mcpTaskCapability.ts
 *
 * 2.1.316 新增：去掉控制/格式字符并截断任务标签；MCP 任务标签长度、格式与能力名常量等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dycbmmjy.js (4)
 * attribution: placement 4
 */
import { truncateToLength } from "../../utils/stringUtils.js";
import { formatDuration } from "../../utils/format.js";

/**
 * MCP 任务标签长度、格式与能力名常量。
 */
//@ chunk-dycbmmjy.js:263-331 placement
var MCP_TASK_LABEL_MAX = 128,
  C2 = /^[\x21-\x7e]+$/,
  IO_MODELCONTEXTPROTOCOL_TASKS = "io.modelcontextprotocol/tasks";
/**
 * 去掉控制/格式字符并截断任务标签。
 */
//@ chunk-dycbmmjy.js:331-436 placement
function sanitizeTaskLabel(r) {
  return truncateToLength(
    r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu, ""),
    MCP_TASK_LABEL_MAX,
  );
}
/**
 * 截断为短标签。
 */
//@ chunk-dycbmmjy.js:436-471 placement
function shortTaskLabel(r) {
  return truncateToLength(sanitizeTaskLabel(r), 8);
}
//@ chunk-dycbmmjy.js:471-552 placement
function f3o(r) {
  if (!Number.isFinite(r) || r <= 0) return;
  return r < 1000 ? `${r}ms` : formatDuration(r);
}

export { MCP_TASK_LABEL_MAX, C2, IO_MODELCONTEXTPROTOCOL_TASKS, shortTaskLabel, sanitizeTaskLabel, f3o };

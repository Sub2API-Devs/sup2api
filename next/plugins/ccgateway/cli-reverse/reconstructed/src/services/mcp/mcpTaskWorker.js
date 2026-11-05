/**
 * services/mcp/mcpTaskWorker.ts
 *
 * 2.1.316 新增：开关 tengu_glowing_lark（MCP 任务）；MCP 任务轮询间隔。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4mjj2ngk.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getSessionEntrypoint } from "../../utils/sessionShape.js";
import { CLI_ENTRYPOINT } from "../../utils/entrypointKinds.js";
import { isCcsTenant } from "../../bootstrap/state.js";

//@ chunk-4mjj2ngk.js:337-350 placement
/**
 * MCP 任务轮询间隔。
 */
var MCP_TASK_POLL_MS = 5000;
//@ chunk-4mjj2ngk.js:350-480 placement
/**
 * 开关 tengu_glowing_lark（MCP 任务）。
 */
function isMcpTasksEnabled() {
  if (env.CLAUDE_CODE_DISABLE_MCP_TASKS) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_glowing_lark",
    getSessionEntrypoint() === CLI_ENTRYPOINT && !env.CLAUDE_CODE_REMOTE && !isCcsTenant(),
  );
}
//@ chunk-4mjj2ngk.js:480-543 placement
/**
 * 任务 worker 唤醒是否开启（MCP 任务启用且有 tengu_mcp_task_worker_wake）。
 */
function isTaskWorkerWakeEnabled() {
  return isMcpTasksEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_task_worker_wake", false);
}
//@ chunk-4mjj2ngk.js:543-607 placement
/**
 * MCP 任务的后台执行是否被环境变量禁用。
 */
function isTaskBackgroundDisabled() {
  return env.CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND;
}
export { isMcpTasksEnabled, isTaskBackgroundDisabled, MCP_TASK_POLL_MS, isTaskWorkerWakeEnabled };

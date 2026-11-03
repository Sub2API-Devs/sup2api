/**
 * services/mcp/mcpTaskWorker.ts
 *
 * 2.1.316 新增：开关 tengu_glowing_lark（MCP 任务）；MCP 任务轮询间隔。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2fgr7cjv.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { env } from "../../utils/env.js";

/**
 * MCP 任务轮询间隔。
 */
//@ chunk-2fgr7cjv.js:261-274 placement
var MCP_TASK_POLL_MS = 5000;
/**
 * 开关 tengu_glowing_lark（MCP 任务）。
 */
//@ chunk-2fgr7cjv.js:274-322 placement
function isMcpTasksEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_glowing_lark", !1);
}
//@ chunk-2fgr7cjv.js:322-385 placement
function qSn() {
  return isMcpTasksEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_task_worker_wake", !1);
}
//@ chunk-2fgr7cjv.js:385-449 placement
function u3o() {
  return env.CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND;
}

export { MCP_TASK_POLL_MS, isMcpTasksEnabled, u3o, qSn };

/**
 * tasks/McpTask/mcpTaskState.ts
 *
 * 2.1.316 新增：MCP 任务（mcp_task）的任务状态构造
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9506wmp0.js (3)
 * attribution: placement 3
 */
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";

//@ chunk-9506wmp0.js:266-318 placement
/**
 * 用服务器名与工具名拼出 MCP 任务键。
 */
function mcpTaskKey(serverName, toolName) {
  return `${cleanTaskDescription(serverName) ?? ""}/${cleanTaskDescription(toolName) ?? ""}`;
}
//@ chunk-9506wmp0.js:318-351 placement
/**
 * 取工具名，无则空串。
 */
function toolNameOrEmpty(serverName) {
  return cleanTaskDescription(serverName) ?? "";
}
//@ chunk-9506wmp0.js:351-797 placement
/**
 * 创建 MCP 后台任务的初始状态：服务器名、工具名、任务 id、轮询间隔与中止控制器等。
 */
function createMcpTaskState({
  serverName,
  toolName,
  mcpTaskId,
  toolUseId,
  pollIntervalMs,
  abortController,
  backgroundedToDeliverMessage,
  protocol,
  driveAbortController,
  ttlExpiresAt,
}) {
  let taskId = generateTaskId("mcp_task");
  return {
    ...createTaskStateBase(taskId, "mcp_task", mcpTaskKey(serverName, toolName), toolUseId),
    type: "mcp_task",
    status: "running",
    serverName,
    toolName,
    mcpTaskId: mcpTaskId ?? taskId,
    mcpStatus: "working",
    pollIntervalMs,
    abortController,
    backgroundedToDeliverMessage,
    protocol,
    driveAbortController,
    ttlExpiresAt,
  };
}
export { createMcpTaskState, mcpTaskKey, toolNameOrEmpty };

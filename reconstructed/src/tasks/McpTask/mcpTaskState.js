/**
 * tasks/McpTask/mcpTaskState.ts
 *
 * 2.1.316 新增：MCP 任务（mcp_task）的任务状态构造
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w2thzqyb.js (3)
 * attribution: placement 3
 */
import { vc } from "../../utils/taskDescription.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";

//@ chunk-w2thzqyb.js:266-318 placement
function joe(e, t) {
  return `${vc(e) ?? ""}/${vc(t) ?? ""}`;
}
//@ chunk-w2thzqyb.js:318-351 placement
function o2s(e) {
  return vc(e) ?? "";
}
/**
 * 创建 MCP 后台任务的初始状态：服务器名、工具名、任务 id、轮询间隔与中止控制器等。
 */
//@ chunk-w2thzqyb.js:351-797 placement
function createMcpTaskState({
  serverName: serverName,
  toolName: toolName,
  mcpTaskId: mcpTaskId,
  toolUseId: toolUseId,
  pollIntervalMs: pollIntervalMs,
  abortController: abortController,
  backgroundedToDeliverMessage: backgroundedToDeliverMessage,
  protocol: protocol,
  driveAbortController: driveAbortController,
  ttlExpiresAt: ttlExpiresAt,
}) {
  let r = generateTaskId("mcp_task");
  return {
    ...createTaskStateBase(r, "mcp_task", joe(serverName, toolName), toolUseId),
    type: "mcp_task",
    status: "running",
    serverName: serverName,
    toolName: toolName,
    mcpTaskId: mcpTaskId ?? r,
    mcpStatus: "working",
    pollIntervalMs: pollIntervalMs,
    abortController: abortController,
    backgroundedToDeliverMessage: backgroundedToDeliverMessage,
    protocol: protocol,
    driveAbortController: driveAbortController,
    ttlExpiresAt: ttlExpiresAt,
  };
}

export { createMcpTaskState, joe, o2s };

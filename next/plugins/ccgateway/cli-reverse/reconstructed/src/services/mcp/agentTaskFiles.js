/**
 * services/mcp/agentTaskFiles.ts
 *
 * claudeai-agents MCP 任务文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5pwwmx4q.js (24)
 * attribution: placement 24
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { recordToolUseDecision } from "../../components/permissions/hooks.js";
import { isFirstPartyToolboxServer } from "./fileReference/fileReferencePolicy.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { isDiskless } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5pwwmx4q.js:372-412 placement
/**
 * 按会话根保存的“工具调用 → 待上传任务文件”表。
 */
var taskFilesByToolUse; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5pwwmx4q.js:372", () => {
  taskFilesByToolUse = new SessionRootSlot(() => ({
    byToolUse: new Map(),
  }));
});
//@ chunk-5pwwmx4q.js:412-538 placement
/**
 * 登记某次工具调用的待上传任务文件，并在调用结束时自动丢弃。
 */
function registerPendingTaskFiles(session, taskFiles) {
  let { byToolUse } = taskFilesByToolUse.of(session);
  byToolUse.set(taskFiles.toolUseId, [...(byToolUse.get(taskFiles.toolUseId) ?? []), taskFiles]);
  recordToolUseDecision(session, taskFiles.toolUseId, () => {
    discardTaskFiles(session, taskFiles);
  });
}
//@ chunk-5pwwmx4q.js:538-669 placement
/**
 * 查找某次工具调用中指定路径表单、仍在上传或待定的任务文件。
 */
function findInFlightTaskFiles(session, toolUseId, pathFormKey) {
  return taskFilesByToolUse
    .peek(session)
    ?.byToolUse.get(toolUseId)
    ?.find(
      (entry) =>
        entry.pathFormKey === pathFormKey && (entry.state === "uploading" || entry.state === "pending"),
    );
}
//@ chunk-5pwwmx4q.js:669-1030 placement
/**
 * 查找与工具参数中的文件列表（file_id 与 name 完全一致）对应的待定任务文件。
 */
function findPendingTaskFilesForArgs(session, toolUseId, files) {
  if (session === undefined || toolUseId === undefined) return;
  if (!Array.isArray(files)) return;
  return taskFilesByToolUse
    .peek(session)
    ?.byToolUse.get(toolUseId)
    ?.find(
      (entry) =>
        entry.state === "pending" &&
        entry.files.length === files.length &&
        entry.files.every((file, index) => {
          let argFile = files[index];
          return (
            typeof argFile === "object" &&
            argFile !== null &&
            !Array.isArray(argFile) &&
            Object.keys(argFile).length === 2 &&
            "file_id" in argFile &&
            "name" in argFile &&
            argFile.file_id === file.file_id &&
            argFile.name === file.name
          );
        }),
    );
}
//@ chunk-5pwwmx4q.js:1030-1176 placement
/**
 * 丢弃任务文件：从登记中移除，仍在上传或待定时标记删除并调用远端删除。
 */
async function discardTaskFiles(session, taskFiles) {
  unregisterTaskFiles(session, taskFiles);
  if (taskFiles.state !== "uploading" && taskFiles.state !== "pending") return;
  taskFiles.state = "deleted";
  await taskFiles.remove(taskFiles.files.map((file) => file.file_id));
}
//@ chunk-5pwwmx4q.js:1176-1239 placement
/**
 * 把任务文件标记为已发送并注销。
 */
function markTaskFilesSent(session, taskFiles) {
  unregisterTaskFiles(session, taskFiles);
  if (taskFiles.state !== "deleted") taskFiles.state = "sent";
}
//@ chunk-5pwwmx4q.js:1239-1390 placement
function unregisterTaskFiles(session, taskFiles) {
  let { byToolUse } = taskFilesByToolUse.of(session);
  let filtered = (byToolUse.get(taskFiles.toolUseId) ?? []).filter((entry) => entry !== taskFiles);
  if (filtered.length === 0) byToolUse.delete(taskFiles.toolUseId);
  else byToolUse.set(taskFiles.toolUseId, filtered);
}
//@ chunk-5pwwmx4q.js:1390-1432 placement
var REFUSEDBYCCRPROXYBEFOREFORWARDING = "refusedByCcrProxyBeforeForwarding";
//@ chunk-5pwwmx4q.js:1432-1527 placement
/**
 * 给结果打上“被 CCR 代理拒绝”的标记。
 */
function markRefusedByCcrProxy(error) {
  if (typeof error === "object" && error !== null)
    Object.defineProperty(error, REFUSEDBYCCRPROXYBEFOREFORWARDING, {
      value: true,
    });
  return error;
}
//@ chunk-5pwwmx4q.js:1527-1591 placement
/**
 * 判断结果是否带有“被 CCR 代理拒绝”标记。
 */
function isRefusedByCcrProxy(error) {
  return typeof error === "object" && error !== null && error[REFUSEDBYCCRPROXYBEFOREFORWARDING] === true;
}
//@ chunk-5pwwmx4q.js:1591-1847 placement
var APPROVAL_ARGS_MISMATCH_MESSAGE =
  "This tool call's approval was for different arguments. Ask the user to approve again \u2014 the previous approval cannot be reused.";
var APPROVAL_WITHOUT_ARGS_MESSAGE =
  "Nothing ran: the user's approval was stored without this call's arguments, so it could not be tied to the call.";
//@ chunk-5pwwmx4q.js:1847-1899 placement
/**
 * 判断错误文本是否属于审批参数不一致。
 */
function isApprovalMismatchMessage(message) {
  return message.includes(APPROVAL_ARGS_MISMATCH_MESSAGE) || message.includes(APPROVAL_WITHOUT_ARGS_MESSAGE);
}
//@ chunk-5pwwmx4q.js:1899-1939 placement
/**
 * 按会话根保存的“工具调用 → 丢弃回调”表。
 */
var taskFileDiscarders; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5pwwmx4q.js:1899", () => {
  taskFileDiscarders = new SessionRootSlot(() => ({
    byToolUse: new Map(),
  }));
});
//@ chunk-5pwwmx4q.js:1939-1986 placement
/**
 * 登记某工具调用的丢弃回调。
 */
function registerDiscarder(session, toolUseId, discarder) {
  taskFileDiscarders.of(session).byToolUse.set(toolUseId, discarder);
}
//@ chunk-5pwwmx4q.js:1986-2035 placement
/**
 * 注销某工具调用的丢弃回调。
 */
function unregisterDiscarder(session, toolUseId) {
  taskFileDiscarders.peek(session)?.byToolUse.delete(toolUseId);
}
//@ chunk-5pwwmx4q.js:2035-2125 placement
/**
 * 执行并注销某工具调用的丢弃回调。
 */
function runDiscarder(session, toolUseId) {
  if (session === undefined || toolUseId === undefined) return;
  return taskFileDiscarders.peek(session)?.byToolUse.get(toolUseId)?.();
}
//@ chunk-5pwwmx4q.js:2125-2240 placement
/**
 * 启动时持有的服务器 id 集合。
 */
var AGENT_TASKS_MCP_PATH; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var F688F3FC_1D05_5BD1_9C48_9854EC083044;
var bootHeldServers;
var bootHeldServerIds;
deferInit("chunk-5pwwmx4q.js:2125", () => {
  AGENT_TASKS_MCP_PATH = "/v1/claudeai-agents/mcp";
  F688F3FC_1D05_5BD1_9C48_9854EC083044 = "f688f3fc-1d05-5bd1-9c48-9854ec083044";
  bootHeldServers = new SessionRootSlot(() => ({}));
  bootHeldServerIds = new SessionRootSlot(() => ({}));
});
//@ chunk-5pwwmx4q.js:2240-2371 placement
/**
 * 判断 MCP 服务器是否是启动时就持有、地址未变的 http 服务器。
 */
function isBootHeldServer(host, info) {
  let serverUrl = host.servers.get(info.name);
  return (
    serverUrl !== undefined &&
    info.config.type === "http" &&
    info.config.url === serverUrl &&
    host.heldSinceBoot(info.name)
  );
}
//@ chunk-5pwwmx4q.js:2371-2424 placement
/**
 * 任务文件 id 的正则（file_ 前缀）。
 */
var FILE_ID_RE = /^file_[A-Za-z0-9_-]{1,128}$/;
var GET_TASK = "get_task";
//@ chunk-5pwwmx4q.js:2424-2483 placement
/**
 * 判断是否为写任务类的 MCP 方法（start_task/update_task）。
 */
function isTaskWriteMethod(name) {
  return name === "start_task" || name === "update_task";
}
//@ chunk-5pwwmx4q.js:2483-2533 placement
function matchesToolboxServer(toolName) {
  return isFirstPartyToolboxServer(toolName, {
    path: AGENT_TASKS_MCP_PATH,
    serverId: F688F3FC_1D05_5BD1_9C48_9854EC083044,
  });
}
//@ chunk-5pwwmx4q.js:2533-2628 placement (2.1.88 match: isHTTPConfig, 1)
function isToolboxMcpServer(config) {
  if (config.config.type !== "http" || !isSameOriginAsCcr(config.config.url)) return false;
  return isDiskless() ? hasToolboxServerIdParam(config) : matchesToolboxServer(config);
}
//@ chunk-5pwwmx4q.js:2628-2823 placement
/**
 * hasToolboxServerIdParam：http 配置 URL 的 toolbox_mcp_server_id 参数匹配内置远程设备服务器 ID。
 */
function hasToolboxServerIdParam(info) {
  if (info.config.type !== "http" || !isSameOriginAsCcr(info.config.url)) return false;
  try {
    return new URL(info.config.url).searchParams
      .getAll("toolbox_mcp_server_id")
      .some((value) => value.toLowerCase() === F688F3FC_1D05_5BD1_9C48_9854EC083044);
  } catch {
    return false;
  }
}
//@ chunk-5pwwmx4q.js:2823-2866 placement
/**
 * 判断该服务器是否为 toolbox 服务器（或无盘会话里带 toolbox id 参数）。
 */
function isToolboxServer(info) {
  return matchesToolboxServer(info) || (isDiskless() && hasToolboxServerIdParam(info));
}
export {
  markRefusedByCcrProxy,
  GET_TASK,
  isToolboxServer,
  isTaskWriteMethod,
  findPendingTaskFilesForArgs,
  discardTaskFiles,
  registerDiscarder,
  isRefusedByCcrProxy,
  unregisterDiscarder,
  markTaskFilesSent,
  isToolboxMcpServer,
  isApprovalMismatchMessage,
  runDiscarder,
  FILE_ID_RE,
  bootHeldServers,
  isBootHeldServer,
  matchesToolboxServer,
  findInFlightTaskFiles,
  registerPendingTaskFiles,
  hasToolboxServerIdParam,
  bootHeldServerIds,
};

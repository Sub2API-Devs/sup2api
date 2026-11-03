/**
 * services/mcp/agentTaskFiles.ts
 *
 * claudeai-agents MCP 任务文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fra6697p.js (24)
 * attribution: placement 24
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { recordToolUseDecision } from "../../components/permissions/hooks.js";
import { isFirstPartyToolboxServer } from "./fileReference/fileReferencePolicy.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-fra6697p.js:339-379 placement
/**
 * 按会话根保存的“工具调用 → 待上传任务文件”表。
 */
var taskFilesByToolUse = new SessionRootSlot(() => ({
  byToolUse: new Map(),
}));
//@ chunk-fra6697p.js:379-505 placement
/**
 * 登记某次工具调用的待上传任务文件，并在调用结束时自动丢弃。
 */
function registerPendingTaskFiles(e, t) {
  let { byToolUse } = taskFilesByToolUse.of(e);
  byToolUse.set(t.toolUseId, [...(byToolUse.get(t.toolUseId) ?? []), t]);
  recordToolUseDecision(e, t.toolUseId, () => {
    discardTaskFiles(e, t);
  });
}
//@ chunk-fra6697p.js:505-636 placement
/**
 * 查找某次工具调用中指定路径表单、仍在上传或待定的任务文件。
 */
function findInFlightTaskFiles(e, t, r) {
  return taskFilesByToolUse
    .peek(e)
    ?.byToolUse.get(t)
    ?.find((s) => s.pathFormKey === r && (s.state === "uploading" || s.state === "pending"));
}
//@ chunk-fra6697p.js:636-997 placement
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
      (s) =>
        s.state === "pending" &&
        s.files.length === files.length &&
        s.files.every((file, u) => {
          let o = files[u];
          return (
            typeof o === "object" &&
            o !== null &&
            !Array.isArray(o) &&
            Object.keys(o).length === 2 &&
            "file_id" in o &&
            "name" in o &&
            o.file_id === file.file_id &&
            o.name === file.name
          );
        }),
    );
}
//@ chunk-fra6697p.js:997-1143 placement
/**
 * 丢弃任务文件：从登记中移除，仍在上传或待定时标记删除并调用远端删除。
 */
async function discardTaskFiles(session, pendingTaskFilesForArgs) {
  unregisterTaskFiles(session, pendingTaskFilesForArgs);
  if (pendingTaskFilesForArgs.state !== "uploading" && pendingTaskFilesForArgs.state !== "pending") return;
  pendingTaskFilesForArgs.state = "deleted";
  await pendingTaskFilesForArgs.remove(pendingTaskFilesForArgs.files.map((file) => file.file_id));
}
//@ chunk-fra6697p.js:1143-1206 placement
/**
 * 把任务文件标记为已发送并注销。
 */
function markTaskFilesSent(session, pendingTaskFilesForArgs) {
  unregisterTaskFiles(session, pendingTaskFilesForArgs);
  if (pendingTaskFilesForArgs.state !== "deleted") pendingTaskFilesForArgs.state = "sent";
}
//@ chunk-fra6697p.js:1206-1357 placement
function unregisterTaskFiles(e, t) {
  let { byToolUse } = taskFilesByToolUse.of(e);
  let filtered = (byToolUse.get(t.toolUseId) ?? []).filter((n) => n !== t);
  if (filtered.length === 0) byToolUse.delete(t.toolUseId);
  else byToolUse.set(t.toolUseId, filtered);
}
//@ chunk-fra6697p.js:1357-1399 placement
var REFUSEDBYCCRPROXYBEFOREFORWARDING = "refusedByCcrProxyBeforeForwarding";
//@ chunk-fra6697p.js:1399-1494 placement
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
//@ chunk-fra6697p.js:1494-1558 placement
/**
 * 判断结果是否带有“被 CCR 代理拒绝”标记。
 */
function isRefusedByCcrProxy(error) {
  return typeof error === "object" && error !== null && error[REFUSEDBYCCRPROXYBEFOREFORWARDING] === true;
}
//@ chunk-fra6697p.js:1558-1814 placement
var APPROVAL_ARGS_MISMATCH_MESSAGE =
  "This tool call's approval was for different arguments. Ask the user to approve again \u2014 the previous approval cannot be reused.";
var APPROVAL_WITHOUT_ARGS_MESSAGE =
  "Nothing ran: the user's approval was stored without this call's arguments, so it could not be tied to the call.";
//@ chunk-fra6697p.js:1814-1866 placement
/**
 * 判断错误文本是否属于审批参数不一致。
 */
function isApprovalMismatchMessage(message) {
  return message.includes(APPROVAL_ARGS_MISMATCH_MESSAGE) || message.includes(APPROVAL_WITHOUT_ARGS_MESSAGE);
}
//@ chunk-fra6697p.js:1866-1906 placement
/**
 * 按会话根保存的“工具调用 → 丢弃回调”表。
 */
var taskFileDiscarders = new SessionRootSlot(() => ({
  byToolUse: new Map(),
}));
//@ chunk-fra6697p.js:1906-1953 placement
/**
 * 登记某工具调用的丢弃回调。
 */
function registerDiscarder(session, toolUseId, r) {
  taskFileDiscarders.of(session).byToolUse.set(toolUseId, r);
}
//@ chunk-fra6697p.js:1953-2002 placement
/**
 * 注销某工具调用的丢弃回调。
 */
function unregisterDiscarder(session, toolUseId) {
  taskFileDiscarders.peek(session)?.byToolUse.delete(toolUseId);
}
//@ chunk-fra6697p.js:2002-2092 placement
/**
 * 执行并注销某工具调用的丢弃回调。
 */
function runDiscarder(session, toolUseId) {
  if (session === undefined || toolUseId === undefined) return;
  return taskFileDiscarders.peek(session)?.byToolUse.get(toolUseId)?.();
}
//@ chunk-fra6697p.js:2092-2207 placement
/**
 * 启动时持有的服务器 id 集合。
 */
var AGENT_TASKS_MCP_PATH = "/v1/claudeai-agents/mcp";
var F688F3FC_1D05_5BD1_9C48_9854EC083044 = "f688f3fc-1d05-5bd1-9c48-9854ec083044";
var bootHeldServers = new SessionRootSlot(() => ({}));
var bootHeldServerIds = new SessionRootSlot(() => ({}));
//@ chunk-fra6697p.js:2207-2338 placement
/**
 * 判断 MCP 服务器是否是启动时就持有、地址未变的 http 服务器。
 */
function isBootHeldServer(host, t) {
  let r = host.servers.get(t.name);
  return r !== undefined && t.config.type === "http" && t.config.url === r && host.heldSinceBoot(t.name);
}
//@ chunk-fra6697p.js:2338-2391 placement
/**
 * 任务文件 id 的正则（file_ 前缀）。
 */
var FILE_ID_RE = /^file_[A-Za-z0-9_-]{1,128}$/;
var GET_TASK = "get_task";
//@ chunk-fra6697p.js:2391-2450 placement
/**
 * 判断是否为写任务类的 MCP 方法（start_task/update_task）。
 */
function isTaskWriteMethod(name) {
  return name === "start_task" || name === "update_task";
}
//@ chunk-fra6697p.js:2450-2500 placement
function matchesToolboxServer(connection) {
  return isFirstPartyToolboxServer(connection, {
    path: AGENT_TASKS_MCP_PATH,
    serverId: F688F3FC_1D05_5BD1_9C48_9854EC083044,
  });
}
//@ chunk-fra6697p.js:2500-2595 placement = isHTTPConfig (1)
function isToolboxMcpServer(config) {
  if (config.config.type !== "http" || !isSameOriginAsCcr(config.config.url)) return false;
  return isDiskless() ? hasToolboxServerIdParam(config) : matchesToolboxServer(config);
}
//@ chunk-fra6697p.js:2595-2790 placement
/**
 * hasToolboxServerIdParam：http 配置 URL 的 toolbox_mcp_server_id 参数匹配内置远程设备服务器 ID。
 */
function hasToolboxServerIdParam(e) {
  if (e.config.type !== "http" || !isSameOriginAsCcr(e.config.url)) return false;
  try {
    return new URL(e.config.url).searchParams
      .getAll("toolbox_mcp_server_id")
      .some((t) => t.toLowerCase() === F688F3FC_1D05_5BD1_9C48_9854EC083044);
  } catch {
    return false;
  }
}
//@ chunk-fra6697p.js:2790-2833 placement
/**
 * 判断该服务器是否为 toolbox 服务器（或无盘会话里带 toolbox id 参数）。
 */
function isToolboxServer(client) {
  return matchesToolboxServer(client) || (isDiskless() && hasToolboxServerIdParam(client));
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
  matchesToolboxServer,
  hasToolboxServerIdParam,
  bootHeldServerIds,
  isBootHeldServer,
  bootHeldServers,
  findInFlightTaskFiles,
  registerPendingTaskFiles,
};

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
import { kCt } from "../../components/permissions/hooks.js";
import { isFirstPartyToolboxServer } from "./fileReference/fileReferencePolicy.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-fra6697p.js:339-379 placement
var i = new SessionRootSlot(() => ({ byToolUse: new Map() }));
/**
 * 登记某次工具调用的待上传任务文件，并在调用结束时自动丢弃。
 */
//@ chunk-fra6697p.js:379-505 placement
function registerPendingTaskFiles(e, t) {
  let { byToolUse: byToolUse } = i.of(e);
  (byToolUse.set(t.toolUseId, [...(byToolUse.get(t.toolUseId) ?? []), t]),
    kCt(e, t.toolUseId, () => {
      discardTaskFiles(e, t);
    }));
}
/**
 * 查找某次工具调用中指定路径表单、仍在上传或待定的任务文件。
 */
//@ chunk-fra6697p.js:505-636 placement
function findInFlightTaskFiles(e, t, r) {
  return i
    .peek(e)
    ?.byToolUse.get(t)
    ?.find((s) => s.pathFormKey === r && (s.state === "uploading" || s.state === "pending"));
}
/**
 * 查找与工具参数中的文件列表（file_id 与 name 完全一致）对应的待定任务文件。
 */
//@ chunk-fra6697p.js:636-997 placement
function findPendingTaskFilesForArgs(e, t, r) {
  if (e === void 0 || t === void 0) return;
  if (!Array.isArray(r)) return;
  return i
    .peek(e)
    ?.byToolUse.get(t)
    ?.find(
      (s) =>
        s.state === "pending" &&
        s.files.length === r.length &&
        s.files.every((file, u) => {
          let o = r[u];
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
/**
 * 丢弃任务文件：从登记中移除，仍在上传或待定时标记删除并调用远端删除。
 */
//@ chunk-fra6697p.js:997-1143 placement
async function discardTaskFiles(e, t) {
  if ((unregisterTaskFiles(e, t), t.state !== "uploading" && t.state !== "pending")) return;
  ((t.state = "deleted"), await t.remove(t.files.map((file) => file.file_id)));
}
//@ chunk-fra6697p.js:1143-1206 placement
function cYn(e, t) {
  if ((unregisterTaskFiles(e, t), t.state !== "deleted")) t.state = "sent";
}
//@ chunk-fra6697p.js:1206-1357 placement
function unregisterTaskFiles(e, t) {
  let { byToolUse: byToolUse } = i.of(e),
    filtered = (byToolUse.get(t.toolUseId) ?? []).filter((n) => n !== t);
  if (filtered.length === 0) byToolUse.delete(t.toolUseId);
  else byToolUse.set(t.toolUseId, filtered);
}
//@ chunk-fra6697p.js:1357-1399 placement
var REFUSEDBYCCRPROXYBEFOREFORWARDING = "refusedByCcrProxyBeforeForwarding";
//@ chunk-fra6697p.js:1399-1494 placement
function z9(e) {
  if (typeof e === "object" && e !== null)
    Object.defineProperty(e, REFUSEDBYCCRPROXYBEFOREFORWARDING, { value: !0 });
  return e;
}
//@ chunk-fra6697p.js:1494-1558 placement
function yZe(e) {
  return typeof e === "object" && e !== null && e[REFUSEDBYCCRPROXYBEFOREFORWARDING] === !0;
}
//@ chunk-fra6697p.js:1558-1814 placement
var APPROVAL_ARGS_MISMATCH_MESSAGE =
    "This tool call's approval was for different arguments. Ask the user to approve again \u2014 the previous approval cannot be reused.",
  APPROVAL_WITHOUT_ARGS_MESSAGE =
    "Nothing ran: the user's approval was stored without this call's arguments, so it could not be tied to the call.";
//@ chunk-fra6697p.js:1814-1866 placement
function uYn(e) {
  return e.includes(APPROVAL_ARGS_MISMATCH_MESSAGE) || e.includes(APPROVAL_WITHOUT_ARGS_MESSAGE);
}
//@ chunk-fra6697p.js:1866-1906 placement
var a = new SessionRootSlot(() => ({ byToolUse: new Map() }));
//@ chunk-fra6697p.js:1906-1953 placement
function NBt(e, t, r) {
  a.of(e).byToolUse.set(t, r);
}
//@ chunk-fra6697p.js:1953-2002 placement
function $Bt(e, t) {
  a.peek(e)?.byToolUse.delete(t);
}
//@ chunk-fra6697p.js:2002-2092 placement
function fYn(e, t) {
  if (e === void 0 || t === void 0) return;
  return a.peek(e)?.byToolUse.get(t)?.();
}
//@ chunk-fra6697p.js:2092-2207 placement
var AGENT_TASKS_MCP_PATH = "/v1/claudeai-agents/mcp",
  F688F3FC_1D05_5BD1_9C48_9854EC083044 = "f688f3fc-1d05-5bd1-9c48-9854ec083044",
  gzs = new SessionRootSlot(() => ({})),
  hzs = new SessionRootSlot(() => ({}));
/**
 * 判断 MCP 服务器是否是启动时就持有、地址未变的 http 服务器。
 */
//@ chunk-fra6697p.js:2207-2338 placement
function isBootHeldServer(e, t) {
  let r = e.servers.get(t.name);
  return r !== void 0 && t.config.type === "http" && t.config.url === r && e.heldSinceBoot(t.name);
}
//@ chunk-fra6697p.js:2338-2391 placement
var m_e = /^file_[A-Za-z0-9_-]{1,128}$/,
  GET_TASK = "get_task";
//@ chunk-fra6697p.js:2391-2450 placement
function FBt(e) {
  return e === "start_task" || e === "update_task";
}
//@ chunk-fra6697p.js:2450-2500 placement
function matchesToolboxServer(e) {
  return isFirstPartyToolboxServer(e, {
    path: AGENT_TASKS_MCP_PATH,
    serverId: F688F3FC_1D05_5BD1_9C48_9854EC083044,
  });
}
//@ chunk-fra6697p.js:2500-2595 placement = isHTTPConfig (1)
function isToolboxMcpServer(config) {
  if (config.config.type !== "http" || !isSameOriginAsCcr(config.config.url)) return !1;
  return isDiskless() ? hasToolboxServerIdParam(config) : matchesToolboxServer(config);
}
/**
 * hasToolboxServerIdParam：http 配置 URL 的 toolbox_mcp_server_id 参数匹配内置远程设备服务器 ID。
 */
//@ chunk-fra6697p.js:2595-2790 placement
function hasToolboxServerIdParam(e) {
  if (e.config.type !== "http" || !isSameOriginAsCcr(e.config.url)) return !1;
  try {
    return new URL(e.config.url).searchParams
      .getAll("toolbox_mcp_server_id")
      .some((t) => t.toLowerCase() === F688F3FC_1D05_5BD1_9C48_9854EC083044);
  } catch {
    return !1;
  }
}
//@ chunk-fra6697p.js:2790-2833 placement
function UBt(e) {
  return matchesToolboxServer(e) || (isDiskless() && hasToolboxServerIdParam(e));
}

export {
  z9,
  GET_TASK,
  UBt,
  FBt,
  findPendingTaskFilesForArgs,
  discardTaskFiles,
  NBt,
  yZe,
  $Bt,
  cYn,
  isToolboxMcpServer,
  uYn,
  fYn,
  m_e,
  matchesToolboxServer,
  hasToolboxServerIdParam,
  hzs,
  isBootHeldServer,
  gzs,
  findInFlightTaskFiles,
  registerPendingTaskFiles,
};

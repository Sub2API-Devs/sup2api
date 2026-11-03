/**
 * cli/print/sessionControlRequests.ts
 *
 * 2.1.316 新增：会话类控制请求：generate_session_title、rename_session、stop_task、send_task_message 等
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nkdv7dw8.js (12)
 * attribution: placement 12
 */
import { WireSafeControlError } from "../../utils/errors.js";
import { Eyt } from "../../utils/sessionTitle.js";
import { getSessionId } from "../../bootstrap/state.js";
import { textForResubmit } from "../../utils/messages.js";
import {
  getCurrentSessionTitle,
  getCurrentSessionAiTitle,
  subscribeSessionTitleChanged,
  getCurrentSessionAgentName,
  cacheSessionTitle,
  getMaterializedSessionFile,
  appendEntryToFileAsync,
  saveCustomTitle,
} from "../../utils/sessionStorage.js";
import {
  saveGeneratedTitle,
  St,
  Ct,
  vt,
  _t,
  handleListModels,
  handleGetBinaryVersion,
  wt,
  clearUnknownServerOverride,
  handleMcpReconnect,
  pt,
  handleMcpReadResource,
  Dt,
  Tt,
  isUnadoptedSdkServer,
} from "./mcpControlRequests.js";
import { sanitizeSessionTitle } from "../../utils/stringUtils.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { whenSessionRegistered } from "../../utils/concurrentSessions.js";
import { reclaimSessionNameOnResume } from "../../utils/sessionNameUniqueness.js";
import { R7 } from "../../remote/wireFrameShape.js";
import { controlHandlerError } from "./dispatchControlRequest.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { Pz } from "../../services/queuedNotifications/queuedNotifications.js";
import { stopTaskByUser } from "../../tasks/stopTask.js";
import { createTaskFramework } from "../../utils/task/framework.js";
import {
  parseOptionalToolUseId,
  a7r,
  BACKGROUND_TASKS_DISABLED_MESSAGE,
} from "../../bridge/controlRequests.js";
import { uf } from "../../tools/AgentTool/backgroundGates.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { isTaskIdOfType } from "../../Task.js";
import { tailOutputOfTask } from "../../utils/task/diskOutput.js";
import { handleSetMaxThinkingTokens } from "./setMaxThinkingTokens.js";

//@ chunk-nkdv7dw8.js:37689-38282 placement
async function handleGenerateSessionTitle(e, n) {
  let o = Ut(n);
  if ("recordRename" in o) throw new WireSafeControlError(Ft);
  let { description: description, persist: persist } = e;
  if (typeof description !== "string")
    throw new WireSafeControlError("generate_session_title: description must be a string");
  if (persist != null && typeof persist !== "boolean")
    throw new WireSafeControlError("generate_session_title: persist must be a boolean");
  if (!persist) return { title: await Eyt(description, o.turnAbortSignal(), o.credentials) };
  let u = getSessionId(),
    S = textForResubmit({
      content: description,
      origin: void 0,
      commands: o.dispatchCommands(),
      dispatchesSlashCommands: !0,
    }),
    { titles: titles } = o,
    C =
      getCurrentSessionTitle(u) ??
      getCurrentSessionAiTitle(u) ??
      (S !== null
        ? await saveGeneratedTitle(S, o)
        : titles.pending?.sessionId === u
          ? await titles.pending.title
          : null);
  return { title: getCurrentSessionTitle(u) ?? C };
}
/**
 * 订阅会话标题变化并以 session_title_changed 系统通知发出（立即先发一次当前标题），返回取消订阅函数。
 */
//@ chunk-nkdv7dw8.js:38282-38414 placement
function emitSessionTitleChanges() {
  let e = () => {
    let n = sanitizeSessionTitle(getCurrentSessionTitle(getSessionId()) ?? "");
    if (n) enqueueTaskNotification({ type: "system", subtype: "session_title_changed", title: n });
  };
  return (e(), subscribeSessionTitleChanged(e));
}
/**
 * 启动时（非 sdkUrl 模式）在会话注册后重新声明会话名：用当前标题或 agent 名，自动来源，保留启动名。
 */
//@ chunk-nkdv7dw8.js:38414-38559 placement
async function reclaimSessionNameAtStart(e) {
  if (e.sdkUrl) return;
  await whenSessionRegistered();
  let n = getCurrentSessionTitle(getSessionId());
  await reclaimSessionNameOnResume(n || getCurrentSessionAgentName(), e.storageV5, {
    autoOnly: !n,
    source: "auto",
    keepLaunchName: !0,
  });
}
//@ chunk-nkdv7dw8.js:38559-39258 placement
function handleRenameSession(e, n) {
  let o = Ut(n);
  if (typeof e.title !== "string") throw new WireSafeControlError("rename_session: title must be a string");
  if (e.source != null && e.source !== "remote" && e.source !== "host")
    throw new WireSafeControlError("rename_session: source must be 'remote' or 'host'");
  let s = sanitizeSessionTitle(e.title);
  if (!s) throw new WireSafeControlError("title must be non-empty");
  if (e.session_id !== void 0 && e.session_id !== getSessionId())
    throw new WireSafeControlError("session_id is not the current session");
  let r = e.source === "host" ? "user" : "remote",
    u = getSessionId();
  if ("recordRename" in o) {
    cacheSessionTitle(s);
    let y = getMaterializedSessionFile();
    if (y !== null)
      appendEntryToFileAsync(y, { type: "custom-title", customTitle: s, sessionId: u }, n.storageV5);
    return o.recordRename(s, u);
  }
  let S = e.source === "host";
  if (getMaterializedSessionFile())
    return saveCustomTitle(u, s, void 0, r, o.storageV5).then(() => applySessionRename(o, s, u, S));
  (cacheSessionTitle(s), applySessionRename(o, s, u, S));
}
//@ chunk-nkdv7dw8.js:39258-39374 placement
function applySessionRename(e, n, o, s) {
  if (((e.titles.attempted = !0), s && getSessionId() === o)) e.pushHostRenameToBridge(n, o);
  e.applyRenamedSessionName(n);
}
//@ chunk-nkdv7dw8.js:39374-39384 placement
var Ft = R7;
//@ chunk-nkdv7dw8.js:39384-39465 placement
function Ut(e) {
  if (e.sessionTitles === null) throw new WireSafeControlError(Ft);
  return e.sessionTitles;
}
//@ chunk-nkdv7dw8.js:39465-39546 placement
function Ne(e, n) {
  if (e.redactsPersistedLane()) {
    controlHandlerError(!0, "auto_title", n);
    return;
  }
  logError(n);
}
//@ chunk-nkdv7dw8.js:39546-40998 placement
var handleStopTask = (e, n) => {
    let task_id = e.task_id;
    if (typeof task_id !== "string")
      throw (
        logFeatureBad("task_stop_user", "invalid_task_id"),
        new Pz("stop_task: task_id must be a string")
      );
    return stopTaskByUser(task_id, {
      taskRegistry: createTaskFramework(n.engineState, n.setEngineState),
      setAppState: n.setEngineState,
      session: n.session,
      getAppState: n.engineState,
      source: "client",
      storageV5: n.storageV5,
    }).then(
      () => ({}),
      (r) => {
        throw new Pz(controlHandlerError(n.redactsPersistedLane(), "stop_task", r).error);
      },
    );
  },
  qt = (e, n) => {
    let o = parseOptionalToolUseId(e.tool_use_id);
    if (!o.valid)
      throw (logFeatureBad("task_local_shell_background_all", "invalid_tool_use_id"), new Pz(a7r));
    if (uf())
      throw (
        logFeatureBad("task_local_shell_background_all", "disabled"),
        new Pz(BACKGROUND_TASKS_DISABLED_MESSAGE)
      );
    let s = createTaskFramework(n.engineState, n.setEngineState);
    if (o.toolUseId !== void 0) return { backgrounded: backgroundTaskByToolUseId(o.toolUseId, s) };
    return (backgroundAll(s), {});
  },
  Bt = (e, n) => {
    if (n.redactsPersistedLane())
      throw (
        logFeatureBad("task_output_read", "persisted_lane"),
        new Pz("get_task_output is not available on this connection")
      );
    let task_id = e.task_id;
    if (typeof task_id !== "string")
      throw (
        logFeatureBad("task_output_read", "invalid_task_id"),
        new Pz("get_task_output: task_id must be a string")
      );
    let s = createTaskFramework(n.engineState, n.setEngineState).get(task_id);
    if (!(isLocalShellTask(s) && !s.elsewhere) && !(s === void 0 && isTaskIdOfType("local_bash", task_id)))
      throw (
        logFeatureBad("task_output_read", "not_found"),
        new Pz("get_task_output: no shell or Monitor task with that task_id in this session")
      );
    return tailOutputOfTask(task_id).then(
      ({ content: content, bytesRead: bytesRead, bytesTotal: bytesTotal }) => ({
        output: content,
        total_bytes: bytesTotal,
        truncated: bytesRead < bytesTotal,
      }),
      (r) => {
        throw (logFeatureBad("task_output_read", "read_failed"), r);
      },
    );
  },
  $t = (e, n) => {
    throw new Pz(`${R7}: send_task_message`);
  };
//@ chunk-nkdv7dw8.js:40998-41511 placement
var CONTROL_REQUEST_HANDLERS = {
    mcp_status: St,
    get_context_usage: Ct,
    get_usage: vt,
    get_session_cost: _t,
    list_models: handleListModels,
    get_binary_version: handleGetBinaryVersion,
    reload_output_styles: wt,
    set_max_thinking_tokens: handleSetMaxThinkingTokens,
    set_mcp_permission_mode_override: clearUnknownServerOverride,
    generate_session_title: handleGenerateSessionTitle,
    rename_session: handleRenameSession,
    mcp_reconnect: handleMcpReconnect,
    mcp_toggle: pt,
    mcp_read_resource: handleMcpReadResource,
    stop_task: handleStopTask,
    background_tasks: qt,
    get_task_output: Bt,
    send_task_message: $t,
    prefetch_attachments: Dt,
    mcp_tasks_changed: Tt,
  },
  kn = new Set(["generate_session_title", "get_context_usage", "mcp_read_resource", "get_task_output"]);
//@ chunk-nkdv7dw8.js:41511-41917 placement
function handleSendTaskMessage(e, n) {
  if (kn.has(e.subtype)) return !0;
  if (e.subtype === "send_task_message")
    try {
      return (
        n.resumeUntrackedAgent !== null &&
        typeof e.task_id === "string" &&
        !Object.hasOwn(n.engineState().tasks, e.task_id)
      );
    } catch {
      return !1;
    }
  if (
    e.subtype !== "mcp_toggle" ||
    e.enabled !== !0 ||
    typeof e.serverName !== "string" ||
    n.mcpControlLanes === null
  )
    return !1;
  try {
    return isUnadoptedSdkServer(n.mcpControlLanes, n.engineState(), e.serverName);
  } catch {
    return !1;
  }
}
//@ chunk-nkdv7dw8.js:41917-41968 placement
function kCs(e) {
  return Object.hasOwn(CONTROL_REQUEST_HANDLERS, e.subtype);
}

export {
  CONTROL_REQUEST_HANDLERS,
  emitSessionTitleChanges,
  kCs,
  handleSendTaskMessage,
  reclaimSessionNameAtStart,
  Ne,
};

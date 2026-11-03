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
import { requestAndPickSessionTitle } from "../../utils/sessionTitle.js";
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
  handleMcpStatus,
  handleGetContextUsage,
  handleGetUsage,
  handleGetSessionCost,
  handleListModels,
  handleGetBinaryVersion,
  handleReloadOutputStyles,
  clearUnknownServerOverride,
  handleMcpReconnect,
  handleMcpToggle,
  handleMcpReadResource,
  isValidPrefetchAttachmentsRequest,
  noop,
  isUnadoptedSdkServer,
} from "./mcpControlRequests.js";
import { sanitizeSessionTitle } from "../../utils/stringUtils.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { whenSessionRegistered } from "../../utils/concurrentSessions.js";
import { reclaimSessionNameOnResume } from "../../utils/sessionNameUniqueness.js";
import { UNSUPPORTED_CONTROL_SUBTYPE_TEXT } from "../../remote/wireFrameShape.js";
import { controlHandlerError } from "./dispatchControlRequest.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { QueuedNotificationError } from "../../services/queuedNotifications/queuedNotifications.js";
import { stopTaskByUser } from "../../tasks/stopTask.js";
import { createTaskFramework } from "../../utils/task/framework.js";
import {
  parseOptionalToolUseId,
  BACKGROUND_TASKS_TOOL_USE_ID_ERROR,
  BACKGROUND_TASKS_DISABLED_MESSAGE,
} from "../../bridge/controlRequests.js";
import { isBackgroundTasksOff } from "../../tools/AgentTool/backgroundGates.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { isTaskIdOfType } from "../../Task.js";
import { tailOutputOfTask } from "../../utils/task/diskOutput.js";
import { handleSetMaxThinkingTokens } from "./setMaxThinkingTokens.js";

//@ chunk-nkdv7dw8.js:37689-38282 placement
async function handleGenerateSessionTitle(e, n) {
  let o = requireSessionTitles(n);
  if ("recordRename" in o) throw new WireSafeControlError(NO_SESSION_TITLES_ERROR);
  let { description, persist } = e;
  if (typeof description !== "string")
    throw new WireSafeControlError("generate_session_title: description must be a string");
  if (persist != null && typeof persist !== "boolean")
    throw new WireSafeControlError("generate_session_title: persist must be a boolean");
  if (!persist)
    return {
      title: await requestAndPickSessionTitle(description, o.turnAbortSignal(), o.credentials),
    };
  let sessionId = getSessionId();
  let S = textForResubmit({
    content: description,
    origin: undefined,
    commands: o.dispatchCommands(),
    dispatchesSlashCommands: true,
  });
  let { titles } = o;
  let C =
    getCurrentSessionTitle(sessionId) ??
    getCurrentSessionAiTitle(sessionId) ??
    (S !== null
      ? await saveGeneratedTitle(S, o)
      : titles.pending?.sessionId === sessionId
        ? await titles.pending.title
        : null);
  return {
    title: getCurrentSessionTitle(sessionId) ?? C,
  };
}
//@ chunk-nkdv7dw8.js:38282-38414 placement
/**
 * 订阅会话标题变化并以 session_title_changed 系统通知发出（立即先发一次当前标题），返回取消订阅函数。
 */
function emitSessionTitleChanges() {
  let e = () => {
    let n = sanitizeSessionTitle(getCurrentSessionTitle(getSessionId()) ?? "");
    if (n)
      enqueueTaskNotification({
        type: "system",
        subtype: "session_title_changed",
        title: n,
      });
  };
  e();
  return subscribeSessionTitleChanged(e);
}
//@ chunk-nkdv7dw8.js:38414-38559 placement
/**
 * 启动时（非 sdkUrl 模式）在会话注册后重新声明会话名：用当前标题或 agent 名，自动来源，保留启动名。
 */
async function reclaimSessionNameAtStart(e) {
  if (e.sdkUrl) return;
  await whenSessionRegistered();
  let currentSessionTitle = getCurrentSessionTitle(getSessionId());
  await reclaimSessionNameOnResume(currentSessionTitle || getCurrentSessionAgentName(), e.storageV5, {
    autoOnly: !currentSessionTitle,
    source: "auto",
    keepLaunchName: true,
  });
}
//@ chunk-nkdv7dw8.js:38559-39258 placement
function handleRenameSession(e, n) {
  let o = requireSessionTitles(n);
  if (typeof e.title !== "string") throw new WireSafeControlError("rename_session: title must be a string");
  if (e.source != null && e.source !== "remote" && e.source !== "host")
    throw new WireSafeControlError("rename_session: source must be 'remote' or 'host'");
  let s = sanitizeSessionTitle(e.title);
  if (!s) throw new WireSafeControlError("title must be non-empty");
  if (e.session_id !== undefined && e.session_id !== getSessionId())
    throw new WireSafeControlError("session_id is not the current session");
  let r = e.source === "host" ? "user" : "remote";
  let sessionId = getSessionId();
  if ("recordRename" in o) {
    cacheSessionTitle(s);
    let materializedSessionFile = getMaterializedSessionFile();
    if (materializedSessionFile !== null)
      appendEntryToFileAsync(
        materializedSessionFile,
        {
          type: "custom-title",
          customTitle: s,
          sessionId,
        },
        n.storageV5,
      );
    return o.recordRename(s, sessionId);
  }
  let S = e.source === "host";
  if (getMaterializedSessionFile())
    return saveCustomTitle(sessionId, s, undefined, r, o.storageV5).then(() =>
      applySessionRename(o, s, sessionId, S),
    );
  cacheSessionTitle(s);
  applySessionRename(o, s, sessionId, S);
}
//@ chunk-nkdv7dw8.js:39258-39374 placement
function applySessionRename(e, n, sessionId, s) {
  e.titles.attempted = true;
  if (s && getSessionId() === sessionId) e.pushHostRenameToBridge(n, sessionId);
  e.applyRenamedSessionName(n);
}
//@ chunk-nkdv7dw8.js:39374-39384 placement
var NO_SESSION_TITLES_ERROR = UNSUPPORTED_CONTROL_SUBTYPE_TEXT;
//@ chunk-nkdv7dw8.js:39384-39465 placement
function requireSessionTitles(e) {
  if (e.sessionTitles === null) throw new WireSafeControlError(NO_SESSION_TITLES_ERROR);
  return e.sessionTitles;
}
//@ chunk-nkdv7dw8.js:39465-39546 placement
function logTitleChangeError(e, error) {
  if (e.redactsPersistedLane()) {
    controlHandlerError(true, "auto_title", error);
    return;
  }
  logError(error);
}
//@ chunk-nkdv7dw8.js:39546-40998 placement
/**
 * 补充的控制请求处理器：stop_task（按用户停任务，校验 task_id）、send_task_message、会话标题类请求（sessionTitles 为空即报错）。
 */
var handleStopTask = (e, n) => {
  let taskId = e.task_id;
  if (typeof taskId !== "string") {
    logFeatureBad("task_stop_user", "invalid_task_id");
    throw new QueuedNotificationError("stop_task: task_id must be a string");
  }
  return stopTaskByUser(taskId, {
    taskRegistry: createTaskFramework(n.engineState, n.setEngineState),
    setAppState: n.setEngineState,
    session: n.session,
    getAppState: n.engineState,
    source: "client",
    storageV5: n.storageV5,
  }).then(
    () => ({}),
    (error) => {
      throw new QueuedNotificationError(
        controlHandlerError(n.redactsPersistedLane(), "stop_task", error).error,
      );
    },
  );
};
var handleBackgroundTasks = (e, n) => {
  let optionalToolUseId = parseOptionalToolUseId(e.tool_use_id);
  if (!optionalToolUseId.valid) {
    logFeatureBad("task_local_shell_background_all", "invalid_tool_use_id");
    throw new QueuedNotificationError(BACKGROUND_TASKS_TOOL_USE_ID_ERROR);
  }
  if (isBackgroundTasksOff()) {
    logFeatureBad("task_local_shell_background_all", "disabled");
    throw new QueuedNotificationError(BACKGROUND_TASKS_DISABLED_MESSAGE);
  }
  let taskRegistry = createTaskFramework(n.engineState, n.setEngineState);
  if (optionalToolUseId.toolUseId !== undefined)
    return {
      backgrounded: backgroundTaskByToolUseId(optionalToolUseId.toolUseId, taskRegistry),
    };
  backgroundAll(taskRegistry);
  return {};
};
var handleSendTaskMessage = (e, n) => {
  if (n.redactsPersistedLane()) {
    logFeatureBad("task_output_read", "persisted_lane");
    throw new QueuedNotificationError("get_task_output is not available on this connection");
  }
  let taskId = e.task_id;
  if (typeof taskId !== "string") {
    logFeatureBad("task_output_read", "invalid_task_id");
    throw new QueuedNotificationError("get_task_output: task_id must be a string");
  }
  let s = createTaskFramework(n.engineState, n.setEngineState).get(taskId);
  if (!(isLocalShellTask(s) && !s.elsewhere) && !(s === undefined && isTaskIdOfType("local_bash", taskId))) {
    logFeatureBad("task_output_read", "not_found");
    throw new QueuedNotificationError(
      "get_task_output: no shell or Monitor task with that task_id in this session",
    );
  }
  return tailOutputOfTask(taskId).then(
    ({ content, bytesRead, bytesTotal }) => ({
      output: content,
      total_bytes: bytesTotal,
      truncated: bytesRead < bytesTotal,
    }),
    (error) => {
      logFeatureBad("task_output_read", "read_failed");
      throw error;
    },
  );
};
var handleSessionTitleControl = (e, n) => {
  throw new QueuedNotificationError(`${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: send_task_message`);
};
//@ chunk-nkdv7dw8.js:40998-41511 placement
/**
 * 核心控制请求处理器表：mcp_status、get_context_usage、get_usage、get_session_cost、list_models、get_binary_version、reload_output_styles 等。
 */
var CONTROL_REQUEST_HANDLERS = {
  mcp_status: handleMcpStatus,
  get_context_usage: handleGetContextUsage,
  get_usage: handleGetUsage,
  get_session_cost: handleGetSessionCost,
  list_models: handleListModels,
  get_binary_version: handleGetBinaryVersion,
  reload_output_styles: handleReloadOutputStyles,
  set_max_thinking_tokens: handleSetMaxThinkingTokens,
  set_mcp_permission_mode_override: clearUnknownServerOverride,
  generate_session_title: handleGenerateSessionTitle,
  rename_session: handleRenameSession,
  mcp_reconnect: handleMcpReconnect,
  mcp_toggle: handleMcpToggle,
  mcp_read_resource: handleMcpReadResource,
  stop_task: handleStopTask,
  background_tasks: handleBackgroundTasks,
  get_task_output: handleSendTaskMessage,
  send_task_message: handleSessionTitleControl,
  prefetch_attachments: isValidPrefetchAttachmentsRequest,
  mcp_tasks_changed: noop,
};
var READ_ONLY_TASK_CONTROL_SUBTYPES = new Set([
  "generate_session_title",
  "get_context_usage",
  "mcp_read_resource",
  "get_task_output",
]);
//@ chunk-nkdv7dw8.js:41511-41917 placement
function handleSendTaskMessage_2(request, n) {
  if (READ_ONLY_TASK_CONTROL_SUBTYPES.has(request.subtype)) return true;
  if (request.subtype === "send_task_message")
    try {
      return (
        n.resumeUntrackedAgent !== null &&
        typeof request.task_id === "string" &&
        !Object.hasOwn(n.engineState().tasks, request.task_id)
      );
    } catch {
      return false;
    }
  if (
    request.subtype !== "mcp_toggle" ||
    request.enabled !== true ||
    typeof request.serverName !== "string" ||
    n.mcpControlLanes === null
  )
    return false;
  try {
    return isUnadoptedSdkServer(n.mcpControlLanes, n.engineState(), request.serverName);
  } catch {
    return false;
  }
}
//@ chunk-nkdv7dw8.js:41917-41968 placement
/**
 * 判断控制请求 subtype 是否在已知处理器表里。
 */
function isKnownControlRequestSubtype(request) {
  return Object.hasOwn(CONTROL_REQUEST_HANDLERS, request.subtype);
}
export {
  CONTROL_REQUEST_HANDLERS,
  emitSessionTitleChanges,
  isKnownControlRequestSubtype,
  handleSendTaskMessage_2,
  reclaimSessionNameAtStart,
  logTitleChangeError,
};

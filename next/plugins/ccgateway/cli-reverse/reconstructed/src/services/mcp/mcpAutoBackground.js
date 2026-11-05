/**
 * services/mcp/mcpAutoBackground.ts
 *
 * 2.1.316 新增：MCP 工具调用超时自动转后台
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b9vpay08.js (9)
 * attribution: placement 9
 */
import {
  isBackgroundTasksOff,
  hasBackgroundBashStopAfterReply,
  canLaunchBackgroundAgent,
} from "../../tools/AgentTool/backgroundGates.js";
import { env } from "../../utils/env.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { canDetachCalls } from "../tools/detachedToolCalls.js";
import { attachDetachableAbortRelay } from "../../utils/abortController.js";
import { sleep } from "../../utils/sleep.js";
import { createMcpTaskState } from "../../tasks/McpTask/mcpTaskState.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { resetTypeahead } from "../../components/mcp/ElicitationDialog.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { recordToolUsed } from "../compact/keptTools.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { emitTaskProgress } from "../../utils/task/sdkProgress.js";

//@ chunk-b9vpay08.js:13139-13213 placement
function _() {
  return require("./emitTripwireEvent.lazy.js").mcpTaskWatcherModule();
}
//@ chunk-b9vpay08.js:13213-13267 placement (2.1.88 match: findCurrentIDE, 0.867)
/**
 * 不参与自动转后台的 IDE 传输类型。
 */
var AUTO_BACKGROUND_MS = 120000;
var MIN_BACKGROUND_CHECK_MS = 1000;
var IDE_TRANSPORTS = new Set(["sse-ide", "ws-ide"]);
//@ chunk-b9vpay08.js:13267-13607 placement
function mcpAutoBackgroundDelayMs(config, { isNonInteractiveSession = false } = {}) {
  if (IDE_TRANSPORTS.has(config?.type ?? "")) return 0;
  if (config?.type === "sdk" && config.disableAutoBackground === true) return 0;
  if (isBackgroundTasksOff()) return 0;
  if (isNonInteractiveSession && !env.CLAUDE_AUTO_BACKGROUND_TASKS) return 0;
  let CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS = env.CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS;
  if (CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS !== undefined)
    return Math.min(Math.max(0, CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS), MAX_TIMER_DELAY_MS);
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_auto_background", true) ? AUTO_BACKGROUND_MS : 0;
}
//@ chunk-b9vpay08.js:13607-13753 placement
/**
 * 判断 MCP 调用是否可在不计时的情况下转为后台（非交互会话、非内部调用、未设自动后台环境变量且有延迟配置）。
 */
function isMcpCallMovableWithoutTimer(config, { isNonInteractiveSession, isInnerCall }) {
  return (
    canDetachCalls(isNonInteractiveSession) &&
    !isInnerCall &&
    !env.CLAUDE_AUTO_BACKGROUND_TASKS &&
    mcpAutoBackgroundDelayMs(config, {
      isNonInteractiveSession: false,
    }) > 0
  );
}
//@ chunk-b9vpay08.js:13753-17670 placement
/**
 * 执行 MCP 工具调用，超过阈值时自动转入后台任务，并把进度写入任务注册表。
 */
async function runMcpToolWithAutoBackground({
  run,
  serverName,
  toolName,
  accountMemoryTool,
  toolUseId,
  parentAbortController,
  taskRegistry,
  autoBackgroundMs,
  storageV5,
  credentials,
  hasPendingElicitation,
  onBackgrounded,
  share,
  foregroundCalls,
  noticeGate,
}) {
  if (accountMemoryTool) return run(parentAbortController.signal);
  let abortController = new AbortController();
  let detachRelay = attachDetachableAbortRelay(parentAbortController, abortController);
  let now = Date.now();
  let runPromise = run(abortController.signal);
  let settledPromise = runPromise.then(
    () => "settled",
    () => "settled",
  );
  let abortController_2 = new AbortController();
  let stillForeground = true;
  let triggerEarly = () => {};
  let promise = new Promise((resolve) => {
    triggerEarly = () => resolve("early");
  });
  let foregroundEntry = foregroundCalls?.add({
    toolUseId,
    backgroundNow: () => {
      if (!stillForeground || parentAbortController.signal.aborted || hasPendingElicitation?.() === true)
        return false;
      stillForeground = false;
      triggerEarly();
      return true;
    },
  });
  let backgroundedToMessage = false;
  try {
    while (true) {
      let winner = await Promise.race([
        settledPromise,
        promise,
        ...(autoBackgroundMs === null
          ? []
          : [sleep(autoBackgroundMs, abortController_2.signal).then(() => "timeout")]),
      ]);
      if (winner === "settled" || parentAbortController.signal.aborted) {
        detachRelay();
        return await runPromise;
      }
      if (winner === "early") {
        backgroundedToMessage = true;
        break;
      }
      if (hasPendingElicitation?.()) continue;
      break;
    }
  } finally {
    stillForeground = false;
    foregroundEntry?.();
    abortController_2.abort();
  }
  detachRelay();
  let mcpTaskState = createMcpTaskState({
    serverName,
    toolName,
    toolUseId,
    abortController,
    backgroundedToDeliverMessage: backgroundedToMessage || undefined,
  });
  let { id, description } = mcpTaskState;
  taskRegistry.register(mcpTaskState);
  let backgroundShare = createBackgroundShare({
    signal: abortController.signal,
    taskRegistry,
    taskId: id,
    share,
  });
  if (share) share.registryId = id;
  onBackgrounded?.();
  logEvent("tengu_mcp_tool_auto_backgrounded", {
    trigger: backgroundedToMessage ? lit("deliver_message") : lit("timeout"),
  });
  function finishTask(status, rendered, statusText, reason, resourceLinks) {
    resetTypeahead(backgroundShare);
    if (share?.becameTask) return;
    let statusMessage = _().boundMcpStatusMessage(statusText);
    let notified = false;
    taskRegistry.update(id, (task) => {
      if (task.notified) return task;
      notified = true;
      return {
        ...task,
        status,
        mcpStatus: status,
        statusMessage,
        endTime: Date.now(),
        notified: true,
        abortController: undefined,
        ...(resourceLinks && {
          terminal: {
            resource_links: resourceLinks,
          },
        }),
      };
    });
    if (!notified) return;
    if (status === "completed") logFeatureOk("mcp_auto_background");
    else if (reason === "tool_error") logFeatureSad("mcp_auto_background", "tool_error");
    else if (reason === "aborted") logFeatureSad("mcp_auto_background", "aborted");
    else logFeatureBad("mcp_auto_background", "call_failed");
    let notify = () => {
      try {
        let mcpToolName = buildMcpToolName(serverName, toolName);
        recordToolUsed(mcpToolName);
        enqueuePendingNotification(
          {
            value: _().buildMcpTaskNotification({
              registryId: id,
              mcpTaskId: id,
              serverName,
              toolName,
              status,
              resultText: rendered?.text,
              resultHint: rendered?.savedHint,
              statusMessage,
            }),
            toolsUsed: [mcpToolName],
            mode: "task-notification",
            skipAttachments: true,
            priority: "next",
            agentId: mainAgentId(),
            taskId: id,
          },
          {
            turnAttribution: "inherit",
          },
        );
      } catch (error) {
        logError(error);
        try {
          enqueuePendingNotification(
            {
              value: `MCP task ${id} ${status}; the result could not be rendered.`,
              mode: "task-notification",
              skipAttachments: true,
              priority: "next",
              agentId: mainAgentId(),
              taskId: id,
            },
            {
              turnAttribution: "inherit",
            },
          );
        } catch (error) {
          logForDebugging(`degraded MCP task notification enqueue failed: ${String(error)}`, {
            level: "error",
          });
        }
      }
    };
    if (noticeGate === undefined) {
      notify();
      return;
    }
    try {
      noticeGate(notify);
    } catch (error) {
      logError(error);
      notify();
    }
  }
  runPromise.then(
    async (result) => {
      finishTask(
        "completed",
        await _().mcpContentToNotificationText(result.data, storageV5, credentials),
        undefined,
        undefined,
        result.mcpMeta?.resourceLinks,
      );
    },
    (error) => {
      finishTask(
        "failed",
        undefined,
        error instanceof Error ? error.message : String(error),
        abortController.signal.aborted
          ? "aborted"
          : require("./isExpectedMcpCallError.lazy.js").isExpectedMcpCallError(error)
            ? "tool_error"
            : "call_failed",
      );
    },
  );
  let rounded = Math.round((Date.now() - now) / 1000);
  let whyText = backgroundedToMessage
    ? `MCP tool "${description}" was moved to the background as task ${id} so that a message that arrived while it was running can reach you; it was not interrupted and keeps running`
    : `MCP tool "${description}" is still running after ${rounded}s. It was moved to the background as task ${id} and keeps running`;
  let howText = hasBackgroundBashStopAfterReply()
    ? `. You can keep working in the meantime. If it completes while you are still working, you'll receive a notification with the result. A few minutes after your reply, the call is likely cut off here and its result lost, though the server may still finish the work. So do not say you will report back: if you have not received its result by the time you reply, tell the user it will likely be lost.${canLaunchBackgroundAgent() ? " To get the result of a call like this after your reply, make the call from a background agent, where it runs in the foreground and keeps this session running until it returns, unless it waits on the user. This call keeps running, so making it again that way runs it twice; do that only if that is harmless." : ""} To stop it, use ${TASKSTOP} with task_id "${id}".`
    : `; you'll receive a notification with the result when it completes. You can keep working in the meantime. To stop it, use TaskStop with task_id "${id}". Note: it does not survive exiting this session.`;
  return {
    data: [
      {
        type: "text",
        text: `${whyText}${howText}`,
      },
    ],
  };
}
//@ chunk-b9vpay08.js:17670-17739 placement
/**
 * 报告 MCP 调用进度（出错忽略）。
 */
function reportCallProgress(signal, progress) {
  try {
    getTaskRunState().mcpCallProgress.get(signal)?.(progress);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-b9vpay08.js:17739-18017 placement
function createBackgroundShare({ signal, taskRegistry, taskId, share }) {
  let share_2 = {
    signal,
    taskRegistry,
    taskId,
    share,
    writers: getTaskRunState().mcpCallProgress,
    latest: undefined,
    lastWriteAt: 0,
    timer: undefined,
    failureLogged: false,
  };
  share_2.writers.set(signal, (latest) => scheduleBackgroundProgressWrite(share_2, latest));
  signal.addEventListener("abort", () => resetTypeahead(share_2), {
    once: true,
  });
  return share_2;
}
//@ chunk-b9vpay08.js:18017-18210 placement
function scheduleBackgroundProgressWrite(share, latest) {
  if (share.share?.becameTask) return;
  share.latest = latest;
  if (share.timer !== undefined) return;
  let min = Math.min(share.lastWriteAt + MIN_BACKGROUND_CHECK_MS - Date.now(), MIN_BACKGROUND_CHECK_MS);
  if (min <= 0) {
    flushBackgroundProgress(share);
    return;
  }
  share.timer = setTimeout(flushBackgroundProgress, min, share);
  share.timer.unref();
}
//@ chunk-b9vpay08.js:18210-18918 placement
function flushBackgroundProgress(share) {
  share.timer = undefined;
  share.lastWriteAt = Date.now();
  let { latest, taskId } = share;
  if (latest === undefined) return;
  try {
    let statusMessage = _().boundMcpStatusMessage(latest.message);
    let fraction =
      latest.total !== undefined && latest.total > 0 ? latest.progress / latest.total : Number.NaN;
    let percentText = Number.isFinite(fraction)
      ? `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`
      : undefined;
    let progressText =
      percentText !== undefined && statusMessage !== undefined
        ? `${percentText} \xB7 ${statusMessage}`
        : (percentText ?? statusMessage ?? `Processing\u2026 ${latest.progress}`);
    let updatedTask;
    share.taskRegistry.update(taskId, (task) => {
      if (
        task.notified ||
        task.status !== "running" ||
        task.protocol !== undefined ||
        task.statusMessage === progressText
      )
        return task;
      updatedTask = task;
      return {
        ...task,
        statusMessage: progressText,
      };
    });
    if (updatedTask !== undefined)
      emitTaskProgress({
        taskId,
        toolUseId: updatedTask.toolUseId,
        description: updatedTask.description,
        startTime: updatedTask.startTime,
        totalTokens: 0,
        toolUses: 0,
        summary: progressText,
      });
  } catch (error) {
    if (!share.failureLogged) {
      share.failureLogged = true;
      logError(error);
    }
  }
}
export {
  runMcpToolWithAutoBackground,
  mcpAutoBackgroundDelayMs,
  isMcpCallMovableWithoutTimer,
  reportCallProgress,
};

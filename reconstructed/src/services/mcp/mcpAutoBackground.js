/**
 * services/mcp/mcpAutoBackground.ts
 *
 * 2.1.316 新增：MCP 工具调用超时自动转后台
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tn4j580p.js (9)
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

//@ chunk-tn4j580p.js:11991-12065 placement
function _() {
  return require("./chunk-asne9cp8.js").mcpTaskWatcherModule();
}
//@ chunk-tn4j580p.js:12065-12119 placement = findCurrentIDE (0.867)
/**
 * 不参与自动转后台的 IDE 传输类型。
 */
var AUTO_BACKGROUND_MS = 120000;
var MIN_BACKGROUND_CHECK_MS = 1000;
var IDE_TRANSPORTS = new Set(["sse-ide", "ws-ide"]);
//@ chunk-tn4j580p.js:12119-12459 placement
function mcpAutoBackgroundDelayMs(e, { isNonInteractiveSession: r = false } = {}) {
  if (IDE_TRANSPORTS.has(e?.type ?? "")) return 0;
  if (e?.type === "sdk" && e.disableAutoBackground === true) return 0;
  if (isBackgroundTasksOff()) return 0;
  if (r && !env.CLAUDE_AUTO_BACKGROUND_TASKS) return 0;
  let CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS = env.CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS;
  if (CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS !== undefined)
    return Math.min(Math.max(0, CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS), MAX_TIMER_DELAY_MS);
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_auto_background", true) ? AUTO_BACKGROUND_MS : 0;
}
//@ chunk-tn4j580p.js:12459-12605 placement
/**
 * 判断 MCP 调用是否可在不计时的情况下转为后台（非交互会话、非内部调用、未设自动后台环境变量且有延迟配置）。
 */
function isMcpCallMovableWithoutTimer(e, { isNonInteractiveSession, isInnerCall }) {
  return (
    canDetachCalls(isNonInteractiveSession) &&
    !isInnerCall &&
    !env.CLAUDE_AUTO_BACKGROUND_TASKS &&
    mcpAutoBackgroundDelayMs(e, {
      isNonInteractiveSession: false,
    }) > 0
  );
}
//@ chunk-tn4j580p.js:12605-16522 placement
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
  let E = attachDetachableAbortRelay(parentAbortController, abortController);
  let now = Date.now();
  let A = run(abortController.signal);
  let X = A.then(
    () => "settled",
    () => "settled",
  );
  let abortController_2 = new AbortController();
  let w = true;
  let D = () => {};
  let promise = new Promise((resolve) => {
    D = () => resolve("early");
  });
  let Q = foregroundCalls?.add({
    toolUseId,
    backgroundNow: () => {
      if (!w || parentAbortController.signal.aborted || hasPendingElicitation?.() === true) return false;
      w = false;
      D();
      return true;
    },
  });
  let S = false;
  try {
    while (true) {
      let winner = await Promise.race([
        X,
        promise,
        ...(autoBackgroundMs === null
          ? []
          : [sleep(autoBackgroundMs, abortController_2.signal).then(() => "timeout")]),
      ]);
      if (winner === "settled" || parentAbortController.signal.aborted) {
        E();
        return await A;
      }
      if (winner === "early") {
        S = true;
        break;
      }
      if (hasPendingElicitation?.()) continue;
      break;
    }
  } finally {
    w = false;
    Q?.();
    abortController_2.abort();
  }
  E();
  let mcpTaskState = createMcpTaskState({
    serverName,
    toolName,
    toolUseId,
    abortController,
    backgroundedToDeliverMessage: S || undefined,
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
    trigger: S ? lit("deliver_message") : lit("timeout"),
  });
  function x(n, L, oe, U, resourceLinks) {
    resetTypeahead(backgroundShare);
    if (share?.becameTask) return;
    let statusMessage = _().boundMcpStatusMessage(oe);
    let W = false;
    taskRegistry.update(id, (c) => {
      if (c.notified) return c;
      W = true;
      return {
        ...c,
        status: n,
        mcpStatus: n,
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
    if (!W) return;
    if (n === "completed") logFeatureOk("mcp_auto_background");
    else if (U === "tool_error") logFeatureSad("mcp_auto_background", "tool_error");
    else if (U === "aborted") logFeatureSad("mcp_auto_background", "aborted");
    else logFeatureBad("mcp_auto_background", "call_failed");
    let P = () => {
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
              status: n,
              resultText: L?.text,
              resultHint: L?.savedHint,
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
              value: `MCP task ${id} ${n}; the result could not be rendered.`,
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
      P();
      return;
    }
    try {
      noticeGate(P);
    } catch (error) {
      logError(error);
      P();
    }
  }
  A.then(
    async (n) => {
      x(
        "completed",
        await _().mcpContentToNotificationText(n.data, storageV5, credentials),
        undefined,
        undefined,
        n.mcpMeta?.resourceLinks,
      );
    },
    (error) => {
      x(
        "failed",
        undefined,
        error instanceof Error ? error.message : String(error),
        abortController.signal.aborted
          ? "aborted"
          : require("./chunk-f1mqry73.js").isExpectedMcpCallError(error)
            ? "tool_error"
            : "call_failed",
      );
    },
  );
  let rounded = Math.round((Date.now() - now) / 1000);
  let te = S
    ? `MCP tool "${description}" was moved to the background as task ${id} so that a message that arrived while it was running can reach you; it was not interrupted and keeps running`
    : `MCP tool "${description}" is still running after ${rounded}s. It was moved to the background as task ${id} and keeps running`;
  let re = hasBackgroundBashStopAfterReply()
    ? `. You can keep working in the meantime. If it completes while you are still working, you'll receive a notification with the result. A few minutes after your reply, the call is likely cut off here and its result lost, though the server may still finish the work. So do not say you will report back: if you have not received its result by the time you reply, tell the user it will likely be lost.${canLaunchBackgroundAgent() ? " To get the result of a call like this after your reply, make the call from a background agent, where it runs in the foreground and keeps this session running until it returns, unless it waits on the user. This call keeps running, so making it again that way runs it twice; do that only if that is harmless." : ""} To stop it, use ${TASKSTOP} with task_id "${id}".`
    : `; you'll receive a notification with the result when it completes. You can keep working in the meantime. To stop it, use TaskStop with task_id "${id}". Note: it does not survive exiting this session.`;
  return {
    data: [
      {
        type: "text",
        text: `${te}${re}`,
      },
    ],
  };
}
//@ chunk-tn4j580p.js:16522-16591 placement
/**
 * 报告 MCP 调用进度（出错忽略）。
 */
function reportCallProgress(e, r) {
  try {
    getTaskRunState().mcpCallProgress.get(e)?.(r);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tn4j580p.js:16591-16869 placement
function createBackgroundShare({ signal, taskRegistry, taskId, share }) {
  let u = {
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
  u.writers.set(signal, (latest) => scheduleBackgroundProgressWrite(u, latest));
  signal.addEventListener("abort", () => resetTypeahead(u), {
    once: true,
  });
  return u;
}
//@ chunk-tn4j580p.js:16869-17062 placement
function scheduleBackgroundProgressWrite(e, latest) {
  if (e.share?.becameTask) return;
  e.latest = latest;
  if (e.timer !== undefined) return;
  let min = Math.min(e.lastWriteAt + MIN_BACKGROUND_CHECK_MS - Date.now(), MIN_BACKGROUND_CHECK_MS);
  if (min <= 0) {
    flushBackgroundProgress(e);
    return;
  }
  e.timer = setTimeout(flushBackgroundProgress, min, e);
  e.timer.unref();
}
//@ chunk-tn4j580p.js:17062-17770 placement
function flushBackgroundProgress(e) {
  e.timer = undefined;
  e.lastWriteAt = Date.now();
  let { latest, taskId } = e;
  if (latest === undefined) return;
  try {
    let p = _().boundMcpStatusMessage(latest.message);
    let u = latest.total !== undefined && latest.total > 0 ? latest.progress / latest.total : Number.NaN;
    let d = Number.isFinite(u) ? `${Math.round(Math.min(1, Math.max(0, u)) * 100)}%` : undefined;
    let h =
      d !== undefined && p !== undefined
        ? `${d} \xB7 ${p}`
        : (d ?? p ?? `Processing\u2026 ${latest.progress}`);
    let y;
    e.taskRegistry.update(taskId, (k) => {
      if (k.notified || k.status !== "running" || k.protocol !== undefined || k.statusMessage === h) return k;
      y = k;
      return {
        ...k,
        statusMessage: h,
      };
    });
    if (y !== undefined)
      emitTaskProgress({
        taskId,
        toolUseId: y.toolUseId,
        description: y.description,
        startTime: y.startTime,
        totalTokens: 0,
        toolUses: 0,
        summary: h,
      });
  } catch (error) {
    if (!e.failureLogged) {
      e.failureLogged = true;
      logError(error);
    }
  }
}

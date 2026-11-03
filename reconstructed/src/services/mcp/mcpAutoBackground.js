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
import { uf, T_, b5e } from "../../tools/AgentTool/backgroundGates.js";
import { env } from "../../utils/env.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { v1r } from "../tools/detachedToolCalls.js";
import { attachDetachableAbortRelay } from "../../utils/abortController.js";
import { sleep } from "../../utils/sleep.js";
import { createMcpTaskState } from "../../tasks/McpTask/mcpTaskState.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { resetTypeahead } from "../../components/mcp/ElicitationDialog.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { Uv } from "../compact/keptTools.js";
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
var ie = 120000,
  j = 1000,
  ae = new Set(["sse-ide", "ws-ide"]);
//@ chunk-tn4j580p.js:12119-12459 placement
function mcpAutoBackgroundDelayMs(e, { isNonInteractiveSession: r = !1 } = {}) {
  if (ae.has(e?.type ?? "")) return 0;
  if (e?.type === "sdk" && e.disableAutoBackground === !0) return 0;
  if (uf()) return 0;
  if (r && !env.CLAUDE_AUTO_BACKGROUND_TASKS) return 0;
  let CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS = env.CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS;
  if (CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS !== void 0)
    return Math.min(Math.max(0, CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS), ec);
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_auto_background", !0) ? ie : 0;
}
/**
 * 判断 MCP 调用是否可在不计时的情况下转为后台（非交互会话、非内部调用、未设自动后台环境变量且有延迟配置）。
 */
//@ chunk-tn4j580p.js:12459-12605 placement
function isMcpCallMovableWithoutTimer(
  e,
  { isNonInteractiveSession: isNonInteractiveSession, isInnerCall: isInnerCall },
) {
  return (
    v1r(isNonInteractiveSession) &&
    !isInnerCall &&
    !env.CLAUDE_AUTO_BACKGROUND_TASKS &&
    mcpAutoBackgroundDelayMs(e, { isNonInteractiveSession: !1 }) > 0
  );
}
/**
 * 执行 MCP 工具调用，超过阈值时自动转入后台任务，并把进度写入任务注册表。
 */
//@ chunk-tn4j580p.js:12605-16522 placement
async function runMcpToolWithAutoBackground({
  run: run,
  serverName: serverName,
  toolName: toolName,
  accountMemoryTool: accountMemoryTool,
  toolUseId: toolUseId,
  parentAbortController: parentAbortController,
  taskRegistry: taskRegistry,
  autoBackgroundMs: autoBackgroundMs,
  storageV5: storageV5,
  credentials: credentials,
  hasPendingElicitation: hasPendingElicitation,
  onBackgrounded: onBackgrounded,
  share: share,
  foregroundCalls: foregroundCalls,
  noticeGate: noticeGate,
}) {
  if (accountMemoryTool) return run(parentAbortController.signal);
  let abortController = new AbortController(),
    E = attachDetachableAbortRelay(parentAbortController, abortController),
    now = Date.now(),
    A = run(abortController.signal),
    X = A.then(
      () => "settled",
      () => "settled",
    ),
    abortController_2 = new AbortController(),
    w = !0,
    D = () => {},
    promise = new Promise((n) => {
      D = () => n("early");
    }),
    Q = foregroundCalls?.add({
      toolUseId: toolUseId,
      backgroundNow: () => {
        if (!w || parentAbortController.signal.aborted || hasPendingElicitation?.() === !0) return !1;
        return ((w = !1), D(), !0);
      },
    }),
    S = !1;
  try {
    while (!0) {
      let winner = await Promise.race([
        X,
        promise,
        ...(autoBackgroundMs === null
          ? []
          : [sleep(autoBackgroundMs, abortController_2.signal).then(() => "timeout")]),
      ]);
      if (winner === "settled" || parentAbortController.signal.aborted) return (E(), await A);
      if (winner === "early") {
        S = !0;
        break;
      }
      if (hasPendingElicitation?.()) continue;
      break;
    }
  } finally {
    ((w = !1), Q?.(), abortController_2.abort());
  }
  E();
  let C = createMcpTaskState({
      serverName: serverName,
      toolName: toolName,
      toolUseId: toolUseId,
      abortController: abortController,
      backgroundedToDeliverMessage: S || void 0,
    }),
    { id: id, description: description } = C;
  taskRegistry.register(C);
  let Z = createBackgroundShare({
    signal: abortController.signal,
    taskRegistry: taskRegistry,
    taskId: id,
    share: share,
  });
  if (share) share.registryId = id;
  (onBackgrounded?.(),
    logEvent("tengu_mcp_tool_auto_backgrounded", { trigger: S ? lit("deliver_message") : lit("timeout") }));
  function x(n, L, oe, U, O) {
    if ((resetTypeahead(Z), share?.becameTask)) return;
    let boundMcpStatusMessage = _().boundMcpStatusMessage(oe),
      W = !1;
    if (
      (taskRegistry.update(id, (c) => {
        if (c.notified) return c;
        return (
          (W = !0),
          {
            ...c,
            status: n,
            mcpStatus: n,
            statusMessage: boundMcpStatusMessage,
            endTime: Date.now(),
            notified: !0,
            abortController: void 0,
            ...(O && { terminal: { resource_links: O } }),
          }
        );
      }),
      !W)
    )
      return;
    if (n === "completed") logFeatureOk("mcp_auto_background");
    else if (U === "tool_error") logFeatureSad("mcp_auto_background", "tool_error");
    else if (U === "aborted") logFeatureSad("mcp_auto_background", "aborted");
    else logFeatureBad("mcp_auto_background", "call_failed");
    let P = () => {
      try {
        let c = buildMcpToolName(serverName, toolName);
        (Uv(c),
          enqueuePendingNotification(
            {
              value: _().buildMcpTaskNotification({
                registryId: id,
                mcpTaskId: id,
                serverName: serverName,
                toolName: toolName,
                status: n,
                resultText: L?.text,
                resultHint: L?.savedHint,
                statusMessage: boundMcpStatusMessage,
              }),
              toolsUsed: [c],
              mode: "task-notification",
              skipAttachments: !0,
              priority: "next",
              agentId: mainAgentId(),
              taskId: id,
            },
            { turnAttribution: "inherit" },
          ));
      } catch (error) {
        logError(error);
        try {
          enqueuePendingNotification(
            {
              value: `MCP task ${id} ${n}; the result could not be rendered.`,
              mode: "task-notification",
              skipAttachments: !0,
              priority: "next",
              agentId: mainAgentId(),
              taskId: id,
            },
            { turnAttribution: "inherit" },
          );
        } catch (error) {
          logForDebugging(`degraded MCP task notification enqueue failed: ${String(error)}`, {
            level: "error",
          });
        }
      }
    };
    if (noticeGate === void 0) {
      P();
      return;
    }
    try {
      noticeGate(P);
    } catch (error) {
      (logError(error), P());
    }
  }
  A.then(
    async (n) => {
      x(
        "completed",
        await _().mcpContentToNotificationText(n.data, storageV5, credentials),
        void 0,
        void 0,
        n.mcpMeta?.resourceLinks,
      );
    },
    (n) => {
      x(
        "failed",
        void 0,
        n instanceof Error ? n.message : String(n),
        abortController.signal.aborted
          ? "aborted"
          : require("./chunk-f1mqry73.js").isExpectedMcpCallError(n)
            ? "tool_error"
            : "call_failed",
      );
    },
  );
  let rounded = Math.round((Date.now() - now) / 1000),
    te = S
      ? `MCP tool "${description}" was moved to the background as task ${id} so that a message that arrived while it was running can reach you; it was not interrupted and keeps running`
      : `MCP tool "${description}" is still running after ${rounded}s. It was moved to the background as task ${id} and keeps running`,
    re = T_()
      ? `. You can keep working in the meantime. If it completes while you are still working, you'll receive a notification with the result. A few minutes after your reply, the call is likely cut off here and its result lost, though the server may still finish the work. So do not say you will report back: if you have not received its result by the time you reply, tell the user it will likely be lost.${b5e() ? " To get the result of a call like this after your reply, make the call from a background agent, where it runs in the foreground and keeps this session running until it returns, unless it waits on the user. This call keeps running, so making it again that way runs it twice; do that only if that is harmless." : ""} To stop it, use ${TASKSTOP} with task_id "${id}".`
      : `; you'll receive a notification with the result when it completes. You can keep working in the meantime. To stop it, use TaskStop with task_id "${id}". Note: it does not survive exiting this session.`;
  return { data: [{ type: "text", text: `${te}${re}` }] };
}
//@ chunk-tn4j580p.js:16522-16591 placement
function Ie(e, r) {
  try {
    getTaskRunState().mcpCallProgress.get(e)?.(r);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tn4j580p.js:16591-16869 placement
function createBackgroundShare({ signal: signal, taskRegistry: taskRegistry, taskId: taskId, share: share }) {
  let u = {
    signal: signal,
    taskRegistry: taskRegistry,
    taskId: taskId,
    share: share,
    writers: getTaskRunState().mcpCallProgress,
    latest: void 0,
    lastWriteAt: 0,
    timer: void 0,
    failureLogged: !1,
  };
  return (
    u.writers.set(signal, (d) => scheduleBackgroundProgressWrite(u, d)),
    signal.addEventListener("abort", () => resetTypeahead(u), { once: !0 }),
    u
  );
}
//@ chunk-tn4j580p.js:16869-17062 placement
function scheduleBackgroundProgressWrite(e, r) {
  if (e.share?.becameTask) return;
  if (((e.latest = r), e.timer !== void 0)) return;
  let min = Math.min(e.lastWriteAt + j - Date.now(), j);
  if (min <= 0) {
    flushBackgroundProgress(e);
    return;
  }
  ((e.timer = setTimeout(flushBackgroundProgress, min, e)), e.timer.unref());
}
//@ chunk-tn4j580p.js:17062-17770 placement
function flushBackgroundProgress(e) {
  ((e.timer = void 0), (e.lastWriteAt = Date.now()));
  let { latest: latest, taskId: taskId } = e;
  if (latest === void 0) return;
  try {
    let boundMcpStatusMessage = _().boundMcpStatusMessage(latest.message),
      u = latest.total !== void 0 && latest.total > 0 ? latest.progress / latest.total : Number.NaN,
      d = Number.isFinite(u) ? `${Math.round(Math.min(1, Math.max(0, u)) * 100)}%` : void 0,
      h =
        d !== void 0 && boundMcpStatusMessage !== void 0
          ? `${d} \xB7 ${boundMcpStatusMessage}`
          : (d ?? boundMcpStatusMessage ?? `Processing\u2026 ${latest.progress}`),
      y;
    if (
      (e.taskRegistry.update(taskId, (k) => {
        if (k.notified || k.status !== "running" || k.protocol !== void 0 || k.statusMessage === h) return k;
        return ((y = k), { ...k, statusMessage: h });
      }),
      y !== void 0)
    )
      emitTaskProgress({
        taskId: taskId,
        toolUseId: y.toolUseId,
        description: y.description,
        startTime: y.startTime,
        totalTokens: 0,
        toolUses: 0,
        summary: h,
      });
  } catch (error) {
    if (!e.failureLogged) ((e.failureLogged = !0), logError(error));
  }
}

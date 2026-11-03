/**
 * tasks/MonitorTask/monitorDelivery.ts
 *
 * 2.1.316 新增（门面模块 createMonitorDelivery）。监视任务的结果投递。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xf84t5b0.js (13)
 * attribution: placement 13
 */
import { count } from "../../utils/collections.js";
import { oO, enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { BUCKET_CAPACITY, TOKEN_REFILL_MS, createTokenBucket } from "../../utils/tokenBucket.js";
import { enqueueTaskNotification, removeKeepaliveReason } from "../../utils/task/framework.js";
import { h$e } from "../../tools/PushNotificationTool/prompt.js";
import { PUSHNOTIFICATION } from "../../tools/PushNotificationTool/constants.js";
import { EVENT, MONITOR_EVENT_QUOTED_PREFIX } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { ge } from "../../utils/identity.js";
import { getHookCallerOrScheduler } from "../../utils/workloadContext.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { xZ, holdQueuedInput } from "../../plugins/functionHooks/inputHold.js";
import { Km } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { toastStoppedOnce } from "../../plugins/functionHooks/apiCatalog.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { b_n } from "../../services/remoteTools/backgroundCommands.js";
import { Mr } from "../../utils/agentId.js";
import { isClaudeCodeHintLine } from "../../utils/claudeCodeHints.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-xf84t5b0.js:7647-7661 placement
var SUSTAINED_SUPPRESSION_KILL_MS = 30000;
//@ chunk-xf84t5b0.js:7661-9407 placement
function createMonitorDelivery(e) {
  let { description: description, agentId: agentId, taskRef: taskRef } = e,
    i = e.now ?? Date.now,
    r = i(),
    s = 0,
    a = 0,
    h = 0,
    p = 0,
    u,
    y,
    S = !1;
  function v(A) {
    if (S) return;
    S = !0;
    try {
      let _ = (T) =>
          count(
            oO(),
            ({ monitorEvent: monitorEvent }) =>
              monitorEvent?.kind === T && monitorEvent.watchId === taskRef.id,
          ),
        b = {
          eventsQueued: s,
          eventsStillQueued: _("output"),
          eventsSuppressed: h,
          suppressionNoticesQueued: p,
          noticesStillQueued: _("notice"),
          elapsedMs: i() - r,
        };
      if (e.arm !== void 0)
        logFeatureOk("monitor_watch_closed", {
          arm: fromEnum(e.arm),
          closed_by: fromEnum(A),
          events_queued: b.eventsQueued,
          events_still_queued: b.eventsStillQueued,
          events_suppressed: b.eventsSuppressed,
          suppression_notices_queued: b.suppressionNoticesQueued,
          notices_still_queued: b.noticesStillQueued,
          elapsed_ms: b.elapsedMs,
          subagent_owned: agentId !== void 0,
        });
      e.onClosed?.(b);
    } catch (error) {
      logError(error);
    }
  }
  let { capacity: capacity, refillMs: refillMs } = e.bucket ?? {
      capacity: BUCKET_CAPACITY,
      refillMs: TOKEN_REFILL_MS,
    },
    N = createTokenBucket(capacity, refillMs, i);
  function k() {
    if (!N.tryConsume()) {
      if ((a++, h++, (y = i()), u === void 0)) u = i();
      return !1;
    }
    if (a > 0) {
      if (
        (enqueueMonitorEvent(description, eventsSuppressedNotice(a), taskRef.id, {
          isHousekeeping: !0,
          agentId: agentId,
        }),
        p++,
        (a = 0),
        y !== void 0 && i() - y > refillMs * 3)
      )
        u = void 0;
    }
    return (s++, !0);
  }
  let D = (A) => {
      if (S) return;
      if (k()) {
        enqueueMonitorEvent(description, A, taskRef.id, { agentId: agentId });
        return;
      }
      if (u !== void 0 && i() - u > SUSTAINED_SUPPRESSION_KILL_MS) {
        if ((v("too_much_output"), e.killTask()))
          enqueueMonitorEvent(
            description,
            `[Monitor stopped \u2014 too much output (${a} events suppressed over ${Math.round((i() - u) / 1000)}s). Restart with a more selective source.]`,
            taskRef.id,
            { isHousekeeping: !0, agentId: agentId },
          );
      }
    },
    M = createStreamLineBatcher(D, e.schedule);
  function Y() {
    (M.flush(!0), v("flushed"));
  }
  return {
    onData: M.onData,
    onBatch: D,
    isClosed: () => S,
    flush: () => M.flush(),
    eventCount: () => s,
    flushAndClose: Y,
    dropAndClose: () => {
      (M.drain(), v("dropped"));
    },
    reportExit: async (A, _) => {
      let b = S ? void 0 : M.drain();
      v("exited");
      let { terminalNotification: terminalNotification } = await A.settled,
        R = b !== void 0 && k();
      if (terminalNotification !== void 0) {
        let joined = [R ? b : void 0, _].filter((z) => z !== void 0).join(`
`);
        enqueueShellTerminalNotification(
          joined !== ""
            ? { ...terminalNotification, body: formatMonitorEvent(joined) }
            : terminalNotification,
        );
      } else if (R) enqueueMonitorEvent(description, b, taskRef.id, { agentId: agentId });
    },
  };
}
//@ chunk-xf84t5b0.js:9407-9562 placement
function eventsSuppressedNotice(e) {
  return `[${e} events suppressed \u2014 output rate too high. Consider using TaskStop to restart this monitor with a more selective filter.]`;
}
/**
 * 入队任务通知，turnAttribution=inherit。
 */
//@ chunk-xf84t5b0.js:9562-9617 placement = resolveAgentModelDisplay (0.752)
function enqueueShellTerminalNotification(agent) {
  enqueuePendingNotification(enqueueTaskNotification(agent), { turnAttribution: "inherit" });
}
//@ chunk-xf84t5b0.js:9617-9651 placement
var I = 500,
  Q = 3000,
  Se = 200,
  q = 1048576;
//@ chunk-xf84t5b0.js:9651-9842 placement
function formatMonitorEvent(e, n = !1) {
  let t =
    !n && h$e()
      ? `
If this event is something the user would act on now, send a ${PUSHNOTIFICATION}. Routine or benign output doesn't need one.`
      : "";
  return `
<${EVENT}>${escapeXml(e)}</${EVENT}>${t}`;
}
//@ chunk-xf84t5b0.js:9842-10024 placement
var MONITOR_STATUS_LINE_RE =
    /^\[(?:Monitor (?:stopped|timed out|expired)|WebSocket (?:closed|error|upgrade rejected): |Dropped \d+-byte frame )/,
  pendingHousekeepingTasks = ge(new Set(), (e) => e.clear()),
  monitorKeptFor = ge(new Map(), (e) => e.clear());
//@ chunk-xf84t5b0.js:10024-10168 placement
function recordMonitorPlugin(e, n, t) {
  let o = getHookCallerOrScheduler(n);
  if (o === void 0) return;
  for (let i of monitorKeptFor.keys()) {
    let r = t.get(i)?.status;
    if (r !== void 0 && isTerminalTaskStatus(r)) monitorKeptFor.delete(i);
  }
  monitorKeptFor.set(e, o);
}
//@ chunk-xf84t5b0.js:10168-10850 placement
function enqueueMonitorEvent(e, n, t, o) {
  let i = (o?.agentId ?? mainAgentId()) === mainAgentId(),
    r = o?.keptFor ?? (i && t !== void 0 ? monitorKeptFor.get(t) : void 0);
  if (r !== void 0 && xZ()) {
    if (
      (Km(() => toastStoppedOnce(r)),
      o?.isHousekeeping && MONITOR_STATUS_LINE_RE.test(n) && t !== void 0 && !pendingHousekeepingTasks.has(t))
    ) {
      let a = () => {
          pendingHousekeepingTasks.delete(t);
        },
        h = () => {
          if (xZ()) {
            holdQueuedInput(h, void 0, a);
            return;
          }
          (pendingHousekeepingTasks.delete(t), enqueueMonitorEvent(e, n, t, { ...o, keptFor: r }));
        };
      Km(() => {
        (holdQueuedInput(h, void 0, a), pendingHousekeepingTasks.add(t));
      });
    }
    return;
  }
  enqueuePendingNotification(
    {
      value: formatTaskNotification({
        taskId: t ? escapeXml(t) : void 0,
        summary: `${MONITOR_EVENT_QUOTED_PREFIX}${escapeXml(e)}"`,
        body: formatMonitorEvent(n, o?.isHousekeeping),
      }),
      mode: "task-notification",
      skipAttachments: !0,
      priority: "next",
      agentId: o?.agentId ?? mainAgentId(),
      ...(r !== void 0 && { scheduledByPlugin: r }),
      ...(t !== void 0 && { monitorEvent: { watchId: t, kind: o?.isHousekeeping ? "notice" : "output" } }),
    },
    { turnAttribution: o?.turnAttribution ?? "inherit" },
  );
}
//@ chunk-xf84t5b0.js:10850-11151 placement
function enqueueForeignStopNotification(e) {
  let {
      taskId: taskId,
      toolUseId: toolUseId,
      description: description,
      ownerAgentId: ownerAgentId,
      stopperAgentId: stopperAgentId,
    } = e,
    s = `Task "${description}" was stopped by ${b_n(stopperAgentId)}`;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(taskId),
      toolUseId: toolUseId ? escapeXml(toolUseId) : void 0,
      status: "stopped",
      summary: escapeXml(s),
    }),
    mode: "task-notification",
    skipAttachments: !0,
    priority: "next",
    agentId: Mr(ownerAgentId),
    taskId: taskId,
  });
}
//@ chunk-xf84t5b0.js:11151-11585 placement
function enqueueUserStopNotification(e) {
  let {
      taskId: taskId,
      toolUseId: toolUseId,
      description: description,
      source: source,
      outputFile: outputFile,
      note: note,
    } = e,
    a =
      source === "client"
        ? `Task "${description}" was stopped by the user or by the app connected to this session`
        : `Task "${description}" was stopped by the user`;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(taskId),
      toolUseId: toolUseId ? escapeXml(toolUseId) : void 0,
      outputFile: outputFile,
      status: "killed",
      summary: escapeXml(note === void 0 ? a : `${a}. ${note}`),
    }),
    mode: "task-notification",
    skipAttachments: !0,
    priority: "next",
    passive: !0,
    agentId: mainAgentId(),
    taskId: taskId,
  });
}
//@ chunk-xf84t5b0.js:11585-12242 placement
function createStreamLineBatcher(
  e,
  n = (t) => {
    let o = setTimeout(t, Se);
    return () => clearTimeout(o);
  },
) {
  let t = "",
    o = [],
    i = null;
  function r(h) {
    if (i) (i(), (i = null));
    if (h && t.trim() && !isClaudeCodeHintLine(t.trim())) {
      let trimmed = t.trim();
      if (trimmed.length > I) trimmed = trimmed.slice(0, I) + "...(truncated)";
      (o.push(trimmed), (t = ""));
    }
    if (o.length === 0) return;
    let joined = o.join(`
`);
    if (joined.length > Q)
      joined =
        joined.slice(0, Q) +
        `
...(truncated)`;
    return ((o = []), joined);
  }
  function s(h) {
    let p = r(h === !0);
    if (p !== void 0) e(p);
  }
  function a(h) {
    if (((t += h), t.length > q)) t = t.slice(-q);
    let p;
    while (
      (p = t.indexOf(`
`)) !== -1
    ) {
      let trimmed = t.slice(0, p).trim();
      if (((t = t.slice(p + 1)), isClaudeCodeHintLine(trimmed))) continue;
      if (trimmed) {
        if (trimmed.length > I) trimmed = trimmed.slice(0, I) + "...(truncated)";
        o.push(trimmed);
      }
    }
    if (o.length > 0 && !i) i = n(s);
  }
  return { onData: a, flush: s, drain: () => r(!0) };
}
/**
 * 停止运行中的监视任务：更新状态与结束信息、清除超时、移除保活原因，并（非静默时）入队停止事件与任务通知。
 */
//@ chunk-xf84t5b0.js:12242-12774 placement
function stopMonitorTask(taskId, registry, options) {
  let description, toolUseId, agentId;
  if (
    (registry.update(taskId, (task) => {
      if (task.status !== "running") return task;
      if (
        ((description = task.description),
        (toolUseId = task.toolUseId),
        (agentId = task.agentId),
        task.timeoutId !== void 0)
      )
        clearTimeout(task.timeoutId);
      return {
        ...task,
        status: options?.endedAs?.status ?? "killed",
        endTime: Date.now(),
        timeoutId: void 0,
        notified: !0,
        terminal: { summary: options?.endedAs?.summary ?? task.description },
      };
    }),
    options?.onKilled?.(),
    removeKeepaliveReason(agentId, `monitor:${taskId}`, registry),
    description !== void 0)
  ) {
    if (!options?.quiet)
      enqueueMonitorEvent(description, "[Monitor stopped]", taskId, { isHousekeeping: !0, agentId: agentId });
    emitTaskNotification(taskId, options?.endedAs?.status ?? "stopped", {
      toolUseId: toolUseId,
      summary: options?.endedAs?.summary ?? description,
    });
  }
}

export {
  enqueueMonitorEvent,
  createStreamLineBatcher,
  enqueueShellTerminalNotification,
  recordMonitorPlugin,
  createMonitorDelivery,
  stopMonitorTask,
  enqueueForeignStopNotification,
  enqueueUserStopNotification,
};

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
import { getCommandQueue, enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { BUCKET_CAPACITY, TOKEN_REFILL_MS, createTokenBucket } from "../../utils/tokenBucket.js";
import { enqueueTaskNotification, removeKeepaliveReason } from "../../utils/task/framework.js";
import { isAgentPushNotificationEnabled } from "../../tools/PushNotificationTool/prompt.js";
import { PUSHNOTIFICATION } from "../../tools/PushNotificationTool/constants.js";
import { EVENT, MONITOR_EVENT_QUOTED_PREFIX } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { identity } from "../../utils/identity.js";
import { getHookCallerOrScheduler } from "../../utils/workloadContext.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { isHeldByPlugin, holdQueuedInput } from "../../plugins/functionHooks/inputHold.js";
import { runIgnoringAbort } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { toastStoppedOnce } from "../../plugins/functionHooks/apiCatalog.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { sessionLabel } from "../../services/remoteTools/backgroundCommands.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { isClaudeCodeHintLine } from "../../utils/claudeCodeHints.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-xf84t5b0.js:7647-7661 placement
var SUSTAINED_SUPPRESSION_KILL_MS = 30000;
//@ chunk-xf84t5b0.js:7661-9407 placement
function createMonitorDelivery(e) {
  let { description, agentId, taskRef } = e;
  let now = e.now ?? Date.now;
  let r = now();
  let s = 0;
  let a = 0;
  let h = 0;
  let p = 0;
  let u;
  let y;
  let S = false;
  function v(A) {
    if (S) return;
    S = true;
    try {
      let _ = (T) =>
        count(
          getCommandQueue(),
          ({ monitorEvent }) => monitorEvent?.kind === T && monitorEvent.watchId === taskRef.id,
        );
      let b = {
        eventsQueued: s,
        eventsStillQueued: _("output"),
        eventsSuppressed: h,
        suppressionNoticesQueued: p,
        noticesStillQueued: _("notice"),
        elapsedMs: now() - r,
      };
      if (e.arm !== undefined)
        logFeatureOk("monitor_watch_closed", {
          arm: fromEnum(e.arm),
          closed_by: fromEnum(A),
          events_queued: b.eventsQueued,
          events_still_queued: b.eventsStillQueued,
          events_suppressed: b.eventsSuppressed,
          suppression_notices_queued: b.suppressionNoticesQueued,
          notices_still_queued: b.noticesStillQueued,
          elapsed_ms: b.elapsedMs,
          subagent_owned: agentId !== undefined,
        });
      e.onClosed?.(b);
    } catch (error) {
      logError(error);
    }
  }
  let { capacity, refillMs } = e.bucket ?? {
    capacity: BUCKET_CAPACITY,
    refillMs: TOKEN_REFILL_MS,
  };
  let tokenBucket = createTokenBucket(capacity, refillMs, now);
  function k() {
    if (!tokenBucket.tryConsume()) {
      a++;
      h++;
      y = now();
      if (u === undefined) u = now();
      return false;
    }
    if (a > 0) {
      enqueueMonitorEvent(description, eventsSuppressedNotice(a), taskRef.id, {
        isHousekeeping: true,
        agentId,
      });
      p++;
      a = 0;
      if (y !== undefined && now() - y > refillMs * 3) u = undefined;
    }
    s++;
    return true;
  }
  let D = (A) => {
    if (S) return;
    if (k()) {
      enqueueMonitorEvent(description, A, taskRef.id, {
        agentId,
      });
      return;
    }
    if (u !== undefined && now() - u > SUSTAINED_SUPPRESSION_KILL_MS) {
      v("too_much_output");
      if (e.killTask())
        enqueueMonitorEvent(
          description,
          `[Monitor stopped \u2014 too much output (${a} events suppressed over ${Math.round((now() - u) / 1000)}s). Restart with a more selective source.]`,
          taskRef.id,
          {
            isHousekeeping: true,
            agentId,
          },
        );
    }
  };
  let streamLineBatcher = createStreamLineBatcher(D, e.schedule);
  function Y() {
    streamLineBatcher.flush(true);
    v("flushed");
  }
  return {
    onData: streamLineBatcher.onData,
    onBatch: D,
    isClosed: () => S,
    flush: () => streamLineBatcher.flush(),
    eventCount: () => s,
    flushAndClose: Y,
    dropAndClose: () => {
      streamLineBatcher.drain();
      v("dropped");
    },
    reportExit: async (A, _) => {
      let b = S ? undefined : streamLineBatcher.drain();
      v("exited");
      let { terminalNotification } = await A.settled;
      let R = b !== undefined && k();
      if (terminalNotification !== undefined) {
        let joined = [R ? b : undefined, _].filter((z) => z !== undefined).join(`
`);
        enqueueShellTerminalNotification(
          joined !== ""
            ? {
                ...terminalNotification,
                body: formatMonitorEvent(joined),
              }
            : terminalNotification,
        );
      } else if (R)
        enqueueMonitorEvent(description, b, taskRef.id, {
          agentId,
        });
    },
  };
}
//@ chunk-xf84t5b0.js:9407-9562 placement
function eventsSuppressedNotice(e) {
  return `[${e} events suppressed \u2014 output rate too high. Consider using TaskStop to restart this monitor with a more selective filter.]`;
}
//@ chunk-xf84t5b0.js:9562-9617 placement = resolveAgentModelDisplay (0.752)
/**
 * 入队任务通知，turnAttribution=inherit。
 */
function enqueueShellTerminalNotification(agent) {
  enqueuePendingNotification(enqueueTaskNotification(agent), {
    turnAttribution: "inherit",
  });
}
//@ chunk-xf84t5b0.js:9617-9651 placement
/**
 * 监视事件文本的行长与总长上限、去抖时间与累积上限。
 */
var MAX_LINE_CHARS = 500;
var MAX_JOINED_LINE_CHARS = 3000;
var DEBOUNCE_MS = 200;
var MAX_ACCUMULATED_CHARS = 1048576;
//@ chunk-xf84t5b0.js:9651-9842 placement
function formatMonitorEvent(e, isHousekeeping = false) {
  let t =
    !isHousekeeping && isAgentPushNotificationEnabled()
      ? `
If this event is something the user would act on now, send a ${PUSHNOTIFICATION}. Routine or benign output doesn't need one.`
      : "";
  return `
<${EVENT}>${escapeXml(e)}</${EVENT}>${t}`;
}
//@ chunk-xf84t5b0.js:9842-10024 placement
var MONITOR_STATUS_LINE_RE =
  /^\[(?:Monitor (?:stopped|timed out|expired)|WebSocket (?:closed|error|upgrade rejected): |Dropped \d+-byte frame )/;
var pendingHousekeepingTasks = identity(new Set(), (e) => e.clear());
var monitorKeptFor = identity(new Map(), (e) => e.clear());
//@ chunk-xf84t5b0.js:10024-10168 placement
function recordMonitorPlugin(e, n, taskRegistry) {
  let hookCallerOrScheduler = getHookCallerOrScheduler(n);
  if (hookCallerOrScheduler === undefined) return;
  for (let key of monitorKeptFor.keys()) {
    let status = taskRegistry.get(key)?.status;
    if (status !== undefined && isTerminalTaskStatus(status)) monitorKeptFor.delete(key);
  }
  monitorKeptFor.set(e, hookCallerOrScheduler);
}
//@ chunk-xf84t5b0.js:10168-10850 placement
function enqueueMonitorEvent(description, n, t, o) {
  let i = (o?.agentId ?? mainAgentId()) === mainAgentId();
  let r = o?.keptFor ?? (i && t !== undefined ? monitorKeptFor.get(t) : undefined);
  if (r !== undefined && isHeldByPlugin()) {
    runIgnoringAbort(() => toastStoppedOnce(r));
    if (
      o?.isHousekeeping &&
      MONITOR_STATUS_LINE_RE.test(n) &&
      t !== undefined &&
      !pendingHousekeepingTasks.has(t)
    ) {
      let a = () => {
        pendingHousekeepingTasks.delete(t);
      };
      let h = () => {
        if (isHeldByPlugin()) {
          holdQueuedInput(h, undefined, a);
          return;
        }
        pendingHousekeepingTasks.delete(t);
        enqueueMonitorEvent(description, n, t, {
          ...o,
          keptFor: r,
        });
      };
      runIgnoringAbort(() => {
        holdQueuedInput(h, undefined, a);
        pendingHousekeepingTasks.add(t);
      });
    }
    return;
  }
  enqueuePendingNotification(
    {
      value: formatTaskNotification({
        taskId: t ? escapeXml(t) : undefined,
        summary: `${MONITOR_EVENT_QUOTED_PREFIX}${escapeXml(description)}"`,
        body: formatMonitorEvent(n, o?.isHousekeeping),
      }),
      mode: "task-notification",
      skipAttachments: true,
      priority: "next",
      agentId: o?.agentId ?? mainAgentId(),
      ...(r !== undefined && {
        scheduledByPlugin: r,
      }),
      ...(t !== undefined && {
        monitorEvent: {
          watchId: t,
          kind: o?.isHousekeeping ? "notice" : "output",
        },
      }),
    },
    {
      turnAttribution: o?.turnAttribution ?? "inherit",
    },
  );
}
//@ chunk-xf84t5b0.js:10850-11151 placement
function enqueueForeignStopNotification(e) {
  let { taskId, toolUseId, description, ownerAgentId, stopperAgentId } = e;
  let s = `Task "${description}" was stopped by ${sessionLabel(stopperAgentId)}`;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(taskId),
      toolUseId: toolUseId ? escapeXml(toolUseId) : undefined,
      status: "stopped",
      summary: escapeXml(s),
    }),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    agentId: identityAgentId2(ownerAgentId),
    taskId,
  });
}
//@ chunk-xf84t5b0.js:11151-11585 placement
function enqueueUserStopNotification(e) {
  let { taskId, toolUseId, description, source, outputFile, note } = e;
  let a =
    source === "client"
      ? `Task "${description}" was stopped by the user or by the app connected to this session`
      : `Task "${description}" was stopped by the user`;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(taskId),
      toolUseId: toolUseId ? escapeXml(toolUseId) : undefined,
      outputFile,
      status: "killed",
      summary: escapeXml(note === undefined ? a : `${a}. ${note}`),
    }),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    passive: true,
    agentId: mainAgentId(),
    taskId,
  });
}
//@ chunk-xf84t5b0.js:11585-12242 placement
function createStreamLineBatcher(
  e,
  schedule = (t) => {
    let timer = setTimeout(t, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  },
) {
  let t = "";
  let o = [];
  let i = null;
  function r(h) {
    if (i) {
      i();
      i = null;
    }
    if (h && t.trim() && !isClaudeCodeHintLine(t.trim())) {
      let trimmed = t.trim();
      if (trimmed.length > MAX_LINE_CHARS) trimmed = trimmed.slice(0, MAX_LINE_CHARS) + "...(truncated)";
      o.push(trimmed);
      t = "";
    }
    if (o.length === 0) return;
    let joined = o.join(`
`);
    if (joined.length > MAX_JOINED_LINE_CHARS)
      joined =
        joined.slice(0, MAX_JOINED_LINE_CHARS) +
        `
...(truncated)`;
    o = [];
    return joined;
  }
  function s(h) {
    let p = r(h === true);
    if (p !== undefined) e(p);
  }
  function a(h) {
    t += h;
    if (t.length > MAX_ACCUMULATED_CHARS) t = t.slice(-MAX_ACCUMULATED_CHARS);
    let p;
    while (
      (p = t.indexOf(`
`)) !== -1
    ) {
      let trimmed = t.slice(0, p).trim();
      t = t.slice(p + 1);
      if (isClaudeCodeHintLine(trimmed)) continue;
      if (trimmed) {
        if (trimmed.length > MAX_LINE_CHARS) trimmed = trimmed.slice(0, MAX_LINE_CHARS) + "...(truncated)";
        o.push(trimmed);
      }
    }
    if (o.length > 0 && !i) i = schedule(s);
  }
  return {
    onData: a,
    flush: s,
    drain: () => r(true),
  };
}
//@ chunk-xf84t5b0.js:12242-12774 placement
/**
 * 停止运行中的监视任务：更新状态与结束信息、清除超时、移除保活原因，并（非静默时）入队停止事件与任务通知。
 */
function stopMonitorTask(taskId, registry, options) {
  let description;
  let toolUseId;
  let agentId;
  registry.update(taskId, (task) => {
    if (task.status !== "running") return task;
    description = task.description;
    toolUseId = task.toolUseId;
    agentId = task.agentId;
    if (task.timeoutId !== undefined) clearTimeout(task.timeoutId);
    return {
      ...task,
      status: options?.endedAs?.status ?? "killed",
      endTime: Date.now(),
      timeoutId: undefined,
      notified: true,
      terminal: {
        summary: options?.endedAs?.summary ?? task.description,
      },
    };
  });
  options?.onKilled?.();
  removeKeepaliveReason(agentId, `monitor:${taskId}`, registry);
  if (description !== undefined) {
    if (!options?.quiet)
      enqueueMonitorEvent(description, "[Monitor stopped]", taskId, {
        isHousekeeping: true,
        agentId,
      });
    emitTaskNotification(taskId, options?.endedAs?.status ?? "stopped", {
      toolUseId,
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

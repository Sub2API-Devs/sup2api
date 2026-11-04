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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xf84t5b0.js:7647-7661 placement
var SUSTAINED_SUPPRESSION_KILL_MS = 30000;
//@ chunk-xf84t5b0.js:7661-9407 placement
function createMonitorDelivery(options) {
  let { description, agentId, taskRef } = options;
  let now = options.now ?? Date.now;
  let startedAt = now();
  let eventCount = 0;
  let suppressedSinceNotice = 0;
  let suppressedTotal = 0;
  let noticesQueued = 0;
  let suppressionStart;
  let lastSuppressedAt;
  let isClosed = false;
  function close(closedBy) {
    if (isClosed) return;
    isClosed = true;
    try {
      let countQueued = (kind) =>
        count(
          getCommandQueue(),
          ({ monitorEvent }) => monitorEvent?.kind === kind && monitorEvent.watchId === taskRef.id,
        );
      let stats = {
        eventsQueued: eventCount,
        eventsStillQueued: countQueued("output"),
        eventsSuppressed: suppressedTotal,
        suppressionNoticesQueued: noticesQueued,
        noticesStillQueued: countQueued("notice"),
        elapsedMs: now() - startedAt,
      };
      if (options.arm !== undefined)
        logFeatureOk("monitor_watch_closed", {
          arm: fromEnum(options.arm),
          closed_by: fromEnum(closedBy),
          events_queued: stats.eventsQueued,
          events_still_queued: stats.eventsStillQueued,
          events_suppressed: stats.eventsSuppressed,
          suppression_notices_queued: stats.suppressionNoticesQueued,
          notices_still_queued: stats.noticesStillQueued,
          elapsed_ms: stats.elapsedMs,
          subagent_owned: agentId !== undefined,
        });
      options.onClosed?.(stats);
    } catch (error) {
      logError(error);
    }
  }
  let { capacity, refillMs } = options.bucket ?? {
    capacity: BUCKET_CAPACITY,
    refillMs: TOKEN_REFILL_MS,
  };
  let tokenBucket = createTokenBucket(capacity, refillMs, now);
  function emitEvent() {
    if (!tokenBucket.tryConsume()) {
      suppressedSinceNotice++;
      suppressedTotal++;
      lastSuppressedAt = now();
      if (suppressionStart === undefined) suppressionStart = now();
      return false;
    }
    if (suppressedSinceNotice > 0) {
      enqueueMonitorEvent(description, eventsSuppressedNotice(suppressedSinceNotice), taskRef.id, {
        isHousekeeping: true,
        agentId,
      });
      noticesQueued++;
      suppressedSinceNotice = 0;
      if (lastSuppressedAt !== undefined && now() - lastSuppressedAt > refillMs * 3)
        suppressionStart = undefined;
    }
    eventCount++;
    return true;
  }
  let onBatch = (text) => {
    if (isClosed) return;
    if (emitEvent()) {
      enqueueMonitorEvent(description, text, taskRef.id, {
        agentId,
      });
      return;
    }
    if (suppressionStart !== undefined && now() - suppressionStart > SUSTAINED_SUPPRESSION_KILL_MS) {
      close("too_much_output");
      if (options.killTask())
        enqueueMonitorEvent(
          description,
          `[Monitor stopped \u2014 too much output (${suppressedSinceNotice} events suppressed over ${Math.round((now() - suppressionStart) / 1000)}s). Restart with a more selective source.]`,
          taskRef.id,
          {
            isHousekeeping: true,
            agentId,
          },
        );
    }
  };
  let streamLineBatcher = createStreamLineBatcher(onBatch, options.schedule);
  function flushAndClose() {
    streamLineBatcher.flush(true);
    close("flushed");
  }
  return {
    onData: streamLineBatcher.onData,
    onBatch,
    isClosed: () => isClosed,
    flush: () => streamLineBatcher.flush(),
    eventCount: () => eventCount,
    flushAndClose,
    dropAndClose: () => {
      streamLineBatcher.drain();
      close("dropped");
    },
    reportExit: async (task, exitText) => {
      let pendingText = isClosed ? undefined : streamLineBatcher.drain();
      close("exited");
      let { terminalNotification } = await task.settled;
      let canQueueTerminal = pendingText !== undefined && emitEvent();
      if (terminalNotification !== undefined) {
        let text = [canQueueTerminal ? pendingText : undefined, exitText].filter((part) => part !== undefined)
          .join(`
`);
        enqueueShellTerminalNotification(
          text !== ""
            ? {
                ...terminalNotification,
                body: formatMonitorEvent(text),
              }
            : terminalNotification,
        );
      } else if (canQueueTerminal)
        enqueueMonitorEvent(description, pendingText, taskRef.id, {
          agentId,
        });
    },
  };
}
//@ chunk-xf84t5b0.js:9407-9562 placement
function eventsSuppressedNotice(count) {
  return `[${count} events suppressed \u2014 output rate too high. Consider using TaskStop to restart this monitor with a more selective filter.]`;
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
function formatMonitorEvent(text, isHousekeeping = false) {
  let pushHint =
    !isHousekeeping && isAgentPushNotificationEnabled()
      ? `
If this event is something the user would act on now, send a ${PUSHNOTIFICATION}. Routine or benign output doesn't need one.`
      : "";
  return `
<${EVENT}>${escapeXml(text)}</${EVENT}>${pushHint}`;
}
//@ chunk-xf84t5b0.js:9842-10024 placement
var MONITOR_STATUS_LINE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var pendingHousekeepingTasks;
var monitorKeptFor;
deferInit("chunk-xf84t5b0.js:9842", () => {
  MONITOR_STATUS_LINE_RE =
    /^\[(?:Monitor (?:stopped|timed out|expired)|WebSocket (?:closed|error|upgrade rejected): |Dropped \d+-byte frame )/;
  pendingHousekeepingTasks = identity(new Set(), (pendingHousekeeping) => pendingHousekeeping.clear());
  monitorKeptFor = identity(new Map(), (keptFor) => keptFor.clear());
});
//@ chunk-xf84t5b0.js:10024-10168 placement
function recordMonitorPlugin(taskId, taskRegistry, taskRegistry_2) {
  let hookCallerOrScheduler = getHookCallerOrScheduler(taskRegistry);
  if (hookCallerOrScheduler === undefined) return;
  for (let key of monitorKeptFor.keys()) {
    let status = taskRegistry_2.get(key)?.status;
    if (status !== undefined && isTerminalTaskStatus(status)) monitorKeptFor.delete(key);
  }
  monitorKeptFor.set(taskId, hookCallerOrScheduler);
}
//@ chunk-xf84t5b0.js:10168-10850 placement
function enqueueMonitorEvent(description, text, taskId, options) {
  let isMainAgent = (options?.agentId ?? mainAgentId()) === mainAgentId();
  let keptFor =
    options?.keptFor ?? (isMainAgent && taskId !== undefined ? monitorKeptFor.get(taskId) : undefined);
  if (keptFor !== undefined && isHeldByPlugin()) {
    runIgnoringAbort(() => toastStoppedOnce(keptFor));
    if (
      options?.isHousekeeping &&
      MONITOR_STATUS_LINE_RE.test(text) &&
      taskId !== undefined &&
      !pendingHousekeepingTasks.has(taskId)
    ) {
      let releasePending = () => {
        pendingHousekeepingTasks.delete(taskId);
      };
      let retry = () => {
        if (isHeldByPlugin()) {
          holdQueuedInput(retry, undefined, releasePending);
          return;
        }
        pendingHousekeepingTasks.delete(taskId);
        enqueueMonitorEvent(description, text, taskId, {
          ...options,
          keptFor,
        });
      };
      runIgnoringAbort(() => {
        holdQueuedInput(retry, undefined, releasePending);
        pendingHousekeepingTasks.add(taskId);
      });
    }
    return;
  }
  enqueuePendingNotification(
    {
      value: formatTaskNotification({
        taskId: taskId ? escapeXml(taskId) : undefined,
        summary: `${MONITOR_EVENT_QUOTED_PREFIX}${escapeXml(description)}"`,
        body: formatMonitorEvent(text, options?.isHousekeeping),
      }),
      mode: "task-notification",
      skipAttachments: true,
      priority: "next",
      agentId: options?.agentId ?? mainAgentId(),
      ...(keptFor !== undefined && {
        scheduledByPlugin: keptFor,
      }),
      ...(taskId !== undefined && {
        monitorEvent: {
          watchId: taskId,
          kind: options?.isHousekeeping ? "notice" : "output",
        },
      }),
    },
    {
      turnAttribution: options?.turnAttribution ?? "inherit",
    },
  );
}
//@ chunk-xf84t5b0.js:10850-11151 placement
function enqueueForeignStopNotification(notice) {
  let { taskId, toolUseId, description, ownerAgentId, stopperAgentId } = notice;
  let summary = `Task "${description}" was stopped by ${sessionLabel(stopperAgentId)}`;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(taskId),
      toolUseId: toolUseId ? escapeXml(toolUseId) : undefined,
      status: "stopped",
      summary: escapeXml(summary),
    }),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    agentId: identityAgentId2(ownerAgentId),
    taskId,
  });
}
//@ chunk-xf84t5b0.js:11151-11585 placement
function enqueueUserStopNotification(notice) {
  let { taskId, toolUseId, description, source, outputFile, note } = notice;
  let baseSummary =
    source === "client"
      ? `Task "${description}" was stopped by the user or by the app connected to this session`
      : `Task "${description}" was stopped by the user`;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(taskId),
      toolUseId: toolUseId ? escapeXml(toolUseId) : undefined,
      outputFile,
      status: "killed",
      summary: escapeXml(note === undefined ? baseSummary : `${baseSummary}. ${note}`),
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
  emit,
  schedule = (callback) => {
    let timer = setTimeout(callback, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  },
) {
  let buffer = "";
  let lines = [];
  let cancelPending = null;
  function drainLines(includePartial) {
    if (cancelPending) {
      cancelPending();
      cancelPending = null;
    }
    if (includePartial && buffer.trim() && !isClaudeCodeHintLine(buffer.trim())) {
      let trimmed = buffer.trim();
      if (trimmed.length > MAX_LINE_CHARS) trimmed = trimmed.slice(0, MAX_LINE_CHARS) + "...(truncated)";
      lines.push(trimmed);
      buffer = "";
    }
    if (lines.length === 0) return;
    let joined = lines.join(`
`);
    if (joined.length > MAX_JOINED_LINE_CHARS)
      joined =
        joined.slice(0, MAX_JOINED_LINE_CHARS) +
        `
...(truncated)`;
    lines = [];
    return joined;
  }
  function flush(final) {
    let pendingText = drainLines(final === true);
    if (pendingText !== undefined) emit(pendingText);
  }
  function onData(chunk) {
    buffer += chunk;
    if (buffer.length > MAX_ACCUMULATED_CHARS) buffer = buffer.slice(-MAX_ACCUMULATED_CHARS);
    let lineEnd;
    while (
      (lineEnd = buffer.indexOf(`
`)) !== -1
    ) {
      let line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (isClaudeCodeHintLine(line)) continue;
      if (line) {
        if (line.length > MAX_LINE_CHARS) line = line.slice(0, MAX_LINE_CHARS) + "...(truncated)";
        lines.push(line);
      }
    }
    if (lines.length > 0 && !cancelPending) cancelPending = schedule(flush);
  }
  return {
    onData,
    flush,
    drain: () => drainLines(true),
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
  SUSTAINED_SUPPRESSION_KILL_MS,
};

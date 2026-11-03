/**
 * tasks/LocalAgentTask/workerCheckin.ts
 *
 * 2.1.316 新增：协调者模式下对仍在运行的派出工作定时检查（check-in）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { isObserverAgentTask } from "./LocalAgentTask.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { isWaitingOnChildren } from "./keepalive.js";
import { keepaliveReasons } from "../taskKinds.js";
import { escapeXml_2 as escapeXml, foldLookalikeChars } from "../../utils/confusables.js";
import { truncateWithCount, plural } from "../../utils/stringUtils.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { logError } from "../../utils/log.js";
import { getWorkerCheckinScheduleMs } from "../../tools/AgentTool/AgentTool.js";
import {
  removeQueuedByFilter,
  peekQueuedCommand,
  someInFlightDrainCommand,
  WORKER_CHECKIN_ORIGIN,
} from "../../utils/messageQueueManager.js";
import { enqueueHookTaskNotification } from "../../utils/hooks/hookMessages.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:4709381-4709477 placement
/**
 * 判断通知是否来自 worker-checkin。
 */
function isWorkerCheckinNotification(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "worker-checkin";
}
//@ chunk-e6aww6q8.js:4709477-4709491 placement
var MAX_CHECKIN_POLL_MS = 60000;
//@ chunk-e6aww6q8.js:4709738-4709812 placement
/**
 * 按调度表与轮询间隔计算还要几轮才检查。
 */
function ticksUntilCheckin(e, scheduleMs, pollMs) {
  let s = scheduleMs[Math.min(e, scheduleMs.length - 1)];
  return Math.ceil(s / pollMs);
}
//@ chunk-e6aww6q8.js:4709812-4709911 placement = isPanelAgentTask (0.77)
/**
 * 运行中的、可见的子代理任务：local_agent、非观察者、非 main-session、未到终态。
 */
function isRunningVisibleSubagent(task) {
  return (
    task.type === "local_agent" &&
    !isObserverAgentTask(task) &&
    task.agentType !== "main-session" &&
    !isTerminalTaskStatus(task.status)
  );
}
//@ chunk-e6aww6q8.js:4709911-4709950 placement
/**
 * 表示"在等子工作"的保活原因前缀：bash:、agent:、workflow:。
 */
var CHILD_WORK_KEEPALIVE_PREFIXES = ["bash:", "agent:", "workflow:"];
//@ chunk-e6aww6q8.js:4709950-4710095 placement = isPanelAgentTask (0.77)
/**
 * 子代理已停但仍有子工作（保活原因以 bash:/agent:/workflow: 开头）在跑。
 */
function isSubagentWaitingOnChildren(task) {
  return (
    task.type === "local_agent" &&
    !isObserverAgentTask(task) &&
    task.agentType !== "main-session" &&
    isWaitingOnChildren(task) &&
    [...keepaliveReasons(task)].some((n) => CHILD_WORK_KEEPALIVE_PREFIXES.some((r) => n.startsWith(r)))
  );
}
//@ chunk-e6aww6q8.js:4710095-4710120 placement
var MAX_WORKERS_LISTED = 10;
var MAX_WORKER_DESCRIPTION_CHARS = 80;
var MAX_ACTIVITY_CHARS = 60;
//@ chunk-e6aww6q8.js:4710120-4710165 placement
/**
 * 去不可见字符、去掉易混字符、转义并按长度截断。
 */
function escapeAndTruncate(e, n) {
  return escapeXml(truncateWithCount(foldLookalikeChars(stripIgnorables(e)), n));
}
//@ chunk-e6aww6q8.js:4710165-4710225 placement
/**
 * 拼出「约 N 分钟前」。
 */
function minutesAgoText(e) {
  return `~${Math.floor(e / 60000)} minutes ago`;
}
//@ chunk-e6aww6q8.js:4710225-4710724 placement
/**
 * 生成工作代理的状态行：工具调用次数、最近一次调用及时间、是否在等子代理。
 */
function workerStatusLine(e, n) {
  let r = [];
  let toolUseCount = e.progress?.toolUseCount ?? 0;
  if (toolUseCount === 0) r.push("no tool calls yet");
  else {
    r.push(`${toolUseCount} ${plural(toolUseCount, "tool call")}`);
    let lastActivity = e.progress?.lastActivity;
    let y = lastActivity?.activityDescription ?? lastActivity?.toolName;
    if (y) {
      let S = escapeAndTruncate(y, MAX_ACTIVITY_CHARS);
      r.push(
        lastActivity?.recordedAtMs !== undefined
          ? `last tool call ${minutesAgoText(n - lastActivity.recordedAtMs)}: ${S}`
          : `last tool call: ${S}`,
      );
    }
  }
  if (e.isIdle) r.push("waiting on a subagent");
  if (isSubagentWaitingOnChildren(e)) r.push("agent finished; parked on pending background work");
  return `- ${escapeAndTruncate(e.description, MAX_WORKER_DESCRIPTION_CHARS)} (${r.join(", ")})`;
}
//@ chunk-e6aww6q8.js:4710724-4710978 placement
function stillRunningSummary(e, n) {
  let r = e.toSorted((w, L) => w.startTime - L.startTime);
  let filtered = r.filter((w) => !isSubagentWaitingOnChildren(w));
  let filtered_2 = r.filter((w) => isSubagentWaitingOnChildren(w));
  let mapped = [...filtered, ...filtered_2].slice(0, MAX_WORKERS_LISTED).map((w) => workerStatusLine(w, n));
  let S = r.length - MAX_WORKERS_LISTED;
  if (S > 0) mapped.push(`- \u2026and ${S} more`);
  return `Still running:
${mapped.join(`
`)}`;
}
//@ chunk-e6aww6q8.js:4710978-4711247 placement
function trackWorkerForCheckin(e, taskRegistry, r, armedAtMs = Date.now()) {
  try {
    if (!isRunningVisibleSubagent(e)) return;
    let h = r.workerCheckin();
    if (h !== undefined) {
      h.taskRegistry = taskRegistry;
      if (h.knownWorkerIds.has(e.id)) return;
      h.knownWorkerIds.add(e.id);
      if (!hasOtherRunningWorker(taskRegistry, e.id)) restartCheckin(e, taskRegistry, r, armedAtMs);
      else resetCheckinIfOnlyWorker(h, taskRegistry, e);
      return;
    }
    armWorkerCheckin(r, taskRegistry, new Set([e.id]), armedAtMs);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:4711247-4711333 placement
/**
 * 除该 worker 外是否还有运行中或等子工作的 worker。
 */
function hasOtherRunningWorker(e, id) {
  return Object.values(e.all()).some(
    (r) => (isRunningVisibleSubagent(r) || isSubagentWaitingOnChildren(r)) && r.id !== id,
  );
}
//@ chunk-e6aww6q8.js:4711333-4711495 placement
function resetCheckinIfOnlyWorker(e, n, r) {
  if (!isRunningVisibleSubagent(r)) return;
  if (!Object.values(n.all()).some((h) => isRunningVisibleSubagent(h) && h.id !== r.id)) {
    e.checkinCount = 0;
    e.ticksUntilCheckin = ticksUntilCheckin(0, e.scheduleMs, e.pollMs);
  }
}
//@ chunk-e6aww6q8.js:4711495-4711626 placement
function restartCheckin(e, taskRegistry, r, armedAtMs) {
  let h = r.workerCheckin();
  if (h === undefined) return;
  let knownWorkerIds = new Set(h.knownWorkerIds);
  knownWorkerIds.add(e.id);
  disarmWorkerCheckin(r);
  armWorkerCheckin(r, taskRegistry, knownWorkerIds, armedAtMs);
}
//@ chunk-e6aww6q8.js:4711626-4711887 placement
function armWorkerCheckin(e, taskRegistry, knownWorkerIds, armedAtMs) {
  let workerCheckinScheduleMs = getWorkerCheckinScheduleMs();
  if (workerCheckinScheduleMs === undefined) return;
  let min = Math.min(MAX_CHECKIN_POLL_MS, ...workerCheckinScheduleMs);
  let ticksUntilCheckin_2 = ticksUntilCheckin(0, workerCheckinScheduleMs, min);
  let interval = setInterval(runWorkerCheckin, min, e);
  interval.unref();
  e.replaceWorkerCheckin({
    timer: interval,
    scheduleMs: workerCheckinScheduleMs,
    pollMs: min,
    armedAtMs,
    taskRegistry,
    knownWorkerIds,
    checkinCount: 0,
    ticksUntilCheckin: ticksUntilCheckin_2,
  });
}
//@ chunk-e6aww6q8.js:4711887-4712003 placement
/**
 * 停止工作代理定期检查的计时器。
 */
function disarmWorkerCheckin(e) {
  let n = e.workerCheckin();
  if (n !== undefined) {
    clearInterval(n.timer);
    e.replaceWorkerCheckin(undefined);
    removeQueuedByFilter(isWorkerCheckinNotification);
  }
}
//@ chunk-e6aww6q8.js:4712003-4713141 placement
/**
 * 协调者模式下的定时 check-in：派出的工作仍在运行时提醒模型查看进度。
 */
function runWorkerCheckin(e) {
  let n = e.workerCheckin();
  if (n === undefined) return;
  try {
    let workerCheckinScheduleMs = getWorkerCheckinScheduleMs();
    if (workerCheckinScheduleMs === undefined) {
      disarmWorkerCheckin(e);
      return;
    }
    if (workerCheckinScheduleMs.join() !== n.scheduleMs.join()) {
      let knownWorkerIds = new Set(n.knownWorkerIds);
      let { taskRegistry, armedAtMs } = n;
      disarmWorkerCheckin(e);
      armWorkerCheckin(e, taskRegistry, knownWorkerIds, armedAtMs);
      return;
    }
    let filtered = Object.values(n.taskRegistry.all()).filter(
      (S) => isRunningVisibleSubagent(S) || isSubagentWaitingOnChildren(S),
    );
    if (filtered.length === 0) {
      disarmWorkerCheckin(e);
      return;
    }
    if (
      peekQueuedCommand(isWorkerCheckinNotification) !== undefined ||
      someInFlightDrainCommand(isWorkerCheckinNotification)
    )
      return;
    n.ticksUntilCheckin -= 1;
    if (n.ticksUntilCheckin > 0) return;
    let now = Date.now();
    let floored = Math.floor((now - n.armedAtMs) / 60000);
    enqueueHookTaskNotification({
      summary: "Worker check-in: dispatched work still running",
      body: `Check-in: it has been ~${floored} minutes since you dispatched work that is still running. Check your dispatched workers. If the task is taking longer than expected, change approach and tell the user how much longer you expect the work to take; if the work is on track, keep going \u2014 no update needed. If no response is needed, ignore this check-in.
${stillRunningSummary(filtered, now)}`,
      origin: WORKER_CHECKIN_ORIGIN,
      turnAttribution: "inherit",
    });
    n.checkinCount += 1;
    n.ticksUntilCheckin = ticksUntilCheckin(n.checkinCount, n.scheduleMs, n.pollMs);
    logFeatureOk("coordinator_worker_checkin");
  } catch (error) {
    logError(error);
    try {
      logFeatureBad("coordinator_worker_checkin", "tick_failed");
    } catch (error) {
      logError(error);
    }
  }
}
export {
  disarmWorkerCheckin,
  trackWorkerForCheckin,
  hasOtherRunningWorker,
  resetCheckinIfOnlyWorker,
  restartCheckin,
};

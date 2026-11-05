/**
 * tasks/LocalAgentTask/workerCheckin.ts
 *
 * 2.1.316 新增：协调者模式下对仍在运行的派出工作定时检查（check-in）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  removeByFilter,
  peek,
  someInFlightDrainCommand,
  WORKER_CHECKIN_ORIGIN,
} from "../../utils/messageQueueManager.js";
import { enqueueHookTaskNotification } from "../../utils/hooks/hookMessages.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-5xgkngpb.js:4820225-4820321 placement
/**
 * 判断通知是否来自 worker-checkin。
 */
function isWorkerCheckinNotification(message) {
  return message.origin?.kind === "task-notification" && message.origin.source === "worker-checkin";
}
//@ chunk-5xgkngpb.js:4820321-4820335 placement
var MAX_CHECKIN_POLL_MS = 60000;
//@ chunk-5xgkngpb.js:4820582-4820656 placement
/**
 * 按调度表与轮询间隔计算还要几轮才检查。
 */
function ticksUntilCheckin(checkinCount, scheduleMs, pollMs) {
  let delayMs = scheduleMs[Math.min(checkinCount, scheduleMs.length - 1)];
  return Math.ceil(delayMs / pollMs);
}
//@ chunk-5xgkngpb.js:4820656-4820755 placement (2.1.88 match: isPanelAgentTask, 0.771)
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
//@ chunk-5xgkngpb.js:4820755-4820794 placement
/**
 * 表示"在等子工作"的保活原因前缀：bash:、agent:、workflow:。
 */
var CHILD_WORK_KEEPALIVE_PREFIXES = ["bash:", "agent:", "workflow:"];
//@ chunk-5xgkngpb.js:4820794-4820939 placement (2.1.88 match: isPanelAgentTask, 0.771)
/**
 * 子代理已停但仍有子工作（保活原因以 bash:/agent:/workflow: 开头）在跑。
 */
function isSubagentWaitingOnChildren(task) {
  return (
    task.type === "local_agent" &&
    !isObserverAgentTask(task) &&
    task.agentType !== "main-session" &&
    isWaitingOnChildren(task) &&
    [...keepaliveReasons(task)].some((reason) =>
      CHILD_WORK_KEEPALIVE_PREFIXES.some((prefix) => reason.startsWith(prefix)),
    )
  );
}
//@ chunk-5xgkngpb.js:4820939-4820964 placement
var MAX_WORKERS_LISTED = 10;
var MAX_WORKER_DESCRIPTION_CHARS = 80;
var MAX_ACTIVITY_CHARS = 60;
//@ chunk-5xgkngpb.js:4820964-4821009 placement
/**
 * 去不可见字符、去掉易混字符、转义并按长度截断。
 */
function escapeAndTruncate(text, maxChars) {
  return escapeXml(truncateWithCount(foldLookalikeChars(stripIgnorables(text)), maxChars));
}
//@ chunk-5xgkngpb.js:4821009-4821069 placement
/**
 * 拼出「约 N 分钟前」。
 */
function minutesAgoText(elapsedMs) {
  return `~${Math.floor(elapsedMs / 60000)} minutes ago`;
}
//@ chunk-5xgkngpb.js:4821069-4821568 placement
/**
 * 生成工作代理的状态行：工具调用次数、最近一次调用及时间、是否在等子代理。
 */
function workerStatusLine(task, nowMs) {
  let parts = [];
  let toolUseCount = task.progress?.toolUseCount ?? 0;
  if (toolUseCount === 0) parts.push("no tool calls yet");
  else {
    parts.push(`${toolUseCount} ${plural(toolUseCount, "tool call")}`);
    let lastActivity = task.progress?.lastActivity;
    let activityText = lastActivity?.activityDescription ?? lastActivity?.toolName;
    if (activityText) {
      let escaped = escapeAndTruncate(activityText, MAX_ACTIVITY_CHARS);
      parts.push(
        lastActivity?.recordedAtMs !== undefined
          ? `last tool call ${minutesAgoText(nowMs - lastActivity.recordedAtMs)}: ${escaped}`
          : `last tool call: ${escaped}`,
      );
    }
  }
  if (task.isIdle) parts.push("waiting on a subagent");
  if (isSubagentWaitingOnChildren(task)) parts.push("agent finished; parked on pending background work");
  return `- ${escapeAndTruncate(task.description, MAX_WORKER_DESCRIPTION_CHARS)} (${parts.join(", ")})`;
}
//@ chunk-5xgkngpb.js:4821568-4821822 placement
function stillRunningSummary(agents, nowMs) {
  let sorted = agents.toSorted((left, right) => left.startTime - right.startTime);
  let filtered = sorted.filter((agent) => !isSubagentWaitingOnChildren(agent));
  let filtered_2 = sorted.filter((agent) => isSubagentWaitingOnChildren(agent));
  let mapped = [...filtered, ...filtered_2]
    .slice(0, MAX_WORKERS_LISTED)
    .map((agent) => workerStatusLine(agent, nowMs));
  let omittedCount = sorted.length - MAX_WORKERS_LISTED;
  if (omittedCount > 0) mapped.push(`- \u2026and ${omittedCount} more`);
  return `Still running:
${mapped.join(`
`)}`;
}
//@ chunk-5xgkngpb.js:4821822-4822091 placement
function trackWorkerForCheckin(task, taskRegistry, sessionScratch, armedAtMs = Date.now()) {
  try {
    if (!isRunningVisibleSubagent(task)) return;
    let checkin = sessionScratch.workerCheckin();
    if (checkin !== undefined) {
      checkin.taskRegistry = taskRegistry;
      if (checkin.knownWorkerIds.has(task.id)) return;
      checkin.knownWorkerIds.add(task.id);
      if (!hasOtherRunningWorker(taskRegistry, task.id))
        restartCheckin(task, taskRegistry, sessionScratch, armedAtMs);
      else resetCheckinIfOnlyWorker(checkin, taskRegistry, task);
      return;
    }
    armWorkerCheckin(sessionScratch, taskRegistry, new Set([task.id]), armedAtMs);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:4822091-4822177 placement
/**
 * 除该 worker 外是否还有运行中或等子工作的 worker。
 */
function hasOtherRunningWorker(taskRegistry, id) {
  return Object.values(taskRegistry.all()).some(
    (task) => (isRunningVisibleSubagent(task) || isSubagentWaitingOnChildren(task)) && task.id !== id,
  );
}
//@ chunk-5xgkngpb.js:4822177-4822339 placement
function resetCheckinIfOnlyWorker(checkin, taskRegistry, task) {
  if (!isRunningVisibleSubagent(task)) return;
  if (
    !Object.values(taskRegistry.all()).some(
      (other) => isRunningVisibleSubagent(other) && other.id !== task.id,
    )
  ) {
    checkin.checkinCount = 0;
    checkin.ticksUntilCheckin = ticksUntilCheckin(0, checkin.scheduleMs, checkin.pollMs);
  }
}
//@ chunk-5xgkngpb.js:4822339-4822470 placement
function restartCheckin(task, taskRegistry, sessionScratch, armedAtMs) {
  let checkin = sessionScratch.workerCheckin();
  if (checkin === undefined) return;
  let knownWorkerIds = new Set(checkin.knownWorkerIds);
  knownWorkerIds.add(task.id);
  disarmWorkerCheckin(sessionScratch);
  armWorkerCheckin(sessionScratch, taskRegistry, knownWorkerIds, armedAtMs);
}
//@ chunk-5xgkngpb.js:4822470-4822731 placement
function armWorkerCheckin(sessionScratch, taskRegistry, knownWorkerIds, armedAtMs) {
  let workerCheckinScheduleMs = getWorkerCheckinScheduleMs();
  if (workerCheckinScheduleMs === undefined) return;
  let min = Math.min(MAX_CHECKIN_POLL_MS, ...workerCheckinScheduleMs);
  let ticksUntilCheckin_2 = ticksUntilCheckin(0, workerCheckinScheduleMs, min);
  let interval = setInterval(runWorkerCheckin, min, sessionScratch);
  interval.unref();
  sessionScratch.replaceWorkerCheckin({
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
//@ chunk-5xgkngpb.js:4822731-4822847 placement
/**
 * 停止工作代理定期检查的计时器。
 */
function disarmWorkerCheckin(sessionScratch) {
  let checkin = sessionScratch.workerCheckin();
  if (checkin !== undefined) {
    clearInterval(checkin.timer);
    sessionScratch.replaceWorkerCheckin(undefined);
    removeByFilter(isWorkerCheckinNotification);
  }
}
//@ chunk-5xgkngpb.js:4822847-4823985 placement
/**
 * 协调者模式下的定时 check-in：派出的工作仍在运行时提醒模型查看进度。
 */
function runWorkerCheckin(sessionScratch) {
  let checkin = sessionScratch.workerCheckin();
  if (checkin === undefined) return;
  try {
    let workerCheckinScheduleMs = getWorkerCheckinScheduleMs();
    if (workerCheckinScheduleMs === undefined) {
      disarmWorkerCheckin(sessionScratch);
      return;
    }
    if (workerCheckinScheduleMs.join() !== checkin.scheduleMs.join()) {
      let knownWorkerIds = new Set(checkin.knownWorkerIds);
      let { taskRegistry, armedAtMs } = checkin;
      disarmWorkerCheckin(sessionScratch);
      armWorkerCheckin(sessionScratch, taskRegistry, knownWorkerIds, armedAtMs);
      return;
    }
    let agents = Object.values(checkin.taskRegistry.all()).filter(
      (task) => isRunningVisibleSubagent(task) || isSubagentWaitingOnChildren(task),
    );
    if (agents.length === 0) {
      disarmWorkerCheckin(sessionScratch);
      return;
    }
    if (
      peek(isWorkerCheckinNotification) !== undefined ||
      someInFlightDrainCommand(isWorkerCheckinNotification)
    )
      return;
    checkin.ticksUntilCheckin -= 1;
    if (checkin.ticksUntilCheckin > 0) return;
    let now = Date.now();
    let floored = Math.floor((now - checkin.armedAtMs) / 60000);
    enqueueHookTaskNotification({
      summary: "Worker check-in: dispatched work still running",
      body: `Check-in: it has been ~${floored} minutes since you dispatched work that is still running. Check your dispatched workers. If the task is taking longer than expected, change approach and tell the user how much longer you expect the work to take; if the work is on track, keep going \u2014 no update needed. If no response is needed, ignore this check-in.
${stillRunningSummary(agents, now)}`,
      origin: WORKER_CHECKIN_ORIGIN,
      turnAttribution: "inherit",
    });
    checkin.checkinCount += 1;
    checkin.ticksUntilCheckin = ticksUntilCheckin(checkin.checkinCount, checkin.scheduleMs, checkin.pollMs);
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
  trackWorkerForCheckin,
  hasOtherRunningWorker,
  resetCheckinIfOnlyWorker,
  restartCheckin,
  disarmWorkerCheckin,
};

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
import { escapeXml_2 as escapeXml, bv } from "../../utils/confusables.js";
import { truncateWithCount, plural } from "../../utils/stringUtils.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { logError } from "../../utils/log.js";
import { getWorkerCheckinScheduleMs } from "../../tools/AgentTool/AgentTool.js";
import { kb, n7n, zKr, tRt } from "../../utils/messageQueueManager.js";
import { enqueueHookTaskNotification } from "../../utils/hooks/hookMessages.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:4709381-4709477 placement
function Npt(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "worker-checkin";
}
//@ chunk-e6aww6q8.js:4709477-4709491 placement
var zvs = 60000;
//@ chunk-e6aww6q8.js:4709738-4709812 placement
function Fpt(e, n, r) {
  let s = n[Math.min(e, n.length - 1)];
  return Math.ceil(s / r);
}
/**
 * 运行中的、可见的子代理任务：local_agent、非观察者、非 main-session、未到终态。
 */
//@ chunk-e6aww6q8.js:4709812-4709911 placement = isPanelAgentTask (0.77)
function isRunningVisibleSubagent(task) {
  return (
    task.type === "local_agent" &&
    !isObserverAgentTask(task) &&
    task.agentType !== "main-session" &&
    !isTerminalTaskStatus(task.status)
  );
}
/**
 * 表示"在等子工作"的保活原因前缀：bash:、agent:、workflow:。
 */
//@ chunk-e6aww6q8.js:4709911-4709950 placement
var CHILD_WORK_KEEPALIVE_PREFIXES = ["bash:", "agent:", "workflow:"];
/**
 * 子代理已停但仍有子工作（保活原因以 bash:/agent:/workflow: 开头）在跑。
 */
//@ chunk-e6aww6q8.js:4709950-4710095 placement = isPanelAgentTask (0.77)
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
var K2n = 10,
  Zvs = 80,
  eEs = 60;
//@ chunk-e6aww6q8.js:4710120-4710165 placement
function V2n(e, n) {
  return escapeXml(truncateWithCount(bv(stripIgnorables(e)), n));
}
//@ chunk-e6aww6q8.js:4710165-4710225 placement
function tEs(e) {
  return `~${Math.floor(e / 60000)} minutes ago`;
}
/**
 * 生成工作代理的状态行：工具调用次数、最近一次调用及时间、是否在等子代理。
 */
//@ chunk-e6aww6q8.js:4710225-4710724 placement
function workerStatusLine(e, n) {
  let r = [],
    s = e.progress?.toolUseCount ?? 0;
  if (s === 0) r.push("no tool calls yet");
  else {
    r.push(`${s} ${plural(s, "tool call")}`);
    let h = e.progress?.lastActivity,
      y = h?.activityDescription ?? h?.toolName;
    if (y) {
      let S = V2n(y, eEs);
      r.push(
        h?.recordedAtMs !== void 0
          ? `last tool call ${tEs(n - h.recordedAtMs)}: ${S}`
          : `last tool call: ${S}`,
      );
    }
  }
  if (e.isIdle) r.push("waiting on a subagent");
  if (isSubagentWaitingOnChildren(e)) r.push("agent finished; parked on pending background work");
  return `- ${V2n(e.description, Zvs)} (${r.join(", ")})`;
}
//@ chunk-e6aww6q8.js:4710724-4710978 placement
function stillRunningSummary(e, n) {
  let toSorted = e.toSorted((w, L) => w.startTime - L.startTime),
    filtered = toSorted.filter((w) => !isSubagentWaitingOnChildren(w)),
    filtered_2 = toSorted.filter((w) => isSubagentWaitingOnChildren(w)),
    mapped = [...filtered, ...filtered_2].slice(0, K2n).map((w) => workerStatusLine(w, n)),
    S = toSorted.length - K2n;
  if (S > 0) mapped.push(`- \u2026and ${S} more`);
  return `Still running:
${mapped.join(`
`)}`;
}
//@ chunk-e6aww6q8.js:4710978-4711247 placement
function trackWorkerForCheckin(e, n, r, s = Date.now()) {
  try {
    if (!isRunningVisibleSubagent(e)) return;
    let workerCheckin = r.workerCheckin();
    if (workerCheckin !== void 0) {
      if (((workerCheckin.taskRegistry = n), workerCheckin.knownWorkerIds.has(e.id))) return;
      if ((workerCheckin.knownWorkerIds.add(e.id), !Hpt(n, e.id))) restartCheckin(e, n, r, s);
      else resetCheckinIfOnlyWorker(workerCheckin, n, e);
      return;
    }
    armWorkerCheckin(r, n, new Set([e.id]), s);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:4711247-4711333 placement
function Hpt(e, n) {
  return Object.values(e.all()).some(
    (r) => (isRunningVisibleSubagent(r) || isSubagentWaitingOnChildren(r)) && r.id !== n,
  );
}
//@ chunk-e6aww6q8.js:4711333-4711495 placement
function resetCheckinIfOnlyWorker(e, n, r) {
  if (!isRunningVisibleSubagent(r)) return;
  if (!Object.values(n.all()).some((h) => isRunningVisibleSubagent(h) && h.id !== r.id))
    ((e.checkinCount = 0), (e.ticksUntilCheckin = Fpt(0, e.scheduleMs, e.pollMs)));
}
//@ chunk-e6aww6q8.js:4711495-4711626 placement
function restartCheckin(e, n, r, s) {
  let workerCheckin = r.workerCheckin();
  if (workerCheckin === void 0) return;
  let y = new Set(workerCheckin.knownWorkerIds);
  (y.add(e.id), disarmWorkerCheckin(r), armWorkerCheckin(r, n, y, s));
}
//@ chunk-e6aww6q8.js:4711626-4711887 placement
function armWorkerCheckin(e, n, r, s) {
  let h = getWorkerCheckinScheduleMs();
  if (h === void 0) return;
  let min = Math.min(zvs, ...h),
    S = Fpt(0, h, min),
    w = setInterval(runWorkerCheckin, min, e);
  (w.unref(),
    e.replaceWorkerCheckin({
      timer: w,
      scheduleMs: h,
      pollMs: min,
      armedAtMs: s,
      taskRegistry: n,
      knownWorkerIds: r,
      checkinCount: 0,
      ticksUntilCheckin: S,
    }));
}
/**
 * 停止工作代理定期检查的计时器。
 */
//@ chunk-e6aww6q8.js:4711887-4712003 placement
function disarmWorkerCheckin(e) {
  let workerCheckin = e.workerCheckin();
  if (workerCheckin !== void 0) (clearInterval(workerCheckin.timer), e.replaceWorkerCheckin(void 0), kb(Npt));
}
/**
 * 协调者模式下的定时 check-in：派出的工作仍在运行时提醒模型查看进度。
 */
//@ chunk-e6aww6q8.js:4712003-4713141 placement
function runWorkerCheckin(e) {
  let workerCheckin = e.workerCheckin();
  if (workerCheckin === void 0) return;
  try {
    let r = getWorkerCheckinScheduleMs();
    if (r === void 0) {
      disarmWorkerCheckin(e);
      return;
    }
    if (r.join() !== workerCheckin.scheduleMs.join()) {
      let S = new Set(workerCheckin.knownWorkerIds),
        { taskRegistry: taskRegistry, armedAtMs: armedAtMs } = workerCheckin;
      (disarmWorkerCheckin(e), armWorkerCheckin(e, taskRegistry, S, armedAtMs));
      return;
    }
    let filtered = Object.values(workerCheckin.taskRegistry.all()).filter(
      (S) => isRunningVisibleSubagent(S) || isSubagentWaitingOnChildren(S),
    );
    if (filtered.length === 0) {
      disarmWorkerCheckin(e);
      return;
    }
    if (n7n(Npt) !== void 0 || zKr(Npt)) return;
    if (((workerCheckin.ticksUntilCheckin -= 1), workerCheckin.ticksUntilCheckin > 0)) return;
    let now = Date.now(),
      floored = Math.floor((now - workerCheckin.armedAtMs) / 60000);
    (enqueueHookTaskNotification({
      summary: "Worker check-in: dispatched work still running",
      body: `Check-in: it has been ~${floored} minutes since you dispatched work that is still running. Check your dispatched workers. If the task is taking longer than expected, change approach and tell the user how much longer you expect the work to take; if the work is on track, keep going \u2014 no update needed. If no response is needed, ignore this check-in.
${stillRunningSummary(filtered, now)}`,
      origin: tRt,
      turnAttribution: "inherit",
    }),
      (workerCheckin.checkinCount += 1),
      (workerCheckin.ticksUntilCheckin = Fpt(
        workerCheckin.checkinCount,
        workerCheckin.scheduleMs,
        workerCheckin.pollMs,
      )),
      logFeatureOk("coordinator_worker_checkin"));
  } catch (error) {
    logError(error);
    try {
      logFeatureBad("coordinator_worker_checkin", "tick_failed");
    } catch (error) {
      logError(error);
    }
  }
}

export { disarmWorkerCheckin, trackWorkerForCheckin, Hpt, resetCheckinIfOnlyWorker, restartCheckin };

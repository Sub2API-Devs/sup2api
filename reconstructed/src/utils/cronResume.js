/**
 * utils/cronResume.ts
 *
 * 2.1.316 新增：恢复会话时复活会话级 cron 与 /loop 唤醒（过期唤醒提示）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (13)
 * attribution: placement 13
 */
import { isKairosCronEnabled } from "../tools/ScheduleCronTool/prompt.js";
import {
  getSessionCronTasks,
  addSessionCronTask,
  setScheduledTasksEnabled,
  getLoopTickInFlightPrompt,
  mainAgentId,
} from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import { getCronJitterConfig } from "./cronJitterConfig.js";
import { p$e, oneShotJitteredNextCronRunMs } from "./cronTasks.js";
import { getBgJobDir } from "./concurrentSessions.js";
import { readPendingWakeup } from "./scheduledWakeup.js";
import { PQe, hasLoopTask, scheduleWakeupAt } from "./loop/loopWakeups.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { enqueuePendingNotification } from "./messageQueueManager.js";
import { formatTaskNotification } from "./xmlTags.js";
import { escapeXml_2 as escapeXml } from "./confusables.js";
import { formatDurationCoarse } from "./format.js";
import { NOTE } from "../constants/xml.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { Pwe } from "../services/api/promptCacheBreakParts.js";
import { lt } from "./forkSourceNote.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";

//@ chunk-0sfjpx19.js:73095-73308 placement
function logResurrectedCrons(e) {
  if (!isKairosCronEnabled()) return;
  let n = new Set(getSessionCronTasks().map((s) => s.id)),
    r = 0;
  for (let s of resurrectSessionCrons(e, Date.now())) {
    if (n.has(s.id)) continue;
    (n.add(s.id), addSessionCronTask(s), r++);
  }
  if (r > 0) (setScheduledTasksEnabled(!0), logForDebugging(`resume: resurrected ${r} session cron task(s)`));
}
/**
 * 恢复会话 cron 任务（插件名不合法的跳过）。
 */
//@ chunk-0sfjpx19.js:73308-74045 placement
function resurrectSessionCrons({ calls: calls, results: results, deletedCronIds: deletedCronIds }, s) {
  let h = getCronJitterConfig(),
    y = [];
  for (let _ of calls) {
    let b = results.get(_.toolUseId);
    if (!b || typeof b.id !== "string") continue;
    if (b.durable === !0) continue;
    if (deletedCronIds.has(b.id)) continue;
    if (b.plugin !== void 0 && !p$e(b.plugin)) {
      logForDebugging("resume: a session cron is left out: its plugin name fails the rule for a stored name");
      continue;
    }
    let cron = _.input.cron,
      prompt = _.input.prompt;
    if (typeof cron !== "string" || typeof prompt !== "string") continue;
    let S = b.recurring !== !1;
    if (S) {
      if (h.recurringMaxAgeMs !== 0 && s - _.createdAt >= h.recurringMaxAgeMs) continue;
    } else {
      let T = oneShotJitteredNextCronRunMs(cron, _.createdAt, b.id, h);
      if (T === null || T < s) continue;
    }
    y.push({
      id: b.id,
      cron: cron,
      prompt: prompt,
      createdAt: _.createdAt,
      recurring: S,
      ...(S && { lastFiredAt: s }),
      ...(typeof b.plugin === "string" && { plugin: b.plugin }),
    });
  }
  return y;
}
/**
 * /loop 唤醒在会话重启前已到期：发通知说明不再触发、如需继续请重新安排。
 */
//@ chunk-0sfjpx19.js:74045-75892 placement
async function handleMissedLoopWakeups({
  wakeupCalls: wakeupCalls,
  wakeupCallsAtLastLoopFire: wakeupCallsAtLastLoopFire,
  results: results,
  notifiedTaskIds: notifiedTaskIds,
}) {
  if (!isKairosCronEnabled()) return;
  let h = getBgJobDir();
  if (h === void 0) return;
  let y = await readPendingWakeup(h);
  if (y === null) return;
  let lastIndex = wakeupCalls.findLastIndex((E) => results.has(E.toolUseId)),
    b = wakeupCalls[lastIndex],
    k = b && results.get(b.toolUseId),
    w = b?.input.prompt,
    S = b?.input.reason,
    now = Date.now();
  if (
    !b ||
    !k ||
    b.toolUseId !== y.toolUseId ||
    k.stopped === !0 ||
    k.scheduledFor !== y.scheduledFor ||
    typeof w !== "string" ||
    !(y.scheduledFor - b.createdAt <= 2 * PQe * 1000)
  )
    return;
  if (y.scheduledFor <= now) {
    if (
      notifiedTaskIds.has(b.toolUseId) ||
      wakeupCallsAtLastLoopFire > lastIndex ||
      hasLoopTask() ||
      getLoopTickInFlightPrompt() !== null
    )
      return;
    let E = now - y.scheduledFor;
    (logFeatureSad("loop_schedule_wakeup", "past_due_on_resume"),
      enqueuePendingNotification({
        value: formatTaskNotification({
          taskId: escapeXml(b.toolUseId),
          toolUseId: escapeXml(b.toolUseId),
          status: "stopped",
          summary: `This session restarted ${E < 60000 ? "less than a minute" : formatDurationCoarse(E)} after its next /loop wakeup was due, so that wakeup will not fire. The loop stays stopped until Claude schedules it again: reply to continue it.`,
          body: `
<${NOTE}>The wakeup scheduled by the ${SCHEDULE_WAKEUP_TOOL_NAME} call this notification names was still pending when this session's process ended, and its fire time passed before a new process took the session over. It will not fire. A ${SCHEDULE_WAKEUP_TOOL_NAME} call made since the new process started is not affected. Otherwise nothing wakes this session for the loop: call ${SCHEDULE_WAKEUP_TOOL_NAME} again only if the loop is still wanted, and when the conversation does not make that clear, ask the user first.</${NOTE}>`,
        }),
        agentId: mainAgentId(),
        mode: "task-notification",
        skipAttachments: !0,
        priority: "next",
        shouldQuery: !1,
      }));
    return;
  }
  if (k.plugin !== void 0 && !p$e(k.plugin)) {
    logForDebugging(
      "resume: a pending wakeup is not armed again: its plugin name fails the rule for a stored name",
    );
    return;
  }
  let recurringMaxAgeMs = getCronJitterConfig().recurringMaxAgeMs;
  scheduleWakeupAt({
    scheduledFor: y.scheduledFor,
    prompt: w,
    reason: typeof S === "string" ? S : void 0,
    chainStartedAt:
      recurringMaxAgeMs > 0 ? Math.max(y.chainStartedAt, b.createdAt - recurringMaxAgeMs) : y.chainStartedAt,
    plugin: typeof k.plugin === "string" ? k.plugin : void 0,
  });
}
//@ chunk-0sfjpx19.js:75892-75944 placement
function Jt(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-0sfjpx19.js:75944-76005 placement
function Zt(e) {
  return e.isWebFetchLaunch ? void 0 : e.outputFile;
}
//@ chunk-0sfjpx19.js:76005-76273 placement
function RELAUNCH_ADVICE(e) {
  return e.isWebFetchLaunch
    ? "Launch it again if its report is still needed."
    : e.canReadOutputFile
      ? "Check its worktree/output for partial work before assuming the task landed."
      : "Do not assume the task landed; launch it again if its result is still needed.";
}
//@ chunk-0sfjpx19.js:76273-76303 placement
var ds = "2.1.285",
  ho = "2.1.300";
//@ chunk-0sfjpx19.js:76303-76398 placement
function cs(e, n) {
  if (!e.startsWith(Pwe)) return [e];
  let sliced = e.slice(Pwe.length);
  return splitByLengths(sliced, n) ?? [sliced];
}
//@ chunk-0sfjpx19.js:76398-76642 placement
function splitByLengths(e, n) {
  if (!Array.isArray(n) || !n.every((h) => Number.isInteger(h) && h >= 0)) return;
  let r = [],
    s = 0;
  for (let [h, y] of n.entries()) {
    let _ = h === 0 ? "" : ms;
    if (!e.startsWith(_, s)) return;
    ((s += _.length), r.push(e.slice(s, s + y)), (s += y));
  }
  return s === e.length ? r : void 0;
}
//@ chunk-0sfjpx19.js:76642-76654 placement
var ms = `

`;
//@ chunk-0sfjpx19.js:76654-76758 placement
function cronOwnership({ isOwn: isOwn, isBare: isBare, isRewritten: isRewritten }) {
  if (isRewritten) return "none";
  if (isOwn) return "own";
  return isBare ? "bare" : "none";
}
//@ chunk-0sfjpx19.js:76758-76878 placement
function isOlderVersion(e, n) {
  let r = "version" in e && typeof e.version === "string" ? lt.coerce(e.version) : null;
  return r !== null && lt.lt(r, n);
}
//@ chunk-0sfjpx19.js:76878-76977 placement
function Z0n(e) {
  return (
    e.type === "assistant" && e.message.model !== SYNTHETIC_MODEL && e.isMeta !== !0 && e.isVirtual !== !0
  );
}

export {
  logResurrectedCrons,
  handleMissedLoopWakeups,
  isOlderVersion,
  ds,
  Jt,
  cs,
  cronOwnership,
  ho,
  Zt,
  RELAUNCH_ADVICE,
  Z0n,
};

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
import { isValidPluginName, oneShotJitteredNextCronRunMs } from "./cronTasks.js";
import { getBgJobDir } from "./concurrentSessions.js";
import { readPendingWakeup } from "./scheduledWakeup.js";
import { MAX_LOOP_AGE_SECONDS, hasLoopTask, scheduleWakeupAt } from "./loop/loopWakeups.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { enqueuePendingNotification } from "./messageQueueManager.js";
import { formatTaskNotification } from "./xmlTags.js";
import { escapeXml_2 as escapeXml } from "./confusables.js";
import { formatDurationCoarse } from "./format.js";
import { NOTE } from "../constants/xml.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { BACKGROUND_TASK_EVENT_NOTICE } from "../services/api/promptCacheBreakParts.js";
import { fsPromises } from "./forkSourceNote.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";

//@ chunk-0sfjpx19.js:73095-73308 placement
function logResurrectedCrons(e) {
  if (!isKairosCronEnabled()) return;
  let n = new Set(getSessionCronTasks().map((s) => s.id));
  let r = 0;
  for (let s of resurrectSessionCrons(e, Date.now())) {
    if (n.has(s.id)) continue;
    n.add(s.id);
    addSessionCronTask(s);
    r++;
  }
  if (r > 0) {
    setScheduledTasksEnabled(true);
    logForDebugging(`resume: resurrected ${r} session cron task(s)`);
  }
}
//@ chunk-0sfjpx19.js:73308-74045 placement
/**
 * 恢复会话 cron 任务（插件名不合法的跳过）。
 */
function resurrectSessionCrons({ calls, results, deletedCronIds }, s) {
  let cronJitterConfig = getCronJitterConfig();
  let y = [];
  for (let _ of calls) {
    let b = results.get(_.toolUseId);
    if (!b || typeof b.id !== "string") continue;
    if (b.durable === true) continue;
    if (deletedCronIds.has(b.id)) continue;
    if (b.plugin !== undefined && !isValidPluginName(b.plugin)) {
      logForDebugging("resume: a session cron is left out: its plugin name fails the rule for a stored name");
      continue;
    }
    let cron = _.input.cron;
    let prompt = _.input.prompt;
    if (typeof cron !== "string" || typeof prompt !== "string") continue;
    let S = b.recurring !== false;
    if (S) {
      if (cronJitterConfig.recurringMaxAgeMs !== 0 && s - _.createdAt >= cronJitterConfig.recurringMaxAgeMs)
        continue;
    } else {
      let T = oneShotJitteredNextCronRunMs(cron, _.createdAt, b.id, cronJitterConfig);
      if (T === null || T < s) continue;
    }
    y.push({
      id: b.id,
      cron,
      prompt,
      createdAt: _.createdAt,
      recurring: S,
      ...(S && {
        lastFiredAt: s,
      }),
      ...(typeof b.plugin === "string" && {
        plugin: b.plugin,
      }),
    });
  }
  return y;
}
//@ chunk-0sfjpx19.js:74045-75892 placement
/**
 * /loop 唤醒在会话重启前已到期：发通知说明不再触发、如需继续请重新安排。
 */
async function handleMissedLoopWakeups({ wakeupCalls, wakeupCallsAtLastLoopFire, results, notifiedTaskIds }) {
  if (!isKairosCronEnabled()) return;
  let bgJobDir = getBgJobDir();
  if (bgJobDir === undefined) return;
  let pendingWakeup = await readPendingWakeup(bgJobDir);
  if (pendingWakeup === null) return;
  let lastIndex = wakeupCalls.findLastIndex((wakeupCall) => results.has(wakeupCall.toolUseId));
  let b = wakeupCalls[lastIndex];
  let k = b && results.get(b.toolUseId);
  let prompt = b?.input.prompt;
  let reason = b?.input.reason;
  let now = Date.now();
  if (
    !b ||
    !k ||
    b.toolUseId !== pendingWakeup.toolUseId ||
    k.stopped === true ||
    k.scheduledFor !== pendingWakeup.scheduledFor ||
    typeof prompt !== "string" ||
    !(pendingWakeup.scheduledFor - b.createdAt <= 2 * MAX_LOOP_AGE_SECONDS * 1000)
  )
    return;
  if (pendingWakeup.scheduledFor <= now) {
    if (
      notifiedTaskIds.has(b.toolUseId) ||
      wakeupCallsAtLastLoopFire > lastIndex ||
      hasLoopTask() ||
      getLoopTickInFlightPrompt() !== null
    )
      return;
    let E = now - pendingWakeup.scheduledFor;
    logFeatureSad("loop_schedule_wakeup", "past_due_on_resume");
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
      skipAttachments: true,
      priority: "next",
      shouldQuery: false,
    });
    return;
  }
  if (k.plugin !== undefined && !isValidPluginName(k.plugin)) {
    logForDebugging(
      "resume: a pending wakeup is not armed again: its plugin name fails the rule for a stored name",
    );
    return;
  }
  let recurringMaxAgeMs = getCronJitterConfig().recurringMaxAgeMs;
  scheduleWakeupAt({
    scheduledFor: pendingWakeup.scheduledFor,
    prompt,
    reason: typeof reason === "string" ? reason : undefined,
    chainStartedAt:
      recurringMaxAgeMs > 0
        ? Math.max(pendingWakeup.chainStartedAt, b.createdAt - recurringMaxAgeMs)
        : pendingWakeup.chainStartedAt,
    plugin: typeof k.plugin === "string" ? k.plugin : undefined,
  });
}
//@ chunk-0sfjpx19.js:75892-75944 placement
/**
 * 判断值是非空对象。
 */
function isPlainObjectRecord(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-0sfjpx19.js:75944-76005 placement
/**
 * 返回非 web-fetch 启动时的输出文件。
 */
function nonWebFetchOutputFile(e) {
  return e.isWebFetchLaunch ? undefined : e.outputFile;
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
/**
 * 判定旧版本的版本号（2.1.285）。
 */
var OLD_VERSION_THRESHOLD = "2.1.285";
var NEW_VERSION_THRESHOLD = "2.1.300";
//@ chunk-0sfjpx19.js:76303-76398 placement
/**
 * 去掉前缀后按长度切分文本，切不出则整段返回。
 */
function splitPrefixedByLengths(e, joinedNoticeLengths) {
  if (!e.startsWith(BACKGROUND_TASK_EVENT_NOTICE)) return [e];
  let sliced = e.slice(BACKGROUND_TASK_EVENT_NOTICE.length);
  return splitByLengths(sliced, joinedNoticeLengths) ?? [sliced];
}
//@ chunk-0sfjpx19.js:76398-76642 placement
function splitByLengths(e, n) {
  if (!Array.isArray(n) || !n.every((h) => Number.isInteger(h) && h >= 0)) return;
  let r = [];
  let s = 0;
  for (let [h, y] of n.entries()) {
    let _ = h === 0 ? "" : DOUBLE_NEWLINE;
    if (!e.startsWith(_, s)) return;
    s += _.length;
    r.push(e.slice(s, s + y));
    s += y;
  }
  return s === e.length ? r : undefined;
}
//@ chunk-0sfjpx19.js:76642-76654 placement
/**
 * 两个换行的常量。
 */
var DOUBLE_NEWLINE = `

`;
//@ chunk-0sfjpx19.js:76654-76758 placement
function cronOwnership({ isOwn, isBare, isRewritten }) {
  if (isRewritten) return "none";
  if (isOwn) return "own";
  return isBare ? "bare" : "none";
}
//@ chunk-0sfjpx19.js:76758-76878 placement
function isOlderVersion(e, n) {
  let r = "version" in e && typeof e.version === "string" ? fsPromises.coerce(e.version) : null;
  return r !== null && fsPromises.lt(r, n);
}
//@ chunk-0sfjpx19.js:76878-76977 placement
/**
 * 判断是否为真实的 assistant 消息（非合成模型、非 meta、非虚拟）。
 */
function isRealAssistantMessage(e) {
  return (
    e.type === "assistant" && e.message.model !== SYNTHETIC_MODEL && e.isMeta !== true && e.isVirtual !== true
  );
}
export {
  logResurrectedCrons,
  handleMissedLoopWakeups,
  isOlderVersion,
  OLD_VERSION_THRESHOLD,
  isPlainObjectRecord,
  splitPrefixedByLengths,
  cronOwnership,
  NEW_VERSION_THRESHOLD,
  nonWebFetchOutputFile,
  RELAUNCH_ADVICE,
  isRealAssistantMessage,
};

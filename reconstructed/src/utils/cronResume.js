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
function logResurrectedCrons(resumedSession) {
  if (!isKairosCronEnabled()) return;
  let knownIds = new Set(getSessionCronTasks().map((task) => task.id));
  let resurrectedCount = 0;
  for (let task of resurrectSessionCrons(resumedSession, Date.now())) {
    if (knownIds.has(task.id)) continue;
    knownIds.add(task.id);
    addSessionCronTask(task);
    resurrectedCount++;
  }
  if (resurrectedCount > 0) {
    setScheduledTasksEnabled(true);
    logForDebugging(`resume: resurrected ${resurrectedCount} session cron task(s)`);
  }
}
//@ chunk-0sfjpx19.js:73308-74045 placement
/**
 * 恢复会话 cron 任务（插件名不合法的跳过）。
 */
function resurrectSessionCrons({ calls, results, deletedCronIds }, nowMs) {
  let cronJitterConfig = getCronJitterConfig();
  let resurrected = [];
  for (let call of calls) {
    let result = results.get(call.toolUseId);
    if (!result || typeof result.id !== "string") continue;
    if (result.durable === true) continue;
    if (deletedCronIds.has(result.id)) continue;
    if (result.plugin !== undefined && !isValidPluginName(result.plugin)) {
      logForDebugging("resume: a session cron is left out: its plugin name fails the rule for a stored name");
      continue;
    }
    let cron = call.input.cron;
    let prompt = call.input.prompt;
    if (typeof cron !== "string" || typeof prompt !== "string") continue;
    let isRecurring = result.recurring !== false;
    if (isRecurring) {
      if (
        cronJitterConfig.recurringMaxAgeMs !== 0 &&
        nowMs - call.createdAt >= cronJitterConfig.recurringMaxAgeMs
      )
        continue;
    } else {
      let nextRunMs = oneShotJitteredNextCronRunMs(cron, call.createdAt, result.id, cronJitterConfig);
      if (nextRunMs === null || nextRunMs < nowMs) continue;
    }
    resurrected.push({
      id: result.id,
      cron,
      prompt,
      createdAt: call.createdAt,
      recurring: isRecurring,
      ...(isRecurring && {
        lastFiredAt: nowMs,
      }),
      ...(typeof result.plugin === "string" && {
        plugin: result.plugin,
      }),
    });
  }
  return resurrected;
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
  let lastWakeupCall = wakeupCalls[lastIndex];
  let lastWakeupResult = lastWakeupCall && results.get(lastWakeupCall.toolUseId);
  let prompt = lastWakeupCall?.input.prompt;
  let reason = lastWakeupCall?.input.reason;
  let now = Date.now();
  if (
    !lastWakeupCall ||
    !lastWakeupResult ||
    lastWakeupCall.toolUseId !== pendingWakeup.toolUseId ||
    lastWakeupResult.stopped === true ||
    lastWakeupResult.scheduledFor !== pendingWakeup.scheduledFor ||
    typeof prompt !== "string" ||
    !(pendingWakeup.scheduledFor - lastWakeupCall.createdAt <= 2 * MAX_LOOP_AGE_SECONDS * 1000)
  )
    return;
  if (pendingWakeup.scheduledFor <= now) {
    if (
      notifiedTaskIds.has(lastWakeupCall.toolUseId) ||
      wakeupCallsAtLastLoopFire > lastIndex ||
      hasLoopTask() ||
      getLoopTickInFlightPrompt() !== null
    )
      return;
    let delayMs = now - pendingWakeup.scheduledFor;
    logFeatureSad("loop_schedule_wakeup", "past_due_on_resume");
    enqueuePendingNotification({
      value: formatTaskNotification({
        taskId: escapeXml(lastWakeupCall.toolUseId),
        toolUseId: escapeXml(lastWakeupCall.toolUseId),
        status: "stopped",
        summary: `This session restarted ${delayMs < 60000 ? "less than a minute" : formatDurationCoarse(delayMs)} after its next /loop wakeup was due, so that wakeup will not fire. The loop stays stopped until Claude schedules it again: reply to continue it.`,
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
  if (lastWakeupResult.plugin !== undefined && !isValidPluginName(lastWakeupResult.plugin)) {
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
        ? Math.max(pendingWakeup.chainStartedAt, lastWakeupCall.createdAt - recurringMaxAgeMs)
        : pendingWakeup.chainStartedAt,
    plugin: typeof lastWakeupResult.plugin === "string" ? lastWakeupResult.plugin : undefined,
  });
}
//@ chunk-0sfjpx19.js:75892-75944 placement
/**
 * 判断值是非空对象。
 */
function isPlainObjectRecord(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-0sfjpx19.js:75944-76005 placement
/**
 * 返回非 web-fetch 启动时的输出文件。
 */
function nonWebFetchOutputFile(call) {
  return call.isWebFetchLaunch ? undefined : call.outputFile;
}
//@ chunk-0sfjpx19.js:76005-76273 placement
function RELAUNCH_ADVICE(entry) {
  return entry.isWebFetchLaunch
    ? "Launch it again if its report is still needed."
    : entry.canReadOutputFile
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
function splitPrefixedByLengths(text, lengths) {
  if (!text.startsWith(BACKGROUND_TASK_EVENT_NOTICE)) return [text];
  let text_2 = text.slice(BACKGROUND_TASK_EVENT_NOTICE.length);
  return splitByLengths(text_2, lengths) ?? [text_2];
}
//@ chunk-0sfjpx19.js:76398-76642 placement
function splitByLengths(text, lengths) {
  if (!Array.isArray(lengths) || !lengths.every((length) => Number.isInteger(length) && length >= 0)) return;
  let pieces = [];
  let offset = 0;
  for (let [pieceIndex, pieceLength] of lengths.entries()) {
    let separator = pieceIndex === 0 ? "" : DOUBLE_NEWLINE;
    if (!text.startsWith(separator, offset)) return;
    offset += separator.length;
    pieces.push(text.slice(offset, offset + pieceLength));
    offset += pieceLength;
  }
  return offset === text.length ? pieces : undefined;
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
function isOlderVersion(entry, targetVersion) {
  let entryVersion =
    "version" in entry && typeof entry.version === "string" ? fsPromises.coerce(entry.version) : null;
  return entryVersion !== null && fsPromises.lt(entryVersion, targetVersion);
}
//@ chunk-0sfjpx19.js:76878-76977 placement
/**
 * 判断是否为真实的 assistant 消息（非合成模型、非 meta、非虚拟）。
 */
function isRealAssistantMessage(message) {
  return (
    message.type === "assistant" &&
    message.message.model !== SYNTHETIC_MODEL &&
    message.isMeta !== true &&
    message.isVirtual !== true
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

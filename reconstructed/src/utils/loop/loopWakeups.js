/**
 * utils/loop/loopWakeups.ts
 *
 * 2.1.316 新增：/loop 动态模式唤醒安排
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b3265t9j.js (17)
 * attribution: placement 17
 */
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  setLoopEnded,
  resetLoopWakeFires,
  getLoopConsecutiveKeepalives,
  getLoopEnded,
  getSessionCronTasks,
  getLoopTickInFlightPrompt,
  setLoopTickInFlightPrompt,
  setLoopConsecutiveKeepalives,
  removeSessionCronTasks,
  deleteLoopChainStartedAt,
  getLoopChainStartedAt,
  setLoopChainStartedAt,
  addSessionCronTask,
  setScheduledTasksEnabled,
  announcePendingLoopWakeup,
  getLastMainThreadRequestAt,
} from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDebugging } from "../debug.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getCronJitterConfig } from "../cronJitterConfig.js";
import { getHookCallerOrScheduler } from "../workloadContext.js";
import { CACHE_LEAD_MIN_INTERVAL_MS } from "../cronTasks.js";
import { CACHE_TTL_1H_MS } from "../../services/api/promptCacheBreakDetection.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b3265t9j.js:609-680 placement
/**
 * 动态循环唤醒的限制常量（最小延迟、最大年龄、宽限、默认唤醒间隔、连续保活次数）。
 */
var LOOP_WAKE_LIMITS; // deferred: loads other modules while loading; runs once its import cycle is complete
var MIN_LOOP_DELAY_S;
var MAX_LOOP_AGE_SECONDS;
var KEEPALIVE_GRACE_MS;
var DEFAULT_KEEPALIVE_WAKE_MS;
var MAX_CONSECUTIVE_KEEPALIVES;
deferInit("chunk-b3265t9j.js:609", () => {
  LOOP_WAKE_LIMITS = require("./LOOP_FILE_DYNAMIC_SENTINEL.lazy.js");
  MIN_LOOP_DELAY_S = 60;
  MAX_LOOP_AGE_SECONDS = 3600;
  KEEPALIVE_GRACE_MS = 600000;
  DEFAULT_KEEPALIVE_WAKE_MS = 1200;
  MAX_CONSECUTIVE_KEEPALIVES = 1;
});
//@ chunk-b3265t9j.js:680-751 placement
function endLoop(reason, extraFields) {
  logEvent("tengu_loop_ended", {
    reason: fromEnum(reason),
    ...extraFields,
  });
  setLoopEnded(true);
  resetLoopWakeFires();
}
//@ chunk-b3265t9j.js:751-867 placement
function loopKeepaliveSetting() {
  let CLAUDE_CODE_LOOP_KEEPALIVE = env.CLAUDE_CODE_LOOP_KEEPALIVE;
  if (CLAUDE_CODE_LOOP_KEEPALIVE !== undefined) return CLAUDE_CODE_LOOP_KEEPALIVE;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_loop_keepalive", true);
}
//@ chunk-b3265t9j.js:867-961 placement
function scheduleLoopWakeup(delaySeconds, prompt, reason, toolUseId, caller) {
  return armLoopWakeup(delaySeconds, prompt, {
    viaKeepalive: false,
    reason,
    toolUseId,
    owner: {
      caller,
    },
  });
}
//@ chunk-b3265t9j.js:961-1189 placement
function scheduleKeepaliveWakeup(prompt, rearmedFor) {
  if (getLoopConsecutiveKeepalives() >= MAX_CONSECUTIVE_KEEPALIVES) {
    logForDebugging(
      "[loop] keepalive budget exhausted (model declined to reschedule twice) \u2014 ending loop",
    );
    endLoop("model_stopped", {
      via_keepalive: true,
    });
    return null;
  }
  return armLoopWakeup(DEFAULT_KEEPALIVE_WAKE_MS, prompt, {
    viaKeepalive: true,
    owner: {
      rearmedFor,
    },
  });
}
//@ chunk-b3265t9j.js:1189-1218 placement
function resetLoopState() {
  setLoopEnded(false);
  resetLoopWakeFires();
}
//@ chunk-b3265t9j.js:1218-1755 placement
function endLoopIfIdle() {
  let loopEnded = getLoopEnded();
  let filtered = getSessionCronTasks().filter((task) => task.kind === "loop");
  let loopTickInFlightPrompt = getLoopTickInFlightPrompt();
  setLoopTickInFlightPrompt(null);
  setLoopConsecutiveKeepalives(0);
  removeSessionCronTasks(filtered.map((task) => task.id));
  if (filtered.length === 0) clearPendingLoopWakeup();
  for (let task of filtered) deleteLoopChainStartedAt(task.prompt);
  if (loopTickInFlightPrompt !== null) deleteLoopChainStartedAt(loopTickInFlightPrompt);
  if (loopEnded) {
    logForDebugging(
      "[loop] ScheduleWakeup({stop:true}) after loop already ended \u2014 cleanup only, terminal event suppressed",
    );
    return filtered.length;
  }
  logForDebugging(
    `[loop] model called ScheduleWakeup({stop:true}) \u2014 ending loop (${filtered.length} pending wakeup(s) cancelled${loopTickInFlightPrompt !== null ? ", tick in flight" : ""})`,
  );
  endLoop("model_stopped", {
    via_keepalive: false,
  });
  logFeatureOk("loop_schedule_wakeup");
  return filtered.length;
}
//@ chunk-b3265t9j.js:1755-3043 placement
/**
 * 为 /loop 动态模式安排下一次唤醒：记录原因、调用者与是否保活，创建会话定时任务。
 */
function armLoopWakeup(delaySeconds, prompt, options) {
  let { viaKeepalive, reason, toolUseId, owner } = options;
  if (!viaKeepalive) setLoopConsecutiveKeepalives(0);
  let supersededCount = removeLoopCronTasks();
  let now = Date.now();
  let loopChainStartedAt = getLoopChainStartedAt(prompt);
  let isChainTooOld =
    loopChainStartedAt !== undefined &&
    now > loopChainStartedAt.lastScheduledFor + MAX_LOOP_AGE_SECONDS * 1000;
  let startedAt = loopChainStartedAt === undefined || isChainTooOld ? now : loopChainStartedAt.startedAt;
  let recurringMaxAgeMs = getCronJitterConfig().recurringMaxAgeMs;
  if (recurringMaxAgeMs > 0 && now - startedAt >= recurringMaxAgeMs) {
    if (!loopChainStartedAt?.agedOut) {
      setLoopChainStartedAt(prompt, {
        startedAt,
        lastScheduledFor: now - (MAX_LOOP_AGE_SECONDS - MIN_LOOP_DELAY_S) * 1000,
        agedOut: true,
      });
      logEvent("tengu_loop_dynamic_wakeup_aged_out", {
        loop_age_ms: now - startedAt,
        max_age_ms: recurringMaxAgeMs,
      });
      endLoop("aged_out", {
        via_keepalive: viaKeepalive,
      });
      logFeatureSad("loop_schedule_wakeup", "loop_wakeup_aged_out");
    }
    return null;
  }
  let { clamped, wasClamped, targetMs, createdAt } = clampDelaySeconds(delaySeconds);
  createLoopWakeTask({
    targetMs,
    createdAt,
    prompt,
    reason,
    chainStartedAt: startedAt,
    viaKeepalive,
    toolUseId,
    owner,
  });
  if (viaKeepalive) {
    setLoopConsecutiveKeepalives(getLoopConsecutiveKeepalives() + 1);
    logForDebugging(`[loop] keepalive armed (model did not reschedule): ${clamped}s fallback`);
    logEvent("tengu_loop_keepalive_fired", {
      clamped_delay_seconds: clamped,
      prompt_is_sentinel: LOOP_WAKE_LIMITS.isLoopDefaultSentinel(prompt),
    });
    logFeatureSad("loop_schedule_wakeup", "model_no_reschedule");
    return {
      scheduledFor: targetMs,
      clampedDelaySeconds: clamped,
      wasClamped,
    };
  }
  logForDebugging(
    `[loop] dynamic wakeup scheduled: ${clamped}s${wasClamped ? ` (clamped from ${delaySeconds}s)` : ""}${reason !== undefined ? ` \u2014 ${reason}` : ""}`,
  );
  logEvent("tengu_loop_dynamic_wakeup_scheduled", {
    chosen_delay_seconds: Number.isFinite(delaySeconds) ? delaySeconds : 0,
    clamped_delay_seconds: clamped,
    was_clamped: wasClamped,
    reason_length: reason?.length ?? 0,
    superseded_count: supersededCount,
  });
  logFeatureOk("loop_schedule_wakeup");
  return {
    scheduledFor: targetMs,
    clampedDelaySeconds: clamped,
    wasClamped,
  };
}
//@ chunk-b3265t9j.js:3043-3385 placement
function scheduleWakeupAt({ scheduledFor, prompt, reason, chainStartedAt, plugin }) {
  let now = Date.now();
  if (scheduledFor <= now || hasLoopTask()) return;
  createLoopWakeTask({
    targetMs: scheduledFor,
    createdAt: Math.max(now, scheduledFor - 60000),
    prompt,
    reason,
    chainStartedAt: Math.min(chainStartedAt, now),
    viaKeepalive: false,
    toolUseId: undefined,
    owner: {
      rearmedFor: plugin,
    },
  });
  logForDebugging(`[loop] re-armed pending wakeup for ${new Date(scheduledFor).toISOString()} after resume`);
}
//@ chunk-b3265t9j.js:3385-3841 placement
function createLoopWakeTask({
  targetMs,
  createdAt,
  prompt,
  reason,
  chainStartedAt,
  viaKeepalive,
  toolUseId,
  owner,
}) {
  let pluginName = "rearmedFor" in owner ? owner.rearmedFor : getHookCallerOrScheduler(owner.caller);
  let date = new Date(targetMs);
  addSessionCronTask({
    id: randomWakeupId(),
    cron: `${date.getMinutes()} ${date.getHours()} * * *`,
    prompt,
    createdAt,
    kind: "loop",
    scheduledFor: targetMs,
    reason,
    ...(viaKeepalive && {
      keepalive: true,
    }),
    ...(pluginName !== undefined && {
      plugin: pluginName,
    }),
  });
  setLoopChainStartedAt(prompt, {
    startedAt: chainStartedAt,
    lastScheduledFor: targetMs,
  });
  setScheduledTasksEnabled(true);
  setLoopEnded(false);
  if (toolUseId !== undefined)
    announcePendingLoopWakeup({
      toolUseId,
      scheduledFor: targetMs,
      chainStartedAt,
    });
}
//@ chunk-b3265t9j.js:3841-4296 placement
function clampDelaySeconds(delaySeconds) {
  let roundedSeconds;
  if (Number.isNaN(delaySeconds)) roundedSeconds = MIN_LOOP_DELAY_S;
  else if (delaySeconds === 1 / 0) roundedSeconds = MAX_LOOP_AGE_SECONDS;
  else if (delaySeconds === -1 / 0) roundedSeconds = MIN_LOOP_DELAY_S;
  else roundedSeconds = Math.round(delaySeconds);
  let max = Math.max(MIN_LOOP_DELAY_S, Math.min(MAX_LOOP_AGE_SECONDS, roundedSeconds));
  let wasClamped = !Number.isFinite(delaySeconds) || roundedSeconds !== max;
  let now = Date.now();
  let rawTargetMs = now + max * 1000;
  let targetMs = roundUpToMinute(rawTargetMs);
  let cacheLeadMs = getCronJitterConfig().cacheLeadMs;
  if (cacheLeadMs > 0 && max * 1000 <= CACHE_LEAD_MIN_INTERVAL_MS) {
    let minLeadMs = CACHE_LEAD_MIN_INTERVAL_MS - cacheLeadMs;
    while (targetMs - now > minLeadMs && targetMs - 60000 >= now + MIN_LOOP_DELAY_S * 1000) targetMs -= 60000;
  }
  if (cacheLeadMs > 0) {
    let lastRequestAt = getLastMainThreadRequestAt() ?? now;
    let cacheExpiryMs =
      (now - lastRequestAt <= KEEPALIVE_GRACE_MS ? Math.min(now, lastRequestAt) : now) +
      CACHE_TTL_1H_MS -
      cacheLeadMs;
    while (targetMs > cacheExpiryMs && targetMs - 60000 >= now + MIN_LOOP_DELAY_S * 1000) targetMs -= 60000;
  }
  let createdAt = rawTargetMs < targetMs ? rawTargetMs : targetMs - 1;
  return {
    clamped: max,
    wasClamped,
    targetMs,
    createdAt,
  };
}
//@ chunk-b3265t9j.js:4296-4342 placement
function roundUpToMinute(timestampMs) {
  return Math.ceil(timestampMs / 60000) * 60000;
}
//@ chunk-b3265t9j.js:4342-4428 placement
function randomWakeupId() {
  return Math.floor(Math.random() * 4294967295)
    .toString(16)
    .padStart(8, "0");
}
//@ chunk-b3265t9j.js:4428-4534 placement
function removeLoopCronTasks() {
  let mapped = getSessionCronTasks()
    .filter((task) => task.kind === "loop")
    .map((task) => task.id);
  if (mapped.length === 0) return 0;
  return removeSessionCronTasks(mapped);
}
//@ chunk-b3265t9j.js:4534-4559 placement
function clearPendingLoopWakeup() {
  announcePendingLoopWakeup(undefined);
}
//@ chunk-b3265t9j.js:4559-4612 placement
function hasLoopTask() {
  return getSessionCronTasks().some((task) => task.kind === "loop");
}
//@ chunk-b3265t9j.js:4612-5009 placement
function syncLoopTickState() {
  let filtered = getSessionCronTasks().filter((task) => task.kind === "loop");
  let loopTickInFlightPrompt = getLoopTickInFlightPrompt();
  setLoopTickInFlightPrompt(null);
  setLoopConsecutiveKeepalives(0);
  if (filtered.length === 0) clearPendingLoopWakeup();
  if (filtered.length === 0 && loopTickInFlightPrompt === null) return 0;
  removeSessionCronTasks(filtered.map((task) => task.id));
  for (let task of filtered) deleteLoopChainStartedAt(task.prompt);
  if (loopTickInFlightPrompt !== null) deleteLoopChainStartedAt(loopTickInFlightPrompt);
  logForDebugging(
    `[loop/dynamic] cancelled ${filtered.length} pending loop wakeup(s) on user abort${loopTickInFlightPrompt !== null ? " (tick in flight)" : ""}`,
  );
  endLoop("user_abort", {
    loops_cancelled: filtered.length,
  });
  logFeatureOk("loop_cancel_all");
  return filtered.length;
}
export {
  MAX_LOOP_AGE_SECONDS,
  hasLoopTask,
  scheduleWakeupAt,
  syncLoopTickState,
  loopKeepaliveSetting,
  scheduleKeepaliveWakeup,
  resetLoopState,
  endLoopIfIdle,
  scheduleLoopWakeup,
};

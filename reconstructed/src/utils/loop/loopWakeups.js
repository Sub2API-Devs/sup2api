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

//@ chunk-b3265t9j.js:609-680 placement
/**
 * 动态循环唤醒的限制常量（最小延迟、最大年龄、宽限、默认唤醒间隔、连续保活次数）。
 */
var LOOP_WAKE_LIMITS = require("./chunk-w6rm7nhv.js");
var MIN_LOOP_DELAY_S = 60;
var MAX_LOOP_AGE_SECONDS = 3600;
var KEEPALIVE_GRACE_MS = 600000;
var DEFAULT_KEEPALIVE_WAKE_MS = 1200;
var MAX_CONSECUTIVE_KEEPALIVES = 1;
//@ chunk-b3265t9j.js:680-751 placement
function endLoop(e, o) {
  logEvent("tengu_loop_ended", {
    reason: fromEnum(e),
    ...o,
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
function scheduleKeepaliveWakeup(loopTickInFlightPrompt, rearmedFor) {
  if (getLoopConsecutiveKeepalives() >= MAX_CONSECUTIVE_KEEPALIVES) {
    logForDebugging(
      "[loop] keepalive budget exhausted (model declined to reschedule twice) \u2014 ending loop",
    );
    endLoop("model_stopped", {
      via_keepalive: true,
    });
    return null;
  }
  return armLoopWakeup(DEFAULT_KEEPALIVE_WAKE_MS, loopTickInFlightPrompt, {
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
  let filtered = getSessionCronTasks().filter((l) => l.kind === "loop");
  let loopTickInFlightPrompt = getLoopTickInFlightPrompt();
  setLoopTickInFlightPrompt(null);
  setLoopConsecutiveKeepalives(0);
  removeSessionCronTasks(filtered.map((l) => l.id));
  if (filtered.length === 0) clearPendingLoopWakeup();
  for (let l of filtered) deleteLoopChainStartedAt(l.prompt);
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
function armLoopWakeup(e, o, n) {
  let { viaKeepalive, reason, toolUseId, owner } = n;
  if (!viaKeepalive) setLoopConsecutiveKeepalives(0);
  let supersededCount = removeLoopCronTasks();
  let now = Date.now();
  let loopChainStartedAt = getLoopChainStartedAt(o);
  let A =
    loopChainStartedAt !== undefined &&
    now > loopChainStartedAt.lastScheduledFor + MAX_LOOP_AGE_SECONDS * 1000;
  let _ = loopChainStartedAt === undefined || A ? now : loopChainStartedAt.startedAt;
  let recurringMaxAgeMs = getCronJitterConfig().recurringMaxAgeMs;
  if (recurringMaxAgeMs > 0 && now - _ >= recurringMaxAgeMs) {
    if (!loopChainStartedAt?.agedOut) {
      setLoopChainStartedAt(o, {
        startedAt: _,
        lastScheduledFor: now - (MAX_LOOP_AGE_SECONDS - MIN_LOOP_DELAY_S) * 1000,
        agedOut: true,
      });
      logEvent("tengu_loop_dynamic_wakeup_aged_out", {
        loop_age_ms: now - _,
        max_age_ms: recurringMaxAgeMs,
      });
      endLoop("aged_out", {
        via_keepalive: viaKeepalive,
      });
      logFeatureSad("loop_schedule_wakeup", "loop_wakeup_aged_out");
    }
    return null;
  }
  let { clamped, wasClamped, targetMs, createdAt } = clampDelaySeconds(e);
  createLoopWakeTask({
    targetMs,
    createdAt,
    prompt: o,
    reason,
    chainStartedAt: _,
    viaKeepalive,
    toolUseId,
    owner,
  });
  if (viaKeepalive) {
    setLoopConsecutiveKeepalives(getLoopConsecutiveKeepalives() + 1);
    logForDebugging(`[loop] keepalive armed (model did not reschedule): ${clamped}s fallback`);
    logEvent("tengu_loop_keepalive_fired", {
      clamped_delay_seconds: clamped,
      prompt_is_sentinel: LOOP_WAKE_LIMITS.isLoopDefaultSentinel(o),
    });
    logFeatureSad("loop_schedule_wakeup", "model_no_reschedule");
    return {
      scheduledFor: targetMs,
      clampedDelaySeconds: clamped,
      wasClamped,
    };
  }
  logForDebugging(
    `[loop] dynamic wakeup scheduled: ${clamped}s${wasClamped ? ` (clamped from ${e}s)` : ""}${reason !== undefined ? ` \u2014 ${reason}` : ""}`,
  );
  logEvent("tengu_loop_dynamic_wakeup_scheduled", {
    chosen_delay_seconds: Number.isFinite(e) ? e : 0,
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
  let m = "rearmedFor" in owner ? owner.rearmedFor : getHookCallerOrScheduler(owner.caller);
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
    ...(m !== undefined && {
      plugin: m,
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
function clampDelaySeconds(e) {
  let o;
  if (Number.isNaN(e)) o = MIN_LOOP_DELAY_S;
  else if (e === 1 / 0) o = MAX_LOOP_AGE_SECONDS;
  else if (e === -1 / 0) o = MIN_LOOP_DELAY_S;
  else o = Math.round(e);
  let max = Math.max(MIN_LOOP_DELAY_S, Math.min(MAX_LOOP_AGE_SECONDS, o));
  let wasClamped = !Number.isFinite(e) || o !== max;
  let now = Date.now();
  let u = now + max * 1000;
  let d = roundUpToMinute(u);
  let cacheLeadMs = getCronJitterConfig().cacheLeadMs;
  if (cacheLeadMs > 0 && max * 1000 <= CACHE_LEAD_MIN_INTERVAL_MS) {
    let s = CACHE_LEAD_MIN_INTERVAL_MS - cacheLeadMs;
    while (d - now > s && d - 60000 >= now + MIN_LOOP_DELAY_S * 1000) d -= 60000;
  }
  if (cacheLeadMs > 0) {
    let s = getLastMainThreadRequestAt() ?? now;
    let _ = (now - s <= KEEPALIVE_GRACE_MS ? Math.min(now, s) : now) + CACHE_TTL_1H_MS - cacheLeadMs;
    while (d > _ && d - 60000 >= now + MIN_LOOP_DELAY_S * 1000) d -= 60000;
  }
  let createdAt = u < d ? u : d - 1;
  return {
    clamped: max,
    wasClamped,
    targetMs: d,
    createdAt,
  };
}
//@ chunk-b3265t9j.js:4296-4342 placement
function roundUpToMinute(e) {
  return Math.ceil(e / 60000) * 60000;
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
    .filter((o) => o.kind === "loop")
    .map((o) => o.id);
  if (mapped.length === 0) return 0;
  return removeSessionCronTasks(mapped);
}
//@ chunk-b3265t9j.js:4534-4559 placement
function clearPendingLoopWakeup() {
  announcePendingLoopWakeup(undefined);
}
//@ chunk-b3265t9j.js:4559-4612 placement
function hasLoopTask() {
  return getSessionCronTasks().some((e) => e.kind === "loop");
}
//@ chunk-b3265t9j.js:4612-5009 placement
function syncLoopTickState() {
  let filtered = getSessionCronTasks().filter((n) => n.kind === "loop");
  let loopTickInFlightPrompt = getLoopTickInFlightPrompt();
  setLoopTickInFlightPrompt(null);
  setLoopConsecutiveKeepalives(0);
  if (filtered.length === 0) clearPendingLoopWakeup();
  if (filtered.length === 0 && loopTickInFlightPrompt === null) return 0;
  removeSessionCronTasks(filtered.map((n) => n.id));
  for (let n of filtered) deleteLoopChainStartedAt(n.prompt);
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

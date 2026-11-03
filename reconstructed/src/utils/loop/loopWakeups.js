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
import { oR } from "../../services/api/promptCacheBreakDetection.js";

//@ chunk-b3265t9j.js:609-680 placement
var LOOP_WAKE_LIMITS = require("./chunk-w6rm7nhv.js"),
  k = 60,
  PQe = 3600,
  P = 600000,
  O = 1200,
  x = 1;
//@ chunk-b3265t9j.js:680-751 placement
function b(e, o) {
  (logEvent("tengu_loop_ended", { reason: fromEnum(e), ...o }), setLoopEnded(!0), resetLoopWakeFires());
}
//@ chunk-b3265t9j.js:751-867 placement
function loopKeepaliveSetting() {
  let CLAUDE_CODE_LOOP_KEEPALIVE = env.CLAUDE_CODE_LOOP_KEEPALIVE;
  if (CLAUDE_CODE_LOOP_KEEPALIVE !== void 0) return CLAUDE_CODE_LOOP_KEEPALIVE;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_loop_keepalive", !0);
}
//@ chunk-b3265t9j.js:867-961 placement
function scheduleLoopWakeup(e, o, n, l, r) {
  return armLoopWakeup(e, o, { viaKeepalive: !1, reason: n, toolUseId: l, owner: { caller: r } });
}
//@ chunk-b3265t9j.js:961-1189 placement
function scheduleKeepaliveWakeup(e, o) {
  if (getLoopConsecutiveKeepalives() >= x)
    return (
      logForDebugging(
        "[loop] keepalive budget exhausted (model declined to reschedule twice) \u2014 ending loop",
      ),
      b("model_stopped", { via_keepalive: !0 }),
      null
    );
  return armLoopWakeup(O, e, { viaKeepalive: !0, owner: { rearmedFor: o } });
}
//@ chunk-b3265t9j.js:1189-1218 placement
function resetLoopState() {
  (setLoopEnded(!1), resetLoopWakeFires());
}
//@ chunk-b3265t9j.js:1218-1755 placement
function endLoopIfIdle() {
  let e = getLoopEnded(),
    filtered = getSessionCronTasks().filter((l) => l.kind === "loop"),
    n = getLoopTickInFlightPrompt();
  if (
    (setLoopTickInFlightPrompt(null),
    setLoopConsecutiveKeepalives(0),
    removeSessionCronTasks(filtered.map((l) => l.id)),
    filtered.length === 0)
  )
    F();
  for (let l of filtered) deleteLoopChainStartedAt(l.prompt);
  if (n !== null) deleteLoopChainStartedAt(n);
  if (e)
    return (
      logForDebugging(
        "[loop] ScheduleWakeup({stop:true}) after loop already ended \u2014 cleanup only, terminal event suppressed",
      ),
      filtered.length
    );
  return (
    logForDebugging(
      `[loop] model called ScheduleWakeup({stop:true}) \u2014 ending loop (${filtered.length} pending wakeup(s) cancelled${n !== null ? ", tick in flight" : ""})`,
    ),
    b("model_stopped", { via_keepalive: !1 }),
    logFeatureOk("loop_schedule_wakeup"),
    filtered.length
  );
}
/**
 * 为 /loop 动态模式安排下一次唤醒：记录原因、调用者与是否保活，创建会话定时任务。
 */
//@ chunk-b3265t9j.js:1755-3043 placement
function armLoopWakeup(e, o, n) {
  let { viaKeepalive: viaKeepalive, reason: reason, toolUseId: toolUseId, owner: owner } = n;
  if (!viaKeepalive) setLoopConsecutiveKeepalives(0);
  let p = removeLoopCronTasks(),
    now = Date.now(),
    s = getLoopChainStartedAt(o),
    A = s !== void 0 && now > s.lastScheduledFor + PQe * 1000,
    _ = s === void 0 || A ? now : s.startedAt,
    recurringMaxAgeMs = getCronJitterConfig().recurringMaxAgeMs;
  if (recurringMaxAgeMs > 0 && now - _ >= recurringMaxAgeMs) {
    if (!s?.agedOut)
      (setLoopChainStartedAt(o, { startedAt: _, lastScheduledFor: now - (PQe - k) * 1000, agedOut: !0 }),
        logEvent("tengu_loop_dynamic_wakeup_aged_out", {
          loop_age_ms: now - _,
          max_age_ms: recurringMaxAgeMs,
        }),
        b("aged_out", { via_keepalive: viaKeepalive }),
        logFeatureSad("loop_schedule_wakeup", "loop_wakeup_aged_out"));
    return null;
  }
  let {
    clamped: clamped,
    wasClamped: wasClamped,
    targetMs: targetMs,
    createdAt: createdAt,
  } = clampDelaySeconds(e);
  if (
    (createLoopWakeTask({
      targetMs: targetMs,
      createdAt: createdAt,
      prompt: o,
      reason: reason,
      chainStartedAt: _,
      viaKeepalive: viaKeepalive,
      toolUseId: toolUseId,
      owner: owner,
    }),
    viaKeepalive)
  )
    return (
      setLoopConsecutiveKeepalives(getLoopConsecutiveKeepalives() + 1),
      logForDebugging(`[loop] keepalive armed (model did not reschedule): ${clamped}s fallback`),
      logEvent("tengu_loop_keepalive_fired", {
        clamped_delay_seconds: clamped,
        prompt_is_sentinel: LOOP_WAKE_LIMITS.isLoopDefaultSentinel(o),
      }),
      logFeatureSad("loop_schedule_wakeup", "model_no_reschedule"),
      { scheduledFor: targetMs, clampedDelaySeconds: clamped, wasClamped: wasClamped }
    );
  return (
    logForDebugging(
      `[loop] dynamic wakeup scheduled: ${clamped}s${wasClamped ? ` (clamped from ${e}s)` : ""}${reason !== void 0 ? ` \u2014 ${reason}` : ""}`,
    ),
    logEvent("tengu_loop_dynamic_wakeup_scheduled", {
      chosen_delay_seconds: Number.isFinite(e) ? e : 0,
      clamped_delay_seconds: clamped,
      was_clamped: wasClamped,
      reason_length: reason?.length ?? 0,
      superseded_count: p,
    }),
    logFeatureOk("loop_schedule_wakeup"),
    { scheduledFor: targetMs, clampedDelaySeconds: clamped, wasClamped: wasClamped }
  );
}
//@ chunk-b3265t9j.js:3043-3385 placement
function scheduleWakeupAt({
  scheduledFor: scheduledFor,
  prompt: prompt,
  reason: reason,
  chainStartedAt: chainStartedAt,
  plugin: plugin,
}) {
  let now = Date.now();
  if (scheduledFor <= now || hasLoopTask()) return;
  (createLoopWakeTask({
    targetMs: scheduledFor,
    createdAt: Math.max(now, scheduledFor - 60000),
    prompt: prompt,
    reason: reason,
    chainStartedAt: Math.min(chainStartedAt, now),
    viaKeepalive: !1,
    toolUseId: void 0,
    owner: { rearmedFor: plugin },
  }),
    logForDebugging(
      `[loop] re-armed pending wakeup for ${new Date(scheduledFor).toISOString()} after resume`,
    ));
}
//@ chunk-b3265t9j.js:3385-3841 placement
function createLoopWakeTask({
  targetMs: targetMs,
  createdAt: createdAt,
  prompt: prompt,
  reason: reason,
  chainStartedAt: chainStartedAt,
  viaKeepalive: viaKeepalive,
  toolUseId: toolUseId,
  owner: owner,
}) {
  let m = "rearmedFor" in owner ? owner.rearmedFor : getHookCallerOrScheduler(owner.caller),
    date = new Date(targetMs);
  if (
    (addSessionCronTask({
      id: I(),
      cron: `${date.getMinutes()} ${date.getHours()} * * *`,
      prompt: prompt,
      createdAt: createdAt,
      kind: "loop",
      scheduledFor: targetMs,
      reason: reason,
      ...(viaKeepalive && { keepalive: !0 }),
      ...(m !== void 0 && { plugin: m }),
    }),
    setLoopChainStartedAt(prompt, { startedAt: chainStartedAt, lastScheduledFor: targetMs }),
    setScheduledTasksEnabled(!0),
    setLoopEnded(!1),
    toolUseId !== void 0)
  )
    announcePendingLoopWakeup({
      toolUseId: toolUseId,
      scheduledFor: targetMs,
      chainStartedAt: chainStartedAt,
    });
}
//@ chunk-b3265t9j.js:3841-4296 placement
function clampDelaySeconds(e) {
  let o;
  if (Number.isNaN(e)) o = k;
  else if (e === 1 / 0) o = PQe;
  else if (e === -1 / 0) o = k;
  else o = Math.round(e);
  let max = Math.max(k, Math.min(PQe, o)),
    l = !Number.isFinite(e) || o !== max,
    now = Date.now(),
    u = now + max * 1000,
    d = y(u),
    cacheLeadMs = getCronJitterConfig().cacheLeadMs;
  if (cacheLeadMs > 0 && max * 1000 <= CACHE_LEAD_MIN_INTERVAL_MS) {
    let s = CACHE_LEAD_MIN_INTERVAL_MS - cacheLeadMs;
    while (d - now > s && d - 60000 >= now + k * 1000) d -= 60000;
  }
  if (cacheLeadMs > 0) {
    let s = getLastMainThreadRequestAt() ?? now,
      _ = (now - s <= P ? Math.min(now, s) : now) + oR - cacheLeadMs;
    while (d > _ && d - 60000 >= now + k * 1000) d -= 60000;
  }
  let m = u < d ? u : d - 1;
  return { clamped: max, wasClamped: l, targetMs: d, createdAt: m };
}
//@ chunk-b3265t9j.js:4296-4342 placement
function y(e) {
  return Math.ceil(e / 60000) * 60000;
}
//@ chunk-b3265t9j.js:4342-4428 placement
function I() {
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
function F() {
  announcePendingLoopWakeup(void 0);
}
//@ chunk-b3265t9j.js:4559-4612 placement
function hasLoopTask() {
  return getSessionCronTasks().some((e) => e.kind === "loop");
}
//@ chunk-b3265t9j.js:4612-5009 placement
function syncLoopTickState() {
  let filtered = getSessionCronTasks().filter((n) => n.kind === "loop"),
    o = getLoopTickInFlightPrompt();
  if ((setLoopTickInFlightPrompt(null), setLoopConsecutiveKeepalives(0), filtered.length === 0)) F();
  if (filtered.length === 0 && o === null) return 0;
  removeSessionCronTasks(filtered.map((n) => n.id));
  for (let n of filtered) deleteLoopChainStartedAt(n.prompt);
  if (o !== null) deleteLoopChainStartedAt(o);
  return (
    logForDebugging(
      `[loop/dynamic] cancelled ${filtered.length} pending loop wakeup(s) on user abort${o !== null ? " (tick in flight)" : ""}`,
    ),
    b("user_abort", { loops_cancelled: filtered.length }),
    logFeatureOk("loop_cancel_all"),
    filtered.length
  );
}

export {
  PQe,
  hasLoopTask,
  scheduleWakeupAt,
  syncLoopTickState,
  loopKeepaliveSetting,
  scheduleKeepaliveWakeup,
  resetLoopState,
  endLoopIfIdle,
  scheduleLoopWakeup,
};

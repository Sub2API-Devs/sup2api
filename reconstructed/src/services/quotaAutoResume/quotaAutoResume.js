/**
 * services/quotaAutoResume/quotaAutoResume.ts
 *
 * 2.1.316 新增：额度用尽后自动继续：额度重置时自动提交续写提示，可由对话框或自动装配、取消。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3y22eg7d.js (79)
 * attribution: placement 79
 */
import { randomUUID } from "crypto";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, mainAgentId, onSessionSwitch } from "../../bootstrap/state.js";
import { Y8n, isAutoResumableLimit, rWt } from "../api/errors.js";
import { QKn, zjs, g0r, ZKn, dln, pze, cln } from "../autoContinueAtUsageLimit.js";
import {
  rawSettingsKeyPresence,
  getSecuritySensitiveSettingWithSources,
} from "../../utils/settings/settings.js";
import { logError } from "../../utils/log.js";
import { isClaudeAISubscriber, getOauthAccountInfo } from "../../utils/auth.js";
import {
  getCurrentLimits,
  emitStatusChange,
  probeQuotaStatus,
  onQuotaRejected as onQuotaRejected_2,
} from "../claudeAiLimits.js";
import {
  oO,
  zKr,
  isPromptModeQueuedCommand,
  jse,
  kb,
  enqueueCommand,
} from "../../utils/messageQueueManager.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { planModeConstituentFamily } from "../../utils/model/planModeModel.js";
import {
  getUserSpecifiedModelSetting,
  isNonCustomOpusModel,
  isNonCustomSonnetModel,
} from "../../utils/model/smallFastModel.js";
import { servedTextForModel } from "../rateLimitMessages.js";
import { bhn } from "../usageLimitGrace.js";
import { sanitizeAttributeValue } from "../../utils/sanitization.js";
import { cX } from "../../utils/handlePromptSubmit.js";
import { wei } from "../../utils/ultraplan/keyword.js";
import { WORKLOAD_CRON } from "../../utils/workloadContext.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getPublicModelDisplayName, parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { overageIncludedModels } from "../api/usage.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";

//@ chunk-3y22eg7d.js:928-1319 placement
var LATER = "later",
  USAGE_RESET_PROMPT =
    "Your claude.ai usage limit has reset. Continue the task you were working on when the limit was reached; do not repeat work that is already complete.",
  TENGU_LANTERN_WICK_RESUME_BY_MODEL = "tengu_lantern_wick_resume_by_model",
  E =
    "Your claude.ai usage is available again before the usage-limit reset. Continue the task you were working on when the limit was reached; do not repeat work that is already complete.";
//@ chunk-3y22eg7d.js:1319-1385 placement
function isAutoContinuationPrompt(e) {
  return e === USAGE_RESET_PROMPT || e === E || (p0r() && e.trim() === autoResumePrompt().trim());
}
//@ chunk-3y22eg7d.js:1385-1449 placement
var N = 3,
  P = [60000, 300000],
  J = 30000,
  Z = 90000,
  ee = 1800000,
  te = 21600000;
//@ chunk-3y22eg7d.js:1449-2227 placement
function createQuotaAutoResumeState() {
  return {
    state: { phase: "idle" },
    consecutiveRearms: 0,
    continuationsSinceHumanPrompt: 0,
    armedAtMs: 0,
    lastArmedResetsAtSeconds: 0,
    lastObservedMs: null,
    takeoverUuids: new Set(),
    queuedBeforeArmUuids: new Set(),
    handoffInProgress: !1,
    dispatchingTakeoverUuids: new Set(),
    pendingContinuationUuid: null,
    activeTurnClaim: null,
    episodeArmOrigin: "dialog",
    sleptThroughReset: !1,
    confirmingMainModel: !1,
    recheckRequestedWhileConfirming: !1,
    armedResetKeys: new Set(),
    autoArmDedupeResetKeys: new Set(),
    changed: createSignal(),
    events: createSignal(),
    autoContinueKeyPresence: "unscanned",
    storageV5: void 0,
    unsubscribeSettingsChanges: null,
    unknowableRescanDelayMs: 2000,
    unknowableRescanTimer: void 0,
    revocationRescan: "idle",
    revocationRescanGeneration: 0,
    limitsSubscriptionStarted: !1,
    unsubscribeQuotaRejected: null,
    unsubscribeSessionSwitch: null,
  };
}
//@ chunk-3y22eg7d.js:2227-2244 placement
var ne = new HostScoped(createQuotaAutoResumeState);
//@ chunk-3y22eg7d.js:2244-2339 placement
function i() {
  let host = getRootSession().host,
    of = ne.of(host),
    of_2 = Y8n.of(host);
  if (!of_2.provided) of_2.provide(() => isEpisodeActive(of));
  return of;
}
//@ chunk-3y22eg7d.js:2339-2511 placement
function clampMs(e, t, o = 0) {
  if (typeof e !== "number" && typeof e !== "string") return t;
  let n = Number(e);
  if (!Number.isFinite(n) || n < 0) return t;
  return Math.min(Math.max(Math.round(n), o), te);
}
//@ chunk-3y22eg7d.js:2511-2524 placement
var ae = 60000;
//@ chunk-3y22eg7d.js:2524-2553 placement
function isAutoContinueEnabled() {
  return M(i());
}
//@ chunk-3y22eg7d.js:2553-2605 placement
function M(e) {
  return QKn(e.autoContinueKeyPresence);
}
/**
 * 会话重置时取消自动继续（auto_restore_cancel 除外）。
 */
//@ chunk-3y22eg7d.js:2605-2709 placement
function cancelOnConversationReset(e) {
  let t = i();
  if (e === "auto_restore_cancel") return;
  if (!isEpisodeActive(t)) return;
  cancelAutoResume(t, "conversation_reset");
}
//@ chunk-3y22eg7d.js:2709-2718 placement
var se = 2;
/**
 * 读取 autoContinueAtUsageLimit 的设置存在性，不可知时定时重试。
 */
//@ chunk-3y22eg7d.js:2718-3182 placement
async function rescanAutoContinueSetting(e, t = se) {
  try {
    e.autoContinueKeyPresence = await rawSettingsKeyPresence("autoContinueAtUsageLimit", e.storageV5);
  } catch (error) {
    ((e.autoContinueKeyPresence = "unknowable"), logError(error));
  }
  if (e.autoContinueKeyPresence !== "unknowable")
    ((e.revocationRescan = "idle"), e.revocationRescanGeneration++);
  if ((clearTimeout(e.unknowableRescanTimer), e.autoContinueKeyPresence === "unknowable" && t > 0))
    ((e.unknowableRescanTimer = setTimeout(
      (o, n) => {
        rescanAutoContinueSetting(o, n);
      },
      e.unknowableRescanDelayMs,
      e,
      t - 1,
    )),
      e.unknowableRescanTimer.unref?.());
}
/**
 * autoContinueAtUsageLimit 仅来自用户设置（或未设置）。
 */
//@ chunk-3y22eg7d.js:3182-3283 placement
function isAutoContinueUserSetting() {
  let e = getSecuritySensitiveSettingWithSources("autoContinueAtUsageLimit")[0]?.source;
  return e === void 0 || e === "userSettings";
}
//@ chunk-3y22eg7d.js:3283-3360 placement
function Fyt(e) {
  return (
    isClaudeAISubscriber() &&
    getOauthAccountInfo()?.billingType !== "usage_based" &&
    isAutoResumableLimit(e) &&
    zjs()
  );
}
//@ chunk-3y22eg7d.js:3360-3392 placement
function quotaAutoResumeState() {
  return i().state;
}
//@ chunk-3y22eg7d.js:3392-3477 placement
function Fjs() {
  let e = i();
  return e.state.phase === "armed" && e.episodeArmOrigin === "auto";
}
//@ chunk-3y22eg7d.js:3477-3581 placement
function noteRejectedResetKey(e) {
  let t = getCurrentLimits();
  if (t.status === "rejected" && t.resetsAt !== void 0) e.armedResetKeys.add(t.resetsAt);
}
//@ chunk-3y22eg7d.js:3581-3630 placement
function T7e(e) {
  return i().armedResetKeys.has(e);
}
//@ chunk-3y22eg7d.js:3630-3677 placement
function isQuotaAutoResumeArmed() {
  return i().state.phase === "armed";
}
//@ chunk-3y22eg7d.js:3677-3850 placement
function isEpisodeActive(e) {
  return (
    e.state.phase === "armed" ||
    e.state.phase === "stale" ||
    e.activeTurnClaim !== null ||
    e.dispatchingTakeoverUuids.size > 0 ||
    oO().some((t) => isEpisodeCommand(e, t)) ||
    zKr((t) => isEpisodeCommand(e, t))
  );
}
//@ chunk-3y22eg7d.js:3850-3887 placement
function ue(e) {
  return isPromptModeQueuedCommand(e) && jse(e);
}
//@ chunk-3y22eg7d.js:3887-3993 placement
function isEpisodeCommand(e, t) {
  return t.uuid !== void 0 && (t.uuid === e.pendingContinuationUuid || e.takeoverUuids.has(t.uuid));
}
//@ chunk-3y22eg7d.js:3993-4022 placement
function p0r() {
  return isEpisodeActive(i());
}
//@ chunk-3y22eg7d.js:4022-4054 placement
function A7e(e) {
  return Q(i(), e);
}
//@ chunk-3y22eg7d.js:4054-4108 placement
function Q(e, t) {
  return t === "armed" || t === "stale" || x(e);
}
//@ chunk-3y22eg7d.js:4108-4137 placement
function yUt() {
  return x(i());
}
//@ chunk-3y22eg7d.js:4137-4227 placement
function x(e) {
  let pendingContinuationUuid = e.pendingContinuationUuid;
  return pendingContinuationUuid !== null && oO().some((o) => o.uuid === pendingContinuationUuid);
}
//@ chunk-3y22eg7d.js:4227-4294 placement
function m0r(e) {
  return e !== void 0 && e === i().pendingContinuationUuid;
}
//@ chunk-3y22eg7d.js:4294-4341 placement
function _Ut(e) {
  return i().events.subscribe(e);
}
//@ chunk-3y22eg7d.js:4341-4389 placement
function qIo(e) {
  return i().changed.subscribe(e);
}
//@ chunk-3y22eg7d.js:4389-4432 placement
function _(e, t) {
  ((e.state = t), e.changed.emit());
}
//@ chunk-3y22eg7d.js:4432-4553 placement
function jitterMs() {
  let e = g0r(),
    t = clampMs(e.jitterMinMs, J),
    max = Math.max(t, clampMs(e.jitterMaxMs, Z));
  return Math.round(t + Math.random() * (max - t));
}
//@ chunk-3y22eg7d.js:4553-4658 placement
function computeFireAtMs(e, t, o) {
  let n = e * 1000 + jitterMs();
  if (t === null) return n;
  let s = P[t] ?? P.at(-1) ?? 0;
  return Math.max(n, o + s);
}
//@ chunk-3y22eg7d.js:4658-4722 placement
function armQuotaAutoResumeFromDialog(e, t = Date.now(), o = "dialog", n) {
  return armAutoResume(i(), e, t, o, n);
}
/**
 * 装配自动继续（记录排队前的命令、上报事件）。
 */
//@ chunk-3y22eg7d.js:4722-5186 placement
function armAutoResume(e, t, o, n, s) {
  if (!Fyt(t)) return !1;
  if ((startQuotaSubscriptions(e, s), (e.consecutiveRearms = 0), n === "dialog"))
    e.continuationsSinceHumanPrompt = 0;
  (e.takeoverUuids.clear(), e.dispatchingTakeoverUuids.clear(), e.queuedBeforeArmUuids.clear());
  for (let u of oO())
    if (ue(u) || (u.mode === "bash" && jse(u)))
      ((u.uuid ??= randomUUID()), e.queuedBeforeArmUuids.add(u.uuid));
  return (
    (e.armedAtMs = o),
    logFeatureOk("quota_auto_resume"),
    logEvent("tengu_quota_auto_resume_offer_armed", { origin: fromEnum(n) }),
    setArmedState(e, t.resetsAt ?? 0, null, o, n),
    e.events.emit("armed"),
    !0
  );
}
//@ chunk-3y22eg7d.js:5186-5597 placement
function autoArmQuotaAutoResume(e, t = Date.now(), o) {
  let n = i();
  if (!Fyt(e)) return !1;
  if (n.handoffInProgress) return !1;
  if (!M(n) || !ZKn()) return !1;
  if (isUnattendedInteractiveSession()) return !1;
  let s = e.resetsAt ?? 0;
  if (s * 1000 - t > rWt) return !1;
  if (isOtherModelWeeklyLimit(e.rateLimitType, getMainLoopModel())) return !1;
  if (isEpisodeActive(n) || n.autoArmDedupeResetKeys.has(s)) return !1;
  if (n.continuationsSinceHumanPrompt >= N) return (G(n, s, "continuation_cap"), !1);
  if (!armAutoResume(n, e, t, "auto", o)) return !1;
  return (n.events.emit("auto-armed"), !0);
}
/**
 * 回合完成时若触及额度上限则更新或自动装配。
 */
//@ chunk-3y22eg7d.js:5597-5843 placement
function handleTurnCompletedAtLimit(e, t, o = Date.now(), n) {
  try {
    let s = e && t === "completed" ? emitStatusChange(o) : null;
    if (s === null) return !1;
    let u = i();
    if (isEpisodeActive(u))
      return (
        onQuotaRejected(u, s, "main_thread"),
        u.state.phase === "armed" && u.state.resetsAtSeconds === s.resetsAt
      );
    return autoArmQuotaAutoResume(s, o, n);
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 进入 armed 状态并记录重置时刻与触发时间。
 */
//@ chunk-3y22eg7d.js:5843-6264 placement
function setArmedState(e, t, o, n, s = "dialog") {
  (clearPendingContinuation(e),
    (e.episodeArmOrigin = s),
    (e.lastArmedResetsAtSeconds = t),
    e.autoArmDedupeResetKeys.add(t),
    e.armedResetKeys.add(t),
    noteRejectedResetKey(e),
    (e.activeTurnClaim = null),
    (e.sleptThroughReset = !1),
    (e.lastObservedMs = n));
  let u = computeFireAtMs(t, o, n);
  (logEvent("tengu_quota_auto_resume_armed", {
    resets_in_sec: Math.max(0, Math.round(t - n / 1000)),
    rearm: o === null ? 0 : o + 1,
  }),
    _(e, { phase: "armed", resetsAtSeconds: t, fireAtMs: u, consecutiveRearms: e.consecutiveRearms }));
}
//@ chunk-3y22eg7d.js:6264-6287 placement
function C7e() {
  confirmAndFire(i());
}
//@ chunk-3y22eg7d.js:6287-6358 placement
function due(e) {
  return (...t) => {
    let o = e(...t);
    if (o !== !1) C7e();
    return o;
  };
}
/**
 * 触发前再查一次主模型额度，确认可用才提交续写。
 */
//@ chunk-3y22eg7d.js:6358-6837 placement
async function confirmAndFire(e) {
  if (e.state.phase !== "armed") return;
  if (e.confirmingMainModel) {
    e.recheckRequestedWhileConfirming = !0;
    return;
  }
  e.confirmingMainModel = !0;
  try {
    for (;;) {
      if (
        ((e.recheckRequestedWhileConfirming = !1),
        planModeConstituentFamily(getUserSpecifiedModelSetting()) !== null)
      )
        return;
      let t = getMainLoopModel(),
        state = e.state,
        n = await probeQuotaStatus(t, void 0, e.storageV5);
      if (e.state.phase !== "armed" || h(e)) return;
      if (e.recheckRequestedWhileConfirming || getMainLoopModel() !== t || e.state !== state) continue;
      if (n === null || !_e(n)) return;
      fireAutoResume(e);
      return;
    }
  } catch (error) {
    logError(error);
  } finally {
    e.confirmingMainModel = !1;
  }
}
//@ chunk-3y22eg7d.js:6837-7056 placement
function fireAutoResume(e) {
  (submitContinuationPrompt(e, E),
    logEvent("tengu_quota_auto_resume_fired", {
      rearm: e.consecutiveRearms,
      waited_ms: Math.max(0, Math.round(Date.now() - e.armedAtMs)),
      early: 1,
    }),
    (e.lastObservedMs = null),
    _(e, { phase: "idle" }),
    e.events.emit("fired-now"));
}
/**
 * 取消原因是否来自用户按键。
 */
//@ chunk-3y22eg7d.js:7056-7366 placement
function isUserCancelReason(e) {
  switch (e) {
    case "escape":
    case "ctrl_c":
    case "kill_agents_chord":
      return !0;
    case "dialog":
    case "low_priority":
    case "juniper_tide":
    case "cedar_ember":
    case "account_switch":
    case "conversation_reset":
    case "background_handoff":
    case "relaunch":
    case "desktop_handoff":
    case "cloud_handoff":
    case "process_exit":
      return !1;
  }
}
/**
 * 取消原因是否系统性（不发 cancelled 事件但清除去重键）。
 */
//@ chunk-3y22eg7d.js:7366-7676 placement
function isSilentCancelReason(e) {
  switch (e) {
    case "low_priority":
    case "juniper_tide":
    case "cedar_ember":
    case "account_switch":
    case "conversation_reset":
    case "background_handoff":
    case "relaunch":
    case "desktop_handoff":
    case "cloud_handoff":
    case "process_exit":
      return !0;
    case "escape":
    case "ctrl_c":
    case "kill_agents_chord":
    case "dialog":
      return !1;
  }
}
//@ chunk-3y22eg7d.js:7676-7700 placement
function cancelQuotaAutoResume(e) {
  cancelAutoResume(i(), e);
}
//@ chunk-3y22eg7d.js:7700-7927 placement
function cancelAutoResume(e, t) {
  if (isEpisodeActive(e)) noteRejectedResetKey(e);
  if (isSilentCancelReason(t)) e.autoArmDedupeResetKeys.clear();
  let o = Q(e, e.state.phase);
  if (resetEpisode(e) && e.state.phase === "idle")
    logEvent("tengu_quota_auto_resume_cancelled", { reason: fromEnum(t) });
  if ((goIdle(e, t), o && isUserCancelReason(t))) e.events.emit("cancelled");
}
//@ chunk-3y22eg7d.js:7927-8847 placement
var AUTO_CONTINUE_CANCEL_MESSAGES = {
  background_handoff:
    "Automatic continue cancelled \xB7 this session moved to the background, so the task will not resume on its own when the usage limit resets",
  relaunch:
    "Automatic continue cancelled \xB7 Claude Code relaunched during the wait, so the task will not resume on its own when the usage limit resets (send a prompt then to continue)",
  desktop_handoff:
    "Automatic continue cancelled \xB7 this session moved to Claude Desktop, so the task will not resume on its own when the usage limit resets (continue it there)",
  cloud_handoff:
    "Automatic continue cancelled \xB7 sending this session to the cloud, so the task will not resume here on its own when the usage limit resets (continue it in the cloud session)",
  process_exit:
    "Automatic continue cancelled \xB7 Claude Code exited during the wait, so the task will not resume on its own when the usage limit resets (send a prompt after the reset to continue)",
};
/**
 * 交接时取消自动继续，返回是否原本处于活动。
 */
//@ chunk-3y22eg7d.js:8847-8955 placement
function cancelForHandoff(e) {
  let t = i();
  if (((t.handoffInProgress = !0), !isEpisodeActive(t))) return !1;
  let o = Q(t, t.state.phase);
  return (cancelAutoResume(t, e), o);
}
//@ chunk-3y22eg7d.js:8955-8995 placement
function fze() {
  i().handoffInProgress = !1;
}
/**
 * 用户提交命令时标记接管。
 */
//@ chunk-3y22eg7d.js:8995-9177 placement
function noteHumanTakeover(e, { dispatching: t = !1 } = {}) {
  let o = i();
  if (((o.continuationsSinceHumanPrompt = 0), !isEpisodeActive(o))) return;
  if ((settleOnManualSubmit(o), o.takeoverUuids.add(e), t)) o.dispatchingTakeoverUuids.add(e);
  o.changed.emit();
}
//@ chunk-3y22eg7d.js:9177-9389 placement
function clearPendingContinuation(e, { keepIfDrained: t = !1 } = {}) {
  if (e.pendingContinuationUuid === null) return !1;
  let pendingContinuationUuid = e.pendingContinuationUuid,
    n = kb((s) => s.uuid === pendingContinuationUuid).length > 0;
  if (n || !t) ((e.pendingContinuationUuid = null), e.changed.emit());
  return n;
}
/**
 * 需要上报的取消原因。
 */
//@ chunk-3y22eg7d.js:9389-9867 placement
function isReportedCancelReason(e) {
  switch (e) {
    case "escape":
    case "ctrl_c":
    case "kill_agents_chord":
    case "dialog":
    case "low_priority":
    case "juniper_tide":
    case "cedar_ember":
    case "account_switch":
    case "setting_off":
    case "manual_submit":
    case "conversation_reset":
    case "killswitch":
    case "rearm_cap":
    case "continuation_cap":
    case "horizon_exceeded":
    case "continuation_dropped":
    case "background_handoff":
    case "relaunch":
    case "desktop_handoff":
    case "cloud_handoff":
    case "process_exit":
      return !0;
    case "fired":
    case "stale":
      return !1;
  }
}
//@ chunk-3y22eg7d.js:9867-9998 placement
function goIdle(e, t) {
  if (e.state.phase === "idle") return;
  if (isReportedCancelReason(t)) logEvent("tengu_quota_auto_resume_cancelled", { reason: fromEnum(t) });
  _(e, { phase: "idle" });
}
/**
 * 每次时钟检查：记录观察时间，若中间间隔超过宽限且已过触发点则标记“睡过了”；未到触发点返回 pending； 睡过时转 stale 并上报；否则提交续写提示、上报 fired 并回到 idle。
 */
//@ chunk-3y22eg7d.js:9998-10624 placement
function tickAutoResume(e, t) {
  let o = i();
  if (o.state.phase !== "armed" || h(o)) return "idle";
  let n = o.lastObservedMs ?? o.state.fireAtMs;
  o.lastObservedMs = e;
  let s = e - n,
    u = clampMs(g0r().graceMs, ee, ae);
  if (s > u && e >= o.state.fireAtMs) o.sleptThroughReset = !0;
  if (t || e < o.state.fireAtMs) return "pending";
  if (o.sleptThroughReset)
    return (
      (o.sleptThroughReset = !1),
      logFeatureSad("quota_auto_resume", "stale"),
      logEvent("tengu_quota_auto_resume_stale", { late_by_ms: Math.round(e - o.state.fireAtMs) }),
      _(o, { phase: "stale" }),
      o.events.emit("stale"),
      "stale"
    );
  return (
    submitContinuationPrompt(o),
    logEvent("tengu_quota_auto_resume_fired", {
      rearm: o.state.consecutiveRearms,
      waited_ms: Math.max(0, Math.round(e - o.armedAtMs)),
    }),
    goIdle(o, "fired"),
    "fired"
  );
}
//@ chunk-3y22eg7d.js:10624-10954 placement
function autoResumePrompt() {
  let e = servedTextForModel(TENGU_LANTERN_WICK_RESUME_BY_MODEL, getMainLoopModel());
  if (bhn()) {
    let t = sanitizeAttributeValue(e);
    if (t === null || /[/@]/.test(t) || cX.includes(t) || wei(t) !== t) {
      if (e !== void 0 && e.trim() !== "") logFeatureSad("usage_limit_served_text_rejected", "resume_prompt");
      return USAGE_RESET_PROMPT;
    }
    if (e !== void 0 && t !== e.trim()) logFeatureSad("usage_limit_served_text_altered", "resume_prompt");
    return t;
  }
  return e !== void 0 && e.trim() !== "" ? e : USAGE_RESET_PROMPT;
}
//@ chunk-3y22eg7d.js:10954-11228 placement
function submitContinuationPrompt(e, t = autoResumePrompt()) {
  (clearPendingContinuation(e), e.continuationsSinceHumanPrompt++);
  let o = randomUUID();
  ((e.pendingContinuationUuid = o),
    (e.activeTurnClaim = null),
    e.changed.emit(),
    enqueueCommand({
      agentId: mainAgentId(),
      mode: "prompt",
      priority: LATER,
      value: t,
      uuid: o,
      origin: { kind: "auto-continuation" },
      isMeta: !0,
      skipSlashCommands: !0,
      workload: WORKLOAD_CRON,
    }));
}
//@ chunk-3y22eg7d.js:11228-11265 placement
function QIo() {
  return ZIo() ? autoResumePrompt() : null;
}
//@ chunk-3y22eg7d.js:11265-11328 placement
function ZIo() {
  let e = i();
  return e.state.phase === "stale" && !h(e);
}
/**
 * 续写已无效时从待执行命令中移除。
 */
//@ chunk-3y22eg7d.js:11328-11480 placement
function dropStaleContinuation(e) {
  let t = i(),
    pendingContinuationUuid = t.pendingContinuationUuid;
  if (pendingContinuationUuid === null || !e.some((n) => n.uuid === pendingContinuationUuid)) return e;
  if (!h(t)) return e;
  return e.filter((n) => n.uuid !== pendingContinuationUuid);
}
/**
 * 自动装配是否仍被设置允许（必要时重新扫描）。
 */
//@ chunk-3y22eg7d.js:11480-11930 placement
function shouldHonorAutoArm(e) {
  if (e.episodeArmOrigin !== "auto" || M(e)) return ((e.revocationRescan = "idle"), !1);
  if (dln() === void 0 && e.autoContinueKeyPresence === "unknowable") {
    if (e.revocationRescan === "idle") {
      e.revocationRescan = "pending";
      let t = ++e.revocationRescanGeneration;
      return (
        rescanAutoContinueSetting(e).finally(() => {
          if (e.revocationRescan === "pending" && t === e.revocationRescanGeneration)
            e.revocationRescan = "done";
        }),
        !1
      );
    }
    if (e.revocationRescan === "pending") return !1;
  }
  return ((e.revocationRescan = "idle"), !0);
}
//@ chunk-3y22eg7d.js:11930-12029 placement
function h(e) {
  if (!pze()) return (disableAutoResume(e, "killswitch"), !0);
  if (shouldHonorAutoArm(e)) return (disableAutoResume(e, "setting_off"), !0);
  return !1;
}
//@ chunk-3y22eg7d.js:12029-12250 placement
function settleOnManualSubmit(e) {
  if ((clearPendingContinuation(e, { keepIfDrained: !0 }), e.state.phase === "stale"))
    (logEvent("tengu_quota_auto_resume_stale_resumed", {}), (e.lastObservedMs = null), goIdle(e, "stale"));
  else if (e.state.phase === "armed") ((e.lastObservedMs = null), goIdle(e, "manual_submit"));
}
//@ chunk-3y22eg7d.js:12250-12468 placement
function disableAutoResume(e, t) {
  (logEvent("tengu_quota_auto_resume_cancelled", { reason: fromEnum(t) }),
    resetEpisode(e),
    _(e, { phase: "idle" }),
    e.events.emit(
      t === "horizon_exceeded"
        ? "horizon-exceeded"
        : t === "rearm_cap" || t === "continuation_cap"
          ? "cap-exhausted"
          : "disabled",
    ));
}
//@ chunk-3y22eg7d.js:12468-12550 placement
function G(e, t, o) {
  (logFeatureBad("quota_auto_resume", o), e.autoArmDedupeResetKeys.add(t), disableAutoResume(e, o));
}
//@ chunk-3y22eg7d.js:12550-12625 placement
function Re(e, t) {
  return e.episodeArmOrigin === "auto" && t * 1000 - Date.now() > rWt;
}
/**
 * 回合开始时判定是续写还是接管并认领。
 */
//@ chunk-3y22eg7d.js:12625-13413 placement
function claimTurn(e) {
  let t = i();
  for (let turnUuid of e.turnUuids) t.dispatchingTakeoverUuids.delete(turnUuid);
  if (e.isHumanTakeover) t.continuationsSinceHumanPrompt = 0;
  let o = t.pendingContinuationUuid !== null && e.turnUuids.includes(t.pendingContinuationUuid),
    any = e.turnUuids.some((turnUuid) => t.takeoverUuids.has(turnUuid)),
    s = Q(t, t.state.phase) || o,
    u =
      e.isHumanTakeover &&
      !any &&
      e.humanCommandUuids.length > 0 &&
      e.humanCommandUuids.every(
        (humanCommandUuid) => humanCommandUuid !== void 0 && t.queuedBeforeArmUuids.has(humanCommandUuid),
      ),
    d = null;
  if (u && !o) return null;
  if (u) d = "continuation";
  else if (e.isHumanTakeover && (any || s)) ((d = "takeover"), settleOnManualSubmit(t));
  else if (o) d = "continuation";
  if (d === null) return null;
  if (t.activeTurnClaim !== null)
    logError(Error("quota auto-resume: a turn claimed the episode while another claim was outstanding"));
  let O = { kind: d, queried: e.willQuery };
  return ((t.activeTurnClaim = O), t.changed.emit(), O);
}
/**
 * 回合结束释放认领，续写被丢弃时上报。
 */
//@ chunk-3y22eg7d.js:13413-13914 placement
function releaseTurnClaim(e, t) {
  let o = i();
  for (let u of t) o.dispatchingTakeoverUuids.delete(u);
  if (e !== null) {
    if (e !== o.activeTurnClaim) return;
    if (((o.activeTurnClaim = null), o.changed.emit(), o.state.phase !== "idle")) return;
    if (oO().some((u) => isEpisodeCommand(o, u))) return;
    if ((resetEpisode(o), e.kind === "continuation" && !e.queried)) reportContinuationDropped(o);
    return;
  }
  let n = o.pendingContinuationUuid !== null && t.includes(o.pendingContinuationUuid);
  if (
    (n || t.some((u) => o.takeoverUuids.has(u))) &&
    o.state.phase === "idle" &&
    o.activeTurnClaim === null &&
    !oO().some((u) => isEpisodeCommand(o, u))
  ) {
    if ((resetEpisode(o), n)) reportContinuationDropped(o);
  }
}
//@ chunk-3y22eg7d.js:13914-14086 placement
function reportContinuationDropped(e) {
  (logFeatureBad("quota_auto_resume", "continuation_dropped"),
    logEvent("tengu_quota_auto_resume_cancelled", { reason: fromEnum("continuation_dropped") }),
    e.events.emit("continuation-dropped"));
}
/**
 * 重置本次自动继续的全部计数与集合。
 */
//@ chunk-3y22eg7d.js:14086-14408 placement
function resetEpisode(e) {
  ((e.consecutiveRearms = 0),
    (e.lastArmedResetsAtSeconds = 0),
    (e.episodeArmOrigin = "dialog"),
    (e.revocationRescan = "idle"),
    e.revocationRescanGeneration++,
    e.takeoverUuids.clear(),
    e.dispatchingTakeoverUuids.clear(),
    e.queuedBeforeArmUuids.clear(),
    (e.lastObservedMs = null),
    (e.activeTurnClaim = null));
  let t = clearPendingContinuation(e);
  return (e.changed.emit(), t);
}
//@ chunk-3y22eg7d.js:14408-14496 placement
function _e(e) {
  return e.status !== "rejected" || e.isUsingOverage === !0 || e.overageInUse === !0;
}
/**
 * 收到额度拒绝时重新装配或推迟。
 */
//@ chunk-3y22eg7d.js:14496-15141 placement
function onQuotaRejected(e, t, o) {
  if (!isAutoResumableLimit(t) || !cln()) return;
  let n = t.resetsAt ?? 0;
  if (isEpisodeActive(e) && limitAppliesToModel(t.rateLimitType, getMainLoopModel()))
    e.autoArmDedupeResetKeys.add(n);
  if (e.state.phase === "armed") {
    if (n * 1000 > e.state.fireAtMs && limitAppliesToModel(t.rateLimitType, getMainLoopModel()))
      rearm(e, n, null);
    return;
  }
  if (x(e)) return;
  if (e.state.phase === "stale") return;
  let activeTurnClaim = e.activeTurnClaim;
  if (activeTurnClaim === null) return;
  if (o !== "main_thread") return;
  if (activeTurnClaim.kind === "takeover") {
    if (
      ((e.consecutiveRearms = 0),
      rearm(
        e,
        limitAppliesToModel(t.rateLimitType, getMainLoopModel()) ? n : e.lastArmedResetsAtSeconds,
        null,
      ) && e.episodeArmOrigin === "auto")
    )
      e.events.emit("taken-over");
    return;
  }
  if (e.continuationsSinceHumanPrompt >= N) {
    G(e, n, "rearm_cap");
    return;
  }
  let consecutiveRearms = e.consecutiveRearms;
  (e.consecutiveRearms++, rearm(e, n, consecutiveRearms));
}
//@ chunk-3y22eg7d.js:15141-15295 placement
function rearm(e, t, o) {
  if (h(e)) return !1;
  if (Re(e, t)) return (disableAutoResume(e, "horizon_exceeded"), !1);
  return (setArmedState(e, t, o, Date.now(), e.episodeArmOrigin), e.events.emit("rearmed"), !0);
}
//@ chunk-3y22eg7d.js:15295-15507 placement
function isOtherModelWeeklyLimit(e, t) {
  if (e !== "seven_day_opus" && e !== "seven_day_sonnet") return !1;
  if (limitAppliesToModel(e, t)) return !1;
  let o = planModeConstituentFamily(getUserSpecifiedModelSetting());
  if (e === "seven_day_opus" && o === "opus") return !1;
  if (e === "seven_day_sonnet" && o === "sonnet") return !1;
  return !0;
}
/**
 * 限额类型是否作用于当前模型。
 */
//@ chunk-3y22eg7d.js:15507-15835 placement
function limitAppliesToModel(e, t) {
  switch (e) {
    case "five_hour":
    case "seven_day":
    case "overage":
      return !0;
    case "seven_day_opus":
      return isNonCustomOpusModel(getCanonicalName(t));
    case "seven_day_sonnet":
      return isNonCustomSonnetModel(getCanonicalName(t));
    case "seven_day_overage_included": {
      let o = getPublicModelDisplayName(parseUserSpecifiedModel(t));
      if (o === null) return !1;
      let lower = o.toLowerCase();
      return overageIncludedModels().some((s) => s.toLowerCase() === lower);
    }
    case void 0:
      return !1;
  }
  return !1;
}
//@ chunk-3y22eg7d.js:15835-15930 placement
function JKn(e, t) {
  return (
    limitAppliesToModel(e.rateLimitType, t) ||
    getCanonicalName(e.model, { identity: !0 }) === getCanonicalName(t, { identity: !0 })
  );
}
//@ chunk-3y22eg7d.js:15930-15955 placement
function eOo(e) {
  startQuotaSubscriptions(i(), e);
}
/**
 * 订阅额度拒绝、设置变化与会话切换。
 */
//@ chunk-3y22eg7d.js:15955-16260 placement
function startQuotaSubscriptions(e, t) {
  if (e.limitsSubscriptionStarted) return;
  ((e.limitsSubscriptionStarted = !0),
    (e.storageV5 = t),
    (e.unsubscribeQuotaRejected = onQuotaRejected_2((o, n) => onQuotaRejected(e, o, n))),
    rescanAutoContinueSetting(e),
    (e.unsubscribeSettingsChanges = settingsChangeDetector.subscribe(() => {
      rescanAutoContinueSetting(e);
    })),
    (e.unsubscribeSessionSwitch = onSessionSwitch((o, n) => {
      if (isConversationResetSwitch(n))
        (cancelAutoResume(e, "conversation_reset"), (e.handoffInProgress = !1));
    })));
}
/**
 * 会话切换是否等同重置（clear/resume/remote_attach）。
 */
//@ chunk-3y22eg7d.js:16260-16426 placement
function isConversationResetSwitch(e) {
  switch (e) {
    case "clear":
    case "resume":
    case "remote_attach":
      return !0;
    case "fork":
    case "cd":
    case "spare_claim":
    case "hydrate":
    case "startup_custom_id":
      return !1;
  }
}

export {
  JKn,
  fze,
  isQuotaAutoResumeArmed,
  _Ut,
  isConversationResetSwitch,
  cancelOnConversationReset,
  cancelQuotaAutoResume,
  A7e,
  yUt,
  Fjs,
  QIo,
  due,
  ZIo,
  noteHumanTakeover,
  dropStaleContinuation,
  claimTurn,
  releaseTurnClaim,
  autoArmQuotaAutoResume,
  m0r,
  isAutoContinuationPrompt,
  handleTurnCompletedAtLimit,
  p0r,
  T7e,
  C7e,
  isAutoContinueEnabled,
  isAutoContinueUserSetting,
  quotaAutoResumeState,
  Fyt,
  armQuotaAutoResumeFromDialog,
  qIo,
  eOo,
  tickAutoResume,
  cancelForHandoff,
  AUTO_CONTINUE_CANCEL_MESSAGES,
};

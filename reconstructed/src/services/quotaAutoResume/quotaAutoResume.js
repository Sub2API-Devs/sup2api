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
import { intentProviderSlot, isAutoResumableLimit, RATE_LIMIT_RESET_MAX_MS } from "../api/errors.js";
import {
  resolveAutoContinueEnabled,
  isAutoContinueFeatureEnabled,
  getAutoContinueConfig,
  isAutoContinueAutoArmEnabled,
  getAutoContinueSettingValue,
  isAutoContinueRemoteEnabled,
  isAutoContinueEligibleSession,
} from "../autoContinueAtUsageLimit.js";
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
  getCommandQueue,
  someInFlightDrainCommand,
  isPromptModeQueuedCommand as isPromptModeQueuedCommand_2,
  isRefillableCommand,
  removeQueuedByFilter,
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
import { isBotProtectedWrapUpTextOn } from "../usageLimitGrace.js";
import { sanitizeAttributeValue } from "../../utils/sanitization.js";
import { EXIT_COMMAND_WORDS } from "../../utils/handlePromptSubmit.js";
import { hyphenateUltraKeyword } from "../../utils/ultraplan/keyword.js";
import { WORKLOAD_CRON } from "../../utils/workloadContext.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getPublicModelDisplayName, parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { overageIncludedModels } from "../api/usage.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";

//@ chunk-3y22eg7d.js:928-1319 placement
/**
 * 额度重置提示语、按模型恢复的特性开关名，以及「额度提前可用」的续写提示文案。
 */
var LATER = "later";
var USAGE_RESET_PROMPT =
  "Your claude.ai usage limit has reset. Continue the task you were working on when the limit was reached; do not repeat work that is already complete.";
var TENGU_LANTERN_WICK_RESUME_BY_MODEL = "tengu_lantern_wick_resume_by_model";
var AVAILABLE_AGAIN_PROMPT =
  "Your claude.ai usage is available again before the usage-limit reset. Continue the task you were working on when the limit was reached; do not repeat work that is already complete.";
//@ chunk-3y22eg7d.js:1319-1385 placement
function isAutoContinuationPrompt(e) {
  return (
    e === USAGE_RESET_PROMPT ||
    e === AVAILABLE_AGAIN_PROMPT ||
    (isEpisodeActiveNow() && e.trim() === autoResumePrompt().trim())
  );
}
//@ chunk-3y22eg7d.js:1385-1449 placement
/**
 * 自动继续的时序常量：一条人类提示后最多续写次数、重装延迟表、触发抖动范围、宽限与延迟上限。
 */
var MAX_CONTINUATIONS_PER_HUMAN_PROMPT = 3;
var REARM_DELAYS_MS = [60000, 300000];
var MIN_JITTER_MS = 30000;
var MAX_JITTER_MS = 90000;
var MIN_GRACE_MS = 1800000;
var MAX_DELAY_MS = 21600000;
//@ chunk-3y22eg7d.js:1449-2227 placement
function createQuotaAutoResumeState() {
  return {
    state: {
      phase: "idle",
    },
    consecutiveRearms: 0,
    continuationsSinceHumanPrompt: 0,
    armedAtMs: 0,
    lastArmedResetsAtSeconds: 0,
    lastObservedMs: null,
    takeoverUuids: new Set(),
    queuedBeforeArmUuids: new Set(),
    handoffInProgress: false,
    dispatchingTakeoverUuids: new Set(),
    pendingContinuationUuid: null,
    activeTurnClaim: null,
    episodeArmOrigin: "dialog",
    sleptThroughReset: false,
    confirmingMainModel: false,
    recheckRequestedWhileConfirming: false,
    armedResetKeys: new Set(),
    autoArmDedupeResetKeys: new Set(),
    changed: createSignal(),
    events: createSignal(),
    autoContinueKeyPresence: "unscanned",
    storageV5: undefined,
    unsubscribeSettingsChanges: null,
    unknowableRescanDelayMs: 2000,
    unknowableRescanTimer: undefined,
    revocationRescan: "idle",
    revocationRescanGeneration: 0,
    limitsSubscriptionStarted: false,
    unsubscribeQuotaRejected: null,
    unsubscribeSessionSwitch: null,
  };
}
//@ chunk-3y22eg7d.js:2227-2244 placement
/**
 * 按 host 保存的额度自动继续状态。
 */
var quotaResumeStateSlots = new HostScoped(createQuotaAutoResumeState);
//@ chunk-3y22eg7d.js:2244-2339 placement
/**
 * 取当前 host 的额度自动继续状态对象（HostScoped），首次调用时登记 episode 活跃判定。
 */
function currentQuotaResumeState() {
  let host = getRootSession().host;
  let t = quotaResumeStateSlots.of(host);
  let o = intentProviderSlot.of(host);
  if (!o.provided) o.provide(() => isEpisodeActive(t));
  return t;
}
//@ chunk-3y22eg7d.js:2339-2511 placement
function clampMs(e, t, o = 0) {
  if (typeof e !== "number" && typeof e !== "string") return t;
  let n = Number(e);
  if (!Number.isFinite(n) || n < 0) return t;
  return Math.min(Math.max(Math.round(n), o), MAX_DELAY_MS);
}
//@ chunk-3y22eg7d.js:2511-2524 placement
var MAX_GRACE_MS = 60000;
//@ chunk-3y22eg7d.js:2524-2553 placement
function isAutoContinueEnabled() {
  return hasUnknownAutoContinueSetting(currentQuotaResumeState());
}
//@ chunk-3y22eg7d.js:2553-2605 placement
/**
 * 自动继续设置是否处于「未知」状态（出现 auto_restore_cancel 键）。
 */
function hasUnknownAutoContinueSetting(e) {
  return resolveAutoContinueEnabled(e.autoContinueKeyPresence);
}
//@ chunk-3y22eg7d.js:2605-2709 placement
/**
 * 会话重置时取消自动继续（auto_restore_cancel 除外）。
 */
function cancelOnConversationReset(e) {
  let t = currentQuotaResumeState();
  if (e === "auto_restore_cancel") return;
  if (!isEpisodeActive(t)) return;
  cancelAutoResume(t, "conversation_reset");
}
//@ chunk-3y22eg7d.js:2709-2718 placement
var MAX_SIDE_EFFECT_RESCANS = 2;
//@ chunk-3y22eg7d.js:2718-3182 placement
/**
 * 读取 autoContinueAtUsageLimit 的设置存在性，不可知时定时重试。
 */
async function rescanAutoContinueSetting(e, t = MAX_SIDE_EFFECT_RESCANS) {
  try {
    e.autoContinueKeyPresence = await rawSettingsKeyPresence("autoContinueAtUsageLimit", e.storageV5);
  } catch (error) {
    e.autoContinueKeyPresence = "unknowable";
    logError(error);
  }
  if (e.autoContinueKeyPresence !== "unknowable") {
    e.revocationRescan = "idle";
    e.revocationRescanGeneration++;
  }
  clearTimeout(e.unknowableRescanTimer);
  if (e.autoContinueKeyPresence === "unknowable" && t > 0) {
    e.unknowableRescanTimer = setTimeout(
      (o, n) => {
        rescanAutoContinueSetting(o, n);
      },
      e.unknowableRescanDelayMs,
      e,
      t - 1,
    );
    e.unknowableRescanTimer.unref?.();
  }
}
//@ chunk-3y22eg7d.js:3182-3283 placement
/**
 * autoContinueAtUsageLimit 仅来自用户设置（或未设置）。
 */
function isAutoContinueUserSetting() {
  let source = getSecuritySensitiveSettingWithSources("autoContinueAtUsageLimit")[0]?.source;
  return source === undefined || source === "userSettings";
}
//@ chunk-3y22eg7d.js:3283-3360 placement
/**
 * 判断该限额能否自动继续：订阅用户、非按量计费、限额可续且开关允许。
 */
function canAutoResumeThisLimit(e) {
  return (
    isClaudeAISubscriber() &&
    getOauthAccountInfo()?.billingType !== "usage_based" &&
    isAutoResumableLimit(e) &&
    isAutoContinueFeatureEnabled()
  );
}
//@ chunk-3y22eg7d.js:3360-3392 placement
function quotaAutoResumeState() {
  return currentQuotaResumeState().state;
}
//@ chunk-3y22eg7d.js:3392-3477 placement
/**
 * 当前是否由 auto 路径装配了自动继续。
 */
function isAutoArmedByItself() {
  let e = currentQuotaResumeState();
  return e.state.phase === "armed" && e.episodeArmOrigin === "auto";
}
//@ chunk-3y22eg7d.js:3477-3581 placement
function noteRejectedResetKey(e) {
  let currentLimits = getCurrentLimits();
  if (currentLimits.status === "rejected" && currentLimits.resetsAt !== undefined)
    e.armedResetKeys.add(currentLimits.resetsAt);
}
//@ chunk-3y22eg7d.js:3581-3630 placement
/**
 * 该重置键是否已被装配过。
 */
function isResetKeyArmed(resetsAt) {
  return currentQuotaResumeState().armedResetKeys.has(resetsAt);
}
//@ chunk-3y22eg7d.js:3630-3677 placement
function isQuotaAutoResumeArmed() {
  return currentQuotaResumeState().state.phase === "armed";
}
//@ chunk-3y22eg7d.js:3677-3850 placement
function isEpisodeActive(e) {
  return (
    e.state.phase === "armed" ||
    e.state.phase === "stale" ||
    e.activeTurnClaim !== null ||
    e.dispatchingTakeoverUuids.size > 0 ||
    getCommandQueue().some((t) => isEpisodeCommand(e, t)) ||
    someInFlightDrainCommand((t) => isEpisodeCommand(e, t))
  );
}
//@ chunk-3y22eg7d.js:3850-3887 placement
/**
 * 排队命令是提示模式且可自动续写。
 */
function isPromptModeQueuedCommand(e) {
  return isPromptModeQueuedCommand_2(e) && isRefillableCommand(e);
}
//@ chunk-3y22eg7d.js:3887-3993 placement
function isEpisodeCommand(e, t) {
  return t.uuid !== undefined && (t.uuid === e.pendingContinuationUuid || e.takeoverUuids.has(t.uuid));
}
//@ chunk-3y22eg7d.js:3993-4022 placement
/**
 * 当前是否有进行中的自动继续 episode。
 */
function isEpisodeActiveNow() {
  return isEpisodeActive(currentQuotaResumeState());
}
//@ chunk-3y22eg7d.js:4022-4054 placement
/**
 * 给定阶段是否算作活跃（结合 pending 判断）。
 */
function isPhaseActive(phase) {
  return isActivePhase(currentQuotaResumeState(), phase);
}
//@ chunk-3y22eg7d.js:4054-4108 placement
/**
 * 阶段为 armed/stale 或存在待继续的 uuid 即视为活跃。
 */
function isActivePhase(e, phase) {
  return phase === "armed" || phase === "stale" || isPendingContinuationPresent(e);
}
//@ chunk-3y22eg7d.js:4108-4137 placement
/**
 * 当前是否有待继续的排队命令。
 */
function hasPendingContinuation() {
  return isPendingContinuationPresent(currentQuotaResumeState());
}
//@ chunk-3y22eg7d.js:4137-4227 placement
/**
 * 待继续的 uuid 仍存在于排队命令中。
 */
function isPendingContinuationPresent(e) {
  let pendingContinuationUuid = e.pendingContinuationUuid;
  return (
    pendingContinuationUuid !== null && getCommandQueue().some((o) => o.uuid === pendingContinuationUuid)
  );
}
//@ chunk-3y22eg7d.js:4227-4294 placement
/**
 * 给定 uuid 是否为当前待继续的 uuid。
 */
function isPendingContinuationUuid(uuid) {
  return uuid !== undefined && uuid === currentQuotaResumeState().pendingContinuationUuid;
}
//@ chunk-3y22eg7d.js:4294-4341 placement
/**
 * 订阅自动继续事件。
 */
function onQuotaResumeEvent(e) {
  return currentQuotaResumeState().events.subscribe(e);
}
//@ chunk-3y22eg7d.js:4341-4389 placement
/**
 * 订阅自动继续状态变化。
 */
function onQuotaResumeChange(e) {
  return currentQuotaResumeState().changed.subscribe(e);
}
//@ chunk-3y22eg7d.js:4389-4432 placement
function _(e, state) {
  e.state = state;
  e.changed.emit();
}
//@ chunk-3y22eg7d.js:4432-4553 placement
function jitterMs() {
  let autoContinueConfig = getAutoContinueConfig();
  let t = clampMs(autoContinueConfig.jitterMinMs, MIN_JITTER_MS);
  let max = Math.max(t, clampMs(autoContinueConfig.jitterMaxMs, MAX_JITTER_MS));
  return Math.round(t + Math.random() * (max - t));
}
//@ chunk-3y22eg7d.js:4553-4658 placement
function computeFireAtMs(e, t, o) {
  let n = e * 1000 + jitterMs();
  if (t === null) return n;
  let s = REARM_DELAYS_MS[t] ?? REARM_DELAYS_MS.at(-1) ?? 0;
  return Math.max(n, o + s);
}
//@ chunk-3y22eg7d.js:4658-4722 placement
function armQuotaAutoResumeFromDialog(e, t = Date.now(), o = "dialog", storageV5) {
  return armAutoResume(currentQuotaResumeState(), e, t, o, storageV5);
}
//@ chunk-3y22eg7d.js:4722-5186 placement
/**
 * 装配自动继续（记录排队前的命令、上报事件）。
 */
function armAutoResume(e, t, o, episodeArmOrigin, storageV5) {
  if (!canAutoResumeThisLimit(t)) return false;
  startQuotaSubscriptions(e, storageV5);
  e.consecutiveRearms = 0;
  if (episodeArmOrigin === "dialog") e.continuationsSinceHumanPrompt = 0;
  e.takeoverUuids.clear();
  e.dispatchingTakeoverUuids.clear();
  e.queuedBeforeArmUuids.clear();
  for (let u of getCommandQueue())
    if (isPromptModeQueuedCommand(u) || (u.mode === "bash" && isRefillableCommand(u))) {
      u.uuid ??= randomUUID();
      e.queuedBeforeArmUuids.add(u.uuid);
    }
  e.armedAtMs = o;
  logFeatureOk("quota_auto_resume");
  logEvent("tengu_quota_auto_resume_offer_armed", {
    origin: fromEnum(episodeArmOrigin),
  });
  setArmedState(e, t.resetsAt ?? 0, null, o, episodeArmOrigin);
  e.events.emit("armed");
  return true;
}
//@ chunk-3y22eg7d.js:5186-5597 placement
function autoArmQuotaAutoResume(e, t = Date.now(), o) {
  let n = currentQuotaResumeState();
  if (!canAutoResumeThisLimit(e)) return false;
  if (n.handoffInProgress) return false;
  if (!hasUnknownAutoContinueSetting(n) || !isAutoContinueAutoArmEnabled()) return false;
  if (isUnattendedInteractiveSession()) return false;
  let resetsAt = e.resetsAt ?? 0;
  if (resetsAt * 1000 - t > RATE_LIMIT_RESET_MAX_MS) return false;
  if (isOtherModelWeeklyLimit(e.rateLimitType, getMainLoopModel())) return false;
  if (isEpisodeActive(n) || n.autoArmDedupeResetKeys.has(resetsAt)) return false;
  if (n.continuationsSinceHumanPrompt >= MAX_CONTINUATIONS_PER_HUMAN_PROMPT) {
    disableAutoResumeWithReason(n, resetsAt, "continuation_cap");
    return false;
  }
  if (!armAutoResume(n, e, t, "auto", o)) return false;
  n.events.emit("auto-armed");
  return true;
}
//@ chunk-3y22eg7d.js:5597-5843 placement
/**
 * 回合完成时若触及额度上限则更新或自动装配。
 */
function handleTurnCompletedAtLimit(e, terminalReason, limits = Date.now(), storageV5) {
  try {
    let s = e && terminalReason === "completed" ? emitStatusChange(limits) : null;
    if (s === null) return false;
    let u = currentQuotaResumeState();
    if (isEpisodeActive(u)) {
      onQuotaRejected(u, s, "main_thread");
      return u.state.phase === "armed" && u.state.resetsAtSeconds === s.resetsAt;
    }
    return autoArmQuotaAutoResume(s, limits, storageV5);
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-3y22eg7d.js:5843-6264 placement
/**
 * 进入 armed 状态并记录重置时刻与触发时间。
 */
function setArmedState(e, t, o, n, episodeArmOrigin = "dialog") {
  clearPendingContinuation(e);
  e.episodeArmOrigin = episodeArmOrigin;
  e.lastArmedResetsAtSeconds = t;
  e.autoArmDedupeResetKeys.add(t);
  e.armedResetKeys.add(t);
  noteRejectedResetKey(e);
  e.activeTurnClaim = null;
  e.sleptThroughReset = false;
  e.lastObservedMs = n;
  let fireAtMs = computeFireAtMs(t, o, n);
  logEvent("tengu_quota_auto_resume_armed", {
    resets_in_sec: Math.max(0, Math.round(t - n / 1000)),
    rearm: o === null ? 0 : o + 1,
  });
  _(e, {
    phase: "armed",
    resetsAtSeconds: t,
    fireAtMs,
    consecutiveRearms: e.consecutiveRearms,
  });
}
//@ chunk-3y22eg7d.js:6264-6287 placement
/**
 * 触发前再确认一次并提交续写。
 */
function confirmAndFire() {
  confirmAndFire_2(currentQuotaResumeState());
}
//@ chunk-3y22eg7d.js:6287-6358 placement
/**
 * 包装一个函数：调用后（除非返回 false）再确认一次并触发续写。
 */
function withQuotaResumeFire(onDone) {
  return (...t) => {
    let o = onDone(...t);
    if (o !== false) confirmAndFire();
    return o;
  };
}
//@ chunk-3y22eg7d.js:6358-6837 placement
/**
 * 触发前再查一次主模型额度，确认可用才提交续写。
 */
async function confirmAndFire_2(e) {
  if (e.state.phase !== "armed") return;
  if (e.confirmingMainModel) {
    e.recheckRequestedWhileConfirming = true;
    return;
  }
  e.confirmingMainModel = true;
  try {
    for (;;) {
      e.recheckRequestedWhileConfirming = false;
      if (planModeConstituentFamily(getUserSpecifiedModelSetting()) !== null) return;
      let mainLoopModel = getMainLoopModel();
      let state = e.state;
      let n = await probeQuotaStatus(mainLoopModel, undefined, e.storageV5);
      if (e.state.phase !== "armed" || isAutoResumeDisabled(e)) return;
      if (e.recheckRequestedWhileConfirming || getMainLoopModel() !== mainLoopModel || e.state !== state)
        continue;
      if (n === null || !isRejectionWorthRearming(n)) return;
      fireAutoResume(e);
      return;
    }
  } catch (error) {
    logError(error);
  } finally {
    e.confirmingMainModel = false;
  }
}
//@ chunk-3y22eg7d.js:6837-7056 placement
function fireAutoResume(e) {
  submitContinuationPrompt(e, AVAILABLE_AGAIN_PROMPT);
  logEvent("tengu_quota_auto_resume_fired", {
    rearm: e.consecutiveRearms,
    waited_ms: Math.max(0, Math.round(Date.now() - e.armedAtMs)),
    early: 1,
  });
  e.lastObservedMs = null;
  _(e, {
    phase: "idle",
  });
  e.events.emit("fired-now");
}
//@ chunk-3y22eg7d.js:7056-7366 placement
/**
 * 取消原因是否来自用户按键。
 */
function isUserCancelReason(e) {
  switch (e) {
    case "escape":
    case "ctrl_c":
    case "kill_agents_chord":
      return true;
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
      return false;
  }
}
//@ chunk-3y22eg7d.js:7366-7676 placement
/**
 * 取消原因是否系统性（不发 cancelled 事件但清除去重键）。
 */
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
      return true;
    case "escape":
    case "ctrl_c":
    case "kill_agents_chord":
    case "dialog":
      return false;
  }
}
//@ chunk-3y22eg7d.js:7676-7700 placement
function cancelQuotaAutoResume(e) {
  cancelAutoResume(currentQuotaResumeState(), e);
}
//@ chunk-3y22eg7d.js:7700-7927 placement
function cancelAutoResume(e, t) {
  if (isEpisodeActive(e)) noteRejectedResetKey(e);
  if (isSilentCancelReason(t)) e.autoArmDedupeResetKeys.clear();
  let o = isActivePhase(e, e.state.phase);
  if (resetEpisode(e) && e.state.phase === "idle")
    logEvent("tengu_quota_auto_resume_cancelled", {
      reason: fromEnum(t),
    });
  goIdle(e, t);
  if (o && isUserCancelReason(t)) e.events.emit("cancelled");
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
//@ chunk-3y22eg7d.js:8847-8955 placement
/**
 * 交接时取消自动继续，返回是否原本处于活动。
 */
function cancelForHandoff(e) {
  let t = currentQuotaResumeState();
  t.handoffInProgress = true;
  if (!isEpisodeActive(t)) return false;
  let o = isActivePhase(t, t.state.phase);
  cancelAutoResume(t, e);
  return o;
}
//@ chunk-3y22eg7d.js:8955-8995 placement
/**
 * 清除「接管进行中」标记。
 */
function clearHandoffInProgress() {
  currentQuotaResumeState().handoffInProgress = false;
}
//@ chunk-3y22eg7d.js:8995-9177 placement
/**
 * 用户提交命令时标记接管。
 */
function noteHumanTakeover(e, { dispatching: t = false } = {}) {
  let o = currentQuotaResumeState();
  o.continuationsSinceHumanPrompt = 0;
  if (!isEpisodeActive(o)) return;
  settleOnManualSubmit(o);
  o.takeoverUuids.add(e);
  if (t) o.dispatchingTakeoverUuids.add(e);
  o.changed.emit();
}
//@ chunk-3y22eg7d.js:9177-9389 placement
function clearPendingContinuation(e, { keepIfDrained: t = false } = {}) {
  if (e.pendingContinuationUuid === null) return false;
  let pendingContinuationUuid = e.pendingContinuationUuid;
  let n = removeQueuedByFilter((s) => s.uuid === pendingContinuationUuid).length > 0;
  if (n || !t) {
    e.pendingContinuationUuid = null;
    e.changed.emit();
  }
  return n;
}
//@ chunk-3y22eg7d.js:9389-9867 placement
/**
 * 需要上报的取消原因。
 */
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
      return true;
    case "fired":
    case "stale":
      return false;
  }
}
//@ chunk-3y22eg7d.js:9867-9998 placement
function goIdle(e, t) {
  if (e.state.phase === "idle") return;
  if (isReportedCancelReason(t))
    logEvent("tengu_quota_auto_resume_cancelled", {
      reason: fromEnum(t),
    });
  _(e, {
    phase: "idle",
  });
}
//@ chunk-3y22eg7d.js:9998-10624 placement
/**
 * 每次时钟检查：记录观察时间，若中间间隔超过宽限且已过触发点则标记“睡过了”；未到触发点返回 pending； 睡过时转 stale 并上报；否则提交续写提示、上报 fired 并回到 idle。
 */
function tickAutoResume(e, isLoading) {
  let o = currentQuotaResumeState();
  if (o.state.phase !== "armed" || isAutoResumeDisabled(o)) return "idle";
  let n = o.lastObservedMs ?? o.state.fireAtMs;
  o.lastObservedMs = e;
  let s = e - n;
  let u = clampMs(getAutoContinueConfig().graceMs, MIN_GRACE_MS, MAX_GRACE_MS);
  if (s > u && e >= o.state.fireAtMs) o.sleptThroughReset = true;
  if (isLoading || e < o.state.fireAtMs) return "pending";
  if (o.sleptThroughReset) {
    o.sleptThroughReset = false;
    logFeatureSad("quota_auto_resume", "stale");
    logEvent("tengu_quota_auto_resume_stale", {
      late_by_ms: Math.round(e - o.state.fireAtMs),
    });
    _(o, {
      phase: "stale",
    });
    o.events.emit("stale");
    return "stale";
  }
  submitContinuationPrompt(o);
  logEvent("tengu_quota_auto_resume_fired", {
    rearm: o.state.consecutiveRearms,
    waited_ms: Math.max(0, Math.round(e - o.armedAtMs)),
  });
  goIdle(o, "fired");
  return "fired";
}
//@ chunk-3y22eg7d.js:10624-10954 placement
function autoResumePrompt() {
  let e = servedTextForModel(TENGU_LANTERN_WICK_RESUME_BY_MODEL, getMainLoopModel());
  if (isBotProtectedWrapUpTextOn()) {
    let t = sanitizeAttributeValue(e);
    if (t === null || /[/@]/.test(t) || EXIT_COMMAND_WORDS.includes(t) || hyphenateUltraKeyword(t) !== t) {
      if (e !== undefined && e.trim() !== "")
        logFeatureSad("usage_limit_served_text_rejected", "resume_prompt");
      return USAGE_RESET_PROMPT;
    }
    if (e !== undefined && t !== e.trim()) logFeatureSad("usage_limit_served_text_altered", "resume_prompt");
    return t;
  }
  return e !== undefined && e.trim() !== "" ? e : USAGE_RESET_PROMPT;
}
//@ chunk-3y22eg7d.js:10954-11228 placement
function submitContinuationPrompt(e, value = autoResumePrompt()) {
  clearPendingContinuation(e);
  e.continuationsSinceHumanPrompt++;
  let o = randomUUID();
  e.pendingContinuationUuid = o;
  e.activeTurnClaim = null;
  e.changed.emit();
  enqueueCommand({
    agentId: mainAgentId(),
    mode: "prompt",
    priority: LATER,
    value,
    uuid: o,
    origin: {
      kind: "auto-continuation",
    },
    isMeta: true,
    skipSlashCommands: true,
    workload: WORKLOAD_CRON,
  });
}
//@ chunk-3y22eg7d.js:11228-11265 placement
/**
 * 处于 stale 且未被禁用时返回续写提示，否则 null。
 */
function autoResumePromptIfStale() {
  return shouldOfferAutoResumePrompt() ? autoResumePrompt() : null;
}
//@ chunk-3y22eg7d.js:11265-11328 placement
/**
 * 当前是否应提供续写提示（stale 且未被禁用）。
 */
function shouldOfferAutoResumePrompt() {
  let e = currentQuotaResumeState();
  return e.state.phase === "stale" && !isAutoResumeDisabled(e);
}
//@ chunk-3y22eg7d.js:11328-11480 placement
/**
 * 续写已无效时从待执行命令中移除。
 */
function dropStaleContinuation(e) {
  let t = currentQuotaResumeState();
  let pendingContinuationUuid = t.pendingContinuationUuid;
  if (pendingContinuationUuid === null || !e.some((n) => n.uuid === pendingContinuationUuid)) return e;
  if (!isAutoResumeDisabled(t)) return e;
  return e.filter((n) => n.uuid !== pendingContinuationUuid);
}
//@ chunk-3y22eg7d.js:11480-11930 placement
/**
 * 自动装配是否仍被设置允许（必要时重新扫描）。
 */
function shouldHonorAutoArm(e) {
  if (e.episodeArmOrigin !== "auto" || hasUnknownAutoContinueSetting(e)) {
    e.revocationRescan = "idle";
    return false;
  }
  if (getAutoContinueSettingValue() === undefined && e.autoContinueKeyPresence === "unknowable") {
    if (e.revocationRescan === "idle") {
      e.revocationRescan = "pending";
      let t = ++e.revocationRescanGeneration;
      rescanAutoContinueSetting(e).finally(() => {
        if (e.revocationRescan === "pending" && t === e.revocationRescanGeneration)
          e.revocationRescan = "done";
      });
      return false;
    }
    if (e.revocationRescan === "pending") return false;
  }
  e.revocationRescan = "idle";
  return true;
}
//@ chunk-3y22eg7d.js:11930-12029 placement
/**
 * 自动继续是否被禁用（开关或设置）。
 */
function isAutoResumeDisabled(e) {
  if (!isAutoContinueRemoteEnabled()) {
    disableAutoResume(e, "killswitch");
    return true;
  }
  if (shouldHonorAutoArm(e)) {
    disableAutoResume(e, "setting_off");
    return true;
  }
  return false;
}
//@ chunk-3y22eg7d.js:12029-12250 placement
function settleOnManualSubmit(e) {
  clearPendingContinuation(e, {
    keepIfDrained: true,
  });
  if (e.state.phase === "stale") {
    logEvent("tengu_quota_auto_resume_stale_resumed", {});
    e.lastObservedMs = null;
    goIdle(e, "stale");
  } else if (e.state.phase === "armed") {
    e.lastObservedMs = null;
    goIdle(e, "manual_submit");
  }
}
//@ chunk-3y22eg7d.js:12250-12468 placement
function disableAutoResume(e, t) {
  logEvent("tengu_quota_auto_resume_cancelled", {
    reason: fromEnum(t),
  });
  resetEpisode(e);
  _(e, {
    phase: "idle",
  });
  e.events.emit(
    t === "horizon_exceeded"
      ? "horizon-exceeded"
      : t === "rearm_cap" || t === "continuation_cap"
        ? "cap-exhausted"
        : "disabled",
  );
}
//@ chunk-3y22eg7d.js:12468-12550 placement
/**
 * 上报坏事件、记录去重键并禁用自动继续。
 */
function disableAutoResumeWithReason(e, resetsAt, o) {
  logFeatureBad("quota_auto_resume", o);
  e.autoArmDedupeResetKeys.add(resetsAt);
  disableAutoResume(e, o);
}
//@ chunk-3y22eg7d.js:12550-12625 placement
/**
 * 是否由 auto 装配且重置时间仍在可等待范围内。
 */
function isAutoArmBeyondHorizon(e, t) {
  return e.episodeArmOrigin === "auto" && t * 1000 - Date.now() > RATE_LIMIT_RESET_MAX_MS;
}
//@ chunk-3y22eg7d.js:12625-13413 placement
/**
 * 回合开始时判定是续写还是接管并认领。
 */
function claimTurn(e) {
  let t = currentQuotaResumeState();
  for (let turnUuid of e.turnUuids) t.dispatchingTakeoverUuids.delete(turnUuid);
  if (e.isHumanTakeover) t.continuationsSinceHumanPrompt = 0;
  let o = t.pendingContinuationUuid !== null && e.turnUuids.includes(t.pendingContinuationUuid);
  let any = e.turnUuids.some((turnUuid) => t.takeoverUuids.has(turnUuid));
  let s = isActivePhase(t, t.state.phase) || o;
  let u =
    e.isHumanTakeover &&
    !any &&
    e.humanCommandUuids.length > 0 &&
    e.humanCommandUuids.every(
      (humanCommandUuid) => humanCommandUuid !== undefined && t.queuedBeforeArmUuids.has(humanCommandUuid),
    );
  let d = null;
  if (u && !o) return null;
  if (u) d = "continuation";
  else if (e.isHumanTakeover && (any || s)) {
    d = "takeover";
    settleOnManualSubmit(t);
  } else if (o) d = "continuation";
  if (d === null) return null;
  if (t.activeTurnClaim !== null)
    logError(Error("quota auto-resume: a turn claimed the episode while another claim was outstanding"));
  let O = {
    kind: d,
    queried: e.willQuery,
  };
  t.activeTurnClaim = O;
  t.changed.emit();
  return O;
}
//@ chunk-3y22eg7d.js:13413-13914 placement
/**
 * 回合结束释放认领，续写被丢弃时上报。
 */
function releaseTurnClaim(e, t) {
  let o = currentQuotaResumeState();
  for (let u of t) o.dispatchingTakeoverUuids.delete(u);
  if (e !== null) {
    if (e !== o.activeTurnClaim) return;
    o.activeTurnClaim = null;
    o.changed.emit();
    if (o.state.phase !== "idle") return;
    if (getCommandQueue().some((u) => isEpisodeCommand(o, u))) return;
    resetEpisode(o);
    if (e.kind === "continuation" && !e.queried) reportContinuationDropped(o);
    return;
  }
  let n = o.pendingContinuationUuid !== null && t.includes(o.pendingContinuationUuid);
  if (
    (n || t.some((u) => o.takeoverUuids.has(u))) &&
    o.state.phase === "idle" &&
    o.activeTurnClaim === null &&
    !getCommandQueue().some((u) => isEpisodeCommand(o, u))
  ) {
    resetEpisode(o);
    if (n) reportContinuationDropped(o);
  }
}
//@ chunk-3y22eg7d.js:13914-14086 placement
function reportContinuationDropped(e) {
  logFeatureBad("quota_auto_resume", "continuation_dropped");
  logEvent("tengu_quota_auto_resume_cancelled", {
    reason: fromEnum("continuation_dropped"),
  });
  e.events.emit("continuation-dropped");
}
//@ chunk-3y22eg7d.js:14086-14408 placement
/**
 * 重置本次自动继续的全部计数与集合。
 */
function resetEpisode(e) {
  e.consecutiveRearms = 0;
  e.lastArmedResetsAtSeconds = 0;
  e.episodeArmOrigin = "dialog";
  e.revocationRescan = "idle";
  e.revocationRescanGeneration++;
  e.takeoverUuids.clear();
  e.dispatchingTakeoverUuids.clear();
  e.queuedBeforeArmUuids.clear();
  e.lastObservedMs = null;
  e.activeTurnClaim = null;
  let t = clearPendingContinuation(e);
  e.changed.emit();
  return t;
}
//@ chunk-3y22eg7d.js:14408-14496 placement
/**
 * 该拒绝结果是否仍值得重新装配（非 rejected 或正在用超额额度）。
 */
function isRejectionWorthRearming(e) {
  return e.status !== "rejected" || e.isUsingOverage === true || e.overageInUse === true;
}
//@ chunk-3y22eg7d.js:14496-15141 placement
/**
 * 收到额度拒绝时重新装配或推迟。
 */
function onQuotaRejected(e, t, o) {
  if (!isAutoResumableLimit(t) || !isAutoContinueEligibleSession()) return;
  let resetsAt = t.resetsAt ?? 0;
  if (isEpisodeActive(e) && limitAppliesToModel(t.rateLimitType, getMainLoopModel()))
    e.autoArmDedupeResetKeys.add(resetsAt);
  if (e.state.phase === "armed") {
    if (resetsAt * 1000 > e.state.fireAtMs && limitAppliesToModel(t.rateLimitType, getMainLoopModel()))
      rearm(e, resetsAt, null);
    return;
  }
  if (isPendingContinuationPresent(e)) return;
  if (e.state.phase === "stale") return;
  let activeTurnClaim = e.activeTurnClaim;
  if (activeTurnClaim === null) return;
  if (o !== "main_thread") return;
  if (activeTurnClaim.kind === "takeover") {
    e.consecutiveRearms = 0;
    if (
      rearm(
        e,
        limitAppliesToModel(t.rateLimitType, getMainLoopModel()) ? resetsAt : e.lastArmedResetsAtSeconds,
        null,
      ) &&
      e.episodeArmOrigin === "auto"
    )
      e.events.emit("taken-over");
    return;
  }
  if (e.continuationsSinceHumanPrompt >= MAX_CONTINUATIONS_PER_HUMAN_PROMPT) {
    disableAutoResumeWithReason(e, resetsAt, "rearm_cap");
    return;
  }
  let consecutiveRearms = e.consecutiveRearms;
  e.consecutiveRearms++;
  rearm(e, resetsAt, consecutiveRearms);
}
//@ chunk-3y22eg7d.js:15141-15295 placement
function rearm(e, resetsAt, o) {
  if (isAutoResumeDisabled(e)) return false;
  if (isAutoArmBeyondHorizon(e, resetsAt)) {
    disableAutoResume(e, "horizon_exceeded");
    return false;
  }
  setArmedState(e, resetsAt, o, Date.now(), e.episodeArmOrigin);
  e.events.emit("rearmed");
  return true;
}
//@ chunk-3y22eg7d.js:15295-15507 placement
function isOtherModelWeeklyLimit(rateLimitType, mainLoopModel) {
  if (rateLimitType !== "seven_day_opus" && rateLimitType !== "seven_day_sonnet") return false;
  if (limitAppliesToModel(rateLimitType, mainLoopModel)) return false;
  let o = planModeConstituentFamily(getUserSpecifiedModelSetting());
  if (rateLimitType === "seven_day_opus" && o === "opus") return false;
  if (rateLimitType === "seven_day_sonnet" && o === "sonnet") return false;
  return true;
}
//@ chunk-3y22eg7d.js:15507-15835 placement
/**
 * 限额类型是否作用于当前模型。
 */
function limitAppliesToModel(rateLimitType, mainLoopModel) {
  switch (rateLimitType) {
    case "five_hour":
    case "seven_day":
    case "overage":
      return true;
    case "seven_day_opus":
      return isNonCustomOpusModel(getCanonicalName(mainLoopModel));
    case "seven_day_sonnet":
      return isNonCustomSonnetModel(getCanonicalName(mainLoopModel));
    case "seven_day_overage_included": {
      let publicModelDisplayName = getPublicModelDisplayName(parseUserSpecifiedModel(mainLoopModel));
      if (publicModelDisplayName === null) return false;
      let lower = publicModelDisplayName.toLowerCase();
      return overageIncludedModels().some((s) => s.toLowerCase() === lower);
    }
    case undefined:
      return false;
  }
  return false;
}
//@ chunk-3y22eg7d.js:15835-15930 placement
/**
 * 限额适用于该模型，或两者规范名相同。
 */
function limitAppliesToModelOrCanonical(e, t) {
  return (
    limitAppliesToModel(e.rateLimitType, t) ||
    getCanonicalName(e.model, {
      identity: true,
    }) ===
      getCanonicalName(t, {
        identity: true,
      })
  );
}
//@ chunk-3y22eg7d.js:15930-15955 placement
/**
 * 启动该会话的额度订阅。
 */
function startQuotaSubscriptionsFor(storageV5) {
  startQuotaSubscriptions(currentQuotaResumeState(), storageV5);
}
//@ chunk-3y22eg7d.js:15955-16260 placement
/**
 * 订阅额度拒绝、设置变化与会话切换。
 */
function startQuotaSubscriptions(e, storageV5) {
  if (e.limitsSubscriptionStarted) return;
  e.limitsSubscriptionStarted = true;
  e.storageV5 = storageV5;
  e.unsubscribeQuotaRejected = onQuotaRejected_2((o, n) => onQuotaRejected(e, o, n));
  rescanAutoContinueSetting(e);
  e.unsubscribeSettingsChanges = settingsChangeDetector.subscribe(() => {
    rescanAutoContinueSetting(e);
  });
  e.unsubscribeSessionSwitch = onSessionSwitch((o, n) => {
    if (isConversationResetSwitch(n)) {
      cancelAutoResume(e, "conversation_reset");
      e.handoffInProgress = false;
    }
  });
}
//@ chunk-3y22eg7d.js:16260-16426 placement
/**
 * 会话切换是否等同重置（clear/resume/remote_attach）。
 */
function isConversationResetSwitch(e) {
  switch (e) {
    case "clear":
    case "resume":
    case "remote_attach":
      return true;
    case "fork":
    case "cd":
    case "spare_claim":
    case "hydrate":
    case "startup_custom_id":
      return false;
  }
}
export {
  limitAppliesToModelOrCanonical,
  clearHandoffInProgress,
  autoResumePromptIfStale,
  isQuotaAutoResumeArmed,
  onQuotaResumeEvent,
  isConversationResetSwitch,
  cancelOnConversationReset,
  cancelQuotaAutoResume,
  isPhaseActive,
  hasPendingContinuation,
  isAutoArmedByItself,
  withQuotaResumeFire,
  shouldOfferAutoResumePrompt,
  noteHumanTakeover,
  dropStaleContinuation,
  claimTurn,
  releaseTurnClaim,
  autoArmQuotaAutoResume,
  isPendingContinuationUuid,
  isAutoContinuationPrompt,
  handleTurnCompletedAtLimit,
  isEpisodeActiveNow,
  isResetKeyArmed,
  confirmAndFire,
  isAutoContinueEnabled,
  isAutoContinueUserSetting,
  quotaAutoResumeState,
  canAutoResumeThisLimit,
  armQuotaAutoResumeFromDialog,
  onQuotaResumeChange,
  startQuotaSubscriptionsFor,
  tickAutoResume,
  cancelForHandoff,
  AUTO_CONTINUE_CANCEL_MESSAGES,
};

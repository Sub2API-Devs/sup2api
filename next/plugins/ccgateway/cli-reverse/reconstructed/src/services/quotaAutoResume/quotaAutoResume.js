/**
 * services/quotaAutoResume/quotaAutoResume.ts
 *
 * 2.1.316 新增：额度用尽后自动继续：额度重置时自动提交续写提示，可由对话框或自动装配、取消。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-peqtdyy5.js (79)
 * attribution: placement 79
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  isQueuedUserPrompt,
  isBatchHeadHumanCommand,
  removeByFilter,
  enqueue,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-peqtdyy5.js:928-1319 placement
/**
 * 额度重置提示语、按模型恢复的特性开关名，以及「额度提前可用」的续写提示文案。
 */
var LATER = "later";
var USAGE_RESET_PROMPT =
  "Your claude.ai usage limit has reset. Continue the task you were working on when the limit was reached; do not repeat work that is already complete.";
var TENGU_LANTERN_WICK_RESUME_BY_MODEL = "tengu_lantern_wick_resume_by_model";
var AVAILABLE_AGAIN_PROMPT =
  "Your claude.ai usage is available again before the usage-limit reset. Continue the task you were working on when the limit was reached; do not repeat work that is already complete.";
//@ chunk-peqtdyy5.js:1319-1385 placement
function isAutoContinuationPrompt(text) {
  return (
    text === USAGE_RESET_PROMPT ||
    text === AVAILABLE_AGAIN_PROMPT ||
    (isEpisodeActiveNow() && text.trim() === autoResumePrompt().trim())
  );
}
//@ chunk-peqtdyy5.js:1385-1449 placement
/**
 * 自动继续的时序常量：一条人类提示后最多续写次数、重装延迟表、触发抖动范围、宽限与延迟上限。
 */
var MAX_CONTINUATIONS_PER_HUMAN_PROMPT = 3;
var REARM_DELAYS_MS = [60000, 300000];
var MIN_JITTER_MS = 30000;
var MAX_JITTER_MS = 90000;
var MIN_GRACE_MS = 1800000;
var MAX_DELAY_MS = 21600000;
//@ chunk-peqtdyy5.js:1449-2227 placement
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
//@ chunk-peqtdyy5.js:2227-2244 placement
/**
 * 按 host 保存的额度自动继续状态。
 */
var quotaResumeStateSlots; // deferred: uses createQuotaAutoResumeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-peqtdyy5.js:2227", () => {
  quotaResumeStateSlots = new HostScoped(createQuotaAutoResumeState);
});
//@ chunk-peqtdyy5.js:2244-2339 placement
/**
 * 取当前 host 的额度自动继续状态对象（HostScoped），首次调用时登记 episode 活跃判定。
 */
function currentQuotaResumeState() {
  let host = getRootSession().host;
  let state = quotaResumeStateSlots.of(host);
  let provider = intentProviderSlot.of(host);
  if (!provider.provided) provider.provide(() => isEpisodeActive(state));
  return state;
}
//@ chunk-peqtdyy5.js:2339-2511 placement
function clampMs(value, fallback, minMs = 0) {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  let ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return fallback;
  return Math.min(Math.max(Math.round(ms), minMs), MAX_DELAY_MS);
}
//@ chunk-peqtdyy5.js:2511-2524 placement
var MAX_GRACE_MS = 60000;
//@ chunk-peqtdyy5.js:2524-2553 placement
function isAutoContinueEnabled() {
  return hasUnknownAutoContinueSetting(currentQuotaResumeState());
}
//@ chunk-peqtdyy5.js:2553-2605 placement
/**
 * 自动继续设置是否处于「未知」状态（出现 auto_restore_cancel 键）。
 */
function hasUnknownAutoContinueSetting(state) {
  return resolveAutoContinueEnabled(state.autoContinueKeyPresence);
}
//@ chunk-peqtdyy5.js:2605-2709 placement
/**
 * 会话重置时取消自动继续（auto_restore_cancel 除外）。
 */
function cancelOnConversationReset(reason) {
  let state = currentQuotaResumeState();
  if (reason === "auto_restore_cancel") return;
  if (!isEpisodeActive(state)) return;
  cancelAutoResume(state, "conversation_reset");
}
//@ chunk-peqtdyy5.js:2709-2718 placement
var MAX_SIDE_EFFECT_RESCANS = 2;
//@ chunk-peqtdyy5.js:2718-3182 placement
/**
 * 读取 autoContinueAtUsageLimit 的设置存在性，不可知时定时重试。
 */
async function rescanAutoContinueSetting(state, remainingRescans = MAX_SIDE_EFFECT_RESCANS) {
  try {
    state.autoContinueKeyPresence = await rawSettingsKeyPresence("autoContinueAtUsageLimit", state.storageV5);
  } catch (error) {
    state.autoContinueKeyPresence = "unknowable";
    logError(error);
  }
  if (state.autoContinueKeyPresence !== "unknowable") {
    state.revocationRescan = "idle";
    state.revocationRescanGeneration++;
  }
  clearTimeout(state.unknowableRescanTimer);
  if (state.autoContinueKeyPresence === "unknowable" && remainingRescans > 0) {
    state.unknowableRescanTimer = setTimeout(
      (state, rescansLeft) => {
        rescanAutoContinueSetting(state, rescansLeft);
      },
      state.unknowableRescanDelayMs,
      state,
      remainingRescans - 1,
    );
    state.unknowableRescanTimer.unref?.();
  }
}
//@ chunk-peqtdyy5.js:3182-3284 placement
/**
 * autoContinueAtUsageLimit 仅来自用户设置（或未设置）。
 */
function isAutoContinueUserSetting() {
  let source = getSecuritySensitiveSettingWithSources("autoContinueAtUsageLimit")[0]?.source;
  return source === undefined || source === "userSettings";
}
//@ chunk-peqtdyy5.js:3284-3361 placement
/**
 * 判断该限额能否自动继续：订阅用户、非按量计费、限额可续且开关允许。
 */
function canAutoResumeThisLimit(limit) {
  return (
    isClaudeAISubscriber() &&
    getOauthAccountInfo()?.billingType !== "usage_based" &&
    isAutoResumableLimit(limit) &&
    isAutoContinueFeatureEnabled()
  );
}
//@ chunk-peqtdyy5.js:3361-3393 placement
function quotaAutoResumeState() {
  return currentQuotaResumeState().state;
}
//@ chunk-peqtdyy5.js:3393-3478 placement
/**
 * 当前是否由 auto 路径装配了自动继续。
 */
function isAutoArmedByItself() {
  let state = currentQuotaResumeState();
  return state.state.phase === "armed" && state.episodeArmOrigin === "auto";
}
//@ chunk-peqtdyy5.js:3478-3582 placement
function noteRejectedResetKey(state) {
  let currentLimits = getCurrentLimits();
  if (currentLimits.status === "rejected" && currentLimits.resetsAt !== undefined)
    state.armedResetKeys.add(currentLimits.resetsAt);
}
//@ chunk-peqtdyy5.js:3582-3631 placement
/**
 * 该重置键是否已被装配过。
 */
function isResetKeyArmed(resetsAt) {
  return currentQuotaResumeState().armedResetKeys.has(resetsAt);
}
//@ chunk-peqtdyy5.js:3631-3678 placement
function isQuotaAutoResumeArmed() {
  return currentQuotaResumeState().state.phase === "armed";
}
//@ chunk-peqtdyy5.js:3678-3851 placement
function isEpisodeActive(state) {
  return (
    state.state.phase === "armed" ||
    state.state.phase === "stale" ||
    state.activeTurnClaim !== null ||
    state.dispatchingTakeoverUuids.size > 0 ||
    getCommandQueue().some((command) => isEpisodeCommand(state, command)) ||
    someInFlightDrainCommand((command) => isEpisodeCommand(state, command))
  );
}
//@ chunk-peqtdyy5.js:3851-3887 placement
/**
 * 排队命令是提示模式且可自动续写。
 */
function isPromptModeQueuedCommand(command) {
  return isQueuedUserPrompt(command) && isBatchHeadHumanCommand(command);
}
//@ chunk-peqtdyy5.js:3887-3993 placement
function isEpisodeCommand(state, command) {
  return (
    command.uuid !== undefined &&
    (command.uuid === state.pendingContinuationUuid || state.takeoverUuids.has(command.uuid))
  );
}
//@ chunk-peqtdyy5.js:3993-4022 placement
/**
 * 当前是否有进行中的自动继续 episode。
 */
function isEpisodeActiveNow() {
  return isEpisodeActive(currentQuotaResumeState());
}
//@ chunk-peqtdyy5.js:4022-4054 placement
/**
 * 给定阶段是否算作活跃（结合 pending 判断）。
 */
function isPhaseActive(phase) {
  return isActivePhase(currentQuotaResumeState(), phase);
}
//@ chunk-peqtdyy5.js:4054-4108 placement
/**
 * 阶段为 armed/stale 或存在待继续的 uuid 即视为活跃。
 */
function isActivePhase(state, phase) {
  return phase === "armed" || phase === "stale" || isPendingContinuationPresent(state);
}
//@ chunk-peqtdyy5.js:4108-4137 placement
/**
 * 当前是否有待继续的排队命令。
 */
function hasPendingContinuation() {
  return isPendingContinuationPresent(currentQuotaResumeState());
}
//@ chunk-peqtdyy5.js:4137-4227 placement
/**
 * 待继续的 uuid 仍存在于排队命令中。
 */
function isPendingContinuationPresent(state) {
  let pendingContinuationUuid = state.pendingContinuationUuid;
  return (
    pendingContinuationUuid !== null &&
    getCommandQueue().some((command) => command.uuid === pendingContinuationUuid)
  );
}
//@ chunk-peqtdyy5.js:4227-4294 placement
/**
 * 给定 uuid 是否为当前待继续的 uuid。
 */
function isPendingContinuationUuid(uuid) {
  return uuid !== undefined && uuid === currentQuotaResumeState().pendingContinuationUuid;
}
//@ chunk-peqtdyy5.js:4294-4341 placement
/**
 * 订阅自动继续事件。
 */
function onQuotaResumeEvent(listener) {
  return currentQuotaResumeState().events.subscribe(listener);
}
//@ chunk-peqtdyy5.js:4341-4389 placement
/**
 * 订阅自动继续状态变化。
 */
function onQuotaResumeChange(listener) {
  return currentQuotaResumeState().changed.subscribe(listener);
}
//@ chunk-peqtdyy5.js:4389-4432 placement
function _(slice, state) {
  slice.state = state;
  slice.changed.emit();
}
//@ chunk-peqtdyy5.js:4432-4553 placement
function jitterMs() {
  let autoContinueConfig = getAutoContinueConfig();
  let minMs = clampMs(autoContinueConfig.jitterMinMs, MIN_JITTER_MS);
  let max = Math.max(minMs, clampMs(autoContinueConfig.jitterMaxMs, MAX_JITTER_MS));
  return Math.round(minMs + Math.random() * (max - minMs));
}
//@ chunk-peqtdyy5.js:4553-4658 placement
function computeFireAtMs(resetsAtSeconds, rearmCount, nowMs) {
  let resetAtMs = resetsAtSeconds * 1000 + jitterMs();
  if (rearmCount === null) return resetAtMs;
  let rearmDelayMs = REARM_DELAYS_MS[rearmCount] ?? REARM_DELAYS_MS.at(-1) ?? 0;
  return Math.max(resetAtMs, nowMs + rearmDelayMs);
}
//@ chunk-peqtdyy5.js:4658-4722 placement
function armQuotaAutoResumeFromDialog(limits, nowMs = Date.now(), origin = "dialog", storageV5) {
  return armAutoResume(currentQuotaResumeState(), limits, nowMs, origin, storageV5);
}
//@ chunk-peqtdyy5.js:4722-5185 placement
/**
 * 装配自动继续（记录排队前的命令、上报事件）。
 */
function armAutoResume(state, limits, nowMs, episodeArmOrigin, storageV5) {
  if (!canAutoResumeThisLimit(limits)) return false;
  startQuotaSubscriptions(state, storageV5);
  state.consecutiveRearms = 0;
  if (episodeArmOrigin === "dialog") state.continuationsSinceHumanPrompt = 0;
  state.takeoverUuids.clear();
  state.dispatchingTakeoverUuids.clear();
  state.queuedBeforeArmUuids.clear();
  for (let command of getCommandQueue())
    if (isPromptModeQueuedCommand(command) || (command.mode === "bash" && isBatchHeadHumanCommand(command))) {
      command.uuid ??= randomUUID();
      state.queuedBeforeArmUuids.add(command.uuid);
    }
  state.armedAtMs = nowMs;
  logFeatureOk("quota_auto_resume");
  logEvent("tengu_quota_auto_resume_offer_armed", {
    origin: fromEnum(episodeArmOrigin),
  });
  setArmedState(state, limits.resetsAt ?? 0, null, nowMs, episodeArmOrigin);
  state.events.emit("armed");
  return true;
}
//@ chunk-peqtdyy5.js:5185-5596 placement
function autoArmQuotaAutoResume(limits, nowMs = Date.now(), storageV5) {
  let state = currentQuotaResumeState();
  if (!canAutoResumeThisLimit(limits)) return false;
  if (state.handoffInProgress) return false;
  if (!hasUnknownAutoContinueSetting(state) || !isAutoContinueAutoArmEnabled()) return false;
  if (isUnattendedInteractiveSession()) return false;
  let resetsAt = limits.resetsAt ?? 0;
  if (resetsAt * 1000 - nowMs > RATE_LIMIT_RESET_MAX_MS) return false;
  if (isOtherModelWeeklyLimit(limits.rateLimitType, getMainLoopModel())) return false;
  if (isEpisodeActive(state) || state.autoArmDedupeResetKeys.has(resetsAt)) return false;
  if (state.continuationsSinceHumanPrompt >= MAX_CONTINUATIONS_PER_HUMAN_PROMPT) {
    disableAutoResumeWithReason(state, resetsAt, "continuation_cap");
    return false;
  }
  if (!armAutoResume(state, limits, nowMs, "auto", storageV5)) return false;
  state.events.emit("auto-armed");
  return true;
}
//@ chunk-peqtdyy5.js:5596-5842 placement
/**
 * 回合结束时若停在额度上限：取状态变化（limitHitAtMs 毫秒时间戳），已 armed 则更新拒绝记录并比较重置时刻，否则走自动装配。
 */
function handleTurnCompletedAtLimit(isMainThread, terminalReason, limitHitAtMs = Date.now(), storageV5) {
  try {
    let limits = isMainThread && terminalReason === "completed" ? emitStatusChange(limitHitAtMs) : null;
    if (limits === null) return false;
    let state = currentQuotaResumeState();
    if (isEpisodeActive(state)) {
      onQuotaRejected(state, limits, "main_thread");
      return state.state.phase === "armed" && state.state.resetsAtSeconds === limits.resetsAt;
    }
    return autoArmQuotaAutoResume(limits, limitHitAtMs, storageV5);
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-peqtdyy5.js:5842-6263 placement
/**
 * 进入 armed 状态并记录重置时刻与触发时间。
 */
function setArmedState(state, resetsAtSeconds, rearmCount, nowMs, episodeArmOrigin = "dialog") {
  clearPendingContinuation(state);
  state.episodeArmOrigin = episodeArmOrigin;
  state.lastArmedResetsAtSeconds = resetsAtSeconds;
  state.autoArmDedupeResetKeys.add(resetsAtSeconds);
  state.armedResetKeys.add(resetsAtSeconds);
  noteRejectedResetKey(state);
  state.activeTurnClaim = null;
  state.sleptThroughReset = false;
  state.lastObservedMs = nowMs;
  let fireAtMs = computeFireAtMs(resetsAtSeconds, rearmCount, nowMs);
  logEvent("tengu_quota_auto_resume_armed", {
    resets_in_sec: Math.max(0, Math.round(resetsAtSeconds - nowMs / 1000)),
    rearm: rearmCount === null ? 0 : rearmCount + 1,
  });
  _(state, {
    phase: "armed",
    resetsAtSeconds,
    fireAtMs,
    consecutiveRearms: state.consecutiveRearms,
  });
}
//@ chunk-peqtdyy5.js:6263-6286 placement
/**
 * 触发前再确认一次并提交续写。
 */
function confirmAndFire() {
  confirmAndFire_2(currentQuotaResumeState());
}
//@ chunk-peqtdyy5.js:6286-6357 placement
/**
 * 包装一个函数：调用后（除非返回 false）再确认一次并触发续写。
 */
function withQuotaResumeFire(onDone) {
  return (...args) => {
    let result = onDone(...args);
    if (result !== false) confirmAndFire();
    return result;
  };
}
//@ chunk-peqtdyy5.js:6357-6836 placement
/**
 * 触发前再查一次主模型额度，确认可用才提交续写。
 */
async function confirmAndFire_2(state) {
  if (state.state.phase !== "armed") return;
  if (state.confirmingMainModel) {
    state.recheckRequestedWhileConfirming = true;
    return;
  }
  state.confirmingMainModel = true;
  try {
    for (;;) {
      state.recheckRequestedWhileConfirming = false;
      if (planModeConstituentFamily(getUserSpecifiedModelSetting()) !== null) return;
      let source = getMainLoopModel();
      let state_2 = state.state;
      let probe = await probeQuotaStatus(source, undefined, state.storageV5);
      if (state.state.phase !== "armed" || isAutoResumeDisabled(state)) return;
      if (state.recheckRequestedWhileConfirming || getMainLoopModel() !== source || state.state !== state_2)
        continue;
      if (probe === null || !isRejectionWorthRearming(probe)) return;
      fireAutoResume(state);
      return;
    }
  } catch (error) {
    logError(error);
  } finally {
    state.confirmingMainModel = false;
  }
}
//@ chunk-peqtdyy5.js:6836-7055 placement
function fireAutoResume(state) {
  submitContinuationPrompt(state, AVAILABLE_AGAIN_PROMPT);
  logEvent("tengu_quota_auto_resume_fired", {
    rearm: state.consecutiveRearms,
    waited_ms: Math.max(0, Math.round(Date.now() - state.armedAtMs)),
    early: 1,
  });
  state.lastObservedMs = null;
  _(state, {
    phase: "idle",
  });
  state.events.emit("fired-now");
}
//@ chunk-peqtdyy5.js:7055-7365 placement
/**
 * 取消原因是否来自用户按键。
 */
function isUserCancelReason(reason) {
  switch (reason) {
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
//@ chunk-peqtdyy5.js:7365-7675 placement
/**
 * 取消原因是否系统性（不发 cancelled 事件但清除去重键）。
 */
function isSilentCancelReason(reason) {
  switch (reason) {
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
//@ chunk-peqtdyy5.js:7675-7699 placement
function cancelQuotaAutoResume(reason) {
  cancelAutoResume(currentQuotaResumeState(), reason);
}
//@ chunk-peqtdyy5.js:7699-7926 placement
function cancelAutoResume(state, reason) {
  if (isEpisodeActive(state)) noteRejectedResetKey(state);
  if (isSilentCancelReason(reason)) state.autoArmDedupeResetKeys.clear();
  let wasActive = isActivePhase(state, state.state.phase);
  if (resetEpisode(state) && state.state.phase === "idle")
    logEvent("tengu_quota_auto_resume_cancelled", {
      reason: fromEnum(reason),
    });
  goIdle(state, reason);
  if (wasActive && isUserCancelReason(reason)) state.events.emit("cancelled");
}
//@ chunk-peqtdyy5.js:7926-8846 placement
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
//@ chunk-peqtdyy5.js:8846-8954 placement
/**
 * 交接时取消自动继续，返回是否原本处于活动。
 */
function cancelForHandoff(reason) {
  let state = currentQuotaResumeState();
  state.handoffInProgress = true;
  if (!isEpisodeActive(state)) return false;
  let wasActive = isActivePhase(state, state.state.phase);
  cancelAutoResume(state, reason);
  return wasActive;
}
//@ chunk-peqtdyy5.js:8954-8994 placement
/**
 * 清除「接管进行中」标记。
 */
function clearHandoffInProgress() {
  currentQuotaResumeState().handoffInProgress = false;
}
//@ chunk-peqtdyy5.js:8994-9176 placement
/**
 * 用户提交命令时标记接管。
 */
function noteHumanTakeover(uuid, { dispatching = false } = {}) {
  let state = currentQuotaResumeState();
  state.continuationsSinceHumanPrompt = 0;
  if (!isEpisodeActive(state)) return;
  settleOnManualSubmit(state);
  state.takeoverUuids.add(uuid);
  if (dispatching) state.dispatchingTakeoverUuids.add(uuid);
  state.changed.emit();
}
//@ chunk-peqtdyy5.js:9176-9388 placement
function clearPendingContinuation(state, { keepIfDrained = false } = {}) {
  if (state.pendingContinuationUuid === null) return false;
  let pendingContinuationUuid = state.pendingContinuationUuid;
  let removed = removeByFilter((command) => command.uuid === pendingContinuationUuid).length > 0;
  if (removed || !keepIfDrained) {
    state.pendingContinuationUuid = null;
    state.changed.emit();
  }
  return removed;
}
//@ chunk-peqtdyy5.js:9388-9866 placement
/**
 * 需要上报的取消原因。
 */
function isReportedCancelReason(reason) {
  switch (reason) {
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
//@ chunk-peqtdyy5.js:9866-9997 placement
function goIdle(state, reason) {
  if (state.state.phase === "idle") return;
  if (isReportedCancelReason(reason))
    logEvent("tengu_quota_auto_resume_cancelled", {
      reason: fromEnum(reason),
    });
  _(state, {
    phase: "idle",
  });
}
//@ chunk-peqtdyy5.js:9997-10623 placement
/**
 * 每次时钟检查：记录观察时间，若中间间隔超过宽限且已过触发点则标记“睡过了”；未到触发点返回 pending； 睡过时转 stale 并上报；否则提交续写提示、上报 fired 并回到 idle。
 */
function tickAutoResume(nowMs, isLoading) {
  let state = currentQuotaResumeState();
  if (state.state.phase !== "armed" || isAutoResumeDisabled(state)) return "idle";
  let lastObservedMs = state.lastObservedMs ?? state.state.fireAtMs;
  state.lastObservedMs = nowMs;
  let elapsedMs = nowMs - lastObservedMs;
  let graceMs = clampMs(getAutoContinueConfig().graceMs, MIN_GRACE_MS, MAX_GRACE_MS);
  if (elapsedMs > graceMs && nowMs >= state.state.fireAtMs) state.sleptThroughReset = true;
  if (isLoading || nowMs < state.state.fireAtMs) return "pending";
  if (state.sleptThroughReset) {
    state.sleptThroughReset = false;
    logFeatureSad("quota_auto_resume", "stale");
    logEvent("tengu_quota_auto_resume_stale", {
      late_by_ms: Math.round(nowMs - state.state.fireAtMs),
    });
    _(state, {
      phase: "stale",
    });
    state.events.emit("stale");
    return "stale";
  }
  submitContinuationPrompt(state);
  logEvent("tengu_quota_auto_resume_fired", {
    rearm: state.state.consecutiveRearms,
    waited_ms: Math.max(0, Math.round(nowMs - state.armedAtMs)),
  });
  goIdle(state, "fired");
  return "fired";
}
//@ chunk-peqtdyy5.js:10623-10953 placement
function autoResumePrompt() {
  let servedText = servedTextForModel(TENGU_LANTERN_WICK_RESUME_BY_MODEL, getMainLoopModel());
  if (isBotProtectedWrapUpTextOn()) {
    let sanitized = sanitizeAttributeValue(servedText);
    if (
      sanitized === null ||
      /[/@]/.test(sanitized) ||
      EXIT_COMMAND_WORDS.includes(sanitized) ||
      hyphenateUltraKeyword(sanitized) !== sanitized
    ) {
      if (servedText !== undefined && servedText.trim() !== "")
        logFeatureSad("usage_limit_served_text_rejected", "resume_prompt");
      return USAGE_RESET_PROMPT;
    }
    if (servedText !== undefined && sanitized !== servedText.trim())
      logFeatureSad("usage_limit_served_text_altered", "resume_prompt");
    return sanitized;
  }
  return servedText !== undefined && servedText.trim() !== "" ? servedText : USAGE_RESET_PROMPT;
}
//@ chunk-peqtdyy5.js:10953-11227 placement
function submitContinuationPrompt(state, value = autoResumePrompt()) {
  clearPendingContinuation(state);
  state.continuationsSinceHumanPrompt++;
  let uuid = randomUUID();
  state.pendingContinuationUuid = uuid;
  state.activeTurnClaim = null;
  state.changed.emit();
  enqueue({
    agentId: mainAgentId(),
    mode: "prompt",
    priority: LATER,
    value,
    uuid,
    origin: {
      kind: "auto-continuation",
    },
    isMeta: true,
    skipSlashCommands: true,
    workload: WORKLOAD_CRON,
  });
}
//@ chunk-peqtdyy5.js:11227-11264 placement
/**
 * 处于 stale 且未被禁用时返回续写提示，否则 null。
 */
function autoResumePromptIfStale() {
  return shouldOfferAutoResumePrompt() ? autoResumePrompt() : null;
}
//@ chunk-peqtdyy5.js:11264-11327 placement
/**
 * 当前是否应提供续写提示（stale 且未被禁用）。
 */
function shouldOfferAutoResumePrompt() {
  let state = currentQuotaResumeState();
  return state.state.phase === "stale" && !isAutoResumeDisabled(state);
}
//@ chunk-peqtdyy5.js:11327-11479 placement
/**
 * 续写已无效时从待执行命令中移除。
 */
function dropStaleContinuation(commands) {
  let state = currentQuotaResumeState();
  let pendingContinuationUuid = state.pendingContinuationUuid;
  if (
    pendingContinuationUuid === null ||
    !commands.some((command) => command.uuid === pendingContinuationUuid)
  )
    return commands;
  if (!isAutoResumeDisabled(state)) return commands;
  return commands.filter((command) => command.uuid !== pendingContinuationUuid);
}
//@ chunk-peqtdyy5.js:11479-11929 placement
/**
 * 自动装配是否仍被设置允许（必要时重新扫描）。
 */
function shouldHonorAutoArm(state) {
  if (state.episodeArmOrigin !== "auto" || hasUnknownAutoContinueSetting(state)) {
    state.revocationRescan = "idle";
    return false;
  }
  if (getAutoContinueSettingValue() === undefined && state.autoContinueKeyPresence === "unknowable") {
    if (state.revocationRescan === "idle") {
      state.revocationRescan = "pending";
      let generation = ++state.revocationRescanGeneration;
      rescanAutoContinueSetting(state).finally(() => {
        if (state.revocationRescan === "pending" && generation === state.revocationRescanGeneration)
          state.revocationRescan = "done";
      });
      return false;
    }
    if (state.revocationRescan === "pending") return false;
  }
  state.revocationRescan = "idle";
  return true;
}
//@ chunk-peqtdyy5.js:11929-12028 placement
/**
 * 自动继续是否被禁用（开关或设置）。
 */
function isAutoResumeDisabled(state) {
  if (!isAutoContinueRemoteEnabled()) {
    disableAutoResume(state, "killswitch");
    return true;
  }
  if (shouldHonorAutoArm(state)) {
    disableAutoResume(state, "setting_off");
    return true;
  }
  return false;
}
//@ chunk-peqtdyy5.js:12028-12249 placement
function settleOnManualSubmit(state) {
  clearPendingContinuation(state, {
    keepIfDrained: true,
  });
  if (state.state.phase === "stale") {
    logEvent("tengu_quota_auto_resume_stale_resumed", {});
    state.lastObservedMs = null;
    goIdle(state, "stale");
  } else if (state.state.phase === "armed") {
    state.lastObservedMs = null;
    goIdle(state, "manual_submit");
  }
}
//@ chunk-peqtdyy5.js:12249-12467 placement
function disableAutoResume(state, reason) {
  logEvent("tengu_quota_auto_resume_cancelled", {
    reason: fromEnum(reason),
  });
  resetEpisode(state);
  _(state, {
    phase: "idle",
  });
  state.events.emit(
    reason === "horizon_exceeded"
      ? "horizon-exceeded"
      : reason === "rearm_cap" || reason === "continuation_cap"
        ? "cap-exhausted"
        : "disabled",
  );
}
//@ chunk-peqtdyy5.js:12467-12549 placement
/**
 * 上报坏事件、记录去重键并禁用自动继续。
 */
function disableAutoResumeWithReason(state, resetsAt, reason) {
  logFeatureBad("quota_auto_resume", reason);
  state.autoArmDedupeResetKeys.add(resetsAt);
  disableAutoResume(state, reason);
}
//@ chunk-peqtdyy5.js:12549-12624 placement
/**
 * 是否由 auto 装配且重置时间仍在可等待范围内。
 */
function isAutoArmBeyondHorizon(state, resetsAtSeconds) {
  return state.episodeArmOrigin === "auto" && resetsAtSeconds * 1000 - Date.now() > RATE_LIMIT_RESET_MAX_MS;
}
//@ chunk-peqtdyy5.js:12624-13412 placement
/**
 * 回合开始时判定是续写还是接管并认领。
 */
function claimTurn(turn) {
  let state = currentQuotaResumeState();
  for (let turnUuid of turn.turnUuids) state.dispatchingTakeoverUuids.delete(turnUuid);
  if (turn.isHumanTakeover) state.continuationsSinceHumanPrompt = 0;
  let isContinuation =
    state.pendingContinuationUuid !== null && turn.turnUuids.includes(state.pendingContinuationUuid);
  let any = turn.turnUuids.some((turnUuid) => state.takeoverUuids.has(turnUuid));
  let wasActive = isActivePhase(state, state.state.phase) || isContinuation;
  let onlyQueuedBeforeArm =
    turn.isHumanTakeover &&
    !any &&
    turn.humanCommandUuids.length > 0 &&
    turn.humanCommandUuids.every(
      (humanCommandUuid) =>
        humanCommandUuid !== undefined && state.queuedBeforeArmUuids.has(humanCommandUuid),
    );
  let kind = null;
  if (onlyQueuedBeforeArm && !isContinuation) return null;
  if (onlyQueuedBeforeArm) kind = "continuation";
  else if (turn.isHumanTakeover && (any || wasActive)) {
    kind = "takeover";
    settleOnManualSubmit(state);
  } else if (isContinuation) kind = "continuation";
  if (kind === null) return null;
  if (state.activeTurnClaim !== null)
    logError(Error("quota auto-resume: a turn claimed the episode while another claim was outstanding"));
  let claim = {
    kind,
    queried: turn.willQuery,
  };
  state.activeTurnClaim = claim;
  state.changed.emit();
  return claim;
}
//@ chunk-peqtdyy5.js:13412-13913 placement
/**
 * 回合结束释放认领，续写被丢弃时上报。
 */
function releaseTurnClaim(claim, turnUuids) {
  let state = currentQuotaResumeState();
  for (let uuid of turnUuids) state.dispatchingTakeoverUuids.delete(uuid);
  if (claim !== null) {
    if (claim !== state.activeTurnClaim) return;
    state.activeTurnClaim = null;
    state.changed.emit();
    if (state.state.phase !== "idle") return;
    if (getCommandQueue().some((command) => isEpisodeCommand(state, command))) return;
    resetEpisode(state);
    if (claim.kind === "continuation" && !claim.queried) reportContinuationDropped(state);
    return;
  }
  let hadPending =
    state.pendingContinuationUuid !== null && turnUuids.includes(state.pendingContinuationUuid);
  if (
    (hadPending || turnUuids.some((uuid) => state.takeoverUuids.has(uuid))) &&
    state.state.phase === "idle" &&
    state.activeTurnClaim === null &&
    !getCommandQueue().some((command) => isEpisodeCommand(state, command))
  ) {
    resetEpisode(state);
    if (hadPending) reportContinuationDropped(state);
  }
}
//@ chunk-peqtdyy5.js:13913-14085 placement
function reportContinuationDropped(state) {
  logFeatureBad("quota_auto_resume", "continuation_dropped");
  logEvent("tengu_quota_auto_resume_cancelled", {
    reason: fromEnum("continuation_dropped"),
  });
  state.events.emit("continuation-dropped");
}
//@ chunk-peqtdyy5.js:14085-14407 placement
/**
 * 重置本次自动继续的全部计数与集合。
 */
function resetEpisode(state) {
  state.consecutiveRearms = 0;
  state.lastArmedResetsAtSeconds = 0;
  state.episodeArmOrigin = "dialog";
  state.revocationRescan = "idle";
  state.revocationRescanGeneration++;
  state.takeoverUuids.clear();
  state.dispatchingTakeoverUuids.clear();
  state.queuedBeforeArmUuids.clear();
  state.lastObservedMs = null;
  state.activeTurnClaim = null;
  let removed = clearPendingContinuation(state);
  state.changed.emit();
  return removed;
}
//@ chunk-peqtdyy5.js:14407-14495 placement
/**
 * 该拒绝结果是否仍值得重新装配（非 rejected 或正在用超额额度）。
 */
function isRejectionWorthRearming(limits) {
  return limits.status !== "rejected" || limits.isUsingOverage === true || limits.overageInUse === true;
}
//@ chunk-peqtdyy5.js:14495-15140 placement
/**
 * 收到额度拒绝时重新装配或推迟。
 */
function onQuotaRejected(state, limits, source) {
  if (!isAutoResumableLimit(limits) || !isAutoContinueEligibleSession()) return;
  let resetsAt = limits.resetsAt ?? 0;
  if (isEpisodeActive(state) && limitAppliesToModel(limits.rateLimitType, getMainLoopModel()))
    state.autoArmDedupeResetKeys.add(resetsAt);
  if (state.state.phase === "armed") {
    if (
      resetsAt * 1000 > state.state.fireAtMs &&
      limitAppliesToModel(limits.rateLimitType, getMainLoopModel())
    )
      rearm(state, resetsAt, null);
    return;
  }
  if (isPendingContinuationPresent(state)) return;
  if (state.state.phase === "stale") return;
  let activeTurnClaim = state.activeTurnClaim;
  if (activeTurnClaim === null) return;
  if (source !== "main_thread") return;
  if (activeTurnClaim.kind === "takeover") {
    state.consecutiveRearms = 0;
    if (
      rearm(
        state,
        limitAppliesToModel(limits.rateLimitType, getMainLoopModel())
          ? resetsAt
          : state.lastArmedResetsAtSeconds,
        null,
      ) &&
      state.episodeArmOrigin === "auto"
    )
      state.events.emit("taken-over");
    return;
  }
  if (state.continuationsSinceHumanPrompt >= MAX_CONTINUATIONS_PER_HUMAN_PROMPT) {
    disableAutoResumeWithReason(state, resetsAt, "rearm_cap");
    return;
  }
  let consecutiveRearms = state.consecutiveRearms;
  state.consecutiveRearms++;
  rearm(state, resetsAt, consecutiveRearms);
}
//@ chunk-peqtdyy5.js:15140-15294 placement
function rearm(state, resetsAtSeconds, rearmCount) {
  if (isAutoResumeDisabled(state)) return false;
  if (isAutoArmBeyondHorizon(state, resetsAtSeconds)) {
    disableAutoResume(state, "horizon_exceeded");
    return false;
  }
  setArmedState(state, resetsAtSeconds, rearmCount, Date.now(), state.episodeArmOrigin);
  state.events.emit("rearmed");
  return true;
}
//@ chunk-peqtdyy5.js:15294-15506 placement
function isOtherModelWeeklyLimit(rateLimitType, mainLoopModel) {
  if (rateLimitType !== "seven_day_opus" && rateLimitType !== "seven_day_sonnet") return false;
  if (limitAppliesToModel(rateLimitType, mainLoopModel)) return false;
  let configuredModel = planModeConstituentFamily(getUserSpecifiedModelSetting());
  if (rateLimitType === "seven_day_opus" && configuredModel === "opus") return false;
  if (rateLimitType === "seven_day_sonnet" && configuredModel === "sonnet") return false;
  return true;
}
//@ chunk-peqtdyy5.js:15506-15834 placement
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
      return overageIncludedModels().some((includedModel) => includedModel.toLowerCase() === lower);
    }
    case undefined:
      return false;
  }
  return false;
}
//@ chunk-peqtdyy5.js:15834-15929 placement
/**
 * 限额适用于该模型，或两者规范名相同。
 */
function limitAppliesToModelOrCanonical(limits, model) {
  return (
    limitAppliesToModel(limits.rateLimitType, model) ||
    getCanonicalName(limits.model, {
      identity: true,
    }) ===
      getCanonicalName(model, {
        identity: true,
      })
  );
}
//@ chunk-peqtdyy5.js:15929-15954 placement
/**
 * 启动该会话的额度订阅。
 */
function startQuotaSubscriptionsFor(storageV5) {
  startQuotaSubscriptions(currentQuotaResumeState(), storageV5);
}
//@ chunk-peqtdyy5.js:15954-16259 placement
/**
 * 订阅额度拒绝、设置变化与会话切换。
 */
function startQuotaSubscriptions(state, storageV5) {
  if (state.limitsSubscriptionStarted) return;
  state.limitsSubscriptionStarted = true;
  state.storageV5 = storageV5;
  state.unsubscribeQuotaRejected = onQuotaRejected_2((limits, source) =>
    onQuotaRejected(state, limits, source),
  );
  rescanAutoContinueSetting(state);
  state.unsubscribeSettingsChanges = settingsChangeDetector.subscribe(() => {
    rescanAutoContinueSetting(state);
  });
  state.unsubscribeSessionSwitch = onSessionSwitch((from, to) => {
    if (isConversationResetSwitch(to)) {
      cancelAutoResume(state, "conversation_reset");
      state.handoffInProgress = false;
    }
  });
}
//@ chunk-peqtdyy5.js:16259-16425 placement
/**
 * 会话切换是否等同重置（clear/resume/remote_attach）。
 */
function isConversationResetSwitch(switchReason) {
  switch (switchReason) {
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
  confirmAndFire,
  isPhaseActive,
  armQuotaAutoResumeFromDialog,
  withQuotaResumeFire,
  cancelQuotaAutoResume,
  hasPendingContinuation,
  canAutoResumeThisLimit,
  shouldOfferAutoResumePrompt,
  noteHumanTakeover,
  dropStaleContinuation,
  claimTurn,
  releaseTurnClaim,
  isQuotaAutoResumeArmed,
  isPendingContinuationUuid,
  cancelForHandoff,
  AUTO_CONTINUE_CANCEL_MESSAGES,
  clearHandoffInProgress,
  autoResumePromptIfStale,
  onQuotaResumeEvent,
  isConversationResetSwitch,
  cancelOnConversationReset,
  isAutoArmedByItself,
  autoArmQuotaAutoResume,
  isAutoContinuationPrompt,
  handleTurnCompletedAtLimit,
  isEpisodeActiveNow,
  isResetKeyArmed,
  quotaAutoResumeState,
  isAutoContinueEnabled,
  isAutoContinueUserSetting,
  onQuotaResumeChange,
  startQuotaSubscriptionsFor,
  tickAutoResume,
};

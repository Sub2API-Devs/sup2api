/**
 * utils/fastMode.ts
 *
 * Fast mode（内部代号 penguin）：仅第一方 API；组织开关预取（/api/claude_code_penguin_mode）、不可用原因与提示、运行期冷却、被 API 拒绝/超额拒绝后的处理，以及请求里 speed:"fast" 的判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fastMode.ts
 * pieces: chunk-avy0g5d4.js (2), chunk-exfmq47h.js (63), chunk-x2n44e87.js (1)
 * attribution: callgraph-fingerprint 1, affinity 1, callgraph-witnessed 1, layout 34, fingerprint 13, placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getAPIProvider } from "./model/providers.js";
import { env } from "./env.js";
import { isServiceAgentSession, isAgentSessionWorker } from "../services/ccrAgentProxy/agentProxy.js";
import { hasSessionIngressAuthToken } from "./sessionIngressAuth.js";
import {
  hasProfileScope,
  hasOAuthScope,
  getUsageCreditsCommand,
  isExtraUsageAllowed,
  getTurnOnUsageCreditsStep,
  getClaudeAIOAuthTokens,
  getAnthropicApiKeySafe,
  handleOAuth401Error,
} from "./auth.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { isCoworkEntrypoint } from "./entrypointKinds.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { isArtifactMountMode } from "../services/artifacts/artifactMount.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isModelAllowed } from "./model/modelAllowlist.js";
import { getDefaultMainLoopModelSetting } from "./model/planModeModel.js";
import { getMainLoopModel, strip1mTag } from "./model/model.js";
import { isRemoteControlChannelAvailable, isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { getSettingsForSource, getInitialSettings, updateSettingsForSource } from "./settings/settings.js";
import {
  getIsNonInteractiveSession,
  preferThirdPartyAuthentication,
  setFlagSettingsInline,
  getFlagSettingsInline,
} from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import {
  parseUserSpecifiedModel,
  getPublicModelDisplayName,
  opus1mMergeTagsDefaultOpus,
} from "./model/modelDisplay.js";
import { modelSupportsCapability } from "./model/modelCatalog.js";
import { getCanonicalName, strippedCanonicalName } from "./model/canonicalModelName.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { createSignal } from "./signal.js";
import { identity as identity_2 } from "./identity.js";
import { logError } from "./log.js";
import { toError, sanitizedMachineReasonForTelemetry } from "./errors.js";
import { enqueueTaskNotification } from "./task/taskNotifications.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../constants/oauth.js";
import { claudeCodeUserAgent } from "./http.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { apiKeyForHost } from "../services/analytics/telemetryCredentialGuard.js";
import { eagerParseCliFlag } from "./cliArgs.js";
import { invalidateCommandNames } from "./settings/commandSyncNames.js";
import { syncRespawnFlag } from "../services/daemon/jobState.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:365202-365287 callgraph-witnessed (2.1.88 match: isFastModeEnabled, 0.65)
/**
 * fast mode 总开关：只在第一方 API 且未设置 CLAUDE_CODE_DISABLE_FAST_MODE 时为真。
 */
function isFastModeEnabled() {
  if (getAPIProvider() !== "firstParty") return false;
  return !env.CLAUDE_CODE_DISABLE_FAST_MODE;
}
//@ chunk-exfmq47h.js:365287-365321 layout
/**
 * 当前令牌是代码代理/CCR session worker 身份（无账号 uuid、带 code_agent_id）时为真；此时跳过组织预取。
 */
function isCcrSessionWorkerToken() {
  return isServiceAgentSession() || isAgentSessionWorker();
}
//@ chunk-exfmq47h.js:365321-365388 layout
/**
 * CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK 且非远程托管入口时跳过组织检查。
 */
function shouldSkipFastModeOrgCheck() {
  return env.CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK && !isRemoteManagedEntrypoint();
}
//@ chunk-exfmq47h.js:365388-365422 layout
/**
 * fast mode 开且有 session ingress 令牌。
 */
function hasSessionIngressAuthForFastMode() {
  return isFastModeEnabled() && hasSessionIngressAuthToken();
}
//@ chunk-exfmq47h.js:365422-365488 layout
/**
 * 有 profile scope，或 CCR 推理 scope 的会话令牌，可用 OAuth 查组织 fast 状态。
 */
function canFetchFastModeStatusWithOAuth() {
  return (
    hasProfileScope() ||
    (hasSessionIngressAuthForFastMode() && hasOAuthScope("user:ccr_inference") && !isCcrSessionWorkerToken())
  );
}
//@ chunk-exfmq47h.js:365488-365520 layout
/**
 * CLAUDE_CODE_REMOTE 且入口属于远程托管集合。
 */
function isRemoteManagedEntrypoint() {
  return isRemoteManagedEnvironment() && isCoworkEntrypoint();
}
//@ chunk-exfmq47h.js:365520-365579 layout
/**
 * 非远程托管时读全局配置缓存 penguinModeOrgEnabled。
 */
function isOrgFastModeEnabledCached() {
  return !isRemoteManagedEntrypoint() && getGlobalConfig().penguinModeOrgEnabled === true;
}
//@ chunk-exfmq47h.js:365579-365638 layout
/**
 * 远程托管入口下组织状态为 enabled。
 */
function isRemoteOrgFastModeEnabled() {
  return isRemoteManagedEntrypoint() && fastModeState.orgStatus.status === "enabled";
}
//@ chunk-exfmq47h.js:365638-365691 layout
/**
 * fast mode 开且 getFastModeUnavailableReason 为空。
 */
function isFastModeAvailable(model) {
  if (!isFastModeEnabled()) return false;
  return getFastModeUnavailableMessage(model) === null;
}
//@ chunk-exfmq47h.js:365691-365901 layout
/**
 * "Fast mode requires usage credits" 加开启额度的指引。
 */
function getUsageCreditsRequiredMessage() {
  let usageCreditsCommand = getUsageCreditsCommand();
  if (usageCreditsCommand)
    return `${"Fast mode requires usage credits"} \xB7 ${usageCreditsCommand} to turn them on`;
  return isArtifactMountMode() && isExtraUsageAllowed()
    ? `${"Fast mode requires usage credits"} \xB7 ${getTurnOnUsageCreditsStep()}`
    : "Fast mode requires usage credits";
}
//@ chunk-exfmq47h.js:365901-366323 fingerprint (2.1.88 match: getDisabledReasonMessage, 1)
/**
 * 组织层面禁用原因 → 提示文案（free/preference/extra_usage_disabled/network_error/unknown）。
 */
function getDisabledReasonMessage(disabledReason, authType) {
  switch (disabledReason) {
    case "free":
      return authType === "oauth"
        ? "Fast mode requires a paid subscription"
        : "Fast mode unavailable during evaluation. Please purchase credits.";
    case "preference":
      return "Fast mode has been disabled by your organization";
    case "extra_usage_disabled":
      return getUsageCreditsRequiredMessage();
    case "network_error":
      return "Fast mode unavailable due to network connectivity issues";
    case "unknown":
      return "Fast mode is currently unavailable";
  }
}
//@ chunk-exfmq47h.js:366323-367091 layout
/**
 * 不可用原因码：not_first_party/disabled_by_env、tengu_penguins_off、model_not_allowed（opus 不在 allowlist）、托管设置 fastMode=false 或 fastModePerSessionOptIn、SDK 需显式开启、pending、组织 disabled 原因；可用时 null。
 */
function getFastModeUnavailableReasonCode(
  model,
  { sessionOptIn = false, sessionOnly = false, orgStatus = fastModeState.orgStatus } = {},
) {
  if (!isFastModeEnabled()) return getAPIProvider() !== "firstParty" ? "not_first_party" : "disabled_by_env";
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_penguins_off", null) !== null) return "unknown";
  if (!isModelAllowed(defaultOpusAlias())) {
    let mainLoopModel =
      model !== undefined ? (model ?? getDefaultMainLoopModelSetting()) : getMainLoopModel();
    if (!(
      !isRemoteControlChannelAvailable() &&
      supportsFastMode(mainLoopModel) &&
      isModelAllowed(mainLoopModel)
    ))
      return "model_not_allowed";
  }
  let optedIn = sessionOptIn || getSettingsForSource("flagSettings")?.fastMode === true;
  if (getSettingsForSource("policySettings")?.fastMode === false) return "preference";
  if (
    (sessionOptIn || sessionOnly) &&
    getSettingsForSource("policySettings")?.fastModePerSessionOptIn === true
  )
    return "preference";
  if (getIsNonInteractiveSession() && preferThirdPartyAuthentication() && !optedIn)
    return "sdk_opt_in_required";
  let active = optedIn && !isRemoteManagedEntrypoint();
  if (orgStatus.status === "pending" && !shouldSkipFastModeOrgCheck() && !active) return "pending";
  if (orgStatus.status === "disabled" && (!shouldSkipFastModeOrgCheck() || orgStatus.source === "server")) {
    if (
      isTransientFastModeReason(orgStatus.reason) &&
      ((env.CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS && !isRemoteManagedEntrypoint()) || active)
    )
      return null;
    return orgStatus.reason;
  }
  return null;
}
//@ chunk-exfmq47h.js:367091-367203 layout
/**
 * 原因码转文案并打调试日志，可用时 null。
 */
function getFastModeUnavailableMessage(model, fastModeCheckOptions = {}) {
  let fastModeUnavailableReasonCode = getFastModeUnavailableReasonCode(model, fastModeCheckOptions);
  if (fastModeUnavailableReasonCode === null) return null;
  let fastModeUnavailableReason = getFastModeUnavailableReason(fastModeUnavailableReasonCode);
  logForDebugging(`Fast mode unavailable: ${fastModeUnavailableReason}`);
  return fastModeUnavailableReason;
}
//@ chunk-exfmq47h.js:367203-367790 fingerprint (2.1.88 match: getFastModeUnavailableReason, 0.44)
/**
 * 原因码 → 面向用户文案。
 */
function getFastModeUnavailableReason(disabledReason) {
  switch (disabledReason) {
    case "not_first_party":
      return "Fast mode is only available when using the Anthropic API directly";
    case "disabled_by_env":
      return "Fast mode is not available";
    case "model_not_allowed":
      return `${defaultOpusLabel()} is not in your organization's allowed models`;
    case "sdk_opt_in_required":
      return "Fast mode is not available in the Agent SDK";
    case "pending":
      return "Checking fast mode availability";
    case "unknown":
      return (
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_penguins_off", null) ??
        getDisabledReasonMessage("unknown", "oauth")
      );
    case "free":
    case "preference":
    case "extra_usage_disabled":
    case "network_error":
      return getDisabledReasonMessage(
        disabledReason,
        getClaudeAIOAuthTokens() !== null ? "oauth" : "api-key",
      );
  }
}
//@ chunk-exfmq47h.js:367790-367849 placement
/**
 * 默认 Opus 模型的显示名。
 */
function defaultOpusLabel() {
  let userSpecifiedModel = parseUserSpecifiedModel(strip1mTag(defaultOpusAlias()));
  return getPublicModelDisplayName(strip1mTag(userSpecifiedModel)) ?? "Opus";
}
//@ chunk-exfmq47h.js:367849-367895 placement
/**
 * 默认 Opus 别名（是否带 [1m]）。
 */
function defaultOpusAlias() {
  return opus1mMergeTagsDefaultOpus() ? "opus[1m]" : "opus";
}
//@ chunk-exfmq47h.js:367895-367966 placement
/**
 * 判断某请求模型在给定条件下是否走快速模式（需快速模式可用且满足模型/账号条件）。
 */
function isFastModeOnForRequestModel(model, fastMode, options) {
  if (!isFastModeEnabled()) return false;
  return (
    isFastModeOnForModel(model, options) && (isRemoteSessionAvailable() || isFastModeAvailable() || fastMode)
  );
}
//@ chunk-exfmq47h.js:367966-368055 placement
/**
 * 判断快速模式设置是否当前生效（开关、模型支持与组织设置均满足）。
 */
function isFastModeSettingActive(fastMode) {
  if (!isFastModeEnabled()) return false;
  if (!isFastModeAvailable(fastMode)) return false;
  if (!supportsFastMode(fastMode)) return false;
  return isFastModeSettingOn(getInitialSettings());
}
//@ chunk-exfmq47h.js:368055-368262 placement
/**
 * 判断设置中的 fast mode 是否生效：开启且不要求按会话选择，或按会话选择时由 --settings 打开（策略强制按会话选择时不算）。
 */
function isFastModeSettingOn(settings, fastMode) {
  if (settings.fastMode !== true) return false;
  if (!settings.fastModePerSessionOptIn) return true;
  if (getSettingsForSource("policySettings")?.fastModePerSessionOptIn === true) return false;
  return (fastMode ? fastMode.flagFastMode : getSettingsForSource("flagSettings")?.fastMode) === true;
}
//@ chunk-exfmq47h.js:368262-368388 layout
/**
 * 按设置重算 fastMode 写回应用状态，开启时预取快速模式状态。
 */
function refreshFastModeFromSettings(session, setState, options) {
  setState((prev) => {
    let isOn = isFastModeSettingOn(prev.settings);
    return prev.fastMode === isOn
      ? prev
      : {
          ...prev,
          fastMode: isOn,
        };
  });
  if (isFastModeOrgPending(session().fastMode === true)) prefetchFastModeStatus(options);
}
//@ chunk-exfmq47h.js:368388-368455 placement
/**
 * 比较设置中的快速模式与当前实际状态是否不一致。
 */
function fastModeSettingDiverges(input) {
  let settingOn = isFastModeSettingOn(input.settings);
  return settingOn !== input.fastMode || isFastModeOrgPending(settingOn);
}
//@ chunk-exfmq47h.js:368455-368573 placement
function isFastModeOrgPending(orgStatus) {
  let orgStatus_2 = fastModeState.orgStatus;
  let pending =
    orgStatus_2.status === "pending" || (orgStatus_2.status === "disabled" && orgStatus_2.source === "guess");
  return orgStatus && isRemoteManagedEntrypoint() && pending;
}
//@ chunk-exfmq47h.js:368573-368652 placement
/**
 * 订阅组织级快速模式变化，立即触发一次并返回退订函数。
 */
function subscribeOrgFastModeChange(listener, options, options_2) {
  let onChange = () => {
    if (isFastModeEnabled() && isRemoteManagedEntrypoint())
      refreshFastModeFromSettings(listener, options, options_2);
  };
  let unsubscribe = onOrgFastModeChange(onChange);
  onChange();
  return unsubscribe;
}
//@ chunk-exfmq47h.js:368652-368830 placement
/**
 * 模型是否支持快速模式。
 */
function supportsFastMode(model) {
  if (!isFastModeEnabled()) return false;
  let resolvedModel = model ?? getDefaultMainLoopModelSetting();
  let userSpecifiedModel = parseUserSpecifiedModel(resolvedModel);
  let supports = modelSupportsCapability(
    getCanonicalName(userSpecifiedModel),
    "fast_mode",
    userSpecifiedModel,
  );
  if (supports !== undefined) return supports;
  let lower = userSpecifiedModel.toLowerCase();
  return lower.includes("opus-4-8") || lower.includes("opus-5");
}
//@ chunk-exfmq47h.js:368830-368932 placement
/**
 * 快速模式是否生效。
 */
function isFastModeActive(model, fastMode) {
  if (isRemoteSessionAvailable()) {
    if (model === null) return !!fastMode;
    return !!fastMode && supportsFastMode(model);
  }
  if (!supportsFastMode(model)) return false;
  return !!fastMode || isFastModeSettingActive(model);
}
//@ chunk-exfmq47h.js:368932-369080 placement
/**
 * 模型切换导致快速模式开关时上报。
 */
function reportFastModeToggle(fastMode, enabled) {
  if (!!fastMode === enabled) return;
  logEvent("tengu_fast_mode_toggled", {
    enabled,
    source: fromEnum(enabled ? "model_switch_restore" : "model_switch_downgrade"),
    remote: isRemoteControlChannelAvailable(),
  });
}
//@ chunk-exfmq47h.js:369080-370464 placement
/**
 * 快速模式运行状态（冷却、组织状态、预取、额度用尽）。
 */
class FastModeState {
  runtimeState = {
    status: "active",
  };
  hasLoggedCooldownExpiry = false;
  creditsExhaustedNotifiedThisTurn = false;
  orgStatus = {
    status: "pending",
  };
  lastPrefetchAt = 0;
  inflightPrefetch = null;
  cooldownTriggered = createSignal();
  cooldownExpired = createSignal();
  overageRejection = createSignal();
  orgFastModeChange = createSignal();
  fastRejectedFallbackModels = new Set();
  everFastRejectedModels = new Set();
  fallbackModelFastRejected = createSignal();
  fastRejectedFallbackModelsChanged = createSignal();
  reset() {
    this.runtimeState = {
      status: "active",
    };
    this.hasLoggedCooldownExpiry = false;
    this.creditsExhaustedNotifiedThisTurn = false;
    this.orgStatus = {
      status: "pending",
    };
    this.fastRejectedFallbackModels.clear();
    this.everFastRejectedModels.clear();
    this.lastPrefetchAt = 0;
    this.inflightPrefetch = null;
  }
  enterCooldown(resetAt, reason) {
    this.runtimeState = {
      status: "cooldown",
      resetAt,
      reason,
    };
    this.hasLoggedCooldownExpiry = false;
  }
  clearCooldown() {
    this.runtimeState = {
      status: "active",
    };
  }
  markCooldownExpiryLogged() {
    this.hasLoggedCooldownExpiry = true;
  }
  replaceOrgStatus(orgStatus) {
    let orgStatus_2 = this.orgStatus;
    this.orgStatus = orgStatus;
    return orgStatus_2;
  }
  claimCreditsExhaustedNotice() {
    if (this.creditsExhaustedNotifiedThisTurn) return false;
    this.creditsExhaustedNotifiedThisTurn = true;
    return true;
  }
  rearmCreditsExhaustedNotice() {
    this.creditsExhaustedNotifiedThisTurn = false;
  }
  beginPrefetchWindow(model, apiKey) {
    if (model - this.lastPrefetchAt < apiKey) return false;
    this.lastPrefetchAt = model;
    return true;
  }
  trackInflightPrefetch(inflightPrefetch) {
    this.inflightPrefetch = inflightPrefetch;
  }
  clearInflightPrefetch(prefetchKey) {
    if (this.inflightPrefetch === prefetchKey) this.inflightPrefetch = null;
  }
}
//@ chunk-exfmq47h.js:370464-370497 placement
/**
 * 按宿主隔离的快速模式状态（冷却触发/结束信号）。
 */
var fastModeState; // deferred: uses FastModeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:370464", () => {
  fastModeState = identity_2(new FastModeState(), (state) => state.reset());
});
//@ chunk-exfmq47h.js:370497-370554 placement
/**
 * 订阅"快速模式进入冷却"事件。
 */
function onFastModeCooldownTriggered(cooldown) {
  return fastModeState.cooldownTriggered.subscribe(cooldown);
}
//@ chunk-exfmq47h.js:370554-370609 placement
/**
 * 订阅"快速模式冷却结束"事件。
 */
function onFastModeCooldownExpired(cooldown) {
  return fastModeState.cooldownExpired.subscribe(cooldown);
}
//@ chunk-exfmq47h.js:370609-370885 fingerprint (2.1.88 match: getFastModeRuntimeState, 0.617)
/**
 * 读运行期状态；冷却到期时自动清除并发 cooldownExpired。
 */
function getFastModeRuntimeState() {
  let runtimeState = fastModeState.runtimeState;
  if (runtimeState.status === "cooldown" && Date.now() >= runtimeState.resetAt) {
    if (isFastModeEnabled() && !fastModeState.hasLoggedCooldownExpiry) {
      logForDebugging("Fast mode cooldown expired, re-enabling fast mode");
      fastModeState.markCooldownExpiryLogged();
      fastModeState.cooldownExpired.emit();
    }
    fastModeState.clearCooldown();
  }
  return fastModeState.runtimeState;
}
//@ chunk-exfmq47h.js:370885-371151 fingerprint (2.1.88 match: triggerFastModeCooldown, 0.795)
/**
 * 进入冷却（resetAt、原因），记 tengu_fast_mode_fallback_triggered。
 */
function triggerFastModeCooldown(resetTimestamp, reason) {
  if (!isFastModeEnabled()) return;
  fastModeState.enterCooldown(resetTimestamp, reason);
  let cooldownDurationMs = resetTimestamp - Date.now();
  logForDebugging(
    `Fast mode cooldown triggered (${reason}), duration ${Math.round(cooldownDurationMs / 1000)}s`,
  );
  logEvent("tengu_fast_mode_fallback_triggered", {
    cooldown_duration_ms: cooldownDurationMs,
    cooldown_reason: fromEnum(reason),
  });
  fastModeState.cooldownTriggered.emit(resetTimestamp, reason);
}
//@ chunk-exfmq47h.js:371151-371184 layout
/**
 * 清除运行期冷却。
 */
function clearFastModeCooldown() {
  fastModeState.clearCooldown();
}
//@ chunk-exfmq47h.js:371184-371528 fingerprint (2.1.88 match: handleFastModeRejectedByAPI, 0.738)
/**
 * API 拒绝 fast mode：组织状态置 disabled/preference（server），清用户设置 fastMode 与缓存 penguinModeOrgEnabled，发 orgFastModeChange(false)。
 */
function handleFastModeRejectedByAPI(storageV5) {
  if (
    fastModeState.orgStatus.status === "disabled" &&
    fastModeState.orgStatus.source === "server" &&
    !isTransientFastModeReason(fastModeState.orgStatus.reason)
  )
    return;
  fastModeState.replaceOrgStatus({
    status: "disabled",
    reason: "preference",
    source: "server",
  });
  updateSettingsForSource(
    "userSettings",
    {
      fastMode: undefined,
    },
    undefined,
    storageV5,
  );
  saveGlobalConfig(
    (current) =>
      current.penguinModeOrgEnabled === false
        ? current
        : {
            ...current,
            penguinModeOrgEnabled: false,
          },
    storageV5,
  );
  fastModeState.orgFastModeChange.emit(false);
}
//@ chunk-exfmq47h.js:371528-371844 layout
/**
 * fallback 模型拒绝 fast 时记入本会话集合，该模型此后用标准速度，并发事件。
 */
function markFallbackModelFastRejected(model) {
  let canonical = strippedCanonicalName(model);
  fastModeState.everFastRejectedModels.add(canonical);
  if (fastModeState.fastRejectedFallbackModels.has(canonical)) return;
  fastModeState.fastRejectedFallbackModels.add(canonical);
  logForDebugging(`Fast mode rejected for fallback model ${model}; using standard speed for it this session`);
  fastModeState.fallbackModelFastRejected.emit(model);
  fastModeState.fastRejectedFallbackModelsChanged.emit();
}
//@ chunk-exfmq47h.js:371844-371990 layout
/**
 * 清空 fast 被拒 fallback 模型集合并发变化事件。
 */
function clearFastRejectedFallbackModels() {
  if (fastModeState.fastRejectedFallbackModels.size === 0) return;
  fastModeState.fastRejectedFallbackModels.clear();
  fastModeState.fastRejectedFallbackModelsChanged.emit();
}
//@ chunk-exfmq47h.js:371990-372063 layout
/**
 * 订阅 fast 被拒 fallback 模型集合变化。
 */
function onFastRejectedFallbackModelsChanged(models) {
  return fastModeState.fastRejectedFallbackModelsChanged.subscribe(models);
}
//@ chunk-exfmq47h.js:372063-372159 layout
/**
 * 该模型本会话是否因 fast 被拒而改用标准速度（queryModel 据此不发 speed:fast）。
 */
function isFallbackModelFastRejected(model) {
  try {
    return fastModeState.fastRejectedFallbackModels.has(strippedCanonicalName(model));
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-exfmq47h.js:372159-372231 layout
/**
 * 当前（或给定）模型是否在 fast 被拒集合中。
 */
function isMainModelFastRejected(modelName) {
  try {
    return isFallbackModelFastRejected(
      parseUserSpecifiedModel(modelName ?? getDefaultMainLoopModelSetting()),
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-exfmq47h.js:372231-372369 layout
/**
 * 该模型本进程是否曾被拒绝 fast。
 */
function wasEverFastRejected(model) {
  try {
    let canonical = strippedCanonicalName(model);
    return (
      fastModeState.fastRejectedFallbackModels.has(canonical) ||
      fastModeState.everFastRejectedModels.has(canonical)
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-exfmq47h.js:372369-372406 layout
/**
 * 会话开了 fast 且该模型未被拒。
 */
function isFastModeOnForModel(model, fastMode) {
  return !!model && !isMainModelFastRejected(fastMode);
}
//@ chunk-exfmq47h.js:372406-372466 layout
/**
 * 开了 fast 但模型被拒时返回 model_not_allowed。
 */
function getFastRejectedReason(model, fastMode) {
  return fastMode && isMainModelFastRejected(model) ? "model_not_allowed" : null;
}
//@ chunk-exfmq47h.js:372466-372531 layout
/**
 * 订阅 fallback 模型 fast 被拒事件。
 */
function onFallbackModelFastRejected(model) {
  return fastModeState.fallbackModelFastRejected.subscribe(model);
}
//@ chunk-exfmq47h.js:372531-372587 layout
/**
 * 订阅超额拒绝事件（参数为提示文案）。
 */
function onFastModeOverageRejection(model) {
  return fastModeState.overageRejection.subscribe(model);
}
//@ chunk-exfmq47h.js:372587-373356 fingerprint (2.1.88 match: getOverageDisabledMessage, 0.709)
/**
 * 超额（usage credits）被拒原因 → "Fast mode disabled · …" 文案。
 */
function getOverageDisabledMessage(reason) {
  switch (reason) {
    case "out_of_credits":
      return "Fast mode disabled \xB7 Out of usage credits";
    case "org_level_disabled":
    case "org_service_level_disabled":
      return "Fast mode disabled \xB7 Usage credits turned off by your organization";
    case "org_level_disabled_until":
    case "org_spend_cap_reached":
      return "Fast mode disabled \xB7 usage credit limit reached";
    case "member_level_disabled":
      return "Fast mode disabled \xB7 Usage credits turned off for your account";
    case "seat_tier_level_disabled":
    case "seat_tier_zero_credit_limit":
    case "member_zero_credit_limit":
      return "Fast mode disabled \xB7 Usage credits aren't available for your plan";
    case "overage_not_provisioned":
    case "no_limits_configured":
      return getUsageCreditsRequiredMessage();
    default:
      return "Fast mode disabled \xB7 Usage credits aren't available";
  }
}
//@ chunk-exfmq47h.js:373356-373461 fingerprint (2.1.88 match: isOutOfCreditsReason, 0.794)
/**
 * 额度耗尽类原因（org_level_disabled_until/org_spend_cap_reached/out_of_credits）。
 */
function isOutOfCreditsReason(reason) {
  return (
    reason === "org_level_disabled_until" || reason === "org_spend_cap_reached" || reason === "out_of_credits"
  );
}
//@ chunk-exfmq47h.js:373461-373509 layout
/**
 * 新一轮开始时允许再次显示额度耗尽通知。
 */
function rearmCreditsExhaustedNotice() {
  fastModeState.rearmCreditsExhaustedNotice();
}
//@ chunk-exfmq47h.js:373509-374206 fingerprint (2.1.88 match: handleFastModeOverageRejection, 0.525)
/**
 * API 以超额原因拒绝 fast：额度耗尽类只发一次通知；其他原因关闭用户 fast 设置并把组织状态置 extra_usage_disabled。
 */
function handleFastModeOverageRejection(reason, storageV5) {
  let message = getOverageDisabledMessage(reason);
  logForDebugging(`Fast mode overage rejection: ${reason ?? "unknown"} \u2014 ${message}`);
  logEvent("tengu_fast_mode_overage_rejected", {
    overage_disabled_reason: sanitizedMachineReasonForTelemetry(reason ?? "unknown"),
  });
  if (isOutOfCreditsReason(reason)) {
    if (!fastModeState.claimCreditsExhaustedNotice()) {
      logForDebugging("Fast mode credits rejection already surfaced this turn, suppressing repeat");
      return;
    }
    enqueueTaskNotification({
      type: "system",
      subtype: "notification",
      key: "fast-mode-overage-rejected",
      text: message,
      priority: "immediate",
      color: "error",
    });
  } else {
    updateSettingsForSource(
      "userSettings",
      {
        fastMode: undefined,
      },
      undefined,
      storageV5,
    );
    saveGlobalConfig(
      (current) =>
        current.penguinModeOrgEnabled === false
          ? current
          : {
              ...current,
              penguinModeOrgEnabled: false,
            },
      storageV5,
    );
    fastModeState.replaceOrgStatus({
      status: "disabled",
      reason: "extra_usage_disabled",
      source: "server",
    });
    fastModeState.orgFastModeChange.emit(false);
  }
  fastModeState.overageRejection.emit(message);
}
//@ chunk-exfmq47h.js:374206-374254 fingerprint (2.1.88 match: isFastModeCooldown, 1)
/**
 * 运行期状态是否 cooldown。
 */
function isFastModeCooldown() {
  return getFastModeRuntimeState().status === "cooldown";
}
//@ chunk-exfmq47h.js:374254-374363 fingerprint (2.1.88 match: getFastModeState, 1)
/**
 * fast 状态：on / cooldown / off（总开关、可用、会话开启且模型支持）。
 */
function getFastModeState(model, fastModeUserEnabled) {
  let enabled =
    isFastModeEnabled() &&
    isFastModeAvailable() &&
    isFastModeOnForModel(fastModeUserEnabled, model) &&
    supportsFastMode(model);
  if (enabled && isFastModeCooldown()) return "cooldown";
  if (enabled) return "on";
  return "off";
}
//@ chunk-exfmq47h.js:374363-374441 layout
/**
 * 服务端可能返回的禁用原因列表。
 */
var FAST_MODE_DISABLED_REASONS = ["free", "preference", "extra_usage_disabled", "network_error", "unknown"];
//@ chunk-exfmq47h.js:374441-374524 layout
/**
 * 空值视为 preference，未知值视为 unknown。
 */
function normalizeFastModeDisabledReason(disabledReason) {
  if (disabledReason == null) return "preference";
  return FAST_MODE_DISABLED_REASONS.find((knownReason) => knownReason === disabledReason) ?? "unknown";
}
//@ chunk-exfmq47h.js:374524-374581 layout
/**
 * 订阅组织 fast 启用状态变化。
 */
function onOrgFastModeChange(listener) {
  return fastModeState.orgFastModeChange.subscribe(listener);
}
//@ chunk-exfmq47h.js:374581-374668 layout
/**
 * 组织状态是服务端给出的 disabled。
 */
function isOrgFastModeDisabledByServer() {
  return fastModeState.orgStatus.status === "disabled" && fastModeState.orgStatus.source === "server";
}
//@ chunk-exfmq47h.js:374668-374725 layout
/**
 * network_error 或 unknown（可忽略的暂时性原因）。
 */
function isTransientFastModeReason(reason) {
  return reason === "network_error" || reason === "unknown";
}
//@ chunk-exfmq47h.js:374725-375012 fingerprint (2.1.88 match: resolveFastModeStatusFromCache, 0.63)
/**
 * 更新组织状态，启用状态或禁用原因变化时发 orgFastModeChange。
 */
function resolveFastModeStatusFromCache(orgStatus) {
  let replaced = fastModeState.replaceOrgStatus(orgStatus);
  if (orgStatus.status === "pending") return;
  let status =
    replaced.status !== "pending"
      ? replaced.status === "enabled"
      : getGlobalConfig().penguinModeOrgEnabled === true;
  let isEnabled = orgStatus.status === "enabled";
  let reason =
    replaced.status === "disabled" && orgStatus.status === "disabled" && replaced.reason !== orgStatus.reason;
  if (status !== isEnabled || reason) fastModeState.orgFastModeChange.emit(isEnabled);
}
//@ chunk-exfmq47h.js:375012-375023 layout
/**
 * 10 秒请求超时。
 */
var FAST_MODE_STATUS_TIMEOUT_MS = 1e4;
//@ chunk-exfmq47h.js:375023-375282 fingerprint (2.1.88 match: fetchFastModeStatus, 0.924)
/**
 * GET {BASE_API_URL}/api/claude_code_penguin_mode，OAuth（Bearer + oauth beta）或 x-api-key，返回 {enabled, disabled_reason}。
 */
async function fetchFastModeStatus(auth) {
  let endpoint = `${getOauthConfig().BASE_API_URL}/api/claude_code_penguin_mode`;
  let headers = {
    "User-Agent": claudeCodeUserAgent(),
    ...("accessToken" in auth
      ? {
          Authorization: `Bearer ${auth.accessToken}`,
          "anthropic-beta": OAUTH_BETA_HEADER,
        }
      : {
          "x-api-key": auth.apiKey,
        }),
  };
  return (
    await axios_default.get(endpoint, {
      headers,
      timeout: FAST_MODE_STATUS_TIMEOUT_MS,
    })
  ).data;
}
//@ chunk-exfmq47h.js:375282-375295 layout
/**
 * 30 秒内不重复预取。
 */
var FAST_MODE_PREFETCH_MIN_INTERVAL_MS = 30000;
//@ chunk-exfmq47h.js:375295-375395 layout
/**
 * 组织状态仍 pending 时先用缓存猜测值填入。
 */
function initFastModeOrgStatusGuess() {
  if (!isFastModeEnabled()) return;
  if (fastModeState.orgStatus.status !== "pending") return;
  fastModeState.replaceOrgStatus(guessOrgFastModeStatus());
}
//@ chunk-exfmq47h.js:375395-375453 layout
/**
 * 本轮是否已显示额度耗尽通知。
 */
function wasCreditsExhaustedNotifiedThisTurn() {
  return fastModeState.creditsExhaustedNotifiedThisTurn;
}
//@ chunk-exfmq47h.js:375453-375600 layout
/**
 * 跳过检查或缓存说已启用 → enabled，否则 disabled/unknown（guess）。
 */
function guessOrgFastModeStatus() {
  if (shouldSkipFastModeOrgCheck())
    return {
      status: "enabled",
    };
  let isAnt = false;
  let cachedEnabled = isOrgFastModeEnabledCached();
  return isAnt || cachedEnabled
    ? {
        status: "enabled",
      }
    : {
        status: "disabled",
        reason: "unknown",
        source: "guess",
      };
}
//@ chunk-exfmq47h.js:375600-378016 fingerprint (2.1.88 match: prefetchFastModeStatus, 0.705)
/**
 * 预取组织 fast 状态：essential-traffic、非第一方、CCR worker 时跳过；无可用认证时用缓存猜测；30 秒节流；401/撤销时刷新 OAuth 再试；结果写入组织状态、缓存 penguinModeOrgEnabled，必要时清除用户设置。
 */
async function prefetchFastModeStatus(credentials, credentials_2) {
  initFastModeOrgStatusGuess();
  if (isCcrSessionWorkerToken()) return;
  if (isEssentialTrafficOnly()) return;
  if (!isFastModeEnabled()) return;
  if (shouldSkipFastModeOrgCheck()) {
    if (!isOrgFastModeDisabledByServer())
      fastModeState.replaceOrgStatus({
        status: "enabled",
      });
    return;
  }
  if (fastModeState.inflightPrefetch) {
    logForDebugging("Fast mode prefetch in progress, returning in-flight promise");
    return fastModeState.inflightPrefetch;
  }
  let apiKey = getAnthropicApiKeySafe();
  let hashedKey = apiKeyForHost(apiKey);
  let isBareKey = !!apiKey && !hashedKey;
  if (!(getClaudeAIOAuthTokens()?.accessToken && canFetchFastModeStatusWithOAuth()) && !hashedKey) {
    if (isOrgFastModeDisabledByServer() || isRemoteOrgFastModeEnabled()) return;
    let isAnt = false;
    let cachedEnabled = isOrgFastModeEnabledCached();
    let canUseSessionAuth = hasSessionIngressAuthForFastMode() || isBareKey;
    resolveFastModeStatusFromCache(
      isAnt || cachedEnabled
        ? {
            status: "enabled",
          }
        : {
            status: "disabled",
            reason: canUseSessionAuth ? "unknown" : "preference",
            source: "guess",
          },
    );
    return;
  }
  if (!fastModeState.beginPrefetchWindow(Date.now(), FAST_MODE_PREFETCH_MIN_INTERVAL_MS)) {
    logForDebugging("Skipping fast mode prefetch, fetched recently");
    return;
  }
  let fetchWithCurrentAuth = async () => {
    let currentTokens = getClaudeAIOAuthTokens();
    let auth =
      currentTokens?.accessToken && canFetchFastModeStatusWithOAuth()
        ? {
            accessToken: currentTokens.accessToken,
          }
        : hashedKey
          ? {
              apiKey: hashedKey,
            }
          : null;
    if (!auth) throw Error("No auth available");
    return fetchFastModeStatus(auth);
  };
  async function doFetch() {
    try {
      let status;
      try {
        status = await fetchWithCurrentAuth();
      } catch (err) {
        let accessToken =
          axios_default.isAxiosError(err) &&
          (err.response?.status === 401 ||
            (err.response?.status === 403 &&
              typeof err.response?.data === "string" &&
              err.response.data.includes("OAuth token has been revoked")))
            ? getClaudeAIOAuthTokens()?.accessToken
            : undefined;
        if (accessToken && hasProfileScope()) {
          await handleOAuth401Error(accessToken, credentials_2, credentials);
          status = await fetchWithCurrentAuth();
        } else throw err;
      }
      let previousEnabled =
        fastModeState.orgStatus.status !== "pending" && !isRemoteManagedEntrypoint()
          ? fastModeState.orgStatus.status === "enabled"
          : getGlobalConfig().penguinModeOrgEnabled;
      resolveFastModeStatusFromCache(
        status.enabled
          ? {
              status: "enabled",
            }
          : {
              status: "disabled",
              reason: normalizeFastModeDisabledReason(status.disabled_reason),
              source: "server",
            },
      );
      if (previousEnabled !== status.enabled) {
        if (!status.enabled)
          await updateSettingsForSource(
            "userSettings",
            {
              fastMode: undefined,
            },
            undefined,
            credentials,
          );
        await saveGlobalConfig(
          (current) =>
            current.penguinModeOrgEnabled === status.enabled
              ? current
              : {
                  ...current,
                  penguinModeOrgEnabled: status.enabled,
                },
          credentials,
        );
      }
      logForDebugging(
        `Org fast mode: ${status.enabled ? "enabled" : `disabled (${status.disabled_reason ?? "preference"})`}`,
      );
    } catch (err) {
      let orgEnabled = isOrgFastModeEnabledCached();
      let errorBody = axios_default.isAxiosError(err) ? err.response?.data : undefined;
      let responseStatus =
        axios_default.isAxiosError(err) &&
        err.response?.status === 403 &&
        typeof errorBody === "object" &&
        errorBody !== null &&
        "error" in errorBody &&
        typeof errorBody.error === "object" &&
        errorBody.error !== null &&
        "type" in errorBody.error &&
        errorBody.error.type === "permission_error" &&
        !!getClaudeAIOAuthTokens()?.accessToken &&
        canFetchFastModeStatusWithOAuth() &&
        !hasProfileScope();
      if (!isOrgFastModeDisabledByServer() && !isRemoteOrgFastModeEnabled())
        resolveFastModeStatusFromCache(
          orgEnabled
            ? {
                status: "enabled",
              }
            : {
                status: "disabled",
                reason: responseStatus ? "unknown" : "network_error",
                source: "guess",
              },
        );
      let result =
        fastModeState.orgStatus.status === "disabled"
          ? `disabled (${fastModeState.orgStatus.reason})`
          : isRemoteOrgFastModeEnabled()
            ? "enabled (the server's own earlier answer)"
            : "enabled (cached)";
      if (responseStatus) {
        logForDebugging(
          `Org fast mode status endpoint does not admit this session token (permission_error), standing on ${result}`,
        );
        logEvent("tengu_org_penguin_mode_fetch_refused", {});
      } else {
        logForDebugging(`Failed to fetch org fast mode status, standing on ${result}: ${err}`, {
          level: "error",
        });
        logEvent("tengu_org_penguin_mode_fetch_failed", {});
      }
    }
  }
  let response = doFetch();
  fastModeState.trackInflightPrefetch(response);
  response.finally(() => fastModeState.clearInflightPrefetch(response));
  return response;
}
//@ chunk-x2n44e87.js:338-487 placement
/**
 * 命令行带 --fast-mode 时同步内联 flag 设置与重启参数，使 fast mode 切换在重启后保持。
 */
function syncFastModeFlag(globalConfig, storageV5) {
  let flagValue = eagerParseCliFlag("--fast-mode");
  if (flagValue !== "on" && flagValue !== "off") return;
  setFlagSettingsInline({
    ...(getFlagSettingsInline() ?? {}),
    fastMode: globalConfig,
  });
  invalidateCommandNames();
  syncRespawnFlag("--fast-mode", [], globalConfig ? "on" : "off", undefined, storageV5);
}
//@ chunk-avy0g5d4.js:7849-8029 callgraph-fingerprint (2.1.88 match: getInitialFastModeSetting, 0.25)
/**
 * 初始 fast 状态：fast mode 总开关开、设置（含 policySettings.fastMode 与 flag）要求、模型支持且无不可用原因时为 "on"。
 */
function getInitialFastModeSetting(model, flagFastMode) {
  if (!isFastModeEnabled()) return;
  let settings = getInitialSettings();
  return (flagFastMode === undefined
    ? isFastModeSettingOn(settings)
    : isFastModeSettingOn(
        {
          ...settings,
          fastMode: getSettingsForSource("policySettings")?.fastMode ?? flagFastMode,
        },
        {
          flagFastMode,
        },
      )) &&
    supportsFastMode(model) &&
    getFastModeUnavailableReasonCode(model, buildFastModeCheckOptions(flagFastMode)) === null
    ? "on"
    : "off";
}
//@ chunk-avy0g5d4.js:8029-8088 affinity
/**
 * {orgStatus: 当前猜测的组织状态, sessionOptIn}。
 */
function buildFastModeCheckOptions(sessionOptIn) {
  return {
    orgStatus: guessOrgFastModeStatus(),
    sessionOptIn: sessionOptIn === true,
  };
}
export {
  isFastModeEnabled,
  isFastModeAvailable,
  supportsFastMode,
  isFallbackModelFastRejected,
  isFastModeCooldown,
  wasEverFastRejected,
  markFallbackModelFastRejected,
  subscribeOrgFastModeChange,
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
  onOrgFastModeChange,
  onFastRejectedFallbackModelsChanged,
  isMainModelFastRejected,
  clearFastRejectedFallbackModels,
  rearmCreditsExhaustedNotice,
  isFastModeActive,
  reportFastModeToggle,
  defaultOpusAlias,
  clearFastModeCooldown,
  hasSessionIngressAuthForFastMode,
  syncFastModeFlag,
  getFastModeUnavailableMessage,
  defaultOpusLabel,
  fastModeSettingDiverges,
  getFastModeRuntimeState,
  prefetchFastModeStatus,
  refreshFastModeFromSettings,
  isFastModeSettingActive,
  wasCreditsExhaustedNotifiedThisTurn,
  handleFastModeOverageRejection,
  triggerFastModeCooldown,
  handleFastModeRejectedByAPI,
  isOutOfCreditsReason,
  getInitialFastModeSetting,
  buildFastModeCheckOptions,
  initFastModeOrgStatusGuess,
  isFastModeOnForRequestModel,
  isFastModeSettingOn,
  onFastModeCooldownTriggered,
  onFastModeCooldownExpired,
  fastModeState,
  isFastModeOnForModel,
  isOrgFastModeDisabledByServer,
  onFastModeOverageRejection,
  onFallbackModelFastRejected,
};

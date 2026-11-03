/**
 * utils/fastMode.ts
 *
 * Fast mode（内部代号 penguin）：仅第一方 API；组织开关预取（/api/claude_code_penguin_mode）、不可用原因与提示、运行期冷却、被 API 拒绝/超额拒绝后的处理，以及请求里 speed:"fast" 的判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fastMode.ts
 * pieces: chunk-93kwxas0.js (2), chunk-aepeg2w5.js (62), chunk-gptvg45j.js (1)
 * attribution: callgraph-fingerprint 1, affinity 1, callgraph-witnessed 1, layout 33, fingerprint 13, placement 16
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
import { getSettingsForSource, getInitialSettings_2, updateSettingsForSource } from "./settings/settings.js";
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
import { refreshFastModeFromSettings } from "../commands/fast/fast.js";
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

//@ chunk-aepeg2w5.js:354620-354705 callgraph-witnessed = isFastModeEnabled (0.649)
/**
 * fast mode 总开关：只在第一方 API 且未设置 CLAUDE_CODE_DISABLE_FAST_MODE 时为真。
 */
function isFastModeEnabled() {
  if (getAPIProvider() !== "firstParty") return false;
  return !env.CLAUDE_CODE_DISABLE_FAST_MODE;
}
//@ chunk-aepeg2w5.js:354705-354739 layout
/**
 * 当前令牌是代码代理/CCR session worker 身份（无账号 uuid、带 code_agent_id）时为真；此时跳过组织预取。
 */
function isCcrSessionWorkerToken() {
  return isServiceAgentSession() || isAgentSessionWorker();
}
//@ chunk-aepeg2w5.js:354739-354806 layout
/**
 * CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK 且非远程托管入口时跳过组织检查。
 */
function shouldSkipFastModeOrgCheck() {
  return env.CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK && !isRemoteManagedEntrypoint();
}
//@ chunk-aepeg2w5.js:354806-354840 layout
/**
 * fast mode 开且有 session ingress 令牌。
 */
function hasSessionIngressAuthForFastMode() {
  return isFastModeEnabled() && hasSessionIngressAuthToken();
}
//@ chunk-aepeg2w5.js:354840-354906 layout
/**
 * 有 profile scope，或 CCR 推理 scope 的会话令牌，可用 OAuth 查组织 fast 状态。
 */
function canFetchFastModeStatusWithOAuth() {
  return (
    hasProfileScope() ||
    (hasSessionIngressAuthForFastMode() && hasOAuthScope("user:ccr_inference") && !isCcrSessionWorkerToken())
  );
}
//@ chunk-aepeg2w5.js:354906-354938 layout
/**
 * CLAUDE_CODE_REMOTE 且入口属于远程托管集合。
 */
function isRemoteManagedEntrypoint() {
  return isRemoteManagedEnvironment() && isCoworkEntrypoint();
}
//@ chunk-aepeg2w5.js:354938-354997 layout
/**
 * 非远程托管时读全局配置缓存 penguinModeOrgEnabled。
 */
function isOrgFastModeEnabledCached() {
  return !isRemoteManagedEntrypoint() && getGlobalConfig().penguinModeOrgEnabled === true;
}
//@ chunk-aepeg2w5.js:354997-355056 layout
/**
 * 远程托管入口下组织状态为 enabled。
 */
function isRemoteOrgFastModeEnabled() {
  return isRemoteManagedEntrypoint() && fastModeState.orgStatus.status === "enabled";
}
//@ chunk-aepeg2w5.js:355056-355109 layout
/**
 * fast mode 开且 getFastModeUnavailableReason 为空。
 */
function isFastModeAvailable(e) {
  if (!isFastModeEnabled()) return false;
  return getFastModeUnavailableMessage(e) === null;
}
//@ chunk-aepeg2w5.js:355109-355319 layout
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
//@ chunk-aepeg2w5.js:355319-355741 fingerprint = getDisabledReasonMessage (1)
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
//@ chunk-aepeg2w5.js:355741-356509 layout
/**
 * 不可用原因码：not_first_party/disabled_by_env、tengu_penguins_off、model_not_allowed（opus 不在 allowlist）、托管设置 fastMode=false 或 fastModePerSessionOptIn、SDK 需显式开启、pending、组织 disabled 原因；可用时 null。
 */
function getFastModeUnavailableReasonCode(
  model,
  { sessionOptIn: n = false, sessionOnly: r = false, orgStatus = fastModeState.orgStatus } = {},
) {
  if (!isFastModeEnabled()) return getAPIProvider() !== "firstParty" ? "not_first_party" : "disabled_by_env";
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_penguins_off", null) !== null) return "unknown";
  if (!isModelAllowed(defaultOpusAlias())) {
    let S = model !== undefined ? (model ?? getDefaultMainLoopModelSetting()) : getMainLoopModel();
    if (!(!isRemoteControlChannelAvailable() && supportsFastMode(S) && isModelAllowed(S)))
      return "model_not_allowed";
  }
  let h = n || getSettingsForSource("flagSettings")?.fastMode === true;
  if (getSettingsForSource("policySettings")?.fastMode === false) return "preference";
  if ((n || r) && getSettingsForSource("policySettings")?.fastModePerSessionOptIn === true)
    return "preference";
  if (getIsNonInteractiveSession() && preferThirdPartyAuthentication() && !h) return "sdk_opt_in_required";
  let y = h && !isRemoteManagedEntrypoint();
  if (orgStatus.status === "pending" && !shouldSkipFastModeOrgCheck() && !y) return "pending";
  if (orgStatus.status === "disabled" && (!shouldSkipFastModeOrgCheck() || orgStatus.source === "server")) {
    if (
      isTransientFastModeReason(orgStatus.reason) &&
      ((env.CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS && !isRemoteManagedEntrypoint()) || y)
    )
      return null;
    return orgStatus.reason;
  }
  return null;
}
//@ chunk-aepeg2w5.js:356509-356621 layout
/**
 * 原因码转文案并打调试日志，可用时 null。
 */
function getFastModeUnavailableMessage(e, fastModeCheckOptions = {}) {
  let fastModeUnavailableReasonCode = getFastModeUnavailableReasonCode(e, fastModeCheckOptions);
  if (fastModeUnavailableReasonCode === null) return null;
  let fastModeUnavailableReason = getFastModeUnavailableReason(fastModeUnavailableReasonCode);
  logForDebugging(`Fast mode unavailable: ${fastModeUnavailableReason}`);
  return fastModeUnavailableReason;
}
//@ chunk-aepeg2w5.js:356621-357208 fingerprint = getFastModeUnavailableReason (0.439)
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
//@ chunk-aepeg2w5.js:357208-357267 placement
/**
 * 默认 Opus 模型的显示名。
 */
function defaultOpusLabel() {
  let userSpecifiedModel = parseUserSpecifiedModel(strip1mTag(defaultOpusAlias()));
  return getPublicModelDisplayName(strip1mTag(userSpecifiedModel)) ?? "Opus";
}
//@ chunk-aepeg2w5.js:357267-357313 placement
/**
 * 默认 Opus 别名（是否带 [1m]）。
 */
function defaultOpusAlias() {
  return opus1mMergeTagsDefaultOpus() ? "opus[1m]" : "opus";
}
//@ chunk-aepeg2w5.js:357313-357384 placement
/**
 * 判断某请求模型在给定条件下是否走快速模式（需快速模式可用且满足模型/账号条件）。
 */
function isFastModeOnForRequestModel(e, n, r) {
  if (!isFastModeEnabled()) return false;
  return isFastModeOnForModel(e, r) && (isRemoteSessionAvailable() || isFastModeAvailable() || n);
}
//@ chunk-aepeg2w5.js:357384-357473 placement
/**
 * 判断快速模式设置是否当前生效（开关、模型支持与组织设置均满足）。
 */
function isFastModeSettingActive(e) {
  if (!isFastModeEnabled()) return false;
  if (!isFastModeAvailable(e)) return false;
  if (!supportsFastMode(e)) return false;
  return isFastModeSettingOn(getInitialSettings_2());
}
//@ chunk-aepeg2w5.js:357473-357680 placement
/**
 * 判断设置中的 fast mode 是否生效：开启且不要求按会话选择，或按会话选择时由 --settings 打开（策略强制按会话选择时不算）。
 */
function isFastModeSettingOn(e, n) {
  if (e.fastMode !== true) return false;
  if (!e.fastModePerSessionOptIn) return true;
  if (getSettingsForSource("policySettings")?.fastModePerSessionOptIn === true) return false;
  return (n ? n.flagFastMode : getSettingsForSource("flagSettings")?.fastMode) === true;
}
//@ chunk-aepeg2w5.js:357806-357873 placement
/**
 * 比较设置中的快速模式与当前实际状态是否不一致。
 */
function fastModeSettingDiverges(e) {
  let n = isFastModeSettingOn(e.settings);
  return n !== e.fastMode || isFastModeOrgPending(n);
}
//@ chunk-aepeg2w5.js:357873-357991 placement
function isFastModeOrgPending(e) {
  let orgStatus = fastModeState.orgStatus;
  let r = orgStatus.status === "pending" || (orgStatus.status === "disabled" && orgStatus.source === "guess");
  return e && isRemoteManagedEntrypoint() && r;
}
//@ chunk-aepeg2w5.js:357991-358070 placement
/**
 * 订阅组织级快速模式变化，立即触发一次并返回退订函数。
 */
function subscribeOrgFastModeChange(e, n, storageV5) {
  let s = () => {
    if (isFastModeEnabled() && isRemoteManagedEntrypoint()) refreshFastModeFromSettings(e, n, storageV5);
  };
  let h = onOrgFastModeChange(s);
  s();
  return h;
}
//@ chunk-aepeg2w5.js:358070-358248 placement
/**
 * 模型是否支持快速模式。
 */
function supportsFastMode(e) {
  if (!isFastModeEnabled()) return false;
  let n = e ?? getDefaultMainLoopModelSetting();
  let userSpecifiedModel = parseUserSpecifiedModel(n);
  let s = modelSupportsCapability(getCanonicalName(userSpecifiedModel), "fast_mode", userSpecifiedModel);
  if (s !== undefined) return s;
  let lower = userSpecifiedModel.toLowerCase();
  return lower.includes("opus-4-8") || lower.includes("opus-5");
}
//@ chunk-aepeg2w5.js:358248-358350 placement
/**
 * 快速模式是否生效。
 */
function isFastModeActive(e, fastMode) {
  if (isRemoteSessionAvailable()) {
    if (e === null) return !!fastMode;
    return !!fastMode && supportsFastMode(e);
  }
  if (!supportsFastMode(e)) return false;
  return !!fastMode || isFastModeSettingActive(e);
}
//@ chunk-aepeg2w5.js:358350-358498 placement
/**
 * 模型切换导致快速模式开关时上报。
 */
function reportFastModeToggle(fastMode, n) {
  if (!!fastMode === n) return;
  logEvent("tengu_fast_mode_toggled", {
    enabled: n,
    source: fromEnum(n ? "model_switch_restore" : "model_switch_downgrade"),
    remote: isRemoteControlChannelAvailable(),
  });
}
//@ chunk-aepeg2w5.js:358498-359882 placement
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
  beginPrefetchWindow(e, n) {
    if (e - this.lastPrefetchAt < n) return false;
    this.lastPrefetchAt = e;
    return true;
  }
  trackInflightPrefetch(inflightPrefetch) {
    this.inflightPrefetch = inflightPrefetch;
  }
  clearInflightPrefetch(e) {
    if (this.inflightPrefetch === e) this.inflightPrefetch = null;
  }
}
//@ chunk-aepeg2w5.js:359882-359915 placement
/**
 * 按宿主隔离的快速模式状态（冷却触发/结束信号）。
 */
var fastModeState = identity_2(new FastModeState(), (e) => e.reset());
//@ chunk-aepeg2w5.js:359915-359972 placement
/**
 * 订阅"快速模式进入冷却"事件。
 */
function onFastModeCooldownTriggered(e) {
  return fastModeState.cooldownTriggered.subscribe(e);
}
//@ chunk-aepeg2w5.js:359972-360027 placement
/**
 * 订阅"快速模式冷却结束"事件。
 */
function onFastModeCooldownExpired(e) {
  return fastModeState.cooldownExpired.subscribe(e);
}
//@ chunk-aepeg2w5.js:360027-360303 fingerprint = getFastModeRuntimeState (0.617)
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
//@ chunk-aepeg2w5.js:360303-360569 fingerprint = triggerFastModeCooldown (0.795)
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
//@ chunk-aepeg2w5.js:360569-360602 layout
/**
 * 清除运行期冷却。
 */
function clearFastModeCooldown() {
  fastModeState.clearCooldown();
}
//@ chunk-aepeg2w5.js:360602-360946 fingerprint = handleFastModeRejectedByAPI (0.739)
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
//@ chunk-aepeg2w5.js:360946-361262 layout
/**
 * fallback 模型拒绝 fast 时记入本会话集合，该模型此后用标准速度，并发事件。
 */
function markFallbackModelFastRejected(e) {
  let n = strippedCanonicalName(e);
  fastModeState.everFastRejectedModels.add(n);
  if (fastModeState.fastRejectedFallbackModels.has(n)) return;
  fastModeState.fastRejectedFallbackModels.add(n);
  logForDebugging(`Fast mode rejected for fallback model ${e}; using standard speed for it this session`);
  fastModeState.fallbackModelFastRejected.emit(e);
  fastModeState.fastRejectedFallbackModelsChanged.emit();
}
//@ chunk-aepeg2w5.js:361262-361408 layout
/**
 * 清空 fast 被拒 fallback 模型集合并发变化事件。
 */
function clearFastRejectedFallbackModels() {
  if (fastModeState.fastRejectedFallbackModels.size === 0) return;
  fastModeState.fastRejectedFallbackModels.clear();
  fastModeState.fastRejectedFallbackModelsChanged.emit();
}
//@ chunk-aepeg2w5.js:361408-361481 layout
/**
 * 订阅 fast 被拒 fallback 模型集合变化。
 */
function onFastRejectedFallbackModelsChanged(e) {
  return fastModeState.fastRejectedFallbackModelsChanged.subscribe(e);
}
//@ chunk-aepeg2w5.js:361481-361577 layout
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
//@ chunk-aepeg2w5.js:361577-361649 layout
/**
 * 当前（或给定）模型是否在 fast 被拒集合中。
 */
function isMainModelFastRejected(mainLoopModel) {
  try {
    return isFallbackModelFastRejected(
      parseUserSpecifiedModel(mainLoopModel ?? getDefaultMainLoopModelSetting()),
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-aepeg2w5.js:361649-361787 layout
/**
 * 该模型本进程是否曾被拒绝 fast。
 */
function wasEverFastRejected(model) {
  try {
    let n = strippedCanonicalName(model);
    return fastModeState.fastRejectedFallbackModels.has(n) || fastModeState.everFastRejectedModels.has(n);
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-aepeg2w5.js:361787-361824 layout
/**
 * 会话开了 fast 且该模型未被拒。
 */
function isFastModeOnForModel(e, n) {
  return !!e && !isMainModelFastRejected(n);
}
//@ chunk-aepeg2w5.js:361824-361884 layout
/**
 * 开了 fast 但模型被拒时返回 model_not_allowed。
 */
function getFastRejectedReason(e, fastMode) {
  return fastMode && isMainModelFastRejected(e) ? "model_not_allowed" : null;
}
//@ chunk-aepeg2w5.js:361884-361949 layout
/**
 * 订阅 fallback 模型 fast 被拒事件。
 */
function onFallbackModelFastRejected(e) {
  return fastModeState.fallbackModelFastRejected.subscribe(e);
}
//@ chunk-aepeg2w5.js:361949-362005 layout
/**
 * 订阅超额拒绝事件（参数为提示文案）。
 */
function onFastModeOverageRejection(e) {
  return fastModeState.overageRejection.subscribe(e);
}
//@ chunk-aepeg2w5.js:362005-362774 fingerprint = getOverageDisabledMessage (0.709)
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
//@ chunk-aepeg2w5.js:362774-362879 fingerprint = isOutOfCreditsReason (0.794)
/**
 * 额度耗尽类原因（org_level_disabled_until/org_spend_cap_reached/out_of_credits）。
 */
function isOutOfCreditsReason(reason) {
  return (
    reason === "org_level_disabled_until" || reason === "org_spend_cap_reached" || reason === "out_of_credits"
  );
}
//@ chunk-aepeg2w5.js:362879-362927 layout
/**
 * 新一轮开始时允许再次显示额度耗尽通知。
 */
function rearmCreditsExhaustedNotice() {
  fastModeState.rearmCreditsExhaustedNotice();
}
//@ chunk-aepeg2w5.js:362927-363624 fingerprint = handleFastModeOverageRejection (0.525)
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
//@ chunk-aepeg2w5.js:363624-363672 fingerprint = isFastModeCooldown (1)
/**
 * 运行期状态是否 cooldown。
 */
function isFastModeCooldown() {
  return getFastModeRuntimeState().status === "cooldown";
}
//@ chunk-aepeg2w5.js:363672-363781 fingerprint = getFastModeState (1)
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
//@ chunk-aepeg2w5.js:363781-363859 layout
/**
 * 服务端可能返回的禁用原因列表。
 */
var FAST_MODE_DISABLED_REASONS = ["free", "preference", "extra_usage_disabled", "network_error", "unknown"];
//@ chunk-aepeg2w5.js:363859-363942 layout
/**
 * 空值视为 preference，未知值视为 unknown。
 */
function normalizeFastModeDisabledReason(disabledReason) {
  if (disabledReason == null) return "preference";
  return FAST_MODE_DISABLED_REASONS.find((n) => n === disabledReason) ?? "unknown";
}
//@ chunk-aepeg2w5.js:363942-363999 layout
/**
 * 订阅组织 fast 启用状态变化。
 */
function onOrgFastModeChange(e) {
  return fastModeState.orgFastModeChange.subscribe(e);
}
//@ chunk-aepeg2w5.js:363999-364086 layout
/**
 * 组织状态是服务端给出的 disabled。
 */
function isOrgFastModeDisabledByServer() {
  return fastModeState.orgStatus.status === "disabled" && fastModeState.orgStatus.source === "server";
}
//@ chunk-aepeg2w5.js:364086-364143 layout
/**
 * network_error 或 unknown（可忽略的暂时性原因）。
 */
function isTransientFastModeReason(reason) {
  return reason === "network_error" || reason === "unknown";
}
//@ chunk-aepeg2w5.js:364143-364430 fingerprint = resolveFastModeStatusFromCache (0.631)
/**
 * 更新组织状态，启用状态或禁用原因变化时发 orgFastModeChange。
 */
function resolveFastModeStatusFromCache(e) {
  let n = fastModeState.replaceOrgStatus(e);
  if (e.status === "pending") return;
  let r = n.status !== "pending" ? n.status === "enabled" : getGlobalConfig().penguinModeOrgEnabled === true;
  let s = e.status === "enabled";
  let h = n.status === "disabled" && e.status === "disabled" && n.reason !== e.reason;
  if (r !== s || h) fastModeState.orgFastModeChange.emit(s);
}
//@ chunk-aepeg2w5.js:364430-364441 layout
/**
 * 10 秒请求超时。
 */
var FAST_MODE_STATUS_TIMEOUT_MS = 1e4;
//@ chunk-aepeg2w5.js:364441-364700 fingerprint = fetchFastModeStatus (0.923)
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
//@ chunk-aepeg2w5.js:364700-364713 layout
/**
 * 30 秒内不重复预取。
 */
var FAST_MODE_PREFETCH_MIN_INTERVAL_MS = 30000;
//@ chunk-aepeg2w5.js:364713-364813 layout
/**
 * 组织状态仍 pending 时先用缓存猜测值填入。
 */
function initFastModeOrgStatusGuess() {
  if (!isFastModeEnabled()) return;
  if (fastModeState.orgStatus.status !== "pending") return;
  fastModeState.replaceOrgStatus(guessOrgFastModeStatus());
}
//@ chunk-aepeg2w5.js:364813-364871 layout
/**
 * 本轮是否已显示额度耗尽通知。
 */
function wasCreditsExhaustedNotifiedThisTurn() {
  return fastModeState.creditsExhaustedNotifiedThisTurn;
}
//@ chunk-aepeg2w5.js:364871-365018 layout
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
//@ chunk-aepeg2w5.js:365018-367398 fingerprint = prefetchFastModeStatus (0.705)
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
  let s = apiKeyForHost(apiKey);
  let h = !!apiKey && !s;
  if (!(getClaudeAIOAuthTokens()?.accessToken && canFetchFastModeStatusWithOAuth()) && !s) {
    if (isOrgFastModeDisabledByServer() || isRemoteOrgFastModeEnabled()) return;
    let isAnt = false;
    let cachedEnabled = isOrgFastModeEnabledCached();
    let F = hasSessionIngressAuthForFastMode() || h;
    resolveFastModeStatusFromCache(
      isAnt || cachedEnabled
        ? {
            status: "enabled",
          }
        : {
            status: "disabled",
            reason: F ? "unknown" : "preference",
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
        : s
          ? {
              apiKey: s,
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
          (current) => ({
            ...current,
            penguinModeOrgEnabled: status.enabled,
          }),
          credentials,
        );
      }
      logForDebugging(
        `Org fast mode: ${status.enabled ? "enabled" : `disabled (${status.disabled_reason ?? "preference"})`}`,
      );
    } catch (err) {
      let F = isOrgFastModeEnabledCached();
      let L = axios_default.isAxiosError(err) ? err.response?.data : undefined;
      let G =
        axios_default.isAxiosError(err) &&
        err.response?.status === 403 &&
        typeof L === "object" &&
        L !== null &&
        "error" in L &&
        typeof L.error === "object" &&
        L.error !== null &&
        "type" in L.error &&
        L.error.type === "permission_error" &&
        !!getClaudeAIOAuthTokens()?.accessToken &&
        canFetchFastModeStatusWithOAuth() &&
        !hasProfileScope();
      if (!isOrgFastModeDisabledByServer() && !isRemoteOrgFastModeEnabled())
        resolveFastModeStatusFromCache(
          F
            ? {
                status: "enabled",
              }
            : {
                status: "disabled",
                reason: G ? "unknown" : "network_error",
                source: "guess",
              },
        );
      let j =
        fastModeState.orgStatus.status === "disabled"
          ? `disabled (${fastModeState.orgStatus.reason})`
          : isRemoteOrgFastModeEnabled()
            ? "enabled (the server's own earlier answer)"
            : "enabled (cached)";
      if (G) {
        logForDebugging(
          `Org fast mode status endpoint does not admit this session token (permission_error), standing on ${j}`,
        );
        logEvent("tengu_org_penguin_mode_fetch_refused", {});
      } else {
        logForDebugging(`Failed to fetch org fast mode status, standing on ${j}: ${err}`, {
          level: "error",
        });
        logEvent("tengu_org_penguin_mode_fetch_failed", {});
      }
    }
  }
  let R = doFetch();
  fastModeState.trackInflightPrefetch(R);
  R.finally(() => fastModeState.clearInflightPrefetch(R));
  return R;
}
//@ chunk-93kwxas0.js:7781-7961 callgraph-fingerprint = getInitialFastModeSetting (0.251)
/**
 * 初始 fast 状态：fast mode 总开关开、设置（含 policySettings.fastMode 与 flag）要求、模型支持且无不可用原因时为 "on"。
 */
function getInitialFastModeSetting(h, E) {
  if (!isFastModeEnabled()) return;
  let settings = getInitialSettings_2();
  return (E === undefined
    ? isFastModeSettingOn(settings)
    : isFastModeSettingOn(
        {
          ...settings,
          fastMode: getSettingsForSource("policySettings")?.fastMode ?? E,
        },
        {
          flagFastMode: E,
        },
      )) &&
    supportsFastMode(h) &&
    getFastModeUnavailableReasonCode(h, buildFastModeCheckOptions(E)) === null
    ? "on"
    : "off";
}
//@ chunk-93kwxas0.js:7961-8020 affinity
/**
 * {orgStatus: 当前猜测的组织状态, sessionOptIn}。
 */
function buildFastModeCheckOptions(h) {
  return {
    orgStatus: guessOrgFastModeStatus(),
    sessionOptIn: h === true,
  };
}
//@ chunk-gptvg45j.js:338-487 placement
/**
 * 命令行带 --fast-mode 时同步内联 flag 设置与重启参数，使 fast mode 切换在重启后保持。
 */
function syncFastModeFlag(e, n) {
  let o = eagerParseCliFlag("--fast-mode");
  if (o !== "on" && o !== "off") return;
  setFlagSettingsInline({
    ...(getFlagSettingsInline() ?? {}),
    fastMode: e,
  });
  invalidateCommandNames();
  syncRespawnFlag("--fast-mode", [], e ? "on" : "off", undefined, n);
}
export {
  supportsFastMode,
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
  isFastModeSettingActive,
  isFastModeEnabled,
  getFastModeUnavailableMessage,
  isFastModeAvailable,
  isFastModeOnForRequestModel,
  onFastRejectedFallbackModelsChanged,
  clearFastModeCooldown,
  isFastModeActive,
  reportFastModeToggle,
  isFastModeSettingOn,
  getFastModeRuntimeState,
  defaultOpusAlias,
  defaultOpusLabel,
  prefetchFastModeStatus,
  clearFastRejectedFallbackModels,
  hasSessionIngressAuthForFastMode,
  syncFastModeFlag,
  isFastModeOrgPending,
  isFastModeOnForModel,
  isFastModeCooldown,
  subscribeOrgFastModeChange,
  onOrgFastModeChange,
  fastModeSettingDiverges,
  isMainModelFastRejected,
  onFastModeCooldownTriggered,
  onFastModeCooldownExpired,
  fastModeState,
  rearmCreditsExhaustedNotice,
  isOrgFastModeDisabledByServer,
  onFastModeOverageRejection,
  onFallbackModelFastRejected,
  isOutOfCreditsReason,
  isFallbackModelFastRejected,
  wasEverFastRejected,
  markFallbackModelFastRejected,
  initFastModeOrgStatusGuess,
  wasCreditsExhaustedNotifiedThisTurn,
  getInitialFastModeSetting,
  buildFastModeCheckOptions,
  handleFastModeOverageRejection,
  triggerFastModeCooldown,
  handleFastModeRejectedByAPI,
};

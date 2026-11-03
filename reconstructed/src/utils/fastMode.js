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
import { mn } from "./remoteEnvironment.js";
import { isCoworkEntrypoint } from "./entrypointKinds.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { isArtifactMountMode } from "../services/artifacts/artifactMount.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isModelAllowed } from "./model/modelAllowlist.js";
import { getDefaultMainLoopModelSetting } from "./model/planModeModel.js";
import { getMainLoopModel, strip1mTag } from "./model/model.js";
import { ml, wt } from "../remote/remoteMode.js";
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
import { ge } from "./identity.js";
import { logError } from "./log.js";
import { toError, sanitizedMachineReasonForTelemetry } from "./errors.js";
import { enqueueTaskNotification } from "./task/taskNotifications.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../constants/oauth.js";
import { claudeCodeUserAgent } from "./http.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { apiKeyForHost } from "../services/analytics/telemetryCredentialGuard.js";
import { eagerParseCliFlag } from "./cliArgs.js";
import { or } from "./settings/commandSyncNames.js";
import { syncRespawnFlag } from "../services/daemon/jobState.js";

/**
 * fast mode 总开关：只在第一方 API 且未设置 CLAUDE_CODE_DISABLE_FAST_MODE 时为真。
 */
//@ chunk-aepeg2w5.js:354620-354705 callgraph-witnessed = isFastModeEnabled (0.649)
function isFastModeEnabled() {
  if (getAPIProvider() !== "firstParty") return !1;
  return !env.CLAUDE_CODE_DISABLE_FAST_MODE;
}
/**
 * 当前令牌是代码代理/CCR session worker 身份（无账号 uuid、带 code_agent_id）时为真；此时跳过组织预取。
 */
//@ chunk-aepeg2w5.js:354705-354739 layout
function isCcrSessionWorkerToken() {
  return isServiceAgentSession() || isAgentSessionWorker();
}
/**
 * CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK 且非远程托管入口时跳过组织检查。
 */
//@ chunk-aepeg2w5.js:354739-354806 layout
function shouldSkipFastModeOrgCheck() {
  return env.CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK && !isRemoteManagedEntrypoint();
}
/**
 * fast mode 开且有 session ingress 令牌。
 */
//@ chunk-aepeg2w5.js:354806-354840 layout
function hasSessionIngressAuthForFastMode() {
  return isFastModeEnabled() && hasSessionIngressAuthToken();
}
/**
 * 有 profile scope，或 CCR 推理 scope 的会话令牌，可用 OAuth 查组织 fast 状态。
 */
//@ chunk-aepeg2w5.js:354840-354906 layout
function canFetchFastModeStatusWithOAuth() {
  return (
    hasProfileScope() ||
    (hasSessionIngressAuthForFastMode() && hasOAuthScope("user:ccr_inference") && !isCcrSessionWorkerToken())
  );
}
/**
 * CLAUDE_CODE_REMOTE 且入口属于远程托管集合。
 */
//@ chunk-aepeg2w5.js:354906-354938 layout
function isRemoteManagedEntrypoint() {
  return mn() && isCoworkEntrypoint();
}
/**
 * 非远程托管时读全局配置缓存 penguinModeOrgEnabled。
 */
//@ chunk-aepeg2w5.js:354938-354997 layout
function isOrgFastModeEnabledCached() {
  return !isRemoteManagedEntrypoint() && getGlobalConfig().penguinModeOrgEnabled === !0;
}
/**
 * 远程托管入口下组织状态为 enabled。
 */
//@ chunk-aepeg2w5.js:354997-355056 layout
function isRemoteOrgFastModeEnabled() {
  return isRemoteManagedEntrypoint() && mf.orgStatus.status === "enabled";
}
/**
 * fast mode 开且 getFastModeUnavailableReason 为空。
 */
//@ chunk-aepeg2w5.js:355056-355109 layout
function isFastModeAvailable(e) {
  if (!isFastModeEnabled()) return !1;
  return getFastModeUnavailableMessage(e) === null;
}
/**
 * "Fast mode requires usage credits" 加开启额度的指引。
 */
//@ chunk-aepeg2w5.js:355109-355319 layout
function getUsageCreditsRequiredMessage() {
  let n = getUsageCreditsCommand();
  if (n) return `${"Fast mode requires usage credits"} \xB7 ${n} to turn them on`;
  return isArtifactMountMode() && isExtraUsageAllowed()
    ? `${"Fast mode requires usage credits"} \xB7 ${getTurnOnUsageCreditsStep()}`
    : "Fast mode requires usage credits";
}
/**
 * 组织层面禁用原因 → 提示文案（free/preference/extra_usage_disabled/network_error/unknown）。
 */
//@ chunk-aepeg2w5.js:355319-355741 fingerprint = getDisabledReasonMessage (1)
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
/**
 * 不可用原因码：not_first_party/disabled_by_env、tengu_penguins_off、model_not_allowed（opus 不在 allowlist）、托管设置 fastMode=false 或 fastModePerSessionOptIn、SDK 需显式开启、pending、组织 disabled 原因；可用时 null。
 */
//@ chunk-aepeg2w5.js:355741-356509 layout
function getFastModeUnavailableReasonCode(
  model,
  { sessionOptIn: n = !1, sessionOnly: r = !1, orgStatus: orgStatus = mf.orgStatus } = {},
) {
  if (!isFastModeEnabled()) return getAPIProvider() !== "firstParty" ? "not_first_party" : "disabled_by_env";
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_penguins_off", null) !== null) return "unknown";
  if (!isModelAllowed(defaultOpusAlias())) {
    let S = model !== void 0 ? (model ?? getDefaultMainLoopModelSetting()) : getMainLoopModel();
    if (!(!ml() && supportsFastMode(S) && isModelAllowed(S))) return "model_not_allowed";
  }
  let h = n || getSettingsForSource("flagSettings")?.fastMode === !0;
  if (getSettingsForSource("policySettings")?.fastMode === !1) return "preference";
  if ((n || r) && getSettingsForSource("policySettings")?.fastModePerSessionOptIn === !0) return "preference";
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
/**
 * 原因码转文案并打调试日志，可用时 null。
 */
//@ chunk-aepeg2w5.js:356509-356621 layout
function getFastModeUnavailableMessage(e, n = {}) {
  let r = getFastModeUnavailableReasonCode(e, n);
  if (r === null) return null;
  let s = getFastModeUnavailableReason(r);
  return (logForDebugging(`Fast mode unavailable: ${s}`), s);
}
/**
 * 原因码 → 面向用户文案。
 */
//@ chunk-aepeg2w5.js:356621-357208 fingerprint = getFastModeUnavailableReason (0.439)
function getFastModeUnavailableReason(e) {
  switch (e) {
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
      return getDisabledReasonMessage(e, getClaudeAIOAuthTokens() !== null ? "oauth" : "api-key");
  }
}
/**
 * 默认 Opus 模型的显示名。
 */
//@ chunk-aepeg2w5.js:357208-357267 placement
function defaultOpusLabel() {
  let e = parseUserSpecifiedModel(strip1mTag(defaultOpusAlias()));
  return getPublicModelDisplayName(strip1mTag(e)) ?? "Opus";
}
/**
 * 默认 Opus 别名（是否带 [1m]）。
 */
//@ chunk-aepeg2w5.js:357267-357313 placement
function defaultOpusAlias() {
  return opus1mMergeTagsDefaultOpus() ? "opus[1m]" : "opus";
}
//@ chunk-aepeg2w5.js:357313-357384 placement
function NCn(e, n, r) {
  if (!isFastModeEnabled()) return !1;
  return isFastModeOnForModel(e, r) && (wt() || isFastModeAvailable() || n);
}
//@ chunk-aepeg2w5.js:357384-357473 placement
function $Cn(e) {
  if (!isFastModeEnabled()) return !1;
  if (!isFastModeAvailable(e)) return !1;
  if (!supportsFastMode(e)) return !1;
  return isFastModeSettingOn(getInitialSettings_2());
}
/**
 * 判断设置中的 fast mode 是否生效：开启且不要求按会话选择，或按会话选择时由 --settings 打开（策略强制按会话选择时不算）。
 */
//@ chunk-aepeg2w5.js:357473-357680 placement
function isFastModeSettingOn(e, n) {
  if (e.fastMode !== !0) return !1;
  if (!e.fastModePerSessionOptIn) return !0;
  if (getSettingsForSource("policySettings")?.fastModePerSessionOptIn === !0) return !1;
  return (n ? n.flagFastMode : getSettingsForSource("flagSettings")?.fastMode) === !0;
}
//@ chunk-aepeg2w5.js:357806-357873 placement
function Qwi(e) {
  let n = isFastModeSettingOn(e.settings);
  return n !== e.fastMode || isFastModeOrgPending(n);
}
//@ chunk-aepeg2w5.js:357873-357991 placement
function isFastModeOrgPending(e) {
  let orgStatus = mf.orgStatus,
    r = orgStatus.status === "pending" || (orgStatus.status === "disabled" && orgStatus.source === "guess");
  return e && isRemoteManagedEntrypoint() && r;
}
//@ chunk-aepeg2w5.js:357991-358070 placement
function Zwi(e, n, r) {
  let s = () => {
      if (isFastModeEnabled() && isRemoteManagedEntrypoint()) refreshFastModeFromSettings(e, n, r);
    },
    h = onOrgFastModeChange(s);
  return (s(), h);
}
/**
 * 模型是否支持快速模式。
 */
//@ chunk-aepeg2w5.js:358070-358248 placement
function supportsFastMode(e) {
  if (!isFastModeEnabled()) return !1;
  let n = e ?? getDefaultMainLoopModelSetting(),
    r = parseUserSpecifiedModel(n),
    s = modelSupportsCapability(getCanonicalName(r), "fast_mode", r);
  if (s !== void 0) return s;
  let lower = r.toLowerCase();
  return lower.includes("opus-4-8") || lower.includes("opus-5");
}
/**
 * 快速模式是否生效。
 */
//@ chunk-aepeg2w5.js:358248-358350 placement
function isFastModeActive(e, n) {
  if (wt()) {
    if (e === null) return !!n;
    return !!n && supportsFastMode(e);
  }
  if (!supportsFastMode(e)) return !1;
  return !!n || $Cn(e);
}
/**
 * 模型切换导致快速模式开关时上报。
 */
//@ chunk-aepeg2w5.js:358350-358498 placement
function reportFastModeToggle(e, n) {
  if (!!e === n) return;
  logEvent("tengu_fast_mode_toggled", {
    enabled: n,
    source: fromEnum(n ? "model_switch_restore" : "model_switch_downgrade"),
    remote: ml(),
  });
}
/**
 * 快速模式运行状态（冷却、组织状态、预取、额度用尽）。
 */
//@ chunk-aepeg2w5.js:358498-359882 placement
class FastModeState {
  runtimeState = { status: "active" };
  hasLoggedCooldownExpiry = !1;
  creditsExhaustedNotifiedThisTurn = !1;
  orgStatus = { status: "pending" };
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
    ((this.runtimeState = { status: "active" }),
      (this.hasLoggedCooldownExpiry = !1),
      (this.creditsExhaustedNotifiedThisTurn = !1),
      (this.orgStatus = { status: "pending" }),
      this.fastRejectedFallbackModels.clear(),
      this.everFastRejectedModels.clear(),
      (this.lastPrefetchAt = 0),
      (this.inflightPrefetch = null));
  }
  enterCooldown(e, n) {
    ((this.runtimeState = { status: "cooldown", resetAt: e, reason: n }),
      (this.hasLoggedCooldownExpiry = !1));
  }
  clearCooldown() {
    this.runtimeState = { status: "active" };
  }
  markCooldownExpiryLogged() {
    this.hasLoggedCooldownExpiry = !0;
  }
  replaceOrgStatus(e) {
    let orgStatus = this.orgStatus;
    return ((this.orgStatus = e), orgStatus);
  }
  claimCreditsExhaustedNotice() {
    if (this.creditsExhaustedNotifiedThisTurn) return !1;
    return ((this.creditsExhaustedNotifiedThisTurn = !0), !0);
  }
  rearmCreditsExhaustedNotice() {
    this.creditsExhaustedNotifiedThisTurn = !1;
  }
  beginPrefetchWindow(e, n) {
    if (e - this.lastPrefetchAt < n) return !1;
    return ((this.lastPrefetchAt = e), !0);
  }
  trackInflightPrefetch(e) {
    this.inflightPrefetch = e;
  }
  clearInflightPrefetch(e) {
    if (this.inflightPrefetch === e) this.inflightPrefetch = null;
  }
}
//@ chunk-aepeg2w5.js:359882-359915 placement
var mf = ge(new FastModeState(), (e) => e.reset());
//@ chunk-aepeg2w5.js:359915-359972 placement
function Nto(e) {
  return mf.cooldownTriggered.subscribe(e);
}
//@ chunk-aepeg2w5.js:359972-360027 placement
function $to(e) {
  return mf.cooldownExpired.subscribe(e);
}
/**
 * 读运行期状态；冷却到期时自动清除并发 cooldownExpired。
 */
//@ chunk-aepeg2w5.js:360027-360303 fingerprint = getFastModeRuntimeState (0.617)
function getFastModeRuntimeState() {
  let runtimeState = mf.runtimeState;
  if (runtimeState.status === "cooldown" && Date.now() >= runtimeState.resetAt) {
    if (isFastModeEnabled() && !mf.hasLoggedCooldownExpiry)
      (logForDebugging("Fast mode cooldown expired, re-enabling fast mode"),
        mf.markCooldownExpiryLogged(),
        mf.cooldownExpired.emit());
    mf.clearCooldown();
  }
  return mf.runtimeState;
}
/**
 * 进入冷却（resetAt、原因），记 tengu_fast_mode_fallback_triggered。
 */
//@ chunk-aepeg2w5.js:360303-360569 fingerprint = triggerFastModeCooldown (0.795)
function triggerFastModeCooldown(resetTimestamp, reason) {
  if (!isFastModeEnabled()) return;
  mf.enterCooldown(resetTimestamp, reason);
  let cooldownDurationMs = resetTimestamp - Date.now();
  (logForDebugging(
    `Fast mode cooldown triggered (${reason}), duration ${Math.round(cooldownDurationMs / 1000)}s`,
  ),
    logEvent("tengu_fast_mode_fallback_triggered", {
      cooldown_duration_ms: cooldownDurationMs,
      cooldown_reason: fromEnum(reason),
    }),
    mf.cooldownTriggered.emit(resetTimestamp, reason));
}
/**
 * 清除运行期冷却。
 */
//@ chunk-aepeg2w5.js:360569-360602 layout
function clearFastModeCooldown() {
  mf.clearCooldown();
}
/**
 * API 拒绝 fast mode：组织状态置 disabled/preference（server），清用户设置 fastMode 与缓存 penguinModeOrgEnabled，发 orgFastModeChange(false)。
 */
//@ chunk-aepeg2w5.js:360602-360946 fingerprint = handleFastModeRejectedByAPI (0.739)
function handleFastModeRejectedByAPI(e) {
  if (
    mf.orgStatus.status === "disabled" &&
    mf.orgStatus.source === "server" &&
    !isTransientFastModeReason(mf.orgStatus.reason)
  )
    return;
  (mf.replaceOrgStatus({ status: "disabled", reason: "preference", source: "server" }),
    updateSettingsForSource("userSettings", { fastMode: void 0 }, void 0, e),
    saveGlobalConfig(
      (current) =>
        current.penguinModeOrgEnabled === !1 ? current : { ...current, penguinModeOrgEnabled: !1 },
      e,
    ),
    mf.orgFastModeChange.emit(!1));
}
/**
 * fallback 模型拒绝 fast 时记入本会话集合，该模型此后用标准速度，并发事件。
 */
//@ chunk-aepeg2w5.js:360946-361262 layout
function markFallbackModelFastRejected(e) {
  let n = strippedCanonicalName(e);
  if ((mf.everFastRejectedModels.add(n), mf.fastRejectedFallbackModels.has(n))) return;
  (mf.fastRejectedFallbackModels.add(n),
    logForDebugging(`Fast mode rejected for fallback model ${e}; using standard speed for it this session`),
    mf.fallbackModelFastRejected.emit(e),
    mf.fastRejectedFallbackModelsChanged.emit());
}
/**
 * 清空 fast 被拒 fallback 模型集合并发变化事件。
 */
//@ chunk-aepeg2w5.js:361262-361408 layout
function clearFastRejectedFallbackModels() {
  if (mf.fastRejectedFallbackModels.size === 0) return;
  (mf.fastRejectedFallbackModels.clear(), mf.fastRejectedFallbackModelsChanged.emit());
}
/**
 * 订阅 fast 被拒 fallback 模型集合变化。
 */
//@ chunk-aepeg2w5.js:361408-361481 layout
function onFastRejectedFallbackModelsChanged(e) {
  return mf.fastRejectedFallbackModelsChanged.subscribe(e);
}
/**
 * 该模型本会话是否因 fast 被拒而改用标准速度（queryModel 据此不发 speed:fast）。
 */
//@ chunk-aepeg2w5.js:361481-361577 layout
function isFallbackModelFastRejected(e) {
  try {
    return mf.fastRejectedFallbackModels.has(strippedCanonicalName(e));
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 当前（或给定）模型是否在 fast 被拒集合中。
 */
//@ chunk-aepeg2w5.js:361577-361649 layout
function isMainModelFastRejected(e) {
  try {
    return isFallbackModelFastRejected(parseUserSpecifiedModel(e ?? getDefaultMainLoopModelSetting()));
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 该模型本进程是否曾被拒绝 fast。
 */
//@ chunk-aepeg2w5.js:361649-361787 layout
function wasEverFastRejected(e) {
  try {
    let n = strippedCanonicalName(e);
    return mf.fastRejectedFallbackModels.has(n) || mf.everFastRejectedModels.has(n);
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 会话开了 fast 且该模型未被拒。
 */
//@ chunk-aepeg2w5.js:361787-361824 layout
function isFastModeOnForModel(e, n) {
  return !!e && !isMainModelFastRejected(n);
}
/**
 * 开了 fast 但模型被拒时返回 model_not_allowed。
 */
//@ chunk-aepeg2w5.js:361824-361884 layout
function getFastRejectedReason(e, n) {
  return n && isMainModelFastRejected(e) ? "model_not_allowed" : null;
}
/**
 * 订阅 fallback 模型 fast 被拒事件。
 */
//@ chunk-aepeg2w5.js:361884-361949 layout
function onFallbackModelFastRejected(e) {
  return mf.fallbackModelFastRejected.subscribe(e);
}
/**
 * 订阅超额拒绝事件（参数为提示文案）。
 */
//@ chunk-aepeg2w5.js:361949-362005 layout
function onFastModeOverageRejection(e) {
  return mf.overageRejection.subscribe(e);
}
/**
 * 超额（usage credits）被拒原因 → "Fast mode disabled · …" 文案。
 */
//@ chunk-aepeg2w5.js:362005-362774 fingerprint = getOverageDisabledMessage (0.709)
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
/**
 * 额度耗尽类原因（org_level_disabled_until/org_spend_cap_reached/out_of_credits）。
 */
//@ chunk-aepeg2w5.js:362774-362879 fingerprint = isOutOfCreditsReason (0.794)
function isOutOfCreditsReason(reason) {
  return (
    reason === "org_level_disabled_until" || reason === "org_spend_cap_reached" || reason === "out_of_credits"
  );
}
/**
 * 新一轮开始时允许再次显示额度耗尽通知。
 */
//@ chunk-aepeg2w5.js:362879-362927 layout
function rearmCreditsExhaustedNotice() {
  mf.rearmCreditsExhaustedNotice();
}
/**
 * API 以超额原因拒绝 fast：额度耗尽类只发一次通知；其他原因关闭用户 fast 设置并把组织状态置 extra_usage_disabled。
 */
//@ chunk-aepeg2w5.js:362927-363624 fingerprint = handleFastModeOverageRejection (0.525)
function handleFastModeOverageRejection(e, n) {
  let message = getOverageDisabledMessage(e);
  if (
    (logForDebugging(`Fast mode overage rejection: ${e ?? "unknown"} \u2014 ${message}`),
    logEvent("tengu_fast_mode_overage_rejected", {
      overage_disabled_reason: sanitizedMachineReasonForTelemetry(e ?? "unknown"),
    }),
    isOutOfCreditsReason(e))
  ) {
    if (!mf.claimCreditsExhaustedNotice()) {
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
  } else
    (updateSettingsForSource("userSettings", { fastMode: void 0 }, void 0, n),
      saveGlobalConfig(
        (current) =>
          current.penguinModeOrgEnabled === !1 ? current : { ...current, penguinModeOrgEnabled: !1 },
        n,
      ),
      mf.replaceOrgStatus({ status: "disabled", reason: "extra_usage_disabled", source: "server" }),
      mf.orgFastModeChange.emit(!1));
  mf.overageRejection.emit(message);
}
/**
 * 运行期状态是否 cooldown。
 */
//@ chunk-aepeg2w5.js:363624-363672 fingerprint = isFastModeCooldown (1)
function isFastModeCooldown() {
  return getFastModeRuntimeState().status === "cooldown";
}
/**
 * fast 状态：on / cooldown / off（总开关、可用、会话开启且模型支持）。
 */
//@ chunk-aepeg2w5.js:363672-363781 fingerprint = getFastModeState (1)
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
/**
 * 服务端可能返回的禁用原因列表。
 */
//@ chunk-aepeg2w5.js:363781-363859 layout
var FAST_MODE_DISABLED_REASONS = ["free", "preference", "extra_usage_disabled", "network_error", "unknown"];
/**
 * 空值视为 preference，未知值视为 unknown。
 */
//@ chunk-aepeg2w5.js:363859-363942 layout
function normalizeFastModeDisabledReason(e) {
  if (e == null) return "preference";
  return FAST_MODE_DISABLED_REASONS.find((n) => n === e) ?? "unknown";
}
/**
 * 订阅组织 fast 启用状态变化。
 */
//@ chunk-aepeg2w5.js:363942-363999 layout
function onOrgFastModeChange(e) {
  return mf.orgFastModeChange.subscribe(e);
}
/**
 * 组织状态是服务端给出的 disabled。
 */
//@ chunk-aepeg2w5.js:363999-364086 layout
function isOrgFastModeDisabledByServer() {
  return mf.orgStatus.status === "disabled" && mf.orgStatus.source === "server";
}
/**
 * network_error 或 unknown（可忽略的暂时性原因）。
 */
//@ chunk-aepeg2w5.js:364086-364143 layout
function isTransientFastModeReason(e) {
  return e === "network_error" || e === "unknown";
}
/**
 * 更新组织状态，启用状态或禁用原因变化时发 orgFastModeChange。
 */
//@ chunk-aepeg2w5.js:364143-364430 fingerprint = resolveFastModeStatusFromCache (0.631)
function resolveFastModeStatusFromCache(e) {
  let replaceOrgStatus = mf.replaceOrgStatus(e);
  if (e.status === "pending") return;
  let r =
      replaceOrgStatus.status !== "pending"
        ? replaceOrgStatus.status === "enabled"
        : getGlobalConfig().penguinModeOrgEnabled === !0,
    s = e.status === "enabled",
    h =
      replaceOrgStatus.status === "disabled" &&
      e.status === "disabled" &&
      replaceOrgStatus.reason !== e.reason;
  if (r !== s || h) mf.orgFastModeChange.emit(s);
}
/**
 * 10 秒请求超时。
 */
//@ chunk-aepeg2w5.js:364430-364441 layout
var FAST_MODE_STATUS_TIMEOUT_MS = 1e4;
/**
 * GET {BASE_API_URL}/api/claude_code_penguin_mode，OAuth（Bearer + oauth beta）或 x-api-key，返回 {enabled, disabled_reason}。
 */
//@ chunk-aepeg2w5.js:364441-364700 fingerprint = fetchFastModeStatus (0.923)
async function fetchFastModeStatus(auth) {
  let endpoint = `${getOauthConfig().BASE_API_URL}/api/claude_code_penguin_mode`,
    r = {
      "User-Agent": claudeCodeUserAgent(),
      ...("accessToken" in auth
        ? { Authorization: `Bearer ${auth.accessToken}`, "anthropic-beta": OAUTH_BETA_HEADER }
        : { "x-api-key": auth.apiKey }),
    };
  return (await Dt.get(endpoint, { headers: r, timeout: FAST_MODE_STATUS_TIMEOUT_MS })).data;
}
/**
 * 30 秒内不重复预取。
 */
//@ chunk-aepeg2w5.js:364700-364713 layout
var FAST_MODE_PREFETCH_MIN_INTERVAL_MS = 30000;
/**
 * 组织状态仍 pending 时先用缓存猜测值填入。
 */
//@ chunk-aepeg2w5.js:364713-364813 layout
function initFastModeOrgStatusGuess() {
  if (!isFastModeEnabled()) return;
  if (mf.orgStatus.status !== "pending") return;
  mf.replaceOrgStatus(guessOrgFastModeStatus());
}
/**
 * 本轮是否已显示额度耗尽通知。
 */
//@ chunk-aepeg2w5.js:364813-364871 layout
function wasCreditsExhaustedNotifiedThisTurn() {
  return mf.creditsExhaustedNotifiedThisTurn;
}
/**
 * 跳过检查或缓存说已启用 → enabled，否则 disabled/unknown（guess）。
 */
//@ chunk-aepeg2w5.js:364871-365018 layout
function guessOrgFastModeStatus() {
  if (shouldSkipFastModeOrgCheck()) return { status: "enabled" };
  let e = !1,
    n = isOrgFastModeEnabledCached();
  return e || n ? { status: "enabled" } : { status: "disabled", reason: "unknown", source: "guess" };
}
/**
 * 预取组织 fast 状态：essential-traffic、非第一方、CCR worker 时跳过；无可用认证时用缓存猜测；30 秒节流；401/撤销时刷新 OAuth 再试；结果写入组织状态、缓存 penguinModeOrgEnabled，必要时清除用户设置。
 */
//@ chunk-aepeg2w5.js:365018-367398 fingerprint = prefetchFastModeStatus (0.705)
async function prefetchFastModeStatus(credentials, n) {
  if ((initFastModeOrgStatusGuess(), isCcrSessionWorkerToken())) return;
  if (isEssentialTrafficOnly()) return;
  if (!isFastModeEnabled()) return;
  if (shouldSkipFastModeOrgCheck()) {
    if (!isOrgFastModeDisabledByServer()) mf.replaceOrgStatus({ status: "enabled" });
    return;
  }
  if (mf.inflightPrefetch)
    return (
      logForDebugging("Fast mode prefetch in progress, returning in-flight promise"),
      mf.inflightPrefetch
    );
  let apiKey = getAnthropicApiKeySafe(),
    s = apiKeyForHost(apiKey),
    h = !!apiKey && !s;
  if (!(getClaudeAIOAuthTokens()?.accessToken && canFetchFastModeStatusWithOAuth()) && !s) {
    if (isOrgFastModeDisabledByServer() || isRemoteOrgFastModeEnabled()) return;
    let x = !1,
      P = isOrgFastModeEnabledCached(),
      F = hasSessionIngressAuthForFastMode() || h;
    resolveFastModeStatusFromCache(
      x || P
        ? { status: "enabled" }
        : { status: "disabled", reason: F ? "unknown" : "preference", source: "guess" },
    );
    return;
  }
  if (!mf.beginPrefetchWindow(Date.now(), FAST_MODE_PREFETCH_MIN_INTERVAL_MS)) {
    logForDebugging("Skipping fast mode prefetch, fetched recently");
    return;
  }
  let fetchWithCurrentAuth = async () => {
    let currentTokens = getClaudeAIOAuthTokens(),
      P =
        currentTokens?.accessToken && canFetchFastModeStatusWithOAuth()
          ? { accessToken: currentTokens.accessToken }
          : s
            ? { apiKey: s }
            : null;
    if (!P) throw Error("No auth available");
    return fetchFastModeStatus(P);
  };
  async function doFetch() {
    try {
      let status;
      try {
        status = await fetchWithCurrentAuth();
      } catch (err) {
        let G =
          Dt.isAxiosError(err) &&
          (err.response?.status === 401 ||
            (err.response?.status === 403 &&
              typeof err.response?.data === "string" &&
              err.response.data.includes("OAuth token has been revoked")))
            ? getClaudeAIOAuthTokens()?.accessToken
            : void 0;
        if (G && hasProfileScope())
          (await handleOAuth401Error(G, n, credentials), (status = await fetchWithCurrentAuth()));
        else throw err;
      }
      let P =
        mf.orgStatus.status !== "pending" && !isRemoteManagedEntrypoint()
          ? mf.orgStatus.status === "enabled"
          : getGlobalConfig().penguinModeOrgEnabled;
      if (
        (resolveFastModeStatusFromCache(
          status.enabled
            ? { status: "enabled" }
            : {
                status: "disabled",
                reason: normalizeFastModeDisabledReason(status.disabled_reason),
                source: "server",
              },
        ),
        P !== status.enabled)
      ) {
        if (!status.enabled)
          await updateSettingsForSource("userSettings", { fastMode: void 0 }, void 0, credentials);
        await saveGlobalConfig(
          (current) => ({ ...current, penguinModeOrgEnabled: status.enabled }),
          credentials,
        );
      }
      logForDebugging(
        `Org fast mode: ${status.enabled ? "enabled" : `disabled (${status.disabled_reason ?? "preference"})`}`,
      );
    } catch (err) {
      let F = isOrgFastModeEnabledCached(),
        L = Dt.isAxiosError(err) ? err.response?.data : void 0,
        G =
          Dt.isAxiosError(err) &&
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
            ? { status: "enabled" }
            : { status: "disabled", reason: G ? "unknown" : "network_error", source: "guess" },
        );
      let j =
        mf.orgStatus.status === "disabled"
          ? `disabled (${mf.orgStatus.reason})`
          : isRemoteOrgFastModeEnabled()
            ? "enabled (the server's own earlier answer)"
            : "enabled (cached)";
      if (G)
        (logForDebugging(
          `Org fast mode status endpoint does not admit this session token (permission_error), standing on ${j}`,
        ),
          logEvent("tengu_org_penguin_mode_fetch_refused", {}));
      else
        (logForDebugging(`Failed to fetch org fast mode status, standing on ${j}: ${err}`, {
          level: "error",
        }),
          logEvent("tengu_org_penguin_mode_fetch_failed", {}));
    }
  }
  let R = doFetch();
  return (mf.trackInflightPrefetch(R), R.finally(() => mf.clearInflightPrefetch(R)), R);
}
/**
 * 初始 fast 状态：fast mode 总开关开、设置（含 policySettings.fastMode 与 flag）要求、模型支持且无不可用原因时为 "on"。
 */
//@ chunk-93kwxas0.js:7781-7961 callgraph-fingerprint = getInitialFastModeSetting (0.251)
function getInitialFastModeSetting(h, E) {
  if (!isFastModeEnabled()) return;
  let settings = getInitialSettings_2();
  return (E === void 0
    ? isFastModeSettingOn(settings)
    : isFastModeSettingOn(
        { ...settings, fastMode: getSettingsForSource("policySettings")?.fastMode ?? E },
        { flagFastMode: E },
      )) &&
    supportsFastMode(h) &&
    getFastModeUnavailableReasonCode(h, buildFastModeCheckOptions(E)) === null
    ? "on"
    : "off";
}
/**
 * {orgStatus: 当前猜测的组织状态, sessionOptIn}。
 */
//@ chunk-93kwxas0.js:7961-8020 affinity
function buildFastModeCheckOptions(h) {
  return { orgStatus: guessOrgFastModeStatus(), sessionOptIn: h === !0 };
}
/**
 * 命令行带 --fast-mode 时同步内联 flag 设置与重启参数，使 fast mode 切换在重启后保持。
 */
//@ chunk-gptvg45j.js:338-487 placement
function syncFastModeFlag(e, n) {
  let o = eagerParseCliFlag("--fast-mode");
  if (o !== "on" && o !== "off") return;
  (setFlagSettingsInline({ ...(getFlagSettingsInline() ?? {}), fastMode: e }),
    or(),
    syncRespawnFlag("--fast-mode", [], e ? "on" : "off", void 0, n));
}

export {
  supportsFastMode,
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
  $Cn,
  isFastModeEnabled,
  isFastModeActive,
  reportFastModeToggle,
  isFastModeSettingOn,
  getFastModeRuntimeState,
  defaultOpusAlias,
  defaultOpusLabel,
  prefetchFastModeStatus,
  getFastModeUnavailableMessage,
  clearFastModeCooldown,
  clearFastRejectedFallbackModels,
  hasSessionIngressAuthForFastMode,
  syncFastModeFlag,
  isFastModeOrgPending,
  onFastRejectedFallbackModelsChanged,
  isFastModeOnForModel,
  isFastModeAvailable,
  isFastModeCooldown,
  NCn,
  Zwi,
  onOrgFastModeChange,
  Qwi,
  isMainModelFastRejected,
  Nto,
  $to,
  mf,
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

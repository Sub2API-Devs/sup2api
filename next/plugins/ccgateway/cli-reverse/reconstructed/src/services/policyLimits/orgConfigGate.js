/**
 * services/policyLimits/orgConfigGate.ts
 *
 * 2.1.316 新增：组织配置门控的执行、等待与日志
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c18v4hz4.js (54)
 * attribution: placement 54
 */
import { classifyAuthDenial } from "../analytics/authOutcomeTelemetry.js";
import {
  knownOrUndefined,
  isRetryableHttpStatus,
  orgConfigCandidacy,
  policyOutcomeSummary,
  orgConfigGateDecision,
  orgConfigInputs,
  isOAuthEffective,
  credentialShapeInputs,
} from "./orgConfigEligibility.js";
import { remoteSettingsAgeMs, readSyncAge } from "../remoteManagedSettings/consentRecords.js";
import { identity } from "../../utils/identity.js";
import { getRemoteManagedSettingsSyncFromCache } from "../remoteManagedSettings/remoteSettingsCache.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import {
  hasOpusAccess,
  currentGateOutcomes,
  orgConfigContext,
  orgConfigGateMessage,
} from "./orgConfigGateMessages.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { errorKindForTelemetry, setOrgGateShadow } from "./startupGate.js";
import { readOrgConfigRequiredFlagWithSource } from "./orgConfigGateFlag.js";
import {
  getLastLoadStatus,
  getIneligibleReason,
  onLastLoadStatusChanged,
  resetEligibilityMemo,
} from "../remoteManagedSettings/remoteSettingsState.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import {
  ensurePolicyLimitsLoadRequested,
  waitForPolicyLimitsToLoad,
  loadPolicyLimits,
} from "./PolicyLimitsClient.js";
import {
  waitForRemoteManagedSettingsFetchToSettle,
  loadRemoteManagedSettings,
} from "../remoteManagedSettings/loader.js";
import { pendingVerification } from "../api/verificationRequired.js";
import { pendingPreReplSecurityDialog } from "../remoteManagedSettings/securityCheck.js";
import { isOrgConfigPlan } from "./orgConfigRequired.js";
import { getStoredOAuthSubscriptionType } from "../../utils/auth.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  isGrowthBookCacheEmpty,
  refreshGrowthBookFeatures,
  hasWorkspaceTrust,
  initializeGrowthBook,
} from "../analytics/growthbook.js";
import { logEventAsync } from "../analytics/index.js";
import { logFeatureOkAsync, logFeatureSadAsync, logFeatureBadAsync } from "../analytics/featureTelemetry.js";
import { isPendingNotOver } from "../../utils/toolErrors.js";
import { currentFetchHold } from "../../utils/plugins/hooksModulesRollout.js";
import { EVENT_LOGGING_FLAG_WAIT_MS } from "../../utils/startupFlagWait.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-c18v4hz4.js:5344-5407 placement
/**
 * 状态为 dead 且认证拒绝与组织无关时视为凭据拒绝。
 */
function isCredentialRefusalNotOrg(credentialState, serverErrorCode, serverAuthDenial) {
  return (
    credentialState === "dead" && classifyAuthDenial(serverErrorCode, serverAuthDenial) !== "organization"
  );
}
//@ chunk-c18v4hz4.js:5407-5723 placement
function refusalForOrgSubscription(status, serverErrorType, serverErrorCode, serverAuthDenial) {
  if (knownOrUndefined(serverErrorType) === undefined) return;
  let denial = classifyAuthDenial(serverErrorCode, serverAuthDenial);
  if (denial === "organization") return "refused_not_entitled";
  if (denial === "credential") return "refused_credential";
  if (status === 404) return "none_configured";
  if (status === 401 || status === undefined) return;
  if (status === 403) return "refused_not_entitled";
  if (isRetryableHttpStatus(status) || status >= 500) return;
  return "unavailable_server";
}
//@ chunk-c18v4hz4.js:5723-6656 placement
function policyRefusalReason(
  credentialState,
  serverErrorCode,
  httpStatus,
  serverErrorType,
  denialCodes,
  tokenDenialCodes,
) {
  if (isCredentialRefusalNotOrg(serverErrorCode, denialCodes, tokenDenialCodes)) return "refused_credential";
  let errorType = knownOrUndefined(serverErrorType);
  let subscriptionRefusal = refusalForOrgSubscription(httpStatus, errorType, denialCodes, tokenDenialCodes);
  if (
    subscriptionRefusal !== undefined &&
    (credentialState === "auth_failed" || credentialState === "request_failed")
  )
    return subscriptionRefusal;
  switch (credentialState) {
    case "auth_failed":
      if (serverErrorCode === "dead") return "refused_credential";
      if (httpStatus === 401) return "unavailable_credential_refresh";
      if (httpStatus === 403) return "blocked_by_intermediary";
      if (httpStatus === undefined && errorType === undefined)
        return serverErrorCode === undefined ? "client_no_credentials" : "unavailable_credential_refresh";
      return "refused_not_entitled";
    case "timeout":
      return "unavailable_timeout";
    case "network_error":
      return "unavailable_connect";
    case "request_failed":
      if (isRetryableHttpStatus(httpStatus)) return "unavailable_rate_limited";
      if (httpStatus === 304 || httpStatus === 404) return "blocked_by_intermediary";
      return httpStatus === undefined ? "unavailable_connect" : "unavailable_server";
    case "spurious_304":
    case "stale_tunnel_credential":
      return "unavailable_server";
    case "parse_failed":
      return "blocked_by_intermediary";
    case "session_changed":
    case undefined:
      return "unavailable_pending";
    default:
      return "client_error";
  }
}
//@ chunk-c18v4hz4.js:6656-6704 placement
/**
 * 读取同步时间的默认实现，与保存它的插槽。
 */
var syncAgeReader; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var syncAgeReaderSlot;
deferInit("chunk-c18v4hz4.js:6656", () => {
  syncAgeReader = () => remoteSettingsAgeMs();
  syncAgeReaderSlot = identity(
    {
      read: syncAgeReader,
    },
    (slot) => {
      slot.read = syncAgeReader;
    },
  );
});
//@ chunk-c18v4hz4.js:6704-6827 placement
function storedSettingsState() {
  let present = false;
  try {
    present = getRemoteManagedSettingsSyncFromCache() !== null;
  } catch {
    present = false;
  }
  let ageMs;
  try {
    ageMs = present ? syncAgeReaderSlot.read() : undefined;
  } catch {
    ageMs = undefined;
  }
  return {
    present,
    ageMs,
  };
}
//@ chunk-c18v4hz4.js:6827-6907 placement
/**
 * 视为「无需组织配置」的排除原因集合。
 */
var NOT_REQUIRED_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c18v4hz4.js:6827", () => {
  NOT_REQUIRED_REASONS = new Set(["sandboxed_entrypoint", "claude_tag", "hermetic_remote_session"]);
});
//@ chunk-c18v4hz4.js:6907-7842 placement
function settingsOutcome(
  policy,
  lastLoad,
  ineligibleReason,
  storedSettings = {
    present: false,
    ageMs: undefined,
  },
  required = false,
) {
  let hadCache =
    storedSettings.present ||
    policy?.hadCache === true ||
    policy?.source === "cache" ||
    lastLoad?.state === "stale_cache";
  let cacheFacts = {
    hasAdmittedCache: hadCache,
    admittedCacheAgeMs: hadCache ? storedSettings.ageMs : undefined,
  };
  let reason = ineligibleReason ?? (lastLoad?.state === "ineligible" ? lastLoad.reason : undefined);
  if (reason !== undefined || policy?.source === "ineligible")
    return {
      ...cacheFacts,
      reason:
        reason !== undefined && NOT_REQUIRED_REASONS.has(reason) && !required
          ? "not_required"
          : "not_attempted",
    };
  if (lastLoad?.state === "ok")
    return {
      ...cacheFacts,
      reason: lastLoad.hasSettings ? "ok" : "none_configured",
    };
  if (policy?.source === "fetch")
    return {
      ...cacheFacts,
      reason: "ok",
    };
  if (policy?.source === "none")
    return {
      ...cacheFacts,
      reason: "none_configured",
    };
  if (lastLoad?.state === "failed" || lastLoad?.state === "stale_cache")
    return {
      ...cacheFacts,
      reason: settingsRefusalReason(
        lastLoad.failure.errorKind,
        lastLoad.failure.httpStatus,
        lastLoad.failure.serverErrorType,
        lastLoad.failure.credentialState,
        lastLoad.failure.serverErrorCode,
        lastLoad.failure.serverAuthDenial,
        lastLoad.failure.noResponse,
      ),
      httpStatus: lastLoad.failure.httpStatus,
    };
  if (policy?.source === "error" || policy?.source === "rejected")
    return {
      ...cacheFacts,
      reason: "client_error",
    };
  return {
    ...cacheFacts,
    reason: "unavailable_pending",
  };
}
//@ chunk-c18v4hz4.js:7842-8839 placement
function settingsRefusalReason(
  errorKind,
  httpStatus,
  errorType,
  credentialState,
  serverErrorCode,
  serverAuthDenial,
  noResponse,
) {
  if (isCredentialRefusalNotOrg(credentialState, serverErrorCode, serverAuthDenial))
    return "refused_credential";
  let errorType_2 = knownOrUndefined(errorType);
  let subscriptionRefusal = refusalForOrgSubscription(
    httpStatus ?? (errorKind === "http_401" ? 401 : errorKind === "http_403" ? 403 : undefined),
    errorType_2,
    serverErrorCode,
    serverAuthDenial,
  );
  if (
    subscriptionRefusal !== undefined &&
    (errorKind === "http_401" || errorKind === "http_403" || errorKind === "http_4xx")
  )
    return subscriptionRefusal;
  switch (errorKind) {
    case "http_401":
      return credentialState === "dead" ? "refused_credential" : "unavailable_credential_refresh";
    case "profile_credential_error":
      return "refused_credential";
    case "http_403":
      return credentialState === "dead" ? "refused_credential" : "blocked_by_intermediary";
    case "parse_error":
      return "blocked_by_intermediary";
    case "http_4xx":
      if (isRetryableHttpStatus(httpStatus)) return "unavailable_rate_limited";
      return "blocked_by_intermediary";
    case "ruled_empty":
      return "unavailable_settings_unusable";
    case "http_5xx":
      return "unavailable_server";
    case "timeout":
      return "unavailable_timeout";
    case "network_error":
      return "unavailable_connect";
    case "no_auth_available":
    case "api_key_not_sent":
      return "client_no_credentials";
    case "unknown_error":
      if (httpStatus === 304) return "blocked_by_intermediary";
      return noResponse === true ? "unavailable_connect" : "client_error";
    default:
      return "client_error";
  }
}
//@ chunk-c18v4hz4.js:8839-8892 placement
/**
 * 门控触发面：非交互会话或启动阶段。
 */
function gateSurface() {
  return getIsNonInteractiveSession() ? "noninteractive" : "startup";
}
//@ chunk-c18v4hz4.js:8892-9886 placement
/**
 * 计算组织配置门控的完整判定：候选资格、策略与远程设置的加载结果、缓存年龄。
 */
function evaluateOrgConfigGate(
  flag,
  inputs,
  state,
  lastLoad,
  ineligibleReason,
  source = "fallback",
  storedSettings = {
    present: false,
    ageMs: undefined,
  },
  required = false,
  readFacts,
) {
  let candidacy = orgConfigCandidacy(flag, inputs);
  let armedCandidacy = orgConfigCandidacy(
    {
      ...flag,
      enabled: true,
      plans: ["team", "enterprise"],
      percent: 100,
    },
    inputs,
  );
  let policyOutcome = policyOutcomeSummary(state.policy, state.policyGateFields);
  let settingsFacts = settingsOutcome(state.settings, lastLoad, ineligibleReason, storedSettings, required);
  let armedInput = {
    flag: {
      ...flag,
      enabled: true,
      plans: ["team", "enterprise"],
      percent: 100,
    },
    candidacy: armedCandidacy,
    policy: policyOutcome,
    settings: settingsFacts,
    surface: gateSurface(),
  };
  let decision = orgConfigGateDecision(armedInput);
  return {
    decision: fromEnum(decision.verdict),
    decision_reason: fromEnumOpt(decision.reason),
    decision_resource: fromEnumOpt(decision.resource),
    surface: fromEnum(decision.surface),
    blocked_ms: 0,
    candidate_if_armed: armedCandidacy.candidate,
    exclusion_if_armed: fromEnumOpt(armedCandidacy.candidate ? undefined : armedCandidacy.exclusion),
    candidate_now: candidacy.candidate,
    exclusion_now: fromEnumOpt(candidacy.candidate ? undefined : candidacy.exclusion),
    flag_enabled: flag.enabled,
    flag_source: fromEnum(source),
    flag_percent: flag.percent,
    grace_ttl_hours: flag.graceTtlHours,
    tier: fromEnumOpt(hasOpusAccess(inputs.tier)),
    credential_shape: fromEnum(inputs.credentialShape),
    policy_reason: fromEnum(policyOutcome.reason),
    policy_has_cache: policyOutcome.hasAdmittedCache,
    policy_cache_age_ms: policyOutcome.admittedCacheAgeMs,
    settings_reason: fromEnum(settingsFacts.reason),
    settings_has_cache: settingsFacts.hasAdmittedCache,
    settings_cache_age_ms: settingsFacts.admittedCacheAgeMs,
    ...storedCopyFields(armedInput, readFacts),
  };
}
//@ chunk-c18v4hz4.js:9886-10285 placement
function storedCopyFields(armedInput, readFacts) {
  if (readFacts === undefined) return {};
  try {
    let facts = readFacts();
    return {
      settings_stored_copy: fromEnum(facts.settings.storedCopy),
      policy_stored_copy: fromEnum(facts.policy.storedCopy),
      settings_live_signed: fromEnum(facts.settings.liveSigned),
      policy_live_signed: fromEnum(facts.policy.liveSigned),
      decision_if_strict: fromEnum(resolveCacheTrustVerdict(armedInput, facts)),
    };
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the signature facts threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the signature facts threw",
      ),
    );
    return {};
  }
}
//@ chunk-c18v4hz4.js:10285-10355 placement = orgStatus (1)
/**
 * 分别按“信任缓存/不信任缓存”两种假设求 verdict，相同则返回，否则 pending。旧版名 orgStatus 为错配，与 fast mode 无关（远程桥接门控）。
 */
function resolveCacheTrustVerdict(armedInput, signatureFacts) {
  let strictVerdict = evaluateVerdictWithCacheTrust(armedInput, signatureFacts, true);
  let lenientVerdict = evaluateVerdictWithCacheTrust(armedInput, signatureFacts, false);
  return strictVerdict === lenientVerdict ? strictVerdict : "pending";
}
//@ chunk-c18v4hz4.js:10355-10466 placement
/**
 * 按是否信任存储副本调整 policy/settings 后调用 eQe 求 verdict。
 */
function evaluateVerdictWithCacheTrust(armedInput, signatureFacts, trustAnyway) {
  return orgConfigGateDecision({
    ...armedInput,
    policy: maskUntrustedAdmittedCache(armedInput.policy, signatureFacts.policy, trustAnyway),
    settings: maskUntrustedAdmittedCache(armedInput.settings, signatureFacts.settings, trustAnyway),
  }).verdict;
}
//@ chunk-c18v4hz4.js:10466-10607 placement
/**
 * 存储副本不可信时去掉 hasAdmittedCache/admittedCacheAgeMs。
 */
function maskUntrustedAdmittedCache(outcome, { storedCopy }, trustPending) {
  return storedCopy === "trusted" || storedCopy === "not_read" || (storedCopy === "pending" && trustPending)
    ? outcome
    : {
        ...outcome,
        hasAdmittedCache: false,
        admittedCacheAgeMs: undefined,
      };
}
//@ chunk-c18v4hz4.js:10607-10766 placement
function registerOrgConfigGate(options) {
  setOrgGateShadow(
    (signatureFacts) => {
      let { flag, source } = readOrgConfigRequiredFlagWithSource();
      return evaluateOrgConfigGate(
        flag,
        orgConfigInputs(options),
        signatureFacts,
        getLastLoadStatus(),
        getIneligibleReason(),
        source,
        storedSettingsState(),
        isOAuthEffective(),
        options.readSignatureFacts,
      );
    },
    options.settle === undefined ? undefined : withTimeout(options.settle, GATE_SETTLE_TIMEOUT_MS),
  );
}
//@ chunk-c18v4hz4.js:10766-10779 placement
var GATE_SETTLE_TIMEOUT_MS = 35000;
//@ chunk-c18v4hz4.js:10779-10863 placement = withTimeout (0.805)
function withTimeout(settle, timeoutMs) {
  return () =>
    Promise.race([
      settle().catch(() => {}),
      sleep(timeoutMs, undefined, {
        unref: true,
      }),
    ]);
}
//@ chunk-c18v4hz4.js:16457-16524 placement
function isGateBlocking(decision) {
  return decision.verdict === "blocked" || decision.verdict === "refused";
}
//@ chunk-c18v4hz4.js:16524-16624 placement
function gateBlockReasonCode(decision) {
  return decision.verdict === "refused" ? "org_config_refused" : "org_config_required_unavailable";
}
//@ chunk-c18v4hz4.js:16624-16778 placement
function isGateRefusalFinal(decision) {
  return (
    decision.verdict === "refused" ||
    decision.reason === "not_attempted" ||
    decision.reason === "client_no_credentials" ||
    decision.reason === "unavailable_credential_refresh"
  );
}
//@ chunk-c18v4hz4.js:16778-16873 placement
/**
 * 等待下一次设置加载结果的观察器（promise + dispose）。
 */
function nextSettingsOutcomeWatcher() {
  let unsubscribe = () => {};
  return {
    recorded: new Promise((resolve) => {
      unsubscribe = onLastLoadStatusChanged(() => {
        unsubscribe();
        resolve();
      });
    }),
    dispose: unsubscribe,
  };
}
//@ chunk-c18v4hz4.js:16873-17067 placement
var DEFAULT_GATE_DEPS = {
  kickPolicy: ensurePolicyLimitsLoadRequested,
  kickSettings: kickSettingsLoad,
  policySettled: waitForPolicyLimitsToLoad,
  settingsSettled: waitForRemoteManagedSettingsFetchToSettle,
  planReverified: () => pendingVerification() ?? Promise.resolve(),
  pendingConsentDialog: pendingPreReplSecurityDialog,
  nextSettingsOutcome: nextSettingsOutcomeWatcher,
  now: () => performance.now(),
};
//@ chunk-c18v4hz4.js:17067-17737 placement
/**
 * 执行组织配置门控：拉取策略与设置，等待结果并记录事件，必要时阻止会话。
 */
async function runOrgConfigGate(options, deps = DEFAULT_GATE_DEPS) {
  let startedAt = deps.now();
  try {
    deps.kickPolicy();
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the policy kick threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the policy kick threw",
      ),
    );
  }
  try {
    deps.kickSettings();
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the settings kick threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the settings kick threw",
      ),
    );
  }
  await withDeadline(
    Promise.all([
      deps.policySettled().catch(() => {}),
      deps.settingsSettled().catch(() => {}),
      deps.planReverified?.().catch(() => {}),
    ]),
    options,
  );
  let consentDialog = deps.pendingConsentDialog();
  if (consentDialog !== null) {
    let nextOutcome = deps.nextSettingsOutcome();
    try {
      await consentDialog.catch(() => {});
      await withDeadline(
        Promise.all([deps.settingsSettled().catch(() => {}), nextOutcome.recorded]),
        options,
      );
    } finally {
      nextOutcome.dispose();
    }
  }
  return Math.max(0, Math.round(deps.now() - startedAt));
}
//@ chunk-c18v4hz4.js:17737-17792 placement
/**
 * 视为凭据门槛未通过的排除原因集合。
 */
var CREDENTIAL_GATE_MISS_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c18v4hz4.js:17737", () => {
  CREDENTIAL_GATE_MISS_REASONS = new Set(["no_auth", "unsupported_subscription"]);
});
//@ chunk-c18v4hz4.js:17792-18085 placement
function isStoredLoginRefusal(reason, inputs) {
  if (inputs.storedLoginOrigin !== true) return false;
  if (inputs.credentialShape !== "stored_login" && inputs.credentialShape !== "untiered_login") return false;
  switch (reason) {
    case "no_auth":
      return true;
    case "unsupported_subscription":
      return (
        inputs.credentialShape === "untiered_login" || inputs.tier === null || isOrgConfigPlan(inputs.tier)
      );
    default:
      return false;
  }
}
//@ chunk-c18v4hz4.js:18085-18232 placement
var ELIGIBILITY_DEPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var seenGateKeys;
deferInit("chunk-c18v4hz4.js:18085", () => {
  ELIGIBILITY_DEPS = {
    memoizedReason: getIneligibleReason,
    inputs: () => ({
      credentialShape: credentialShapeInputs(),
      storedLoginOrigin: isOAuthEffective(),
      tier: getStoredOAuthSubscriptionType(),
    }),
    reset: resetEligibilityMemo,
  };
  seenGateKeys = identity(
    {
      seen: new Set(),
    },
    (slot) => {
      slot.seen = new Set();
    },
  );
});
//@ chunk-c18v4hz4.js:18232-18533 placement
function shouldRecheckStoredLogin(deps = ELIGIBILITY_DEPS) {
  let reason = deps.memoizedReason();
  if (!CREDENTIAL_GATE_MISS_REASONS.has(reason ?? "")) return false;
  let candidateInputs = deps.inputs();
  if (!isStoredLoginRefusal(reason, candidateInputs)) return false;
  let gateKey = `${reason}|${candidateInputs.credentialShape}|${candidateInputs.tier}`;
  if (seenGateKeys.seen.has(gateKey)) return false;
  seenGateKeys.seen.add(gateKey);
  deps.reset();
  logForDebugging(
    `org-config gate: settings eligibility (${reason}) predates the stored login; re-evaluating`,
  );
  return true;
}
//@ chunk-c18v4hz4.js:18533-18701 placement
function kickSettingsLoad(deps = ELIGIBILITY_DEPS, load = () => loadRemoteManagedSettings()) {
  if (!shouldRecheckStoredLogin(deps)) return;
  load().catch((error) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the settings load threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the settings load threw",
      ),
    ),
  );
}
//@ chunk-c18v4hz4.js:18701-18817 placement
function readGateFlag(options) {
  if (options.readFlag !== undefined)
    return {
      flag: options.readFlag(),
      source: options.readFlagSource?.() ?? "override",
    };
  return readOrgConfigRequiredFlagWithSource();
}
//@ chunk-c18v4hz4.js:18817-19011 placement
function passDecision(flag, flagSource, candidacy, surface) {
  return {
    decision: {
      verdict: "pass",
      blockedMs: 0,
      surface,
    },
    message: undefined,
    flag,
    flagSource,
    candidacy,
    armed: false,
    context: {},
    attempt: 0,
    decidedWithoutWaiting: true,
    outcomes: undefined,
  };
}
//@ chunk-c18v4hz4.js:19011-19053 placement
/**
 * 默认门控判定：非候选且开关未开。
 */
var DEFAULT_GATE_DECISION = {
  candidate: false,
  exclusion: "flag_off",
};
//@ chunk-c18v4hz4.js:19053-19106 placement
function isFallbackFlagUsable(source, isFetchHeld, isCacheEmpty) {
  return source !== "fallback" || !isCacheEmpty() || isFetchHeld();
}
//@ chunk-c18v4hz4.js:19106-19442 placement
function orgConfigGateQuick(options) {
  let { flag, source } = readGateFlag(options);
  if (
    !flag.enabled &&
    isFallbackFlagUsable(
      source,
      options.isFlagFetchHeld ?? isFlagFetchHeld_2,
      options.isFlagCacheEmpty ?? isGrowthBookCacheEmpty,
    )
  )
    return passDecision(flag, source, DEFAULT_GATE_DECISION, options.surface);
  let candidacy = orgConfigCandidacy(
    flag,
    (options.readCandidateInputs ?? orgConfigInputs)({
      authRecoveryCommand: options.authRecoveryCommand,
    }),
  );
  if (!flag.enabled || !candidacy.candidate) return passDecision(flag, source, candidacy, options.surface);
  return gateDecisionFromOutcomes(options, flag, source, candidacy, 0, 0, {
    report: false,
    decidedWithoutWaiting: true,
  });
}
//@ chunk-c18v4hz4.js:19442-20214 placement
async function awaitOrgConfigGate(options) {
  let isFlagFetchHeld = options.isFlagFetchHeld ?? isFlagFetchHeld_2;
  let isFlagCacheEmpty = options.isFlagCacheEmpty ?? isGrowthBookCacheEmpty;
  if (options.afterSignIn === true) await refreshFlagIfStale(options);
  let evaluation = orgConfigGateQuick(options);
  if (isUnarmedFallback(evaluation, isFlagFetchHeld, isFlagCacheEmpty)) {
    await growthBookReady(options.fetchFlag);
    evaluation = orgConfigGateQuick(options);
  }
  if (!evaluation.armed || evaluation.outcomes === undefined) return evaluation;
  evaluation = await retryGateAfterOutcomes(
    evaluation,
    () => orgConfigGateQuick(options),
    options.primeSettingsCacheAge,
  );
  if (!evaluation.armed || evaluation.outcomes === undefined) return evaluation;
  if (!isGateBlocking(evaluation.decision)) {
    await (options.report ?? logOrgConfigGate)(evaluation, evaluation.outcomes);
    return evaluation;
  }
  let { flag, flagSource } = evaluation;
  let [blockedMs] = await Promise.all([
    (options.settle ?? runOrgConfigGate)(flag.budgetMs),
    isFlagSourceUntrusted(flagSource, isFlagFetchHeld, isFlagCacheEmpty)
      ? initGrowthBookWithDeadline(flag.budgetMs, options.fetchFlag)
      : undefined,
  ]);
  let gateFlag = readGateFlag(options);
  if (!gateFlag.flag.enabled)
    return passDecision(gateFlag.flag, gateFlag.source, DEFAULT_GATE_DECISION, options.surface);
  let candidacy = orgConfigCandidacy(
    gateFlag.flag,
    (options.readCandidateInputs ?? orgConfigInputs)({
      authRecoveryCommand: options.authRecoveryCommand,
    }),
  );
  if (!candidacy.candidate) return passDecision(gateFlag.flag, gateFlag.source, candidacy, options.surface);
  return gateDecisionFromOutcomes(options, gateFlag.flag, gateFlag.source, candidacy, blockedMs, 0, {
    report: true,
    decidedWithoutWaiting: false,
  });
}
//@ chunk-c18v4hz4.js:20214-20340 placement
async function retryGateAfterOutcomes(decision, reevaluate, primeSettingsCacheAge = awaitSyncAge) {
  if (
    !decision.armed ||
    decision.outcomes === undefined ||
    !isGateBlocking(decision.decision) ||
    !hasAdmittedCacheWithoutAge(decision.outcomes)
  )
    return decision;
  await primeSettingsCacheAge();
  return reevaluate();
}
//@ chunk-c18v4hz4.js:20340-20430 placement
/**
 * 有已接纳缓存但缓存年龄未知。
 */
function hasAdmittedCacheWithoutAge(outcomes) {
  return outcomes.settings.hasAdmittedCache && outcomes.settings.admittedCacheAgeMs === undefined;
}
//@ chunk-c18v4hz4.js:20430-20494 placement
/**
 * 等待同步时间读取完成（吞掉错误）。
 */
async function awaitSyncAge() {
  await readSyncAge().then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
}
//@ chunk-c18v4hz4.js:20494-20770 placement
function orgConfigGateSync(options, blockedMs, attempt = 1) {
  let { flag, source } = readGateFlag(options);
  if (!flag.enabled) return passDecision(flag, source, DEFAULT_GATE_DECISION, options.surface);
  let candidacy = orgConfigCandidacy(
    flag,
    (options.readCandidateInputs ?? orgConfigInputs)({
      authRecoveryCommand: options.authRecoveryCommand,
    }),
  );
  if (!candidacy.candidate) return passDecision(flag, source, candidacy, options.surface);
  return gateDecisionFromOutcomes(options, flag, source, candidacy, blockedMs, attempt, {
    report: true,
    decidedWithoutWaiting: false,
  });
}
//@ chunk-c18v4hz4.js:20770-21145 placement
function gateDecisionFromOutcomes(options, flag, flagSource, candidacy, blockedMs, attempt, flags) {
  let outcomes = (options.readOutcomes ?? currentGateOutcomes)();
  let decision = orgConfigGateDecision({
    flag,
    candidacy,
    policy: outcomes.policy,
    settings: outcomes.settings,
    surface: options.surface,
    blockedMs,
  });
  let context = (options.readContext ?? orgConfigContext)(outcomes, decision.resource);
  let evaluation = {
    decision,
    message: orgConfigGateMessage(decision, context),
    flag,
    flagSource,
    candidacy,
    armed: true,
    context,
    attempt,
    decidedWithoutWaiting: flags.decidedWithoutWaiting,
    outcomes,
  };
  if (flags.report) (options.report ?? logOrgConfigGate)(evaluation, outcomes);
  return evaluation;
}
//@ chunk-c18v4hz4.js:21145-22408 placement
function logOrgConfigGate(gateAttempt, outcomes, outcome) {
  let { decision, flag, candidacy } = gateAttempt;
  let decisionLog = logEventAsync("tengu_org_config_gate", {
    decision: fromEnum(decision.verdict),
    decision_reason: fromEnumOpt(decision.reason),
    decision_resource: fromEnumOpt(decision.resource),
    surface: fromEnum(decision.surface),
    blocked_ms: decision.blockedMs,
    attempt: gateAttempt.attempt,
    decided_without_waiting: gateAttempt.decidedWithoutWaiting,
    final_outcome: fromEnumOpt(outcome?.outcome),
    recovered_after_ms: outcome?.recoveredAfterMs,
    tier: fromEnumOpt(candidacy.candidate ? candidacy.tier : undefined),
    flag_source: fromEnum(gateAttempt.flagSource),
    flag_percent: flag.percent,
    grace_ttl_hours: flag.graceTtlHours,
    budget_ms: flag.budgetMs,
    policy_reason: fromEnumOpt(outcomes?.policy.reason),
    policy_has_cache: outcomes?.policy.hasAdmittedCache,
    policy_cache_age_ms: outcomes?.policy.admittedCacheAgeMs,
    settings_reason: fromEnumOpt(outcomes?.settings.reason),
    settings_has_cache: outcomes?.settings.hasAdmittedCache,
    settings_cache_age_ms: outcomes?.settings.admittedCacheAgeMs,
    http_status: gateAttempt.context.httpStatus,
  }).catch(() => {});
  let shouldReport =
    !gateDecisionLogged.done &&
    (outcome !== undefined || (gateAttempt.attempt === 0 && !isGateBlocking(decision)));
  if (shouldReport) gateDecisionLogged.done = true;
  let badLog = !shouldReport
    ? undefined
    : decision.verdict === "pass"
      ? logFeatureOkAsync("org_config_gate")
      : decision.verdict === "pass_cached" || decision.verdict === "pass_exempt"
        ? logFeatureSadAsync("org_config_gate", decision.verdict)
        : logFeatureBadAsync("org_config_gate", decision.reason ?? decision.verdict);
  let pending = Promise.all([decisionLog, badLog]).then(() => {
    return;
  });
  pendingGateLogs.set.add(pending);
  pending.finally(() => pendingGateLogs.set.delete(pending));
  logForDebugging(
    `org-config gate: ${decision.verdict}${decision.reason ? ` (${decision.resource} ${decision.reason})` : ""} on ${decision.surface} after ${decision.blockedMs}ms`,
  );
  return pending;
}
//@ chunk-c18v4hz4.js:22408-22486 placement
/**
 * 本次门控判定是否已记录（可重置）。
 */
var gateDecisionLogged; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var pendingGateLogs;
deferInit("chunk-c18v4hz4.js:22408", () => {
  gateDecisionLogged = identity(
    {
      done: false,
    },
    (slot) => {
      slot.done = false;
    },
  );
  pendingGateLogs = identity(
    {
      set: new Set(),
    },
    (slot) => {
      slot.set = new Set();
    },
  );
});
//@ chunk-c18v4hz4.js:22486-22544 placement
async function settlePendingGateWork() {
  await Promise.allSettled([...pendingGateLogs.set]);
}
//@ chunk-c18v4hz4.js:22544-23165 placement
async function reevaluateSettingsGate(recheck = shouldRecheckStoredLogin) {
  try {
    recheck();
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the settings re-evaluation threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the settings re-evaluation threw",
      ),
    );
  }
  await Promise.all([
    loadPolicyLimits({
      singleAttempt: true,
    }).catch((error) =>
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the policy retry threw (${errorKindForTelemetry(error)})`,
          "org-config gate: the policy retry threw",
        ),
      ),
    ),
    loadRemoteManagedSettings(undefined, undefined, {
      singleAttempt: true,
    }).catch((error) => {
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the settings retry threw (${errorKindForTelemetry(error)})`,
          "org-config gate: the settings retry threw",
        ),
      );
      return false;
    }),
    withDeadline(
      refreshGrowthBookFeatures().catch((error) =>
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `org-config gate: the flag refresh threw (${errorKindForTelemetry(error)})`,
            "org-config gate: the flag refresh threw",
          ),
        ),
      ),
      FLAG_REFRESH_TIMEOUT_MS,
    ),
  ]);
}
//@ chunk-c18v4hz4.js:23165-23177 placement
/**
 * 刷新 GrowthBook 开关的超时。
 */
var FLAG_REFRESH_TIMEOUT_MS = 3000;
//@ chunk-c18v4hz4.js:23177-23262 placement
function isFlagSourceUntrusted(
  flagSource,
  isFlagFetchHeld = isFlagFetchHeld_2,
  isFlagCacheEmpty = isGrowthBookCacheEmpty,
) {
  if (flagSource === "disk") return !isFlagFetchHeld();
  return flagSource === "fallback" && isFlagCacheEmpty() && !isFlagFetchHeld();
}
//@ chunk-c18v4hz4.js:23262-23402 placement
function isUnarmedFallback(
  state,
  isFlagFetchHeld = isFlagFetchHeld_2,
  isFlagCacheEmpty = isGrowthBookCacheEmpty,
) {
  return (
    !state.armed &&
    state.flagSource === "fallback" &&
    !state.candidacy.candidate &&
    state.candidacy.exclusion === "flag_off" &&
    isFlagCacheEmpty() &&
    !isFlagFetchHeld()
  );
}
//@ chunk-c18v4hz4.js:23402-23443 placement
function isFlagFetchHeld_2() {
  return isPendingNotOver(currentFetchHold()) || !hasWorkspaceTrust();
}
//@ chunk-c18v4hz4.js:23443-23476 placement
function isFlagFetchHeldNoTrust() {
  return isPendingNotOver(currentFetchHold());
}
//@ chunk-c18v4hz4.js:23476-23551 placement
async function initGrowthBookWithDeadline(budgetMs, fetchFlag = initializeGrowthBook) {
  await withDeadline(
    fetchFlag().then(
      () => {
        return;
      },
      () => {
        return;
      },
    ),
    budgetMs,
  );
}
//@ chunk-c18v4hz4.js:23551-23691 placement
async function refreshFlagIfStale(options) {
  let { source } = readGateFlag(options);
  if (source !== "disk" && source !== "fallback") return;
  if ((options.isFlagFetchHeld ?? isFlagFetchHeld_2)()) return;
  await initGrowthBookWithDeadline(EVENT_LOGGING_FLAG_WAIT_MS, options.fetchFlag);
}
//@ chunk-c18v4hz4.js:23691-23756 placement
/**
 * 按 fetcher 缓存 GrowthBook 初始化 Promise。
 */
var growthBookReadyByFetcher; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c18v4hz4.js:23691", () => {
  growthBookReadyByFetcher = identity(
    {
      byFetcher: new WeakMap(),
    },
    (slot) => {
      slot.byFetcher = new WeakMap();
    },
  );
});
//@ chunk-c18v4hz4.js:23756-23856 placement
function growthBookReady(fetchFlag = initializeGrowthBook) {
  let ready = growthBookReadyByFetcher.byFetcher.get(fetchFlag);
  if (ready === undefined) {
    ready = initGrowthBookWithDeadline(EVENT_LOGGING_FLAG_WAIT_MS, fetchFlag);
    growthBookReadyByFetcher.byFetcher.set(fetchFlag, ready);
  }
  return ready;
}
//@ chunk-c18v4hz4.js:23856-23910 placement
/**
 * 门控重试的延迟序列与抖动比例。
 */
var GATE_RETRY_DELAYS_MS = [15000, 15000, 30000, 60000, 180000, 600000];
var GATE_RETRY_JITTER_RATIO = 0.3;
//@ chunk-c18v4hz4.js:23910-24034 placement
function jitteredRetryMs(rung, random = Math.random) {
  let baseMs = GATE_RETRY_DELAYS_MS[rung];
  if (baseMs === undefined) return;
  let jitter = (random() * 2 - 1) * GATE_RETRY_JITTER_RATIO;
  return Math.max(1000, Math.round(baseMs * (1 + jitter)));
}
export {
  registerOrgConfigGate,
  isGateBlocking,
  jitteredRetryMs,
  isGateRefusalFinal,
  settlePendingGateWork,
  policyRefusalReason,
  settingsOutcome,
  storedSettingsState,
  gateBlockReasonCode,
  orgConfigGateQuick,
  isFlagFetchHeld_2,
  isFlagSourceUntrusted,
  initGrowthBookWithDeadline,
  logOrgConfigGate,
  awaitOrgConfigGate,
  reevaluateSettingsGate,
  isUnarmedFallback,
  growthBookReady,
  retryGateAfterOutcomes,
  orgConfigGateSync,
  refusalForOrgSubscription,
  isFlagFetchHeldNoTrust,
  isFallbackFlagUsable,
};

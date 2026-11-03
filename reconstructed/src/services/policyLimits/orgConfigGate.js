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

//@ chunk-c18v4hz4.js:5344-5407 placement
/**
 * 状态为 dead 且认证拒绝与组织无关时视为凭据拒绝。
 */
function isCredentialRefusalNotOrg(e, n, r) {
  return e === "dead" && classifyAuthDenial(n, r) !== "organization";
}
//@ chunk-c18v4hz4.js:5407-5723 placement
function refusalForOrgSubscription(e, n, r, o) {
  if (knownOrUndefined(n) === undefined) return;
  let a = classifyAuthDenial(r, o);
  if (a === "organization") return "refused_not_entitled";
  if (a === "credential") return "refused_credential";
  if (e === 404) return "none_configured";
  if (e === 401 || e === undefined) return;
  if (e === 403) return "refused_not_entitled";
  if (isRetryableHttpStatus(e) || e >= 500) return;
  return "unavailable_server";
}
//@ chunk-c18v4hz4.js:5723-6656 placement
function policyRefusalReason(e, n, r, o, a, d) {
  if (isCredentialRefusalNotOrg(n, a, d)) return "refused_credential";
  let u = knownOrUndefined(o);
  let s = refusalForOrgSubscription(r, u, a, d);
  if (s !== undefined && (e === "auth_failed" || e === "request_failed")) return s;
  switch (e) {
    case "auth_failed":
      if (n === "dead") return "refused_credential";
      if (r === 401) return "unavailable_credential_refresh";
      if (r === 403) return "blocked_by_intermediary";
      if (r === undefined && u === undefined)
        return n === undefined ? "client_no_credentials" : "unavailable_credential_refresh";
      return "refused_not_entitled";
    case "timeout":
      return "unavailable_timeout";
    case "network_error":
      return "unavailable_connect";
    case "request_failed":
      if (isRetryableHttpStatus(r)) return "unavailable_rate_limited";
      if (r === 304 || r === 404) return "blocked_by_intermediary";
      return r === undefined ? "unavailable_connect" : "unavailable_server";
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
var syncAgeReader = () => remoteSettingsAgeMs();
var syncAgeReaderSlot = identity(
  {
    read: syncAgeReader,
  },
  (e) => {
    e.read = syncAgeReader;
  },
);
//@ chunk-c18v4hz4.js:6704-6827 placement
function storedSettingsState() {
  let e = false;
  try {
    e = getRemoteManagedSettingsSyncFromCache() !== null;
  } catch {
    e = false;
  }
  let n;
  try {
    n = e ? syncAgeReaderSlot.read() : undefined;
  } catch {
    n = undefined;
  }
  return {
    present: e,
    ageMs: n,
  };
}
//@ chunk-c18v4hz4.js:6827-6907 placement
/**
 * 视为「无需组织配置」的排除原因集合。
 */
var NOT_REQUIRED_REASONS = new Set(["sandboxed_entrypoint", "claude_tag", "hermetic_remote_session"]);
//@ chunk-c18v4hz4.js:6907-7842 placement
function settingsOutcome(
  e,
  n,
  r,
  o = {
    present: false,
    ageMs: undefined,
  },
  a = false,
) {
  let d = o.present || e?.hadCache === true || e?.source === "cache" || n?.state === "stale_cache";
  let u = {
    hasAdmittedCache: d,
    admittedCacheAgeMs: d ? o.ageMs : undefined,
  };
  let s = r ?? (n?.state === "ineligible" ? n.reason : undefined);
  if (s !== undefined || e?.source === "ineligible")
    return {
      ...u,
      reason: s !== undefined && NOT_REQUIRED_REASONS.has(s) && !a ? "not_required" : "not_attempted",
    };
  if (n?.state === "ok")
    return {
      ...u,
      reason: n.hasSettings ? "ok" : "none_configured",
    };
  if (e?.source === "fetch")
    return {
      ...u,
      reason: "ok",
    };
  if (e?.source === "none")
    return {
      ...u,
      reason: "none_configured",
    };
  if (n?.state === "failed" || n?.state === "stale_cache")
    return {
      ...u,
      reason: settingsRefusalReason(
        n.failure.errorKind,
        n.failure.httpStatus,
        n.failure.serverErrorType,
        n.failure.credentialState,
        n.failure.serverErrorCode,
        n.failure.serverAuthDenial,
        n.failure.noResponse,
      ),
      httpStatus: n.failure.httpStatus,
    };
  if (e?.source === "error" || e?.source === "rejected")
    return {
      ...u,
      reason: "client_error",
    };
  return {
    ...u,
    reason: "unavailable_pending",
  };
}
//@ chunk-c18v4hz4.js:7842-8839 placement
function settingsRefusalReason(
  errorKind,
  httpStatus,
  serverErrorType,
  credentialState,
  serverErrorCode,
  serverAuthDenial,
  noResponse,
) {
  if (isCredentialRefusalNotOrg(credentialState, serverErrorCode, serverAuthDenial))
    return "refused_credential";
  let s = knownOrUndefined(serverErrorType);
  let f = refusalForOrgSubscription(
    httpStatus ?? (errorKind === "http_401" ? 401 : errorKind === "http_403" ? 403 : undefined),
    s,
    serverErrorCode,
    serverAuthDenial,
  );
  if (f !== undefined && (errorKind === "http_401" || errorKind === "http_403" || errorKind === "http_4xx"))
    return f;
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
  n,
  r,
  lastLoadStatus,
  ineligibleReason,
  source = "fallback",
  u = {
    present: false,
    ageMs: undefined,
  },
  s = false,
  readSignatureFacts,
) {
  let f = orgConfigCandidacy(flag, n);
  let m = orgConfigCandidacy(
    {
      ...flag,
      enabled: true,
      plans: ["team", "enterprise"],
      percent: 100,
    },
    n,
  );
  let _ = policyOutcomeSummary(r.policy, r.policyGateFields);
  let v = settingsOutcome(r.settings, lastLoadStatus, ineligibleReason, u, s);
  let P = {
    flag: {
      ...flag,
      enabled: true,
      plans: ["team", "enterprise"],
      percent: 100,
    },
    candidacy: m,
    policy: _,
    settings: v,
    surface: gateSurface(),
  };
  let G = orgConfigGateDecision(P);
  return {
    decision: fromEnum(G.verdict),
    decision_reason: fromEnumOpt(G.reason),
    decision_resource: fromEnumOpt(G.resource),
    surface: fromEnum(G.surface),
    blocked_ms: 0,
    candidate_if_armed: m.candidate,
    exclusion_if_armed: fromEnumOpt(m.candidate ? undefined : m.exclusion),
    candidate_now: f.candidate,
    exclusion_now: fromEnumOpt(f.candidate ? undefined : f.exclusion),
    flag_enabled: flag.enabled,
    flag_source: fromEnum(source),
    flag_percent: flag.percent,
    grace_ttl_hours: flag.graceTtlHours,
    tier: fromEnumOpt(hasOpusAccess(n.tier)),
    credential_shape: fromEnum(n.credentialShape),
    policy_reason: fromEnum(_.reason),
    policy_has_cache: _.hasAdmittedCache,
    policy_cache_age_ms: _.admittedCacheAgeMs,
    settings_reason: fromEnum(v.reason),
    settings_has_cache: v.hasAdmittedCache,
    settings_cache_age_ms: v.admittedCacheAgeMs,
    ...storedCopyFields(P, readSignatureFacts),
  };
}
//@ chunk-c18v4hz4.js:9886-10285 placement
function storedCopyFields(e, n) {
  if (n === undefined) return {};
  try {
    let r = n();
    return {
      settings_stored_copy: fromEnum(r.settings.storedCopy),
      policy_stored_copy: fromEnum(r.policy.storedCopy),
      settings_live_signed: fromEnum(r.settings.liveSigned),
      policy_live_signed: fromEnum(r.policy.liveSigned),
      decision_if_strict: fromEnum(resolveCacheTrustVerdict(e, r)),
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
function resolveCacheTrustVerdict(e, n) {
  let r = evaluateVerdictWithCacheTrust(e, n, true);
  let o = evaluateVerdictWithCacheTrust(e, n, false);
  return r === o ? r : "pending";
}
//@ chunk-c18v4hz4.js:10355-10466 placement
/**
 * 按是否信任存储副本调整 policy/settings 后调用 eQe 求 verdict。
 */
function evaluateVerdictWithCacheTrust(e, n, r) {
  return orgConfigGateDecision({
    ...e,
    policy: maskUntrustedAdmittedCache(e.policy, n.policy, r),
    settings: maskUntrustedAdmittedCache(e.settings, n.settings, r),
  }).verdict;
}
//@ chunk-c18v4hz4.js:10466-10607 placement
/**
 * 存储副本不可信时去掉 hasAdmittedCache/admittedCacheAgeMs。
 */
function maskUntrustedAdmittedCache(e, { storedCopy }, r) {
  return storedCopy === "trusted" || storedCopy === "not_read" || (storedCopy === "pending" && r)
    ? e
    : {
        ...e,
        hasAdmittedCache: false,
        admittedCacheAgeMs: undefined,
      };
}
//@ chunk-c18v4hz4.js:10607-10766 placement
function registerOrgConfigGate(e) {
  setOrgGateShadow(
    (n) => {
      let { flag, source } = readOrgConfigRequiredFlagWithSource();
      return evaluateOrgConfigGate(
        flag,
        orgConfigInputs(e),
        n,
        getLastLoadStatus(),
        getIneligibleReason(),
        source,
        storedSettingsState(),
        isOAuthEffective(),
        e.readSignatureFacts,
      );
    },
    e.settle === undefined ? undefined : withTimeout(e.settle, GATE_SETTLE_TIMEOUT_MS),
  );
}
//@ chunk-c18v4hz4.js:10766-10779 placement
var GATE_SETTLE_TIMEOUT_MS = 35000;
//@ chunk-c18v4hz4.js:10779-10863 placement = withTimeout (0.805)
function withTimeout(settle, n) {
  return () =>
    Promise.race([
      settle().catch(() => {}),
      sleep(n, undefined, {
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
  let e = () => {};
  return {
    recorded: new Promise((resolve) => {
      e = onLastLoadStatusChanged(() => {
        e();
        resolve();
      });
    }),
    dispose: e,
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
async function runOrgConfigGate(e, n = DEFAULT_GATE_DEPS) {
  let r = n.now();
  try {
    n.kickPolicy();
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the policy kick threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the policy kick threw",
      ),
    );
  }
  try {
    n.kickSettings();
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
      n.policySettled().catch(() => {}),
      n.settingsSettled().catch(() => {}),
      n.planReverified?.().catch(() => {}),
    ]),
    e,
  );
  let o = n.pendingConsentDialog();
  if (o !== null) {
    let a = n.nextSettingsOutcome();
    try {
      await o.catch(() => {});
      await withDeadline(Promise.all([n.settingsSettled().catch(() => {}), a.recorded]), e);
    } finally {
      a.dispose();
    }
  }
  return Math.max(0, Math.round(n.now() - r));
}
//@ chunk-c18v4hz4.js:17737-17792 placement
/**
 * 视为凭据门槛未通过的排除原因集合。
 */
var CREDENTIAL_GATE_MISS_REASONS = new Set(["no_auth", "unsupported_subscription"]);
//@ chunk-c18v4hz4.js:17792-18085 placement
function isStoredLoginRefusal(e, n) {
  if (n.storedLoginOrigin !== true) return false;
  if (n.credentialShape !== "stored_login" && n.credentialShape !== "untiered_login") return false;
  switch (e) {
    case "no_auth":
      return true;
    case "unsupported_subscription":
      return n.credentialShape === "untiered_login" || n.tier === null || isOrgConfigPlan(n.tier);
    default:
      return false;
  }
}
//@ chunk-c18v4hz4.js:18085-18232 placement
var ELIGIBILITY_DEPS = {
  memoizedReason: getIneligibleReason,
  inputs: () => ({
    credentialShape: credentialShapeInputs(),
    storedLoginOrigin: isOAuthEffective(),
    tier: getStoredOAuthSubscriptionType(),
  }),
  reset: resetEligibilityMemo,
};
var seenGateKeys = identity(
  {
    seen: new Set(),
  },
  (e) => {
    e.seen = new Set();
  },
);
//@ chunk-c18v4hz4.js:18232-18533 placement
function shouldRecheckStoredLogin(e = ELIGIBILITY_DEPS) {
  let n = e.memoizedReason();
  if (!CREDENTIAL_GATE_MISS_REASONS.has(n ?? "")) return false;
  let r = e.inputs();
  if (!isStoredLoginRefusal(n, r)) return false;
  let o = `${n}|${r.credentialShape}|${r.tier}`;
  if (seenGateKeys.seen.has(o)) return false;
  seenGateKeys.seen.add(o);
  e.reset();
  logForDebugging(`org-config gate: settings eligibility (${n}) predates the stored login; re-evaluating`);
  return true;
}
//@ chunk-c18v4hz4.js:18533-18701 placement
function kickSettingsLoad(e = ELIGIBILITY_DEPS, n = () => loadRemoteManagedSettings()) {
  if (!shouldRecheckStoredLogin(e)) return;
  n().catch((error) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the settings load threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the settings load threw",
      ),
    ),
  );
}
//@ chunk-c18v4hz4.js:18701-18817 placement
function readGateFlag(e) {
  if (e.readFlag !== undefined)
    return {
      flag: e.readFlag(),
      source: e.readFlagSource?.() ?? "override",
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
function isFallbackFlagUsable(source, n, r) {
  return source !== "fallback" || !r() || n();
}
//@ chunk-c18v4hz4.js:19106-19442 placement
function orgConfigGateQuick(e) {
  let { flag, source } = readGateFlag(e);
  if (
    !flag.enabled &&
    isFallbackFlagUsable(
      source,
      e.isFlagFetchHeld ?? isFlagFetchHeld_2,
      e.isFlagCacheEmpty ?? isGrowthBookCacheEmpty,
    )
  )
    return passDecision(flag, source, DEFAULT_GATE_DECISION, e.surface);
  let candidacy = orgConfigCandidacy(
    flag,
    (e.readCandidateInputs ?? orgConfigInputs)({
      authRecoveryCommand: e.authRecoveryCommand,
    }),
  );
  if (!flag.enabled || !candidacy.candidate) return passDecision(flag, source, candidacy, e.surface);
  return gateDecisionFromOutcomes(e, flag, source, candidacy, 0, 0, {
    report: false,
    decidedWithoutWaiting: true,
  });
}
//@ chunk-c18v4hz4.js:19442-20214 placement
async function awaitOrgConfigGate(e) {
  let isFlagFetchHeld = e.isFlagFetchHeld ?? isFlagFetchHeld_2;
  let isFlagCacheEmpty = e.isFlagCacheEmpty ?? isGrowthBookCacheEmpty;
  if (e.afterSignIn === true) await refreshFlagIfStale(e);
  let o = orgConfigGateQuick(e);
  if (isUnarmedFallback(o, isFlagFetchHeld, isFlagCacheEmpty)) {
    await growthBookReady(e.fetchFlag);
    o = orgConfigGateQuick(e);
  }
  if (!o.armed || o.outcomes === undefined) return o;
  o = await retryGateAfterOutcomes(o, () => orgConfigGateQuick(e), e.primeSettingsCacheAge);
  if (!o.armed || o.outcomes === undefined) return o;
  if (!isGateBlocking(o.decision)) {
    await (e.report ?? logOrgConfigGate)(o, o.outcomes);
    return o;
  }
  let { flag, flagSource } = o;
  let [blockedMs] = await Promise.all([
    (e.settle ?? runOrgConfigGate)(flag.budgetMs),
    isFlagSourceUntrusted(flagSource, isFlagFetchHeld, isFlagCacheEmpty)
      ? initGrowthBookWithDeadline(flag.budgetMs, e.fetchFlag)
      : undefined,
  ]);
  let gateFlag = readGateFlag(e);
  if (!gateFlag.flag.enabled)
    return passDecision(gateFlag.flag, gateFlag.source, DEFAULT_GATE_DECISION, e.surface);
  let candidacy = orgConfigCandidacy(
    gateFlag.flag,
    (e.readCandidateInputs ?? orgConfigInputs)({
      authRecoveryCommand: e.authRecoveryCommand,
    }),
  );
  if (!candidacy.candidate) return passDecision(gateFlag.flag, gateFlag.source, candidacy, e.surface);
  return gateDecisionFromOutcomes(e, gateFlag.flag, gateFlag.source, candidacy, blockedMs, 0, {
    report: true,
    decidedWithoutWaiting: false,
  });
}
//@ chunk-c18v4hz4.js:20214-20340 placement
async function retryGateAfterOutcomes(e, n, primeSettingsCacheAge = awaitSyncAge) {
  if (
    !e.armed ||
    e.outcomes === undefined ||
    !isGateBlocking(e.decision) ||
    !hasAdmittedCacheWithoutAge(e.outcomes)
  )
    return e;
  await primeSettingsCacheAge();
  return n();
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
function orgConfigGateSync(e, blockedMs, attempt = 1) {
  let { flag, source } = readGateFlag(e);
  if (!flag.enabled) return passDecision(flag, source, DEFAULT_GATE_DECISION, e.surface);
  let candidacy = orgConfigCandidacy(
    flag,
    (e.readCandidateInputs ?? orgConfigInputs)({
      authRecoveryCommand: e.authRecoveryCommand,
    }),
  );
  if (!candidacy.candidate) return passDecision(flag, source, candidacy, e.surface);
  return gateDecisionFromOutcomes(e, flag, source, candidacy, blockedMs, attempt, {
    report: true,
    decidedWithoutWaiting: false,
  });
}
//@ chunk-c18v4hz4.js:20770-21145 placement
function gateDecisionFromOutcomes(e, flag, flagSource, candidacy, blockedMs, attempt, u) {
  let s = (e.readOutcomes ?? currentGateOutcomes)();
  let g = orgConfigGateDecision({
    flag,
    candidacy,
    policy: s.policy,
    settings: s.settings,
    surface: e.surface,
    blockedMs,
  });
  let f = (e.readContext ?? orgConfigContext)(s, g.resource);
  let m = {
    decision: g,
    message: orgConfigGateMessage(g, f),
    flag,
    flagSource,
    candidacy,
    armed: true,
    context: f,
    attempt,
    decidedWithoutWaiting: u.decidedWithoutWaiting,
    outcomes: s,
  };
  if (u.report) (e.report ?? logOrgConfigGate)(m, s);
  return m;
}
//@ chunk-c18v4hz4.js:21145-22408 placement
function logOrgConfigGate(orgConfigDecision, outcomes, r) {
  let { decision, flag, candidacy } = orgConfigDecision;
  let u = logEventAsync("tengu_org_config_gate", {
    decision: fromEnum(decision.verdict),
    decision_reason: fromEnumOpt(decision.reason),
    decision_resource: fromEnumOpt(decision.resource),
    surface: fromEnum(decision.surface),
    blocked_ms: decision.blockedMs,
    attempt: orgConfigDecision.attempt,
    decided_without_waiting: orgConfigDecision.decidedWithoutWaiting,
    final_outcome: fromEnumOpt(r?.outcome),
    recovered_after_ms: r?.recoveredAfterMs,
    tier: fromEnumOpt(candidacy.candidate ? candidacy.tier : undefined),
    flag_source: fromEnum(orgConfigDecision.flagSource),
    flag_percent: flag.percent,
    grace_ttl_hours: flag.graceTtlHours,
    budget_ms: flag.budgetMs,
    policy_reason: fromEnumOpt(outcomes?.policy.reason),
    policy_has_cache: outcomes?.policy.hasAdmittedCache,
    policy_cache_age_ms: outcomes?.policy.admittedCacheAgeMs,
    settings_reason: fromEnumOpt(outcomes?.settings.reason),
    settings_has_cache: outcomes?.settings.hasAdmittedCache,
    settings_cache_age_ms: outcomes?.settings.admittedCacheAgeMs,
    http_status: orgConfigDecision.context.httpStatus,
  }).catch(() => {});
  let s =
    !gateDecisionLogged.done &&
    (r !== undefined || (orgConfigDecision.attempt === 0 && !isGateBlocking(decision)));
  if (s) gateDecisionLogged.done = true;
  let g = !s
    ? undefined
    : decision.verdict === "pass"
      ? logFeatureOkAsync("org_config_gate")
      : decision.verdict === "pass_cached" || decision.verdict === "pass_exempt"
        ? logFeatureSadAsync("org_config_gate", decision.verdict)
        : logFeatureBadAsync("org_config_gate", decision.reason ?? decision.verdict);
  let f = Promise.all([u, g]).then(() => {
    return;
  });
  pendingGateLogs.set.add(f);
  f.finally(() => pendingGateLogs.set.delete(f));
  logForDebugging(
    `org-config gate: ${decision.verdict}${decision.reason ? ` (${decision.resource} ${decision.reason})` : ""} on ${decision.surface} after ${decision.blockedMs}ms`,
  );
  return f;
}
//@ chunk-c18v4hz4.js:22408-22486 placement
/**
 * 本次门控判定是否已记录（可重置）。
 */
var gateDecisionLogged = identity(
  {
    done: false,
  },
  (e) => {
    e.done = false;
  },
);
var pendingGateLogs = identity(
  {
    set: new Set(),
  },
  (e) => {
    e.set = new Set();
  },
);
//@ chunk-c18v4hz4.js:22486-22544 placement
async function settlePendingGateWork() {
  await Promise.allSettled([...pendingGateLogs.set]);
}
//@ chunk-c18v4hz4.js:22544-23165 placement
async function reevaluateSettingsGate(e = shouldRecheckStoredLogin) {
  try {
    e();
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
  e,
  isFlagFetchHeld = isFlagFetchHeld_2,
  isFlagCacheEmpty = isGrowthBookCacheEmpty,
) {
  if (e === "disk") return !isFlagFetchHeld();
  return e === "fallback" && isFlagCacheEmpty() && !isFlagFetchHeld();
}
//@ chunk-c18v4hz4.js:23262-23402 placement
function isUnarmedFallback(
  e,
  isFlagFetchHeld = isFlagFetchHeld_2,
  isFlagCacheEmpty = isGrowthBookCacheEmpty,
) {
  return (
    !e.armed &&
    e.flagSource === "fallback" &&
    !e.candidacy.candidate &&
    e.candidacy.exclusion === "flag_off" &&
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
async function refreshFlagIfStale(e) {
  let { source } = readGateFlag(e);
  if (source !== "disk" && source !== "fallback") return;
  if ((e.isFlagFetchHeld ?? isFlagFetchHeld_2)()) return;
  await initGrowthBookWithDeadline(EVENT_LOGGING_FLAG_WAIT_MS, e.fetchFlag);
}
//@ chunk-c18v4hz4.js:23691-23756 placement
/**
 * 按 fetcher 缓存 GrowthBook 初始化 Promise。
 */
var growthBookReadyByFetcher = identity(
  {
    byFetcher: new WeakMap(),
  },
  (e) => {
    e.byFetcher = new WeakMap();
  },
);
//@ chunk-c18v4hz4.js:23756-23856 placement
function growthBookReady(fetchFlag = initializeGrowthBook) {
  let n = growthBookReadyByFetcher.byFetcher.get(fetchFlag);
  if (n === undefined) {
    n = initGrowthBookWithDeadline(EVENT_LOGGING_FLAG_WAIT_MS, fetchFlag);
    growthBookReadyByFetcher.byFetcher.set(fetchFlag, n);
  }
  return n;
}
//@ chunk-c18v4hz4.js:23856-23910 placement
/**
 * 门控重试的延迟序列与抖动比例。
 */
var GATE_RETRY_DELAYS_MS = [15000, 15000, 30000, 60000, 180000, 600000];
var GATE_RETRY_JITTER_RATIO = 0.3;
//@ chunk-c18v4hz4.js:23910-24034 placement
function jitteredRetryMs(rung, random = Math.random) {
  let r = GATE_RETRY_DELAYS_MS[rung];
  if (r === undefined) return;
  let o = (random() * 2 - 1) * GATE_RETRY_JITTER_RATIO;
  return Math.max(1000, Math.round(r * (1 + o)));
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

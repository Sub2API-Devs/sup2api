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
import { kui, readSyncAge } from "../remoteManagedSettings/consentRecords.js";
import { ge } from "../../utils/identity.js";
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
import { errorKindForTelemetry, $_i } from "./startupGate.js";
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
import { xwi } from "../api/verificationRequired.js";
import { pendingPreReplSecurityDialog } from "../remoteManagedSettings/securityCheck.js";
import { GPt } from "./orgConfigRequired.js";
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
import { Eee } from "../../utils/plugins/hooksModulesRollout.js";
import { qM } from "../../utils/startupFlagWait.js";

//@ chunk-c18v4hz4.js:5344-5407 placement
function W(e, n, r) {
  return e === "dead" && classifyAuthDenial(n, r) !== "organization";
}
//@ chunk-c18v4hz4.js:5407-5723 placement
function refusalForOrgSubscription(e, n, r, o) {
  if (knownOrUndefined(n) === void 0) return;
  let a = classifyAuthDenial(r, o);
  if (a === "organization") return "refused_not_entitled";
  if (a === "credential") return "refused_credential";
  if (e === 404) return "none_configured";
  if (e === 401 || e === void 0) return;
  if (e === 403) return "refused_not_entitled";
  if (isRetryableHttpStatus(e) || e >= 500) return;
  return "unavailable_server";
}
//@ chunk-c18v4hz4.js:5723-6656 placement
function policyRefusalReason(e, n, r, o, a, d) {
  if (W(n, a, d)) return "refused_credential";
  let u = knownOrUndefined(o),
    s = refusalForOrgSubscription(r, u, a, d);
  if (s !== void 0 && (e === "auth_failed" || e === "request_failed")) return s;
  switch (e) {
    case "auth_failed":
      if (n === "dead") return "refused_credential";
      if (r === 401) return "unavailable_credential_refresh";
      if (r === 403) return "blocked_by_intermediary";
      if (r === void 0 && u === void 0)
        return n === void 0 ? "client_no_credentials" : "unavailable_credential_refresh";
      return "refused_not_entitled";
    case "timeout":
      return "unavailable_timeout";
    case "network_error":
      return "unavailable_connect";
    case "request_failed":
      if (isRetryableHttpStatus(r)) return "unavailable_rate_limited";
      if (r === 304 || r === 404) return "blocked_by_intermediary";
      return r === void 0 ? "unavailable_connect" : "unavailable_server";
    case "spurious_304":
    case "stale_tunnel_credential":
      return "unavailable_server";
    case "parse_failed":
      return "blocked_by_intermediary";
    case "session_changed":
    case void 0:
      return "unavailable_pending";
    default:
      return "client_error";
  }
}
//@ chunk-c18v4hz4.js:6656-6704 placement
var D = () => kui(),
  ne = ge({ read: D }, (e) => {
    e.read = D;
  });
//@ chunk-c18v4hz4.js:6704-6827 placement
function storedSettingsState() {
  let e = !1;
  try {
    e = getRemoteManagedSettingsSyncFromCache() !== null;
  } catch {
    e = !1;
  }
  let n;
  try {
    n = e ? ne.read() : void 0;
  } catch {
    n = void 0;
  }
  return { present: e, ageMs: n };
}
//@ chunk-c18v4hz4.js:6827-6907 placement
var re = new Set(["sandboxed_entrypoint", "claude_tag", "hermetic_remote_session"]);
//@ chunk-c18v4hz4.js:6907-7842 placement
function settingsOutcome(e, n, r, o = { present: !1, ageMs: void 0 }, a = !1) {
  let d = o.present || e?.hadCache === !0 || e?.source === "cache" || n?.state === "stale_cache",
    u = { hasAdmittedCache: d, admittedCacheAgeMs: d ? o.ageMs : void 0 },
    s = r ?? (n?.state === "ineligible" ? n.reason : void 0);
  if (s !== void 0 || e?.source === "ineligible")
    return { ...u, reason: s !== void 0 && re.has(s) && !a ? "not_required" : "not_attempted" };
  if (n?.state === "ok") return { ...u, reason: n.hasSettings ? "ok" : "none_configured" };
  if (e?.source === "fetch") return { ...u, reason: "ok" };
  if (e?.source === "none") return { ...u, reason: "none_configured" };
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
  if (e?.source === "error" || e?.source === "rejected") return { ...u, reason: "client_error" };
  return { ...u, reason: "unavailable_pending" };
}
//@ chunk-c18v4hz4.js:7842-8839 placement
function settingsRefusalReason(e, n, r, o, a, d, u) {
  if (W(o, a, d)) return "refused_credential";
  let s = knownOrUndefined(r),
    f = refusalForOrgSubscription(n ?? (e === "http_401" ? 401 : e === "http_403" ? 403 : void 0), s, a, d);
  if (f !== void 0 && (e === "http_401" || e === "http_403" || e === "http_4xx")) return f;
  switch (e) {
    case "http_401":
      return o === "dead" ? "refused_credential" : "unavailable_credential_refresh";
    case "profile_credential_error":
      return "refused_credential";
    case "http_403":
      return o === "dead" ? "refused_credential" : "blocked_by_intermediary";
    case "parse_error":
      return "blocked_by_intermediary";
    case "http_4xx":
      if (isRetryableHttpStatus(n)) return "unavailable_rate_limited";
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
      if (n === 304) return "blocked_by_intermediary";
      return u === !0 ? "unavailable_connect" : "client_error";
    default:
      return "client_error";
  }
}
//@ chunk-c18v4hz4.js:8839-8892 placement
function oe() {
  return getIsNonInteractiveSession() ? "noninteractive" : "startup";
}
/**
 * 计算组织配置门控的完整判定：候选资格、策略与远程设置的加载结果、缓存年龄。
 */
//@ chunk-c18v4hz4.js:8892-9886 placement
function evaluateOrgConfigGate(e, n, r, o, a, d = "fallback", u = { present: !1, ageMs: void 0 }, s = !1, g) {
  let f = orgConfigCandidacy(e, n),
    m = orgConfigCandidacy({ ...e, enabled: !0, plans: ["team", "enterprise"], percent: 100 }, n),
    _ = policyOutcomeSummary(r.policy, r.policyGateFields),
    v = settingsOutcome(r.settings, o, a, u, s),
    P = {
      flag: { ...e, enabled: !0, plans: ["team", "enterprise"], percent: 100 },
      candidacy: m,
      policy: _,
      settings: v,
      surface: oe(),
    },
    G = orgConfigGateDecision(P);
  return {
    decision: fromEnum(G.verdict),
    decision_reason: fromEnumOpt(G.reason),
    decision_resource: fromEnumOpt(G.resource),
    surface: fromEnum(G.surface),
    blocked_ms: 0,
    candidate_if_armed: m.candidate,
    exclusion_if_armed: fromEnumOpt(m.candidate ? void 0 : m.exclusion),
    candidate_now: f.candidate,
    exclusion_now: fromEnumOpt(f.candidate ? void 0 : f.exclusion),
    flag_enabled: e.enabled,
    flag_source: fromEnum(d),
    flag_percent: e.percent,
    grace_ttl_hours: e.graceTtlHours,
    tier: fromEnumOpt(hasOpusAccess(n.tier)),
    credential_shape: fromEnum(n.credentialShape),
    policy_reason: fromEnum(_.reason),
    policy_has_cache: _.hasAdmittedCache,
    policy_cache_age_ms: _.admittedCacheAgeMs,
    settings_reason: fromEnum(v.reason),
    settings_has_cache: v.hasAdmittedCache,
    settings_cache_age_ms: v.admittedCacheAgeMs,
    ...storedCopyFields(P, g),
  };
}
//@ chunk-c18v4hz4.js:9886-10285 placement
function storedCopyFields(e, n) {
  if (n === void 0) return {};
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
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the signature facts threw (${errorKindForTelemetry(error)})`,
          "org-config gate: the signature facts threw",
        ),
      ),
      {}
    );
  }
}
/**
 * 分别按“信任缓存/不信任缓存”两种假设求 verdict，相同则返回，否则 pending。旧版名 orgStatus 为错配，与 fast mode 无关（远程桥接门控）。
 */
//@ chunk-c18v4hz4.js:10285-10355 placement = orgStatus (1)
function resolveCacheTrustVerdict(e, n) {
  let r = evaluateVerdictWithCacheTrust(e, n, !0),
    o = evaluateVerdictWithCacheTrust(e, n, !1);
  return r === o ? r : "pending";
}
/**
 * 按是否信任存储副本调整 policy/settings 后调用 eQe 求 verdict。
 */
//@ chunk-c18v4hz4.js:10355-10466 placement
function evaluateVerdictWithCacheTrust(e, n, r) {
  return orgConfigGateDecision({
    ...e,
    policy: maskUntrustedAdmittedCache(e.policy, n.policy, r),
    settings: maskUntrustedAdmittedCache(e.settings, n.settings, r),
  }).verdict;
}
/**
 * 存储副本不可信时去掉 hasAdmittedCache/admittedCacheAgeMs。
 */
//@ chunk-c18v4hz4.js:10466-10607 placement
function maskUntrustedAdmittedCache(e, { storedCopy: storedCopy }, r) {
  return storedCopy === "trusted" || storedCopy === "not_read" || (storedCopy === "pending" && r)
    ? e
    : { ...e, hasAdmittedCache: !1, admittedCacheAgeMs: void 0 };
}
//@ chunk-c18v4hz4.js:10607-10766 placement
function registerOrgConfigGate(e) {
  $_i(
    (n) => {
      let { flag: flag, source: source } = readOrgConfigRequiredFlagWithSource();
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
    e.settle === void 0 ? void 0 : withTimeout(e.settle, ue),
  );
}
//@ chunk-c18v4hz4.js:10766-10779 placement
var ue = 35000;
//@ chunk-c18v4hz4.js:10779-10863 placement = withTimeout (0.805)
function withTimeout(e, n) {
  return () => Promise.race([e().catch(() => {}), sleep(n, void 0, { unref: !0 })]);
}
//@ chunk-c18v4hz4.js:16457-16524 placement
function isGateBlocking(e) {
  return e.verdict === "blocked" || e.verdict === "refused";
}
//@ chunk-c18v4hz4.js:16524-16624 placement
function gateBlockReasonCode(e) {
  return e.verdict === "refused" ? "org_config_refused" : "org_config_required_unavailable";
}
//@ chunk-c18v4hz4.js:16624-16778 placement
function isGateRefusalFinal(e) {
  return (
    e.verdict === "refused" ||
    e.reason === "not_attempted" ||
    e.reason === "client_no_credentials" ||
    e.reason === "unavailable_credential_refresh"
  );
}
//@ chunk-c18v4hz4.js:16778-16873 placement
function he() {
  let e = () => {};
  return {
    recorded: new Promise((r) => {
      e = onLastLoadStatusChanged(() => {
        (e(), r());
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
  planReverified: () => xwi() ?? Promise.resolve(),
  pendingConsentDialog: pendingPreReplSecurityDialog,
  nextSettingsOutcome: he,
  now: () => performance.now(),
};
/**
 * 执行组织配置门控：拉取策略与设置，等待结果并记录事件，必要时阻止会话。
 */
//@ chunk-c18v4hz4.js:17067-17737 placement
async function runOrgConfigGate(e, n = DEFAULT_GATE_DEPS) {
  let now = n.now();
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
  let pendingConsentDialog = n.pendingConsentDialog();
  if (pendingConsentDialog !== null) {
    let nextSettingsOutcome = n.nextSettingsOutcome();
    try {
      (await pendingConsentDialog.catch(() => {}),
        await withDeadline(
          Promise.all([n.settingsSettled().catch(() => {}), nextSettingsOutcome.recorded]),
          e,
        ));
    } finally {
      nextSettingsOutcome.dispose();
    }
  }
  return Math.max(0, Math.round(n.now() - now));
}
//@ chunk-c18v4hz4.js:17737-17792 placement
var Se = new Set(["no_auth", "unsupported_subscription"]);
//@ chunk-c18v4hz4.js:17792-18085 placement
function isStoredLoginRefusal(e, n) {
  if (n.storedLoginOrigin !== !0) return !1;
  if (n.credentialShape !== "stored_login" && n.credentialShape !== "untiered_login") return !1;
  switch (e) {
    case "no_auth":
      return !0;
    case "unsupported_subscription":
      return n.credentialShape === "untiered_login" || n.tier === null || GPt(n.tier);
    default:
      return !1;
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
  },
  seenGateKeys = ge({ seen: new Set() }, (e) => {
    e.seen = new Set();
  });
//@ chunk-c18v4hz4.js:18232-18533 placement
function shouldRecheckStoredLogin(e = ELIGIBILITY_DEPS) {
  let memoizedReason = e.memoizedReason();
  if (!Se.has(memoizedReason ?? "")) return !1;
  let inputs = e.inputs();
  if (!isStoredLoginRefusal(memoizedReason, inputs)) return !1;
  let o = `${memoizedReason}|${inputs.credentialShape}|${inputs.tier}`;
  if (seenGateKeys.seen.has(o)) return !1;
  return (
    seenGateKeys.seen.add(o),
    e.reset(),
    logForDebugging(
      `org-config gate: settings eligibility (${memoizedReason}) predates the stored login; re-evaluating`,
    ),
    !0
  );
}
//@ chunk-c18v4hz4.js:18533-18701 placement
function kickSettingsLoad(e = ELIGIBILITY_DEPS, n = () => loadRemoteManagedSettings()) {
  if (!shouldRecheckStoredLogin(e)) return;
  n().catch((r) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the settings load threw (${errorKindForTelemetry(r)})`,
        "org-config gate: the settings load threw",
      ),
    ),
  );
}
//@ chunk-c18v4hz4.js:18701-18817 placement
function readGateFlag(e) {
  if (e.readFlag !== void 0) return { flag: e.readFlag(), source: e.readFlagSource?.() ?? "override" };
  return readOrgConfigRequiredFlagWithSource();
}
//@ chunk-c18v4hz4.js:18817-19011 placement
function passDecision(e, n, r, o) {
  return {
    decision: { verdict: "pass", blockedMs: 0, surface: o },
    message: void 0,
    flag: e,
    flagSource: n,
    candidacy: r,
    armed: !1,
    context: {},
    attempt: 0,
    decidedWithoutWaiting: !0,
    outcomes: void 0,
  };
}
//@ chunk-c18v4hz4.js:19011-19053 placement
var x = { candidate: !1, exclusion: "flag_off" };
//@ chunk-c18v4hz4.js:19053-19106 placement
function isFallbackFlagUsable(e, n, r) {
  return e !== "fallback" || !r() || n();
}
//@ chunk-c18v4hz4.js:19106-19442 placement
function orgConfigGateQuick(e) {
  let { flag: flag, source: source } = readGateFlag(e);
  if (
    !flag.enabled &&
    isFallbackFlagUsable(
      source,
      e.isFlagFetchHeld ?? isFlagFetchHeld,
      e.isFlagCacheEmpty ?? isGrowthBookCacheEmpty,
    )
  )
    return passDecision(flag, source, x, e.surface);
  let o = orgConfigCandidacy(
    flag,
    (e.readCandidateInputs ?? orgConfigInputs)({ authRecoveryCommand: e.authRecoveryCommand }),
  );
  if (!flag.enabled || !o.candidate) return passDecision(flag, source, o, e.surface);
  return gateDecisionFromOutcomes(e, flag, source, o, 0, 0, { report: !1, decidedWithoutWaiting: !0 });
}
//@ chunk-c18v4hz4.js:19442-20214 placement
async function awaitOrgConfigGate(e) {
  let n = e.isFlagFetchHeld ?? isFlagFetchHeld,
    r = e.isFlagCacheEmpty ?? isGrowthBookCacheEmpty;
  if (e.afterSignIn === !0) await refreshFlagIfStale(e);
  let o = orgConfigGateQuick(e);
  if (isUnarmedFallback(o, n, r)) (await growthBookReady(e.fetchFlag), (o = orgConfigGateQuick(e)));
  if (!o.armed || o.outcomes === void 0) return o;
  if (
    ((o = await retryGateAfterOutcomes(o, () => orgConfigGateQuick(e), e.primeSettingsCacheAge)),
    !o.armed || o.outcomes === void 0)
  )
    return o;
  if (!isGateBlocking(o.decision)) return (await (e.report ?? logOrgConfigGate)(o, o.outcomes), o);
  let { flag: flag, flagSource: flagSource } = o,
    [u] = await Promise.all([
      (e.settle ?? runOrgConfigGate)(flag.budgetMs),
      isFlagSourceUntrusted(flagSource, n, r)
        ? initGrowthBookWithDeadline(flag.budgetMs, e.fetchFlag)
        : void 0,
    ]),
    s = readGateFlag(e);
  if (!s.flag.enabled) return passDecision(s.flag, s.source, x, e.surface);
  let g = orgConfigCandidacy(
    s.flag,
    (e.readCandidateInputs ?? orgConfigInputs)({ authRecoveryCommand: e.authRecoveryCommand }),
  );
  if (!g.candidate) return passDecision(s.flag, s.source, g, e.surface);
  return gateDecisionFromOutcomes(e, s.flag, s.source, g, u, 0, { report: !0, decidedWithoutWaiting: !1 });
}
//@ chunk-c18v4hz4.js:20214-20340 placement
async function retryGateAfterOutcomes(e, n, r = ke) {
  if (!e.armed || e.outcomes === void 0 || !isGateBlocking(e.decision) || !Ge(e.outcomes)) return e;
  return (await r(), n());
}
//@ chunk-c18v4hz4.js:20340-20430 placement
function Ge(e) {
  return e.settings.hasAdmittedCache && e.settings.admittedCacheAgeMs === void 0;
}
//@ chunk-c18v4hz4.js:20430-20494 placement
async function ke() {
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
function orgConfigGateSync(e, n, r = 1) {
  let { flag: flag, source: source } = readGateFlag(e);
  if (!flag.enabled) return passDecision(flag, source, x, e.surface);
  let d = orgConfigCandidacy(
    flag,
    (e.readCandidateInputs ?? orgConfigInputs)({ authRecoveryCommand: e.authRecoveryCommand }),
  );
  if (!d.candidate) return passDecision(flag, source, d, e.surface);
  return gateDecisionFromOutcomes(e, flag, source, d, n, r, { report: !0, decidedWithoutWaiting: !1 });
}
//@ chunk-c18v4hz4.js:20770-21145 placement
function gateDecisionFromOutcomes(e, n, r, o, a, d, u) {
  let s = (e.readOutcomes ?? currentGateOutcomes)(),
    g = orgConfigGateDecision({
      flag: n,
      candidacy: o,
      policy: s.policy,
      settings: s.settings,
      surface: e.surface,
      blockedMs: a,
    }),
    f = (e.readContext ?? orgConfigContext)(s, g.resource),
    m = {
      decision: g,
      message: orgConfigGateMessage(g, f),
      flag: n,
      flagSource: r,
      candidacy: o,
      armed: !0,
      context: f,
      attempt: d,
      decidedWithoutWaiting: u.decidedWithoutWaiting,
      outcomes: s,
    };
  if (u.report) (e.report ?? logOrgConfigGate)(m, s);
  return m;
}
//@ chunk-c18v4hz4.js:21145-22408 placement
function logOrgConfigGate(e, n, r) {
  let { decision: decision, flag: flag, candidacy: candidacy } = e,
    u = logEventAsync("tengu_org_config_gate", {
      decision: fromEnum(decision.verdict),
      decision_reason: fromEnumOpt(decision.reason),
      decision_resource: fromEnumOpt(decision.resource),
      surface: fromEnum(decision.surface),
      blocked_ms: decision.blockedMs,
      attempt: e.attempt,
      decided_without_waiting: e.decidedWithoutWaiting,
      final_outcome: fromEnumOpt(r?.outcome),
      recovered_after_ms: r?.recoveredAfterMs,
      tier: fromEnumOpt(candidacy.candidate ? candidacy.tier : void 0),
      flag_source: fromEnum(e.flagSource),
      flag_percent: flag.percent,
      grace_ttl_hours: flag.graceTtlHours,
      budget_ms: flag.budgetMs,
      policy_reason: fromEnumOpt(n?.policy.reason),
      policy_has_cache: n?.policy.hasAdmittedCache,
      policy_cache_age_ms: n?.policy.admittedCacheAgeMs,
      settings_reason: fromEnumOpt(n?.settings.reason),
      settings_has_cache: n?.settings.hasAdmittedCache,
      settings_cache_age_ms: n?.settings.admittedCacheAgeMs,
      http_status: e.context.httpStatus,
    }).catch(() => {}),
    s = !V.done && (r !== void 0 || (e.attempt === 0 && !isGateBlocking(decision)));
  if (s) V.done = !0;
  let g = !s
      ? void 0
      : decision.verdict === "pass"
        ? logFeatureOkAsync("org_config_gate")
        : decision.verdict === "pass_cached" || decision.verdict === "pass_exempt"
          ? logFeatureSadAsync("org_config_gate", decision.verdict)
          : logFeatureBadAsync("org_config_gate", decision.reason ?? decision.verdict),
    f = Promise.all([u, g]).then(() => {
      return;
    });
  return (
    T.set.add(f),
    f.finally(() => T.set.delete(f)),
    logForDebugging(
      `org-config gate: ${decision.verdict}${decision.reason ? ` (${decision.resource} ${decision.reason})` : ""} on ${decision.surface} after ${decision.blockedMs}ms`,
    ),
    f
  );
}
//@ chunk-c18v4hz4.js:22408-22486 placement
var V = ge({ done: !1 }, (e) => {
    e.done = !1;
  }),
  T = ge({ set: new Set() }, (e) => {
    e.set = new Set();
  });
//@ chunk-c18v4hz4.js:22486-22544 placement
async function settlePendingGateWork() {
  await Promise.allSettled([...T.set]);
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
    loadPolicyLimits({ singleAttempt: !0 }).catch((n) =>
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the policy retry threw (${errorKindForTelemetry(n)})`,
          "org-config gate: the policy retry threw",
        ),
      ),
    ),
    loadRemoteManagedSettings(void 0, void 0, { singleAttempt: !0 }).catch(
      (n) => (
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `org-config gate: the settings retry threw (${errorKindForTelemetry(n)})`,
            "org-config gate: the settings retry threw",
          ),
        ),
        !1
      ),
    ),
    withDeadline(
      refreshGrowthBookFeatures().catch((n) =>
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `org-config gate: the flag refresh threw (${errorKindForTelemetry(n)})`,
            "org-config gate: the flag refresh threw",
          ),
        ),
      ),
      Ee,
    ),
  ]);
}
//@ chunk-c18v4hz4.js:23165-23177 placement
var Ee = 3000;
//@ chunk-c18v4hz4.js:23177-23262 placement
function isFlagSourceUntrusted(e, n = isFlagFetchHeld, r = isGrowthBookCacheEmpty) {
  if (e === "disk") return !n();
  return e === "fallback" && r() && !n();
}
//@ chunk-c18v4hz4.js:23262-23402 placement
function isUnarmedFallback(e, n = isFlagFetchHeld, r = isGrowthBookCacheEmpty) {
  return (
    !e.armed &&
    e.flagSource === "fallback" &&
    !e.candidacy.candidate &&
    e.candidacy.exclusion === "flag_off" &&
    r() &&
    !n()
  );
}
//@ chunk-c18v4hz4.js:23402-23443 placement
function isFlagFetchHeld() {
  return isPendingNotOver(Eee()) || !hasWorkspaceTrust();
}
//@ chunk-c18v4hz4.js:23443-23476 placement
function isFlagFetchHeldNoTrust() {
  return isPendingNotOver(Eee());
}
//@ chunk-c18v4hz4.js:23476-23551 placement
async function initGrowthBookWithDeadline(e, n = initializeGrowthBook) {
  await withDeadline(
    n().then(
      () => {
        return;
      },
      () => {
        return;
      },
    ),
    e,
  );
}
//@ chunk-c18v4hz4.js:23551-23691 placement
async function refreshFlagIfStale(e) {
  let { source: source } = readGateFlag(e);
  if (source !== "disk" && source !== "fallback") return;
  if ((e.isFlagFetchHeld ?? isFlagFetchHeld)()) return;
  await initGrowthBookWithDeadline(qM, e.fetchFlag);
}
//@ chunk-c18v4hz4.js:23691-23756 placement
var B = ge({ byFetcher: new WeakMap() }, (e) => {
  e.byFetcher = new WeakMap();
});
//@ chunk-c18v4hz4.js:23756-23856 placement
function growthBookReady(e = initializeGrowthBook) {
  let n = B.byFetcher.get(e);
  if (n === void 0) ((n = initGrowthBookWithDeadline(qM, e)), B.byFetcher.set(e, n));
  return n;
}
//@ chunk-c18v4hz4.js:23856-23910 placement
var we = [15000, 15000, 30000, 60000, 180000, 600000],
  Fe = 0.3;
//@ chunk-c18v4hz4.js:23910-24034 placement
function jitteredRetryMs(e, n = Math.random) {
  let r = we[e];
  if (r === void 0) return;
  let o = (n() * 2 - 1) * Fe;
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
  isFlagFetchHeld,
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

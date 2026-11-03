/**
 * services/policyLimits/policyState.ts
 *
 * 2.1.316 新增：策略缓存键（令牌、组织、登录账号）；判定策略缓存副本是否可信（组织固定）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-55ht3bcx.js (51)
 * attribution: placement 51
 */
import { randomUUID } from "crypto";
import { join } from "path";
import { readFileSync } from "fs";
import {
  isTwinklingGlobeOn,
  isLovelyUmbrellaOn,
  isGateAOn,
  isSettingsGateSettled,
} from "../../utils/settings/settingsSourceTrust.js";
import { readPolicyStampSync, ee, ae, tokenDigest, eEe, matchCacheStamp } from "./cacheStamp.js";
import { createSignal } from "../../utils/signal.js";
import { replaceComplianceTaints, MRt, R5e, latchComplianceTaints } from "./complianceTaints.js";
import { clearBetasCaches } from "../../utils/betas.js";
import { uniq } from "../../utils/collections.js";
import {
  TAINT_DISABLED_POLICIES,
  N,
  getPolicyPrincipalIdentity,
  applyStampReadToState,
  parseCachedResponse,
  serverBodyOf,
  federationProfileKey,
  q,
  principalEvidenceKey,
} from "./policyEvidence.js";
import { BUILTIN_SKILL_NAMES } from "../../skills/bundled/builtinSkillNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isNonRetryableClientError } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  isDiskless,
  isOauthTokenFromBgSnapshot,
  getOauthOrgFromBgSnapshot,
} from "../../bootstrap/state.js";
import {
  effectiveAuthTokenEnv,
  isAnthropicAuthEnabled,
  getClaudeAIOAuthTokens,
  getAnthropicApiKeySafe,
  getAnthropicApiKeyWithSource,
  shouldUseWIFAuth,
  isHostManagedAnthropicApiBearer,
  storedPlanVerifiedAtOf,
  getStoredOauthAccountInfo,
  isClaudeAISubscriber,
  getClaudeAIOAuthTokenOriginAsync,
  readStoredLoginOrganizationAfresh,
  getClaudeAIOAuthTokenOrigin,
  isHostManagedProviderAuth,
} from "../../utils/auth.js";
import { hasInferenceScope } from "../../constants/system.js";
import { ApiKeySourceSchema } from "../../entrypoints/sdk/coreSchemas.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { withoutSSHTunnelVars } from "../../utils/managedEnv.js";
import { machineAdminMayPinSignInOrg } from "../../utils/settings/settings.js";
import { ave } from "../../utils/settings/managedPluginTiers.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "../../constants/oauth.js";
import { resolveOrgConfigPlan, computeChecksum } from "./index.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { describeMdmSettingsState } from "../../utils/settings/mdm/settings.js";
import { verifySignedCache } from "../../utils/settings/policyCertificates.js";
import { isSecDefaultPluginEnabled } from "../../utils/plugins/securityDefaultPlugin.js";
import {
  getWIFPrecedenceSource,
  getWIFAccountInfo,
  resolveConfigDir,
  resolveImplicitProfileName,
  clearWIFAccountInfoCache,
  readWIFAccountInfo,
  resolveLiveProfileName,
} from "../../utils/wifProfile.js";
import { env } from "../../utils/env.js";
import { Vt } from "../../utils/agentId.js";
import { UNREADABLE_PRINCIPAL } from "./policyVerdicts.js";

//@ chunk-55ht3bcx.js:7634-7707 placement = CACHE_FILENAME (1)
var POLICY_LIMITS_CACHE_FILENAME = "policy-limits.json",
  He = 5000,
  ce = 256,
  fe = { kind: "absent" },
  UNCLASSIFIED_ORIGIN_MEMO_MS = 30000;
//@ chunk-55ht3bcx.js:7707-7746 placement
function readPolicyCacheStampForAdmission() {
  return isTwinklingGlobeOn() ? fe : readPolicyStampSync(getCachePath());
}
//@ chunk-55ht3bcx.js:7746-7805 placement
function settleStampRead(e) {
  return e.kind === "absent" && !isTwinklingGlobeOn() ? readPolicyStampSync(getCachePath()) : e;
}
//@ chunk-55ht3bcx.js:7805-11150 placement
class PolicyState {
  sessionCache = null;
  lastFetchOutcome = null;
  settledWithoutVerdictFor = null;
  failOpenVerdict = !1;
  sessionFromServerFetch = !1;
  lastServedCoreSkills = null;
  verdictEnvBearerDigest = null;
  diskAdoptionSuppressed = !1;
  diskAdoptionEpoch = 0;
  storageV5 = void 0;
  lastStampVerdict = "none";
  storedCopyTrust = "not_asked";
  lastStampMatchedIdentity = null;
  hipaaEvidence = ee;
  hipaaSeenUnreadable = !1;
  diskBodyChecksum = null;
  diskConfirmedAtMs = null;
  sessionBodyReceivedAtMs = null;
  diskRefusedAtMs = null;
  hipaaEvidenceLoaded = !1;
  hintedTaints = [];
  hintedDeniedKeys = [];
  hintedEnforcedKeys = [];
  sessionAttributed = !1;
  attributedBearerDigest = null;
  attributedPrincipalIdentity = null;
  unnamedStampSalt = randomUUID();
  tunnelEpochHeard = void 0;
  sessionVerdictDisowned = !1;
  principalRung = "none";
  evidenceRereadForBearer = void 0;
  wifRecordedOrg = void 0;
  wifAccountDiverged = !1;
  wifSourceLocation = void 0;
  wifRecordProfile = void 0;
  oauthPrincipalMemo = null;
  storedLoginAccountAtWire = null;
  storedLoginNotedTokenDigest = null;
  machinePinsSignIn = void 0;
  cacheRevision = 0;
  verdictChanged = createSignal();
  heldStartSignal = createSignal();
  replaceSessionCache(e, n = !1, r = !1) {
    if (
      ((this.failOpenVerdict = e !== null && (n || (this.failOpenVerdict && (r || e === this.sessionCache)))),
      (this.sessionCache = e),
      e?.core_skills !== void 0)
    )
      this.lastServedCoreSkills = this.sessionFromServerFetch
        ? e.core_skills
        : this.narrowedServedList(e.core_skills);
    if (!r) this.verdictEnvBearerDigest = null;
    if (e === null)
      ((this.sessionAttributed = !1),
        (this.attributedBearerDigest = null),
        (this.attributedPrincipalIdentity = null),
        (this.sessionVerdictDisowned = !1),
        (this.evidenceRereadForBearer = void 0));
    this.cacheRevision++;
    let s = replaceComplianceTaints(this.effectiveTaints());
    if ((ae(e?.monitoring_notice ?? null), s)) clearBetasCaches();
    this.emitVerdictChanged();
  }
  effectiveTaints(e = this.sessionCache?.compliance_taints ?? []) {
    return this.hintedTaints.length === 0 ? e : uniq([...this.hintedTaints, ...e]).slice(0, MRt);
  }
  dropHintedTaints() {
    if (
      this.hintedTaints.length === 0 &&
      this.hintedDeniedKeys.length === 0 &&
      this.hintedEnforcedKeys.length === 0
    )
      return;
    if (
      ((this.hintedTaints = []),
      (this.hintedDeniedKeys = []),
      (this.hintedEnforcedKeys = []),
      this.cacheRevision++,
      replaceComplianceTaints(this.effectiveTaints()))
    )
      clearBetasCaches();
    this.emitVerdictChanged();
  }
  hintFromRefusedBody(e) {
    if (this.sessionCache !== null && this.sessionAttributed) return;
    let filtered = e.compliance_taints.filter((compliance_taint) =>
        TAINT_DISABLED_POLICIES.some(([m]) => m === compliance_taint),
      ),
      r = uniq([...this.hintedTaints, ...filtered]),
      mapped = Object.entries(e.restrictions)
        .filter(([h, m]) => m?.allowed === !1 && !N(h))
        .map(([h]) => h),
      sliced = uniq([...this.hintedDeniedKeys, ...mapped]).slice(0, ce),
      mapped_2 = Object.entries(e.restrictions)
        .filter(([h, m]) => m?.allowed === !0 && N(h))
        .map(([h]) => h),
      sliced_2 = uniq([...this.hintedEnforcedKeys, ...mapped_2]).slice(0, ce),
      y = !1;
    if (e.core_skills !== void 0) {
      let narrowedServedList = this.narrowedServedList(e.core_skills);
      if (
        this.lastServedCoreSkills === null ||
        narrowedServedList.join(`
`) !==
          this.lastServedCoreSkills.join(`
`)
      )
        ((this.lastServedCoreSkills = narrowedServedList), (y = !0));
    }
    if (
      !y &&
      r.length === this.hintedTaints.length &&
      sliced.length === this.hintedDeniedKeys.length &&
      sliced_2.length === this.hintedEnforcedKeys.length
    )
      return;
    if (
      ((this.hintedTaints = r),
      (this.hintedDeniedKeys = sliced),
      (this.hintedEnforcedKeys = sliced_2),
      this.cacheRevision++,
      replaceComplianceTaints(this.effectiveTaints()))
    )
      clearBetasCaches();
    this.emitVerdictChanged();
  }
  narrowedServedList(e) {
    let n = new Set(this.lastServedCoreSkills ?? BUILTIN_SKILL_NAMES);
    return e.filter((r) => n.has(r));
  }
  emitVerdictChanged() {
    try {
      this.heldStartSignal.emit();
    } catch (error) {
      logForDebugging(`Policy limits: a held-start listener threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (isLovelyUmbrellaOn()) return;
    try {
      this.verdictChanged.emit();
    } catch (error) {
      logForDebugging(`Policy limits: a verdict-change listener threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
}
//@ chunk-55ht3bcx.js:11150-11177 placement
var policyStates = new HostScoped(() => new PolicyState());
//@ chunk-55ht3bcx.js:11177-11214 placement
function getPolicyLimitsState() {
  return policyStates.of(getRootSession().host);
}
//@ chunk-55ht3bcx.js:11214-11342 placement
function setSessionCache(e) {
  let n = getPolicyLimitsState();
  if (((n.sessionFromServerFetch = e !== null), e === null)) n.sessionBodyReceivedAtMs = null;
  n.replaceSessionCache(e);
}
//@ chunk-55ht3bcx.js:11342-11388 placement
function noteSessionBodyReceived(e) {
  getPolicyLimitsState().sessionBodyReceivedAtMs = e;
}
//@ chunk-55ht3bcx.js:11388-11438 placement
function getSessionBodyReceivedAt() {
  return getPolicyLimitsState().sessionBodyReceivedAtMs;
}
//@ chunk-55ht3bcx.js:11438-11517 placement
function setSessionCacheAsPriorEvidence(e) {
  let n = getPolicyLimitsState();
  ((n.sessionFromServerFetch = !1), n.replaceSessionCache(e));
}
//@ chunk-55ht3bcx.js:11517-11562 placement
function noteSessionVerdictEnvBearer(e) {
  getPolicyLimitsState().verdictEnvBearerDigest = e;
}
//@ chunk-55ht3bcx.js:11562-11778 placement
function envBearerVerdictOnWire() {
  let verdictEnvBearerDigest = getPolicyLimitsState().verdictEnvBearerDigest;
  if (verdictEnvBearerDigest === null) return null;
  let n = effectiveAuthTokenEnv();
  if (
    isGateAOn() ||
    !n ||
    hasInferenceScope({
      anthropicAuthEnabled: isAnthropicAuthEnabled(),
      oauthScopes: getClaudeAIOAuthTokens()?.scopes,
    }) ||
    getAnthropicApiKeySafe() != null
  )
    return "gone";
  return tokenDigest(n) === verdictEnvBearerDigest ? "same" : "replaced";
}
//@ chunk-55ht3bcx.js:11778-11892 placement
function installFailOpenSessionVerdict() {
  let e = getPolicyLimitsState();
  ((e.sessionFromServerFetch = !1), (e.sessionBodyReceivedAtMs = null), e.replaceSessionCache(R5e, !0));
}
//@ chunk-55ht3bcx.js:11892-12313 placement
function installDiskDerivedVerdict(e) {
  let n = getPolicyLimitsState(),
    r = n.sessionCache !== null;
  if (!r)
    ((n.sessionFromServerFetch = !1),
      (n.sessionAttributed = n.lastStampVerdict === "match"),
      (n.attributedBearerDigest = n.sessionAttributed ? ApiKeySourceSchema() : null),
      (n.attributedPrincipalIdentity = n.sessionAttributed ? n.lastStampMatchedIdentity : null),
      (n.sessionVerdictDisowned = n.lastStampVerdict === "disabled"),
      (n.evidenceRereadForBearer = void 0),
      (n.sessionBodyReceivedAtMs = null));
  n.replaceSessionCache(e, !1, r);
}
//@ chunk-55ht3bcx.js:12313-12344 placement
function latchComplianceTaintsBustingBetas(e) {
  if (latchComplianceTaints(e)) clearBetasCaches();
}
//@ chunk-55ht3bcx.js:12344-12731 placement
function setLastFetchOutcome(e, n, r = !0) {
  let s = getPolicyLimitsState();
  if (((s.lastFetchOutcome = e), e === null || e.success)) s.settledWithoutVerdictFor = null;
  else if (!e.retrying && (r || !isTransientFetchFailure(e))) {
    let l =
      e.errorCode === "network_error" ||
      e.errorCode === "timeout" ||
      (e.errorCode === "request_failed" &&
        e.httpStatus !== null &&
        (e.httpStatus === 404 || e.httpStatus >= 500));
    s.settledWithoutVerdictFor = l ? (n ?? getPolicyPrincipalIdentity() ?? "") : null;
  }
  (s.cacheRevision++, s.emitVerdictChanged());
}
//@ chunk-55ht3bcx.js:12731-12922 placement
function isTransientFetchFailure(e) {
  return (
    e.errorCode === "network_error" ||
    e.errorCode === "timeout" ||
    (e.errorCode === "request_failed" &&
      (e.httpStatus === null ||
        e.httpStatus >= 500 ||
        (e.httpStatus >= 400 && !isNonRetryableClientError(e.httpStatus))))
  );
}
//@ chunk-55ht3bcx.js:12922-12965 placement
function getLastFetchOutcome() {
  return getPolicyLimitsState().lastFetchOutcome;
}
//@ chunk-55ht3bcx.js:12965-13001 placement
function detachPolicyLimitsBackend() {
  getPolicyLimitsState().storageV5 = void 0;
}
//@ chunk-55ht3bcx.js:13001-13042 placement
function isPolicyCacheMemoryOnly() {
  return getPolicyLimitsTunnelSocket() !== void 0 || isDiskless();
}
//@ chunk-55ht3bcx.js:13042-13078 placement
function isAnthropicHosted() {
  return sessionHostKind() !== "none";
}
//@ chunk-55ht3bcx.js:13078-13134 placement
function isDiskCacheForeign() {
  return isPolicyCacheMemoryOnly() || getPolicyLimitsState().diskAdoptionSuppressed;
}
//@ chunk-55ht3bcx.js:13134-13172 placement
function getSessionCache() {
  return getPolicyLimitsState().sessionCache;
}
//@ chunk-55ht3bcx.js:13172-13247 placement
function suppressDiskAdoption() {
  let e = getPolicyLimitsState();
  ((e.diskAdoptionSuppressed = !0), e.diskAdoptionEpoch++);
}
//@ chunk-55ht3bcx.js:13247-13291 placement
function getDiskAdoptionEpoch() {
  return getPolicyLimitsState().diskAdoptionEpoch;
}
//@ chunk-55ht3bcx.js:13291-13336 placement
function liftDiskAdoptionSuppression() {
  getPolicyLimitsState().diskAdoptionSuppressed = !1;
}
//@ chunk-55ht3bcx.js:13336-13385 placement
function isDiskAdoptionSuppressed() {
  return getPolicyLimitsState().diskAdoptionSuppressed;
}
//@ chunk-55ht3bcx.js:13385-13425 placement
function getPolicyCacheRevision() {
  return getPolicyLimitsState().cacheRevision;
}
//@ chunk-55ht3bcx.js:13425-13461 placement
function policyVerdictRebuildKey() {
  return isLovelyUmbrellaOn() ? -1 : getPolicyCacheRevision();
}
//@ chunk-55ht3bcx.js:13461-13515 placement
function onPolicyVerdictChanged(e) {
  return getPolicyLimitsState().verdictChanged.subscribe(e);
}
//@ chunk-55ht3bcx.js:13515-13571 placement
function onPolicyVerdictHeldStart(e) {
  return getPolicyLimitsState().heldStartSignal.subscribe(e);
}
//@ chunk-55ht3bcx.js:13571-13605 placement
function getCachePath() {
  return join(getClaudeConfigDir(), POLICY_LIMITS_CACHE_FILENAME);
}
//@ chunk-55ht3bcx.js:13605-13632 placement
function getPolicyLimitsTunnelSocket() {
  return withoutSSHTunnelVars();
}
//@ chunk-55ht3bcx.js:13632-13767 placement
function isSignInPinnedByMachine() {
  let e = getPolicyLimitsState();
  if (e.machinePinsSignIn !== void 0) return e.machinePinsSignIn;
  let n = machineAdminMayPinSignInOrg();
  if (ave()) e.machinePinsSignIn = n;
  return n;
}
//@ chunk-55ht3bcx.js:13767-13811 placement
function _resetMachinePinsSignInForTesting() {
  getPolicyLimitsState().machinePinsSignIn = void 0;
}
//@ chunk-55ht3bcx.js:13811-13888 placement
var PRINCIPALS_NEVER_SERVED = new Set(["prosumer_oauth", "third_party_provider", "custom_base_url"]);
//@ chunk-55ht3bcx.js:13888-14027 placement
function getCredentialIndependentIneligibleReason(e = {}) {
  if (getAPIProvider() !== "firstParty") return "third_party_provider";
  if (!e.skipBaseUrlCheck && !getPolicyLimitsTunnelSocket() && !isFirstPartyAnthropicBaseUrl())
    return "custom_base_url";
  return;
}
/**
 * 策略限制（organization policy limits）是否适用：只对第一方 API、官方 base URL、带 user:inference 范围的 Claude.ai OAuth 的 team/enterprise 订阅适用；API key 用户直接适用。返回不适用原因或 undefined。
 */
//@ chunk-55ht3bcx.js:14027-14062 placement
function isPolicyLimitsEligible() {
  return getPolicyLimitsIneligibleReason() === void 0;
}
//@ chunk-55ht3bcx.js:14062-14490 placement = isPolicyLimitsEligible (0.63)
function getPolicyLimitsIneligibleReason(e = {}) {
  let n = getCredentialIndependentIneligibleReason(e);
  if (n !== void 0) return n;
  if (getPolicyLimitsTunnelSocket()) return;
  try {
    let { key: apiKey } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 });
    if (apiKey) return;
  } catch {}
  if (shouldUseWIFAuth()) return;
  if (isHostManagedAnthropicApiBearer() && !isGateAOn()) return;
  let tokens = getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return "no_auth";
  if (!tokens.scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE)) return "oauth_no_inference_scope";
  let s = resolveOrgConfigPlan(tokens.subscriptionType ?? null, storedPlanVerifiedAtOf(tokens));
  if (s === null) return;
  if (s !== "enterprise" && s !== "team") return isSignInPinnedByMachine() ? void 0 : "prosumer_oauth";
  return;
}
//@ chunk-55ht3bcx.js:14490-14973 placement
function loadCachedResponse() {
  let e = getPolicyLimitsState();
  if (isStorageV5Enabled() && e.storageV5 !== void 0 && e.sessionCache) return e.sessionCache;
  if (isDiskCacheForeign()) return getPolicyLimitsState().sessionCache;
  if (e.diskRefusedAtMs !== null && Date.now() - e.diskRefusedAtMs < He) return null;
  let n = readPolicyCacheStampForAdmission();
  if (!e.hipaaEvidenceLoaded && !isTwinklingGlobeOn()) applyStampReadToState(n);
  e.storedCopyTrust = "not_asked";
  let r;
  try {
    r = parseCachedResponse(readFileSync(getCachePath(), "utf-8"));
  } catch {
    return null;
  }
  if (r === null) return null;
  try {
    return admitCachedResponse(r, settleStampRead(n));
  } catch (error) {
    return (
      logForDebugging(`Policy limits: cache admission failed (${errorMessage(error)}); cold start`, {
        level: "error",
      }),
      null
    );
  }
}
//@ chunk-55ht3bcx.js:14973-16292 placement
function admitCachedResponse(e, n) {
  let r = getPolicyLimitsState();
  if (isTwinklingGlobeOn())
    return (
      (r.lastStampVerdict = "disabled"),
      (r.lastStampMatchedIdentity = null),
      (r.diskConfirmedAtMs = null),
      (r.diskRefusedAtMs = null),
      applyStoredCopyTrust(e, void 0)
    );
  let s = computeChecksum(serverBodyOf(e));
  if ((applyStampReadToState(n), n.kind === "absent"))
    return (
      (r.lastStampVerdict = "legacy"),
      (r.lastStampMatchedIdentity = null),
      (r.diskBodyChecksum = s),
      (r.diskConfirmedAtMs = null),
      (r.diskRefusedAtMs = null),
      applyStoredCopyTrust(e, s)
    );
  let l = n.kind === "ok" ? n.stamp : null,
    f = getPolicyPrincipal(),
    c = f === null ? "" : eEe(f),
    y = matchCacheStamp(l, c, s);
  switch (((r.lastStampMatchedIdentity = null), y.kind)) {
    case "match":
      ((r.lastStampVerdict = "match"),
        (r.lastStampMatchedIdentity = c),
        (r.diskBodyChecksum = s),
        (r.diskConfirmedAtMs = y.stamp.confirmed_at),
        (r.diskRefusedAtMs = null));
      let h = applyStoredCopyTrust(e, s);
      if (h !== null) r.dropHintedTaints();
      return h;
    case "unstamped":
      return (
        (r.lastStampVerdict = "torn"),
        (r.diskBodyChecksum = null),
        (r.diskConfirmedAtMs = null),
        (r.diskRefusedAtMs = Date.now()),
        r.hintFromRefusedBody(e),
        logForDebugging(
          "Policy limits: the cache stamp does not vouch for the cached body; cold start (its compliance taints and explicit denials still deny)",
        ),
        null
      );
    case "foreign":
      return (
        (r.lastStampVerdict = "foreign"),
        (r.diskBodyChecksum = null),
        (r.diskConfirmedAtMs = null),
        (r.diskRefusedAtMs = Date.now()),
        r.hintFromRefusedBody(e),
        logForDebugging(
          "Policy limits: the cache was written under another credential's identity; cold start (its compliance taints and explicit denials still deny until this credential's verdict lands)",
        ),
        null
      );
  }
}
/**
 * 判定策略缓存副本是否可信（组织固定）。
 */
//@ chunk-55ht3bcx.js:16292-17106 placement
function applyStoredCopyTrust(e, n) {
  let r = getPolicyLimitsState();
  if (!isSettingsGateSettled()) return ((r.storedCopyTrust = "not_asked"), e);
  let s, l;
  try {
    l = { orgs: describeMdmSettingsState() };
  } catch (error) {
    (logForDebugging(`Policy limits: the admin organization pin is not known: ${errorMessage(error)}`),
      (l = void 0));
  }
  if (l === void 0) s = "org_pin_unknown";
  else
    try {
      let f = verifySignedCache({
        kind: "policy-limits",
        cachePath: getCachePath(),
        body: serverBodyOf(e),
        bodySha: n ?? computeChecksum(serverBodyOf(e)),
        account: getStoredOauthAccountInfo(),
        pinnedOrgs: l.orgs,
        nowMs: Date.now(),
        roots: isSecDefaultPluginEnabled(),
      });
      if (f.trusted) return ((r.storedCopyTrust = f), e);
      s = f.reason;
    } catch (error) {
      (logForDebugging(`Policy limits: the gate on a stored copy failed: ${errorMessage(error)}`, {
        level: "error",
      }),
        (s = "error"));
    }
  return (
    (r.storedCopyTrust = { trusted: !1, reason: s }),
    (r.diskBodyChecksum = null),
    (r.diskConfirmedAtMs = null),
    (r.diskRefusedAtMs = Date.now()),
    r.hintFromRefusedBody(e),
    logForDebugging(
      `Policy limits: the stored copy is not trusted at rest (${s}); cold start (its compliance taints and explicit denials still deny)`,
    ),
    null
  );
}
//@ chunk-55ht3bcx.js:17106-19084 placement
function getPolicyPrincipal() {
  let e = getPolicyLimitsState();
  if (((e.principalRung = "none"), getPolicyLimitsTunnelSocket() !== void 0))
    return ((e.principalRung = "tunnel"), null);
  let n = null,
    r = "none";
  try {
    ({ key: n, source: r } = getAnthropicApiKeyWithSource());
  } catch {}
  if (!n && shouldUseWIFAuth()) {
    if (((e.principalRung = "wif"), e.wifAccountDiverged)) return null;
    let s = getWIFPrecedenceSource(),
      ANTHROPIC_PROFILE = env.ANTHROPIC_PROFILE,
      f;
    try {
      if (
        ((f =
          (s === "env-quad"
            ? env.ANTHROPIC_ORGANIZATION_ID?.trim()
            : getWIFAccountInfo()?.organizationUuid?.trim()) || ""),
        e.wifSourceLocation === void 0)
      ) {
        if (s === "profile-implicit") {
          let m = resolveConfigDir();
          e.wifRecordProfile = m === null ? void 0 : resolveImplicitProfileName(m);
        } else if (s === "profile-explicit") e.wifRecordProfile = ANTHROPIC_PROFILE;
        e.wifSourceLocation = federationProfileKey(s);
      }
    } catch (error) {
      return (
        logForDebugging(
          `Policy limits: WIF profile unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
        ),
        (e.wifAccountDiverged = !0),
        null
      );
    }
    if (e.wifRecordedOrg === void 0) e.wifRecordedOrg = f.toLowerCase() || null;
    else if (e.wifRecordedOrg !== (f.toLowerCase() || null))
      return (
        logForDebugging(
          "Policy limits: the WIF source now records a different organization than the one this process derived its principal from; its policy verdicts are session-only until restart",
        ),
        (e.wifAccountDiverged = !0),
        null
      );
    if (!f) return null;
    let c = s === "env-quad" ? null : resolveConfigDir(),
      y =
        s === "env-quad"
          ? federationProfileKey("env-quad")
          : ANTHROPIC_PROFILE
            ? q(c, ANTHROPIC_PROFILE)
            : void 0;
    if (
      (s === "profile-implicit" &&
        ANTHROPIC_PROFILE !== void 0 &&
        ANTHROPIC_PROFILE !== e.wifRecordProfile) ||
      (s === "profile-explicit" &&
        (ANTHROPIC_PROFILE === void 0 || ANTHROPIC_PROFILE !== e.wifRecordProfile)) ||
      (y !== void 0 && y !== e.wifSourceLocation) ||
      (y === void 0 &&
        s !== "env-quad" &&
        e.wifSourceLocation !== void 0 &&
        (c === null ? e.wifSourceLocation !== "" : !e.wifSourceLocation.startsWith(q(c, ""))))
    )
      return (
        logForDebugging(
          "Policy limits: the environment now selects a different WIF source than the one this process derived its principal from; its policy verdicts are session-only until restart",
        ),
        (e.wifAccountDiverged = !0),
        null
      );
    let h = Vt(f);
    if (h) return x(h);
    return {
      kind: "wif",
      descriptor: `wif:${tokenDigest([e.wifSourceLocation, f.toLowerCase()].join("\x00"))}`,
    };
  }
  if (isClaudeAISubscriber()) {
    let s = getClaudeAIOAuthTokens()?.accessToken;
    if (s) return ((e.principalRung = "oauth"), policyCacheKey(s));
  }
  if (r === "apiKeyHelper") return ((e.principalRung = "helper"), null);
  if (n) return ((e.principalRung = "key"), { kind: "key", descriptor: `key:${tokenDigest(n)}` });
  return null;
}
//@ chunk-55ht3bcx.js:19084-20142 placement
function noteWifAccountAtWire() {
  let e = getPolicyLimitsState();
  if (e.wifAccountDiverged || getAnthropicApiKeySafe() || !shouldUseWIFAuth()) return;
  let n;
  try {
    n =
      e.wifSourceLocation !== void 0 &&
      federationProfileKey(getWIFPrecedenceSource()) !== e.wifSourceLocation;
  } catch (error) {
    (logForDebugging(
      `Policy limits: WIF profile selection unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
    ),
      (e.wifAccountDiverged = !0));
    return;
  }
  if (n) {
    ((e.wifAccountDiverged = !0),
      logForDebugging(
        "Policy limits: the active WIF source moved since this process derived its principal; its policy verdicts are session-only until restart",
      ));
    return;
  }
  let r;
  try {
    if (getWIFPrecedenceSource() === "env-quad")
      r = env.ANTHROPIC_ORGANIZATION_ID?.trim().toLowerCase() || null;
    else
      (clearWIFAccountInfoCache(), (r = getWIFAccountInfo()?.organizationUuid?.trim().toLowerCase() ?? null));
  } catch (error) {
    (logForDebugging(
      `Policy limits: WIF account record unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
    ),
      (e.wifAccountDiverged = !0));
    return;
  }
  if (e.wifRecordedOrg === void 0) e.wifRecordedOrg = r;
  else if (e.wifRecordedOrg !== r)
    ((e.wifAccountDiverged = !0),
      logForDebugging(
        "Policy limits: the WIF profile now records a different organization than the one this process derived its principal from; its policy verdicts are session-only until restart",
      ));
}
//@ chunk-55ht3bcx.js:20142-20472 placement
function compareWifAccountOnDisk() {
  let e = getPolicyLimitsState();
  try {
    if (getAnthropicApiKeySafe() || !shouldUseWIFAuth() || getWIFPrecedenceSource() === "env-quad")
      return "not_in_use";
    let n = resolveConfigDir(),
      r = n === null ? void 0 : readWIFAccountInfo(n, e.wifRecordProfile ?? resolveLiveProfileName(n));
    if (r === void 0) return "unreadable";
    let s = normalizedOrgUuid(getWIFAccountInfo()),
      l = e.wifRecordedOrg === void 0 ? s : e.wifRecordedOrg;
    if (normalizedOrgUuid(r) !== l) return "moved";
    return s === l ? "same" : "memory_differs";
  } catch {
    return "unreadable";
  }
}
//@ chunk-55ht3bcx.js:20472-20574 placement
function normalizedOrgUuid(e) {
  let n = e?.organizationUuid;
  return typeof n === "string" ? n.trim().toLowerCase() || null : null;
}
//@ chunk-55ht3bcx.js:20574-20900 placement
async function noteStoredLoginAccountAtWire(e, n) {
  let r = getClaudeAIOAuthTokens()?.accessToken;
  if (!r) return;
  let s = getPolicyLimitsState(),
    l = await getClaudeAIOAuthTokenOriginAsync(n);
  if (l !== "store") {
    if (l !== "none") s.storedLoginNotedTokenDigest = tokenDigest(r);
    return;
  }
  let f = await readStoredLoginOrganizationAfresh(e),
    c = getClaudeAIOAuthTokens()?.accessToken;
  if (!c) return;
  ((s.storedLoginNotedTokenDigest = tokenDigest(c)),
    (s.storedLoginAccountAtWire = { tokenDigest: tokenDigest(c), organizationUuid: c === r ? f : null }));
}
//@ chunk-55ht3bcx.js:20900-21144 placement
function storedLoginAccountNeedsRead() {
  let e = getClaudeAIOAuthTokens()?.accessToken;
  if (!e) return !1;
  let n = getPolicyLimitsState(),
    r = tokenDigest(e);
  if (n.storedLoginNotedTokenDigest !== r) return !0;
  let storedLoginAccountAtWire = n.storedLoginAccountAtWire;
  return (
    storedLoginAccountAtWire !== null &&
    storedLoginAccountAtWire.tokenDigest === r &&
    storedLoginAccountAtWire.organizationUuid !== (Vt(getStoredOauthAccountInfo()?.organizationUuid) ?? null)
  );
}
/**
 * 策略缓存键（令牌、组织、登录账号）。
 */
//@ chunk-55ht3bcx.js:21144-22225 placement
function policyCacheKey(e) {
  let n = getPolicyLimitsState(),
    r = getStoredOauthAccountInfo(),
    s = Vt(env.CLAUDE_CODE_ORGANIZATION_UUID),
    l = tokenDigest(e),
    storedLoginAccountAtWire = n.storedLoginAccountAtWire,
    c =
      storedLoginAccountAtWire !== null && storedLoginAccountAtWire.tokenDigest === l
        ? storedLoginAccountAtWire.organizationUuid
        : void 0,
    joined = [
      l,
      s ?? "",
      r?.organizationUuid ?? "",
      c === void 0 ? "" : `fresh:${c ?? "-"}`,
      env.CLAUDE_CODE_OAUTH_TOKEN ? "env" : "",
    ].join("|"),
    oauthPrincipalMemo = n.oauthPrincipalMemo;
  if (
    oauthPrincipalMemo?.key === joined &&
    (oauthPrincipalMemo.expiresAtMs === null || Date.now() < oauthPrincipalMemo.expiresAtMs)
  )
    return oauthPrincipalMemo.principal;
  let m = { kind: "token", descriptor: `token:${l}` },
    R = !1,
    g = getClaudeAIOAuthTokenOrigin();
  switch (g) {
    case "store": {
      let S = Vt(r?.organizationUuid) ?? null;
      if (c !== void 0 && c !== S) m = { kind: "token", descriptor: `token:${l}`, unclassified: !0 };
      else if (S) m = x(S);
      else m = { kind: "token", descriptor: `token:${l}`, storedLoginOrgless: !0 };
      break;
    }
    case "env":
    case "fd":
      if (g === "fd" && isOauthTokenFromBgSnapshot() && !isHostManagedProviderAuth()) {
        let S = Vt(getOauthOrgFromBgSnapshot()),
          Ce = Vt(r?.organizationUuid);
        ((m = S !== null && S.toLowerCase() === Ce?.toLowerCase() ? { ...x(S), admitsOnly: !0 } : null),
          (R = !0));
      } else if (s) m = { ...x(s), bearerDigest: l };
      break;
    case "none":
      m = { kind: "token", descriptor: `token:${l}`, unclassified: !0 };
      break;
  }
  return (
    (n.oauthPrincipalMemo = {
      key: joined,
      principal: m,
      daemonSnapshotWorker: R,
      expiresAtMs: g === "none" || m === null ? Date.now() + UNCLASSIFIED_ORIGIN_MEMO_MS : null,
    }),
    m
  );
}
//@ chunk-55ht3bcx.js:22225-22294 placement
function x(e) {
  return { kind: "org", descriptor: `org:${e.toLowerCase()}` };
}
//@ chunk-55ht3bcx.js:22294-22629 placement
function dropPolicyTaintHints(e) {
  let n = getPolicyLimitsState();
  ((n.sessionAttributed = !0), (n.attributedBearerDigest = ApiKeySourceSchema()));
  try {
    n.attributedPrincipalIdentity = getPolicyPrincipalIdentity() ?? e ?? principalEvidenceKey();
  } catch (error) {
    (logForDebugging(`Policy limits: principal unreadable at attribution (${errorMessage(error)})`, {
      level: "error",
    }),
      (n.attributedPrincipalIdentity = UNREADABLE_PRINCIPAL));
  }
  ((n.sessionVerdictDisowned = !1), (n.evidenceRereadForBearer = void 0), n.dropHintedTaints());
}

export {
  getPolicyLimitsIneligibleReason,
  getLastFetchOutcome,
  isTransientFetchFailure,
  isPolicyLimitsEligible,
  getPolicyLimitsState,
  getPolicyPrincipal,
  getPolicyLimitsTunnelSocket,
  onPolicyVerdictChanged,
  policyVerdictRebuildKey,
  getPolicyCacheRevision,
  noteStoredLoginAccountAtWire,
  noteWifAccountAtWire,
  PRINCIPALS_NEVER_SERVED,
  onPolicyVerdictHeldStart,
  isPolicyCacheMemoryOnly,
  fe,
  getCachePath,
  installDiskDerivedVerdict,
  envBearerVerdictOnWire,
  storedLoginAccountNeedsRead,
  getCredentialIndependentIneligibleReason,
  isAnthropicHosted,
  isSignInPinnedByMachine,
  loadCachedResponse,
  isDiskCacheForeign,
  getSessionBodyReceivedAt,
  getSessionCache,
  latchComplianceTaintsBustingBetas,
  readPolicyCacheStampForAdmission,
  admitCachedResponse,
  settleStampRead,
  isDiskAdoptionSuppressed,
  getDiskAdoptionEpoch,
  setSessionCacheAsPriorEvidence,
  suppressDiskAdoption,
  liftDiskAdoptionSuppression,
  setSessionCache,
  setLastFetchOutcome,
  detachPolicyLimitsBackend,
  installFailOpenSessionVerdict,
  dropPolicyTaintHints,
  noteSessionVerdictEnvBearer,
  noteSessionBodyReceived,
  _resetMachinePinsSignInForTesting,
  UNCLASSIFIED_ORIGIN_MEMO_MS,
  POLICY_LIMITS_CACHE_FILENAME,
};

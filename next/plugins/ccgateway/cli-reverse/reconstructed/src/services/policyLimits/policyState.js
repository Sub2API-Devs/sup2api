/**
 * services/policyLimits/policyState.ts
 *
 * 2.1.316 新增：策略缓存键（令牌、组织、登录账号）；判定策略缓存副本是否可信（组织固定）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0nvx3515.js (51)
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
import {
  readPolicyStampSync,
  EMPTY_HIPAA_EVIDENCE,
  setPolicyNotice,
  tokenDigest,
  identityDigestOfDescriptor,
  matchCacheStamp,
} from "./cacheStamp.js";
import { createSignal } from "../../utils/signal.js";
import {
  replaceComplianceTaints,
  MAX_COMPLIANCE_TAINTS,
  EMPTY_POLICY_RESPONSE,
  latchComplianceTaints,
} from "./complianceTaints.js";
import { clearBetasCaches } from "../../utils/betas.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import {
  TAINT_DISABLED_POLICIES,
  isEnforcedPolicyKey,
  getPolicyPrincipalIdentity,
  applyStampReadToState,
  parseCachedResponse,
  serverBodyOf,
  federationProfileKey,
  principalPathKey,
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
import { ApiKeySourceSchema_2 } from "../../entrypoints/sdk/coreSchemas.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { withoutSSHTunnelVars } from "../../utils/managedEnv.js";
import { machineAdminMayPinSignInOrg } from "../../utils/settings/settings.js";
import { hasMdmResult } from "../../utils/settings/mdm/mdmLoader.js";
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
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { UNREADABLE_PRINCIPAL } from "./policyVerdicts.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0nvx3515.js:7668-7741 placement (2.1.88 match: CACHE_FILENAME, 1)
/**
 * 策略状态里的重查间隔、被拒键名提示上限与「无戳」标记。
 */
var POLICY_LIMITS_CACHE_FILENAME = "policy-limits.json";
var DISK_REFUSED_RECHECK_MS = 5000;
var MAX_HINTED_DENIED_KEYS = 256;
var ABSENT_STAMP = {
  kind: "absent",
};
var UNCLASSIFIED_ORIGIN_MEMO_MS = 30000;
//@ chunk-0nvx3515.js:7741-7780 placement
function readPolicyCacheStampForAdmission() {
  return isTwinklingGlobeOn() ? ABSENT_STAMP : readPolicyStampSync(getCachePath());
}
//@ chunk-0nvx3515.js:7780-7839 placement
function settleStampRead(policyCacheStampForAdmission) {
  return policyCacheStampForAdmission.kind === "absent" && !isTwinklingGlobeOn()
    ? readPolicyStampSync(getCachePath())
    : policyCacheStampForAdmission;
}
//@ chunk-0nvx3515.js:7839-11185 placement
class PolicyState {
  sessionCache = null;
  lastFetchOutcome = null;
  settledWithoutVerdictFor = null;
  failOpenVerdict = false;
  sessionFromServerFetch = false;
  lastServedCoreSkills = null;
  verdictEnvBearerDigest = null;
  diskAdoptionSuppressed = false;
  diskAdoptionEpoch = 0;
  storageV5 = undefined;
  lastStampVerdict = "none";
  storedCopyTrust = "not_asked";
  lastStampMatchedIdentity = null;
  hipaaEvidence = EMPTY_HIPAA_EVIDENCE;
  hipaaSeenUnreadable = false;
  diskBodyChecksum = null;
  diskConfirmedAtMs = null;
  sessionBodyReceivedAtMs = null;
  diskRefusedAtMs = null;
  hipaaEvidenceLoaded = false;
  hintedTaints = [];
  hintedDeniedKeys = [];
  hintedEnforcedKeys = [];
  sessionAttributed = false;
  attributedBearerDigest = null;
  attributedPrincipalIdentity = null;
  unnamedStampSalt = randomUUID();
  tunnelEpochHeard = undefined;
  sessionVerdictDisowned = false;
  principalRung = "none";
  evidenceRereadForBearer = undefined;
  wifRecordedOrg = undefined;
  wifAccountDiverged = false;
  wifSourceLocation = undefined;
  wifRecordProfile = undefined;
  oauthPrincipalMemo = null;
  storedLoginAccountAtWire = null;
  storedLoginNotedTokenDigest = null;
  machinePinsSignIn = undefined;
  cacheRevision = 0;
  verdictChanged = createSignal();
  heldStartSignal = createSignal();
  replaceSessionCache(cache, fromMemTable = false, keepEnvDigest = false) {
    this.failOpenVerdict =
      cache !== null &&
      (fromMemTable || (this.failOpenVerdict && (keepEnvDigest || cache === this.sessionCache)));
    this.sessionCache = cache;
    if (cache?.core_skills !== undefined)
      this.lastServedCoreSkills = this.sessionFromServerFetch
        ? cache.core_skills
        : this.narrowedServedList(cache.core_skills);
    if (!keepEnvDigest) this.verdictEnvBearerDigest = null;
    if (cache === null) {
      this.sessionAttributed = false;
      this.attributedBearerDigest = null;
      this.attributedPrincipalIdentity = null;
      this.sessionVerdictDisowned = false;
      this.evidenceRereadForBearer = undefined;
    }
    this.cacheRevision++;
    let rift = replaceComplianceTaints(this.effectiveTaints());
    setPolicyNotice(cache?.monitoring_notice ?? null);
    if (rift) clearBetasCaches();
    this.emitVerdictChanged();
  }
  effectiveTaints(baseTaints = this.sessionCache?.compliance_taints ?? []) {
    return this.hintedTaints.length === 0
      ? baseTaints
      : normalizeCaseForComparison_2([...this.hintedTaints, ...baseTaints]).slice(0, MAX_COMPLIANCE_TAINTS);
  }
  dropHintedTaints() {
    if (
      this.hintedTaints.length === 0 &&
      this.hintedDeniedKeys.length === 0 &&
      this.hintedEnforcedKeys.length === 0
    )
      return;
    this.hintedTaints = [];
    this.hintedDeniedKeys = [];
    this.hintedEnforcedKeys = [];
    this.cacheRevision++;
    if (replaceComplianceTaints(this.effectiveTaints())) clearBetasCaches();
    this.emitVerdictChanged();
  }
  hintFromRefusedBody(body) {
    if (this.sessionCache !== null && this.sessionAttributed) return;
    let filtered = body.compliance_taints.filter((complianceTaint) =>
      TAINT_DISABLED_POLICIES.some(([taintName]) => taintName === complianceTaint),
    );
    let nextTaints = normalizeCaseForComparison_2([...this.hintedTaints, ...filtered]);
    let mapped = Object.entries(body.restrictions)
      .filter(([key, value]) => value?.allowed === false && !isEnforcedPolicyKey(key))
      .map(([key]) => key);
    let sliced = normalizeCaseForComparison_2([...this.hintedDeniedKeys, ...mapped]).slice(
      0,
      MAX_HINTED_DENIED_KEYS,
    );
    let mapped_2 = Object.entries(body.restrictions)
      .filter(([key, value]) => value?.allowed === true && isEnforcedPolicyKey(key))
      .map(([key]) => key);
    let sliced_2 = normalizeCaseForComparison_2([...this.hintedEnforcedKeys, ...mapped_2]).slice(
      0,
      MAX_HINTED_DENIED_KEYS,
    );
    let changed = false;
    if (body.core_skills !== undefined) {
      let narrowed = this.narrowedServedList(body.core_skills);
      if (
        this.lastServedCoreSkills === null ||
        narrowed.join(`
`) !==
          this.lastServedCoreSkills.join(`
`)
      ) {
        this.lastServedCoreSkills = narrowed;
        changed = true;
      }
    }
    if (
      !changed &&
      nextTaints.length === this.hintedTaints.length &&
      sliced.length === this.hintedDeniedKeys.length &&
      sliced_2.length === this.hintedEnforcedKeys.length
    )
      return;
    this.hintedTaints = nextTaints;
    this.hintedDeniedKeys = sliced;
    this.hintedEnforcedKeys = sliced_2;
    this.cacheRevision++;
    if (replaceComplianceTaints(this.effectiveTaints())) clearBetasCaches();
    this.emitVerdictChanged();
  }
  narrowedServedList(skills) {
    let allowed = new Set(this.lastServedCoreSkills ?? BUILTIN_SKILL_NAMES);
    return skills.filter((skillName) => allowed.has(skillName));
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
//@ chunk-0nvx3515.js:11185-11212 placement
var policyStates; // deferred: uses PolicyState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0nvx3515.js:11185", () => {
  policyStates = new HostScoped(() => new PolicyState());
});
//@ chunk-0nvx3515.js:11212-11249 placement
function getPolicyLimitsState() {
  return policyStates.of(getRootSession().host);
}
//@ chunk-0nvx3515.js:11249-11377 placement
function setSessionCache(cache) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.sessionFromServerFetch = cache !== null;
  if (cache === null) policyLimitsState.sessionBodyReceivedAtMs = null;
  policyLimitsState.replaceSessionCache(cache);
}
//@ chunk-0nvx3515.js:11377-11423 placement
function noteSessionBodyReceived(sessionBodyReceivedAtMs) {
  getPolicyLimitsState().sessionBodyReceivedAtMs = sessionBodyReceivedAtMs;
}
//@ chunk-0nvx3515.js:11423-11473 placement
function getSessionBodyReceivedAt() {
  return getPolicyLimitsState().sessionBodyReceivedAtMs;
}
//@ chunk-0nvx3515.js:11473-11552 placement
function setSessionCacheAsPriorEvidence(cache) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.sessionFromServerFetch = false;
  policyLimitsState.replaceSessionCache(cache);
}
//@ chunk-0nvx3515.js:11552-11597 placement
function noteSessionVerdictEnvBearer(verdictEnvBearerDigest) {
  getPolicyLimitsState().verdictEnvBearerDigest = verdictEnvBearerDigest;
}
//@ chunk-0nvx3515.js:11597-11813 placement
function envBearerVerdictOnWire() {
  let verdictEnvBearerDigest = getPolicyLimitsState().verdictEnvBearerDigest;
  if (verdictEnvBearerDigest === null) return null;
  let envToken = effectiveAuthTokenEnv();
  if (
    isGateAOn() ||
    !envToken ||
    hasInferenceScope({
      anthropicAuthEnabled: isAnthropicAuthEnabled(),
      oauthScopes: getClaudeAIOAuthTokens()?.scopes,
    }) ||
    getAnthropicApiKeySafe() != null
  )
    return "gone";
  return tokenDigest(envToken) === verdictEnvBearerDigest ? "same" : "replaced";
}
//@ chunk-0nvx3515.js:11813-11927 placement
function installFailOpenSessionVerdict() {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.sessionFromServerFetch = false;
  policyLimitsState.sessionBodyReceivedAtMs = null;
  policyLimitsState.replaceSessionCache(EMPTY_POLICY_RESPONSE, true);
}
//@ chunk-0nvx3515.js:11927-12348 placement
function installDiskDerivedVerdict(verdict) {
  let policyLimitsState = getPolicyLimitsState();
  let hadSession = policyLimitsState.sessionCache !== null;
  if (!hadSession) {
    policyLimitsState.sessionFromServerFetch = false;
    policyLimitsState.sessionAttributed = policyLimitsState.lastStampVerdict === "match";
    policyLimitsState.attributedBearerDigest = policyLimitsState.sessionAttributed
      ? ApiKeySourceSchema_2()
      : null;
    policyLimitsState.attributedPrincipalIdentity = policyLimitsState.sessionAttributed
      ? policyLimitsState.lastStampMatchedIdentity
      : null;
    policyLimitsState.sessionVerdictDisowned = policyLimitsState.lastStampVerdict === "disabled";
    policyLimitsState.evidenceRereadForBearer = undefined;
    policyLimitsState.sessionBodyReceivedAtMs = null;
  }
  policyLimitsState.replaceSessionCache(verdict, false, hadSession);
}
//@ chunk-0nvx3515.js:12348-12379 placement
function latchComplianceTaintsBustingBetas(taints) {
  if (latchComplianceTaints(taints)) clearBetasCaches();
}
//@ chunk-0nvx3515.js:12379-12766 placement
function setLastFetchOutcome(outcome, principalIdentity, settleTransient = true) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.lastFetchOutcome = outcome;
  if (outcome === null || outcome.success) policyLimitsState.settledWithoutVerdictFor = null;
  else if (!outcome.retrying && (settleTransient || !isTransientFetchFailure(outcome))) {
    let isTransient =
      outcome.errorCode === "network_error" ||
      outcome.errorCode === "timeout" ||
      (outcome.errorCode === "request_failed" &&
        outcome.httpStatus !== null &&
        (outcome.httpStatus === 404 || outcome.httpStatus >= 500));
    policyLimitsState.settledWithoutVerdictFor = isTransient
      ? (principalIdentity ?? getPolicyPrincipalIdentity() ?? "")
      : null;
  }
  policyLimitsState.cacheRevision++;
  policyLimitsState.emitVerdictChanged();
}
//@ chunk-0nvx3515.js:12766-12957 placement
function isTransientFetchFailure(outcome) {
  return (
    outcome.errorCode === "network_error" ||
    outcome.errorCode === "timeout" ||
    (outcome.errorCode === "request_failed" &&
      (outcome.httpStatus === null ||
        outcome.httpStatus >= 500 ||
        (outcome.httpStatus >= 400 && !isNonRetryableClientError(outcome.httpStatus))))
  );
}
//@ chunk-0nvx3515.js:12957-13000 placement
function getLastFetchOutcome() {
  return getPolicyLimitsState().lastFetchOutcome;
}
//@ chunk-0nvx3515.js:13000-13036 placement
function detachPolicyLimitsBackend() {
  getPolicyLimitsState().storageV5 = undefined;
}
//@ chunk-0nvx3515.js:13036-13077 placement
function isPolicyCacheMemoryOnly() {
  return getPolicyLimitsTunnelSocket() !== undefined || isDiskless();
}
//@ chunk-0nvx3515.js:13077-13113 placement
function isAnthropicHosted() {
  return sessionHostKind() !== "none";
}
//@ chunk-0nvx3515.js:13113-13169 placement
function isDiskCacheForeign() {
  return isPolicyCacheMemoryOnly() || getPolicyLimitsState().diskAdoptionSuppressed;
}
//@ chunk-0nvx3515.js:13169-13207 placement
function getSessionCache() {
  return getPolicyLimitsState().sessionCache;
}
//@ chunk-0nvx3515.js:13207-13282 placement
function suppressDiskAdoption() {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.diskAdoptionSuppressed = true;
  policyLimitsState.diskAdoptionEpoch++;
}
//@ chunk-0nvx3515.js:13282-13326 placement
function getDiskAdoptionEpoch() {
  return getPolicyLimitsState().diskAdoptionEpoch;
}
//@ chunk-0nvx3515.js:13326-13371 placement
function liftDiskAdoptionSuppression() {
  getPolicyLimitsState().diskAdoptionSuppressed = false;
}
//@ chunk-0nvx3515.js:13371-13420 placement
function isDiskAdoptionSuppressed() {
  return getPolicyLimitsState().diskAdoptionSuppressed;
}
//@ chunk-0nvx3515.js:13420-13460 placement
function getPolicyCacheRevision() {
  return getPolicyLimitsState().cacheRevision;
}
//@ chunk-0nvx3515.js:13460-13497 placement
function policyVerdictRebuildKey() {
  return isLovelyUmbrellaOn() ? -1 : getPolicyCacheRevision();
}
//@ chunk-0nvx3515.js:13497-13551 placement
function onPolicyVerdictChanged(listener) {
  return getPolicyLimitsState().verdictChanged.subscribe(listener);
}
//@ chunk-0nvx3515.js:13551-13607 placement
function onPolicyVerdictHeldStart(listener) {
  return getPolicyLimitsState().heldStartSignal.subscribe(listener);
}
//@ chunk-0nvx3515.js:13607-13641 placement
function getCachePath() {
  return join(getClaudeConfigDir(), POLICY_LIMITS_CACHE_FILENAME);
}
//@ chunk-0nvx3515.js:13641-13668 placement
function getPolicyLimitsTunnelSocket() {
  return withoutSSHTunnelVars();
}
//@ chunk-0nvx3515.js:13668-13803 placement
function isSignInPinnedByMachine() {
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.machinePinsSignIn !== undefined) return policyLimitsState.machinePinsSignIn;
  let pinned = machineAdminMayPinSignInOrg();
  if (hasMdmResult()) policyLimitsState.machinePinsSignIn = pinned;
  return pinned;
}
//@ chunk-0nvx3515.js:13803-13847 placement
function _resetMachinePinsSignInForTesting() {
  getPolicyLimitsState().machinePinsSignIn = undefined;
}
//@ chunk-0nvx3515.js:13847-13924 placement
var PRINCIPALS_NEVER_SERVED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0nvx3515.js:13847", () => {
  PRINCIPALS_NEVER_SERVED = new Set(["prosumer_oauth", "third_party_provider", "custom_base_url"]);
});
//@ chunk-0nvx3515.js:13924-14063 placement
function getCredentialIndependentIneligibleReason(options = {}) {
  if (getAPIProvider() !== "firstParty") return "third_party_provider";
  if (!options.skipBaseUrlCheck && !getPolicyLimitsTunnelSocket() && !isFirstPartyAnthropicBaseUrl())
    return "custom_base_url";
  return;
}
//@ chunk-0nvx3515.js:14063-14098 placement
/**
 * 策略限制（organization policy limits）是否适用：只对第一方 API、官方 base URL、带 user:inference 范围的 Claude.ai OAuth 的 team/enterprise 订阅适用；API key 用户直接适用。返回不适用原因或 undefined。
 */
function isPolicyLimitsEligible() {
  return getPolicyLimitsIneligibleReason() === undefined;
}
//@ chunk-0nvx3515.js:14098-14526 placement (2.1.88 match: isPolicyLimitsEligible, 0.63)
function getPolicyLimitsIneligibleReason(options = {}) {
  let credentialIndependentIneligibleReason = getCredentialIndependentIneligibleReason(options);
  if (credentialIndependentIneligibleReason !== undefined) return credentialIndependentIneligibleReason;
  if (getPolicyLimitsTunnelSocket()) return;
  try {
    let { key: apiKey } = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    if (apiKey) return;
  } catch {}
  if (shouldUseWIFAuth()) return;
  if (isHostManagedAnthropicApiBearer() && !isGateAOn()) return;
  let tokens = getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return "no_auth";
  if (!tokens.scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE)) return "oauth_no_inference_scope";
  let orgConfigPlan = resolveOrgConfigPlan(tokens.subscriptionType ?? null, storedPlanVerifiedAtOf(tokens));
  if (orgConfigPlan === null) return;
  if (orgConfigPlan !== "enterprise" && orgConfigPlan !== "team")
    return isSignInPinnedByMachine() ? undefined : "prosumer_oauth";
  return;
}
//@ chunk-0nvx3515.js:14526-15009 placement
function loadCachedResponse() {
  let policyLimitsState = getPolicyLimitsState();
  if (isStorageV5Enabled() && policyLimitsState.storageV5 !== undefined && policyLimitsState.sessionCache)
    return policyLimitsState.sessionCache;
  if (isDiskCacheForeign()) return getPolicyLimitsState().sessionCache;
  if (
    policyLimitsState.diskRefusedAtMs !== null &&
    Date.now() - policyLimitsState.diskRefusedAtMs < DISK_REFUSED_RECHECK_MS
  )
    return null;
  let policyCacheStampForAdmission = readPolicyCacheStampForAdmission();
  if (!policyLimitsState.hipaaEvidenceLoaded && !isTwinklingGlobeOn())
    applyStampReadToState(policyCacheStampForAdmission);
  policyLimitsState.storedCopyTrust = "not_asked";
  let cached;
  try {
    cached = parseCachedResponse(readFileSync(getCachePath(), "utf-8"));
  } catch {
    return null;
  }
  if (cached === null) return null;
  try {
    return admitCachedResponse(cached, settleStampRead(policyCacheStampForAdmission));
  } catch (error) {
    logForDebugging(`Policy limits: cache admission failed (${errorMessage(error)}); cold start`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-0nvx3515.js:15009-16328 placement
function admitCachedResponse(body, stampRead) {
  let policyLimitsState = getPolicyLimitsState();
  if (isTwinklingGlobeOn()) {
    policyLimitsState.lastStampVerdict = "disabled";
    policyLimitsState.lastStampMatchedIdentity = null;
    policyLimitsState.diskConfirmedAtMs = null;
    policyLimitsState.diskRefusedAtMs = null;
    return applyStoredCopyTrust(body, undefined);
  }
  let checksum = computeChecksum(serverBodyOf(body));
  applyStampReadToState(stampRead);
  if (stampRead.kind === "absent") {
    policyLimitsState.lastStampVerdict = "legacy";
    policyLimitsState.lastStampMatchedIdentity = null;
    policyLimitsState.diskBodyChecksum = checksum;
    policyLimitsState.diskConfirmedAtMs = null;
    policyLimitsState.diskRefusedAtMs = null;
    return applyStoredCopyTrust(body, checksum);
  }
  let stamp = stampRead.kind === "ok" ? stampRead.stamp : null;
  let policyPrincipal = getPolicyPrincipal();
  let principalDigest = policyPrincipal === null ? "" : identityDigestOfDescriptor(policyPrincipal);
  let stampMatch = matchCacheStamp(stamp, principalDigest, checksum);
  switch (((policyLimitsState.lastStampMatchedIdentity = null), stampMatch.kind)) {
    case "match":
      policyLimitsState.lastStampVerdict = "match";
      policyLimitsState.lastStampMatchedIdentity = principalDigest;
      policyLimitsState.diskBodyChecksum = checksum;
      policyLimitsState.diskConfirmedAtMs = stampMatch.stamp.confirmed_at;
      policyLimitsState.diskRefusedAtMs = null;
      let admitted = applyStoredCopyTrust(body, checksum);
      if (admitted !== null) policyLimitsState.dropHintedTaints();
      return admitted;
    case "unstamped":
      policyLimitsState.lastStampVerdict = "torn";
      policyLimitsState.diskBodyChecksum = null;
      policyLimitsState.diskConfirmedAtMs = null;
      policyLimitsState.diskRefusedAtMs = Date.now();
      policyLimitsState.hintFromRefusedBody(body);
      logForDebugging(
        "Policy limits: the cache stamp does not vouch for the cached body; cold start (its compliance taints and explicit denials still deny)",
      );
      return null;
    case "foreign":
      policyLimitsState.lastStampVerdict = "foreign";
      policyLimitsState.diskBodyChecksum = null;
      policyLimitsState.diskConfirmedAtMs = null;
      policyLimitsState.diskRefusedAtMs = Date.now();
      policyLimitsState.hintFromRefusedBody(body);
      logForDebugging(
        "Policy limits: the cache was written under another credential's identity; cold start (its compliance taints and explicit denials still deny until this credential's verdict lands)",
      );
      return null;
  }
}
//@ chunk-0nvx3515.js:16328-17142 placement
/**
 * 判定策略缓存副本是否可信（组织固定）。
 */
function applyStoredCopyTrust(body, checksum) {
  let policyLimitsState = getPolicyLimitsState();
  if (!isSettingsGateSettled()) {
    policyLimitsState.storedCopyTrust = "not_asked";
    return body;
  }
  let reason;
  let mdmState;
  try {
    mdmState = {
      orgs: describeMdmSettingsState(),
    };
  } catch (error) {
    logForDebugging(`Policy limits: the admin organization pin is not known: ${errorMessage(error)}`);
    mdmState = undefined;
  }
  if (mdmState === undefined) reason = "org_pin_unknown";
  else
    try {
      let verify = verifySignedCache({
        kind: "policy-limits",
        cachePath: getCachePath(),
        body: serverBodyOf(body),
        bodySha: checksum ?? computeChecksum(serverBodyOf(body)),
        account: getStoredOauthAccountInfo(),
        pinnedOrgs: mdmState.orgs,
        nowMs: Date.now(),
        roots: isSecDefaultPluginEnabled(),
      });
      if (verify.trusted) {
        policyLimitsState.storedCopyTrust = verify;
        return body;
      }
      reason = verify.reason;
    } catch (error) {
      logForDebugging(`Policy limits: the gate on a stored copy failed: ${errorMessage(error)}`, {
        level: "error",
      });
      reason = "error";
    }
  policyLimitsState.storedCopyTrust = {
    trusted: false,
    reason,
  };
  policyLimitsState.diskBodyChecksum = null;
  policyLimitsState.diskConfirmedAtMs = null;
  policyLimitsState.diskRefusedAtMs = Date.now();
  policyLimitsState.hintFromRefusedBody(body);
  logForDebugging(
    `Policy limits: the stored copy is not trusted at rest (${reason}); cold start (its compliance taints and explicit denials still deny)`,
  );
  return null;
}
//@ chunk-0nvx3515.js:17142-19120 placement
function getPolicyPrincipal() {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.principalRung = "none";
  if (getPolicyLimitsTunnelSocket() !== undefined) {
    policyLimitsState.principalRung = "tunnel";
    return null;
  }
  let apiKey = null;
  let keySource = "none";
  try {
    ({ key: apiKey, source: keySource } = getAnthropicApiKeyWithSource());
  } catch {}
  if (!apiKey && shouldUseWIFAuth()) {
    policyLimitsState.principalRung = "wif";
    if (policyLimitsState.wifAccountDiverged) return null;
    let wifPrecedenceSource = getWIFPrecedenceSource();
    let ANTHROPIC_PROFILE = env.ANTHROPIC_PROFILE;
    let orgUuid;
    try {
      orgUuid =
        (wifPrecedenceSource === "env-quad"
          ? env.ANTHROPIC_ORGANIZATION_ID?.trim()
          : getWIFAccountInfo()?.organizationUuid?.trim()) || "";
      if (policyLimitsState.wifSourceLocation === undefined) {
        if (wifPrecedenceSource === "profile-implicit") {
          let configDir = resolveConfigDir();
          policyLimitsState.wifRecordProfile =
            configDir === null ? undefined : resolveImplicitProfileName(configDir);
        } else if (wifPrecedenceSource === "profile-explicit")
          policyLimitsState.wifRecordProfile = ANTHROPIC_PROFILE;
        policyLimitsState.wifSourceLocation = federationProfileKey(wifPrecedenceSource);
      }
    } catch (error) {
      logForDebugging(
        `Policy limits: WIF profile unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
      );
      policyLimitsState.wifAccountDiverged = true;
      return null;
    }
    if (policyLimitsState.wifRecordedOrg === undefined)
      policyLimitsState.wifRecordedOrg = orgUuid.toLowerCase() || null;
    else if (policyLimitsState.wifRecordedOrg !== (orgUuid.toLowerCase() || null)) {
      logForDebugging(
        "Policy limits: the WIF source now records a different organization than the one this process derived its principal from; its policy verdicts are session-only until restart",
      );
      policyLimitsState.wifAccountDiverged = true;
      return null;
    }
    if (!orgUuid) return null;
    let configDir = wifPrecedenceSource === "env-quad" ? null : resolveConfigDir();
    let sourceLocation =
      wifPrecedenceSource === "env-quad"
        ? federationProfileKey("env-quad")
        : ANTHROPIC_PROFILE
          ? principalPathKey(configDir, ANTHROPIC_PROFILE)
          : undefined;
    if (
      (wifPrecedenceSource === "profile-implicit" &&
        ANTHROPIC_PROFILE !== undefined &&
        ANTHROPIC_PROFILE !== policyLimitsState.wifRecordProfile) ||
      (wifPrecedenceSource === "profile-explicit" &&
        (ANTHROPIC_PROFILE === undefined || ANTHROPIC_PROFILE !== policyLimitsState.wifRecordProfile)) ||
      (sourceLocation !== undefined && sourceLocation !== policyLimitsState.wifSourceLocation) ||
      (sourceLocation === undefined &&
        wifPrecedenceSource !== "env-quad" &&
        policyLimitsState.wifSourceLocation !== undefined &&
        (configDir === null
          ? policyLimitsState.wifSourceLocation !== ""
          : !policyLimitsState.wifSourceLocation.startsWith(principalPathKey(configDir, ""))))
    ) {
      logForDebugging(
        "Policy limits: the environment now selects a different WIF source than the one this process derived its principal from; its policy verdicts are session-only until restart",
      );
      policyLimitsState.wifAccountDiverged = true;
      return null;
    }
    let uuid = normalizeUuidOrNull(orgUuid);
    if (uuid) return shortArtifactIdPrincipal(uuid);
    return {
      kind: "wif",
      descriptor: `wif:${tokenDigest([policyLimitsState.wifSourceLocation, orgUuid.toLowerCase()].join("\x00"))}`,
    };
  }
  if (isClaudeAISubscriber()) {
    let accessToken = getClaudeAIOAuthTokens()?.accessToken;
    if (accessToken) {
      policyLimitsState.principalRung = "oauth";
      return policyCacheKey(accessToken);
    }
  }
  if (keySource === "apiKeyHelper") {
    policyLimitsState.principalRung = "helper";
    return null;
  }
  if (apiKey) {
    policyLimitsState.principalRung = "key";
    return {
      kind: "key",
      descriptor: `key:${tokenDigest(apiKey)}`,
    };
  }
  return null;
}
//@ chunk-0nvx3515.js:19120-20178 placement
function noteWifAccountAtWire() {
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.wifAccountDiverged || getAnthropicApiKeySafe() || !shouldUseWIFAuth()) return;
  let diverged;
  try {
    diverged =
      policyLimitsState.wifSourceLocation !== undefined &&
      federationProfileKey(getWIFPrecedenceSource()) !== policyLimitsState.wifSourceLocation;
  } catch (error) {
    logForDebugging(
      `Policy limits: WIF profile selection unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
    );
    policyLimitsState.wifAccountDiverged = true;
    return;
  }
  if (diverged) {
    policyLimitsState.wifAccountDiverged = true;
    logForDebugging(
      "Policy limits: the active WIF source moved since this process derived its principal; its policy verdicts are session-only until restart",
    );
    return;
  }
  let orgUuid;
  try {
    if (getWIFPrecedenceSource() === "env-quad")
      orgUuid = env.ANTHROPIC_ORGANIZATION_ID?.trim().toLowerCase() || null;
    else {
      clearWIFAccountInfoCache();
      orgUuid = getWIFAccountInfo()?.organizationUuid?.trim().toLowerCase() ?? null;
    }
  } catch (error) {
    logForDebugging(
      `Policy limits: WIF account record unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
    );
    policyLimitsState.wifAccountDiverged = true;
    return;
  }
  if (policyLimitsState.wifRecordedOrg === undefined) policyLimitsState.wifRecordedOrg = orgUuid;
  else if (policyLimitsState.wifRecordedOrg !== orgUuid) {
    policyLimitsState.wifAccountDiverged = true;
    logForDebugging(
      "Policy limits: the WIF profile now records a different organization than the one this process derived its principal from; its policy verdicts are session-only until restart",
    );
  }
}
//@ chunk-0nvx3515.js:20178-20508 placement
function compareWifAccountOnDisk() {
  let policyLimitsState = getPolicyLimitsState();
  try {
    if (getAnthropicApiKeySafe() || !shouldUseWIFAuth() || getWIFPrecedenceSource() === "env-quad")
      return "not_in_use";
    let configDir = resolveConfigDir();
    let configRecord =
      configDir === null
        ? undefined
        : readWIFAccountInfo(
            configDir,
            policyLimitsState.wifRecordProfile ?? resolveLiveProfileName(configDir),
          );
    if (configRecord === undefined) return "unreadable";
    let memoryOrg = normalizedOrgUuid(getWIFAccountInfo());
    let expectedOrg =
      policyLimitsState.wifRecordedOrg === undefined ? memoryOrg : policyLimitsState.wifRecordedOrg;
    if (normalizedOrgUuid(configRecord) !== expectedOrg) return "moved";
    return memoryOrg === expectedOrg ? "same" : "memory_differs";
  } catch {
    return "unreadable";
  }
}
//@ chunk-0nvx3515.js:20508-20610 placement
function normalizedOrgUuid(info) {
  let organizationUuid = info?.organizationUuid;
  return typeof organizationUuid === "string" ? organizationUuid.trim().toLowerCase() || null : null;
}
//@ chunk-0nvx3515.js:20610-20936 placement
async function noteStoredLoginAccountAtWire(storageV5, credentials) {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) return;
  let policyLimitsState = getPolicyLimitsState();
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(credentials);
  if (claudeAIOAuthTokenOrigin !== "store") {
    if (claudeAIOAuthTokenOrigin !== "none")
      policyLimitsState.storedLoginNotedTokenDigest = tokenDigest(accessToken);
    return;
  }
  let storedLoginOrganizationAfresh = await readStoredLoginOrganizationAfresh(storageV5);
  let accessToken_2 = getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken_2) return;
  policyLimitsState.storedLoginNotedTokenDigest = tokenDigest(accessToken_2);
  policyLimitsState.storedLoginAccountAtWire = {
    tokenDigest: tokenDigest(accessToken_2),
    organizationUuid: accessToken_2 === accessToken ? storedLoginOrganizationAfresh : null,
  };
}
//@ chunk-0nvx3515.js:20936-21180 placement
function storedLoginAccountNeedsRead() {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) return false;
  let policyLimitsState = getPolicyLimitsState();
  let tokenDigestValue = tokenDigest(accessToken);
  if (policyLimitsState.storedLoginNotedTokenDigest !== tokenDigestValue) return true;
  let storedLoginAccountAtWire = policyLimitsState.storedLoginAccountAtWire;
  return (
    storedLoginAccountAtWire !== null &&
    storedLoginAccountAtWire.tokenDigest === tokenDigestValue &&
    storedLoginAccountAtWire.organizationUuid !==
      (normalizeUuidOrNull(getStoredOauthAccountInfo()?.organizationUuid) ?? null)
  );
}
//@ chunk-0nvx3515.js:21180-22261 placement
/**
 * 策略缓存键（令牌、组织、登录账号）。
 */
function policyCacheKey(accessToken) {
  let policyLimitsState = getPolicyLimitsState();
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let envOrgUuid = normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID);
  let tokenDigestValue = tokenDigest(accessToken);
  let storedLoginAccountAtWire = policyLimitsState.storedLoginAccountAtWire;
  let organizationUuid =
    storedLoginAccountAtWire !== null && storedLoginAccountAtWire.tokenDigest === tokenDigestValue
      ? storedLoginAccountAtWire.organizationUuid
      : undefined;
  let joined = [
    tokenDigestValue,
    envOrgUuid ?? "",
    storedOauthAccountInfo?.organizationUuid ?? "",
    organizationUuid === undefined ? "" : `fresh:${organizationUuid ?? "-"}`,
    env.CLAUDE_CODE_OAUTH_TOKEN ? "env" : "",
  ].join("|");
  let oauthPrincipalMemo = policyLimitsState.oauthPrincipalMemo;
  if (
    oauthPrincipalMemo?.key === joined &&
    (oauthPrincipalMemo.expiresAtMs === null || Date.now() < oauthPrincipalMemo.expiresAtMs)
  )
    return oauthPrincipalMemo.principal;
  let principal = {
    kind: "token",
    descriptor: `token:${tokenDigestValue}`,
  };
  let daemonSnapshotWorker = false;
  let claudeAIOAuthTokenOrigin = getClaudeAIOAuthTokenOrigin();
  switch (claudeAIOAuthTokenOrigin) {
    case "store": {
      let storedOrg = normalizeUuidOrNull(storedOauthAccountInfo?.organizationUuid) ?? null;
      if (organizationUuid !== undefined && organizationUuid !== storedOrg)
        principal = {
          kind: "token",
          descriptor: `token:${tokenDigestValue}`,
          unclassified: true,
        };
      else if (storedOrg) principal = shortArtifactIdPrincipal(storedOrg);
      else
        principal = {
          kind: "token",
          descriptor: `token:${tokenDigestValue}`,
          storedLoginOrgless: true,
        };
      break;
    }
    case "env":
    case "fd":
      if (claudeAIOAuthTokenOrigin === "fd" && isOauthTokenFromBgSnapshot() && !isHostManagedProviderAuth()) {
        let snapshotOrg = normalizeUuidOrNull(getOauthOrgFromBgSnapshot());
        let storedOrg = normalizeUuidOrNull(storedOauthAccountInfo?.organizationUuid);
        principal =
          snapshotOrg !== null && snapshotOrg.toLowerCase() === storedOrg?.toLowerCase()
            ? {
                ...shortArtifactIdPrincipal(snapshotOrg),
                admitsOnly: true,
              }
            : null;
        daemonSnapshotWorker = true;
      } else if (envOrgUuid)
        principal = {
          ...shortArtifactIdPrincipal(envOrgUuid),
          bearerDigest: tokenDigestValue,
        };
      break;
    case "none":
      principal = {
        kind: "token",
        descriptor: `token:${tokenDigestValue}`,
        unclassified: true,
      };
      break;
  }
  policyLimitsState.oauthPrincipalMemo = {
    key: joined,
    principal,
    daemonSnapshotWorker,
    expiresAtMs:
      claudeAIOAuthTokenOrigin === "none" || principal === null
        ? Date.now() + UNCLASSIFIED_ORIGIN_MEMO_MS
        : null,
  };
  return principal;
}
//@ chunk-0nvx3515.js:22261-22330 placement
/**
 * 由短 artifact id 得到策略主体（不可用时返回 null）。
 */
function shortArtifactIdPrincipal(orgUuid) {
  return {
    kind: "org",
    descriptor: `org:${orgUuid.toLowerCase()}`,
  };
}
//@ chunk-0nvx3515.js:22330-22665 placement
function dropPolicyTaintHints(stampAtWire) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.sessionAttributed = true;
  policyLimitsState.attributedBearerDigest = ApiKeySourceSchema_2();
  try {
    policyLimitsState.attributedPrincipalIdentity =
      getPolicyPrincipalIdentity() ?? stampAtWire ?? principalEvidenceKey();
  } catch (error) {
    logForDebugging(`Policy limits: principal unreadable at attribution (${errorMessage(error)})`, {
      level: "error",
    });
    policyLimitsState.attributedPrincipalIdentity = UNREADABLE_PRINCIPAL;
  }
  policyLimitsState.sessionVerdictDisowned = false;
  policyLimitsState.evidenceRereadForBearer = undefined;
  policyLimitsState.dropHintedTaints();
}
export {
  getPolicyCacheRevision,
  onPolicyVerdictChanged,
  getPolicyLimitsIneligibleReason,
  getLastFetchOutcome,
  isTransientFetchFailure,
  isPolicyLimitsEligible,
  getPolicyLimitsState,
  getPolicyPrincipal,
  isPolicyCacheMemoryOnly,
  ABSENT_STAMP,
  getCachePath,
  installDiskDerivedVerdict,
  envBearerVerdictOnWire,
  storedLoginAccountNeedsRead,
  getPolicyLimitsTunnelSocket,
  getCredentialIndependentIneligibleReason,
  isAnthropicHosted,
  isSignInPinnedByMachine,
  loadCachedResponse,
  onPolicyVerdictHeldStart,
  PRINCIPALS_NEVER_SERVED,
  POLICY_LIMITS_CACHE_FILENAME,
  noteStoredLoginAccountAtWire,
  noteWifAccountAtWire,
  policyVerdictRebuildKey,
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
  PolicyState,
  compareWifAccountOnDisk,
  policyStates,
};

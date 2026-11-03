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
import { uniq } from "../../utils/collections.js";
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
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { withoutSSHTunnelVars } from "../../utils/managedEnv.js";
import { machineAdminMayPinSignInOrg } from "../../utils/settings/settings.js";
import { hasMdmResult } from "../../utils/settings/managedPluginTiers.js";
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

//@ chunk-55ht3bcx.js:7634-7707 placement = CACHE_FILENAME (1)
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
//@ chunk-55ht3bcx.js:7707-7746 placement
function readPolicyCacheStampForAdmission() {
  return isTwinklingGlobeOn() ? ABSENT_STAMP : readPolicyStampSync(getCachePath());
}
//@ chunk-55ht3bcx.js:7746-7805 placement
function settleStampRead(policyCacheStampForAdmission) {
  return policyCacheStampForAdmission.kind === "absent" && !isTwinklingGlobeOn()
    ? readPolicyStampSync(getCachePath())
    : policyCacheStampForAdmission;
}
//@ chunk-55ht3bcx.js:7805-11150 placement
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
  replaceSessionCache(e, n = false, r = false) {
    this.failOpenVerdict = e !== null && (n || (this.failOpenVerdict && (r || e === this.sessionCache)));
    this.sessionCache = e;
    if (e?.core_skills !== undefined)
      this.lastServedCoreSkills = this.sessionFromServerFetch
        ? e.core_skills
        : this.narrowedServedList(e.core_skills);
    if (!r) this.verdictEnvBearerDigest = null;
    if (e === null) {
      this.sessionAttributed = false;
      this.attributedBearerDigest = null;
      this.attributedPrincipalIdentity = null;
      this.sessionVerdictDisowned = false;
      this.evidenceRereadForBearer = undefined;
    }
    this.cacheRevision++;
    let s = replaceComplianceTaints(this.effectiveTaints());
    setPolicyNotice(e?.monitoring_notice ?? null);
    if (s) clearBetasCaches();
    this.emitVerdictChanged();
  }
  effectiveTaints(e = this.sessionCache?.compliance_taints ?? []) {
    return this.hintedTaints.length === 0
      ? e
      : uniq([...this.hintedTaints, ...e]).slice(0, MAX_COMPLIANCE_TAINTS);
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
  hintFromRefusedBody(e) {
    if (this.sessionCache !== null && this.sessionAttributed) return;
    let filtered = e.compliance_taints.filter((complianceTaint) =>
      TAINT_DISABLED_POLICIES.some(([m]) => m === complianceTaint),
    );
    let r = uniq([...this.hintedTaints, ...filtered]);
    let mapped = Object.entries(e.restrictions)
      .filter(([key, value]) => value?.allowed === false && !isEnforcedPolicyKey(key))
      .map(([key]) => key);
    let sliced = uniq([...this.hintedDeniedKeys, ...mapped]).slice(0, MAX_HINTED_DENIED_KEYS);
    let mapped_2 = Object.entries(e.restrictions)
      .filter(([key, value]) => value?.allowed === true && isEnforcedPolicyKey(key))
      .map(([key]) => key);
    let sliced_2 = uniq([...this.hintedEnforcedKeys, ...mapped_2]).slice(0, MAX_HINTED_DENIED_KEYS);
    let y = false;
    if (e.core_skills !== undefined) {
      let h = this.narrowedServedList(e.core_skills);
      if (
        this.lastServedCoreSkills === null ||
        h.join(`
`) !==
          this.lastServedCoreSkills.join(`
`)
      ) {
        this.lastServedCoreSkills = h;
        y = true;
      }
    }
    if (
      !y &&
      r.length === this.hintedTaints.length &&
      sliced.length === this.hintedDeniedKeys.length &&
      sliced_2.length === this.hintedEnforcedKeys.length
    )
      return;
    this.hintedTaints = r;
    this.hintedDeniedKeys = sliced;
    this.hintedEnforcedKeys = sliced_2;
    this.cacheRevision++;
    if (replaceComplianceTaints(this.effectiveTaints())) clearBetasCaches();
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
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.sessionFromServerFetch = e !== null;
  if (e === null) policyLimitsState.sessionBodyReceivedAtMs = null;
  policyLimitsState.replaceSessionCache(e);
}
//@ chunk-55ht3bcx.js:11342-11388 placement
function noteSessionBodyReceived(sessionBodyReceivedAtMs) {
  getPolicyLimitsState().sessionBodyReceivedAtMs = sessionBodyReceivedAtMs;
}
//@ chunk-55ht3bcx.js:11388-11438 placement
function getSessionBodyReceivedAt() {
  return getPolicyLimitsState().sessionBodyReceivedAtMs;
}
//@ chunk-55ht3bcx.js:11438-11517 placement
function setSessionCacheAsPriorEvidence(e) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.sessionFromServerFetch = false;
  policyLimitsState.replaceSessionCache(e);
}
//@ chunk-55ht3bcx.js:11517-11562 placement
function noteSessionVerdictEnvBearer(verdictEnvBearerDigest) {
  getPolicyLimitsState().verdictEnvBearerDigest = verdictEnvBearerDigest;
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
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.sessionFromServerFetch = false;
  policyLimitsState.sessionBodyReceivedAtMs = null;
  policyLimitsState.replaceSessionCache(EMPTY_POLICY_RESPONSE, true);
}
//@ chunk-55ht3bcx.js:11892-12313 placement
function installDiskDerivedVerdict(e) {
  let policyLimitsState = getPolicyLimitsState();
  let r = policyLimitsState.sessionCache !== null;
  if (!r) {
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
  policyLimitsState.replaceSessionCache(e, false, r);
}
//@ chunk-55ht3bcx.js:12313-12344 placement
function latchComplianceTaintsBustingBetas(complianceTaints) {
  if (latchComplianceTaints(complianceTaints)) clearBetasCaches();
}
//@ chunk-55ht3bcx.js:12344-12731 placement
function setLastFetchOutcome(e, n, r = true) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.lastFetchOutcome = e;
  if (e === null || e.success) policyLimitsState.settledWithoutVerdictFor = null;
  else if (!e.retrying && (r || !isTransientFetchFailure(e))) {
    let l =
      e.errorCode === "network_error" ||
      e.errorCode === "timeout" ||
      (e.errorCode === "request_failed" &&
        e.httpStatus !== null &&
        (e.httpStatus === 404 || e.httpStatus >= 500));
    policyLimitsState.settledWithoutVerdictFor = l ? (n ?? getPolicyPrincipalIdentity() ?? "") : null;
  }
  policyLimitsState.cacheRevision++;
  policyLimitsState.emitVerdictChanged();
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
  getPolicyLimitsState().storageV5 = undefined;
}
//@ chunk-55ht3bcx.js:13001-13042 placement
function isPolicyCacheMemoryOnly() {
  return getPolicyLimitsTunnelSocket() !== undefined || isDiskless();
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
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.diskAdoptionSuppressed = true;
  policyLimitsState.diskAdoptionEpoch++;
}
//@ chunk-55ht3bcx.js:13247-13291 placement
function getDiskAdoptionEpoch() {
  return getPolicyLimitsState().diskAdoptionEpoch;
}
//@ chunk-55ht3bcx.js:13291-13336 placement
function liftDiskAdoptionSuppression() {
  getPolicyLimitsState().diskAdoptionSuppressed = false;
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
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.machinePinsSignIn !== undefined) return policyLimitsState.machinePinsSignIn;
  let n = machineAdminMayPinSignInOrg();
  if (hasMdmResult()) policyLimitsState.machinePinsSignIn = n;
  return n;
}
//@ chunk-55ht3bcx.js:13767-13811 placement
function _resetMachinePinsSignInForTesting() {
  getPolicyLimitsState().machinePinsSignIn = undefined;
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
//@ chunk-55ht3bcx.js:14027-14062 placement
/**
 * 策略限制（organization policy limits）是否适用：只对第一方 API、官方 base URL、带 user:inference 范围的 Claude.ai OAuth 的 team/enterprise 订阅适用；API key 用户直接适用。返回不适用原因或 undefined。
 */
function isPolicyLimitsEligible() {
  return getPolicyLimitsIneligibleReason() === undefined;
}
//@ chunk-55ht3bcx.js:14062-14490 placement = isPolicyLimitsEligible (0.63)
function getPolicyLimitsIneligibleReason(e = {}) {
  let credentialIndependentIneligibleReason = getCredentialIndependentIneligibleReason(e);
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
//@ chunk-55ht3bcx.js:14490-14973 placement
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
  let r;
  try {
    r = parseCachedResponse(readFileSync(getCachePath(), "utf-8"));
  } catch {
    return null;
  }
  if (r === null) return null;
  try {
    return admitCachedResponse(r, settleStampRead(policyCacheStampForAdmission));
  } catch (error) {
    logForDebugging(`Policy limits: cache admission failed (${errorMessage(error)}); cold start`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-55ht3bcx.js:14973-16292 placement
function admitCachedResponse(e, n) {
  let policyLimitsState = getPolicyLimitsState();
  if (isTwinklingGlobeOn()) {
    policyLimitsState.lastStampVerdict = "disabled";
    policyLimitsState.lastStampMatchedIdentity = null;
    policyLimitsState.diskConfirmedAtMs = null;
    policyLimitsState.diskRefusedAtMs = null;
    return applyStoredCopyTrust(e, undefined);
  }
  let checksum = computeChecksum(serverBodyOf(e));
  applyStampReadToState(n);
  if (n.kind === "absent") {
    policyLimitsState.lastStampVerdict = "legacy";
    policyLimitsState.lastStampMatchedIdentity = null;
    policyLimitsState.diskBodyChecksum = checksum;
    policyLimitsState.diskConfirmedAtMs = null;
    policyLimitsState.diskRefusedAtMs = null;
    return applyStoredCopyTrust(e, checksum);
  }
  let stamp = n.kind === "ok" ? n.stamp : null;
  let policyPrincipal = getPolicyPrincipal();
  let c = policyPrincipal === null ? "" : identityDigestOfDescriptor(policyPrincipal);
  let y = matchCacheStamp(stamp, c, checksum);
  switch (((policyLimitsState.lastStampMatchedIdentity = null), y.kind)) {
    case "match":
      policyLimitsState.lastStampVerdict = "match";
      policyLimitsState.lastStampMatchedIdentity = c;
      policyLimitsState.diskBodyChecksum = checksum;
      policyLimitsState.diskConfirmedAtMs = y.stamp.confirmed_at;
      policyLimitsState.diskRefusedAtMs = null;
      let h = applyStoredCopyTrust(e, checksum);
      if (h !== null) policyLimitsState.dropHintedTaints();
      return h;
    case "unstamped":
      policyLimitsState.lastStampVerdict = "torn";
      policyLimitsState.diskBodyChecksum = null;
      policyLimitsState.diskConfirmedAtMs = null;
      policyLimitsState.diskRefusedAtMs = Date.now();
      policyLimitsState.hintFromRefusedBody(e);
      logForDebugging(
        "Policy limits: the cache stamp does not vouch for the cached body; cold start (its compliance taints and explicit denials still deny)",
      );
      return null;
    case "foreign":
      policyLimitsState.lastStampVerdict = "foreign";
      policyLimitsState.diskBodyChecksum = null;
      policyLimitsState.diskConfirmedAtMs = null;
      policyLimitsState.diskRefusedAtMs = Date.now();
      policyLimitsState.hintFromRefusedBody(e);
      logForDebugging(
        "Policy limits: the cache was written under another credential's identity; cold start (its compliance taints and explicit denials still deny until this credential's verdict lands)",
      );
      return null;
  }
}
//@ chunk-55ht3bcx.js:16292-17106 placement
/**
 * 判定策略缓存副本是否可信（组织固定）。
 */
function applyStoredCopyTrust(e, checksum) {
  let policyLimitsState = getPolicyLimitsState();
  if (!isSettingsGateSettled()) {
    policyLimitsState.storedCopyTrust = "not_asked";
    return e;
  }
  let s;
  let l;
  try {
    l = {
      orgs: describeMdmSettingsState(),
    };
  } catch (error) {
    logForDebugging(`Policy limits: the admin organization pin is not known: ${errorMessage(error)}`);
    l = undefined;
  }
  if (l === undefined) s = "org_pin_unknown";
  else
    try {
      let f = verifySignedCache({
        kind: "policy-limits",
        cachePath: getCachePath(),
        body: serverBodyOf(e),
        bodySha: checksum ?? computeChecksum(serverBodyOf(e)),
        account: getStoredOauthAccountInfo(),
        pinnedOrgs: l.orgs,
        nowMs: Date.now(),
        roots: isSecDefaultPluginEnabled(),
      });
      if (f.trusted) {
        policyLimitsState.storedCopyTrust = f;
        return e;
      }
      s = f.reason;
    } catch (error) {
      logForDebugging(`Policy limits: the gate on a stored copy failed: ${errorMessage(error)}`, {
        level: "error",
      });
      s = "error";
    }
  policyLimitsState.storedCopyTrust = {
    trusted: false,
    reason: s,
  };
  policyLimitsState.diskBodyChecksum = null;
  policyLimitsState.diskConfirmedAtMs = null;
  policyLimitsState.diskRefusedAtMs = Date.now();
  policyLimitsState.hintFromRefusedBody(e);
  logForDebugging(
    `Policy limits: the stored copy is not trusted at rest (${s}); cold start (its compliance taints and explicit denials still deny)`,
  );
  return null;
}
//@ chunk-55ht3bcx.js:17106-19084 placement
function getPolicyPrincipal() {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.principalRung = "none";
  if (getPolicyLimitsTunnelSocket() !== undefined) {
    policyLimitsState.principalRung = "tunnel";
    return null;
  }
  let n = null;
  let r = "none";
  try {
    ({ key: n, source: r } = getAnthropicApiKeyWithSource());
  } catch {}
  if (!n && shouldUseWIFAuth()) {
    policyLimitsState.principalRung = "wif";
    if (policyLimitsState.wifAccountDiverged) return null;
    let wifPrecedenceSource = getWIFPrecedenceSource();
    let ANTHROPIC_PROFILE = env.ANTHROPIC_PROFILE;
    let f;
    try {
      f =
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
      policyLimitsState.wifRecordedOrg = f.toLowerCase() || null;
    else if (policyLimitsState.wifRecordedOrg !== (f.toLowerCase() || null)) {
      logForDebugging(
        "Policy limits: the WIF source now records a different organization than the one this process derived its principal from; its policy verdicts are session-only until restart",
      );
      policyLimitsState.wifAccountDiverged = true;
      return null;
    }
    if (!f) return null;
    let c = wifPrecedenceSource === "env-quad" ? null : resolveConfigDir();
    let y =
      wifPrecedenceSource === "env-quad"
        ? federationProfileKey("env-quad")
        : ANTHROPIC_PROFILE
          ? principalPathKey(c, ANTHROPIC_PROFILE)
          : undefined;
    if (
      (wifPrecedenceSource === "profile-implicit" &&
        ANTHROPIC_PROFILE !== undefined &&
        ANTHROPIC_PROFILE !== policyLimitsState.wifRecordProfile) ||
      (wifPrecedenceSource === "profile-explicit" &&
        (ANTHROPIC_PROFILE === undefined || ANTHROPIC_PROFILE !== policyLimitsState.wifRecordProfile)) ||
      (y !== undefined && y !== policyLimitsState.wifSourceLocation) ||
      (y === undefined &&
        wifPrecedenceSource !== "env-quad" &&
        policyLimitsState.wifSourceLocation !== undefined &&
        (c === null
          ? policyLimitsState.wifSourceLocation !== ""
          : !policyLimitsState.wifSourceLocation.startsWith(principalPathKey(c, ""))))
    ) {
      logForDebugging(
        "Policy limits: the environment now selects a different WIF source than the one this process derived its principal from; its policy verdicts are session-only until restart",
      );
      policyLimitsState.wifAccountDiverged = true;
      return null;
    }
    let h = normalizeUuidOrNull(f);
    if (h) return shortArtifactIdPrincipal(h);
    return {
      kind: "wif",
      descriptor: `wif:${tokenDigest([policyLimitsState.wifSourceLocation, f.toLowerCase()].join("\x00"))}`,
    };
  }
  if (isClaudeAISubscriber()) {
    let accessToken = getClaudeAIOAuthTokens()?.accessToken;
    if (accessToken) {
      policyLimitsState.principalRung = "oauth";
      return policyCacheKey(accessToken);
    }
  }
  if (r === "apiKeyHelper") {
    policyLimitsState.principalRung = "helper";
    return null;
  }
  if (n) {
    policyLimitsState.principalRung = "key";
    return {
      kind: "key",
      descriptor: `key:${tokenDigest(n)}`,
    };
  }
  return null;
}
//@ chunk-55ht3bcx.js:19084-20142 placement
function noteWifAccountAtWire() {
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.wifAccountDiverged || getAnthropicApiKeySafe() || !shouldUseWIFAuth()) return;
  let n;
  try {
    n =
      policyLimitsState.wifSourceLocation !== undefined &&
      federationProfileKey(getWIFPrecedenceSource()) !== policyLimitsState.wifSourceLocation;
  } catch (error) {
    logForDebugging(
      `Policy limits: WIF profile selection unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
    );
    policyLimitsState.wifAccountDiverged = true;
    return;
  }
  if (n) {
    policyLimitsState.wifAccountDiverged = true;
    logForDebugging(
      "Policy limits: the active WIF source moved since this process derived its principal; its policy verdicts are session-only until restart",
    );
    return;
  }
  let r;
  try {
    if (getWIFPrecedenceSource() === "env-quad")
      r = env.ANTHROPIC_ORGANIZATION_ID?.trim().toLowerCase() || null;
    else {
      clearWIFAccountInfoCache();
      r = getWIFAccountInfo()?.organizationUuid?.trim().toLowerCase() ?? null;
    }
  } catch (error) {
    logForDebugging(
      `Policy limits: WIF account record unreadable (${errorMessage(error)}); its policy verdicts are session-only until restart`,
    );
    policyLimitsState.wifAccountDiverged = true;
    return;
  }
  if (policyLimitsState.wifRecordedOrg === undefined) policyLimitsState.wifRecordedOrg = r;
  else if (policyLimitsState.wifRecordedOrg !== r) {
    policyLimitsState.wifAccountDiverged = true;
    logForDebugging(
      "Policy limits: the WIF profile now records a different organization than the one this process derived its principal from; its policy verdicts are session-only until restart",
    );
  }
}
//@ chunk-55ht3bcx.js:20142-20472 placement
function compareWifAccountOnDisk() {
  let policyLimitsState = getPolicyLimitsState();
  try {
    if (getAnthropicApiKeySafe() || !shouldUseWIFAuth() || getWIFPrecedenceSource() === "env-quad")
      return "not_in_use";
    let configDir = resolveConfigDir();
    let r =
      configDir === null
        ? undefined
        : readWIFAccountInfo(
            configDir,
            policyLimitsState.wifRecordProfile ?? resolveLiveProfileName(configDir),
          );
    if (r === undefined) return "unreadable";
    let s = normalizedOrgUuid(getWIFAccountInfo());
    let l = policyLimitsState.wifRecordedOrg === undefined ? s : policyLimitsState.wifRecordedOrg;
    if (normalizedOrgUuid(r) !== l) return "moved";
    return s === l ? "same" : "memory_differs";
  } catch {
    return "unreadable";
  }
}
//@ chunk-55ht3bcx.js:20472-20574 placement
function normalizedOrgUuid(e) {
  let organizationUuid = e?.organizationUuid;
  return typeof organizationUuid === "string" ? organizationUuid.trim().toLowerCase() || null : null;
}
//@ chunk-55ht3bcx.js:20574-20900 placement
async function noteStoredLoginAccountAtWire(e, n) {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) return;
  let policyLimitsState = getPolicyLimitsState();
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(n);
  if (claudeAIOAuthTokenOrigin !== "store") {
    if (claudeAIOAuthTokenOrigin !== "none")
      policyLimitsState.storedLoginNotedTokenDigest = tokenDigest(accessToken);
    return;
  }
  let storedLoginOrganizationAfresh = await readStoredLoginOrganizationAfresh(e);
  let accessToken_2 = getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken_2) return;
  policyLimitsState.storedLoginNotedTokenDigest = tokenDigest(accessToken_2);
  policyLimitsState.storedLoginAccountAtWire = {
    tokenDigest: tokenDigest(accessToken_2),
    organizationUuid: accessToken_2 === accessToken ? storedLoginOrganizationAfresh : null,
  };
}
//@ chunk-55ht3bcx.js:20900-21144 placement
function storedLoginAccountNeedsRead() {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) return false;
  let policyLimitsState = getPolicyLimitsState();
  let r = tokenDigest(accessToken);
  if (policyLimitsState.storedLoginNotedTokenDigest !== r) return true;
  let storedLoginAccountAtWire = policyLimitsState.storedLoginAccountAtWire;
  return (
    storedLoginAccountAtWire !== null &&
    storedLoginAccountAtWire.tokenDigest === r &&
    storedLoginAccountAtWire.organizationUuid !==
      (normalizeUuidOrNull(getStoredOauthAccountInfo()?.organizationUuid) ?? null)
  );
}
//@ chunk-55ht3bcx.js:21144-22225 placement
/**
 * 策略缓存键（令牌、组织、登录账号）。
 */
function policyCacheKey(accessToken) {
  let policyLimitsState = getPolicyLimitsState();
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let s = normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID);
  let l = tokenDigest(accessToken);
  let storedLoginAccountAtWire = policyLimitsState.storedLoginAccountAtWire;
  let organizationUuid =
    storedLoginAccountAtWire !== null && storedLoginAccountAtWire.tokenDigest === l
      ? storedLoginAccountAtWire.organizationUuid
      : undefined;
  let joined = [
    l,
    s ?? "",
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
  let m = {
    kind: "token",
    descriptor: `token:${l}`,
  };
  let daemonSnapshotWorker = false;
  let claudeAIOAuthTokenOrigin = getClaudeAIOAuthTokenOrigin();
  switch (claudeAIOAuthTokenOrigin) {
    case "store": {
      let S = normalizeUuidOrNull(storedOauthAccountInfo?.organizationUuid) ?? null;
      if (organizationUuid !== undefined && organizationUuid !== S)
        m = {
          kind: "token",
          descriptor: `token:${l}`,
          unclassified: true,
        };
      else if (S) m = shortArtifactIdPrincipal(S);
      else
        m = {
          kind: "token",
          descriptor: `token:${l}`,
          storedLoginOrgless: true,
        };
      break;
    }
    case "env":
    case "fd":
      if (claudeAIOAuthTokenOrigin === "fd" && isOauthTokenFromBgSnapshot() && !isHostManagedProviderAuth()) {
        let S = normalizeUuidOrNull(getOauthOrgFromBgSnapshot());
        let Ce = normalizeUuidOrNull(storedOauthAccountInfo?.organizationUuid);
        m =
          S !== null && S.toLowerCase() === Ce?.toLowerCase()
            ? {
                ...shortArtifactIdPrincipal(S),
                admitsOnly: true,
              }
            : null;
        daemonSnapshotWorker = true;
      } else if (s)
        m = {
          ...shortArtifactIdPrincipal(s),
          bearerDigest: l,
        };
      break;
    case "none":
      m = {
        kind: "token",
        descriptor: `token:${l}`,
        unclassified: true,
      };
      break;
  }
  policyLimitsState.oauthPrincipalMemo = {
    key: joined,
    principal: m,
    daemonSnapshotWorker,
    expiresAtMs:
      claudeAIOAuthTokenOrigin === "none" || m === null ? Date.now() + UNCLASSIFIED_ORIGIN_MEMO_MS : null,
  };
  return m;
}
//@ chunk-55ht3bcx.js:22225-22294 placement
/**
 * 由短 artifact id 得到策略主体（不可用时返回 null）。
 */
function shortArtifactIdPrincipal(e) {
  return {
    kind: "org",
    descriptor: `org:${e.toLowerCase()}`,
  };
}
//@ chunk-55ht3bcx.js:22294-22629 placement
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
  ABSENT_STAMP,
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

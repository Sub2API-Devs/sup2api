/**
 * services/policyLimits/policyEvidence.ts
 *
 * 2.1.316 新增：是否需要重新读取策略证据（bearer 变化）；策略主体身份键（wif、helper、令牌）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-55ht3bcx.js (79)
 * attribution: placement 79
 */
import { resolve } from "path";
import {
  getPolicyLimitsState,
  getPolicyPrincipal,
  isPolicyCacheMemoryOnly,
  ABSENT_STAMP,
  getCachePath,
  installDiskDerivedVerdict,
  isPolicyLimitsEligible,
  envBearerVerdictOnWire,
  storedLoginAccountNeedsRead,
  getPolicyLimitsTunnelSocket,
  getCredentialIndependentIneligibleReason,
  isAnthropicHosted,
  isSignInPinnedByMachine,
  loadCachedResponse,
} from "./policyState.js";
import {
  identityDigestOfDescriptor,
  isIoUnusableStamp,
  stampToHipaaEvidence,
  readPolicyStampSync,
  tokenDigest,
} from "./cacheStamp.js";
import { cacheTrustLabel, trustedPrincipal } from "../../utils/settings/policyCertificates.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { safeParseJSON } from "../../utils/json.js";
import {
  PolicyLimitsResponseSchema,
  getLatchedTaints,
  getCurrentTaints,
  hipaaTaintsOnly,
  getComplianceTaints,
} from "./complianceTaints.js";
import {
  isValidatedCloverOn,
  isHashedLarkOn,
  isSteadySunbeamOn,
  isGateAOn,
  isTranquilCrescentOn,
} from "../../utils/settings/settingsSourceTrust.js";
import {
  isClaudeAISubscriber,
  effectiveAuthTokenEnv,
  getClaudeAIOAuthTokens,
  getAnthropicApiKeyWithSource,
  isAnthropicAuthEnabled,
  getConfiguredApiKeyHelper,
  getClaudeAIOAuthTokenOrigin,
  getAnthropicApiKeyWithSourceSafe,
  shouldUseWIFAuth,
} from "../../utils/auth.js";
import { currentAccessTokenHash } from "../../entrypoints/sdk/coreSchemas.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isFeedbackSurveyForOtel } from "../../utils/hostEnvironment.js";
import { registerPolicyVerdict, UNREADABLE_PRINCIPAL } from "./policyVerdicts.js";
import {
  getWIFFederationIdentity,
  resolveConfigDir,
  resolveLiveProfileName,
} from "../../utils/wifProfile.js";
import { hasInferenceScope } from "../../constants/system.js";
import {
  policy404Message,
  policyUnverifiedMessage,
  policyBlockedMessage,
  formatPolicyDisabledMessage,
  policyEndpoint404Hint,
  couldNotVerifyPolicyHint,
  sessionRestartRequiredMessage,
  policyDisabledMessageFor,
} from "./policyMessages.js";
import { hasCustomApiKeyHeader, hasCustomAuthorizationHeader } from "../api/customHeaders.js";
import { isActualFirstPartyAnthropicBaseUrl, getAPIProvider } from "../../utils/model/providers.js";
import { env } from "../../utils/env.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "../../constants/oauth.js";
import { isBareMode } from "../../utils/envUtils.js";

//@ chunk-55ht3bcx.js:22780-23028 placement
function markSessionVerdictUnattributed() {
  let policyLimitsState = getPolicyLimitsState();
  let n = !policyLimitsState.sessionVerdictDisowned;
  policyLimitsState.sessionAttributed = false;
  policyLimitsState.attributedBearerDigest = null;
  policyLimitsState.attributedPrincipalIdentity = null;
  policyLimitsState.sessionVerdictDisowned = true;
  policyLimitsState.evidenceRereadForBearer = undefined;
  if (n) {
    policyLimitsState.cacheRevision++;
    policyLimitsState.emitVerdictChanged();
  }
}
//@ chunk-55ht3bcx.js:23028-23082 placement
function getPolicyPrincipalIdentity() {
  let policyPrincipal = getPolicyPrincipal();
  return policyPrincipal === null ? null : identityDigestOfDescriptor(policyPrincipal);
}
//@ chunk-55ht3bcx.js:23082-23155 placement
function getPolicyStoredCopyTrust() {
  let storedCopyTrust = getPolicyLimitsState().storedCopyTrust;
  return storedCopyTrust === "not_asked" ? storedCopyTrust : cacheTrustLabel(storedCopyTrust);
}
//@ chunk-55ht3bcx.js:23155-23202 placement
function getPolicyStoredCopyTrustedPrincipal() {
  return trustedPrincipal(getPolicyLimitsState().storedCopyTrust);
}
//@ chunk-55ht3bcx.js:23202-23245 placement
function getLastPolicyCacheStampVerdict() {
  return getPolicyLimitsState().lastStampVerdict;
}
//@ chunk-55ht3bcx.js:23245-23296 placement
function getLastPolicyCacheStampMatchedIdentity() {
  return getPolicyLimitsState().lastStampMatchedIdentity;
}
//@ chunk-55ht3bcx.js:23296-23378 placement
function getHipaaEvidence() {
  let policyLimitsState = getPolicyLimitsState();
  if (!policyLimitsState.hipaaEvidenceLoaded) applyStampReadToState(currentPolicyStampOrMemoryFallback());
  return policyLimitsState.hipaaEvidence;
}
//@ chunk-55ht3bcx.js:23378-23540 placement
function applyStampReadToState(e) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.hipaaEvidenceLoaded = !isIoUnusableStamp(e);
  if (e.kind === "ok") policyLimitsState.hipaaEvidence = stampToHipaaEvidence(e.stamp);
  else if (e.kind === "unusable" && !isIoUnusableStamp(e)) policyLimitsState.hipaaSeenUnreadable = true;
}
//@ chunk-55ht3bcx.js:23540-23578 placement
/**
 * 内存模式下用内存戳，否则同步读取磁盘缓存戳。
 */
function currentPolicyStampOrMemoryFallback() {
  return isPolicyCacheMemoryOnly() ? ABSENT_STAMP : readPolicyStampSync(getCachePath());
}
//@ chunk-55ht3bcx.js:23578-23618 placement
function getHeldHipaaEvidence() {
  return getPolicyLimitsState().hipaaEvidence;
}
//@ chunk-55ht3bcx.js:23618-24246 placement
function hasHipaaEvidenceForPrincipal() {
  let e;
  try {
    e = getPolicyPrincipal();
  } catch (error) {
    logForDebugging(
      `Policy limits: principal unreadable for the evidence tier (${errorMessage(error)}); judged on the machine's evidence`,
      {
        level: "error",
      },
    );
    e = {
      kind: "token",
      descriptor: "token:unreadable",
      unclassified: true,
    };
  }
  if (e === null || e.admitsOnly === true) {
    let oauthPrincipalMemo = getPolicyLimitsState().oauthPrincipalMemo;
    if (e === null && (!oauthPrincipalMemo?.daemonSnapshotWorker || oauthPrincipalMemo.principal !== null))
      return false;
    let hipaaEvidence = getHipaaEvidence();
    return hipaaEvidence.seen.length > 0 || hipaaEvidence.incomplete;
  }
  let hipaaEvidence = getHipaaEvidence();
  if (isUnattributablePrincipal(e)) {
    let s =
      e.storedLoginOrgless === true &&
      e.unclassified !== true &&
      hipaaEvidence.ruledOut.includes(identityDigestOfDescriptor(e));
    return hipaaEvidence.seen.length > 0 || (hipaaEvidence.incomplete && !s);
  }
  let r = identityDigestOfDescriptor(e);
  return hipaaEvidence.seen.includes(r) || (hipaaEvidence.incomplete && !hipaaEvidence.ruledOut.includes(r));
}
//@ chunk-55ht3bcx.js:24246-24314 placement
/**
 * 判断策略主体是否无法归属（未分类或存储登录无组织）。
 */
function isUnattributablePrincipal(e) {
  return e.unclassified === true || e.storedLoginOrgless === true;
}
//@ chunk-55ht3bcx.js:24314-24453 placement
function recordPersistedPolicyCache(diskBodyChecksum, hipaaEvidence, diskConfirmedAtMs) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.diskBodyChecksum = diskBodyChecksum;
  policyLimitsState.diskConfirmedAtMs = diskConfirmedAtMs;
  policyLimitsState.hipaaEvidence = hipaaEvidence;
  policyLimitsState.hipaaEvidenceLoaded = true;
  policyLimitsState.diskRefusedAtMs = null;
}
//@ chunk-55ht3bcx.js:24453-24620 placement
function takeUpHipaaEvidenceLeftOnDisk(policyStamp) {
  let policyLimitsState = getPolicyLimitsState();
  let { hipaaEvidence, hipaaSeenUnreadable } = policyLimitsState;
  applyStampReadToState(policyStamp);
  if (
    hipaaSeenUnreadable !== policyLimitsState.hipaaSeenUnreadable ||
    !sameHipaaEvidence(hipaaEvidence, policyLimitsState.hipaaEvidence)
  ) {
    policyLimitsState.cacheRevision++;
    policyLimitsState.emitVerdictChanged();
  }
}
//@ chunk-55ht3bcx.js:24620-24822 placement
function sameHipaaEvidence(hipaaEvidence, hipaaEvidence_2) {
  return (
    hipaaEvidence.incomplete === hipaaEvidence_2.incomplete &&
    hipaaEvidence.seen.length === hipaaEvidence_2.seen.length &&
    hipaaEvidence.seen.every((r, s) => r === hipaaEvidence_2.seen[s]) &&
    hipaaEvidence.ruledOut.length === hipaaEvidence_2.ruledOut.length &&
    hipaaEvidence.ruledOut.every((r, s) => r === hipaaEvidence_2.ruledOut[s])
  );
}
//@ chunk-55ht3bcx.js:24822-24865 placement
function getPersistedPolicyCacheChecksum() {
  return getPolicyLimitsState().diskBodyChecksum;
}
//@ chunk-55ht3bcx.js:24865-24909 placement
function getPersistedPolicyCacheConfirmedAt() {
  return getPolicyLimitsState().diskConfirmedAtMs;
}
//@ chunk-55ht3bcx.js:24909-25140 placement
function forgetPersistedPolicyCache() {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.diskBodyChecksum = null;
  policyLimitsState.diskConfirmedAtMs = null;
  policyLimitsState.diskRefusedAtMs = null;
  policyLimitsState.hipaaEvidenceLoaded = false;
  policyLimitsState.lastStampVerdict = "none";
  policyLimitsState.lastStampMatchedIdentity = null;
  policyLimitsState.storedCopyTrust = "not_asked";
  policyLimitsState.dropHintedTaints();
}
//@ chunk-55ht3bcx.js:25140-25205 placement
function parseCachedResponse(e) {
  let n = projectPolicyLimitsBody(safeParseJSON(e, false));
  return n.success ? n.data : null;
}
//@ chunk-55ht3bcx.js:25205-25224 placement
var weakMap = new WeakMap();
//@ chunk-55ht3bcx.js:25224-25303 placement
function projectPolicyLimitsBody(e) {
  let n = PolicyLimitsResponseSchema().safeParse(e);
  if (n.success) weakMap.set(n.data, e);
  return n;
}
//@ chunk-55ht3bcx.js:25303-25339 placement
function serverBodyOf(e) {
  return weakMap.get(e) ?? e;
}
//@ chunk-55ht3bcx.js:25339-25450 placement
function seedSessionCacheFromPrime(storageV5, n) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.storageV5 = storageV5;
  if (n !== null && policyLimitsState.sessionCache === null && !policyLimitsState.diskAdoptionSuppressed)
    installDiskDerivedVerdict(n);
}
//@ chunk-55ht3bcx.js:25450-30842 placement
var CLIENT_POLICY_KEYS = {
  allow_product_feedback: {
    deniedUnder: ["hipaa", "zdr"],
    serverPopulated: true,
    onCacheMiss: "deny",
    label: "Feedback",
    verb: "is",
    requirementId: "HIPAA-R1",
  },
  allow_web_fetch: {
    deniedUnder: ["hipaa"],
    serverPopulated: true,
    onCacheMiss: "allow",
    label: "Web fetch",
    verb: "is",
    requirementId: "HIPAA-R3",
  },
  allow_memory_sync: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "allow",
    label: "Memory sync",
    verb: "is",
    requirementId: "HIPAA-R5",
    hardBlockUnder: ["hipaa"],
  },
  allow_design_sync: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "allow",
    label: "Design sync",
    verb: "is",
    requirementId: "HIPAA-R9",
  },
  allow_channels: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    onFailOpenVerdict: "deny",
    label: "Channels",
    verb: "are",
    requirementId: "HIPAA-R71",
  },
  ...{},
  allow_projects_tool: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "hold",
    label: "Projects",
    verb: "are",
    requirementId: "HIPAA-R17",
    hardBlockUnder: ["hipaa"],
  },
  allow_claude_browser_extension: {
    deniedUnder: ["hipaa"],
    serverPopulated: true,
    onCacheMiss: "allow",
    label: "Claude in Chrome",
    verb: "is",
    requirementId: "HIPAA-R34",
  },
  allow_remote_sessions: {
    deniedUnder: ["hipaa"],
    serverPopulated: true,
    onCacheMiss: "deny",
    label: "Cloud sessions",
    verb: "are",
    requirementId: "HIPAA-R6",
  },
  allow_remote_control: {
    deniedUnder: ["hipaa"],
    serverPopulated: true,
    onCacheMiss: "deny",
    label: "Remote Control",
    verb: "is",
    requirementId: "HIPAA-R6",
  },
  allow_cobalt_plinth: {
    deniedUnder: ["hipaa", "zdr"],
    serverPopulated: true,
    onCacheMiss: "deny",
    label: "Artifacts",
    verb: "are",
    requirementId: "HIPAA-R16",
  },
  allow_team_onboarding: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "hold",
    label: "Team onboarding",
    verb: "is",
    requirementId: "HIPAA-R13",
    hardBlockUnder: ["hipaa"],
  },
  allow_error_reporting: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "deny",
    label: "Error reporting",
    verb: "is",
    requirementId: "HIPAA-R19",
  },
  allow_auto_mode_sibling_docs: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    label: "Repository lookups",
    verb: "are",
    requirementId: "HIPAA-R36",
  },
  allow_repo_visibility_probe: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "hold",
    label: "Repository visibility checks",
    verb: "are",
    requirementId: "HIPAA-R36",
  },
  allow_send_file: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "deny",
    label: "File upload",
    verb: "is",
    requirementId: "HIPAA-R37",
  },
  allow_drive_file_references: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    onFailOpenVerdict: "deny",
    label: "File references for connectors",
    verb: "are",
    requirementId: "HIPAA-R87",
  },
  allow_heap_dump: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "deny",
    label: "Heap dumps",
    verb: "are",
    requirementId: "HIPAA-R38",
  },
  allow_local_checkpoint_commit: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "deny",
    label: "Usage-limit checkpoints",
    verb: "are",
    requirementId: "HIPAA-R39",
  },
  allow_plugin_skill_search: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    label: "Plugin and skill search",
    verb: "is",
    requirementId: "HIPAA-R26",
  },
  allow_plugin_directory_search: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    onFailOpenVerdict: "deny",
    label: "The plugin directory",
    verb: "is",
    requirementId: "HIPAA-R35",
  },
  allow_connector_suggest: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    onFailOpenVerdict: "deny",
    label: "Connector suggestions",
    verb: "are",
    requirementId: "HIPAA-R43",
  },
  ...{
    allow_mcp_task_worker_wake: {
      deniedUnder: ["hipaa"],
      onCacheMiss: "deny",
      label: "Restarting a worker for a background task",
      verb: "is",
      requirementId: "HIPAA-R57",
    },
  },
  allow_plugin_publish: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    onFailOpenVerdict: "deny",
    label: "Publishing a plugin from Claude Code",
    verb: "is",
    requirementId: "HIPAA-R72",
  },
  ...{},
  allow_account_skills_sync: {
    deniedUnder: ["hipaa"],
    serverPopulated: true,
    onCacheMiss: "deny",
    label: "Account skills sync",
    verb: "is",
    requirementId: "HIPAA-R29",
  },
  allow_account_plugins_sync: {
    deniedUnder: ["hipaa"],
    serverPopulated: true,
    onCacheMiss: "deny",
    label: "Account plugins sync",
    verb: "is",
    requirementId: "HIPAA-R30",
  },
  allow_bundled_skills: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "allow",
    label: "Bundled skills",
    verb: "are",
    requirementId: "HIPAA-R56",
  },
  allow_mycelium: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "deny",
    label: "Peer messaging",
    verb: "is",
    requirementId: "HIPAA-R25",
    hardBlockUnder: ["hipaa"],
  },
  ...{},
  allow_usage_transcript_scan: {
    deniedUnder: ["hipaa"],
    transcriptScan: true,
    onCacheMiss: "deny",
    label: "Usage patterns",
    verb: "are",
    requirementId: "HIPAA-R31",
  },
  allow_skill_doctor_transcript_scan: {
    deniedUnder: ["hipaa"],
    transcriptScan: true,
    onCacheMiss: "deny",
    label: "Skill token counts",
    verb: "are",
    requirementId: "HIPAA-R32",
  },
  allow_insights: {
    deniedUnder: ["hipaa"],
    transcriptScan: true,
    onCacheMiss: "deny",
    label: "Insights",
    verb: "are",
    requirementId: "HIPAA-R40",
  },
  allow_stats_transcript_scan: {
    deniedUnder: ["hipaa"],
    transcriptScan: true,
    onCacheMiss: "deny",
    label: "Usage stats",
    verb: "are",
    requirementId: "HIPAA-R42",
  },
  ...{},
  allow_model_catalog: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "allow",
    label: "The model catalog",
    verb: "is",
    requirementId: "HIPAA-R33",
  },
  allow_container_result_files: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "deny",
    label: "Saving large tool results in the tool container",
    verb: "is",
    requirementId: "HIPAA-R53",
  },
  allow_promo_offers: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    label: "Promotional offers",
    verb: "are",
    requirementId: "HIPAA-R54",
  },
  allow_previous_conversation_pointer: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    label: "Linking a new conversation to the one it replaces",
    verb: "is",
    requirementId: "HIPAA-R58",
  },
  allow_api_auth_warm: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    label: "Warming the API credential cache",
    verb: "is",
    requirementId: "HIPAA-R59",
  },
  allow_cache_keepalive: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    label: "Renewing the prompt cache lifetime",
    verb: "is",
    requirementId: "HIPAA-R65",
  },
};
//@ chunk-55ht3bcx.js:30842-30886 placement
function isClientDerivedPolicyKey(e) {
  return Object.hasOwn(CLIENT_POLICY_KEYS, e);
}
//@ chunk-55ht3bcx.js:30886-30930 placement
function clientPolicyKeySpec(e) {
  return isClientDerivedPolicyKey(e) ? CLIENT_POLICY_KEYS[e] : undefined;
}
//@ chunk-55ht3bcx.js:30930-30956 placement
var HIPAA_TAINTS_2 = new Set(["hipaa"]);
//@ chunk-55ht3bcx.js:30956-31016 placement
function isServerPopulatedPolicyKey(e) {
  return clientPolicyKeySpec(e)?.serverPopulated === true && !isValidatedCloverOn();
}
//@ chunk-55ht3bcx.js:31016-31075 placement
function isUnblockedTranscriptScanKey(e) {
  return clientPolicyKeySpec(e)?.transcriptScan === true && !isHashedLarkOn();
}
//@ chunk-55ht3bcx.js:31075-31124 placement
/**
 * 取所有客户端派生且需要处理的策略键。
 */
function clientPolicyKeys() {
  return Object.keys(CLIENT_POLICY_KEYS).filter(isClientDerivedPolicyKey);
}
//@ chunk-55ht3bcx.js:31124-31205 placement
function policyKeyLabel(policy) {
  let n = clientPolicyKeySpec(policy);
  return {
    featureLabel: n?.label ?? policy,
    verb: n?.verb ?? "is",
  };
}
//@ chunk-55ht3bcx.js:31205-31638 placement
/**
 * 策略证据计算中豁免与需要专门处理的字段集合。
 */
var TAINT_DISABLED_POLICIES = clientPolicyKeys().flatMap((e) =>
  (clientPolicyKeySpec(e)?.deniedUnder ?? []).map((n) => [n, e]),
);
var TAINT_HARD_BLOCKED_POLICIES = clientPolicyKeys().flatMap((e) =>
  (clientPolicyKeySpec(e)?.hardBlockUnder ?? []).map((n) => [n, e]),
);
var FAIL_CLOSED_ON_MISS = new Set(
  clientPolicyKeys().filter((e) => clientPolicyKeySpec(e)?.onCacheMiss !== "allow"),
);
var RELEASED_ON_SETTLED_MISS = new Set(
  clientPolicyKeys().filter((e) => clientPolicyKeySpec(e)?.onCacheMiss === "hold"),
);
var DENIED_ON_FAIL_OPEN_VERDICT = new Set(
  clientPolicyKeys().filter((e) => clientPolicyKeySpec(e)?.onFailOpenVerdict === "deny"),
);
var FEEDBACK_TAINT_EXEMPT_KEYS = new Set(["allow_product_feedback"]);
var WEB_FETCH_AND_DESIGN_KEYS = new Set(["allow_web_fetch", "allow_design_sync", "allow_channels", ...[]]);
//@ chunk-55ht3bcx.js:31638-31683 placement
function isClientOnlyEgressKeyWithheld(e) {
  let n = shouldRereadEvidence(e);
  return isWithheldFromUnverifiedClaudeAiLogin(e) || n;
}
//@ chunk-55ht3bcx.js:31683-31993 placement
function isWithheldFromUnverifiedClaudeAiLogin(e) {
  if (!WEB_FETCH_AND_DESIGN_KEYS.has(e) || isSteadySunbeamOn() || !isPolicyLimitsEligible()) return false;
  let policyLimitsState = getPolicyLimitsState();
  if (
    policyLimitsState.sessionCache !== null &&
    !policyLimitsState.failOpenVerdict &&
    !policyLimitsState.sessionVerdictDisowned
  )
    return false;
  let r;
  try {
    getPolicyPrincipal();
    r = policyLimitsState.principalRung;
  } catch {
    return true;
  }
  if (r === "wif" && isClaudeAISubscriber()) return true;
  if (r === "none" && effectiveAuthTokenEnv() !== undefined && isGateAOn()) return false;
  return r === "oauth" || r === "tunnel" || r === "none";
}
//@ chunk-55ht3bcx.js:31993-32326 placement
/**
 * 是否需要重新读取策略证据（bearer 变化）。
 */
function shouldRereadEvidence(e) {
  if (!WEB_FETCH_AND_DESIGN_KEYS.has(e) || !isPolicyLimitsEligible() || isTranquilCrescentOn()) return false;
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.sessionCache !== null && policyLimitsState.sessionAttributed) {
    let r = currentAccessTokenHash();
    if (r !== null && r === policyLimitsState.attributedBearerDigest) return false;
    if (policyLimitsState.evidenceRereadForBearer !== r) {
      policyLimitsState.evidenceRereadForBearer = r;
      policyLimitsState.hipaaEvidenceLoaded = false;
    }
    let hipaaEvidence = getHipaaEvidence();
    if ((hipaaEvidence.seen.length === 0 && !hipaaEvidence.incomplete) || !isCurrentPrincipalUnattributable())
      return false;
  }
  return hasHipaaEvidenceForPrincipal();
}
//@ chunk-55ht3bcx.js:32326-32393 placement
/**
 * 当前策略主体是否无法归属（异常时保守为真）。
 */
function isCurrentPrincipalUnattributable() {
  try {
    let policyPrincipal = getPolicyPrincipal();
    return policyPrincipal !== null && isUnattributablePrincipal(policyPrincipal);
  } catch {
    return true;
  }
}
//@ chunk-55ht3bcx.js:32393-33022 placement
function isPolicyAllowed(e) {
  let responseFromCache = getResponseFromCache();
  if (isUnblockedTranscriptScanKey(e)) {
    let r = responseFromCache?.restrictions[e];
    if (r) return r.allowed;
    return !(isPolicyLimitsEligible() && getPolicyLimitsState().hintedDeniedKeys.includes(e));
  }
  if (!responseFromCache) {
    if (FAIL_CLOSED_ON_MISS.has(e)) {
      if (
        isPolicyLimitsEligible() &&
        !(RELEASED_ON_SETTLED_MISS.has(e) && isPolicyVerdictUnobtainable() && !isPrincipalSeenUnderHipaa())
      )
        return false;
      if (
        FEEDBACK_TAINT_EXEMPT_KEYS.has(e) &&
        isEssentialTrafficOnly() &&
        !(e === "allow_product_feedback" && isFeedbackSurveyForOtel())
      )
        return false;
    }
    if (isDisabledByTaint(e, getLatchedTaints())) return false;
    if (isClientOnlyEgressKeyWithheld(e)) return false;
    let policyLimitsState = getPolicyLimitsState();
    if (policyLimitsState.hintedDeniedKeys.length === 0 && policyLimitsState.hintedTaints.length === 0)
      return true;
    if (!isPolicyLimitsEligible()) return true;
    if (policyLimitsState.hintedDeniedKeys.includes(e)) return false;
    return isPolicyAllowedInResponse(
      {
        restrictions: {},
        compliance_taints: [],
      },
      e,
      policyLimitsState.hintedTaints,
    );
  }
  if (
    RELEASED_ON_SETTLED_MISS.has(e) &&
    isPolicyVerdictAbsent() &&
    !(isPolicyVerdictUnobtainable() && !isPrincipalSeenUnderHipaa())
  )
    return false;
  if (DENIED_ON_FAIL_OPEN_VERDICT.has(e) && isPolicyVerdictAbsent()) return false;
  if (isClientOnlyEgressKeyWithheld(e)) return false;
  return !isPolicyDeniedForKey(e, responseFromCache);
}
//@ chunk-55ht3bcx.js:33022-33295 placement
function isPolicyDeniedForKey(e, responseFromCache) {
  let policyLimitsState = getPolicyLimitsState();
  if (responseFromCache.restrictions[e] === undefined && policyLimitsState.hintedDeniedKeys.includes(e))
    return true;
  let sessionFromServerFetch = policyLimitsState.sessionFromServerFetch;
  return !isPolicyAllowedInResponse(
    {
      restrictions: responseFromCache.restrictions,
      compliance_taints: sessionFromServerFetch ? responseFromCache.compliance_taints : [],
    },
    e,
    [
      ...getLatchedTaints(),
      ...policyLimitsState.hintedTaints,
      ...(sessionFromServerFetch ? [] : responseFromCache.compliance_taints),
    ],
  );
}
//@ chunk-55ht3bcx.js:33295-33594 placement = PolicyLimitsResponseSchema (0.452)
function isPolicyAllowedInResponse(e, n, r = []) {
  let complianceTaints = e.compliance_taints;
  if (
    TAINT_HARD_BLOCKED_POLICIES.some(([c, y]) => y === n && (complianceTaints.includes(c) || r.includes(c)))
  )
    return false;
  let l = e.restrictions[n];
  if (l) return l.allowed;
  if (isUnblockedTranscriptScanKey(n)) return true;
  let f = isServerPopulatedPolicyKey(n)
    ? [
        ...r.filter((c) => !(HIPAA_TAINTS_2.has(c) && complianceTaints.includes(c))),
        ...complianceTaints.filter((complianceTaint) => !HIPAA_TAINTS_2.has(complianceTaint)),
      ]
    : [...r, ...complianceTaints];
  return !isDisabledByTaint(n, f);
}
//@ chunk-55ht3bcx.js:33594-33942 placement
function isUnrestrictiveBody(e) {
  if (
    e.compliance_taints.some((complianceTaint) =>
      TAINT_DISABLED_POLICIES.some(([r]) => r === complianceTaint),
    )
  )
    return false;
  if (
    Object.keys(e.defaults ?? {}).length > 0 ||
    (e.monitoring_notice !== null && e.monitoring_notice !== undefined) ||
    (e.artifact_create_notice !== null && e.artifact_create_notice !== undefined)
  )
    return false;
  return Object.entries(e.restrictions).every(([key, value]) =>
    isEnforcedPolicyKey(key) ? value?.allowed !== true : value?.allowed !== false,
  );
}
//@ chunk-55ht3bcx.js:33942-34014 placement
/**
 * 策略键是否属于强制/要求类（enforce_ / require_ 前缀）。
 */
function isEnforcedPolicyKey(e) {
  return e.startsWith("enforce_") || e.startsWith("require_");
}
//@ chunk-55ht3bcx.js:34014-34116 placement
function isDisabledByTaint(e, n) {
  if (n.length === 0) return false;
  for (let [r, s] of TAINT_DISABLED_POLICIES) if (s === e && n.includes(r)) return true;
  return false;
}
//@ chunk-55ht3bcx.js:34116-34566 placement
registerPolicyVerdict({
  isPolicyAllowed: (e) => isPolicyAllowed(e),
  commandPolicyGateAllows: (e) => commandPolicyGateAllows(e),
  policyDenyKind: (e) => policyDenyKind(e),
  policyDeniedReason: (e, n, r) => policyDeniedReason(e, n, r),
  complianceTaintsSettled: () => areComplianceTaintsSettled(),
  policyLimitsCacheLoaded: () => isPolicyLimitsCacheLoaded(),
  autoDefaultVerdictState: () => autoDefaultVerdictState(),
  policyVerdictAbsent: () => isPolicyVerdictAbsent(),
  sessionVerdictUnattributed: () => isSessionVerdictUnattributed(),
  rowPrincipalStamp: () => rowPrincipalStamp(),
  rowOfAnotherPrincipal: (e) => isRowOfAnotherPrincipal(e),
  principalSeenUnderHipaa: () => hasHipaaEvidenceForPrincipal(),
  coreSkills: () => getCoreSkillsFromCache(),
  rememberedCoreSkills: () => getRememberedCoreSkills(),
});
//@ chunk-55ht3bcx.js:34566-34683 placement
function autoDefaultVerdictState() {
  if (!isPolicyVerdictAbsent()) return "loaded";
  if (isPolicyVerdictUnobtainable())
    return isPrincipalHipaaSeen() ? "unobtainable_seen_hipaa" : "unobtainable";
  return "pending";
}
//@ chunk-55ht3bcx.js:34683-34791 placement
function isPrincipalHipaaSeen() {
  let e;
  try {
    e = getPolicyPrincipal();
  } catch {
    return false;
  }
  if (e === null || isUnattributablePrincipal(e)) return false;
  return getHipaaEvidence().seen.includes(identityDigestOfDescriptor(e));
}
//@ chunk-55ht3bcx.js:34791-34922 placement
function commandPolicyGateAllows(e) {
  if (!isClientDerivedPolicyKey(e)) {
    logForDebugging(`[policy] policyGate names unknown policy key "${e}"; denying`, {
      level: "warn",
    });
    return false;
  }
  return isPolicyAllowed(e);
}
//@ chunk-55ht3bcx.js:34922-34994 placement
function isPolicyVerdictAbsent() {
  if (!isPolicyLimitsEligible()) return false;
  return getResponseFromCache() === null || getPolicyLimitsState().failOpenVerdict;
}
//@ chunk-55ht3bcx.js:34994-35055 placement
function isSessionVerdictFromServerFetch() {
  return getResponseFromCache() !== null && getPolicyLimitsState().sessionFromServerFetch;
}
//@ chunk-55ht3bcx.js:35055-35462 placement
function isSessionVerdictUnattributed() {
  if (!isPolicyLimitsEligible()) return false;
  let policyLimitsState = getPolicyLimitsState();
  if (!policyLimitsState.sessionAttributed) return true;
  let n = envBearerVerdictOnWire();
  if (n === "replaced" || n === "gone") return true;
  if (
    policyLimitsState.attributedBearerDigest !== null &&
    currentAccessTokenHash() !== policyLimitsState.attributedBearerDigest &&
    storedLoginAccountNeedsRead()
  )
    return true;
  if (getPolicyLimitsTunnelSocket() !== undefined) return false;
  try {
    return isRowOfAnotherPrincipal(policyLimitsState.attributedPrincipalIdentity);
  } catch (error) {
    logForDebugging(
      `Policy limits: principal unreadable for attribution (${errorMessage(error)}); held as unattributed`,
      {
        level: "error",
      },
    );
    return true;
  }
}
//@ chunk-55ht3bcx.js:35462-35601 placement
function principalEvidenceKey() {
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.principalRung === "tunnel")
    return `tunnel:${policyLimitsState.tunnelEpochHeard ?? "unheard"}`;
  let n = principalIdentityKey() || getCredentialIndependentIneligibleReason();
  return n ? saltedTokenDigest(n) : UNREADABLE_PRINCIPAL;
}
//@ chunk-55ht3bcx.js:35601-35909 placement
/**
 * 策略主体身份键（wif、helper、令牌）。
 */
function principalIdentityKey() {
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.principalRung === "wif") {
    let s = policyLimitsState.wifAccountDiverged ? undefined : getWIFFederationIdentity();
    return s && [s.organizationId, s.federationRuleId, s.workspaceId ?? ""].join("\x00");
  }
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  let r = effectiveAuthTokenEnv();
  return policyLimitsState.principalRung === "helper"
    ? getAnthropicApiKeyWithSource().key
    : r &&
        !hasInferenceScope({
          anthropicAuthEnabled: isAnthropicAuthEnabled(),
          oauthScopes: claudeAIOAuthTokens?.scopes,
        })
      ? r
      : claudeAIOAuthTokens?.accessToken;
}
//@ chunk-55ht3bcx.js:35909-35972 placement
/**
 * 用未命名戳盐值对令牌做双重摘要。
 */
function saltedTokenDigest(e) {
  return tokenDigest(`${getPolicyLimitsState().unnamedStampSalt}:${tokenDigest(e)}`);
}
//@ chunk-55ht3bcx.js:35972-36006 placement
function rowPrincipalStamp() {
  return getPolicyPrincipalIdentity() ?? principalEvidenceKey();
}
//@ chunk-55ht3bcx.js:36006-36048 placement
function isRowOfAnotherPrincipal(e) {
  return e === UNREADABLE_PRINCIPAL || rowPrincipalStamp() !== e;
}
//@ chunk-55ht3bcx.js:36048-36087 placement
function noteTunnelEpochHeard(tunnelEpochHeard) {
  getPolicyLimitsState().tunnelEpochHeard = tunnelEpochHeard;
}
//@ chunk-55ht3bcx.js:36087-36136 placement
function isSessionVerdictDisowned() {
  return getPolicyLimitsState().sessionVerdictDisowned;
}
//@ chunk-55ht3bcx.js:36136-36302 placement
function isPolicyVerdictUnobtainable() {
  if (!isPolicyVerdictAbsent()) return false;
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.settledWithoutVerdictFor === null) return false;
  let n;
  try {
    n = getPolicyPrincipalIdentity();
  } catch {
    return false;
  }
  return policyLimitsState.settledWithoutVerdictFor === (n ?? "");
}
//@ chunk-55ht3bcx.js:36302-36512 placement
function isPrincipalSeenUnderHipaa() {
  let e;
  try {
    e = getPolicyPrincipal();
  } catch {
    return true;
  }
  if (e === null || e.unclassified || e.admitsOnly) return true;
  let policyLimitsState = getPolicyLimitsState();
  if (!policyLimitsState.hipaaSeenUnreadable) applyStampReadToState(currentPolicyStampOrMemoryFallback());
  let r = hasHipaaEvidenceForPrincipal();
  return policyLimitsState.hipaaSeenUnreadable || !policyLimitsState.hipaaEvidenceLoaded || r;
}
//@ chunk-55ht3bcx.js:36512-36576 placement
function isPolicyRouteMissing() {
  if (!isPolicyLimitsEligible() || getResponseFromCache() !== null || isAnthropicHosted()) return false;
  return isPolicyRouteMissingByLastFetch();
}
//@ chunk-55ht3bcx.js:36576-36664 placement
/**
 * 最近一次拉取失败且状态码为 404（策略路由缺失）。
 */
function isPolicyRouteMissingByLastFetch() {
  let lastFetchOutcome = getPolicyLimitsState().lastFetchOutcome;
  return lastFetchOutcome !== null && !lastFetchOutcome.success && lastFetchOutcome.httpStatus === 404;
}
//@ chunk-55ht3bcx.js:36664-36890 placement
function policyDeniedReason(e, n, r, s) {
  if (isPolicyAllowed(e)) return null;
  if (isPolicyRouteMissing()) return policy404Message(n);
  switch (policyDenyKind(e)) {
    case "route_missing":
      return policy404Message(n);
    case "cache_miss":
      return policyUnverifiedMessage(n);
    case "latched":
      return policyBlockedMessage(n, r);
    case "org_denied":
    case null:
      return formatPolicyDisabledMessage(n, r, getCurrentTaints(), s);
  }
}
//@ chunk-55ht3bcx.js:36890-36931 placement
function hasNameableComplianceTaint() {
  return hipaaTaintsOnly(getComplianceTaints()).length > 0;
}
//@ chunk-55ht3bcx.js:36931-37221 placement
function policyDenyKind(e) {
  if (isPolicyAllowed(e)) return null;
  if (isDeniedOnlyByLatch(e)) return "latched";
  let responseFromCache = getResponseFromCache();
  if (responseFromCache !== null) {
    if (
      (RELEASED_ON_SETTLED_MISS.has(e) ||
        (DENIED_ON_FAIL_OPEN_VERDICT.has(e) && !isPolicyDeniedForKey(e, responseFromCache))) &&
      isPolicyVerdictAbsent()
    )
      return isPolicyRouteMissingByLastFetch() ? "route_missing" : "cache_miss";
    if (!isClientOnlyEgressKeyWithheld(e)) return "org_denied";
    return isPolicyRouteMissingByLastFetch() && !isAnthropicHosted() ? "route_missing" : "cache_miss";
  }
  return isPolicyRouteMissing() ? "route_missing" : "cache_miss";
}
//@ chunk-55ht3bcx.js:37221-37327 placement
function isDeniedOnlyByLatch(e) {
  if (!isDisabledByTaint(e, getLatchedTaints()) || isDisabledByTaint(e, getCurrentTaints())) return false;
  if (getResponseFromCache() === null) return true;
  return cachedRestrictions()?.[e]?.allowed !== false;
}
//@ chunk-55ht3bcx.js:37327-37537 placement
function policyDeniedHint(e) {
  let n = policyDenyKind(e);
  if (n === null) return null;
  if (isPolicyRouteMissing()) return policyEndpoint404Hint();
  switch (n) {
    case "route_missing":
      return policyEndpoint404Hint();
    case "cache_miss":
      return couldNotVerifyPolicyHint();
    case "latched":
      return sessionRestartRequiredMessage();
    case "org_denied":
      return policyDisabledMessageFor(getCurrentTaints());
  }
}
//@ chunk-55ht3bcx.js:37537-38016 placement
function areComplianceTaintsSettled() {
  let e = envBearerVerdictOnWire();
  if (e !== null && e !== "same") return false;
  if (
    hasCustomApiKeyHeader() ||
    hasCustomAuthorizationHeader() ||
    !isActualFirstPartyAnthropicBaseUrl() ||
    getAPIProvider() !== "firstParty" ||
    env.ANTHROPIC_UNIX_SOCKET !== undefined ||
    getConfiguredApiKeyHelper() !== undefined ||
    (effectiveAuthTokenEnv() !== undefined &&
      !hasInferenceScope({
        anthropicAuthEnabled: isAnthropicAuthEnabled(),
        oauthScopes: getClaudeAIOAuthTokens()?.scopes,
      }) &&
      !(e === "same" && getResponseFromCache() !== null))
  )
    return false;
  if (getResponseFromCache() !== null) return true;
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  return (
    (claudeAIOAuthTokens?.subscriptionType === "pro" || claudeAIOAuthTokens?.subscriptionType === "max") &&
    claudeAIOAuthTokens.scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE) === true &&
    getClaudeAIOAuthTokenOrigin() === "store" &&
    !isSignInPinnedByMachine() &&
    !isBareMode() &&
    !getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).key &&
    !shouldUseWIFAuth()
  );
}
//@ chunk-55ht3bcx.js:38016-38161 placement
function isPolicyDeniedByRefusedCacheHint(policy) {
  if (!isPolicyLimitsEligible()) return false;
  let policyLimitsState = getPolicyLimitsState();
  return (
    policyLimitsState.hintedDeniedKeys.includes(policy) ||
    !isPolicyAllowedInResponse(
      {
        restrictions: {},
        compliance_taints: [],
      },
      policy,
      policyLimitsState.hintedTaints,
    )
  );
}
//@ chunk-55ht3bcx.js:38161-38207 placement
function isPolicyEnforced(e) {
  return cachedRestrictions()?.[e]?.allowed === true;
}
//@ chunk-55ht3bcx.js:38207-38373 placement
function isPolicyEnforcedOrHintedByRefusedCache(e) {
  let n = cachedRestrictions();
  if (n?.[e]?.allowed === true) return true;
  let policyLimitsState = getPolicyLimitsState();
  return (
    policyLimitsState.hintedEnforcedKeys.includes(e) &&
    n?.[e] === undefined &&
    (n === null || !policyLimitsState.sessionAttributed) &&
    isPolicyLimitsEligible()
  );
}
//@ chunk-55ht3bcx.js:38373-38450 placement
function getPolicyDefault(e) {
  let n = getResponseFromCache()?.defaults[e];
  return typeof n === "boolean" ? n : undefined;
}
//@ chunk-55ht3bcx.js:38450-38494 placement
function getCoreSkillsFromCache() {
  return getResponseFromCache()?.core_skills ?? [];
}
//@ chunk-55ht3bcx.js:38494-38576 placement
function getArtifactCreateNotice() {
  return (
    (getResponseFromCache() ?? getPolicyLimitsState().sessionCache)?.artifact_create_notice?.text ?? null
  );
}
//@ chunk-55ht3bcx.js:38576-38660 placement
function getRememberedCoreSkills() {
  if (!isPolicyLimitsEligible()) return [];
  return getResponseFromCache()?.core_skills ?? getPolicyLimitsState().lastServedCoreSkills;
}
//@ chunk-55ht3bcx.js:38660-38705 placement
function _resetRememberedCoreSkillsForTesting() {
  getPolicyLimitsState().lastServedCoreSkills = null;
}
//@ chunk-55ht3bcx.js:38705-38875 placement
function getResponseFromCache() {
  if (!isPolicyLimitsEligible()) return null;
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.sessionCache) return policyLimitsState.sessionCache;
  if (policyLimitsState.diskAdoptionSuppressed) return null;
  let cachedResponse = loadCachedResponse();
  if (cachedResponse) {
    installDiskDerivedVerdict(cachedResponse);
    return cachedResponse;
  }
  return null;
}
//@ chunk-55ht3bcx.js:38875-38927 placement
function isPolicyLimitsCacheLoaded() {
  if (!isPolicyLimitsEligible()) return true;
  return getResponseFromCache() !== null;
}
//@ chunk-55ht3bcx.js:38927-38972 placement
/**
 * 取缓存响应里的限制表，无则 null。
 */
function cachedRestrictions() {
  return getResponseFromCache()?.restrictions ?? null;
}
//@ chunk-55ht3bcx.js:38972-39106 placement
function federationProfileKey(wifPrecedenceSource) {
  if (wifPrecedenceSource === "env-quad") return env.ANTHROPIC_FEDERATION_RULE_ID?.trim() ?? "";
  let configDir = resolveConfigDir();
  return configDir === null || wifPrecedenceSource === null
    ? ""
    : principalPathKey(configDir, resolveLiveProfileName(configDir));
}
//@ chunk-55ht3bcx.js:39106-39160 placement
/**
 * 拼出「规范化路径 + NUL + 主体」的键。
 */
function principalPathKey(e, n) {
  return e === null ? "" : `${resolve(e)}\x00${n}`;
}
export {
  policyDenyKind,
  isPolicyDeniedByRefusedCacheHint,
  getResponseFromCache,
  isPolicyRouteMissing,
  isPolicyAllowed,
  policyDeniedReason,
  isPolicyLimitsCacheLoaded,
  rowPrincipalStamp,
  projectPolicyLimitsBody,
  isSessionVerdictFromServerFetch,
  policyKeyLabel,
  isSessionVerdictDisowned,
  isClientOnlyEgressKeyWithheld,
  TAINT_DISABLED_POLICIES,
  isEnforcedPolicyKey,
  getPolicyPrincipalIdentity,
  applyStampReadToState,
  parseCachedResponse,
  serverBodyOf,
  federationProfileKey,
  principalPathKey,
  principalEvidenceKey,
  isDeniedOnlyByLatch,
  hasNameableComplianceTaint,
  isPolicyEnforcedOrHintedByRefusedCache,
  isPolicyVerdictAbsent,
  getPolicyDefault,
  getPersistedPolicyCacheConfirmedAt,
  seedSessionCacheFromPrime,
  forgetPersistedPolicyCache,
  takeUpHipaaEvidenceLeftOnDisk,
  recordPersistedPolicyCache,
  isUnrestrictiveBody,
  getHeldHipaaEvidence,
  getPersistedPolicyCacheChecksum,
  getPolicyStoredCopyTrustedPrincipal,
  getLastPolicyCacheStampVerdict,
  getLastPolicyCacheStampMatchedIdentity,
  getPolicyStoredCopyTrust,
  markSessionVerdictUnattributed,
  noteTunnelEpochHeard,
  _resetRememberedCoreSkillsForTesting,
  getArtifactCreateNotice,
  isPolicyVerdictUnobtainable,
  isPrincipalSeenUnderHipaa,
  policyDeniedHint,
  isPolicyAllowedInResponse,
  areComplianceTaintsSettled,
};

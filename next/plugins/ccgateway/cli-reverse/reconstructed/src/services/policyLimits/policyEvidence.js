/**
 * services/policyLimits/policyEvidence.ts
 *
 * 2.1.316 新增：是否需要重新读取策略证据（bearer 变化）；策略主体身份键（wif、helper、令牌）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0nvx3515.js (79)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0nvx3515.js:22816-23064 placement
function markSessionVerdictUnattributed() {
  let policyLimitsState = getPolicyLimitsState();
  let notDisowned = !policyLimitsState.sessionVerdictDisowned;
  policyLimitsState.sessionAttributed = false;
  policyLimitsState.attributedBearerDigest = null;
  policyLimitsState.attributedPrincipalIdentity = null;
  policyLimitsState.sessionVerdictDisowned = true;
  policyLimitsState.evidenceRereadForBearer = undefined;
  if (notDisowned) {
    policyLimitsState.cacheRevision++;
    policyLimitsState.emitVerdictChanged();
  }
}
//@ chunk-0nvx3515.js:23064-23118 placement
function getPolicyPrincipalIdentity() {
  let policyPrincipal = getPolicyPrincipal();
  return policyPrincipal === null ? null : identityDigestOfDescriptor(policyPrincipal);
}
//@ chunk-0nvx3515.js:23118-23191 placement
function getPolicyStoredCopyTrust() {
  let storedCopyTrust = getPolicyLimitsState().storedCopyTrust;
  return storedCopyTrust === "not_asked" ? storedCopyTrust : cacheTrustLabel(storedCopyTrust);
}
//@ chunk-0nvx3515.js:23191-23238 placement
function getPolicyStoredCopyTrustedPrincipal() {
  return trustedPrincipal(getPolicyLimitsState().storedCopyTrust);
}
//@ chunk-0nvx3515.js:23238-23281 placement
function getLastPolicyCacheStampVerdict() {
  return getPolicyLimitsState().lastStampVerdict;
}
//@ chunk-0nvx3515.js:23281-23332 placement
function getLastPolicyCacheStampMatchedIdentity() {
  return getPolicyLimitsState().lastStampMatchedIdentity;
}
//@ chunk-0nvx3515.js:23332-23414 placement
function getHipaaEvidence() {
  let policyLimitsState = getPolicyLimitsState();
  if (!policyLimitsState.hipaaEvidenceLoaded) applyStampReadToState(currentPolicyStampOrMemoryFallback());
  return policyLimitsState.hipaaEvidence;
}
//@ chunk-0nvx3515.js:23414-23576 placement
function applyStampReadToState(readResult) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.hipaaEvidenceLoaded = !isIoUnusableStamp(readResult);
  if (readResult.kind === "ok") policyLimitsState.hipaaEvidence = stampToHipaaEvidence(readResult.stamp);
  else if (readResult.kind === "unusable" && !isIoUnusableStamp(readResult))
    policyLimitsState.hipaaSeenUnreadable = true;
}
//@ chunk-0nvx3515.js:23576-23614 placement
/**
 * 内存模式下用内存戳，否则同步读取磁盘缓存戳。
 */
function currentPolicyStampOrMemoryFallback() {
  return isPolicyCacheMemoryOnly() ? ABSENT_STAMP : readPolicyStampSync(getCachePath());
}
//@ chunk-0nvx3515.js:23614-23654 placement
function getHeldHipaaEvidence() {
  return getPolicyLimitsState().hipaaEvidence;
}
//@ chunk-0nvx3515.js:23654-24282 placement
function hasHipaaEvidenceForPrincipal() {
  let principal;
  try {
    principal = getPolicyPrincipal();
  } catch (error) {
    logForDebugging(
      `Policy limits: principal unreadable for the evidence tier (${errorMessage(error)}); judged on the machine's evidence`,
      {
        level: "error",
      },
    );
    principal = {
      kind: "token",
      descriptor: "token:unreadable",
      unclassified: true,
    };
  }
  if (principal === null || principal.admitsOnly === true) {
    let oauthPrincipalMemo = getPolicyLimitsState().oauthPrincipalMemo;
    if (
      principal === null &&
      (!oauthPrincipalMemo?.daemonSnapshotWorker || oauthPrincipalMemo.principal !== null)
    )
      return false;
    let hipaaEvidence = getHipaaEvidence();
    return hipaaEvidence.seen.length > 0 || hipaaEvidence.incomplete;
  }
  let hipaaEvidence = getHipaaEvidence();
  if (isUnattributablePrincipal(principal)) {
    let ruledOutHere =
      principal.storedLoginOrgless === true &&
      principal.unclassified !== true &&
      hipaaEvidence.ruledOut.includes(identityDigestOfDescriptor(principal));
    return hipaaEvidence.seen.length > 0 || (hipaaEvidence.incomplete && !ruledOutHere);
  }
  let digest = identityDigestOfDescriptor(principal);
  return (
    hipaaEvidence.seen.includes(digest) ||
    (hipaaEvidence.incomplete && !hipaaEvidence.ruledOut.includes(digest))
  );
}
//@ chunk-0nvx3515.js:24282-24350 placement
/**
 * 判断策略主体是否无法归属（未分类或存储登录无组织）。
 */
function isUnattributablePrincipal(principal) {
  return principal.unclassified === true || principal.storedLoginOrgless === true;
}
//@ chunk-0nvx3515.js:24350-24489 placement
function recordPersistedPolicyCache(diskBodyChecksum, hipaaEvidence, diskConfirmedAtMs) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.diskBodyChecksum = diskBodyChecksum;
  policyLimitsState.diskConfirmedAtMs = diskConfirmedAtMs;
  policyLimitsState.hipaaEvidence = hipaaEvidence;
  policyLimitsState.hipaaEvidenceLoaded = true;
  policyLimitsState.diskRefusedAtMs = null;
}
//@ chunk-0nvx3515.js:24489-24656 placement
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
//@ chunk-0nvx3515.js:24656-24858 placement
function sameHipaaEvidence(hipaaEvidence, hipaaEvidence_2) {
  return (
    hipaaEvidence.incomplete === hipaaEvidence_2.incomplete &&
    hipaaEvidence.seen.length === hipaaEvidence_2.seen.length &&
    hipaaEvidence.seen.every((digest, index) => digest === hipaaEvidence_2.seen[index]) &&
    hipaaEvidence.ruledOut.length === hipaaEvidence_2.ruledOut.length &&
    hipaaEvidence.ruledOut.every((digest, index) => digest === hipaaEvidence_2.ruledOut[index])
  );
}
//@ chunk-0nvx3515.js:24858-24901 placement
function getPersistedPolicyCacheChecksum() {
  return getPolicyLimitsState().diskBodyChecksum;
}
//@ chunk-0nvx3515.js:24901-24945 placement
function getPersistedPolicyCacheConfirmedAt() {
  return getPolicyLimitsState().diskConfirmedAtMs;
}
//@ chunk-0nvx3515.js:24945-25176 placement
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
//@ chunk-0nvx3515.js:25176-25241 placement
function parseCachedResponse(text) {
  let projected = projectPolicyLimitsBody(safeParseJSON(text, false));
  return projected.success ? projected.data : null;
}
//@ chunk-0nvx3515.js:25241-25260 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0nvx3515.js:25241", () => {
  weakMap = new WeakMap();
});
//@ chunk-0nvx3515.js:25260-25339 placement
function projectPolicyLimitsBody(body) {
  let parsed = PolicyLimitsResponseSchema().safeParse(body);
  if (parsed.success) weakMap.set(parsed.data, body);
  return parsed;
}
//@ chunk-0nvx3515.js:25339-25375 placement
function serverBodyOf(body) {
  return weakMap.get(body) ?? body;
}
//@ chunk-0nvx3515.js:25375-25486 placement
function seedSessionCacheFromPrime(storageV5, prime) {
  let policyLimitsState = getPolicyLimitsState();
  policyLimitsState.storageV5 = storageV5;
  if (prime !== null && policyLimitsState.sessionCache === null && !policyLimitsState.diskAdoptionSuppressed)
    installDiskDerivedVerdict(prime);
}
//@ chunk-0nvx3515.js:25486-31237 placement
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
  allow_connector_file_uploads: {
    deniedUnder: ["hipaa", "zdr"],
    onCacheMiss: "deny",
    onFailOpenVerdict: "deny",
    label: "Sending files to claude.ai connectors",
    verb: "is",
    requirementId: "HIPAA-R103",
  },
  allow_gmail_file_references: {
    deniedUnder: ["hipaa"],
    onCacheMiss: "deny",
    onFailOpenVerdict: "deny",
    label: "File references for connectors",
    verb: "are",
    requirementId: "HIPAA-R106",
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
//@ chunk-0nvx3515.js:31237-31281 placement
function isClientDerivedPolicyKey(policyKey) {
  return Object.hasOwn(CLIENT_POLICY_KEYS, policyKey);
}
//@ chunk-0nvx3515.js:31281-31325 placement
function clientPolicyKeySpec(policyKey) {
  return isClientDerivedPolicyKey(policyKey) ? CLIENT_POLICY_KEYS[policyKey] : undefined;
}
//@ chunk-0nvx3515.js:31325-31351 placement
var HIPAA_TAINTS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0nvx3515.js:31325", () => {
  HIPAA_TAINTS_2 = new Set(["hipaa"]);
});
//@ chunk-0nvx3515.js:31351-31411 placement
function isServerPopulatedPolicyKey(policyKey) {
  return clientPolicyKeySpec(policyKey)?.serverPopulated === true && !isValidatedCloverOn();
}
//@ chunk-0nvx3515.js:31411-31470 placement
function isUnblockedTranscriptScanKey(policyKey) {
  return clientPolicyKeySpec(policyKey)?.transcriptScan === true && !isHashedLarkOn();
}
//@ chunk-0nvx3515.js:31470-31519 placement
/**
 * 取所有客户端派生且需要处理的策略键。
 */
function clientPolicyKeys() {
  return Object.keys(CLIENT_POLICY_KEYS).filter(isClientDerivedPolicyKey);
}
//@ chunk-0nvx3515.js:31519-31600 placement
function policyKeyLabel(policyKey) {
  let spec = clientPolicyKeySpec(policyKey);
  return {
    featureLabel: spec?.label ?? policyKey,
    verb: spec?.verb ?? "is",
  };
}
//@ chunk-0nvx3515.js:31600-32033 placement
/**
 * 策略证据计算中豁免与需要专门处理的字段集合。
 */
var TAINT_DISABLED_POLICIES; // deferred: uses clientPolicyKeys of its import cycle while loading; runs once the cycle is complete
var TAINT_HARD_BLOCKED_POLICIES;
var FAIL_CLOSED_ON_MISS;
var RELEASED_ON_SETTLED_MISS;
var DENIED_ON_FAIL_OPEN_VERDICT;
var FEEDBACK_TAINT_EXEMPT_KEYS;
var WEB_FETCH_AND_DESIGN_KEYS;
deferInit("chunk-0nvx3515.js:31600", () => {
  TAINT_DISABLED_POLICIES = clientPolicyKeys().flatMap((policyKey) =>
    (clientPolicyKeySpec(policyKey)?.deniedUnder ?? []).map((taintName) => [taintName, policyKey]),
  );
  TAINT_HARD_BLOCKED_POLICIES = clientPolicyKeys().flatMap((policyKey) =>
    (clientPolicyKeySpec(policyKey)?.hardBlockUnder ?? []).map((taintName) => [taintName, policyKey]),
  );
  FAIL_CLOSED_ON_MISS = new Set(
    clientPolicyKeys().filter((policyKey) => clientPolicyKeySpec(policyKey)?.onCacheMiss !== "allow"),
  );
  RELEASED_ON_SETTLED_MISS = new Set(
    clientPolicyKeys().filter((policyKey) => clientPolicyKeySpec(policyKey)?.onCacheMiss === "hold"),
  );
  DENIED_ON_FAIL_OPEN_VERDICT = new Set(
    clientPolicyKeys().filter((policyKey) => clientPolicyKeySpec(policyKey)?.onFailOpenVerdict === "deny"),
  );
  FEEDBACK_TAINT_EXEMPT_KEYS = new Set(["allow_product_feedback"]);
  WEB_FETCH_AND_DESIGN_KEYS = new Set(["allow_web_fetch", "allow_design_sync", "allow_channels", ...[]]);
});
//@ chunk-0nvx3515.js:32033-32078 placement
function isClientOnlyEgressKeyWithheld(policyKey) {
  let reread = shouldRereadEvidence(policyKey);
  return isWithheldFromUnverifiedClaudeAiLogin(policyKey) || reread;
}
//@ chunk-0nvx3515.js:32078-32388 placement
function isWithheldFromUnverifiedClaudeAiLogin(policyKey) {
  if (!WEB_FETCH_AND_DESIGN_KEYS.has(policyKey) || isSteadySunbeamOn() || !isPolicyLimitsEligible())
    return false;
  let policyLimitsState = getPolicyLimitsState();
  if (
    policyLimitsState.sessionCache !== null &&
    !policyLimitsState.failOpenVerdict &&
    !policyLimitsState.sessionVerdictDisowned
  )
    return false;
  let rung;
  try {
    getPolicyPrincipal();
    rung = policyLimitsState.principalRung;
  } catch {
    return true;
  }
  if (rung === "wif" && isClaudeAISubscriber()) return true;
  if (rung === "none" && effectiveAuthTokenEnv() !== undefined && isGateAOn()) return false;
  return rung === "oauth" || rung === "tunnel" || rung === "none";
}
//@ chunk-0nvx3515.js:32388-32721 placement
/**
 * 是否需要重新读取策略证据（bearer 变化）。
 */
function shouldRereadEvidence(policyKey) {
  if (!WEB_FETCH_AND_DESIGN_KEYS.has(policyKey) || !isPolicyLimitsEligible() || isTranquilCrescentOn())
    return false;
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.sessionCache !== null && policyLimitsState.sessionAttributed) {
    let tokenHash = currentAccessTokenHash();
    if (tokenHash !== null && tokenHash === policyLimitsState.attributedBearerDigest) return false;
    if (policyLimitsState.evidenceRereadForBearer !== tokenHash) {
      policyLimitsState.evidenceRereadForBearer = tokenHash;
      policyLimitsState.hipaaEvidenceLoaded = false;
    }
    let hipaaEvidence = getHipaaEvidence();
    if ((hipaaEvidence.seen.length === 0 && !hipaaEvidence.incomplete) || !isCurrentPrincipalUnattributable())
      return false;
  }
  return hasHipaaEvidenceForPrincipal();
}
//@ chunk-0nvx3515.js:32721-32788 placement
/**
 * 当前策略主体是否无法归属（异常时保守为真）。
 */
function isCurrentPrincipalUnattributable() {
  try {
    let principal = getPolicyPrincipal();
    return principal !== null && isUnattributablePrincipal(principal);
  } catch {
    return true;
  }
}
//@ chunk-0nvx3515.js:32788-33417 placement
function isPolicyAllowed(policyKey) {
  let responseFromCache = getResponseFromCache();
  if (isUnblockedTranscriptScanKey(policyKey)) {
    let restriction = responseFromCache?.restrictions[policyKey];
    if (restriction) return restriction.allowed;
    return !(isPolicyLimitsEligible() && getPolicyLimitsState().hintedDeniedKeys.includes(policyKey));
  }
  if (!responseFromCache) {
    if (FAIL_CLOSED_ON_MISS.has(policyKey)) {
      if (
        isPolicyLimitsEligible() &&
        !(
          RELEASED_ON_SETTLED_MISS.has(policyKey) &&
          isPolicyVerdictUnobtainable() &&
          !isPrincipalSeenUnderHipaa()
        )
      )
        return false;
      if (
        FEEDBACK_TAINT_EXEMPT_KEYS.has(policyKey) &&
        isEssentialTrafficOnly() &&
        !(policyKey === "allow_product_feedback" && isFeedbackSurveyForOtel())
      )
        return false;
    }
    if (isDisabledByTaint(policyKey, getLatchedTaints())) return false;
    if (isClientOnlyEgressKeyWithheld(policyKey)) return false;
    let policyLimitsState = getPolicyLimitsState();
    if (policyLimitsState.hintedDeniedKeys.length === 0 && policyLimitsState.hintedTaints.length === 0)
      return true;
    if (!isPolicyLimitsEligible()) return true;
    if (policyLimitsState.hintedDeniedKeys.includes(policyKey)) return false;
    return isPolicyAllowedInResponse(
      {
        restrictions: {},
        compliance_taints: [],
      },
      policyKey,
      policyLimitsState.hintedTaints,
    );
  }
  if (
    RELEASED_ON_SETTLED_MISS.has(policyKey) &&
    isPolicyVerdictAbsent() &&
    !(isPolicyVerdictUnobtainable() && !isPrincipalSeenUnderHipaa())
  )
    return false;
  if (DENIED_ON_FAIL_OPEN_VERDICT.has(policyKey) && isPolicyVerdictAbsent()) return false;
  if (isClientOnlyEgressKeyWithheld(policyKey)) return false;
  return !isPolicyDeniedForKey(policyKey, responseFromCache);
}
//@ chunk-0nvx3515.js:33417-33690 placement
function isPolicyDeniedForKey(policyKey, responseFromCache) {
  let policyLimitsState = getPolicyLimitsState();
  if (
    responseFromCache.restrictions[policyKey] === undefined &&
    policyLimitsState.hintedDeniedKeys.includes(policyKey)
  )
    return true;
  let sessionFromServerFetch = policyLimitsState.sessionFromServerFetch;
  return !isPolicyAllowedInResponse(
    {
      restrictions: responseFromCache.restrictions,
      compliance_taints: sessionFromServerFetch ? responseFromCache.compliance_taints : [],
    },
    policyKey,
    [
      ...getLatchedTaints(),
      ...policyLimitsState.hintedTaints,
      ...(sessionFromServerFetch ? [] : responseFromCache.compliance_taints),
    ],
  );
}
//@ chunk-0nvx3515.js:33690-33989 placement (2.1.88 match: PolicyLimitsResponseSchema, 0.452)
function isPolicyAllowedInResponse(response, policyKey, extraTaints = []) {
  let complianceTaints = response.compliance_taints;
  if (
    TAINT_HARD_BLOCKED_POLICIES.some(
      ([taintName, pairPolicyKey]) =>
        pairPolicyKey === policyKey &&
        (complianceTaints.includes(taintName) || extraTaints.includes(taintName)),
    )
  )
    return false;
  let restriction = response.restrictions[policyKey];
  if (restriction) return restriction.allowed;
  if (isUnblockedTranscriptScanKey(policyKey)) return true;
  let taints = isServerPopulatedPolicyKey(policyKey)
    ? [
        ...extraTaints.filter(
          (taintName) => !(HIPAA_TAINTS_2.has(taintName) && complianceTaints.includes(taintName)),
        ),
        ...complianceTaints.filter((complianceTaint) => !HIPAA_TAINTS_2.has(complianceTaint)),
      ]
    : [...extraTaints, ...complianceTaints];
  return !isDisabledByTaint(policyKey, taints);
}
//@ chunk-0nvx3515.js:33989-34337 placement
function isUnrestrictiveBody(body) {
  if (
    body.compliance_taints.some((complianceTaint) =>
      TAINT_DISABLED_POLICIES.some(([taintName]) => taintName === complianceTaint),
    )
  )
    return false;
  if (
    Object.keys(body.defaults ?? {}).length > 0 ||
    (body.monitoring_notice !== null && body.monitoring_notice !== undefined) ||
    (body.artifact_create_notice !== null && body.artifact_create_notice !== undefined)
  )
    return false;
  return Object.entries(body.restrictions).every(([key, value]) =>
    isEnforcedPolicyKey(key) ? value?.allowed !== true : value?.allowed !== false,
  );
}
//@ chunk-0nvx3515.js:34337-34409 placement
/**
 * 策略键是否属于强制/要求类（enforce_ / require_ 前缀）。
 */
function isEnforcedPolicyKey(policyKey) {
  return policyKey.startsWith("enforce_") || policyKey.startsWith("require_");
}
//@ chunk-0nvx3515.js:34409-34511 placement
function isDisabledByTaint(policyKey, taints) {
  if (taints.length === 0) return false;
  for (let [taintName, pairPolicyKey] of TAINT_DISABLED_POLICIES)
    if (pairPolicyKey === policyKey && taints.includes(taintName)) return true;
  return false;
}
//@ chunk-0nvx3515.js:34511-34961 placement
// deferred: uses registerPolicyVerdict (./policyVerdicts.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0nvx3515.js:34511", () => {
  registerPolicyVerdict({
    isPolicyAllowed: (policyKey) => isPolicyAllowed(policyKey),
    commandPolicyGateAllows: (policyKey) => commandPolicyGateAllows(policyKey),
    policyDenyKind: (policyKey) => policyDenyKind(policyKey),
    policyDeniedReason: (policyKey, featureLabel, verb) => policyDeniedReason(policyKey, featureLabel, verb),
    complianceTaintsSettled: () => areComplianceTaintsSettled(),
    policyLimitsCacheLoaded: () => isPolicyLimitsCacheLoaded(),
    autoDefaultVerdictState: () => autoDefaultVerdictState(),
    policyVerdictAbsent: () => isPolicyVerdictAbsent(),
    sessionVerdictUnattributed: () => isSessionVerdictUnattributed(),
    rowPrincipalStamp: () => rowPrincipalStamp(),
    rowOfAnotherPrincipal: (stamp) => isRowOfAnotherPrincipal(stamp),
    principalSeenUnderHipaa: () => hasHipaaEvidenceForPrincipal(),
    coreSkills: () => getCoreSkillsFromCache(),
    rememberedCoreSkills: () => getRememberedCoreSkills(),
  });
});
//@ chunk-0nvx3515.js:34961-35078 placement
function autoDefaultVerdictState() {
  if (!isPolicyVerdictAbsent()) return "loaded";
  if (isPolicyVerdictUnobtainable())
    return isPrincipalHipaaSeen() ? "unobtainable_seen_hipaa" : "unobtainable";
  return "pending";
}
//@ chunk-0nvx3515.js:35078-35186 placement
function isPrincipalHipaaSeen() {
  let principal;
  try {
    principal = getPolicyPrincipal();
  } catch {
    return false;
  }
  if (principal === null || isUnattributablePrincipal(principal)) return false;
  return getHipaaEvidence().seen.includes(identityDigestOfDescriptor(principal));
}
//@ chunk-0nvx3515.js:35186-35317 placement
function commandPolicyGateAllows(policyKey) {
  if (!isClientDerivedPolicyKey(policyKey)) {
    logForDebugging(`[policy] policyGate names unknown policy key "${policyKey}"; denying`, {
      level: "warn",
    });
    return false;
  }
  return isPolicyAllowed(policyKey);
}
//@ chunk-0nvx3515.js:35317-35389 placement
function isPolicyVerdictAbsent() {
  if (!isPolicyLimitsEligible()) return false;
  return getResponseFromCache() === null || getPolicyLimitsState().failOpenVerdict;
}
//@ chunk-0nvx3515.js:35389-35450 placement
function isSessionVerdictFromServerFetch() {
  return getResponseFromCache() !== null && getPolicyLimitsState().sessionFromServerFetch;
}
//@ chunk-0nvx3515.js:35450-35857 placement
function isSessionVerdictUnattributed() {
  if (!isPolicyLimitsEligible()) return false;
  let policyLimitsState = getPolicyLimitsState();
  if (!policyLimitsState.sessionAttributed) return true;
  let verdict = envBearerVerdictOnWire();
  if (verdict === "replaced" || verdict === "gone") return true;
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
//@ chunk-0nvx3515.js:35857-35996 placement
function principalEvidenceKey() {
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.principalRung === "tunnel")
    return `tunnel:${policyLimitsState.tunnelEpochHeard ?? "unheard"}`;
  let identity = principalIdentityKey() || getCredentialIndependentIneligibleReason();
  return identity ? saltedTokenDigest(identity) : UNREADABLE_PRINCIPAL;
}
//@ chunk-0nvx3515.js:35996-36304 placement
/**
 * 策略主体身份键（wif、helper、令牌）。
 */
function principalIdentityKey() {
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.principalRung === "wif") {
    let federationIdentity = policyLimitsState.wifAccountDiverged ? undefined : getWIFFederationIdentity();
    return (
      federationIdentity &&
      [
        federationIdentity.organizationId,
        federationIdentity.federationRuleId,
        federationIdentity.workspaceId ?? "",
      ].join("\x00")
    );
  }
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  let envToken = effectiveAuthTokenEnv();
  return policyLimitsState.principalRung === "helper"
    ? getAnthropicApiKeyWithSource().key
    : envToken &&
        !hasInferenceScope({
          anthropicAuthEnabled: isAnthropicAuthEnabled(),
          oauthScopes: claudeAIOAuthTokens?.scopes,
        })
      ? envToken
      : claudeAIOAuthTokens?.accessToken;
}
//@ chunk-0nvx3515.js:36304-36367 placement
/**
 * 用未命名戳盐值对令牌做双重摘要。
 */
function saltedTokenDigest(token) {
  return tokenDigest(`${getPolicyLimitsState().unnamedStampSalt}:${tokenDigest(token)}`);
}
//@ chunk-0nvx3515.js:36367-36401 placement
function rowPrincipalStamp() {
  return getPolicyPrincipalIdentity() ?? principalEvidenceKey();
}
//@ chunk-0nvx3515.js:36401-36443 placement
function isRowOfAnotherPrincipal(stamp) {
  return stamp === UNREADABLE_PRINCIPAL || rowPrincipalStamp() !== stamp;
}
//@ chunk-0nvx3515.js:36443-36482 placement
function noteTunnelEpochHeard(tunnelEpochHeard) {
  getPolicyLimitsState().tunnelEpochHeard = tunnelEpochHeard;
}
//@ chunk-0nvx3515.js:36482-36531 placement
function isSessionVerdictDisowned() {
  return getPolicyLimitsState().sessionVerdictDisowned;
}
//@ chunk-0nvx3515.js:36531-36697 placement
function isPolicyVerdictUnobtainable() {
  if (!isPolicyVerdictAbsent()) return false;
  let policyLimitsState = getPolicyLimitsState();
  if (policyLimitsState.settledWithoutVerdictFor === null) return false;
  let identity;
  try {
    identity = getPolicyPrincipalIdentity();
  } catch {
    return false;
  }
  return policyLimitsState.settledWithoutVerdictFor === (identity ?? "");
}
//@ chunk-0nvx3515.js:36697-36907 placement
function isPrincipalSeenUnderHipaa() {
  let principal;
  try {
    principal = getPolicyPrincipal();
  } catch {
    return true;
  }
  if (principal === null || principal.unclassified || principal.admitsOnly) return true;
  let policyLimitsState = getPolicyLimitsState();
  if (!policyLimitsState.hipaaSeenUnreadable) applyStampReadToState(currentPolicyStampOrMemoryFallback());
  let hasEvidence = hasHipaaEvidenceForPrincipal();
  return policyLimitsState.hipaaSeenUnreadable || !policyLimitsState.hipaaEvidenceLoaded || hasEvidence;
}
//@ chunk-0nvx3515.js:36907-36971 placement
function isPolicyRouteMissing() {
  if (!isPolicyLimitsEligible() || getResponseFromCache() !== null || isAnthropicHosted()) return false;
  return isPolicyRouteMissingByLastFetch();
}
//@ chunk-0nvx3515.js:36971-37059 placement
/**
 * 最近一次拉取失败且状态码为 404（策略路由缺失）。
 */
function isPolicyRouteMissingByLastFetch() {
  let lastFetchOutcome = getPolicyLimitsState().lastFetchOutcome;
  return lastFetchOutcome !== null && !lastFetchOutcome.success && lastFetchOutcome.httpStatus === 404;
}
//@ chunk-0nvx3515.js:37059-37285 placement
function policyDeniedReason(policyKey, featureLabel, verb, taints) {
  if (isPolicyAllowed(policyKey)) return null;
  if (isPolicyRouteMissing()) return policy404Message(featureLabel);
  switch (policyDenyKind(policyKey)) {
    case "route_missing":
      return policy404Message(featureLabel);
    case "cache_miss":
      return policyUnverifiedMessage(featureLabel);
    case "latched":
      return policyBlockedMessage(featureLabel, verb);
    case "org_denied":
    case null:
      return formatPolicyDisabledMessage(featureLabel, verb, getCurrentTaints(), taints);
  }
}
//@ chunk-0nvx3515.js:37285-37326 placement
function hasNameableComplianceTaint() {
  return hipaaTaintsOnly(getComplianceTaints()).length > 0;
}
//@ chunk-0nvx3515.js:37326-37616 placement
function policyDenyKind(policyKey) {
  if (isPolicyAllowed(policyKey)) return null;
  if (isDeniedOnlyByLatch(policyKey)) return "latched";
  let responseFromCache = getResponseFromCache();
  if (responseFromCache !== null) {
    if (
      (RELEASED_ON_SETTLED_MISS.has(policyKey) ||
        (DENIED_ON_FAIL_OPEN_VERDICT.has(policyKey) &&
          !isPolicyDeniedForKey(policyKey, responseFromCache))) &&
      isPolicyVerdictAbsent()
    )
      return isPolicyRouteMissingByLastFetch() ? "route_missing" : "cache_miss";
    if (!isClientOnlyEgressKeyWithheld(policyKey)) return "org_denied";
    return isPolicyRouteMissingByLastFetch() && !isAnthropicHosted() ? "route_missing" : "cache_miss";
  }
  return isPolicyRouteMissing() ? "route_missing" : "cache_miss";
}
//@ chunk-0nvx3515.js:37616-37722 placement
function isDeniedOnlyByLatch(policyKey) {
  if (!isDisabledByTaint(policyKey, getLatchedTaints()) || isDisabledByTaint(policyKey, getCurrentTaints()))
    return false;
  if (getResponseFromCache() === null) return true;
  return cachedRestrictions()?.[policyKey]?.allowed !== false;
}
//@ chunk-0nvx3515.js:37722-37932 placement
function policyDeniedHint(policyKey) {
  let denyKind = policyDenyKind(policyKey);
  if (denyKind === null) return null;
  if (isPolicyRouteMissing()) return policyEndpoint404Hint();
  switch (denyKind) {
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
//@ chunk-0nvx3515.js:37932-38411 placement
function areComplianceTaintsSettled() {
  let verdict = envBearerVerdictOnWire();
  if (verdict !== null && verdict !== "same") return false;
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
      !(verdict === "same" && getResponseFromCache() !== null))
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
//@ chunk-0nvx3515.js:38411-38556 placement
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
//@ chunk-0nvx3515.js:38556-38602 placement
function isPolicyEnforced(policyKey) {
  return cachedRestrictions()?.[policyKey]?.allowed === true;
}
//@ chunk-0nvx3515.js:38602-38768 placement
function isPolicyEnforcedOrHintedByRefusedCache(policyKey) {
  let restrictions = cachedRestrictions();
  if (restrictions?.[policyKey]?.allowed === true) return true;
  let policyLimitsState = getPolicyLimitsState();
  return (
    policyLimitsState.hintedEnforcedKeys.includes(policyKey) &&
    restrictions?.[policyKey] === undefined &&
    (restrictions === null || !policyLimitsState.sessionAttributed) &&
    isPolicyLimitsEligible()
  );
}
//@ chunk-0nvx3515.js:38768-38845 placement
function getPolicyDefault(policyKey) {
  let value = getResponseFromCache()?.defaults[policyKey];
  return typeof value === "boolean" ? value : undefined;
}
//@ chunk-0nvx3515.js:38845-38889 placement
function getCoreSkillsFromCache() {
  return getResponseFromCache()?.core_skills ?? [];
}
//@ chunk-0nvx3515.js:38889-38971 placement
function getArtifactCreateNotice() {
  return (
    (getResponseFromCache() ?? getPolicyLimitsState().sessionCache)?.artifact_create_notice?.text ?? null
  );
}
//@ chunk-0nvx3515.js:38971-39055 placement
function getRememberedCoreSkills() {
  if (!isPolicyLimitsEligible()) return [];
  return getResponseFromCache()?.core_skills ?? getPolicyLimitsState().lastServedCoreSkills;
}
//@ chunk-0nvx3515.js:39055-39100 placement
function _resetRememberedCoreSkillsForTesting() {
  getPolicyLimitsState().lastServedCoreSkills = null;
}
//@ chunk-0nvx3515.js:39100-39270 placement
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
//@ chunk-0nvx3515.js:39270-39322 placement
function isPolicyLimitsCacheLoaded() {
  if (!isPolicyLimitsEligible()) return true;
  return getResponseFromCache() !== null;
}
//@ chunk-0nvx3515.js:39322-39367 placement (2.1.88 match: loadCachedRestrictions, 0.61)
/**
 * 取缓存响应里的限制表，无则 null。
 */
function cachedRestrictions() {
  return getResponseFromCache()?.restrictions ?? null;
}
//@ chunk-0nvx3515.js:39367-39501 placement
function federationProfileKey(wifPrecedenceSource) {
  if (wifPrecedenceSource === "env-quad") return env.ANTHROPIC_FEDERATION_RULE_ID?.trim() ?? "";
  let dir = resolveConfigDir();
  return dir === null || wifPrecedenceSource === null
    ? ""
    : principalPathKey(dir, resolveLiveProfileName(dir));
}
//@ chunk-0nvx3515.js:39501-39555 placement
/**
 * 拼出「规范化路径 + NUL + 主体」的键。
 */
function principalPathKey(dir, rung) {
  return dir === null ? "" : `${resolve(dir)}\x00${rung}`;
}
export {
  isPolicyAllowed,
  policyDenyKind,
  policyDeniedReason,
  isPolicyLimitsCacheLoaded,
  getResponseFromCache,
  isClientOnlyEgressKeyWithheld,
  isPolicyDeniedByRefusedCacheHint,
  isPolicyRouteMissing,
  TAINT_DISABLED_POLICIES,
  isEnforcedPolicyKey,
  getPolicyPrincipalIdentity,
  applyStampReadToState,
  parseCachedResponse,
  serverBodyOf,
  federationProfileKey,
  principalPathKey,
  principalEvidenceKey,
  getArtifactCreateNotice,
  isSessionVerdictFromServerFetch,
  isSessionVerdictDisowned,
  isPolicyEnforcedOrHintedByRefusedCache,
  isPolicyVerdictAbsent,
  policyKeyLabel,
  policyDeniedHint,
  isPolicyVerdictUnobtainable,
  isPrincipalSeenUnderHipaa,
  rowPrincipalStamp,
  projectPolicyLimitsBody,
  isPolicyAllowedInResponse,
  isDeniedOnlyByLatch,
  hasNameableComplianceTaint,
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
  areComplianceTaintsSettled,
  CLIENT_POLICY_KEYS,
  DENIED_ON_FAIL_OPEN_VERDICT,
  FAIL_CLOSED_ON_MISS,
  RELEASED_ON_SETTLED_MISS,
  TAINT_HARD_BLOCKED_POLICIES,
  autoDefaultVerdictState,
  clientPolicyKeySpec,
  commandPolicyGateAllows,
  getCoreSkillsFromCache,
  getHipaaEvidence,
  getRememberedCoreSkills,
  hasHipaaEvidenceForPrincipal,
  isClientDerivedPolicyKey,
  isPolicyEnforced,
  isRowOfAnotherPrincipal,
  isServerPopulatedPolicyKey,
  isSessionVerdictUnattributed,
  isUnblockedTranscriptScanKey,
  isWithheldFromUnverifiedClaudeAiLogin,
};

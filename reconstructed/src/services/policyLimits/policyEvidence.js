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
  fe,
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
import { eEe, Tur, stampToHipaaEvidence, readPolicyStampSync, tokenDigest } from "./cacheStamp.js";
import { yOt, trustedPrincipal } from "../../utils/settings/policyCertificates.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { safeParseJSON } from "../../utils/json.js";
import {
  PolicyLimitsResponseSchema,
  getLatchedTaints,
  getCurrentTaints,
  Cle,
  getComplianceTaints,
} from "./complianceTaints.js";
import { vxi, Axi, Txi, isGateAOn, kxi } from "../../utils/settings/settingsSourceTrust.js";
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
import { j } from "../../entrypoints/sdk/coreSchemas.js";
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
  rCi,
  Khr,
} from "./policyMessages.js";
import { hasCustomApiKeyHeader, hasCustomAuthorizationHeader } from "../api/customHeaders.js";
import { isActualFirstPartyAnthropicBaseUrl, getAPIProvider } from "../../utils/model/providers.js";
import { env } from "../../utils/env.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "../../constants/oauth.js";
import { isBareMode } from "../../utils/envUtils.js";

//@ chunk-55ht3bcx.js:22780-23028 placement
function markSessionVerdictUnattributed() {
  let e = getPolicyLimitsState(),
    n = !e.sessionVerdictDisowned;
  if (
    ((e.sessionAttributed = !1),
    (e.attributedBearerDigest = null),
    (e.attributedPrincipalIdentity = null),
    (e.sessionVerdictDisowned = !0),
    (e.evidenceRereadForBearer = void 0),
    n)
  )
    (e.cacheRevision++, e.emitVerdictChanged());
}
//@ chunk-55ht3bcx.js:23028-23082 placement
function getPolicyPrincipalIdentity() {
  let e = getPolicyPrincipal();
  return e === null ? null : eEe(e);
}
//@ chunk-55ht3bcx.js:23082-23155 placement
function getPolicyStoredCopyTrust() {
  let storedCopyTrust = getPolicyLimitsState().storedCopyTrust;
  return storedCopyTrust === "not_asked" ? storedCopyTrust : yOt(storedCopyTrust);
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
  let e = getPolicyLimitsState();
  if (!e.hipaaEvidenceLoaded) applyStampReadToState(ye());
  return e.hipaaEvidence;
}
//@ chunk-55ht3bcx.js:23378-23540 placement
function applyStampReadToState(e) {
  let n = getPolicyLimitsState();
  if (((n.hipaaEvidenceLoaded = !Tur(e)), e.kind === "ok")) n.hipaaEvidence = stampToHipaaEvidence(e.stamp);
  else if (e.kind === "unusable" && !Tur(e)) n.hipaaSeenUnreadable = !0;
}
//@ chunk-55ht3bcx.js:23540-23578 placement
function ye() {
  return isPolicyCacheMemoryOnly() ? fe : readPolicyStampSync(getCachePath());
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
    (logForDebugging(
      `Policy limits: principal unreadable for the evidence tier (${errorMessage(error)}); judged on the machine's evidence`,
      { level: "error" },
    ),
      (e = { kind: "token", descriptor: "token:unreadable", unclassified: !0 }));
  }
  if (e === null || e.admitsOnly === !0) {
    let oauthPrincipalMemo = getPolicyLimitsState().oauthPrincipalMemo;
    if (e === null && (!oauthPrincipalMemo?.daemonSnapshotWorker || oauthPrincipalMemo.principal !== null))
      return !1;
    let l = getHipaaEvidence();
    return l.seen.length > 0 || l.incomplete;
  }
  let n = getHipaaEvidence();
  if (G(e)) {
    let s = e.storedLoginOrgless === !0 && e.unclassified !== !0 && n.ruledOut.includes(eEe(e));
    return n.seen.length > 0 || (n.incomplete && !s);
  }
  let r = eEe(e);
  return n.seen.includes(r) || (n.incomplete && !n.ruledOut.includes(r));
}
//@ chunk-55ht3bcx.js:24246-24314 placement
function G(e) {
  return e.unclassified === !0 || e.storedLoginOrgless === !0;
}
//@ chunk-55ht3bcx.js:24314-24453 placement
function recordPersistedPolicyCache(e, n, r) {
  let s = getPolicyLimitsState();
  ((s.diskBodyChecksum = e),
    (s.diskConfirmedAtMs = r),
    (s.hipaaEvidence = n),
    (s.hipaaEvidenceLoaded = !0),
    (s.diskRefusedAtMs = null));
}
//@ chunk-55ht3bcx.js:24453-24620 placement
function takeUpHipaaEvidenceLeftOnDisk(e) {
  let n = getPolicyLimitsState(),
    { hipaaEvidence: hipaaEvidence, hipaaSeenUnreadable: hipaaSeenUnreadable } = n;
  if (
    (applyStampReadToState(e),
    hipaaSeenUnreadable !== n.hipaaSeenUnreadable || !sameHipaaEvidence(hipaaEvidence, n.hipaaEvidence))
  )
    (n.cacheRevision++, n.emitVerdictChanged());
}
//@ chunk-55ht3bcx.js:24620-24822 placement
function sameHipaaEvidence(e, n) {
  return (
    e.incomplete === n.incomplete &&
    e.seen.length === n.seen.length &&
    e.seen.every((r, s) => r === n.seen[s]) &&
    e.ruledOut.length === n.ruledOut.length &&
    e.ruledOut.every((r, s) => r === n.ruledOut[s])
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
  let e = getPolicyLimitsState();
  ((e.diskBodyChecksum = null),
    (e.diskConfirmedAtMs = null),
    (e.diskRefusedAtMs = null),
    (e.hipaaEvidenceLoaded = !1),
    (e.lastStampVerdict = "none"),
    (e.lastStampMatchedIdentity = null),
    (e.storedCopyTrust = "not_asked"),
    e.dropHintedTaints());
}
//@ chunk-55ht3bcx.js:25140-25205 placement
function parseCachedResponse(e) {
  let n = projectPolicyLimitsBody(safeParseJSON(e, !1));
  return n.success ? n.data : null;
}
//@ chunk-55ht3bcx.js:25205-25224 placement
var weakMap = new WeakMap();
//@ chunk-55ht3bcx.js:25224-25303 placement
function projectPolicyLimitsBody(e) {
  let safeParse = PolicyLimitsResponseSchema().safeParse(e);
  if (safeParse.success) weakMap.set(safeParse.data, e);
  return safeParse;
}
//@ chunk-55ht3bcx.js:25303-25339 placement
function serverBodyOf(e) {
  return weakMap.get(e) ?? e;
}
//@ chunk-55ht3bcx.js:25339-25450 placement
function seedSessionCacheFromPrime(e, n) {
  let r = getPolicyLimitsState();
  if (((r.storageV5 = e), n !== null && r.sessionCache === null && !r.diskAdoptionSuppressed))
    installDiskDerivedVerdict(n);
}
//@ chunk-55ht3bcx.js:25450-30842 placement
var CLIENT_POLICY_KEYS = {
  allow_product_feedback: {
    deniedUnder: ["hipaa", "zdr"],
    serverPopulated: !0,
    onCacheMiss: "deny",
    label: "Feedback",
    verb: "is",
    requirementId: "HIPAA-R1",
  },
  allow_web_fetch: {
    deniedUnder: ["hipaa"],
    serverPopulated: !0,
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
    serverPopulated: !0,
    onCacheMiss: "allow",
    label: "Claude in Chrome",
    verb: "is",
    requirementId: "HIPAA-R34",
  },
  allow_remote_sessions: {
    deniedUnder: ["hipaa"],
    serverPopulated: !0,
    onCacheMiss: "deny",
    label: "Cloud sessions",
    verb: "are",
    requirementId: "HIPAA-R6",
  },
  allow_remote_control: {
    deniedUnder: ["hipaa"],
    serverPopulated: !0,
    onCacheMiss: "deny",
    label: "Remote Control",
    verb: "is",
    requirementId: "HIPAA-R6",
  },
  allow_cobalt_plinth: {
    deniedUnder: ["hipaa", "zdr"],
    serverPopulated: !0,
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
    serverPopulated: !0,
    onCacheMiss: "deny",
    label: "Account skills sync",
    verb: "is",
    requirementId: "HIPAA-R29",
  },
  allow_account_plugins_sync: {
    deniedUnder: ["hipaa"],
    serverPopulated: !0,
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
    transcriptScan: !0,
    onCacheMiss: "deny",
    label: "Usage patterns",
    verb: "are",
    requirementId: "HIPAA-R31",
  },
  allow_skill_doctor_transcript_scan: {
    deniedUnder: ["hipaa"],
    transcriptScan: !0,
    onCacheMiss: "deny",
    label: "Skill token counts",
    verb: "are",
    requirementId: "HIPAA-R32",
  },
  allow_insights: {
    deniedUnder: ["hipaa"],
    transcriptScan: !0,
    onCacheMiss: "deny",
    label: "Insights",
    verb: "are",
    requirementId: "HIPAA-R40",
  },
  allow_stats_transcript_scan: {
    deniedUnder: ["hipaa"],
    transcriptScan: !0,
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
  return isClientDerivedPolicyKey(e) ? CLIENT_POLICY_KEYS[e] : void 0;
}
//@ chunk-55ht3bcx.js:30930-30956 placement
var ue = new Set(["hipaa"]);
//@ chunk-55ht3bcx.js:30956-31016 placement
function isServerPopulatedPolicyKey(e) {
  return clientPolicyKeySpec(e)?.serverPopulated === !0 && !vxi();
}
//@ chunk-55ht3bcx.js:31016-31075 placement
function isUnblockedTranscriptScanKey(e) {
  return clientPolicyKeySpec(e)?.transcriptScan === !0 && !Axi();
}
//@ chunk-55ht3bcx.js:31075-31124 placement
function b() {
  return Object.keys(CLIENT_POLICY_KEYS).filter(isClientDerivedPolicyKey);
}
//@ chunk-55ht3bcx.js:31124-31205 placement
function policyKeyLabel(e) {
  let n = clientPolicyKeySpec(e);
  return { featureLabel: n?.label ?? e, verb: n?.verb ?? "is" };
}
//@ chunk-55ht3bcx.js:31205-31638 placement
var TAINT_DISABLED_POLICIES = b().flatMap((e) =>
    (clientPolicyKeySpec(e)?.deniedUnder ?? []).map((n) => [n, e]),
  ),
  TAINT_HARD_BLOCKED_POLICIES = b().flatMap((e) =>
    (clientPolicyKeySpec(e)?.hardBlockUnder ?? []).map((n) => [n, e]),
  ),
  FAIL_CLOSED_ON_MISS = new Set(b().filter((e) => clientPolicyKeySpec(e)?.onCacheMiss !== "allow")),
  RELEASED_ON_SETTLED_MISS = new Set(b().filter((e) => clientPolicyKeySpec(e)?.onCacheMiss === "hold")),
  DENIED_ON_FAIL_OPEN_VERDICT = new Set(
    b().filter((e) => clientPolicyKeySpec(e)?.onFailOpenVerdict === "deny"),
  ),
  Be = new Set(["allow_product_feedback"]),
  _e = new Set(["allow_web_fetch", "allow_design_sync", "allow_channels", ...[]]);
//@ chunk-55ht3bcx.js:31638-31683 placement
function isClientOnlyEgressKeyWithheld(e) {
  let n = shouldRereadEvidence(e);
  return isWithheldFromUnverifiedClaudeAiLogin(e) || n;
}
//@ chunk-55ht3bcx.js:31683-31993 placement
function isWithheldFromUnverifiedClaudeAiLogin(e) {
  if (!_e.has(e) || Txi() || !isPolicyLimitsEligible()) return !1;
  let n = getPolicyLimitsState();
  if (n.sessionCache !== null && !n.failOpenVerdict && !n.sessionVerdictDisowned) return !1;
  let r;
  try {
    (getPolicyPrincipal(), (r = n.principalRung));
  } catch {
    return !0;
  }
  if (r === "wif" && isClaudeAISubscriber()) return !0;
  if (r === "none" && effectiveAuthTokenEnv() !== void 0 && isGateAOn()) return !1;
  return r === "oauth" || r === "tunnel" || r === "none";
}
/**
 * 是否需要重新读取策略证据（bearer 变化）。
 */
//@ chunk-55ht3bcx.js:31993-32326 placement
function shouldRereadEvidence(e) {
  if (!_e.has(e) || !isPolicyLimitsEligible() || kxi()) return !1;
  let n = getPolicyLimitsState();
  if (n.sessionCache !== null && n.sessionAttributed) {
    let r = j();
    if (r !== null && r === n.attributedBearerDigest) return !1;
    if (n.evidenceRereadForBearer !== r) ((n.evidenceRereadForBearer = r), (n.hipaaEvidenceLoaded = !1));
    let s = getHipaaEvidence();
    if ((s.seen.length === 0 && !s.incomplete) || !ze()) return !1;
  }
  return hasHipaaEvidenceForPrincipal();
}
//@ chunk-55ht3bcx.js:32326-32393 placement
function ze() {
  try {
    let e = getPolicyPrincipal();
    return e !== null && G(e);
  } catch {
    return !0;
  }
}
//@ chunk-55ht3bcx.js:32393-33022 placement
function isPolicyAllowed(e) {
  let n = getResponseFromCache();
  if (isUnblockedTranscriptScanKey(e)) {
    let r = n?.restrictions[e];
    if (r) return r.allowed;
    return !(isPolicyLimitsEligible() && getPolicyLimitsState().hintedDeniedKeys.includes(e));
  }
  if (!n) {
    if (FAIL_CLOSED_ON_MISS.has(e)) {
      if (
        isPolicyLimitsEligible() &&
        !(RELEASED_ON_SETTLED_MISS.has(e) && isPolicyVerdictUnobtainable() && !isPrincipalSeenUnderHipaa())
      )
        return !1;
      if (
        Be.has(e) &&
        isEssentialTrafficOnly() &&
        !(e === "allow_product_feedback" && isFeedbackSurveyForOtel())
      )
        return !1;
    }
    if (isDisabledByTaint(e, getLatchedTaints())) return !1;
    if (isClientOnlyEgressKeyWithheld(e)) return !1;
    let r = getPolicyLimitsState();
    if (r.hintedDeniedKeys.length === 0 && r.hintedTaints.length === 0) return !0;
    if (!isPolicyLimitsEligible()) return !0;
    if (r.hintedDeniedKeys.includes(e)) return !1;
    return isPolicyAllowedInResponse({ restrictions: {}, compliance_taints: [] }, e, r.hintedTaints);
  }
  if (
    RELEASED_ON_SETTLED_MISS.has(e) &&
    isPolicyVerdictAbsent() &&
    !(isPolicyVerdictUnobtainable() && !isPrincipalSeenUnderHipaa())
  )
    return !1;
  if (DENIED_ON_FAIL_OPEN_VERDICT.has(e) && isPolicyVerdictAbsent()) return !1;
  if (isClientOnlyEgressKeyWithheld(e)) return !1;
  return !isPolicyDeniedForKey(e, n);
}
//@ chunk-55ht3bcx.js:33022-33295 placement
function isPolicyDeniedForKey(e, n) {
  let r = getPolicyLimitsState();
  if (n.restrictions[e] === void 0 && r.hintedDeniedKeys.includes(e)) return !0;
  let sessionFromServerFetch = r.sessionFromServerFetch;
  return !isPolicyAllowedInResponse(
    { restrictions: n.restrictions, compliance_taints: sessionFromServerFetch ? n.compliance_taints : [] },
    e,
    [...getLatchedTaints(), ...r.hintedTaints, ...(sessionFromServerFetch ? [] : n.compliance_taints)],
  );
}
//@ chunk-55ht3bcx.js:33295-33594 placement = PolicyLimitsResponseSchema (0.452)
function isPolicyAllowedInResponse(e, n, r = []) {
  let compliance_taints = e.compliance_taints;
  if (
    TAINT_HARD_BLOCKED_POLICIES.some(([c, y]) => y === n && (compliance_taints.includes(c) || r.includes(c)))
  )
    return !1;
  let l = e.restrictions[n];
  if (l) return l.allowed;
  if (isUnblockedTranscriptScanKey(n)) return !0;
  let f = isServerPopulatedPolicyKey(n)
    ? [
        ...r.filter((c) => !(ue.has(c) && compliance_taints.includes(c))),
        ...compliance_taints.filter((c) => !ue.has(c)),
      ]
    : [...r, ...compliance_taints];
  return !isDisabledByTaint(n, f);
}
//@ chunk-55ht3bcx.js:33594-33942 placement
function isUnrestrictiveBody(e) {
  if (
    e.compliance_taints.some((compliance_taint) =>
      TAINT_DISABLED_POLICIES.some(([r]) => r === compliance_taint),
    )
  )
    return !1;
  if (
    Object.keys(e.defaults ?? {}).length > 0 ||
    (e.monitoring_notice !== null && e.monitoring_notice !== void 0) ||
    (e.artifact_create_notice !== null && e.artifact_create_notice !== void 0)
  )
    return !1;
  return Object.entries(e.restrictions).every(([n, r]) => (N(n) ? r?.allowed !== !0 : r?.allowed !== !1));
}
//@ chunk-55ht3bcx.js:33942-34014 placement
function N(e) {
  return e.startsWith("enforce_") || e.startsWith("require_");
}
//@ chunk-55ht3bcx.js:34014-34116 placement
function isDisabledByTaint(e, n) {
  if (n.length === 0) return !1;
  for (let [r, s] of TAINT_DISABLED_POLICIES) if (s === e && n.includes(r)) return !0;
  return !1;
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
    return !1;
  }
  if (e === null || G(e)) return !1;
  return getHipaaEvidence().seen.includes(eEe(e));
}
//@ chunk-55ht3bcx.js:34791-34922 placement
function commandPolicyGateAllows(e) {
  if (!isClientDerivedPolicyKey(e))
    return (
      logForDebugging(`[policy] policyGate names unknown policy key "${e}"; denying`, { level: "warn" }),
      !1
    );
  return isPolicyAllowed(e);
}
//@ chunk-55ht3bcx.js:34922-34994 placement
function isPolicyVerdictAbsent() {
  if (!isPolicyLimitsEligible()) return !1;
  return getResponseFromCache() === null || getPolicyLimitsState().failOpenVerdict;
}
//@ chunk-55ht3bcx.js:34994-35055 placement
function isSessionVerdictFromServerFetch() {
  return getResponseFromCache() !== null && getPolicyLimitsState().sessionFromServerFetch;
}
//@ chunk-55ht3bcx.js:35055-35462 placement
function isSessionVerdictUnattributed() {
  if (!isPolicyLimitsEligible()) return !1;
  let e = getPolicyLimitsState();
  if (!e.sessionAttributed) return !0;
  let n = envBearerVerdictOnWire();
  if (n === "replaced" || n === "gone") return !0;
  if (e.attributedBearerDigest !== null && j() !== e.attributedBearerDigest && storedLoginAccountNeedsRead())
    return !0;
  if (getPolicyLimitsTunnelSocket() !== void 0) return !1;
  try {
    return isRowOfAnotherPrincipal(e.attributedPrincipalIdentity);
  } catch (error) {
    return (
      logForDebugging(
        `Policy limits: principal unreadable for attribution (${errorMessage(error)}); held as unattributed`,
        { level: "error" },
      ),
      !0
    );
  }
}
//@ chunk-55ht3bcx.js:35462-35601 placement
function principalEvidenceKey() {
  let e = getPolicyLimitsState();
  if (e.principalRung === "tunnel") return `tunnel:${e.tunnelEpochHeard ?? "unheard"}`;
  let n = principalIdentityKey() || getCredentialIndependentIneligibleReason();
  return n ? We(n) : UNREADABLE_PRINCIPAL;
}
/**
 * 策略主体身份键（wif、helper、令牌）。
 */
//@ chunk-55ht3bcx.js:35601-35909 placement
function principalIdentityKey() {
  let e = getPolicyLimitsState();
  if (e.principalRung === "wif") {
    let s = e.wifAccountDiverged ? void 0 : getWIFFederationIdentity();
    return s && [s.organizationId, s.federationRuleId, s.workspaceId ?? ""].join("\x00");
  }
  let n = getClaudeAIOAuthTokens(),
    r = effectiveAuthTokenEnv();
  return e.principalRung === "helper"
    ? getAnthropicApiKeyWithSource().key
    : r && !hasInferenceScope({ anthropicAuthEnabled: isAnthropicAuthEnabled(), oauthScopes: n?.scopes })
      ? r
      : n?.accessToken;
}
//@ chunk-55ht3bcx.js:35909-35972 placement
function We(e) {
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
function noteTunnelEpochHeard(e) {
  getPolicyLimitsState().tunnelEpochHeard = e;
}
//@ chunk-55ht3bcx.js:36087-36136 placement
function isSessionVerdictDisowned() {
  return getPolicyLimitsState().sessionVerdictDisowned;
}
//@ chunk-55ht3bcx.js:36136-36302 placement
function isPolicyVerdictUnobtainable() {
  if (!isPolicyVerdictAbsent()) return !1;
  let e = getPolicyLimitsState();
  if (e.settledWithoutVerdictFor === null) return !1;
  let n;
  try {
    n = getPolicyPrincipalIdentity();
  } catch {
    return !1;
  }
  return e.settledWithoutVerdictFor === (n ?? "");
}
//@ chunk-55ht3bcx.js:36302-36512 placement
function isPrincipalSeenUnderHipaa() {
  let e;
  try {
    e = getPolicyPrincipal();
  } catch {
    return !0;
  }
  if (e === null || e.unclassified || e.admitsOnly) return !0;
  let n = getPolicyLimitsState();
  if (!n.hipaaSeenUnreadable) applyStampReadToState(ye());
  let r = hasHipaaEvidenceForPrincipal();
  return n.hipaaSeenUnreadable || !n.hipaaEvidenceLoaded || r;
}
//@ chunk-55ht3bcx.js:36512-36576 placement
function isPolicyRouteMissing() {
  if (!isPolicyLimitsEligible() || getResponseFromCache() !== null || isAnthropicHosted()) return !1;
  return V();
}
//@ chunk-55ht3bcx.js:36576-36664 placement
function V() {
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
  return Cle(getComplianceTaints()).length > 0;
}
//@ chunk-55ht3bcx.js:36931-37221 placement
function policyDenyKind(e) {
  if (isPolicyAllowed(e)) return null;
  if (isDeniedOnlyByLatch(e)) return "latched";
  let n = getResponseFromCache();
  if (n !== null) {
    if (
      (RELEASED_ON_SETTLED_MISS.has(e) ||
        (DENIED_ON_FAIL_OPEN_VERDICT.has(e) && !isPolicyDeniedForKey(e, n))) &&
      isPolicyVerdictAbsent()
    )
      return V() ? "route_missing" : "cache_miss";
    if (!isClientOnlyEgressKeyWithheld(e)) return "org_denied";
    return V() && !isAnthropicHosted() ? "route_missing" : "cache_miss";
  }
  return isPolicyRouteMissing() ? "route_missing" : "cache_miss";
}
//@ chunk-55ht3bcx.js:37221-37327 placement
function isDeniedOnlyByLatch(e) {
  if (!isDisabledByTaint(e, getLatchedTaints()) || isDisabledByTaint(e, getCurrentTaints())) return !1;
  if (getResponseFromCache() === null) return !0;
  return J()?.[e]?.allowed !== !1;
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
      return rCi();
    case "org_denied":
      return Khr(getCurrentTaints());
  }
}
//@ chunk-55ht3bcx.js:37537-38016 placement
function areComplianceTaintsSettled() {
  let e = envBearerVerdictOnWire();
  if (e !== null && e !== "same") return !1;
  if (
    hasCustomApiKeyHeader() ||
    hasCustomAuthorizationHeader() ||
    !isActualFirstPartyAnthropicBaseUrl() ||
    getAPIProvider() !== "firstParty" ||
    env.ANTHROPIC_UNIX_SOCKET !== void 0 ||
    getConfiguredApiKeyHelper() !== void 0 ||
    (effectiveAuthTokenEnv() !== void 0 &&
      !hasInferenceScope({
        anthropicAuthEnabled: isAnthropicAuthEnabled(),
        oauthScopes: getClaudeAIOAuthTokens()?.scopes,
      }) &&
      !(e === "same" && getResponseFromCache() !== null))
  )
    return !1;
  if (getResponseFromCache() !== null) return !0;
  let n = getClaudeAIOAuthTokens();
  return (
    (n?.subscriptionType === "pro" || n?.subscriptionType === "max") &&
    n.scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE) === !0 &&
    getClaudeAIOAuthTokenOrigin() === "store" &&
    !isSignInPinnedByMachine() &&
    !isBareMode() &&
    !getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).key &&
    !shouldUseWIFAuth()
  );
}
//@ chunk-55ht3bcx.js:38016-38161 placement
function isPolicyDeniedByRefusedCacheHint(e) {
  if (!isPolicyLimitsEligible()) return !1;
  let n = getPolicyLimitsState();
  return (
    n.hintedDeniedKeys.includes(e) ||
    !isPolicyAllowedInResponse({ restrictions: {}, compliance_taints: [] }, e, n.hintedTaints)
  );
}
//@ chunk-55ht3bcx.js:38161-38207 placement
function isPolicyEnforced(e) {
  return J()?.[e]?.allowed === !0;
}
//@ chunk-55ht3bcx.js:38207-38373 placement
function isPolicyEnforcedOrHintedByRefusedCache(e) {
  let n = J();
  if (n?.[e]?.allowed === !0) return !0;
  let r = getPolicyLimitsState();
  return (
    r.hintedEnforcedKeys.includes(e) &&
    n?.[e] === void 0 &&
    (n === null || !r.sessionAttributed) &&
    isPolicyLimitsEligible()
  );
}
//@ chunk-55ht3bcx.js:38373-38450 placement
function getPolicyDefault(e) {
  let n = getResponseFromCache()?.defaults[e];
  return typeof n === "boolean" ? n : void 0;
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
  let e = getPolicyLimitsState();
  if (e.sessionCache) return e.sessionCache;
  if (e.diskAdoptionSuppressed) return null;
  let n = loadCachedResponse();
  if (n) return (installDiskDerivedVerdict(n), n);
  return null;
}
//@ chunk-55ht3bcx.js:38875-38927 placement
function isPolicyLimitsCacheLoaded() {
  if (!isPolicyLimitsEligible()) return !0;
  return getResponseFromCache() !== null;
}
//@ chunk-55ht3bcx.js:38927-38972 placement
function J() {
  return getResponseFromCache()?.restrictions ?? null;
}
//@ chunk-55ht3bcx.js:38972-39106 placement
function federationProfileKey(e) {
  if (e === "env-quad") return env.ANTHROPIC_FEDERATION_RULE_ID?.trim() ?? "";
  let n = resolveConfigDir();
  return n === null || e === null ? "" : q(n, resolveLiveProfileName(n));
}
//@ chunk-55ht3bcx.js:39106-39160 placement
function q(e, n) {
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
  N,
  getPolicyPrincipalIdentity,
  applyStampReadToState,
  parseCachedResponse,
  serverBodyOf,
  federationProfileKey,
  q,
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

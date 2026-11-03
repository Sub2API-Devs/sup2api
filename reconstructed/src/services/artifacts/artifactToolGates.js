/**
 * services/artifacts/artifactToolGates.ts
 *
 * 2.1.316 新增：Artifact 工具集开关与文档清单
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (12), chunk-4xpk3fhh.js (67)
 * attribution: placement 79
 */
import {
  TRUSTED_SETTING_SOURCES,
  getDurablePolicyTierSettings,
  isPolicySlotAdminOrParentComposed,
  REPO_SETTING_SOURCES,
  getAllPolicyTierSettings,
  getSettingsForSource,
  getLegacyLocalSettingsOverlay,
  projectSettingsAliasesUserSettings,
  getAdminTierEnvValue,
} from "../../utils/settings/settings.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { env } from "../../utils/env.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { getLatchedPreSettingsEnvSnapshot, getAppliedGlobalConfigEnv } from "../../utils/managedEnvApply.js";
import { hasEmbeddedSearchTools_2 } from "../../utils/embeddedTools.js";
import {
  getSessionEntrypoint,
  isTopHostSession,
  isClaudecodeSession,
  coworkFrameArtifacts,
  isLocalAgentTopSession,
} from "../../utils/sessionShape.js";
import {
  isCoworkSession,
  isCoworkAny,
  getEntrypointKind,
  isHostEntrypoint,
} from "../../utils/entrypointKinds.js";
import { artifactHostUnreachable } from "./hostEgressProbe.js";
import { isFramePublicReadEnabled } from "./frameFlags.js";
import { PERSON } from "./consentClasses.js";
import { getShareEntry } from "./shareEntries.js";
import { hasAnyGatewayCredential, isApiKeyGatewaySession } from "../../utils/gatewayCredential.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import {
  getArtifactPublishStubDir,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import {
  getPolicyLimitsIneligibleReason,
  getLastFetchOutcome,
  isTransientFetchFailure,
  isPolicyLimitsEligible,
} from "../policyLimits/policyState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { hasOpusAccess_2, getSubscriptionType, getStoredOAuthSubscriptionType } from "../../utils/auth.js";
import {
  policyDenyKind,
  isPolicyDeniedByRefusedCacheHint,
  getResponseFromCache,
  isPolicyRouteMissing,
  isPolicyAllowed,
} from "../policyLimits/policyEvidence.js";
import { getLiveState, hasLiveState } from "../liveReplica/liveReplica.js";
import { mergedCommandNames } from "../../utils/settings/commandSyncNames.js";
import { fromEnum, lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { policyCacheStatus } from "../policyLimits/policyFetchStatus.js";
import { logEvent } from "../analytics/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, u, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { LIVE_DOC, INDEX_HTML } from "./textSanitize.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { fromParentArtifactInput } from "./artifactToolActions.js";

//@ chunk-4xpk3fhh.js:11176-11814 placement
/**
 * 逐层（env/用户/项目/本地/策略设置）解析 Artifact 开关，返回是否启用、关闭来源与用户是否可控。
 */
function resolveArtifactSetting(e) {
  let n = [];
  if (e.envDisableVar !== undefined && isEnvSetAnywhere(e.envDisableVar))
    n.push({
      layer: "env",
      via: "envVar",
    });
  let r;
  for (let l of TRUSTED_SETTING_SOURCES) {
    let settingsLayersForGate = getSettingsLayersForGate(l, e);
    collectGateDisables(
      n,
      l,
      l === "policySettings"
        ? [...settingsLayersForGate, ...getDurablePolicyTierSettings()]
        : settingsLayersForGate,
      e,
    );
    if (
      r === undefined &&
      settingsLayersForGate.some((h) => h?.[e.enableKey] === true) &&
      (l !== "policySettings" || isPolicySlotAdminOrParentComposed())
    )
      r = l;
  }
  let any = n.some((l) => l.layer === "env" || l.layer === "policySettings" || l.layer === "flagSettings");
  for (let l of REPO_SETTING_SOURCES) collectGateDisables(n, l, getSettingsLayersForGate(l, e), e);
  let any_2 = n.some((l) => l.layer === "localSettings" || l.layer === "projectSettings");
  return {
    enabled: n.length === 0 && (e.defaultOn || r !== undefined),
    decidedBy: n[0]?.layer ?? r ?? "default",
    offSources: n,
    lockedAboveUser: any,
    userControllable: !any && !any_2 && isSettingSourceEnabled("userSettings"),
  };
}
//@ chunk-4xpk3fhh.js:11814-12044 placement
/**
 * 取某个设置来源用于开关判定的设置对象列表：policy 含全部策略层；local 含旧版本地覆盖；项目设置只是用户设置别名且自身声明了开关时跳过（避免重复）。
 */
function getSettingsLayersForGate(e, n) {
  if (e === "policySettings") return [...getAllPolicyTierSettings(), getSettingsForSource("policySettings")];
  if (!isSettingSourceEnabled(e)) return [];
  if (e === "localSettings") return [getSettingsForSource(e), getLegacyLocalSettingsOverlay()];
  let settingsForSource = getSettingsForSource(e);
  if (
    e === "projectSettings" &&
    declaresGateKey(settingsForSource, n) &&
    isSettingSourceEnabled("userSettings") &&
    projectSettingsAliasesUserSettings()
  )
    return [];
  return [settingsForSource];
}
//@ chunk-4xpk3fhh.js:12044-12157 placement
function declaresGateKey(settingsForSource, n) {
  return (
    settingsForSource?.[n.enableKey] !== undefined ||
    (n.legacyDisableKey !== undefined && settingsForSource?.[n.legacyDisableKey] !== undefined)
  );
}
//@ chunk-4xpk3fhh.js:12157-12355 placement
function collectGateDisables(e, layer, r, o) {
  if (r.some((f) => f?.[o.enableKey] === false))
    e.push({
      layer,
      via: "enableKey",
    });
  let legacyDisableKey = o.legacyDisableKey;
  if (legacyDisableKey !== undefined && r.some((f) => f?.[legacyDisableKey] === true))
    e.push({
      layer,
      via: "legacyDisableKey",
    });
}
//@ chunk-4xpk3fhh.js:12355-12522 placement
/**
 * 判断某个环境变量在任何地方被设为真：进程 env、设置加载前快照、管理员层、全局配置 env，或启用的 flag/user 设置 env。
 */
function isEnvSetAnywhere(envDisableVar) {
  if (
    env[envDisableVar] ||
    isEnvTruthy(getEnvCaseInsensitive(getLatchedPreSettingsEnvSnapshot(), envDisableVar)) ||
    isEnvTruthy(getAdminTierEnvValue(envDisableVar)) ||
    isEnvTruthy(getEnvCaseInsensitive(getAppliedGlobalConfigEnv(), envDisableVar))
  )
    return true;
  for (let n of ["flagSettings", "userSettings"])
    if (
      isSettingSourceEnabled(n) &&
      isEnvTruthy(getEnvCaseInsensitive(getSettingsForSource(n)?.env, envDisableVar))
    )
      return true;
  return false;
}
//@ chunk-4xpk3fhh.js:12522-12765 placement
function getEnvCaseInsensitive(e, n) {
  if (e === undefined) return;
  if (n in e) return e[n];
  let r = weakMap.get(e);
  if (r?.has(n)) return r.get(n);
  let o = Object.entries(e).find(([key]) => key.toUpperCase() === n)?.[1];
  if (Object.isFrozen(e))
    if (r) r.set(n, o);
    else weakMap.set(e, new Map([[n, o]]));
  return o;
}
//@ chunk-4xpk3fhh.js:12765-12783 placement
var weakMap = new WeakMap();
//@ chunk-4xpk3fhh.js:12783-12920 placement
var ARTIFACT_GATE_KEYS = {
  enableKey: "enableArtifact",
  legacyDisableKey: "disableArtifact",
  defaultOn: true,
};
var ARTIFACT_GATE_SPEC = {
  ...ARTIFACT_GATE_KEYS,
  envDisableVar: "CLAUDE_CODE_DISABLE_ARTIFACT",
};
//@ chunk-4xpk3fhh.js:12920-12947 placement
function resolveArtifactEnableSetting() {
  return resolveArtifactSetting(ARTIFACT_GATE_SPEC);
}
//@ chunk-4xpk3fhh.js:12947-12981 placement
/**
 * 判断 Artifact 总开关（用户设置）是否关闭。
 */
function isArtifactSwitchedOff() {
  return !resolveArtifactEnableSetting().enabled;
}
//@ chunk-4xpk3fhh.js:12981-13057 placement
function isArtifactSwitchedOffInSettings() {
  return (
    !resolveArtifactSetting(ARTIFACT_GATE_KEYS).enabled ||
    isEnvTruthy(getAdminTierEnvValue("CLAUDE_CODE_DISABLE_ARTIFACT"))
  );
}
//@ chunk-4xpk3fhh.js:13057-13159 placement
function isArtifactSdkDefaultOff() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    hasEmbeddedSearchTools_2() ||
    CLAUDE_CODE_ENTRYPOINT === "claude-code-github-action" ||
    CLAUDE_CODE_ENTRYPOINT === "mcp"
  );
}
//@ chunk-4xpk3fhh.js:13159-13237 placement
function isCoworkerEntrypoint(e) {
  return e === "local-agent" || e?.startsWith("claude-coworker") === true;
}
//@ chunk-4xpk3fhh.js:13237-13299 placement
function isCoworkFramePublishSession() {
  return (
    getSessionEntrypoint() === "local-agent" &&
    isTopHostSession() &&
    !isClaudecodeSession() &&
    coworkFrameArtifacts()
  );
}
//@ chunk-4xpk3fhh.js:13299-13338 placement
function isCoworkHostSession() {
  return (isCoworkSession() && isLocalAgentTopSession()) || isCoworkFramePublishSession();
}
//@ chunk-4xpk3fhh.js:13338-13365 placement
function othersArtifactReadConsentSurface() {
  return isCoworkAny();
}
//@ chunk-4xpk3fhh.js:13365-13413 placement
function othersArtifactReadIsUserOnly(e) {
  return e !== undefined && othersArtifactReadConsentSurface() && artifactHostUnreachable(e);
}
//@ chunk-4xpk3fhh.js:13413-13462 placement
function othersReadIsUserOnly(e, n) {
  return !e && (othersArtifactReadIsUserOnly(n) || outsideOrgReadIsUserOnly(n.slug));
}
//@ chunk-4xpk3fhh.js:13462-13526 placement
function outsideOrgRead(shareEntry) {
  return shareEntry !== undefined && shareEntry.outsideOrgReader === true && isFramePublicReadEnabled();
}
//@ chunk-4xpk3fhh.js:13526-13573 placement
function outsideOrgReadIsUserOnly(slug) {
  return PERSON === "person" && outsideOrgRead(getShareEntry(slug));
}
//@ chunk-4xpk3fhh.js:13573-13609 placement
function otherOrgCopySource(shareEntry) {
  return outsideOrgRead(shareEntry) || invitedCopySource(shareEntry);
}
//@ chunk-4xpk3fhh.js:13609-13666 placement
function invitedCopySource(e) {
  return e !== undefined && e.external === true && isFramePublicReadEnabled();
}
//@ chunk-4xpk3fhh.js:13666-13782 placement
function placedInOwnOrg(shareEntry) {
  return (
    shareEntry !== undefined &&
    shareEntry.probeFailed !== true &&
    shareEntry.external !== true &&
    (shareEntry.outsideOrgReader === false || shareEntry.role === "owner")
  );
}
//@ chunk-4xpk3fhh.js:13782-13875 placement = isAnalyticsToolDetailsLoggingEnabled (0.772)
function isAnalyticsToolDetailsLoggingEnabled() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  if (CLAUDE_CODE_ENTRYPOINT === "local-agent" && isCoworkFramePublishSession()) return false;
  return isCoworkerEntrypoint(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-4xpk3fhh.js:13875-13912 placement
function isArtifactReadOnlySurface() {
  return isCoworkerEntrypoint(getSessionEntrypoint()) && !isCoworkFramePublishSession();
}
//@ chunk-4xpk3fhh.js:13912-13945 placement
function isArtifactToolsReady() {
  return hasAnyGatewayCredential() && isArtifactProviderAvailable();
}
//@ chunk-4xpk3fhh.js:13945-13977 placement
function isArtifactProviderAvailable() {
  return getArtifactProviderBlockReason() === null;
}
//@ chunk-4xpk3fhh.js:13977-14252 placement
/**
 * 返回 Artifact 因环境不可用的原因：第三方提供商、仅必要流量、CLAUDE_CODE_ARTIFACT 显式关闭、SDK 默认关闭（且未显式开启）；可用时返回 null。
 */
function getArtifactProviderBlockReason() {
  if (getAPIProvider() !== "firstParty") return "third_party_provider";
  if (isEssentialTrafficOnly()) return "essential_traffic_only";
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_ARTIFACT)) return "artifact_env_off";
  if (
    !isEnvTruthy(env.CLAUDE_CODE_ARTIFACT) &&
    !isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT) &&
    isArtifactSdkDefaultOff()
  )
    return "sdk_default_off";
  return null;
}
//@ chunk-4xpk3fhh.js:14252-14283 placement
function isArtifactEnvEnabled() {
  return hasAnyGatewayCredential() && isArtifactProviderUnblocked();
}
//@ chunk-4xpk3fhh.js:14283-14314 placement
function isArtifactProviderUnblocked() {
  return artifactProviderBlockReason() === null;
}
//@ chunk-4xpk3fhh.js:14314-14371 placement
function artifactProviderBlockReason() {
  if (isAnalyticsToolDetailsLoggingEnabled()) return "surface_excluded";
  return getArtifactProviderBlockReason();
}
//@ chunk-4xpk3fhh.js:14371-14413 placement
function isArtifactToolEligible() {
  if (isArtifactSwitchedOff()) return false;
  return isArtifactEnvEnabled();
}
//@ chunk-4xpk3fhh.js:14413-14516 placement
function shouldRefreshArtifactRoster() {
  return (
    env.CLAUDE_CODE_ARTIFACT_ASSETS === undefined &&
    isArtifactToolEnabled() &&
    getArtifactPublishStubDir() === null &&
    !env.CLAUDE_CODE_REMOTE
  );
}
//@ chunk-4xpk3fhh.js:14516-14596 placement
function isPolicyEligibleForArtifacts() {
  let policyLimitsIneligibleReason = getPolicyLimitsIneligibleReason();
  return (
    policyLimitsIneligibleReason === undefined ||
    policyLimitsIneligibleReason === "prosumer_oauth" ||
    policyLimitsIneligibleReason === "no_auth"
  );
}
//@ chunk-4xpk3fhh.js:14596-14678 placement
function isArtifactGrowthbookOn() {
  return (
    (isEnvTruthy(env.CLAUDE_CODE_ARTIFACT) && false) ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth", isPolicyEligibleForArtifacts())
  );
}
//@ chunk-4xpk3fhh.js:14678-14709 placement
function isArtifactAdminAllowedEnough() {
  return isArtifactGrowthbookOn() && isArtifactAdminAllowed();
}
//@ chunk-4xpk3fhh.js:14709-14741 placement
function isArtifactGrowthbookUnblocked() {
  return getArtifactGrowthbookBlockReason() === null;
}
//@ chunk-4xpk3fhh.js:14741-14866 placement
function getArtifactGrowthbookBlockReason() {
  if (!isArtifactGrowthbookOn()) return "growthbook_off";
  if (isApiKeyGatewaySession() || isArtifactAdminAllowed()) {
    clearArtifactPolicyFetchAnswer();
    return null;
  }
  if (artifactPolicyUnobtained() !== null) return null;
  return "admin_policy";
}
//@ chunk-4xpk3fhh.js:14866-15280 placement
function artifactPolicyUnobtained() {
  if (isApiKeyGatewaySession()) return null;
  if (!hasOpusAccess_2(getSubscriptionType())) return null;
  let e = policyDenyKind("allow_cobalt_plinth");
  if (e !== "cache_miss" && e !== "route_missing") {
    clearArtifactPolicyFetchAnswer();
    return null;
  }
  if (isPolicyDeniedByRefusedCacheHint("allow_cobalt_plinth")) return null;
  let cause = e === "route_missing" ? "policy_route_missing" : "policy_fetch_failed";
  let lastFetchOutcome = getLastFetchOutcome();
  if (lastFetchOutcome !== null && !lastFetchOutcome.success && shouldReportFetchFailure(lastFetchOutcome)) {
    getLiveState().artifactPolicyFetchAnswer = lastFetchOutcome;
    return {
      cause,
      outcome: lastFetchOutcome,
    };
  }
  let o = heldArtifactPolicyFetchAnswer();
  return o === null
    ? null
    : {
        cause,
        outcome: o,
      };
}
//@ chunk-4xpk3fhh.js:15280-15343 placement
function heldArtifactPolicyFetchAnswer() {
  return hasLiveState() ? getLiveState().artifactPolicyFetchAnswer : null;
}
//@ chunk-4xpk3fhh.js:15343-15485 placement
function artifactHeldPolicyDenyCause() {
  if (isPolicyDeniedByRefusedCacheHint("allow_cobalt_plinth")) return "org_denied";
  let e = policyDenyKind("allow_cobalt_plinth");
  return e === "org_denied" || e === "latched" ? e : null;
}
//@ chunk-4xpk3fhh.js:15485-15628 placement
function shouldReportFetchFailure(lastFetchOutcome) {
  if (!lastFetchOutcome.retrying) return true;
  if (
    (lastFetchOutcome.errorCode === "auth_failed" && lastFetchOutcome.httpStatus === 401) ||
    lastFetchOutcome.errorCode === "spurious_304"
  )
    return false;
  return !isTransientFetchFailure(lastFetchOutcome);
}
//@ chunk-4xpk3fhh.js:15628-15685 placement
function clearArtifactPolicyFetchAnswer() {
  if (hasLiveState()) getLiveState().artifactPolicyFetchAnswer = null;
}
//@ chunk-4xpk3fhh.js:15685-15752 placement
function isArtifactToolEnabled() {
  if (getArtifactPublishStubDir() !== null) return isArtifactToolRegistered();
  return hasAnyGatewayCredential() && isArtifactToolRegistered() && isArtifactAdminAllowed();
}
//@ chunk-4xpk3fhh.js:15752-15786 placement
function isArtifactToolRegistered() {
  return artifactToolWithholdingGate() === null;
}
//@ chunk-4xpk3fhh.js:15786-15872 placement
function artifactToolWithholdingGate() {
  if (isArtifactSwitchedOff()) return "switched_off";
  if (getArtifactPublishStubDir() !== null) return null;
  return artifactProviderBlockReason() ?? getArtifactGrowthbookBlockReason();
}
//@ chunk-4xpk3fhh.js:15872-15932 placement
function isArtifactReadEnabled() {
  if (isArtifactSwitchedOff()) return false;
  if (!isArtifactToolsReady()) return false;
  return isArtifactAdminAllowedEnough();
}
//@ chunk-4xpk3fhh.js:15932-16374 placement
function collectArtifactOffMechanisms() {
  let e = new Set();
  let n = false;
  let r = false;
  for (let offSource of resolveArtifactEnableSetting().offSources)
    switch (offSource.layer) {
      case "env":
        e.add("env");
        break;
      case "userSettings":
        e.add(offSource.via === "legacyDisableKey" ? "setting" : "config_pref");
        break;
      case "policySettings":
      case "flagSettings":
        n = true;
        break;
      case "localSettings":
      case "projectSettings":
        r = true;
        break;
    }
  if (n) {
    e.delete("setting");
    e.delete("config_pref");
  }
  if (e.size > 1) return "multiple";
  let [o] = e;
  if (o !== undefined) return o;
  return n || r ? "admin_managed" : null;
}
//@ chunk-4xpk3fhh.js:16374-16416 placement
function isArtifactFullyAvailable() {
  return collectArtifactOffMechanisms() !== null && isArtifactEnvEnabled() && isArtifactAdminAllowedEnough();
}
//@ chunk-4xpk3fhh.js:16416-16741 placement
function maybeLogArtifactDisabledSession() {
  let liveState = getLiveState();
  if (liveState.artifactDisabledSessionEvaluated) return;
  if (mergedCommandNames() === null) return;
  liveState.artifactDisabledSessionEvaluated = true;
  if (!isArtifactFullyAvailable()) return;
  let artifactOffMechanisms = collectArtifactOffMechanisms();
  if (artifactOffMechanisms === null) return;
  logArtifactTelemetry("tengu_artifact_disabled_session", {
    mechanism: fromEnum(artifactOffMechanisms),
    session_interactivity:
      !getIsNonInteractiveSession() || getEntrypointKind() === "claude-vscode" || isHostEntrypoint()
        ? lit("interactive")
        : lit("noninteractive"),
  });
}
//@ chunk-4xpk3fhh.js:16741-17498 placement
function maybeLogArtifactToolWithheld(e) {
  if (!coworkFrameArtifacts() || getSessionEntrypoint() !== "local-agent" || isClaudecodeSession()) return;
  let liveState = getLiveState();
  let r =
    e === null &&
    !isApiKeyGatewaySession() &&
    !isArtifactAdminAllowed() &&
    artifactPolicyUnobtained() !== null;
  let o = r ? "admin_policy" : e;
  if (o === null) {
    liveState.artifactRegisteredSeen = true;
    let last = liveState.artifactWithheldReasonsLogged.at(-1);
    if (last === undefined || liveState.artifactWithheldRecoveryLogged) return;
    liveState.artifactWithheldRecoveryLogged = true;
    logArtifactTelemetry("tengu_artifact_tool_recovered", {
      withheld_reason: fromEnum(last),
      ...describePolicyFetchState(last),
    });
    return;
  }
  if (mergedCommandNames() === null) return;
  let withheldReason = resolveWithheldReason(o);
  let included = liveState.artifactWithheldReasonsLogged.includes(withheldReason);
  if (included && (!r || liveState.artifactWithheldListedLogged)) return;
  if (!included) liveState.artifactWithheldReasonsLogged.push(withheldReason);
  if (r) liveState.artifactWithheldListedLogged = true;
  logArtifactTelemetry("tengu_artifact_tool_withheld", {
    reason: fromEnum(withheldReason),
    off_mechanism: fromEnumOpt(withheldReason === "switched_off" ? collectArtifactOffMechanisms() : null),
    after_registered: liveState.artifactRegisteredSeen,
    tool_listed: r,
    ...describePolicyFetchState(withheldReason),
  });
}
//@ chunk-4xpk3fhh.js:17498-17858 placement
function describePolicyFetchState(e) {
  if (
    e !== "org_policy_denied" &&
    e !== "compliance_taint" &&
    e !== "policy_cache_miss" &&
    e !== "policy_route_missing"
  )
    return {};
  let lastFetchOutcome = getLastFetchOutcome();
  let r = policyCacheStatus();
  let o =
    r === "nothing"
      ? "none"
      : r === "unrestricted"
        ? "fail_open"
        : lastFetchOutcome?.success
          ? "network"
          : "disk";
  let s = !isPolicyLimitsEligible()
    ? "ineligible"
    : lastFetchOutcome === null || (!lastFetchOutcome.success && lastFetchOutcome.retrying)
      ? "pending"
      : lastFetchOutcome.success
        ? "ok"
        : "failed";
  return {
    policy_source: fromEnum(o),
    policy_fetch: fromEnum(s),
  };
}
//@ chunk-4xpk3fhh.js:17858-17940 placement
function holdArtifactStartupTelemetry() {
  getLiveState().heldStartupTelemetry ??= [];
  return {
    flush: flushHeldStartupTelemetry,
    [Symbol.dispose]: flushHeldStartupTelemetry,
  };
}
//@ chunk-4xpk3fhh.js:17940-18040 placement
function flushHeldStartupTelemetry() {
  let liveState = getLiveState();
  let heldStartupTelemetry = liveState.heldStartupTelemetry;
  liveState.heldStartupTelemetry = null;
  for (let r of heldStartupTelemetry ?? []) r();
}
//@ chunk-4xpk3fhh.js:18040-18122 placement
function emitArtifactStartupTelemetry(e) {
  let heldStartupTelemetry = getLiveState().heldStartupTelemetry;
  if (heldStartupTelemetry === null) {
    e();
    return;
  }
  heldStartupTelemetry.push(e);
}
//@ chunk-4xpk3fhh.js:18122-18156 placement
function logArtifactTelemetry(...e) {
  emitArtifactStartupTelemetry(() => logEvent(...e));
}
//@ chunk-4xpk3fhh.js:18156-18509 placement
function resolveWithheldReason(e) {
  switch (e) {
    case "surface_excluded":
      return isTopHostSession() ? "surface_excluded" : "nested_child_session";
    case "admin_policy": {
      if (!hasOpusAccess_2(getSubscriptionType())) return "subscription_ineligible";
      let responseFromCache = getResponseFromCache();
      if (responseFromCache === null)
        return isPolicyRouteMissing() ? "policy_route_missing" : "policy_cache_miss";
      return responseFromCache.restrictions.allow_cobalt_plinth === undefined
        ? "compliance_taint"
        : "org_policy_denied";
    }
    default:
      return e;
  }
}
//@ chunk-4xpk3fhh.js:18509-18543 placement
function getArtifactDefaultOn() {
  return ARTIFACT_GATE_SPEC.defaultOn;
}
//@ chunk-4xpk3fhh.js:18543-18574 placement
function canUserControlArtifactSetting() {
  return isArtifactProviderUnblocked() && isArtifactGrowthbookUnblocked();
}
//@ chunk-4xpk3fhh.js:18574-18625 placement
function isArtifactConfigToggleable() {
  return canUserControlArtifactSetting() && resolveArtifactEnableSetting().userControllable;
}
//@ chunk-4xpk3fhh.js:18625-18653 placement
function isArtifactAdminAllowed() {
  return isArtifactAccountAllowed();
}
//@ chunk-4xpk3fhh.js:18653-18749 placement
function isArtifactAccountAllowed() {
  if (isApiKeyGatewaySession()) return getAdminRefusalReason() === null;
  if (!hasOpusAccess_2(getSubscriptionType())) return false;
  return isPolicyAllowed("allow_cobalt_plinth");
}
//@ chunk-4xpk3fhh.js:18830-18856 placement
function artifactYieldAdminRefusal() {
  return getAdminRefusalReason();
}
//@ chunk-4xpk3fhh.js:18856-19235 placement
function getAdminRefusalReason() {
  if (!isApiKeyGatewaySession()) return null;
  let storedOAuthSubscriptionType = getStoredOAuthSubscriptionType();
  if (storedOAuthSubscriptionType === null) return "plan_unreadable";
  if (storedOAuthSubscriptionType !== "pro" && storedOAuthSubscriptionType !== "max")
    return "org_policy_unverifiable";
  if (!isPolicyLimitsEligible()) return "policy_unavailable";
  if (isPolicyAllowed("allow_cobalt_plinth")) return null;
  let n = policyDenyKind("allow_cobalt_plinth") ?? "org_denied";
  switch (n) {
    case "org_denied":
    case "latched":
    case "cache_miss":
      return n;
    case "route_missing":
      return "policy_route_missing";
  }
}
//@ chunk-4xpk3fhh.js:19235-19297 placement
function isRepublishInlinePromptEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_thrift", false) === true;
}
//@ chunk-4xpk3fhh.js:19297-19324 placement
function isPublishToolEnabled() {
  return isArtifactToolEnabled();
}
//@ chunk-4xpk3fhh.js:19324-19355 placement
function isResumeFrameSeedEligible() {
  return !isArtifactSwitchedOff() && isArtifactProviderUnblocked();
}
//@ chunk-06y4szbn.js:35741-36119 placement
/**
 * artifact 文档清单的限额：最多 4096 项、路径 ≤512 字符且不得以 / 开头或含 .. 与转义控制字符，doc 名 ≤64。
 */
var ARTIFACT_DOC_LIMITS = 4096;
var SAFE_ARTIFACT_PATH_RE =
  /^(?!\/)(?!.*\/\/)(?!.*\/$)(?!(?:^|.*\/)\.\.?(?:\/|$))[^\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029\\?#%:;]{1,512}$/u;
var ARTIFACT_DOC_PATH_RE = /^[^\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029]{1,1024}$/u;
var artifactDocsSchema = DoctorLazy(() =>
  array(
    u({
      path: string().regex(ARTIFACT_DOC_PATH_RE),
      doc: string().max(64).optional().catch(undefined),
      headSeq: E().int().nonnegative().optional().catch(undefined),
    }),
  ).max(ARTIFACT_DOC_LIMITS),
);
//@ chunk-06y4szbn.js:36119-36244 placement
function artifactDocsOrFiles(e) {
  if (e.docs !== undefined)
    return artifactDocsSchema().safeParse(e.docs).success ? artifactDocs(e) : undefined;
  return e.files !== undefined ? artifactDocs(e) : undefined;
}
//@ chunk-06y4szbn.js:36244-36544 placement
function artifactDocs(e) {
  let n = e.docs === undefined ? undefined : artifactDocsSchema().safeParse(e.docs);
  if (n?.success && n.data.length > 0) return n.data;
  if (e.artifactKind !== LIVE_DOC) return [];
  if (e.files !== undefined && !hasHeadSubscription(e)) return [];
  return [
    {
      path: INDEX_HTML,
      ...(typeof e.headSeq === "number" &&
        Number.isSafeInteger(e.headSeq) &&
        e.headSeq >= 0 && {
          headSeq: e.headSeq,
        }),
    },
  ];
}
//@ chunk-06y4szbn.js:36544-36714 placement
function hasHeadSubscription(e) {
  return (
    (typeof e.headSubscriptionToken === "string" && e.headSubscriptionToken !== "") ||
    (typeof e.headSeq === "number" && Number.isSafeInteger(e.headSeq) && e.headSeq >= 0)
  );
}
//@ chunk-06y4szbn.js:36714-36914 placement
var ARTIFACT_DOC_LIST_SCHEMA = DoctorLazy(() =>
  array(
    u({
      path: string().regex(ARTIFACT_DOC_PATH_RE),
      sha256: string()
        .regex(/^[0-9a-f]{64}$/)
        .optional()
        .catch(undefined),
      contentType: string().max(255).optional().catch(undefined),
      doc: string().max(64).optional().catch(undefined),
    }),
  ).max(ARTIFACT_DOC_LIMITS),
);
//@ chunk-06y4szbn.js:36914-37244 placement
function artifactFileManifest(e) {
  if (e.files === undefined) return;
  let n = ARTIFACT_DOC_LIST_SCHEMA().safeParse(e.files);
  if (!n.success) return;
  let r = new Set(artifactDocs(e).map((h) => h.path));
  let s = new Map();
  for (let h of n.data)
    s.set(h.path, {
      ...(h.sha256 !== undefined && {
        sha256: h.sha256,
      }),
      ...(h.contentType !== undefined && {
        contentType: h.contentType,
      }),
      live: (h.doc !== undefined && h.doc !== "") || r.has(h.path),
    });
  return s;
}
//@ chunk-06y4szbn.js:37244-37451 placement
/**
 * Artifact 工具集是否拆分为独立的评论工具（CLAUDE_CODE_ARTIFACT_TOOLSET / tengu_artifact_toolset）。
 */
function isArtifactToolsetSplit() {
  let liveState = getLiveState();
  if (liveState.toolsetLatch === null) {
    liveState.toolsetLatch =
      env.CLAUDE_CODE_ARTIFACT_TOOLSET ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_damson", false) === true;
    logEvent("tengu_artifact_toolset", {
      on: liveState.toolsetLatch,
    });
  }
  return liveState.toolsetLatch;
}
//@ chunk-06y4szbn.js:37451-37484 placement
function commentsToolName() {
  return isArtifactToolsetSplit() ? ARTIFACT_COMMENTS_TOOL_NAME : ARTIFACT_TOOL_NAME;
}
//@ chunk-06y4szbn.js:37484-37611 placement
function commentsToolReference() {
  return isArtifactToolsetSplit()
    ? `the ${ARTIFACT_COMMENTS_TOOL_NAME} tool (load it with ${TOOL_SEARCH_TOOL_NAME}, query \`select:${ARTIFACT_COMMENTS_TOOL_NAME}\`, if it is not loaded)`
    : `the ${ARTIFACT_TOOL_NAME} tool`;
}
//@ chunk-06y4szbn.js:37611-37682 placement
function commentsToolAction(e) {
  return `${ARTIFACT_COMMENTS_TOOL_NAME} tool, action "${e === "comments" ? "read" : e}"`;
}
//@ chunk-06y4szbn.js:37682-37717 placement
function pickByToolset(e, n) {
  return isArtifactToolsetSplit() ? n() : e;
}
//@ chunk-06y4szbn.js:37717-37798 placement
function commentsToolCall(name, n) {
  return isArtifactToolsetSplit()
    ? {
        name: ARTIFACT_COMMENTS_TOOL_NAME,
        input: fromParentArtifactInput("comments", n),
      }
    : {
        name,
        input: n,
      };
}
export {
  artifactDocsOrFiles,
  ARTIFACT_DOC_PATH_RE,
  isArtifactToolRegistered,
  isArtifactReadOnlySurface,
  isCoworkFramePublishSession,
  pickByToolset,
  othersArtifactReadIsUserOnly,
  isResumeFrameSeedEligible,
  isPublishToolEnabled,
  isArtifactToolEnabled,
  isArtifactReadEnabled,
  isArtifactToolsetSplit,
  artifactDocs,
  isArtifactAccountAllowed,
  isArtifactAdminAllowed,
  isArtifactConfigToggleable,
  outsideOrgRead,
  invitedCopySource,
  otherOrgCopySource,
  othersArtifactReadConsentSurface,
  SAFE_ARTIFACT_PATH_RE,
  artifactYieldAdminRefusal,
  artifactPolicyUnobtained,
  artifactHeldPolicyDenyCause,
  othersReadIsUserOnly,
  isCoworkHostSession,
  isRepublishInlinePromptEnabled,
  placedInOwnOrg,
  artifactFileManifest,
  maybeLogArtifactDisabledSession,
  artifactToolWithholdingGate,
  maybeLogArtifactToolWithheld,
  commentsToolAction,
  commentsToolReference,
  commentsToolCall,
  commentsToolName,
  emitArtifactStartupTelemetry,
  isArtifactSdkDefaultOff,
  outsideOrgReadIsUserOnly,
  resolveArtifactEnableSetting,
  getArtifactDefaultOn,
  shouldRefreshArtifactRoster,
  isArtifactSwitchedOffInSettings,
  heldArtifactPolicyFetchAnswer,
};

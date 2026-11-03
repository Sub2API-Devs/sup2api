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
import { nUe, r6t } from "../../utils/gatewayCredential.js";
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
import { DU } from "../../utils/settings/commandSyncNames.js";
import { fromEnum, lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { S } from "../policyLimits/policyFetchStatus.js";
import { logEvent } from "../analytics/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { LIVE_DOC, INDEX_HTML } from "./textSanitize.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { fromParentArtifactInput } from "./artifactToolActions.js";

/**
 * 逐层（env/用户/项目/本地/策略设置）解析 Artifact 开关，返回是否启用、关闭来源与用户是否可控。
 */
//@ chunk-4xpk3fhh.js:11176-11814 placement
function resolveArtifactSetting(e) {
  let n = [];
  if (e.envDisableVar !== void 0 && isEnvSetAnywhere(e.envDisableVar))
    n.push({ layer: "env", via: "envVar" });
  let r;
  for (let l of TRUSTED_SETTING_SOURCES) {
    let u = getSettingsLayersForGate(l, e);
    if (
      (collectGateDisables(n, l, l === "policySettings" ? [...u, ...getDurablePolicyTierSettings()] : u, e),
      r === void 0 &&
        u.some((h) => h?.[e.enableKey] === !0) &&
        (l !== "policySettings" || isPolicySlotAdminOrParentComposed()))
    )
      r = l;
  }
  let any = n.some((l) => l.layer === "env" || l.layer === "policySettings" || l.layer === "flagSettings");
  for (let l of REPO_SETTING_SOURCES) collectGateDisables(n, l, getSettingsLayersForGate(l, e), e);
  let any_2 = n.some((l) => l.layer === "localSettings" || l.layer === "projectSettings");
  return {
    enabled: n.length === 0 && (e.defaultOn || r !== void 0),
    decidedBy: n[0]?.layer ?? r ?? "default",
    offSources: n,
    lockedAboveUser: any,
    userControllable: !any && !any_2 && isSettingSourceEnabled("userSettings"),
  };
}
/**
 * 取某个设置来源用于开关判定的设置对象列表：policy 含全部策略层；local 含旧版本地覆盖；项目设置只是用户设置别名且自身声明了开关时跳过（避免重复）。
 */
//@ chunk-4xpk3fhh.js:11814-12044 placement
function getSettingsLayersForGate(e, n) {
  if (e === "policySettings") return [...getAllPolicyTierSettings(), getSettingsForSource("policySettings")];
  if (!isSettingSourceEnabled(e)) return [];
  if (e === "localSettings") return [getSettingsForSource(e), getLegacyLocalSettingsOverlay()];
  let r = getSettingsForSource(e);
  if (
    e === "projectSettings" &&
    declaresGateKey(r, n) &&
    isSettingSourceEnabled("userSettings") &&
    projectSettingsAliasesUserSettings()
  )
    return [];
  return [r];
}
//@ chunk-4xpk3fhh.js:12044-12157 placement
function declaresGateKey(e, n) {
  return e?.[n.enableKey] !== void 0 || (n.legacyDisableKey !== void 0 && e?.[n.legacyDisableKey] !== void 0);
}
//@ chunk-4xpk3fhh.js:12157-12355 placement
function collectGateDisables(e, n, r, o) {
  if (r.some((f) => f?.[o.enableKey] === !1)) e.push({ layer: n, via: "enableKey" });
  let legacyDisableKey = o.legacyDisableKey;
  if (legacyDisableKey !== void 0 && r.some((f) => f?.[legacyDisableKey] === !0))
    e.push({ layer: n, via: "legacyDisableKey" });
}
/**
 * 判断某个环境变量在任何地方被设为真：进程 env、设置加载前快照、管理员层、全局配置 env，或启用的 flag/user 设置 env。
 */
//@ chunk-4xpk3fhh.js:12355-12522 placement
function isEnvSetAnywhere(e) {
  if (
    env[e] ||
    isEnvTruthy(getEnvCaseInsensitive(getLatchedPreSettingsEnvSnapshot(), e)) ||
    isEnvTruthy(getAdminTierEnvValue(e)) ||
    isEnvTruthy(getEnvCaseInsensitive(getAppliedGlobalConfigEnv(), e))
  )
    return !0;
  for (let n of ["flagSettings", "userSettings"])
    if (isSettingSourceEnabled(n) && isEnvTruthy(getEnvCaseInsensitive(getSettingsForSource(n)?.env, e)))
      return !0;
  return !1;
}
//@ chunk-4xpk3fhh.js:12522-12765 placement
function getEnvCaseInsensitive(e, n) {
  if (e === void 0) return;
  if (n in e) return e[n];
  let r = weakMap.get(e);
  if (r?.has(n)) return r.get(n);
  let o = Object.entries(e).find(([s]) => s.toUpperCase() === n)?.[1];
  if (Object.isFrozen(e))
    if (r) r.set(n, o);
    else weakMap.set(e, new Map([[n, o]]));
  return o;
}
//@ chunk-4xpk3fhh.js:12765-12783 placement
var weakMap = new WeakMap();
//@ chunk-4xpk3fhh.js:12783-12920 placement
var ARTIFACT_GATE_KEYS = { enableKey: "enableArtifact", legacyDisableKey: "disableArtifact", defaultOn: !0 },
  ARTIFACT_GATE_SPEC = { ...ARTIFACT_GATE_KEYS, envDisableVar: "CLAUDE_CODE_DISABLE_ARTIFACT" };
//@ chunk-4xpk3fhh.js:12920-12947 placement
function resolveArtifactEnableSetting() {
  return resolveArtifactSetting(ARTIFACT_GATE_SPEC);
}
//@ chunk-4xpk3fhh.js:12947-12981 placement
function y() {
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
function W(e) {
  return e === "local-agent" || e?.startsWith("claude-coworker") === !0;
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
  return e !== void 0 && othersArtifactReadConsentSurface() && artifactHostUnreachable(e);
}
//@ chunk-4xpk3fhh.js:13413-13462 placement
function othersReadIsUserOnly(e, n) {
  return !e && (othersArtifactReadIsUserOnly(n) || outsideOrgReadIsUserOnly(n.slug));
}
//@ chunk-4xpk3fhh.js:13462-13526 placement
function outsideOrgRead(e) {
  return e !== void 0 && e.outsideOrgReader === !0 && isFramePublicReadEnabled();
}
//@ chunk-4xpk3fhh.js:13526-13573 placement
function outsideOrgReadIsUserOnly(e) {
  return PERSON === "person" && outsideOrgRead(getShareEntry(e));
}
//@ chunk-4xpk3fhh.js:13573-13609 placement
function otherOrgCopySource(e) {
  return outsideOrgRead(e) || invitedCopySource(e);
}
//@ chunk-4xpk3fhh.js:13609-13666 placement
function invitedCopySource(e) {
  return e !== void 0 && e.external === !0 && isFramePublicReadEnabled();
}
//@ chunk-4xpk3fhh.js:13666-13782 placement
function placedInOwnOrg(e) {
  return (
    e !== void 0 &&
    e.probeFailed !== !0 &&
    e.external !== !0 &&
    (e.outsideOrgReader === !1 || e.role === "owner")
  );
}
//@ chunk-4xpk3fhh.js:13782-13875 placement = isAnalyticsToolDetailsLoggingEnabled (0.772)
function isAnalyticsToolDetailsLoggingEnabled() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  if (CLAUDE_CODE_ENTRYPOINT === "local-agent" && isCoworkFramePublishSession()) return !1;
  return W(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-4xpk3fhh.js:13875-13912 placement
function isArtifactReadOnlySurface() {
  return W(getSessionEntrypoint()) && !isCoworkFramePublishSession();
}
//@ chunk-4xpk3fhh.js:13912-13945 placement
function fe() {
  return nUe() && pe();
}
//@ chunk-4xpk3fhh.js:13945-13977 placement
function pe() {
  return getArtifactProviderBlockReason() === null;
}
/**
 * 返回 Artifact 因环境不可用的原因：第三方提供商、仅必要流量、CLAUDE_CODE_ARTIFACT 显式关闭、SDK 默认关闭（且未显式开启）；可用时返回 null。
 */
//@ chunk-4xpk3fhh.js:13977-14252 placement
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
function K() {
  return nUe() && R();
}
//@ chunk-4xpk3fhh.js:14283-14314 placement
function R() {
  return B() === null;
}
//@ chunk-4xpk3fhh.js:14314-14371 placement
function B() {
  if (isAnalyticsToolDetailsLoggingEnabled()) return "surface_excluded";
  return getArtifactProviderBlockReason();
}
//@ chunk-4xpk3fhh.js:14371-14413 placement
function isArtifactToolEligible() {
  if (y()) return !1;
  return K();
}
//@ chunk-4xpk3fhh.js:14413-14516 placement
function shouldRefreshArtifactRoster() {
  return (
    env.CLAUDE_CODE_ARTIFACT_ASSETS === void 0 &&
    isArtifactToolEnabled() &&
    getArtifactPublishStubDir() === null &&
    !env.CLAUDE_CODE_REMOTE
  );
}
//@ chunk-4xpk3fhh.js:14516-14596 placement
function ge() {
  let e = getPolicyLimitsIneligibleReason();
  return e === void 0 || e === "prosumer_oauth" || e === "no_auth";
}
//@ chunk-4xpk3fhh.js:14596-14678 placement
function M() {
  return (
    (isEnvTruthy(env.CLAUDE_CODE_ARTIFACT) && !1) ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth", ge())
  );
}
//@ chunk-4xpk3fhh.js:14678-14709 placement
function Y() {
  return M() && isArtifactAdminAllowed();
}
//@ chunk-4xpk3fhh.js:14709-14741 placement
function he() {
  return getArtifactGrowthbookBlockReason() === null;
}
//@ chunk-4xpk3fhh.js:14741-14866 placement
function getArtifactGrowthbookBlockReason() {
  if (!M()) return "growthbook_off";
  if (r6t() || isArtifactAdminAllowed()) return (G(), null);
  if (artifactPolicyUnobtained() !== null) return null;
  return "admin_policy";
}
//@ chunk-4xpk3fhh.js:14866-15280 placement
function artifactPolicyUnobtained() {
  if (r6t()) return null;
  if (!hasOpusAccess_2(getSubscriptionType())) return null;
  let e = policyDenyKind("allow_cobalt_plinth");
  if (e !== "cache_miss" && e !== "route_missing") return (G(), null);
  if (isPolicyDeniedByRefusedCacheHint("allow_cobalt_plinth")) return null;
  let n = e === "route_missing" ? "policy_route_missing" : "policy_fetch_failed",
    r = getLastFetchOutcome();
  if (r !== null && !r.success && shouldReportFetchFailure(r))
    return ((getLiveState().artifactPolicyFetchAnswer = r), { cause: n, outcome: r });
  let o = heldArtifactPolicyFetchAnswer();
  return o === null ? null : { cause: n, outcome: o };
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
function shouldReportFetchFailure(e) {
  if (!e.retrying) return !0;
  if ((e.errorCode === "auth_failed" && e.httpStatus === 401) || e.errorCode === "spurious_304") return !1;
  return !isTransientFetchFailure(e);
}
//@ chunk-4xpk3fhh.js:15628-15685 placement
function G() {
  if (hasLiveState()) getLiveState().artifactPolicyFetchAnswer = null;
}
//@ chunk-4xpk3fhh.js:15685-15752 placement
function isArtifactToolEnabled() {
  if (getArtifactPublishStubDir() !== null) return isArtifactToolRegistered();
  return nUe() && isArtifactToolRegistered() && isArtifactAdminAllowed();
}
//@ chunk-4xpk3fhh.js:15752-15786 placement
function isArtifactToolRegistered() {
  return artifactToolWithholdingGate() === null;
}
//@ chunk-4xpk3fhh.js:15786-15872 placement
function artifactToolWithholdingGate() {
  if (y()) return "switched_off";
  if (getArtifactPublishStubDir() !== null) return null;
  return B() ?? getArtifactGrowthbookBlockReason();
}
//@ chunk-4xpk3fhh.js:15872-15932 placement
function isArtifactReadEnabled() {
  if (y()) return !1;
  if (!fe()) return !1;
  return Y();
}
//@ chunk-4xpk3fhh.js:15932-16374 placement
function collectArtifactOffMechanisms() {
  let e = new Set(),
    n = !1,
    r = !1;
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
        n = !0;
        break;
      case "localSettings":
      case "projectSettings":
        r = !0;
        break;
    }
  if (n) (e.delete("setting"), e.delete("config_pref"));
  if (e.size > 1) return "multiple";
  let [o] = e;
  if (o !== void 0) return o;
  return n || r ? "admin_managed" : null;
}
//@ chunk-4xpk3fhh.js:16374-16416 placement
function Ae() {
  return collectArtifactOffMechanisms() !== null && K() && Y();
}
//@ chunk-4xpk3fhh.js:16416-16741 placement
function maybeLogArtifactDisabledSession() {
  let e = getLiveState();
  if (e.artifactDisabledSessionEvaluated) return;
  if (DU() === null) return;
  if (((e.artifactDisabledSessionEvaluated = !0), !Ae())) return;
  let n = collectArtifactOffMechanisms();
  if (n === null) return;
  k("tengu_artifact_disabled_session", {
    mechanism: fromEnum(n),
    session_interactivity:
      !getIsNonInteractiveSession() || getEntrypointKind() === "claude-vscode" || isHostEntrypoint()
        ? lit("interactive")
        : lit("noninteractive"),
  });
}
//@ chunk-4xpk3fhh.js:16741-17498 placement
function maybeLogArtifactToolWithheld(e) {
  if (!coworkFrameArtifacts() || getSessionEntrypoint() !== "local-agent" || isClaudecodeSession()) return;
  let n = getLiveState(),
    r = e === null && !r6t() && !isArtifactAdminAllowed() && artifactPolicyUnobtained() !== null,
    o = r ? "admin_policy" : e;
  if (o === null) {
    n.artifactRegisteredSeen = !0;
    let at = n.artifactWithheldReasonsLogged.at(-1);
    if (at === void 0 || n.artifactWithheldRecoveryLogged) return;
    ((n.artifactWithheldRecoveryLogged = !0),
      k("tengu_artifact_tool_recovered", { withheld_reason: fromEnum(at), ...describePolicyFetchState(at) }));
    return;
  }
  if (DU() === null) return;
  let s = resolveWithheldReason(o),
    included = n.artifactWithheldReasonsLogged.includes(s);
  if (included && (!r || n.artifactWithheldListedLogged)) return;
  if (!included) n.artifactWithheldReasonsLogged.push(s);
  if (r) n.artifactWithheldListedLogged = !0;
  k("tengu_artifact_tool_withheld", {
    reason: fromEnum(s),
    off_mechanism: fromEnumOpt(s === "switched_off" ? collectArtifactOffMechanisms() : null),
    after_registered: n.artifactRegisteredSeen,
    tool_listed: r,
    ...describePolicyFetchState(s),
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
  let n = getLastFetchOutcome(),
    r = S(),
    o = r === "nothing" ? "none" : r === "unrestricted" ? "fail_open" : n?.success ? "network" : "disk",
    s = !isPolicyLimitsEligible()
      ? "ineligible"
      : n === null || (!n.success && n.retrying)
        ? "pending"
        : n.success
          ? "ok"
          : "failed";
  return { policy_source: fromEnum(o), policy_fetch: fromEnum(s) };
}
//@ chunk-4xpk3fhh.js:17858-17940 placement
function holdArtifactStartupTelemetry() {
  return (
    (getLiveState().heldStartupTelemetry ??= []),
    { flush: flushHeldStartupTelemetry, [Symbol.dispose]: flushHeldStartupTelemetry }
  );
}
//@ chunk-4xpk3fhh.js:17940-18040 placement
function flushHeldStartupTelemetry() {
  let e = getLiveState(),
    heldStartupTelemetry = e.heldStartupTelemetry;
  e.heldStartupTelemetry = null;
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
function k(...e) {
  emitArtifactStartupTelemetry(() => logEvent(...e));
}
//@ chunk-4xpk3fhh.js:18156-18509 placement
function resolveWithheldReason(e) {
  switch (e) {
    case "surface_excluded":
      return isTopHostSession() ? "surface_excluded" : "nested_child_session";
    case "admin_policy": {
      if (!hasOpusAccess_2(getSubscriptionType())) return "subscription_ineligible";
      let n = getResponseFromCache();
      if (n === null) return isPolicyRouteMissing() ? "policy_route_missing" : "policy_cache_miss";
      return n.restrictions.allow_cobalt_plinth === void 0 ? "compliance_taint" : "org_policy_denied";
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
function Se() {
  return R() && he();
}
//@ chunk-4xpk3fhh.js:18574-18625 placement
function isArtifactConfigToggleable() {
  return Se() && resolveArtifactEnableSetting().userControllable;
}
//@ chunk-4xpk3fhh.js:18625-18653 placement
function isArtifactAdminAllowed() {
  return isArtifactAccountAllowed();
}
//@ chunk-4xpk3fhh.js:18653-18749 placement
function isArtifactAccountAllowed() {
  if (r6t()) return getAdminRefusalReason() === null;
  if (!hasOpusAccess_2(getSubscriptionType())) return !1;
  return isPolicyAllowed("allow_cobalt_plinth");
}
//@ chunk-4xpk3fhh.js:18830-18856 placement
function artifactYieldAdminRefusal() {
  return getAdminRefusalReason();
}
//@ chunk-4xpk3fhh.js:18856-19235 placement
function getAdminRefusalReason() {
  if (!r6t()) return null;
  let e = getStoredOAuthSubscriptionType();
  if (e === null) return "plan_unreadable";
  if (e !== "pro" && e !== "max") return "org_policy_unverifiable";
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
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_thrift", !1) === !0;
}
//@ chunk-4xpk3fhh.js:19297-19324 placement
function isPublishToolEnabled() {
  return isArtifactToolEnabled();
}
//@ chunk-4xpk3fhh.js:19324-19355 placement
function isResumeFrameSeedEligible() {
  return !y() && R();
}
//@ chunk-06y4szbn.js:35741-36119 placement
var ARTIFACT_DOC_LIMITS = 4096,
  eKs =
    /^(?!\/)(?!.*\/\/)(?!.*\/$)(?!(?:^|.*\/)\.\.?(?:\/|$))[^\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029\\?#%:;]{1,512}$/u,
  ln = /^[^\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029]{1,1024}$/u,
  ds = DoctorLazy(() =>
    A(
      u({
        path: o().regex(ln),
        doc: o()
          .max(64)
          .optional()
          .catch(void 0),
        headSeq: E()
          .int()
          .nonnegative()
          .optional()
          .catch(void 0),
      }),
    ).max(ARTIFACT_DOC_LIMITS),
  );
//@ chunk-06y4szbn.js:36119-36244 placement
function artifactDocsOrFiles(e) {
  if (e.docs !== void 0) return ds().safeParse(e.docs).success ? artifactDocs(e) : void 0;
  return e.files !== void 0 ? artifactDocs(e) : void 0;
}
//@ chunk-06y4szbn.js:36244-36544 placement
function artifactDocs(e) {
  let n = e.docs === void 0 ? void 0 : ds().safeParse(e.docs);
  if (n?.success && n.data.length > 0) return n.data;
  if (e.artifactKind !== LIVE_DOC) return [];
  if (e.files !== void 0 && !hasHeadSubscription(e)) return [];
  return [
    {
      path: INDEX_HTML,
      ...(typeof e.headSeq === "number" &&
        Number.isSafeInteger(e.headSeq) &&
        e.headSeq >= 0 && { headSeq: e.headSeq }),
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
  A(
    u({
      path: o().regex(ln),
      sha256: o()
        .regex(/^[0-9a-f]{64}$/)
        .optional()
        .catch(void 0),
      contentType: o()
        .max(255)
        .optional()
        .catch(void 0),
      doc: o()
        .max(64)
        .optional()
        .catch(void 0),
    }),
  ).max(ARTIFACT_DOC_LIMITS),
);
//@ chunk-06y4szbn.js:36914-37244 placement
function artifactFileManifest(e) {
  if (e.files === void 0) return;
  let safeParse = ARTIFACT_DOC_LIST_SCHEMA().safeParse(e.files);
  if (!safeParse.success) return;
  let r = new Set(artifactDocs(e).map((h) => h.path)),
    s = new Map();
  for (let h of safeParse.data)
    s.set(h.path, {
      ...(h.sha256 !== void 0 && { sha256: h.sha256 }),
      ...(h.contentType !== void 0 && { contentType: h.contentType }),
      live: (h.doc !== void 0 && h.doc !== "") || r.has(h.path),
    });
  return s;
}
/**
 * Artifact 工具集是否拆分为独立的评论工具（CLAUDE_CODE_ARTIFACT_TOOLSET / tengu_artifact_toolset）。
 */
//@ chunk-06y4szbn.js:37244-37451 placement
function isArtifactToolsetSplit() {
  let e = getLiveState();
  if (e.toolsetLatch === null)
    ((e.toolsetLatch =
      env.CLAUDE_CODE_ARTIFACT_TOOLSET ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_damson", !1) === !0),
      logEvent("tengu_artifact_toolset", { on: e.toolsetLatch }));
  return e.toolsetLatch;
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
function commentsToolCall(e, n) {
  return isArtifactToolsetSplit()
    ? { name: ARTIFACT_COMMENTS_TOOL_NAME, input: fromParentArtifactInput("comments", n) }
    : { name: e, input: n };
}

export {
  artifactDocsOrFiles,
  ln,
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
  eKs,
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

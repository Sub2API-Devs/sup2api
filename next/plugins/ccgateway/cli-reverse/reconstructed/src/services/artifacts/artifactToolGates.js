/**
 * services/artifacts/artifactToolGates.ts
 *
 * 2.1.316 新增：Artifact 工具集开关与文档清单
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0avm71bs.js (70), chunk-51jy8ztq.js (12)
 * attribution: placement 81, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  TRUSTED_SETTING_SOURCES,
  REPO_SETTING_SOURCES,
  isSettingSourceEnabled,
} from "../../utils/settings/constants.js";
import {
  getDurablePolicyTierSettings,
  isPolicySlotAdminOrParentComposed,
  getAllPolicyTierSettings,
  getSettingsForSource,
  getLegacyLocalSettingsOverlay,
  projectSettingsAliasesUserSettings,
  getAdminTierEnvValue,
} from "../../utils/settings/settings.js";
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
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import { artifactsMcpClient } from "../mcp/client.js";
import { isOwnCcrMcpServer } from "../analytics/metadata.js";
import { isFirstPartyToolboxServer } from "../mcp/fileReference/fileReferencePolicy.js";
import { ARTIFACTS_MCP_PATH, ARTIFACTS_SERVER_ID } from "../mcp/firstPartyServerIds.js";
import { getSessionId, getIsNonInteractiveSession } from "../../bootstrap/state.js";
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
import { getSubscriptionType, getStoredOAuthSubscriptionType } from "../../utils/auth.js";
import {
  policyDenyKind,
  isPolicyDeniedByRefusedCacheHint,
  getResponseFromCache,
  isPolicyRouteMissing,
  isPolicyAllowed,
} from "../policyLimits/policyEvidence.js";
import { mergedCommandNames } from "../../utils/settings/commandSyncNames.js";
import { fromEnum, lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { policyCacheStatus } from "../policyLimits/policyFetchStatus.js";
import { logEvent } from "../analytics/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, objectSchema, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { LIVE_DOC, INDEX_HTML } from "./textSanitize.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { fromParentArtifactInput } from "./artifactToolActions.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0avm71bs.js:11778-12416 placement
/**
 * 逐层（env/用户/项目/本地/策略设置）解析 Artifact 开关，返回是否启用、关闭来源与用户是否可控。
 */
function resolveArtifactSetting(spec) {
  let layers = [];
  if (spec.envDisableVar !== undefined && isEnvSetAnywhere(spec.envDisableVar))
    layers.push({
      layer: "env",
      via: "envVar",
    });
  let hit;
  for (let source of TRUSTED_SETTING_SOURCES) {
    let settingsLayersForGate = getSettingsLayersForGate(source, spec);
    collectGateDisables(
      layers,
      source,
      source === "policySettings"
        ? [...settingsLayersForGate, ...getDurablePolicyTierSettings()]
        : settingsLayersForGate,
      spec,
    );
    if (
      hit === undefined &&
      settingsLayersForGate.some((layer) => layer?.[spec.enableKey] === true) &&
      (source !== "policySettings" || isPolicySlotAdminOrParentComposed())
    )
      hit = source;
  }
  let any = layers.some(
    (layer) => layer.layer === "env" || layer.layer === "policySettings" || layer.layer === "flagSettings",
  );
  for (let layer of REPO_SETTING_SOURCES)
    collectGateDisables(layers, layer, getSettingsLayersForGate(layer, spec), spec);
  let any_2 = layers.some((entry) => entry.layer === "localSettings" || entry.layer === "projectSettings");
  return {
    enabled: layers.length === 0 && (spec.defaultOn || hit !== undefined),
    decidedBy: layers[0]?.layer ?? hit ?? "default",
    offSources: layers,
    lockedAboveUser: any,
    userControllable: !any && !any_2 && isSettingSourceEnabled("userSettings"),
  };
}
//@ chunk-0avm71bs.js:12416-12646 placement
/**
 * 取某个设置来源用于开关判定的设置对象列表：policy 含全部策略层；local 含旧版本地覆盖；项目设置只是用户设置别名且自身声明了开关时跳过（避免重复）。
 */
function getSettingsLayersForGate(key, source) {
  if (key === "policySettings")
    return [...getAllPolicyTierSettings(), getSettingsForSource("policySettings")];
  if (!isSettingSourceEnabled(key)) return [];
  if (key === "localSettings") return [getSettingsForSource(key), getLegacyLocalSettingsOverlay()];
  let settingsForSource = getSettingsForSource(key);
  if (
    key === "projectSettings" &&
    declaresGateKey(settingsForSource, source) &&
    isSettingSourceEnabled("userSettings") &&
    projectSettingsAliasesUserSettings()
  )
    return [];
  return [settingsForSource];
}
//@ chunk-0avm71bs.js:12646-12759 placement
function declaresGateKey(settingsForSource, name) {
  return (
    settingsForSource?.[name.enableKey] !== undefined ||
    (name.legacyDisableKey !== undefined && settingsForSource?.[name.legacyDisableKey] !== undefined)
  );
}
//@ chunk-0avm71bs.js:12759-12957 placement
function collectGateDisables(gate, layer, layers, layerMap) {
  if (layers.some((layer) => layer?.[layerMap.enableKey] === false))
    gate.push({
      layer,
      via: "enableKey",
    });
  let legacyDisableKey = layerMap.legacyDisableKey;
  if (legacyDisableKey !== undefined && layers.some((layer) => layer?.[legacyDisableKey] === true))
    gate.push({
      layer,
      via: "legacyDisableKey",
    });
}
//@ chunk-0avm71bs.js:12957-13123 placement
/**
 * 判断某个环境变量在任何地方被设为真：进程 env、设置加载前快照、管理员层、全局配置 env，或启用的 flag/user 设置 env。
 */
function isEnvSetAnywhere(name) {
  if (
    env[name] ||
    isEnvTruthy(getEnvCaseInsensitive(getLatchedPreSettingsEnvSnapshot(), name)) ||
    isEnvTruthy(getAdminTierEnvValue(name)) ||
    isEnvTruthy(getEnvCaseInsensitive(getAppliedGlobalConfigEnv(), name))
  )
    return true;
  for (let source of ["flagSettings", "userSettings"])
    if (
      isSettingSourceEnabled(source) &&
      isEnvTruthy(getEnvCaseInsensitive(getSettingsForSource(source)?.env, name))
    )
      return true;
  return false;
}
//@ chunk-0avm71bs.js:13123-13366 placement
function getEnvCaseInsensitive(env, name) {
  if (env === undefined) return;
  if (name in env) return env[name];
  let cached = weakMap.get(env);
  if (cached?.has(name)) return cached.get(name);
  let entry = Object.entries(env).find(([key]) => key.toUpperCase() === name)?.[1];
  if (Object.isFrozen(env))
    if (cached) cached.set(name, entry);
    else weakMap.set(env, new Map([[name, entry]]));
  return entry;
}
//@ chunk-0avm71bs.js:13366-13384 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0avm71bs.js:13366", () => {
  weakMap = new WeakMap();
});
//@ chunk-0avm71bs.js:13384-13521 placement
var ARTIFACT_GATE_KEYS = {
  enableKey: "enableArtifact",
  legacyDisableKey: "disableArtifact",
  defaultOn: true,
};
var ARTIFACT_GATE_SPEC = {
  ...ARTIFACT_GATE_KEYS,
  envDisableVar: "CLAUDE_CODE_DISABLE_ARTIFACT",
};
//@ chunk-0avm71bs.js:13521-13548 placement
function resolveArtifactEnableSetting() {
  return resolveArtifactSetting(ARTIFACT_GATE_SPEC);
}
//@ chunk-0avm71bs.js:13548-13582 placement
/**
 * 判断 Artifact 总开关（用户设置）是否关闭。
 */
function isArtifactSwitchedOff() {
  return !resolveArtifactEnableSetting().enabled;
}
//@ chunk-0avm71bs.js:13582-13658 placement
function isArtifactSwitchedOffInSettings() {
  return (
    !resolveArtifactSetting(ARTIFACT_GATE_KEYS).enabled ||
    isEnvTruthy(getAdminTierEnvValue("CLAUDE_CODE_DISABLE_ARTIFACT"))
  );
}
//@ chunk-0avm71bs.js:13658-13760 placement
function isArtifactSdkDefaultOff() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    hasEmbeddedSearchTools_2() ||
    CLAUDE_CODE_ENTRYPOINT === "claude-code-github-action" ||
    CLAUDE_CODE_ENTRYPOINT === "mcp"
  );
}
//@ chunk-0avm71bs.js:13760-13838 placement
function isCoworkerEntrypoint(entrypoint) {
  return entrypoint === "local-agent" || entrypoint?.startsWith("claude-coworker") === true;
}
//@ chunk-0avm71bs.js:13838-13900 placement
function isCoworkFramePublishSession() {
  return (
    getSessionEntrypoint() === "local-agent" &&
    isTopHostSession() &&
    !isClaudecodeSession() &&
    coworkFrameArtifacts()
  );
}
//@ chunk-0avm71bs.js:13900-13939 placement
function isCoworkHostSession() {
  return (isCoworkSession() && isLocalAgentTopSession()) || isCoworkFramePublishSession();
}
//@ chunk-0avm71bs.js:13939-13966 placement
function othersArtifactReadConsentSurface() {
  return isCoworkAny();
}
//@ chunk-0avm71bs.js:13966-14014 placement
function othersArtifactReadIsUserOnly(context) {
  return context !== undefined && othersArtifactReadConsentSurface() && artifactHostUnreachable(context);
}
//@ chunk-0avm71bs.js:14014-14063 placement
function othersReadIsUserOnly(context, options) {
  return !context && (othersArtifactReadIsUserOnly(options) || outsideOrgReadIsUserOnly(options.slug));
}
//@ chunk-0avm71bs.js:14063-14127 placement
function outsideOrgRead(shareEntry) {
  return shareEntry !== undefined && shareEntry.outsideOrgReader === true && isFramePublicReadEnabled();
}
//@ chunk-0avm71bs.js:14127-14174 placement
function outsideOrgReadIsUserOnly(slug) {
  return PERSON === "person" && outsideOrgRead(getShareEntry(slug));
}
//@ chunk-0avm71bs.js:14174-14210 placement
function otherOrgCopySource(shareEntry) {
  return outsideOrgRead(shareEntry) || invitedCopySource(shareEntry);
}
//@ chunk-0avm71bs.js:14210-14267 placement
function invitedCopySource(source) {
  return source !== undefined && source.external === true && isFramePublicReadEnabled();
}
//@ chunk-0avm71bs.js:14267-14383 placement
function placedInOwnOrg(shareEntry) {
  return (
    shareEntry !== undefined &&
    shareEntry.probeFailed !== true &&
    shareEntry.external !== true &&
    (shareEntry.outsideOrgReader === false || shareEntry.role === "owner")
  );
}
//@ chunk-0avm71bs.js:14383-14476 placement (2.1.88 match: isAnalyticsToolDetailsLoggingEnabled, 0.773)
function isAnalyticsToolDetailsLoggingEnabled() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  if (CLAUDE_CODE_ENTRYPOINT === "local-agent" && isCoworkFramePublishSession()) return false;
  return isCoworkerEntrypoint(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-0avm71bs.js:14476-14513 placement
function isArtifactReadOnlySurface() {
  return isCoworkerEntrypoint(getSessionEntrypoint()) && !isCoworkFramePublishSession();
}
//@ chunk-0avm71bs.js:14513-14546 placement
function isArtifactToolsReady() {
  return hasAnyGatewayCredential() && isArtifactProviderAvailable();
}
//@ chunk-0avm71bs.js:14546-14578 placement
function isArtifactProviderAvailable() {
  return getArtifactProviderBlockReason() === null;
}
//@ chunk-0avm71bs.js:14578-14853 placement
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
//@ chunk-0avm71bs.js:14853-14884 placement
function isArtifactEnvEnabled() {
  return hasAnyGatewayCredential() && isArtifactProviderUnblocked();
}
//@ chunk-0avm71bs.js:14884-14915 placement
function isArtifactProviderUnblocked() {
  return artifactProviderBlockReason() === null;
}
//@ chunk-0avm71bs.js:14915-14972 placement
function artifactProviderBlockReason() {
  if (isAnalyticsToolDetailsLoggingEnabled()) return "surface_excluded";
  return getArtifactProviderBlockReason();
}
//@ chunk-0avm71bs.js:14972-15014 placement
function isArtifactToolEligible() {
  if (isArtifactSwitchedOff()) return false;
  return isArtifactEnvEnabled();
}
//@ chunk-0avm71bs.js:15014-15234 placement
/**
 * 是否要记录 Artifact 工具被扣留：CCR 环境下本会话首次进入该分支时记标记，之后按开关与状态返回。
 */
function isArtifactToolReplacedByCcrEntry() {
  if (!(hasLiveState() && getLiveState().heldCcrArtifactsEntry)) {
    if (!env.CLAUDE_CODE_REMOTE) return false;
    let artifactClient = artifactsMcpClient();
    if (
      artifactClient === undefined ||
      !isOwnCcrMcpServer(artifactClient.config) ||
      !isFirstPartyToolboxServer(artifactClient, {
        path: ARTIFACTS_MCP_PATH,
        serverId: ARTIFACTS_SERVER_ID,
      })
    )
      return false;
    getLiveState().heldCcrArtifactsEntry = true;
  }
  return !isArtifactSwitchedOffInSettings() && isArtifactEnvEnabled();
}
//@ chunk-0avm71bs.js:15234-15356 placement
/**
 * 本会话是否还没为 CCR 条目起过 scratchpad；起过一次后返回 false。
 */
function claimScratchpadStartForCcrEntry() {
  let liveState = getLiveState();
  let sessionId = getSessionId();
  if (liveState.scratchpadStartedForCcrEntry === sessionId) return false;
  liveState.scratchpadStartedForCcrEntry = sessionId;
  return true;
}
//@ chunk-0avm71bs.js:15356-15459 placement
function shouldRefreshArtifactRoster() {
  return (
    env.CLAUDE_CODE_ARTIFACT_ASSETS === undefined &&
    isArtifactToolEnabled() &&
    getArtifactPublishStubDir() === null &&
    !env.CLAUDE_CODE_REMOTE
  );
}
//@ chunk-0avm71bs.js:15459-15539 placement
function isPolicyEligibleForArtifacts() {
  let policyLimitsIneligibleReason = getPolicyLimitsIneligibleReason();
  return (
    policyLimitsIneligibleReason === undefined ||
    policyLimitsIneligibleReason === "prosumer_oauth" ||
    policyLimitsIneligibleReason === "no_auth"
  );
}
//@ chunk-0avm71bs.js:15539-15621 placement
function isArtifactGrowthbookOn() {
  return (
    (isEnvTruthy(env.CLAUDE_CODE_ARTIFACT) && false) ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth", isPolicyEligibleForArtifacts())
  );
}
//@ chunk-0avm71bs.js:15621-15652 placement
function isArtifactAdminAllowedEnough() {
  return isArtifactGrowthbookOn() && isArtifactAdminAllowed();
}
//@ chunk-0avm71bs.js:15652-15684 placement
function isArtifactGrowthbookUnblocked() {
  return getArtifactGrowthbookBlockReason() === null;
}
//@ chunk-0avm71bs.js:15684-15809 placement
function getArtifactGrowthbookBlockReason() {
  if (!isArtifactGrowthbookOn()) return "growthbook_off";
  if (isApiKeyGatewaySession() || isArtifactAdminAllowed()) {
    clearArtifactPolicyFetchAnswer();
    return null;
  }
  if (artifactPolicyUnobtained() !== null) return null;
  return "admin_policy";
}
//@ chunk-0avm71bs.js:15809-16223 placement
function artifactPolicyUnobtained() {
  if (isApiKeyGatewaySession()) return null;
  if (!hasOpusAccess(getSubscriptionType())) return null;
  let denyKind = policyDenyKind("allow_cobalt_plinth");
  if (denyKind !== "cache_miss" && denyKind !== "route_missing") {
    clearArtifactPolicyFetchAnswer();
    return null;
  }
  if (isPolicyDeniedByRefusedCacheHint("allow_cobalt_plinth")) return null;
  let cause = denyKind === "route_missing" ? "policy_route_missing" : "policy_fetch_failed";
  let lastFetchOutcome = getLastFetchOutcome();
  if (lastFetchOutcome !== null && !lastFetchOutcome.success && shouldReportFetchFailure(lastFetchOutcome)) {
    getLiveState().artifactPolicyFetchAnswer = lastFetchOutcome;
    return {
      cause,
      outcome: lastFetchOutcome,
    };
  }
  let answer = heldArtifactPolicyFetchAnswer();
  return answer === null
    ? null
    : {
        cause,
        outcome: answer,
      };
}
//@ chunk-0avm71bs.js:16223-16286 placement
function heldArtifactPolicyFetchAnswer() {
  return hasLiveState() ? getLiveState().artifactPolicyFetchAnswer : null;
}
//@ chunk-0avm71bs.js:16286-16428 placement
function artifactHeldPolicyDenyCause() {
  if (isPolicyDeniedByRefusedCacheHint("allow_cobalt_plinth")) return "org_denied";
  let denyKind = policyDenyKind("allow_cobalt_plinth");
  return denyKind === "org_denied" || denyKind === "latched" ? denyKind : null;
}
//@ chunk-0avm71bs.js:16428-16571 placement
function shouldReportFetchFailure(outcome) {
  if (!outcome.retrying) return true;
  if (
    (outcome.errorCode === "auth_failed" && outcome.httpStatus === 401) ||
    outcome.errorCode === "spurious_304"
  )
    return false;
  return !isTransientFetchFailure(outcome);
}
//@ chunk-0avm71bs.js:16571-16628 placement
function clearArtifactPolicyFetchAnswer() {
  if (hasLiveState()) getLiveState().artifactPolicyFetchAnswer = null;
}
//@ chunk-0avm71bs.js:16628-16695 placement
function isArtifactToolEnabled() {
  if (getArtifactPublishStubDir() !== null) return isArtifactToolRegistered();
  return hasAnyGatewayCredential() && isArtifactToolRegistered() && isArtifactAdminAllowed();
}
//@ chunk-0avm71bs.js:16695-16729 placement
function isArtifactToolRegistered() {
  return artifactToolWithholdingGate() === null;
}
//@ chunk-0avm71bs.js:16729-16815 placement
function artifactToolWithholdingGate() {
  if (isArtifactSwitchedOff()) return "switched_off";
  if (getArtifactPublishStubDir() !== null) return null;
  return artifactProviderBlockReason() ?? getArtifactGrowthbookBlockReason();
}
//@ chunk-0avm71bs.js:16815-16875 placement
function isArtifactReadEnabled() {
  if (isArtifactSwitchedOff()) return false;
  if (!isArtifactToolsReady()) return false;
  return isArtifactAdminAllowedEnough();
}
//@ chunk-0avm71bs.js:16875-17317 placement
function collectArtifactOffMechanisms() {
  let keys = new Set();
  let seen = false;
  let done = false;
  for (let offSource of resolveArtifactEnableSetting().offSources)
    switch (offSource.layer) {
      case "env":
        keys.add("env");
        break;
      case "userSettings":
        keys.add(offSource.via === "legacyDisableKey" ? "setting" : "config_pref");
        break;
      case "policySettings":
      case "flagSettings":
        seen = true;
        break;
      case "localSettings":
      case "projectSettings":
        done = true;
        break;
    }
  if (seen) {
    keys.delete("setting");
    keys.delete("config_pref");
  }
  if (keys.size > 1) return "multiple";
  let [key] = keys;
  if (key !== undefined) return key;
  return seen || done ? "admin_managed" : null;
}
//@ chunk-0avm71bs.js:17317-17359 placement
function isArtifactFullyAvailable() {
  return collectArtifactOffMechanisms() !== null && isArtifactEnvEnabled() && isArtifactAdminAllowedEnough();
}
//@ chunk-0avm71bs.js:17359-17684 placement
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
//@ chunk-0avm71bs.js:17684-18441 placement
function maybeLogArtifactToolWithheld(toolName) {
  if (!coworkFrameArtifacts() || getSessionEntrypoint() !== "local-agent" || isClaudecodeSession()) return;
  let liveState = getLiveState();
  let denied =
    toolName === null &&
    !isApiKeyGatewaySession() &&
    !isArtifactAdminAllowed() &&
    artifactPolicyUnobtained() !== null;
  let reason = denied ? "admin_policy" : toolName;
  if (reason === null) {
    liveState.artifactRegisteredSeen = true;
    let state = liveState.artifactWithheldReasonsLogged.at(-1);
    if (state === undefined || liveState.artifactWithheldRecoveryLogged) return;
    liveState.artifactWithheldRecoveryLogged = true;
    logArtifactTelemetry("tengu_artifact_tool_recovered", {
      withheld_reason: fromEnum(state),
      ...describePolicyFetchState(state),
    });
    return;
  }
  if (mergedCommandNames() === null) return;
  let state = resolveWithheldReason(reason);
  let included = liveState.artifactWithheldReasonsLogged.includes(state);
  if (included && (!denied || liveState.artifactWithheldListedLogged)) return;
  if (!included) liveState.artifactWithheldReasonsLogged.push(state);
  if (denied) liveState.artifactWithheldListedLogged = true;
  logArtifactTelemetry("tengu_artifact_tool_withheld", {
    reason: fromEnum(state),
    off_mechanism: fromEnumOpt(state === "switched_off" ? collectArtifactOffMechanisms() : null),
    after_registered: liveState.artifactRegisteredSeen,
    tool_listed: denied,
    ...describePolicyFetchState(state),
  });
}
//@ chunk-0avm71bs.js:18441-18801 placement
function describePolicyFetchState(state) {
  if (
    state !== "org_policy_denied" &&
    state !== "compliance_taint" &&
    state !== "policy_cache_miss" &&
    state !== "policy_route_missing"
  )
    return {};
  let lastFetchOutcome = getLastFetchOutcome();
  let status = policyCacheStatus();
  let detail =
    status === "nothing"
      ? "none"
      : status === "unrestricted"
        ? "fail_open"
        : lastFetchOutcome?.success
          ? "network"
          : "disk";
  let eligible = !isPolicyLimitsEligible()
    ? "ineligible"
    : lastFetchOutcome === null || (!lastFetchOutcome.success && lastFetchOutcome.retrying)
      ? "pending"
      : lastFetchOutcome.success
        ? "ok"
        : "failed";
  return {
    policy_source: fromEnum(detail),
    policy_fetch: fromEnum(eligible),
  };
}
//@ chunk-0avm71bs.js:18801-18883 placement
function holdArtifactStartupTelemetry() {
  getLiveState().heldStartupTelemetry ??= [];
  return {
    flush: flushHeldStartupTelemetry,
    [Symbol.dispose]: flushHeldStartupTelemetry,
  };
}
//@ chunk-0avm71bs.js:18883-18983 placement
function flushHeldStartupTelemetry() {
  let liveState = getLiveState();
  let heldStartupTelemetry = liveState.heldStartupTelemetry;
  liveState.heldStartupTelemetry = null;
  for (let fn of heldStartupTelemetry ?? []) fn();
}
//@ chunk-0avm71bs.js:18983-19065 placement
function emitArtifactStartupTelemetry(options) {
  let heldStartupTelemetry = getLiveState().heldStartupTelemetry;
  if (heldStartupTelemetry === null) {
    options();
    return;
  }
  heldStartupTelemetry.push(options);
}
//@ chunk-0avm71bs.js:19065-19099 placement
function logArtifactTelemetry(...args) {
  emitArtifactStartupTelemetry(() => logEvent(...args));
}
//@ chunk-0avm71bs.js:19099-19452 placement
function resolveWithheldReason(reason) {
  switch (reason) {
    case "surface_excluded":
      return isTopHostSession() ? "surface_excluded" : "nested_child_session";
    case "admin_policy": {
      if (!hasOpusAccess(getSubscriptionType())) return "subscription_ineligible";
      let responseFromCache = getResponseFromCache();
      if (responseFromCache === null)
        return isPolicyRouteMissing() ? "policy_route_missing" : "policy_cache_miss";
      return responseFromCache.restrictions.allow_cobalt_plinth === undefined
        ? "compliance_taint"
        : "org_policy_denied";
    }
    default:
      return reason;
  }
}
//@ chunk-0avm71bs.js:19452-19486 placement
function getArtifactDefaultOn() {
  return ARTIFACT_GATE_SPEC.defaultOn;
}
//@ chunk-0avm71bs.js:19486-19517 placement
function canUserControlArtifactSetting() {
  return isArtifactProviderUnblocked() && isArtifactGrowthbookUnblocked();
}
//@ chunk-0avm71bs.js:19517-19568 placement
function isArtifactConfigToggleable() {
  return canUserControlArtifactSetting() && resolveArtifactEnableSetting().userControllable;
}
//@ chunk-0avm71bs.js:19568-19596 placement
function isArtifactAdminAllowed() {
  return isArtifactAccountAllowed();
}
//@ chunk-0avm71bs.js:19596-19692 placement
function isArtifactAccountAllowed() {
  if (isApiKeyGatewaySession()) return getAdminRefusalReason() === null;
  if (!hasOpusAccess(getSubscriptionType())) return false;
  return isPolicyAllowed("allow_cobalt_plinth");
}
//@ chunk-0avm71bs.js:19692-19773 layout (2.1.88 match: hasOpusAccess, 1)
function hasOpusAccess(subscriptionType) {
  return (
    subscriptionType === "team" ||
    subscriptionType === "enterprise" ||
    subscriptionType === "pro" ||
    subscriptionType === "max" ||
    subscriptionType == null
  );
}
//@ chunk-0avm71bs.js:19773-19799 placement
function artifactYieldAdminRefusal() {
  return getAdminRefusalReason();
}
//@ chunk-0avm71bs.js:19799-20178 placement
function getAdminRefusalReason() {
  if (!isApiKeyGatewaySession()) return null;
  let storedOAuthSubscriptionType = getStoredOAuthSubscriptionType();
  if (storedOAuthSubscriptionType === null) return "plan_unreadable";
  if (storedOAuthSubscriptionType !== "pro" && storedOAuthSubscriptionType !== "max")
    return "org_policy_unverifiable";
  if (!isPolicyLimitsEligible()) return "policy_unavailable";
  if (isPolicyAllowed("allow_cobalt_plinth")) return null;
  let denyKind = policyDenyKind("allow_cobalt_plinth") ?? "org_denied";
  switch (denyKind) {
    case "org_denied":
    case "latched":
    case "cache_miss":
      return denyKind;
    case "route_missing":
      return "policy_route_missing";
  }
}
//@ chunk-0avm71bs.js:20178-20240 placement
function isRepublishInlinePromptEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_thrift", false) === true;
}
//@ chunk-0avm71bs.js:20240-20267 placement
function isPublishToolEnabled() {
  return isArtifactToolEnabled();
}
//@ chunk-0avm71bs.js:20267-20298 placement
function isResumeFrameSeedEligible() {
  return !isArtifactSwitchedOff() && isArtifactProviderUnblocked();
}
//@ chunk-51jy8ztq.js:35741-36119 placement
/**
 * artifact 文档清单的限额：最多 4096 项、路径 ≤512 字符且不得以 / 开头或含 .. 与转义控制字符，doc 名 ≤64。
 */
var ARTIFACT_DOC_LIMITS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SAFE_ARTIFACT_PATH_RE;
var ARTIFACT_DOC_PATH_RE;
var artifactDocsSchema;
deferInit("chunk-51jy8ztq.js:35741", () => {
  ARTIFACT_DOC_LIMITS = 4096;
  SAFE_ARTIFACT_PATH_RE =
    /^(?!\/)(?!.*\/\/)(?!.*\/$)(?!(?:^|.*\/)\.\.?(?:\/|$))[^\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029\\?#%:;]{1,512}$/u;
  ARTIFACT_DOC_PATH_RE = /^[^\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029]{1,1024}$/u;
  artifactDocsSchema = DoctorLazy(() =>
    array(
      objectSchema({
        path: stringSchema().regex(ARTIFACT_DOC_PATH_RE),
        doc: stringSchema().max(64).optional().catch(undefined),
        headSeq: numberSchema().int().nonnegative().optional().catch(undefined),
      }),
    ).max(ARTIFACT_DOC_LIMITS),
  );
});
//@ chunk-51jy8ztq.js:36119-36244 placement
function artifactDocsOrFiles(artifact) {
  if (artifact.docs !== undefined)
    return artifactDocsSchema().safeParse(artifact.docs).success ? artifactDocs(artifact) : undefined;
  return artifact.files !== undefined ? artifactDocs(artifact) : undefined;
}
//@ chunk-51jy8ztq.js:36244-36544 placement
function artifactDocs(artifact) {
  let parsed = artifact.docs === undefined ? undefined : artifactDocsSchema().safeParse(artifact.docs);
  if (parsed?.success && parsed.data.length > 0) return parsed.data;
  if (artifact.artifactKind !== LIVE_DOC) return [];
  if (artifact.files !== undefined && !hasHeadSubscription(artifact)) return [];
  return [
    {
      path: INDEX_HTML,
      ...(typeof artifact.headSeq === "number" &&
        Number.isSafeInteger(artifact.headSeq) &&
        artifact.headSeq >= 0 && {
          headSeq: artifact.headSeq,
        }),
    },
  ];
}
//@ chunk-51jy8ztq.js:36544-36714 placement
function hasHeadSubscription(artifact) {
  return (
    (typeof artifact.headSubscriptionToken === "string" && artifact.headSubscriptionToken !== "") ||
    (typeof artifact.headSeq === "number" && Number.isSafeInteger(artifact.headSeq) && artifact.headSeq >= 0)
  );
}
//@ chunk-51jy8ztq.js:36714-36914 placement
var ARTIFACT_DOC_LIST_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-51jy8ztq.js:36714", () => {
  ARTIFACT_DOC_LIST_SCHEMA = DoctorLazy(() =>
    array(
      objectSchema({
        path: stringSchema().regex(ARTIFACT_DOC_PATH_RE),
        sha256: stringSchema()
          .regex(/^[0-9a-f]{64}$/)
          .optional()
          .catch(undefined),
        contentType: stringSchema().max(255).optional().catch(undefined),
        doc: stringSchema().max(64).optional().catch(undefined),
      }),
    ).max(ARTIFACT_DOC_LIMITS),
  );
});
//@ chunk-51jy8ztq.js:36914-37244 placement
function artifactFileManifest(artifact) {
  if (artifact.files === undefined) return;
  let parsed = ARTIFACT_DOC_LIST_SCHEMA().safeParse(artifact.files);
  if (!parsed.success) return;
  let paths = new Set(artifactDocs(artifact).map((doc) => doc.path));
  let out = new Map();
  for (let entry of parsed.data)
    out.set(entry.path, {
      ...(entry.sha256 !== undefined && {
        sha256: entry.sha256,
      }),
      ...(entry.contentType !== undefined && {
        contentType: entry.contentType,
      }),
      live: (entry.doc !== undefined && entry.doc !== "") || paths.has(entry.path),
    });
  return out;
}
//@ chunk-51jy8ztq.js:37244-37451 placement
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
//@ chunk-51jy8ztq.js:37451-37484 placement
function commentsToolName() {
  return isArtifactToolsetSplit() ? ARTIFACT_COMMENTS_TOOL_NAME : ARTIFACT_TOOL_NAME;
}
//@ chunk-51jy8ztq.js:37484-37611 placement
function commentsToolReference() {
  return isArtifactToolsetSplit()
    ? `the ${ARTIFACT_COMMENTS_TOOL_NAME} tool (load it with ${TOOL_SEARCH_TOOL_NAME}, query \`select:${ARTIFACT_COMMENTS_TOOL_NAME}\`, if it is not loaded)`
    : `the ${ARTIFACT_TOOL_NAME} tool`;
}
//@ chunk-51jy8ztq.js:37611-37682 placement
function commentsToolAction(action) {
  return `${ARTIFACT_COMMENTS_TOOL_NAME} tool, action "${action === "comments" ? "read" : action}"`;
}
//@ chunk-51jy8ztq.js:37682-37717 placement
function pickByToolset(whenSplit, whenCombined) {
  return isArtifactToolsetSplit() ? whenCombined() : whenSplit;
}
//@ chunk-51jy8ztq.js:37717-37798 placement
function commentsToolCall(name, action) {
  return isArtifactToolsetSplit()
    ? {
        name: ARTIFACT_COMMENTS_TOOL_NAME,
        input: fromParentArtifactInput("comments", action),
      }
    : {
        name,
        input: action,
      };
}
export {
  isResumeFrameSeedEligible,
  isPublishToolEnabled,
  isCoworkFramePublishSession,
  pickByToolset,
  othersArtifactReadIsUserOnly,
  othersReadIsUserOnly,
  isArtifactToolRegistered,
  isArtifactReadOnlySurface,
  maybeLogArtifactDisabledSession,
  artifactToolWithholdingGate,
  maybeLogArtifactToolWithheld,
  artifactYieldAdminRefusal,
  isArtifactAdminAllowed,
  artifactPolicyUnobtained,
  artifactHeldPolicyDenyCause,
  othersArtifactReadConsentSurface,
  outsideOrgRead,
  isCoworkHostSession,
  otherOrgCopySource,
  isRepublishInlinePromptEnabled,
  placedInOwnOrg,
  artifactFileManifest,
  invitedCopySource,
  isArtifactSwitchedOffInSettings,
  resolveArtifactEnableSetting,
  isArtifactAccountAllowed,
  outsideOrgReadIsUserOnly,
  isArtifactToolsetSplit,
  heldArtifactPolicyFetchAnswer,
  isArtifactToolReplacedByCcrEntry,
  isArtifactToolEnabled,
  artifactDocsOrFiles,
  ARTIFACT_DOC_PATH_RE,
  artifactDocs,
  isArtifactSdkDefaultOff,
  isArtifactReadEnabled,
  commentsToolAction,
  commentsToolReference,
  commentsToolCall,
  commentsToolName,
  isArtifactConfigToggleable,
  emitArtifactStartupTelemetry,
  shouldRefreshArtifactRoster,
  getArtifactDefaultOn,
  SAFE_ARTIFACT_PATH_RE,
  claimScratchpadStartForCcrEntry,
  holdArtifactStartupTelemetry,
  isArtifactToolEligible,
};

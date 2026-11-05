/**
 * bridge/bridgeEnabled.ts
 *
 * 并入已有模块：按当前 bearer 的 sha256 去重地发起订阅计划查询（超过时限重新拉取），结果缓存在全局状态里供 Remote Control 资格判断用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeEnabled.ts
 * pieces: chunk-csb2jdt5.js (1), chunk-et4eevep.js (11), chunk-h3xdf7nq.js (17)
 * attribution: fingerprint 1, placement 23, facade-majority 4, layout 1
 */
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
import { env } from "../utils/env.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  isGrowthBookEnabled,
  hasGrowthBookInitializeStarted,
  refreshGrowthBookFeatures,
  isGrowthBookInitializeInFlight,
} from "../services/analytics/growthbook.js";
import {
  getFetchedClientData,
  seedClientDataForCurrentKey,
  clientDataSlotKey,
  hasClientDataCacheSlot,
} from "../utils/config.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { logError } from "../utils/log.js";
import { getProviderState } from "../utils/model/providerCaches.js";
import {
  getAPIProvider,
  isFirstPartyProvider,
  isActualFirstPartyAnthropicBaseUrl,
} from "../utils/model/providers.js";
import { getAuthenticatedAccountEpoch } from "../bootstrap/state.js";
import { getPolicyLimitsTunnelSocket, isPolicyLimitsEligible } from "../services/policyLimits/policyState.js";
import { isSubscriberSafe, SUBSCRIPTION_PLAN_NAMES, hasProfileScopeSafe } from "./bridgeEntitlement.js";
import {
  isGrowthBookUnavailableOnNoTelemetry,
  getBearerSubscriptionType,
  getBridgeAccessToken_2,
  hasFreshBearerPlan,
} from "./bridgeConfig.js";
import {
  isTrustedDevicesRequiredOrAbsent,
  isBridgeChildAutoModeDefaultEnabled,
  isBridgeRcChildArtifactEnabled,
  isBridgeRcChildCliEntrypointEnabled,
  isBridgeRcChildAutoCompactEnabled,
  isBridgeRcChildProjectsEntrypointEnabled,
  isBridgeChildMachineSettingsEnabled,
  isBridgeChildAutoOverSettingsEnabled,
} from "./bridgeGates.js";
import { getOauthAccountInfo_2, getClaudeAIOAuthTokens } from "../utils/auth.js";
import { withDeadline, sleep } from "../utils/sleep.js";
import { bridgeHostState } from "./bridgeHostState.js";
import { isEssentialTrafficOnly, getPrivacyLevel } from "../utils/privacyLevel.js";
import { REMOTE_CONTROL_APP, REMOTE_CONTROL_CLI, RC_CHILD, WORKFLOW_REMOTE_AGENT } from "./sessionOrigins.js";
import { canSeedAutoMode } from "../utils/permissions/permissionSetup.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { isSemverString, splitOnDash } from "../utils/model/modelCatalog/catalogCapabilities.js";
import { semverGte, lt } from "../utils/semver.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, isAbortError, ConfigParseError } from "../utils/errors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-h3xdf7nq.js:1293-1323 placement
var TENGU_REFLECTIVE_WOLF = "tengu_reflective_wolf";
//@ chunk-h3xdf7nq.js:1323-1472 placement
function isAttributionAnnouncementEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.attributionAnnouncementEnabled ??=
    env.CLAUDE_CODE_ATTRIBUTION_ANNOUNCEMENT ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_REFLECTIVE_WOLF, true);
  return sessionFeatureValues.attributionAnnouncementEnabled;
}
//@ chunk-h3xdf7nq.js:1472-1593 placement
function withClientDataReseedOnModelChange(refresh) {
  let clientDataBefore = isAttributionAnnouncementEnabled() ? getFetchedClientData() : undefined;
  let mainLoopModel = getMainLoopModel();
  refresh();
  if (clientDataBefore === undefined || getMainLoopModel() === mainLoopModel) return;
  seedClientDataForCurrentKey(clientDataBefore, {
    forContextWindow: true,
  });
  return clientDataBefore;
}
//@ chunk-h3xdf7nq.js:1593-1750 placement
function refreshBootstrapDataTracked(storageV5, credentials, renderedClientData) {
  let fetchPromise = import("../services/api/bootstrap.js")
    .then(({ refreshBootstrapData }) =>
      refreshBootstrapData(storageV5, credentials, {
        renderedClientData,
      }),
    )
    .then(
      () => {},
      (error) => logError(error),
    );
  trackClientDataFetch(fetchPromise);
  return fetchPromise;
}
//@ chunk-h3xdf7nq.js:1750-1786 placement
/**
 * refreshBootstrapDataTracked 的薄包装（同名导出已被占用，加后缀）；在清模型/应用状态变化时刷新启动数据。
 */
function refreshBootstrapDataTracked_2(storageV5, credentials, renderedClientData) {
  return refreshBootstrapDataTracked(storageV5, credentials, renderedClientData);
}
//@ chunk-h3xdf7nq.js:1786-1827 placement
/**
 * 设置 providerState.fetchesClientData 开关（是否拉取 clientData）。
 */
function setFetchesClientData(fetchesClientData) {
  getProviderState().fetchesClientData = fetchesClientData;
}
//@ chunk-h3xdf7nq.js:1827-1893 placement
/**
 * 判断是否应拉取 clientData：已开启该开关且当前 API 提供商为 firstParty。
 */
function isFirstPartyClientDataFetchEnabled() {
  return getProviderState().fetchesClientData && getAPIProvider() === "firstParty";
}
//@ chunk-h3xdf7nq.js:1893-2109 placement
function trackClientDataFetch(fetchPromise) {
  let slotKey = clientDataSlotKey();
  let clientDataFetches = getProviderState().providerCache.clientDataFetches;
  if (slotKey !== undefined && !(clientDataFetches.get(slotKey) instanceof Promise)) {
    let authenticatedAccountEpoch = getAuthenticatedAccountEpoch();
    clientDataFetches.set(slotKey, fetchPromise);
    fetchPromise.finally(() => {
      if (clientDataFetches.get(slotKey) === fetchPromise)
        if (getAuthenticatedAccountEpoch() === authenticatedAccountEpoch)
          clientDataFetches.set(slotKey, "over");
        else clientDataFetches.delete(slotKey);
    });
  }
}
//@ chunk-h3xdf7nq.js:2109-2203 placement
function pendingClientDataFetches() {
  return [...getProviderState().providerCache.clientDataFetches.values()].filter(
    (clientDataFetch) => clientDataFetch !== "over",
  );
}
//@ chunk-h3xdf7nq.js:2203-2304 placement
function markClientDataFetchOver(clientDataFetch) {
  let clientDataFetches = getProviderState().providerCache.clientDataFetches;
  for (let [slotKey, value] of clientDataFetches)
    if (value === clientDataFetch) clientDataFetches.set(slotKey, "over");
}
//@ chunk-h3xdf7nq.js:2304-2481 placement
function ensureClientDataFetch(storageV5, credentials) {
  let slotKey = clientDataSlotKey();
  if (slotKey === undefined || !isFirstPartyClientDataFetchEnabled() || hasClientDataCacheSlot()) return;
  let existing = getProviderState().providerCache.clientDataFetches.get(slotKey);
  if (existing !== undefined) return existing === "over" ? undefined : existing;
  return refreshBootstrapDataTracked(storageV5, credentials, getFetchedClientData());
}
//@ chunk-h3xdf7nq.js:2481-2587 placement
function isBridgeFirstParty() {
  if (!isFirstPartyProvider()) return false;
  if (getPolicyLimitsTunnelSocket() !== undefined) return true;
  if (env.ANTHROPIC_UNIX_SOCKET) return false;
  return isActualFirstPartyAnthropicBaseUrl();
}
//@ chunk-h3xdf7nq.js:2587-2652 placement (2.1.88 match: isBridgeEnabled, 1)
/**
 * Remote Control 是否可用：订阅用户、一方提供商，且 tengu_ccr_bridge 或另一条件成立。
 */
function hasBridgeEntitlement() {
  return (
    isBridgeFirstParty() &&
    isSubscriberSafe() &&
    (getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_bridge", false) || isBridgeSubscriptionEligible())
  );
}
//@ chunk-h3xdf7nq.js:2652-2927 placement
/**
 * 判断当前账户订阅是否允许 Remote Control：优先用已知订阅类型（team/enterprise 还需策略限制资格），否则从 OAuth 令牌的 subscriptionType 判断。
 */
function isBridgeSubscriptionEligible() {
  if (!isGrowthBookUnavailableOnNoTelemetry() || !isBridgeFirstParty() || isTrustedDevicesRequiredOrAbsent())
    return false;
  let bearerSubscriptionType = getBearerSubscriptionType();
  if (bearerSubscriptionType !== null)
    return (
      SUBSCRIPTION_PLAN_NAMES.includes(bearerSubscriptionType) &&
      ((bearerSubscriptionType !== "team" && bearerSubscriptionType !== "enterprise") ||
        isPolicyLimitsEligible())
    );
  if (!hasProfileScopeSafe() || !getOauthAccountInfo_2()?.organizationUuid) return false;
  try {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    let subscriptionType = claudeAIOAuthTokens?.refreshToken
      ? (claudeAIOAuthTokens.subscriptionType ?? null)
      : null;
    return subscriptionType !== null && SUBSCRIPTION_PLAN_NAMES.includes(subscriptionType);
  } catch {
    return false;
  }
}
//@ chunk-h3xdf7nq.js:3472-3491 placement
var PREFETCH_BRIDGE_PLAN_TIMEOUT_MS = 6000;
var BEARER_PLAN_REFRESH_MS = 60000;
//@ chunk-h3xdf7nq.js:3491-3632 placement
async function prefetchBridgePlanInfo(options) {
  if (getBridgeAccessToken_2() === null || !isGrowthBookUnavailableOnNoTelemetry() || hasFreshBearerPlan())
    return;
  await withDeadline(
    Promise.allSettled(pendingClientDataFetches()).then(async () => {
      if (options !== undefined) {
        await kickBearerPlanFetch(options);
        await kickBearerPlanFetch(options);
      }
    }),
    PREFETCH_BRIDGE_PLAN_TIMEOUT_MS,
  );
}
//@ chunk-h3xdf7nq.js:3632-4018 placement
/**
 * 按当前 bearer 的 sha256 去重地发起订阅计划查询（超过时限重新拉取），结果缓存在全局状态里供 Remote Control 资格判断用。
 */
function kickBearerPlanFetch({ storageV5, credentials }) {
  let bridgeAccessToken = getBridgeAccessToken_2();
  if (bridgeAccessToken === null || hasFreshBearerPlan()) return;
  let hostState = bridgeHostState();
  if (
    hostState.bearerPlanFetch?.bearerSha256 !== bridgeAccessToken ||
    Date.now() - hostState.bearerPlanFetch.startedAtMs >= BEARER_PLAN_REFRESH_MS
  )
    hostState.bearerPlanFetch = {
      bearerSha256: bridgeAccessToken,
      startedAtMs: Date.now(),
      answered: import("../services/api/bootstrap.js")
        .then(({ refreshBootstrapData }) =>
          refreshBootstrapData(storageV5, credentials, {
            keepRenderCaches: true,
          }),
        )
        .then(
          () => {},
          (error) => logError(error),
        ),
    };
  return hostState.bearerPlanFetch.answered;
}
//@ chunk-csb2jdt5.js:8226-8418 fingerprint (2.1.88 match: isClaudeAISubscriber, 0.322)
/**
 * 是否应主动注册可信设备：非云容器、非 DISABLE_LOGIN_COMMAND、一方提供商、claude.ai 订阅、未设 CLAUDE_TRUSTED_DEVICE_TOKEN、非仅必要流量。
 */
function shouldProactivelyEnrollDevice() {
  let { isClaudeAISubscriber } = require("../utils/auth.js");
  return !(
    env.CLAUDE_CODE_REMOTE === true ||
    env.DISABLE_LOGIN_COMMAND ||
    !isFirstPartyProvider() ||
    !isClaudeAISubscriber() ||
    process.env.CLAUDE_TRUSTED_DEVICE_TOKEN ||
    isEssentialTrafficOnly()
  );
}
//@ chunk-et4eevep.js:626-642 placement
var REMOTE_CONTROL_SESSION_ORIGINS = [REMOTE_CONTROL_APP, REMOTE_CONTROL_CLI];
//@ chunk-et4eevep.js:642-963 placement
/**
 * 按会话标签（hearth-rc-child、RC_CHILD、WORKFLOW_REMOTE_AGENT 等）判断 Remote Control 子会话的角色：rcChild、projectThreadChild、attended、mayBeAttended；标签未读到时视为可能有人值守。
 */
function classifyBridgeSessionRoles(tags) {
  if (tags === null)
    return {
      tagsRead: false,
      rcChild: false,
      projectThreadChild: false,
      attended: false,
      mayBeAttended: true,
    };
  let isProjectThreadChild = false;
  isProjectThreadChild = tags.includes("hearth-rc-child");
  let included = tags.includes(RC_CHILD);
  return {
    tagsRead: true,
    rcChild: included,
    projectThreadChild: isProjectThreadChild,
    attended:
      tags.some((tag) => REMOTE_CONTROL_SESSION_ORIGINS.includes(tag)) &&
      !included &&
      !tags.includes(WORKFLOW_REMOTE_AGENT),
    mayBeAttended: !included && !isProjectThreadChild && !tags.includes(WORKFLOW_REMOTE_AGENT),
  };
}
//@ chunk-et4eevep.js:963-1064 placement
function hasBridgeChildFeatureEnabled(entrypoint) {
  if (
    isBridgeChildAutoModeDefaultEnabled() ||
    isBridgeRcChildArtifactEnabled() ||
    (entrypoint === "spawn" && isBridgeRcChildCliEntrypointEnabled())
  )
    return true;
  return (
    isBridgeRcChildAutoCompactEnabled() ||
    isBridgeRcChildProjectsEntrypointEnabled() ||
    (entrypoint === "spawn" && isBridgeChildMachineSettingsEnabled())
  );
}
//@ chunk-et4eevep.js:1064-1491 placement
/**
 * 根据会话角色与各 bridge 子会话特性开关，算出该子会话启用的功能：auto 模式默认、auto 覆盖设置、artifact、机器设置、自动压缩、Projects 入口、CLI 入口。
 */
function resolveBridgeChildFeatures(context) {
  let autoDefaultEnabled =
    context.roles.rcChild && !context.modePinned && isBridgeChildAutoModeDefaultEnabled();
  let autoOverSettings =
    autoDefaultEnabled && isBridgeChildAutoOverSettingsEnabled() && canSeedAutoMode(context.settings());
  let attended = context.roles.attended;
  let machineSettings = false;
  let autoCompact = false;
  let projectsEntrypoint = false;
  attended = attended || context.roles.projectThreadChild;
  machineSettings = context.roles.projectThreadChild && isBridgeChildMachineSettingsEnabled();
  autoCompact = context.roles.projectThreadChild && isBridgeRcChildAutoCompactEnabled();
  projectsEntrypoint = context.roles.projectThreadChild && isBridgeRcChildProjectsEntrypointEnabled();
  let artifact = attended && isBridgeRcChildArtifactEnabled();
  return {
    autoDefault: autoDefaultEnabled,
    autoOverSettings,
    artifact,
    machineSettings,
    autoCompact,
    projectsEntrypoint,
    cliEntrypoint: context.roles.mayBeAttended && isBridgeRcChildCliEntrypointEnabled(),
  };
}
//@ chunk-et4eevep.js:1491-1574 placement
var BUILTIN_BRIDGE_MIN_VERSION; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var bridgeMinVersionSchema;
deferInit("chunk-et4eevep.js:1491", () => {
  BUILTIN_BRIDGE_MIN_VERSION = "2.1.270";
  bridgeMinVersionSchema = DoctorLazy(() =>
    objectSchema({
      minVersion: stringSchema()
        .refine((version) => version === "" || isSemverString(version))
        .optional(),
    }),
  );
});
//@ chunk-et4eevep.js:1574-1901 placement
/**
 * 读取 GrowthBook tengu_bridge_min_version 并校验；开关关闭返回 null，未取到或格式错时返回内置最低版本并标注 unknown 原因，否则取配置与内置值中较高者。
 */
function getBridgeMinVersionConfig() {
  let { value: featureValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    "tengu_bridge_min_version",
    {
      minVersion: BUILTIN_BRIDGE_MIN_VERSION,
    },
  );
  if (source === "disabled") return null;
  if (source === "fallback" && !hasFreshGrowthBookFeatures())
    return {
      minVersion: BUILTIN_BRIDGE_MIN_VERSION,
      unknown: "unanswered",
    };
  let parsed = bridgeMinVersionSchema().safeParse(featureValue);
  if (!parsed.success)
    return {
      minVersion: BUILTIN_BRIDGE_MIN_VERSION,
      unknown: "malformed",
    };
  let minVersion = parsed.data.minVersion;
  return {
    minVersion:
      minVersion && semverGte(minVersion, BUILTIN_BRIDGE_MIN_VERSION)
        ? minVersion
        : BUILTIN_BRIDGE_MIN_VERSION,
    unknown: null,
  };
}
//@ chunk-et4eevep.js:1901-2631 facade-majority (2.1.88 match: checkBridgeMinVersion, 0.452)
/**
 * 版本低于 tengu_bridge_min_version 配置时返回"请 claude update"提示。
 */
function checkBridgeMinVersion(
  version = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  let bridgeMinVersionConfig = getBridgeMinVersionConfig();
  if (bridgeMinVersionConfig === null) return null;
  if (lt(splitOnDash(version), bridgeMinVersionConfig.minVersion))
    return `Your version of Claude Code (${version}) is too old for Remote Control.
Version ${bridgeMinVersionConfig.minVersion} or higher is required. Run \`claude update\` to update.`;
  return null;
}
//@ chunk-et4eevep.js:2631-4110 facade-majority
function machineLaneVersionRefusal(
  version = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  let bridgeMinVersionConfig = getBridgeMinVersionConfig();
  if (bridgeMinVersionConfig === null)
    return getPrivacyLevel() === "no-telemetry"
      ? {
          reason: "floor_unreachable",
          message: `This computer's Claude Code (${version}) cannot take a session started remotely on it: the version such sessions require cannot be received while feature-flag evaluation is off (DISABLE_TELEMETRY or DO_NOT_TRACK is set).`,
        }
      : null;
  switch (bridgeMinVersionConfig.unknown) {
    case "unanswered":
      return {
        reason: "floor_unanswered",
        message: `This computer's Claude Code (${version}) cannot take a session started remotely on it: the version such sessions require has not been received from the server.`,
      };
    case "malformed":
      return {
        reason: "floor_malformed",
        message: `This computer's Claude Code (${version}) cannot take a session started remotely on it: the version such sessions require could not be read.`,
      };
    case null:
      if (lt(splitOnDash(version), bridgeMinVersionConfig.minVersion))
        return {
          reason: "below_floor",
          message: `This computer's Claude Code (${version}) is below the version a session started remotely on it requires (${bridgeMinVersionConfig.minVersion}). Run \`claude update\` to update.`,
        };
      return null;
  }
}
//@ chunk-et4eevep.js:4110-4126 layout
var _ = 1e4;
var MACHINE_LANE_VERSION_POLL_STEP_MS = 500;
//@ chunk-et4eevep.js:4126-5093 facade-majority
async function machineLaneVersionRefusalAfterHold(
  previousRefusal,
  loopSignal,
  holdState,
  version = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  try {
    if (!isGrowthBookEnabled() || !hasGrowthBookInitializeStarted()) return previousRefusal;
    holdState.inFlight ??= refreshGrowthBookFeatures()
      .catch((error) =>
        logForDebugging(`[bridge:floor] Flag refresh failed: ${errorMessage(error)}`, {
          level: "error",
        }),
      )
      .finally(() => {
        holdState.inFlight = undefined;
      });
    for (
      let waitedMs = 0;
      waitedMs < _ && !loopSignal.aborted;
      waitedMs += MACHINE_LANE_VERSION_POLL_STEP_MS
    ) {
      await sleep(MACHINE_LANE_VERSION_POLL_STEP_MS, loopSignal);
      let bridgeMinVersionConfig = getBridgeMinVersionConfig();
      if (loopSignal.aborted || bridgeMinVersionConfig === null) break;
      if (bridgeMinVersionConfig.unknown !== "unanswered") return machineLaneVersionRefusal(version);
      if (holdState.inFlight === undefined && !isGrowthBookInitializeInFlight()) break;
    }
  } catch (error) {
    if (isAbortError(error) || error instanceof ConfigParseError)
      logForDebugging(`[bridge:floor] Hold ended without an answer: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
  }
  return previousRefusal;
}
//@ chunk-et4eevep.js:5093-5194 facade-majority
function isMachineLaneWork(tags, versionRefusal) {
  if (tags === null) return versionRefusal.reason !== "floor_unreachable";
  return classifyBridgeSessionRoles(tags).projectThreadChild;
}
export {
  isBridgeFirstParty,
  classifyBridgeSessionRoles,
  machineLaneVersionRefusal,
  isMachineLaneWork,
  machineLaneVersionRefusalAfterHold,
  hasBridgeChildFeatureEnabled,
  withClientDataReseedOnModelChange,
  refreshBootstrapDataTracked_2,
  trackClientDataFetch,
  BEARER_PLAN_REFRESH_MS,
  ensureClientDataFetch,
  markClientDataFetchOver,
  isAttributionAnnouncementEnabled,
  hasBridgeEntitlement,
  resolveBridgeChildFeatures,
  isFirstPartyClientDataFetchEnabled,
  setFetchesClientData,
  shouldProactivelyEnrollDevice,
  prefetchBridgePlanInfo,
  isBridgeSubscriptionEligible,
  checkBridgeMinVersion,
};

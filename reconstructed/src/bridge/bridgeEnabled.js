/**
 * bridge/bridgeEnabled.ts
 *
 * 并入已有模块：按当前 bearer 的 sha256 去重地发起订阅计划查询（超过时限重新拉取），结果缓存在全局状态里供 Remote Control 资格判断用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeEnabled.ts
 * pieces: chunk-0jk9tmkx.js (1), chunk-71c4j971.js (17), chunk-tpjqzh89.js (11)
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
import { REMOTE_CONTROL_APP, REMOTE_CONTROL_CLI, RC_CHILD, WORKFLOW_REMOTE_AGENT } from "./sessionOrigins.js";
import { canSeedAutoMode } from "../utils/permissions/permissionSetup.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string } from "../../vendor/zod/v4/classic/schemas.js";
import { isSemverString, splitOnDash } from "../utils/model/modelCatalog/catalogCapabilities.js";
import { semverGte, lt_2 as lt } from "../utils/semver.js";
import { getPrivacyLevel, isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, isAbortError, ConfigParseError } from "../utils/errors.js";

//@ chunk-71c4j971.js:1185-1215 placement
var TENGU_REFLECTIVE_WOLF = "tengu_reflective_wolf";
//@ chunk-71c4j971.js:1215-1364 placement
function isAttributionAnnouncementEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.attributionAnnouncementEnabled ??=
    env.CLAUDE_CODE_ATTRIBUTION_ANNOUNCEMENT ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_REFLECTIVE_WOLF, true);
  return sessionFeatureValues.attributionAnnouncementEnabled;
}
//@ chunk-71c4j971.js:1364-1485 placement
function withClientDataReseedOnModelChange(e) {
  let o = isAttributionAnnouncementEnabled() ? getFetchedClientData() : undefined;
  let mainLoopModel = getMainLoopModel();
  e();
  if (o === undefined || getMainLoopModel() === mainLoopModel) return;
  seedClientDataForCurrentKey(o, {
    forContextWindow: true,
  });
  return o;
}
//@ chunk-71c4j971.js:1485-1642 placement
function refreshBootstrapDataTracked(e, o, renderedClientData) {
  let r = import("./chunk-1qx2v2vg.js")
    .then(({ refreshBootstrapData }) =>
      refreshBootstrapData(e, o, {
        renderedClientData,
      }),
    )
    .then(
      () => {},
      (error) => logError(error),
    );
  trackClientDataFetch(r);
  return r;
}
//@ chunk-71c4j971.js:1642-1678 placement
/**
 * refreshBootstrapDataTracked 的薄包装（同名导出已被占用，加后缀）；在清模型/应用状态变化时刷新启动数据。
 */
function refreshBootstrapDataTracked_2(e, o, renderedClientData) {
  return refreshBootstrapDataTracked(e, o, renderedClientData);
}
//@ chunk-71c4j971.js:1678-1719 placement
/**
 * 设置 providerState.fetchesClientData 开关（是否拉取 clientData）。
 */
function setFetchesClientData(fetchesClientData) {
  getProviderState().fetchesClientData = fetchesClientData;
}
//@ chunk-71c4j971.js:1719-1785 placement
/**
 * 判断是否应拉取 clientData：已开启该开关且当前 API 提供商为 firstParty。
 */
function isFirstPartyClientDataFetchEnabled() {
  return getProviderState().fetchesClientData && getAPIProvider() === "firstParty";
}
//@ chunk-71c4j971.js:1785-2001 placement
function trackClientDataFetch(bootstrapData) {
  let o = clientDataSlotKey();
  let clientDataFetches = getProviderState().providerCache.clientDataFetches;
  if (o !== undefined && !(clientDataFetches.get(o) instanceof Promise)) {
    let authenticatedAccountEpoch = getAuthenticatedAccountEpoch();
    clientDataFetches.set(o, bootstrapData);
    bootstrapData.finally(() => {
      if (clientDataFetches.get(o) === bootstrapData)
        if (getAuthenticatedAccountEpoch() === authenticatedAccountEpoch) clientDataFetches.set(o, "over");
        else clientDataFetches.delete(o);
    });
  }
}
//@ chunk-71c4j971.js:2001-2095 placement
function pendingClientDataFetches() {
  return [...getProviderState().providerCache.clientDataFetches.values()].filter(
    (clientDataFetch) => clientDataFetch !== "over",
  );
}
//@ chunk-71c4j971.js:2095-2196 placement
function markClientDataFetchOver(clientDataFetch) {
  let clientDataFetches = getProviderState().providerCache.clientDataFetches;
  for (let [n, r] of clientDataFetches) if (r === clientDataFetch) clientDataFetches.set(n, "over");
}
//@ chunk-71c4j971.js:2196-2373 placement
function ensureClientDataFetch(storageV5, credentials) {
  let n = clientDataSlotKey();
  if (n === undefined || !isFirstPartyClientDataFetchEnabled() || hasClientDataCacheSlot()) return;
  let r = getProviderState().providerCache.clientDataFetches.get(n);
  if (r !== undefined) return r === "over" ? undefined : r;
  return refreshBootstrapDataTracked(storageV5, credentials, getFetchedClientData());
}
//@ chunk-71c4j971.js:2373-2479 placement
function isBridgeFirstParty() {
  if (!isFirstPartyProvider()) return false;
  if (getPolicyLimitsTunnelSocket() !== undefined) return true;
  if (env.ANTHROPIC_UNIX_SOCKET) return false;
  return isActualFirstPartyAnthropicBaseUrl();
}
//@ chunk-71c4j971.js:2479-2544 placement = isBridgeEnabled (1)
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
//@ chunk-71c4j971.js:2544-2819 placement
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
    let n = claudeAIOAuthTokens?.refreshToken ? (claudeAIOAuthTokens.subscriptionType ?? null) : null;
    return n !== null && SUBSCRIPTION_PLAN_NAMES.includes(n);
  } catch {
    return false;
  }
}
//@ chunk-71c4j971.js:3364-3383 placement
var PREFETCH_BRIDGE_PLAN_TIMEOUT_MS = 6000;
var BEARER_PLAN_REFRESH_MS = 60000;
//@ chunk-71c4j971.js:3383-3524 placement
async function prefetchBridgePlanInfo(e) {
  if (getBridgeAccessToken_2() === null || !isGrowthBookUnavailableOnNoTelemetry() || hasFreshBearerPlan())
    return;
  await withDeadline(
    Promise.allSettled(pendingClientDataFetches()).then(async () => {
      if (e !== undefined) {
        await kickBearerPlanFetch(e);
        await kickBearerPlanFetch(e);
      }
    }),
    PREFETCH_BRIDGE_PLAN_TIMEOUT_MS,
  );
}
//@ chunk-71c4j971.js:3524-3910 placement
/**
 * 按当前 bearer 的 sha256 去重地发起订阅计划查询（超过时限重新拉取），结果缓存在全局状态里供 Remote Control 资格判断用。
 */
function kickBearerPlanFetch({ storageV5, credentials }) {
  let bridgeAccessToken = getBridgeAccessToken_2();
  if (bridgeAccessToken === null || hasFreshBearerPlan()) return;
  let r = bridgeHostState();
  if (
    r.bearerPlanFetch?.bearerSha256 !== bridgeAccessToken ||
    Date.now() - r.bearerPlanFetch.startedAtMs >= BEARER_PLAN_REFRESH_MS
  )
    r.bearerPlanFetch = {
      bearerSha256: bridgeAccessToken,
      startedAtMs: Date.now(),
      answered: import("./chunk-1qx2v2vg.js")
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
  return r.bearerPlanFetch.answered;
}
//@ chunk-tpjqzh89.js:626-642 placement
var REMOTE_CONTROL_SESSION_ORIGINS = [REMOTE_CONTROL_APP, REMOTE_CONTROL_CLI];
//@ chunk-tpjqzh89.js:642-963 placement
/**
 * 按会话标签（hearth-rc-child、RC_CHILD、WORKFLOW_REMOTE_AGENT 等）判断 Remote Control 子会话的角色：rcChild、projectThreadChild、attended、mayBeAttended；标签未读到时视为可能有人值守。
 */
function classifyBridgeSessionRoles(e) {
  if (e === null)
    return {
      tagsRead: false,
      rcChild: false,
      projectThreadChild: false,
      attended: false,
      mayBeAttended: true,
    };
  let r = false;
  r = e.includes("hearth-rc-child");
  let included = e.includes(RC_CHILD);
  return {
    tagsRead: true,
    rcChild: included,
    projectThreadChild: r,
    attended:
      e.some((a) => REMOTE_CONTROL_SESSION_ORIGINS.includes(a)) &&
      !included &&
      !e.includes(WORKFLOW_REMOTE_AGENT),
    mayBeAttended: !included && !r && !e.includes(WORKFLOW_REMOTE_AGENT),
  };
}
//@ chunk-tpjqzh89.js:963-1064 placement
function hasBridgeChildFeatureEnabled(e) {
  if (
    isBridgeChildAutoModeDefaultEnabled() ||
    isBridgeRcChildArtifactEnabled() ||
    (e === "spawn" && isBridgeRcChildCliEntrypointEnabled())
  )
    return true;
  return (
    isBridgeRcChildAutoCompactEnabled() ||
    isBridgeRcChildProjectsEntrypointEnabled() ||
    (e === "spawn" && isBridgeChildMachineSettingsEnabled())
  );
}
//@ chunk-tpjqzh89.js:1064-1491 placement
/**
 * 根据会话角色与各 bridge 子会话特性开关，算出该子会话启用的功能：auto 模式默认、auto 覆盖设置、artifact、机器设置、自动压缩、Projects 入口、CLI 入口。
 */
function resolveBridgeChildFeatures(e) {
  let r = e.roles.rcChild && !e.modePinned && isBridgeChildAutoModeDefaultEnabled();
  let autoOverSettings = r && isBridgeChildAutoOverSettingsEnabled() && canSeedAutoMode(e.settings());
  let attended = e.roles.attended;
  let machineSettings = false;
  let autoCompact = false;
  let projectsEntrypoint = false;
  attended = attended || e.roles.projectThreadChild;
  machineSettings = e.roles.projectThreadChild && isBridgeChildMachineSettingsEnabled();
  autoCompact = e.roles.projectThreadChild && isBridgeRcChildAutoCompactEnabled();
  projectsEntrypoint = e.roles.projectThreadChild && isBridgeRcChildProjectsEntrypointEnabled();
  let artifact = attended && isBridgeRcChildArtifactEnabled();
  return {
    autoDefault: r,
    autoOverSettings,
    artifact,
    machineSettings,
    autoCompact,
    projectsEntrypoint,
    cliEntrypoint: e.roles.mayBeAttended && isBridgeRcChildCliEntrypointEnabled(),
  };
}
//@ chunk-tpjqzh89.js:1491-1574 placement
var BUILTIN_BRIDGE_MIN_VERSION = "2.1.270";
var bridgeMinVersionSchema = DoctorLazy(() =>
  u({
    minVersion: string()
      .refine((e) => e === "" || isSemverString(e))
      .optional(),
  }),
);
//@ chunk-tpjqzh89.js:1574-1901 placement
/**
 * 读取 GrowthBook tengu_bridge_min_version 并校验；开关关闭返回 null，未取到或格式错时返回内置最低版本并标注 unknown 原因，否则取配置与内置值中较高者。
 */
function getBridgeMinVersionConfig() {
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_bridge_min_version", {
    minVersion: BUILTIN_BRIDGE_MIN_VERSION,
  });
  if (source === "disabled") return null;
  if (source === "fallback" && !hasFreshGrowthBookFeatures())
    return {
      minVersion: BUILTIN_BRIDGE_MIN_VERSION,
      unknown: "unanswered",
    };
  let n = bridgeMinVersionSchema().safeParse(e);
  if (!n.success)
    return {
      minVersion: BUILTIN_BRIDGE_MIN_VERSION,
      unknown: "malformed",
    };
  let minVersion = n.data.minVersion;
  return {
    minVersion:
      minVersion && semverGte(minVersion, BUILTIN_BRIDGE_MIN_VERSION)
        ? minVersion
        : BUILTIN_BRIDGE_MIN_VERSION,
    unknown: null,
  };
}
//@ chunk-tpjqzh89.js:1901-2631 facade-majority = checkBridgeMinVersion (0.452)
/**
 * 版本低于 tengu_bridge_min_version 配置时返回"请 claude update"提示。
 */
function checkBridgeMinVersion(
  e = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  let bridgeMinVersionConfig = getBridgeMinVersionConfig();
  if (bridgeMinVersionConfig === null) return null;
  if (lt(splitOnDash(e), bridgeMinVersionConfig.minVersion))
    return `Your version of Claude Code (${e}) is too old for Remote Control.
Version ${bridgeMinVersionConfig.minVersion} or higher is required. Run \`claude update\` to update.`;
  return null;
}
//@ chunk-tpjqzh89.js:2631-4110 facade-majority
function machineLaneVersionRefusal(
  e = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  let bridgeMinVersionConfig = getBridgeMinVersionConfig();
  if (bridgeMinVersionConfig === null)
    return getPrivacyLevel() === "no-telemetry"
      ? {
          reason: "floor_unreachable",
          message: `This computer's Claude Code (${e}) cannot take a session started remotely on it: the version such sessions require cannot be received while feature-flag evaluation is off (DISABLE_TELEMETRY or DO_NOT_TRACK is set).`,
        }
      : null;
  switch (bridgeMinVersionConfig.unknown) {
    case "unanswered":
      return {
        reason: "floor_unanswered",
        message: `This computer's Claude Code (${e}) cannot take a session started remotely on it: the version such sessions require has not been received from the server.`,
      };
    case "malformed":
      return {
        reason: "floor_malformed",
        message: `This computer's Claude Code (${e}) cannot take a session started remotely on it: the version such sessions require could not be read.`,
      };
    case null:
      if (lt(splitOnDash(e), bridgeMinVersionConfig.minVersion))
        return {
          reason: "below_floor",
          message: `This computer's Claude Code (${e}) is below the version a session started remotely on it requires (${bridgeMinVersionConfig.minVersion}). Run \`claude update\` to update.`,
        };
      return null;
  }
}
//@ chunk-tpjqzh89.js:4110-4126 layout
var _ = 1e4;
var MACHINE_LANE_VERSION_POLL_STEP_MS = 500;
//@ chunk-tpjqzh89.js:4126-5093 facade-majority
async function machineLaneVersionRefusalAfterHold(
  e,
  loopSignal,
  n,
  a = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  try {
    if (!isGrowthBookEnabled() || !hasGrowthBookInitializeStarted()) return e;
    n.inFlight ??= refreshGrowthBookFeatures()
      .catch((error) =>
        logForDebugging(`[bridge:floor] Flag refresh failed: ${errorMessage(error)}`, {
          level: "error",
        }),
      )
      .finally(() => {
        n.inFlight = undefined;
      });
    for (let i = 0; i < _ && !loopSignal.aborted; i += MACHINE_LANE_VERSION_POLL_STEP_MS) {
      await sleep(MACHINE_LANE_VERSION_POLL_STEP_MS, loopSignal);
      let bridgeMinVersionConfig = getBridgeMinVersionConfig();
      if (loopSignal.aborted || bridgeMinVersionConfig === null) break;
      if (bridgeMinVersionConfig.unknown !== "unanswered") return machineLaneVersionRefusal(a);
      if (n.inFlight === undefined && !isGrowthBookInitializeInFlight()) break;
    }
  } catch (error) {
    if (isAbortError(error) || error instanceof ConfigParseError)
      logForDebugging(`[bridge:floor] Hold ended without an answer: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
  }
  return e;
}
//@ chunk-tpjqzh89.js:5093-5194 facade-majority
function isMachineLaneWork(e, r) {
  if (e === null) return r.reason !== "floor_unreachable";
  return classifyBridgeSessionRoles(e).projectThreadChild;
}
//@ chunk-0jk9tmkx.js:8226-8418 fingerprint = isClaudeAISubscriber (0.321)
/**
 * 是否应主动注册可信设备：非云容器、非 DISABLE_LOGIN_COMMAND、一方提供商、claude.ai 订阅、未设 CLAUDE_TRUSTED_DEVICE_TOKEN、非仅必要流量。
 */
function shouldProactivelyEnrollDevice() {
  let { isClaudeAISubscriber } = require("./chunk-7v0gj88m.js");
  return !(
    env.CLAUDE_CODE_REMOTE === true ||
    env.DISABLE_LOGIN_COMMAND ||
    !isFirstPartyProvider() ||
    !isClaudeAISubscriber() ||
    process.env.CLAUDE_TRUSTED_DEVICE_TOKEN ||
    isEssentialTrafficOnly()
  );
}
export {
  trackClientDataFetch,
  shouldProactivelyEnrollDevice,
  isBridgeFirstParty,
  classifyBridgeSessionRoles,
  machineLaneVersionRefusal,
  isMachineLaneWork,
  machineLaneVersionRefusalAfterHold,
  hasBridgeChildFeatureEnabled,
  isFirstPartyClientDataFetchEnabled,
  withClientDataReseedOnModelChange,
  refreshBootstrapDataTracked_2,
  setFetchesClientData,
  BEARER_PLAN_REFRESH_MS,
  hasBridgeEntitlement,
  prefetchBridgePlanInfo,
  isBridgeSubscriptionEligible,
  isAttributionAnnouncementEnabled,
  resolveBridgeChildFeatures,
  ensureClientDataFetch,
  markClientDataFetchOver,
};

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
import { Ao } from "../bootstrap/sessionFeatureValues.js";
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
import { f, k, hasProfileScopeSafe } from "./bridgeEntitlement.js";
import { E, getBearerSubscriptionType, getBridgeAccessToken_2, hasFreshBearerPlan } from "./bridgeConfig.js";
import {
  le,
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
import { ao } from "./bridgeHostState.js";
import { REMOTE_CONTROL_APP, REMOTE_CONTROL_CLI, RC_CHILD, WORKFLOW_REMOTE_AGENT } from "./sessionOrigins.js";
import { canSeedAutoMode } from "../utils/permissions/permissionSetup.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";
import { isSemverString, splitOnDash } from "../utils/model/modelCatalog/catalogCapabilities.js";
import { gt, lt_2 } from "../utils/semver.js";
import { getPrivacyLevel, isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, isAbortError, ConfigParseError } from "../utils/errors.js";

//@ chunk-71c4j971.js:1185-1215 placement
var TENGU_REFLECTIVE_WOLF = "tengu_reflective_wolf";
//@ chunk-71c4j971.js:1215-1364 placement
function isAttributionAnnouncementEnabled() {
  let e = Ao();
  return (
    (e.attributionAnnouncementEnabled ??=
      env.CLAUDE_CODE_ATTRIBUTION_ANNOUNCEMENT ??
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_REFLECTIVE_WOLF, !0)),
    e.attributionAnnouncementEnabled
  );
}
//@ chunk-71c4j971.js:1364-1485 placement
function withClientDataReseedOnModelChange(e) {
  let o = isAttributionAnnouncementEnabled() ? getFetchedClientData() : void 0,
    n = getMainLoopModel();
  if ((e(), o === void 0 || getMainLoopModel() === n)) return;
  return (seedClientDataForCurrentKey(o, { forContextWindow: !0 }), o);
}
//@ chunk-71c4j971.js:1485-1642 placement
function refreshBootstrapDataTracked(e, o, n) {
  let r = import("./chunk-1qx2v2vg.js")
    .then(({ refreshBootstrapData: refreshBootstrapData }) =>
      refreshBootstrapData(e, o, { renderedClientData: n }),
    )
    .then(
      () => {},
      (a) => logError(a),
    );
  return (trackClientDataFetch(r), r);
}
//@ chunk-71c4j971.js:1642-1678 placement
function Qsr(e, o, n) {
  return refreshBootstrapDataTracked(e, o, n);
}
//@ chunk-71c4j971.js:1678-1719 placement
function Tdi(e) {
  getProviderState().fetchesClientData = e;
}
//@ chunk-71c4j971.js:1719-1785 placement
function C9o() {
  return getProviderState().fetchesClientData && getAPIProvider() === "firstParty";
}
//@ chunk-71c4j971.js:1785-2001 placement
function trackClientDataFetch(e) {
  let o = clientDataSlotKey(),
    clientDataFetches = getProviderState().providerCache.clientDataFetches;
  if (o !== void 0 && !(clientDataFetches.get(o) instanceof Promise)) {
    let r = getAuthenticatedAccountEpoch();
    (clientDataFetches.set(o, e),
      e.finally(() => {
        if (clientDataFetches.get(o) === e)
          if (getAuthenticatedAccountEpoch() === r) clientDataFetches.set(o, "over");
          else clientDataFetches.delete(o);
      }));
  }
}
//@ chunk-71c4j971.js:2001-2095 placement
function w() {
  return [...getProviderState().providerCache.clientDataFetches.values()].filter((e) => e !== "over");
}
//@ chunk-71c4j971.js:2095-2196 placement
function markClientDataFetchOver(e) {
  let clientDataFetches = getProviderState().providerCache.clientDataFetches;
  for (let [n, r] of clientDataFetches) if (r === e) clientDataFetches.set(n, "over");
}
//@ chunk-71c4j971.js:2196-2373 placement
function ensureClientDataFetch(e, o) {
  let n = clientDataSlotKey();
  if (n === void 0 || !C9o() || hasClientDataCacheSlot()) return;
  let r = getProviderState().providerCache.clientDataFetches.get(n);
  if (r !== void 0) return r === "over" ? void 0 : r;
  return refreshBootstrapDataTracked(e, o, getFetchedClientData());
}
//@ chunk-71c4j971.js:2373-2479 placement
function isBridgeFirstParty() {
  if (!isFirstPartyProvider()) return !1;
  if (getPolicyLimitsTunnelSocket() !== void 0) return !0;
  if (env.ANTHROPIC_UNIX_SOCKET) return !1;
  return isActualFirstPartyAnthropicBaseUrl();
}
/**
 * Remote Control 是否可用：订阅用户、一方提供商，且 tengu_ccr_bridge 或另一条件成立。
 */
//@ chunk-71c4j971.js:2479-2544 placement = isBridgeEnabled (1)
function hasBridgeEntitlement() {
  return (
    isBridgeFirstParty() &&
    f() &&
    (getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_bridge", !1) || isBridgeSubscriptionEligible())
  );
}
/**
 * 判断当前账户订阅是否允许 Remote Control：优先用已知订阅类型（team/enterprise 还需策略限制资格），否则从 OAuth 令牌的 subscriptionType 判断。
 */
//@ chunk-71c4j971.js:2544-2819 placement
function isBridgeSubscriptionEligible() {
  if (!E() || !isBridgeFirstParty() || le()) return !1;
  let e = getBearerSubscriptionType();
  if (e !== null) return k.includes(e) && ((e !== "team" && e !== "enterprise") || isPolicyLimitsEligible());
  if (!hasProfileScopeSafe() || !getOauthAccountInfo_2()?.organizationUuid) return !1;
  try {
    let o = getClaudeAIOAuthTokens(),
      n = o?.refreshToken ? (o.subscriptionType ?? null) : null;
    return n !== null && k.includes(n);
  } catch {
    return !1;
  }
}
//@ chunk-71c4j971.js:3364-3383 placement
var j = 6000,
  F = 60000;
//@ chunk-71c4j971.js:3383-3524 placement
async function prefetchBridgePlanInfo(e) {
  if (getBridgeAccessToken_2() === null || !E() || hasFreshBearerPlan()) return;
  await withDeadline(
    Promise.allSettled(w()).then(async () => {
      if (e !== void 0) (await kickBearerPlanFetch(e), await kickBearerPlanFetch(e));
    }),
    j,
  );
}
/**
 * 按当前 bearer 的 sha256 去重地发起订阅计划查询（超过时限重新拉取），结果缓存在全局状态里供 Remote Control 资格判断用。
 */
//@ chunk-71c4j971.js:3524-3910 placement
function kickBearerPlanFetch({ storageV5: storageV5, credentials: credentials }) {
  let n = getBridgeAccessToken_2();
  if (n === null || hasFreshBearerPlan()) return;
  let r = ao();
  if (r.bearerPlanFetch?.bearerSha256 !== n || Date.now() - r.bearerPlanFetch.startedAtMs >= F)
    r.bearerPlanFetch = {
      bearerSha256: n,
      startedAtMs: Date.now(),
      answered: import("./chunk-1qx2v2vg.js")
        .then(({ refreshBootstrapData: refreshBootstrapData }) =>
          refreshBootstrapData(storageV5, credentials, { keepRenderCaches: !0 }),
        )
        .then(
          () => {},
          (a) => logError(a),
        ),
    };
  return r.bearerPlanFetch.answered;
}
//@ chunk-tpjqzh89.js:626-642 placement
var R = [REMOTE_CONTROL_APP, REMOTE_CONTROL_CLI];
/**
 * 按会话标签（hearth-rc-child、RC_CHILD、WORKFLOW_REMOTE_AGENT 等）判断 Remote Control 子会话的角色：rcChild、projectThreadChild、attended、mayBeAttended；标签未读到时视为可能有人值守。
 */
//@ chunk-tpjqzh89.js:642-963 placement
function classifyBridgeSessionRoles(e) {
  if (e === null)
    return { tagsRead: !1, rcChild: !1, projectThreadChild: !1, attended: !1, mayBeAttended: !0 };
  let r = !1;
  r = e.includes("hearth-rc-child");
  let included = e.includes(RC_CHILD);
  return {
    tagsRead: !0,
    rcChild: included,
    projectThreadChild: r,
    attended: e.some((a) => R.includes(a)) && !included && !e.includes(WORKFLOW_REMOTE_AGENT),
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
    return !0;
  return (
    isBridgeRcChildAutoCompactEnabled() ||
    isBridgeRcChildProjectsEntrypointEnabled() ||
    (e === "spawn" && isBridgeChildMachineSettingsEnabled())
  );
}
/**
 * 根据会话角色与各 bridge 子会话特性开关，算出该子会话启用的功能：auto 模式默认、auto 覆盖设置、artifact、机器设置、自动压缩、Projects 入口、CLI 入口。
 */
//@ chunk-tpjqzh89.js:1064-1491 placement
function resolveBridgeChildFeatures(e) {
  let r = e.roles.rcChild && !e.modePinned && isBridgeChildAutoModeDefaultEnabled(),
    n = r && isBridgeChildAutoOverSettingsEnabled() && canSeedAutoMode(e.settings()),
    attended = e.roles.attended,
    i = !1,
    s = !1,
    h = !1;
  ((attended = attended || e.roles.projectThreadChild),
    (i = e.roles.projectThreadChild && isBridgeChildMachineSettingsEnabled()),
    (s = e.roles.projectThreadChild && isBridgeRcChildAutoCompactEnabled()),
    (h = e.roles.projectThreadChild && isBridgeRcChildProjectsEntrypointEnabled()));
  let E = attended && isBridgeRcChildArtifactEnabled();
  return {
    autoDefault: r,
    autoOverSettings: n,
    artifact: E,
    machineSettings: i,
    autoCompact: s,
    projectsEntrypoint: h,
    cliEntrypoint: e.roles.mayBeAttended && isBridgeRcChildCliEntrypointEnabled(),
  };
}
//@ chunk-tpjqzh89.js:1491-1574 placement
var c = "2.1.270",
  g = DoctorLazy(() =>
    u({
      minVersion: o()
        .refine((e) => e === "" || isSemverString(e))
        .optional(),
    }),
  );
/**
 * 读取 GrowthBook tengu_bridge_min_version 并校验；开关关闭返回 null，未取到或格式错时返回内置最低版本并标注 unknown 原因，否则取配置与内置值中较高者。
 */
//@ chunk-tpjqzh89.js:1574-1901 placement
function getBridgeMinVersionConfig() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    "tengu_bridge_min_version",
    { minVersion: c },
  );
  if (source === "disabled") return null;
  if (source === "fallback" && !hasFreshGrowthBookFeatures()) return { minVersion: c, unknown: "unanswered" };
  let safeParse = g().safeParse(e);
  if (!safeParse.success) return { minVersion: c, unknown: "malformed" };
  let minVersion = safeParse.data.minVersion;
  return { minVersion: minVersion && gt(minVersion, c) ? minVersion : c, unknown: null };
}
/**
 * 版本低于 tengu_bridge_min_version 配置时返回"请 claude update"提示。
 */
//@ chunk-tpjqzh89.js:1901-2631 facade-majority = checkBridgeMinVersion (0.452)
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
  let r = getBridgeMinVersionConfig();
  if (r === null) return null;
  if (lt_2(splitOnDash(e), r.minVersion))
    return `Your version of Claude Code (${e}) is too old for Remote Control.
Version ${r.minVersion} or higher is required. Run \`claude update\` to update.`;
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
  let r = getBridgeMinVersionConfig();
  if (r === null)
    return getPrivacyLevel() === "no-telemetry"
      ? {
          reason: "floor_unreachable",
          message: `This computer's Claude Code (${e}) cannot take a session started remotely on it: the version such sessions require cannot be received while feature-flag evaluation is off (DISABLE_TELEMETRY or DO_NOT_TRACK is set).`,
        }
      : null;
  switch (r.unknown) {
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
      if (lt_2(splitOnDash(e), r.minVersion))
        return {
          reason: "below_floor",
          message: `This computer's Claude Code (${e}) is below the version a session started remotely on it requires (${r.minVersion}). Run \`claude update\` to update.`,
        };
      return null;
  }
}
//@ chunk-tpjqzh89.js:4110-4126 layout
var _ = 1e4,
  C = 500;
//@ chunk-tpjqzh89.js:4126-5093 facade-majority
async function machineLaneVersionRefusalAfterHold(
  e,
  r,
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
      .catch((i) =>
        logForDebugging(`[bridge:floor] Flag refresh failed: ${errorMessage(i)}`, { level: "error" }),
      )
      .finally(() => {
        n.inFlight = void 0;
      });
    for (let i = 0; i < _ && !r.aborted; i += C) {
      await sleep(C, r);
      let s = getBridgeMinVersionConfig();
      if (r.aborted || s === null) break;
      if (s.unknown !== "unanswered") return machineLaneVersionRefusal(a);
      if (n.inFlight === void 0 && !isGrowthBookInitializeInFlight()) break;
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
/**
 * 是否应主动注册可信设备：非云容器、非 DISABLE_LOGIN_COMMAND、一方提供商、claude.ai 订阅、未设 CLAUDE_TRUSTED_DEVICE_TOKEN、非仅必要流量。
 */
//@ chunk-0jk9tmkx.js:8226-8418 fingerprint = isClaudeAISubscriber (0.321)
function shouldProactivelyEnrollDevice() {
  let { isClaudeAISubscriber: isClaudeAISubscriber } = require("./chunk-7v0gj88m.js");
  return !(
    env.CLAUDE_CODE_REMOTE === !0 ||
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
  C9o,
  withClientDataReseedOnModelChange,
  Qsr,
  Tdi,
  F,
  hasBridgeEntitlement,
  prefetchBridgePlanInfo,
  isBridgeSubscriptionEligible,
  isAttributionAnnouncementEnabled,
  resolveBridgeChildFeatures,
  ensureClientDataFetch,
  markClientDataFetchOver,
};

/**
 * cli/sdkMcpManifests.ts
 *
 * 2.1.316 新增：SDK MCP 清单的来源标记与按发送生效判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yscxw9h6.js (34)
 * attribution: placement 34
 */
import { isVsCodeTopSession, getSessionEntrypoint, NON_TERMINAL_ENTRYPOINTS } from "../utils/sessionShape.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
  getFeatureValue_SESSION_PINNED,
  initializeGrowthBook,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import {
  isOwnerAccountOnlyWriters,
  checkSessionWritersFreshness,
} from "./transports/streamEventCoalescing.js";
import { rewriteTopLevelValues } from "../utils/jsonScan.js";
import { withDeadline } from "../utils/sleep.js";
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
import { TENGU_LEVEL_PLOVER } from "../services/api/withRetry.js";
import { isRemoteManagedEnvironment } from "../utils/remoteEnvironment.js";
import { env } from "../utils/env.js";
import { areHooksModulesAllowed } from "../services/analytics/growthbookCredentials.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { getPluginRegistry } from "../utils/plugins/pluginLoadState.js";
import { hasLink } from "../utils/hasLink.js";
import { isPromptHookObserved } from "../utils/telemetry/sessionTracing.js";
import { shouldEscapeNdjsonForBridge } from "./ndjsonSafeStringify.js";
import { isHookRegistrationPending } from "../utils/plugins/loadPluginHooks.js";
import { UI_SURFACE_V1, PROMPTS_SCREENED_V1, UI_HOOKED_V1 } from "../utils/messages/systemInit.js";
import { RENDER_EVENT } from "../plugins/functionHooks/ui/renderSites.js";
import { RenderElementKinds } from "../entrypoints/sdk/uiControlSchemas.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-yscxw9h6.js:947-1004 placement
/**
 * VS Code 顶层会话且 tengu_melodic_ember 关闭时抑制 hooks 模块（Er 的取反来源）。
 */
function isVsCodeHooksSuppressed() {
  return isVsCodeTopSession() && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_melodic_ember", true);
}
//@ chunk-yscxw9h6.js:1004-1102 placement
/**
 * VS Code 顶层会话下监听 GrowthBook 刷新，从开启变为关闭时触发回调。
 */
function onVsCodeRefreshLogChange(readLog, notify) {
  if (!isVsCodeTopSession()) return () => {};
  let previousLog = readLog();
  return onGrowthBookRefresh(() => {
    let logText = readLog();
    let isStale = previousLog && !logText;
    previousLog = logText;
    if (isStale) notify();
  });
}
//@ chunk-yscxw9h6.js:1102-1145 placement
var TENGU_CCR_SDK_MCP_REMOTE_MANIFESTS = "tengu_ccr_sdk_mcp_remote_manifests";
//@ chunk-yscxw9h6.js:1145-1200 placement
/**
 * tengu_sdk_mcp_manifests 会话级固定特性（默认开）。
 */
function isSdkMcpManifestsEnabled() {
  return getFeatureValue_SESSION_PINNED("tengu_sdk_mcp_manifests", true);
}
//@ chunk-yscxw9h6.js:1200-1257 placement
var SDK_MCP_TOOLS_LIST_CHANGED = "sdk_mcp_tools_list_changed";
var SDK_MCP_MANIFESTS = "sdk_mcp_manifests";
//@ chunk-yscxw9h6.js:1257-1393 placement
/**
 * 初始化消息中的 SDK MCP 能力（工具列表变化、清单）。
 */
function sdkMcpCapabilities(active) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_sdk_mcp_manifests", true)) return [];
  return active?.isRemoteTransport() !== true ||
    (isOwnerAccountOnlyWriters(active.sessionWriters()) && isRemoteManifestsEnabled())
    ? [SDK_MCP_TOOLS_LIST_CHANGED, SDK_MCP_MANIFESTS]
    : [SDK_MCP_TOOLS_LIST_CHANGED];
}
//@ chunk-yscxw9h6.js:1393-1466 placement
/**
 * 把请求里的 sdkMcpServerManifests 内容替换为 {}（遥测脱敏）。
 */
function redactSdkMcpManifests(manifests) {
  return manifests.includes("sdkMcpServerManifests") ? replaceAtPath(manifests, 0) : undefined;
}
//@ chunk-yscxw9h6.js:1466-1518 placement
var MANIFEST_REDACT_PATH = ["payload", "request", "sdkMcpServerManifests"];
//@ chunk-yscxw9h6.js:1518-1617 placement
function replaceAtPath(value, path) {
  return rewriteTopLevelValues(value, (key, field) => {
    if (key !== MANIFEST_REDACT_PATH[path]) return field;
    return path === MANIFEST_REDACT_PATH.length - 1 ? "{}" : (replaceAtPath(field, path + 1) ?? field);
  });
}
//@ chunk-yscxw9h6.js:1617-1645 placement
function isRemoteManifestsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_SDK_MCP_REMOTE_MANIFESTS, false);
}
//@ chunk-yscxw9h6.js:1645-1669 placement
/**
 * 帧与声明（statement）的最大年龄 300000ms。
 */
var MAX_MANIFEST_FRAME_AGE_MS = 300000;
var MAX_MANIFEST_STATEMENT_AGE_MS = 300000;
//@ chunk-yscxw9h6.js:1669-1912 placement
function perSendOriginVerdict({ origin, frameCreatedAt, sessionWriters, now = Date.now() }) {
  if (origin !== "host_per_send") return "no_origin_marker";
  let verdict = checkSessionWritersFreshness({
    frameCreatedAt,
    sessionWriters,
    maxFrameAgeMs: MAX_MANIFEST_FRAME_AGE_MS,
    maxStatementAgeMs: MAX_MANIFEST_STATEMENT_AGE_MS,
    now,
  });
  if (verdict !== undefined) return verdict;
  return;
}
//@ chunk-yscxw9h6.js:1912-2059 placement
/**
 * 清单不生效的原因（来源、开关未开或未定）。
 */
async function manifestsDisabledReason(origin) {
  let verdict = perSendOriginVerdict(origin);
  if (verdict !== undefined) return verdict;
  if (isRemoteManifestsEnabled()) return;
  return (await withDeadline(
    initializeGrowthBook().catch(() => null),
    0,
  )) !== undefined
    ? "flag_off"
    : "flag_unsettled";
}
//@ chunk-yscxw9h6.js:2059-2068 placement
var LEVEL_PLOVER_DEFAULT = false;
//@ chunk-yscxw9h6.js:2068-2180 placement
function isServedOnFacts() {
  let sessionFeatureValues = getSessionFeatureValues();
  let level = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_LEVEL_PLOVER, LEVEL_PLOVER_DEFAULT);
  sessionFeatureValues.servedOnFacts ??= level.value === true && level.source === "payload";
  return sessionFeatureValues.servedOnFacts;
}
//@ chunk-yscxw9h6.js:2180-2266 placement
var UI; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UI_DETACH;
var REMOTE_COWORK;
var REMOTE_CALL_ENTRYPOINTS;
var VSCODE;
deferInit("chunk-yscxw9h6.js:2180", () => {
  UI = "ui_";
  UI_DETACH = "ui_detach";
  REMOTE_COWORK = "remote_cowork";
  REMOTE_CALL_ENTRYPOINTS = new Set([REMOTE_COWORK, "remote_mobile"]);
  VSCODE = "vscode";
});
//@ chunk-yscxw9h6.js:2266-2433 placement
/**
 * 会话持久化是否可信（本地或受信远程入口）。
 */
function isPersistenceTrusted(host) {
  let sessionEntrypoint = getSessionEntrypoint();
  return (
    !host.redactsWhatItPersists &&
    (!host.isRemoteTransport ||
      (isRemoteManagedEnvironment() &&
        Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
        (REMOTE_CALL_ENTRYPOINTS.has(sessionEntrypoint ?? "") ||
          (NON_TERMINAL_ENTRYPOINTS.has(sessionEntrypoint ?? "") && isServedOnFacts()))))
  );
}
//@ chunk-yscxw9h6.js:2433-2466 placement
function areHooksUsableHere() {
  return areHooksModulesAllowed() && !isVsCodeHooksSuppressed();
}
//@ chunk-yscxw9h6.js:2466-2548 placement
/**
 * 能否服务 manifests：hooks 可用、持久化可信，且非远程传输或写者为仅所有者。
 */
function canServeManifests(host) {
  return (
    areHooksUsableHere() &&
    isPersistenceTrusted(host) &&
    (!host.isRemoteTransport || isOwnerAccountOnlyWriters(host.sessionWriters))
  );
}
//@ chunk-yscxw9h6.js:2548-2610 placement
/**
 * 远程传输且非连接型时要能满足 manifests 服务条件。
 */
function canServeManifestsForRemoteCall(host, remoteCall) {
  return host.isRemoteTransport && !remoteCall && areHooksUsableHere() && isPersistenceTrusted(host);
}
//@ chunk-yscxw9h6.js:2610-2658 placement
/**
 * tengu_calm_osprey 特性（默认开）的当前值。
 */
function isCalmOspreyGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_osprey", true);
}
//@ chunk-yscxw9h6.js:2658-2718 placement
/**
 * 判断名字是否为 ui_ 前缀的 UI surface。
 */
function isUiSurfaceName(subtype) {
  return typeof subtype === "string" && subtype.startsWith(UI);
}
//@ chunk-yscxw9h6.js:2718-2823 placement
/**
 * 远程传输且低于下限。
 */
function leavesBelowFloor(leaves) {
  try {
    let leafValues = leaves();
    return leafValues.isRemoteTransport && leafValues.leavesBelowFloor;
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-yscxw9h6.js:2823-2958 placement
/**
 * 帧与声明时效判定。
 */
function frameAgeVerdict(frame, now) {
  return checkSessionWritersFreshness({
    frameCreatedAt: frame.createdAt,
    sessionWriters: frame.sessionWriters,
    maxFrameAgeMs: MAX_MANIFEST_FRAME_AGE_MS,
    maxStatementAgeMs: MAX_MANIFEST_STATEMENT_AGE_MS,
    now,
  });
}
//@ chunk-yscxw9h6.js:2958-3196 placement
/**
 * UI 控制请求是否应被拒绝。
 */
function shouldRejectUiControl(session, getState, now = Date.now) {
  if (!isUiSurfaceName(session)) return false;
  try {
    let state = getState();
    let verdict =
      !state.isRemoteTransport ||
      ((state.isAtFloor || (state.leavesBelowFloor && session === UI_DETACH)) &&
        frameAgeVerdict(state, now()) === undefined);
    let isAnySurfaceAttached = session === UI_DETACH && state.isAnySurfaceAttached;
    return !(isPersistenceTrusted(state) && verdict && (isAnySurfaceAttached || areHooksUsableHere()));
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-yscxw9h6.js:3196-3274 placement
/**
 * 远程传输、已连接、hooks 可用且写者不是仅所有者时是否可服务 manifests。
 */
function canServeManifestsWithoutWriters(host, writers) {
  return (
    host.isRemoteTransport &&
    writers &&
    areHooksModulesAllowed() &&
    !isOwnerAccountOnlyWriters(host.sessionWriters)
  );
}
//@ chunk-yscxw9h6.js:3274-3392 placement
function hasPromptSubmitHooks() {
  try {
    return hasModuleHookingSite(
      "prompt.submit",
      undefined,
      getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule)),
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-yscxw9h6.js:3392-3431 placement
/**
 * 是否需要 prompt 提交 hooks（有 prompt 钩子、观测到 prompt 钩子或需要转义 NDJSON 时）。
 */
function needsPromptHooks() {
  return hasPromptSubmitHooks() || isPromptHookObserved() || shouldEscapeNdjsonForBridge();
}
//@ chunk-yscxw9h6.js:3431-3465 placement
/**
 * 是否可以断言 prompts 已被筛查：vEo 或 hooks 尚未稳定。
 */
function needsPromptsScreened() {
  return needsPromptHooks() || !areHooksSettled();
}
//@ chunk-yscxw9h6.js:3465-3593 placement
function areHooksSettled() {
  let pluginRegistry = getPluginRegistry();
  return (
    !pluginRegistry.hookRegistrationOwed &&
    pluginRegistry.hookRegistrationInFlight === undefined &&
    pluginRegistry.hooksUnknownCause === undefined &&
    !isHookRegistrationPending()
  );
}
//@ chunk-yscxw9h6.js:3593-3733 placement
/**
 * UI 界面能力（含提示筛查）。
 */
function uiSurfaceCapabilities(surfaces) {
  try {
    let caps = surfaces();
    if (!(canServeManifests(caps) && (!caps.isRemoteTransport || getSessionEntrypoint() === REMOTE_COWORK)))
      return [];
    return needsPromptsScreened() ? [UI_SURFACE_V1, PROMPTS_SCREENED_V1] : [UI_SURFACE_V1];
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-yscxw9h6.js:3733-3809 placement
/**
 * 某组件在某 surface 上是否注册了 render 钩子站点。
 */
function hasRenderHookingSite(component, site) {
  return hasModuleHookingSite(
    RENDER_EVENT,
    site === VSCODE
      ? {
          component,
          surface: site,
        }
      : {
          component,
        },
  );
}
//@ chunk-yscxw9h6.js:3809-3890 placement
/**
 * VS Code 表面注册中的插件注册 promise（其他表面返回 undefined）。
 */
function vscodeHookRegistrationInFlight(surface) {
  return surface === VSCODE ? getPluginRegistry().hookRegistrationInFlight?.catch(() => {}) : undefined;
}
//@ chunk-yscxw9h6.js:3890-4048 placement
/**
 * VS Code 顶层会话的 UI 钩子能力。
 */
function uiHookedCapabilities(hooks) {
  try {
    if (!isVsCodeTopSession() || !canServeManifests(hooks()) || !areHooksSettled()) return [];
    return [
      UI_HOOKED_V1,
      ...RenderElementKinds()
        .options.filter((option) => hasRenderHookingSite(option, VSCODE))
        .map((option) => `${UI_HOOKED_V1}:${option}`),
    ];
  } catch (error) {
    logError(toError(error));
    return [];
  }
}
export {
  isSdkMcpManifestsEnabled,
  isPersistenceTrusted,
  canServeManifests,
  canServeManifestsForRemoteCall,
  needsPromptHooks,
  isCalmOspreyGateOn,
  onVsCodeRefreshLogChange,
  isUiSurfaceName,
  shouldRejectUiControl,
  leavesBelowFloor,
  manifestsDisabledReason,
  canServeManifestsWithoutWriters,
  uiSurfaceCapabilities,
  uiHookedCapabilities,
  isVsCodeHooksSuppressed,
  sdkMcpCapabilities,
  vscodeHookRegistrationInFlight,
  hasRenderHookingSite,
  frameAgeVerdict,
  MAX_MANIFEST_STATEMENT_AGE_MS,
  redactSdkMcpManifests,
  needsPromptsScreened,
};

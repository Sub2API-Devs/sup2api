/**
 * cli/sdkMcpManifests.ts
 *
 * 2.1.316 新增：SDK MCP 清单的来源标记与按发送生效判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ep26dgsk.js (34)
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
import { RenderElementKinds } from "../entrypoints/sdk/controlSchemas.js";

//@ chunk-ep26dgsk.js:947-1004 placement
/**
 * VS Code 顶层会话且 tengu_melodic_ember 关闭时抑制 hooks 模块（Er 的取反来源）。
 */
function isVsCodeHooksSuppressed() {
  return isVsCodeTopSession() && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_melodic_ember", true);
}
//@ chunk-ep26dgsk.js:1004-1102 placement
/**
 * VS Code 顶层会话下监听 GrowthBook 刷新，从开启变为关闭时触发回调。
 */
function onVsCodeRefreshLogChange(e, r) {
  if (!isVsCodeTopSession()) return () => {};
  let o = e();
  return onGrowthBookRefresh(() => {
    let t = e();
    let n = o && !t;
    o = t;
    if (n) r();
  });
}
//@ chunk-ep26dgsk.js:1102-1145 placement
var TENGU_CCR_SDK_MCP_REMOTE_MANIFESTS = "tengu_ccr_sdk_mcp_remote_manifests";
//@ chunk-ep26dgsk.js:1145-1200 placement
/**
 * tengu_sdk_mcp_manifests 会话级固定特性（默认开）。
 */
function isSdkMcpManifestsEnabled() {
  return getFeatureValue_SESSION_PINNED("tengu_sdk_mcp_manifests", true);
}
//@ chunk-ep26dgsk.js:1200-1257 placement
var SDK_MCP_TOOLS_LIST_CHANGED = "sdk_mcp_tools_list_changed";
var SDK_MCP_MANIFESTS = "sdk_mcp_manifests";
//@ chunk-ep26dgsk.js:1257-1393 placement
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
//@ chunk-ep26dgsk.js:1393-1466 placement
/**
 * 把请求里的 sdkMcpServerManifests 内容替换为 {}（遥测脱敏）。
 */
function redactSdkMcpManifests(e) {
  return e.includes("sdkMcpServerManifests") ? replaceAtPath(e, 0) : undefined;
}
//@ chunk-ep26dgsk.js:1466-1518 placement
var MANIFEST_REDACT_PATH = ["payload", "request", "sdkMcpServerManifests"];
//@ chunk-ep26dgsk.js:1518-1617 placement
function replaceAtPath(e, r) {
  return rewriteTopLevelValues(e, (o, t) => {
    if (o !== MANIFEST_REDACT_PATH[r]) return t;
    return r === MANIFEST_REDACT_PATH.length - 1 ? "{}" : (replaceAtPath(t, r + 1) ?? t);
  });
}
//@ chunk-ep26dgsk.js:1617-1645 placement
function isRemoteManifestsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_SDK_MCP_REMOTE_MANIFESTS, false);
}
//@ chunk-ep26dgsk.js:1645-1669 placement
/**
 * 帧与声明（statement）的最大年龄 300000ms。
 */
var MAX_MANIFEST_FRAME_AGE_MS = 300000;
var MAX_MANIFEST_STATEMENT_AGE_MS = 300000;
//@ chunk-ep26dgsk.js:1669-1912 placement
function perSendOriginVerdict({ origin, frameCreatedAt, sessionWriters, now = Date.now() }) {
  if (origin !== "host_per_send") return "no_origin_marker";
  let n = checkSessionWritersFreshness({
    frameCreatedAt,
    sessionWriters,
    maxFrameAgeMs: MAX_MANIFEST_FRAME_AGE_MS,
    maxStatementAgeMs: MAX_MANIFEST_STATEMENT_AGE_MS,
    now,
  });
  if (n !== undefined) return n;
  return;
}
//@ chunk-ep26dgsk.js:1912-2059 placement
/**
 * 清单不生效的原因（来源、开关未开或未定）。
 */
async function manifestsDisabledReason(e) {
  let r = perSendOriginVerdict(e);
  if (r !== undefined) return r;
  if (isRemoteManifestsEnabled()) return;
  return (await withDeadline(
    initializeGrowthBook().catch(() => null),
    0,
  )) !== undefined
    ? "flag_off"
    : "flag_unsettled";
}
//@ chunk-ep26dgsk.js:2059-2068 placement
var LEVEL_PLOVER_DEFAULT = false;
//@ chunk-ep26dgsk.js:2068-2180 placement
function isServedOnFacts() {
  let sessionFeatureValues = getSessionFeatureValues();
  let r = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_LEVEL_PLOVER, LEVEL_PLOVER_DEFAULT);
  sessionFeatureValues.servedOnFacts ??= r.value === true && r.source === "payload";
  return sessionFeatureValues.servedOnFacts;
}
//@ chunk-ep26dgsk.js:2180-2266 placement
var UI = "ui_";
var UI_DETACH = "ui_detach";
var REMOTE_COWORK = "remote_cowork";
var REMOTE_CALL_ENTRYPOINTS = new Set([REMOTE_COWORK, "remote_mobile"]);
var VSCODE = "vscode";
//@ chunk-ep26dgsk.js:2266-2433 placement
/**
 * 会话持久化是否可信（本地或受信远程入口）。
 */
function isPersistenceTrusted(e) {
  let sessionEntrypoint = getSessionEntrypoint();
  return (
    !e.redactsWhatItPersists &&
    (!e.isRemoteTransport ||
      (isRemoteManagedEnvironment() &&
        Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
        (REMOTE_CALL_ENTRYPOINTS.has(sessionEntrypoint ?? "") ||
          (NON_TERMINAL_ENTRYPOINTS.has(sessionEntrypoint ?? "") && isServedOnFacts()))))
  );
}
//@ chunk-ep26dgsk.js:2433-2466 placement
function areHooksUsableHere() {
  return areHooksModulesAllowed() && !isVsCodeHooksSuppressed();
}
//@ chunk-ep26dgsk.js:2466-2548 placement
/**
 * 能否服务 manifests：hooks 可用、持久化可信，且非远程传输或写者为仅所有者。
 */
function canServeManifests(e) {
  return (
    areHooksUsableHere() &&
    isPersistenceTrusted(e) &&
    (!e.isRemoteTransport || isOwnerAccountOnlyWriters(e.sessionWriters))
  );
}
//@ chunk-ep26dgsk.js:2548-2610 placement
/**
 * 远程传输且非连接型时要能满足 manifests 服务条件。
 */
function canServeManifestsForRemoteCall(e, r) {
  return e.isRemoteTransport && !r && areHooksUsableHere() && isPersistenceTrusted(e);
}
//@ chunk-ep26dgsk.js:2610-2658 placement
/**
 * tengu_calm_osprey 特性（默认开）的当前值。
 */
function isCalmOspreyGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_osprey", true);
}
//@ chunk-ep26dgsk.js:2658-2718 placement
/**
 * 判断名字是否为 ui_ 前缀的 UI surface。
 */
function isUiSurfaceName(subtype) {
  return typeof subtype === "string" && subtype.startsWith(UI);
}
//@ chunk-ep26dgsk.js:2718-2823 placement
/**
 * 远程传输且低于下限。
 */
function leavesBelowFloor(e) {
  try {
    let r = e();
    return r.isRemoteTransport && r.leavesBelowFloor;
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-ep26dgsk.js:2823-2958 placement
/**
 * 帧与声明时效判定。
 */
function frameAgeVerdict(e, now) {
  return checkSessionWritersFreshness({
    frameCreatedAt: e.createdAt,
    sessionWriters: e.sessionWriters,
    maxFrameAgeMs: MAX_MANIFEST_FRAME_AGE_MS,
    maxStatementAgeMs: MAX_MANIFEST_STATEMENT_AGE_MS,
    now,
  });
}
//@ chunk-ep26dgsk.js:2958-3196 placement
/**
 * UI 控制请求是否应被拒绝。
 */
function shouldRejectUiControl(e, r, o = Date.now) {
  if (!isUiSurfaceName(e)) return false;
  try {
    let t = r();
    let n =
      !t.isRemoteTransport ||
      ((t.isAtFloor || (t.leavesBelowFloor && e === UI_DETACH)) && frameAgeVerdict(t, o()) === undefined);
    let isAnySurfaceAttached = e === UI_DETACH && t.isAnySurfaceAttached;
    return !(isPersistenceTrusted(t) && n && (isAnySurfaceAttached || areHooksUsableHere()));
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-ep26dgsk.js:3196-3274 placement
/**
 * 远程传输、已连接、hooks 可用且写者不是仅所有者时是否可服务 manifests。
 */
function canServeManifestsWithoutWriters(e, r) {
  return e.isRemoteTransport && r && areHooksModulesAllowed() && !isOwnerAccountOnlyWriters(e.sessionWriters);
}
//@ chunk-ep26dgsk.js:3274-3392 placement
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
//@ chunk-ep26dgsk.js:3392-3431 placement
/**
 * 是否需要 prompt 提交 hooks（有 prompt 钩子、观测到 prompt 钩子或需要转义 NDJSON 时）。
 */
function needsPromptHooks() {
  return hasPromptSubmitHooks() || isPromptHookObserved() || shouldEscapeNdjsonForBridge();
}
//@ chunk-ep26dgsk.js:3431-3465 placement
/**
 * 是否可以断言 prompts 已被筛查：vEo 或 hooks 尚未稳定。
 */
function needsPromptsScreened() {
  return needsPromptHooks() || !areHooksSettled();
}
//@ chunk-ep26dgsk.js:3465-3593 placement
function areHooksSettled() {
  let pluginRegistry = getPluginRegistry();
  return (
    !pluginRegistry.hookRegistrationOwed &&
    pluginRegistry.hookRegistrationInFlight === undefined &&
    pluginRegistry.hooksUnknownCause === undefined &&
    !isHookRegistrationPending()
  );
}
//@ chunk-ep26dgsk.js:3593-3733 placement
/**
 * UI 界面能力（含提示筛查）。
 */
function uiSurfaceCapabilities(e) {
  try {
    let r = e();
    if (!(canServeManifests(r) && (!r.isRemoteTransport || getSessionEntrypoint() === REMOTE_COWORK)))
      return [];
    return needsPromptsScreened() ? [UI_SURFACE_V1, PROMPTS_SCREENED_V1] : [UI_SURFACE_V1];
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-ep26dgsk.js:3733-3809 placement
/**
 * 某组件在某 surface 上是否注册了 render 钩子站点。
 */
function hasRenderHookingSite(component, r) {
  return hasModuleHookingSite(
    RENDER_EVENT,
    r === VSCODE
      ? {
          component,
          surface: r,
        }
      : {
          component,
        },
  );
}
//@ chunk-ep26dgsk.js:3809-3890 placement
/**
 * VS Code 表面注册中的插件注册 promise（其他表面返回 undefined）。
 */
function vscodeHookRegistrationInFlight(surface) {
  return surface === VSCODE ? getPluginRegistry().hookRegistrationInFlight?.catch(() => {}) : undefined;
}
//@ chunk-ep26dgsk.js:3890-4048 placement
/**
 * VS Code 顶层会话的 UI 钩子能力。
 */
function uiHookedCapabilities(e) {
  try {
    if (!isVsCodeTopSession() || !canServeManifests(e()) || !areHooksSettled()) return [];
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
  sdkMcpCapabilities,
  needsPromptsScreened,
  isVsCodeHooksSuppressed,
  vscodeHookRegistrationInFlight,
  hasRenderHookingSite,
  frameAgeVerdict,
  MAX_MANIFEST_STATEMENT_AGE_MS,
  redactSdkMcpManifests,
};

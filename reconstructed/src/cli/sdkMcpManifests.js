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
import { isVsCodeTopSession, getSessionEntrypoint, BMi } from "../utils/sessionShape.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
  getFeatureValue_SESSION_PINNED,
  initializeGrowthBook,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import { QZe, checkSessionWritersFreshness } from "./transports/streamEventCoalescing.js";
import { rewriteTopLevelValues } from "../utils/jsonScan.js";
import { withDeadline } from "../utils/sleep.js";
import { Ao } from "../bootstrap/sessionFeatureValues.js";
import { TENGU_LEVEL_PLOVER } from "../services/api/withRetry.js";
import { mn } from "../utils/remoteEnvironment.js";
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
import { jxn } from "../entrypoints/sdk/controlSchemas.js";

//@ chunk-ep26dgsk.js:947-1004 placement
function JPr() {
  return isVsCodeTopSession() && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_melodic_ember", !0);
}
//@ chunk-ep26dgsk.js:1004-1102 placement
function uLs(e, r) {
  if (!isVsCodeTopSession()) return () => {};
  let o = e();
  return onGrowthBookRefresh(() => {
    let t = e(),
      n = o && !t;
    if (((o = t), n)) r();
  });
}
//@ chunk-ep26dgsk.js:1102-1145 placement
var TENGU_CCR_SDK_MCP_REMOTE_MANIFESTS = "tengu_ccr_sdk_mcp_remote_manifests";
//@ chunk-ep26dgsk.js:1145-1200 placement
function X1n() {
  return getFeatureValue_SESSION_PINNED("tengu_sdk_mcp_manifests", !0);
}
//@ chunk-ep26dgsk.js:1200-1257 placement
var SDK_MCP_TOOLS_LIST_CHANGED = "sdk_mcp_tools_list_changed",
  SDK_MCP_MANIFESTS = "sdk_mcp_manifests";
/**
 * 初始化消息中的 SDK MCP 能力（工具列表变化、清单）。
 */
//@ chunk-ep26dgsk.js:1257-1393 placement
function sdkMcpCapabilities(e) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_sdk_mcp_manifests", !0)) return [];
  return e?.isRemoteTransport() !== !0 || (QZe(e.sessionWriters()) && m())
    ? [SDK_MCP_TOOLS_LIST_CHANGED, SDK_MCP_MANIFESTS]
    : [SDK_MCP_TOOLS_LIST_CHANGED];
}
//@ chunk-ep26dgsk.js:1393-1466 placement
function pLs(e) {
  return e.includes("sdkMcpServerManifests") ? c(e, 0) : void 0;
}
//@ chunk-ep26dgsk.js:1466-1518 placement
var d = ["payload", "request", "sdkMcpServerManifests"];
//@ chunk-ep26dgsk.js:1518-1617 placement
function c(e, r) {
  return rewriteTopLevelValues(e, (o, t) => {
    if (o !== d[r]) return t;
    return r === d.length - 1 ? "{}" : (c(t, r + 1) ?? t);
  });
}
//@ chunk-ep26dgsk.js:1617-1645 placement
function m() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_SDK_MCP_REMOTE_MANIFESTS, !1);
}
//@ chunk-ep26dgsk.js:1645-1669 placement
var s = 300000,
  Bgt = 300000;
//@ chunk-ep26dgsk.js:1669-1912 placement
function perSendOriginVerdict({
  origin: origin,
  frameCreatedAt: frameCreatedAt,
  sessionWriters: sessionWriters,
  now: now = Date.now(),
}) {
  if (origin !== "host_per_send") return "no_origin_marker";
  let n = checkSessionWritersFreshness({
    frameCreatedAt: frameCreatedAt,
    sessionWriters: sessionWriters,
    maxFrameAgeMs: s,
    maxStatementAgeMs: Bgt,
    now: now,
  });
  if (n !== void 0) return n;
  return;
}
/**
 * 清单不生效的原因（来源、开关未开或未定）。
 */
//@ chunk-ep26dgsk.js:1912-2059 placement
async function manifestsDisabledReason(e) {
  let r = perSendOriginVerdict(e);
  if (r !== void 0) return r;
  if (m()) return;
  return (await withDeadline(
    initializeGrowthBook().catch(() => null),
    0,
  )) !== void 0
    ? "flag_off"
    : "flag_unsettled";
}
//@ chunk-ep26dgsk.js:2059-2068 placement
var S = !1;
//@ chunk-ep26dgsk.js:2068-2180 placement
function isServedOnFacts() {
  let e = Ao(),
    r = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_LEVEL_PLOVER, S);
  return ((e.servedOnFacts ??= r.value === !0 && r.source === "payload"), e.servedOnFacts);
}
//@ chunk-ep26dgsk.js:2180-2266 placement
var UI = "ui_",
  UI_DETACH = "ui_detach",
  REMOTE_COWORK = "remote_cowork",
  b = new Set([REMOTE_COWORK, "remote_mobile"]),
  VSCODE = "vscode";
/**
 * 会话持久化是否可信（本地或受信远程入口）。
 */
//@ chunk-ep26dgsk.js:2266-2433 placement
function isPersistenceTrusted(e) {
  let r = getSessionEntrypoint();
  return (
    !e.redactsWhatItPersists &&
    (!e.isRemoteTransport ||
      (mn() &&
        Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
        (b.has(r ?? "") || (BMi.has(r ?? "") && isServedOnFacts()))))
  );
}
//@ chunk-ep26dgsk.js:2433-2466 placement
function u() {
  return areHooksModulesAllowed() && !JPr();
}
//@ chunk-ep26dgsk.js:2466-2548 placement
function Fce(e) {
  return u() && isPersistenceTrusted(e) && (!e.isRemoteTransport || QZe(e.sessionWriters));
}
//@ chunk-ep26dgsk.js:2548-2610 placement
function gLs(e, r) {
  return e.isRemoteTransport && !r && u() && isPersistenceTrusted(e);
}
//@ chunk-ep26dgsk.js:2610-2658 placement
function EEo() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_osprey", !0);
}
//@ chunk-ep26dgsk.js:2658-2718 placement
function jgt(e) {
  return typeof e === "string" && e.startsWith(UI);
}
/**
 * 远程传输且低于下限。
 */
//@ chunk-ep26dgsk.js:2718-2823 placement
function leavesBelowFloor(e) {
  try {
    let r = e();
    return r.isRemoteTransport && r.leavesBelowFloor;
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 帧与声明时效判定。
 */
//@ chunk-ep26dgsk.js:2823-2958 placement
function frameAgeVerdict(e, r) {
  return checkSessionWritersFreshness({
    frameCreatedAt: e.createdAt,
    sessionWriters: e.sessionWriters,
    maxFrameAgeMs: s,
    maxStatementAgeMs: Bgt,
    now: r,
  });
}
/**
 * UI 控制请求是否应被拒绝。
 */
//@ chunk-ep26dgsk.js:2958-3196 placement
function shouldRejectUiControl(e, r, o = Date.now) {
  if (!jgt(e)) return !1;
  try {
    let t = r(),
      n =
        !t.isRemoteTransport ||
        ((t.isAtFloor || (t.leavesBelowFloor && e === UI_DETACH)) && frameAgeVerdict(t, o()) === void 0),
      M = e === UI_DETACH && t.isAnySurfaceAttached;
    return !(isPersistenceTrusted(t) && n && (M || u()));
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-ep26dgsk.js:3196-3274 placement
function yLs(e, r) {
  return e.isRemoteTransport && r && areHooksModulesAllowed() && !QZe(e.sessionWriters);
}
//@ chunk-ep26dgsk.js:3274-3392 placement
function hasPromptSubmitHooks() {
  try {
    return hasModuleHookingSite(
      "prompt.submit",
      void 0,
      getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule)),
    );
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-ep26dgsk.js:3392-3431 placement
function vEo() {
  return hasPromptSubmitHooks() || isPromptHookObserved() || shouldEscapeNdjsonForBridge();
}
//@ chunk-ep26dgsk.js:3431-3465 placement
function kEo() {
  return vEo() || !areHooksSettled();
}
//@ chunk-ep26dgsk.js:3465-3593 placement
function areHooksSettled() {
  let e = getPluginRegistry();
  return (
    !e.hookRegistrationOwed &&
    e.hookRegistrationInFlight === void 0 &&
    e.hooksUnknownCause === void 0 &&
    !isHookRegistrationPending()
  );
}
/**
 * UI 界面能力（含提示筛查）。
 */
//@ chunk-ep26dgsk.js:3593-3733 placement
function uiSurfaceCapabilities(e) {
  try {
    let r = e();
    if (!(Fce(r) && (!r.isRemoteTransport || getSessionEntrypoint() === REMOTE_COWORK))) return [];
    return kEo() ? [UI_SURFACE_V1, PROMPTS_SCREENED_V1] : [UI_SURFACE_V1];
  } catch (error) {
    return (logError(error), []);
  }
}
//@ chunk-ep26dgsk.js:3733-3809 placement
function TEo(e, r) {
  return hasModuleHookingSite(RENDER_EVENT, r === VSCODE ? { component: e, surface: r } : { component: e });
}
//@ chunk-ep26dgsk.js:3809-3890 placement
function _Ls(e) {
  return e === VSCODE ? getPluginRegistry().hookRegistrationInFlight?.catch(() => {}) : void 0;
}
/**
 * VS Code 顶层会话的 UI 钩子能力。
 */
//@ chunk-ep26dgsk.js:3890-4048 placement
function uiHookedCapabilities(e) {
  try {
    if (!isVsCodeTopSession() || !Fce(e()) || !areHooksSettled()) return [];
    return [
      UI_HOOKED_V1,
      ...jxn()
        .options.filter((option) => TEo(option, VSCODE))
        .map((r) => `${UI_HOOKED_V1}:${r}`),
    ];
  } catch (error) {
    return (logError(toError(error)), []);
  }
}

export {
  X1n,
  isPersistenceTrusted,
  Fce,
  gLs,
  vEo,
  EEo,
  uLs,
  jgt,
  shouldRejectUiControl,
  leavesBelowFloor,
  manifestsDisabledReason,
  yLs,
  uiSurfaceCapabilities,
  uiHookedCapabilities,
  sdkMcpCapabilities,
  kEo,
  JPr,
  _Ls,
  TEo,
  frameAgeVerdict,
  Bgt,
  pLs,
};

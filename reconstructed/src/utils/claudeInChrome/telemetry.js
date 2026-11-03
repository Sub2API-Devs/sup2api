/**
 * utils/claudeInChrome/telemetry.ts
 *
 * 2.1.316 新增：Claude in Chrome 遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kqy8a853.js (13)
 * attribution: placement 13
 */
import {
  getChromeAvailabilityAnchorMs,
  isDiskless,
  getChromeAvailabilityStagesLogged,
} from "../../bootstrap/state.js";
import { spawnTimestampMs } from "../startupMarks.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { entrypointForTelemetry } from "../../services/api/logging.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { withDeadline, systemClock, raceWithAbortSignal } from "../sleep.js";
import { AbortError } from "../errors.js";
import { logError } from "../log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-kqy8a853.js:634-965 placement
/**
 * Chrome 埋点的计时字段：距会话开始的毫秒数（锚点依次取会话切换时刻、spawn 时间戳、进程启动），锚点类型，以及是否远程会话。
 */
function chromeTimingFields() {
  let chromeAvailabilityAnchorMs = getChromeAvailabilityAnchorMs();
  let n = chromeAvailabilityAnchorMs === undefined ? spawnTimestampMs() : undefined;
  let [t, o] =
    chromeAvailabilityAnchorMs !== undefined
      ? [Math.max(0, Date.now() - chromeAvailabilityAnchorMs), "session_switch"]
      : n !== undefined
        ? [Math.max(0, Date.now() - n), "spawn_stamp"]
        : [isDiskless() ? undefined : Math.round(process.uptime() * 1000), "process_start"];
  return {
    msSinceSessionStart: t,
    startAnchor: fromEnum(o),
    isRemoteSession: Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID),
  };
}
//@ chunk-kqy8a853.js:965-1031 placement
/**
 * 每个 Chrome 可用性阶段只记录一次（返回是否为首次）。
 */
function markChromeStageOnce(e) {
  let chromeAvailabilityStagesLogged = getChromeAvailabilityStagesLogged();
  if (chromeAvailabilityStagesLogged.has(e)) return false;
  chromeAvailabilityStagesLogged.add(e);
  return true;
}
//@ chunk-kqy8a853.js:1031-1156 placement
/**
 * 记录 tengu_chrome_tools_added 事件（每会话一次，含工具数与发现来源）。
 */
function logChromeToolsAdded(e, n) {
  if (e === 0 || !markChromeStageOnce("tools_added")) return;
  logEvent("tengu_chrome_tools_added", {
    ...chromeTimingFields(),
    toolCount: e,
    discoverySource: fromEnum(n),
  });
}
//@ chunk-kqy8a853.js:1156-1281 placement
/**
 * 记录 tengu_chrome_tool_attempted 事件（每会话一次，附消息客户端平台）。
 */
function logChromeToolAttempted(messageClientPlatform) {
  if (!markChromeStageOnce("tool_attempted")) return;
  logEvent("tengu_chrome_tool_attempted", {
    ...chromeTimingFields(),
    ...(messageClientPlatform && {
      messageClientPlatform: entrypointForTelemetry(messageClientPlatform),
    }),
  });
}
//@ chunk-kqy8a853.js:1281-1393 placement
/**
 * 记录 tengu_chrome_bridge_connected 事件（每会话一次，附桥接状态）。
 */
function logChromeBridgeConnected(e) {
  if (!markChromeStageOnce("bridge_connected")) return;
  logEvent("tengu_chrome_bridge_connected", {
    ...chromeTimingFields(),
    bridgeStatus: fromEnumOpt(e),
  });
}
//@ chunk-kqy8a853.js:1393-1486 placement
/**
 * 记录“扩展已连接”事件（每会话一次）。
 */
function logExtensionConnected() {
  if (!markChromeStageOnce("extension_connected")) return;
  logEvent("tengu_chrome_extension_connected", chromeTimingFields());
}
//@ chunk-kqy8a853.js:1486-1575 placement
/**
 * 记录“工具调用时扩展断开”事件（含令牌账号不匹配标记）。
 */
function logToolCallDisconnected(tokenAccountMismatch) {
  logEvent("tengu_chrome_tool_call_disconnected", {
    ...chromeTimingFields(),
    tokenAccountMismatch,
  });
}
//@ chunk-kqy8a853.js:1575-1620 placement
/**
 * 检查浏览器是否连上的总时限（5 秒）。
 */
var BROWSER_CHECK_DEADLINE_MS = 5000;
var ENSURE_CONNECTED_TIMEOUT_MS = 4000;
var PICK_ONE_RUN_TIMEOUT_MS = 1000;
var BROWSER_ROSTER_WAIT_MS = 4000;
var MIN_ROSTER_WAIT_MS = 1000;
var ROSTER_WAIT_MARGIN_MS = 250;
//@ chunk-kqy8a853.js:1620-1691 placement
/**
 * 递增浏览器名册版本并发出变更通知。
 */
function bumpBrowserRoster(e) {
  e.browserRosterVersion++;
  e.browserRosterChanged.emit();
}
//@ chunk-kqy8a853.js:1691-2565 placement
/**
 * 权限询问前判断是否"没有任何浏览器连上"：有桥接、可列出扩展、未选定、开关 tengu_hushed_lantern 开启且本机曾配对时，连接中继并在时限内等待浏览器名册变化，确认无浏览器返回 true。
 */
async function noBrowserConnected(signal) {
  let state = claudeInChromeSession();
  let bridgeBinding = state.bridgeBinding;
  let socketClient = bridgeBinding?.socketClient;
  if (
    bridgeBinding === undefined ||
    socketClient?.listConnectedExtensions === undefined ||
    socketClient.hasActiveSelection?.() === true ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_hushed_lantern", true)
  )
    return false;
  if (!(
    Boolean(bridgeBinding.context.getPersistedDeviceId?.()) ||
    ((
      await withDeadline(
        Promise.resolve().then(() => bridgeBinding.context.getLocalDeviceIds?.()),
        PICK_ONE_RUN_TIMEOUT_MS,
      ).catch(() => {
        return;
      })
    )?.size ?? 0) > 0
  ))
    return false;
  if (state.relayConnectFailed === socketClient && !socketClient.isConnected()) return false;
  let p = socketClient.listConnectedExtensions.bind(socketClient);
  let d = systemClock.monotonicNow();
  let _ =
    state.noBrowserFound?.client === socketClient &&
    state.noBrowserFound.rosterVersion === state.browserRosterVersion;
  let r = _
    ? "none_cached"
    : await raceWithAbortSignal(
        waitForBrowserRoster(state, socketClient, p),
        signal,
        () => new AbortError(),
      ).catch((error) => {
        if (signal.aborted) return "aborted";
        logError(error);
        return "failed";
      });
  if (r !== "present" && r !== "roster_changed" && !_)
    logFeatureSad("chrome_permission_prompt", `browser_check_${r}`, {
      elapsed_ms: Math.round(systemClock.monotonicNow() - d),
    });
  return r === "none" || r === "none_short_wait" || r === "none_cached";
}
//@ chunk-kqy8a853.js:2565-2852 placement
/**
 * 查询桥接是否确无已连接的浏览器扩展（用于决定是否显示设置卡片说明）；查询异常记埋点。
 */
async function noBrowserForSetupCard() {
  let socketClient = claudeInChromeSession().bridgeBinding?.socketClient;
  if (socketClient?.listConnectedExtensions === undefined) return false;
  let n = await listBrowsersOnce(
    socketClient,
    socketClient.listConnectedExtensions.bind(socketClient),
    PICK_ONE_RUN_TIMEOUT_MS,
  ).catch((error) => {
    logError(error);
    return "failed";
  });
  if (n !== "none" && n !== "present") logFeatureSad("chrome_setup_card_answer", `browser_check_${n}`);
  return n === "none";
}
//@ chunk-kqy8a853.js:2852-3561 placement
/**
 * 连接中继后列出已连接扩展；无浏览器时在剩余时间内等待名册变化再查一次，返回 present / none / none_short_wait / roster_changed / connect_failed 等。
 */
async function waitForBrowserRoster(state, socketClient, t) {
  let o = systemClock.now() + BROWSER_CHECK_DEADLINE_MS;
  if ((await withDeadline(socketClient.ensureConnected(), ENSURE_CONNECTED_TIMEOUT_MS)) !== true) {
    state.relayConnectFailed = socketClient;
    return "connect_failed";
  }
  state.relayConnectFailed = undefined;
  let browserRosterVersion = state.browserRosterVersion;
  let p = systemClock.now();
  let d = await listBrowsersOnce(socketClient, t, PICK_ONE_RUN_TIMEOUT_MS);
  if (d !== "none" || state.browserRosterVersion !== browserRosterVersion)
    return d === "none" ? "roster_changed" : d;
  let min = Math.min(BROWSER_ROSTER_WAIT_MS, o - systemClock.now() - ROSTER_WAIT_MARGIN_MS);
  if (min < MIN_ROSTER_WAIT_MS) return "no_time_to_wait";
  let r = () => {};
  let promise = new Promise((resolve) => {
    r = state.browserRosterChanged.subscribe(resolve);
  });
  await withDeadline(promise, min).finally(() => r());
  if (state.browserRosterVersion !== browserRosterVersion) return "roster_changed";
  let C = await listBrowsersOnce(socketClient, t, PICK_ONE_RUN_TIMEOUT_MS);
  if (C !== "none" || state.browserRosterVersion !== browserRosterVersion)
    return C === "none" ? "roster_changed" : C;
  if (systemClock.now() - p < BROWSER_ROSTER_WAIT_MS) return "none_short_wait";
  state.noBrowserFound = {
    client: socketClient,
    rosterVersion: browserRosterVersion,
  };
  return "none";
}
//@ chunk-kqy8a853.js:3561-3721 placement
async function listBrowsersOnce(e, n, t) {
  let o = await withDeadline(n(), t);
  if (!e.isConnected()) return "connection_lost";
  if (o === undefined) return "list_timeout";
  return o.length > 0 ? "present" : "none";
}
export {
  logChromeToolsAdded,
  logChromeToolAttempted,
  noBrowserForSetupCard,
  noBrowserConnected,
  logToolCallDisconnected,
  bumpBrowserRoster,
  logExtensionConnected,
  logChromeBridgeConnected,
};

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
import { yW } from "../../services/api/logging.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { withDeadline, Aa, raceWithAbortSignal } from "../sleep.js";
import { AbortError } from "../errors.js";
import { logError } from "../log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";

/**
 * Chrome 埋点的计时字段：距会话开始的毫秒数（锚点依次取会话切换时刻、spawn 时间戳、进程启动），锚点类型，以及是否远程会话。
 */
//@ chunk-kqy8a853.js:634-965 placement
function chromeTimingFields() {
  let e = getChromeAvailabilityAnchorMs(),
    n = e === void 0 ? spawnTimestampMs() : void 0,
    [t, o] =
      e !== void 0
        ? [Math.max(0, Date.now() - e), "session_switch"]
        : n !== void 0
          ? [Math.max(0, Date.now() - n), "spawn_stamp"]
          : [isDiskless() ? void 0 : Math.round(process.uptime() * 1000), "process_start"];
  return {
    msSinceSessionStart: t,
    startAnchor: fromEnum(o),
    isRemoteSession: Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID),
  };
}
//@ chunk-kqy8a853.js:965-1031 placement
function u(e) {
  let n = getChromeAvailabilityStagesLogged();
  if (n.has(e)) return !1;
  return (n.add(e), !0);
}
/**
 * 记录 tengu_chrome_tools_added 事件（每会话一次，含工具数与发现来源）。
 */
//@ chunk-kqy8a853.js:1031-1156 placement
function logChromeToolsAdded(e, n) {
  if (e === 0 || !u("tools_added")) return;
  logEvent("tengu_chrome_tools_added", {
    ...chromeTimingFields(),
    toolCount: e,
    discoverySource: fromEnum(n),
  });
}
/**
 * 记录 tengu_chrome_tool_attempted 事件（每会话一次，附消息客户端平台）。
 */
//@ chunk-kqy8a853.js:1156-1281 placement
function logChromeToolAttempted(e) {
  if (!u("tool_attempted")) return;
  logEvent("tengu_chrome_tool_attempted", {
    ...chromeTimingFields(),
    ...(e && { messageClientPlatform: yW(e) }),
  });
}
/**
 * 记录 tengu_chrome_bridge_connected 事件（每会话一次，附桥接状态）。
 */
//@ chunk-kqy8a853.js:1281-1393 placement
function logChromeBridgeConnected(e) {
  if (!u("bridge_connected")) return;
  logEvent("tengu_chrome_bridge_connected", { ...chromeTimingFields(), bridgeStatus: fromEnumOpt(e) });
}
//@ chunk-kqy8a853.js:1393-1486 placement
function u2s() {
  if (!u("extension_connected")) return;
  logEvent("tengu_chrome_extension_connected", chromeTimingFields());
}
//@ chunk-kqy8a853.js:1486-1575 placement
function f2s(e) {
  logEvent("tengu_chrome_tool_call_disconnected", { ...chromeTimingFields(), tokenAccountMismatch: e });
}
//@ chunk-kqy8a853.js:1575-1620 placement
var A = 5000,
  E = 4000,
  h = 1000,
  S = 4000,
  M = 1000,
  y = 250;
//@ chunk-kqy8a853.js:1620-1691 placement
function p2s(e) {
  (e.browserRosterVersion++, e.browserRosterChanged.emit());
}
/**
 * 权限询问前判断是否"没有任何浏览器连上"：有桥接、可列出扩展、未选定、开关 tengu_hushed_lantern 开启且本机曾配对时，连接中继并在时限内等待浏览器名册变化，确认无浏览器返回 true。
 */
//@ chunk-kqy8a853.js:1691-2565 placement
async function noBrowserConnected(signal) {
  let state = Yi(),
    bridgeBinding = state.bridgeBinding,
    o = bridgeBinding?.socketClient;
  if (
    bridgeBinding === void 0 ||
    o?.listConnectedExtensions === void 0 ||
    o.hasActiveSelection?.() === !0 ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_hushed_lantern", !0)
  )
    return !1;
  if (!(
    Boolean(bridgeBinding.context.getPersistedDeviceId?.()) ||
    ((
      await withDeadline(
        Promise.resolve().then(() => bridgeBinding.context.getLocalDeviceIds?.()),
        h,
      ).catch(() => {
        return;
      })
    )?.size ?? 0) > 0
  ))
    return !1;
  if (state.relayConnectFailed === o && !o.isConnected()) return !1;
  let p = o.listConnectedExtensions.bind(o),
    monotonicNow = Aa.monotonicNow(),
    _ =
      state.noBrowserFound?.client === o && state.noBrowserFound.rosterVersion === state.browserRosterVersion,
    r = _
      ? "none_cached"
      : await raceWithAbortSignal(waitForBrowserRoster(state, o, p), signal, () => new AbortError()).catch(
          (w) => {
            if (signal.aborted) return "aborted";
            return (logError(w), "failed");
          },
        );
  if (r !== "present" && r !== "roster_changed" && !_)
    logFeatureSad("chrome_permission_prompt", `browser_check_${r}`, {
      elapsed_ms: Math.round(Aa.monotonicNow() - monotonicNow),
    });
  return r === "none" || r === "none_short_wait" || r === "none_cached";
}
/**
 * 查询桥接是否确无已连接的浏览器扩展（用于决定是否显示设置卡片说明）；查询异常记埋点。
 */
//@ chunk-kqy8a853.js:2565-2852 placement
async function noBrowserForSetupCard() {
  let e = Yi().bridgeBinding?.socketClient;
  if (e?.listConnectedExtensions === void 0) return !1;
  let n = await listBrowsersOnce(e, e.listConnectedExtensions.bind(e), h).catch(
    (t) => (logError(t), "failed"),
  );
  if (n !== "none" && n !== "present") logFeatureSad("chrome_setup_card_answer", `browser_check_${n}`);
  return n === "none";
}
/**
 * 连接中继后列出已连接扩展；无浏览器时在剩余时间内等待名册变化再查一次，返回 present / none / none_short_wait / roster_changed / connect_failed 等。
 */
//@ chunk-kqy8a853.js:2852-3561 placement
async function waitForBrowserRoster(e, n, t) {
  let o = Aa.now() + A;
  if ((await withDeadline(n.ensureConnected(), E)) !== !0)
    return ((e.relayConnectFailed = n), "connect_failed");
  e.relayConnectFailed = void 0;
  let browserRosterVersion = e.browserRosterVersion,
    now = Aa.now(),
    d = await listBrowsersOnce(n, t, h);
  if (d !== "none" || e.browserRosterVersion !== browserRosterVersion)
    return d === "none" ? "roster_changed" : d;
  let min = Math.min(S, o - Aa.now() - y);
  if (min < M) return "no_time_to_wait";
  let r = () => {},
    promise = new Promise((b) => {
      r = e.browserRosterChanged.subscribe(b);
    });
  if ((await withDeadline(promise, min).finally(() => r()), e.browserRosterVersion !== browserRosterVersion))
    return "roster_changed";
  let C = await listBrowsersOnce(n, t, h);
  if (C !== "none" || e.browserRosterVersion !== browserRosterVersion)
    return C === "none" ? "roster_changed" : C;
  if (Aa.now() - now < S) return "none_short_wait";
  return ((e.noBrowserFound = { client: n, rosterVersion: browserRosterVersion }), "none");
}
//@ chunk-kqy8a853.js:3561-3721 placement
async function listBrowsersOnce(e, n, t) {
  let o = await withDeadline(n(), t);
  if (!e.isConnected()) return "connection_lost";
  if (o === void 0) return "list_timeout";
  return o.length > 0 ? "present" : "none";
}

export {
  logChromeToolsAdded,
  logChromeToolAttempted,
  noBrowserForSetupCard,
  noBrowserConnected,
  f2s,
  p2s,
  u2s,
  logChromeBridgeConnected,
};

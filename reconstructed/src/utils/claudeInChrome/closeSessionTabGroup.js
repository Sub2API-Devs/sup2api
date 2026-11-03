/**
 * utils/claudeInChrome/closeSessionTabGroup.ts
 *
 * 2.1.316 新增：关闭会话浏览器标签组
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9a6n2431.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, QD, zg, T, A, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { logForDebugging } from "../debug.js";
import { withTimeout } from "../sleep.js";
import { parseTabsContextResult } from "./chromeMcpServer.js";
import { jsonParse } from "../slowOperations.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getRootSession, onSessionSwitch } from "../../bootstrap/state.js";
import { logError } from "../log.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { isTerminalShutdown } from "../terminalShutdown.js";

//@ chunk-9a6n2431.js:3555-3726 placement
var MAX_TABS_TO_CLOSE = 50,
  EXIT_CLOSE_TIMEOUT_MS = 1500,
  CLOSE_CALL_TIMEOUT_MS = 5000,
  BLANK_TAB_URLS = new Set(["chrome://newtab/", "about:blank"]),
  closeToolResultSchema = DoctorLazy(() =>
    u({ error: QD().or(zg()).or(T(!1)).or(T("")).optional(), result: u({ isError: T(!0).optional() }) }),
  );
//@ chunk-9a6n2431.js:3726-3808 placement
function M(e) {
  let safeParse = closeToolResultSchema().safeParse(e);
  return safeParse.success && safeParse.data.result.isError !== !0;
}
//@ chunk-9a6n2431.js:3808-3866 placement
var F = DoctorLazy(() => u({ availableTabs: A(u({ tabId: E(), url: o() })) }));
//@ chunk-9a6n2431.js:3866-4347 placement
function closeSessionTabGroupInBackground({
  sessionId: sessionId,
  onlyIfEmpty: onlyIfEmpty,
  clientOverride: clientOverride,
  callTimeoutMs: callTimeoutMs = CLOSE_CALL_TIMEOUT_MS,
}) {
  if (
    env.CLAUDE_CODE_REMOTE_SESSION_ID ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_chrome_tab_group_close", !0)
  )
    return Promise.resolve({ status: "disabled" });
  let closesInFlight = Yi().closesInFlight,
    d = closesInFlight.get(sessionId);
  if (d && (onlyIfEmpty || !d.onlyIfEmpty)) return d.promise;
  let r = (d?.promise ?? Promise.resolve())
    .then(() =>
      closeSessionTabGroup({
        sessionId: sessionId,
        onlyIfEmpty: onlyIfEmpty,
        clientOverride: clientOverride,
        callTimeoutMs: callTimeoutMs,
      }),
    )
    .finally(() => {
      if (closesInFlight.get(sessionId)?.promise === r) closesInFlight.delete(sessionId);
    });
  return (closesInFlight.set(sessionId, { onlyIfEmpty: onlyIfEmpty, promise: r }), r);
}
/**
 * 关闭本会话在浏览器中创建的标签组（可只在为空时关闭），带超时。
 */
//@ chunk-9a6n2431.js:4347-6061 placement
async function closeSessionTabGroup({
  sessionId: sessionId,
  onlyIfEmpty: onlyIfEmpty,
  clientOverride: clientOverride,
  callTimeoutMs: callTimeoutMs,
}) {
  let n = clientOverride ?? Yi().bridgeBinding?.socketClient;
  if (!n || !n.isConnected())
    return (
      logForDebugging("[closeSessionTabGroup] bridge not connected, skipping"),
      { status: "not_connected" }
    );
  let d = { permissionMode: "ask", sessionScope: { sessionId: sessionId } },
    r,
    _;
  try {
    let a = await withTimeout(
        n.callTool("tabs_context_mcp", { createIfEmpty: !1 }, d),
        callTimeoutMs,
        "tabs_context_mcp timed out",
      ),
      { tabGroupId: tabGroupId, json: json } = parseTabsContextResult(a);
    if (tabGroupId === void 0 || json === void 0)
      return (logForDebugging("[closeSessionTabGroup] no group for session"), { status: "no_group" });
    _ = tabGroupId;
    let safeParse = F().safeParse(jsonParse(json));
    if (!safeParse.success)
      return (
        logForDebugging(`[closeSessionTabGroup] group ${_}: unreadable tab list, keeping it`),
        logFeatureSad("chrome_tab_group_close", "tabs_unreadable"),
        { status: "kept", tabs: 0 }
      );
    r = safeParse.data.availableTabs;
  } catch (error) {
    return (
      logForDebugging(`[closeSessionTabGroup] tabs_context_mcp failed: ${String(error)}`),
      logFeatureBad("chrome_tab_group_close", "context_failed"),
      { status: "no_group" }
    );
  }
  if (onlyIfEmpty && r.some((a) => !BLANK_TAB_URLS.has(a.url)))
    return (
      logForDebugging(`[closeSessionTabGroup] group ${_} has content, keeping ${r.length} tabs`),
      { status: "kept", tabs: r.length }
    );
  if (r.length > MAX_TABS_TO_CLOSE)
    return (
      logForDebugging(
        `[closeSessionTabGroup] group ${_} holds ${r.length} tabs, over the close cap; keeping it`,
      ),
      logFeatureSad("chrome_tab_group_close", "over_cap"),
      { status: "kept", tabs: r.length }
    );
  let G = { permissionMode: "ask", sessionScope: { sessionId: sessionId, tabGroupId: _ } },
    k = 0,
    S = 0;
  for (let a = r.length - 1; a >= 0; a--) {
    let { tabId: tabId } = r[a];
    try {
      let C = await withTimeout(
        n.callTool("tabs_close_mcp", { tabId: tabId }, G),
        callTimeoutMs,
        "tabs_close_mcp timed out",
      );
      if (!M(C)) {
        S++;
        break;
      }
      k++;
    } catch {
      S++;
      break;
    }
  }
  if (
    (logForDebugging(
      `[closeSessionTabGroup] group ${_}: closed ${k}/${r.length} tabs` +
        (S > 0 ? ", stopped at a failed close" : ""),
    ),
    S > 0)
  )
    logFeatureSad("chrome_tab_group_close", "close_failed");
  else logFeatureOk("chrome_tab_group_close");
  return { status: "closed", closed: k, failed: S };
}
//@ chunk-9a6n2431.js:6061-6519 placement
function registerTabGroupCleanup() {
  let e = Yi();
  if (e.tabGroupCleanupRegistered) return;
  e.tabGroupCleanupRegistered = !0;
  let id = getRootSession().id;
  ((e.unsubscribeSessionSwitch = onSessionSwitch((c, b) => {
    if (c === id) return;
    let n = id;
    ((id = c), closeSessionTabGroupInBackground({ sessionId: n, onlyIfEmpty: !0 }).catch(logError));
  })),
    (e.unregisterExitCleanup = registerCleanup(() => {
      if (!isTerminalShutdown()) return;
      let list = Array.from(e.closesInFlight.values(), (b) => b.promise);
      return withTimeout(
        Promise.allSettled([
          ...list,
          closeSessionTabGroupInBackground({ sessionId: getRootSession().id, onlyIfEmpty: !0 }),
        ]),
        EXIT_CLOSE_TIMEOUT_MS,
        "chrome tab group close timed out at exit",
      ).catch(() => {});
    })));
}

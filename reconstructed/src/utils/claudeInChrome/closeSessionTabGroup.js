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
import { u, QD, zg, literal, array, E, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
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
var MAX_TABS_TO_CLOSE = 50;
var EXIT_CLOSE_TIMEOUT_MS = 1500;
var CLOSE_CALL_TIMEOUT_MS = 5000;
var BLANK_TAB_URLS = new Set(["chrome://newtab/", "about:blank"]);
var closeToolResultSchema = DoctorLazy(() =>
  u({
    error: QD().or(zg()).or(literal(false)).or(literal("")).optional(),
    result: u({
      isError: literal(true).optional(),
    }),
  }),
);
//@ chunk-9a6n2431.js:3726-3808 placement
/**
 * 判断关闭标签组的调用是否成功（结果为 isError 时算失败）。
 */
function closeTabGroupSucceeded(e) {
  let s = closeToolResultSchema().safeParse(e);
  return s.success && s.data.result.isError !== true;
}
//@ chunk-9a6n2431.js:3808-3866 placement
/**
 * 可用标签页列表的 schema（tabId 与 url）。
 */
var availableTabsSchema = DoctorLazy(() =>
  u({
    availableTabs: array(
      u({
        tabId: E(),
        url: string(),
      }),
    ),
  }),
);
//@ chunk-9a6n2431.js:3866-4347 placement
function closeSessionTabGroupInBackground({
  sessionId,
  onlyIfEmpty,
  clientOverride,
  callTimeoutMs = CLOSE_CALL_TIMEOUT_MS,
}) {
  if (
    env.CLAUDE_CODE_REMOTE_SESSION_ID ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_chrome_tab_group_close", true)
  )
    return Promise.resolve({
      status: "disabled",
    });
  let closesInFlight = claudeInChromeSession().closesInFlight;
  let d = closesInFlight.get(sessionId);
  if (d && (onlyIfEmpty || !d.onlyIfEmpty)) return d.promise;
  let r = (d?.promise ?? Promise.resolve())
    .then(() =>
      closeSessionTabGroup({
        sessionId,
        onlyIfEmpty,
        clientOverride,
        callTimeoutMs,
      }),
    )
    .finally(() => {
      if (closesInFlight.get(sessionId)?.promise === r) closesInFlight.delete(sessionId);
    });
  closesInFlight.set(sessionId, {
    onlyIfEmpty,
    promise: r,
  });
  return r;
}
//@ chunk-9a6n2431.js:4347-6061 placement
/**
 * 关闭本会话在浏览器中创建的标签组（可只在为空时关闭），带超时。
 */
async function closeSessionTabGroup({ sessionId, onlyIfEmpty, clientOverride, callTimeoutMs }) {
  let n = clientOverride ?? claudeInChromeSession().bridgeBinding?.socketClient;
  if (!n || !n.isConnected()) {
    logForDebugging("[closeSessionTabGroup] bridge not connected, skipping");
    return {
      status: "not_connected",
    };
  }
  let d = {
    permissionMode: "ask",
    sessionScope: {
      sessionId,
    },
  };
  let r;
  let _;
  try {
    let a = await withTimeout(
      n.callTool(
        "tabs_context_mcp",
        {
          createIfEmpty: false,
        },
        d,
      ),
      callTimeoutMs,
      "tabs_context_mcp timed out",
    );
    let { tabGroupId, json } = parseTabsContextResult(a);
    if (tabGroupId === undefined || json === undefined) {
      logForDebugging("[closeSessionTabGroup] no group for session");
      return {
        status: "no_group",
      };
    }
    _ = tabGroupId;
    let O = availableTabsSchema().safeParse(jsonParse(json));
    if (!O.success) {
      logForDebugging(`[closeSessionTabGroup] group ${_}: unreadable tab list, keeping it`);
      logFeatureSad("chrome_tab_group_close", "tabs_unreadable");
      return {
        status: "kept",
        tabs: 0,
      };
    }
    r = O.data.availableTabs;
  } catch (error) {
    logForDebugging(`[closeSessionTabGroup] tabs_context_mcp failed: ${String(error)}`);
    logFeatureBad("chrome_tab_group_close", "context_failed");
    return {
      status: "no_group",
    };
  }
  if (onlyIfEmpty && r.some((a) => !BLANK_TAB_URLS.has(a.url))) {
    logForDebugging(`[closeSessionTabGroup] group ${_} has content, keeping ${r.length} tabs`);
    return {
      status: "kept",
      tabs: r.length,
    };
  }
  if (r.length > MAX_TABS_TO_CLOSE) {
    logForDebugging(
      `[closeSessionTabGroup] group ${_} holds ${r.length} tabs, over the close cap; keeping it`,
    );
    logFeatureSad("chrome_tab_group_close", "over_cap");
    return {
      status: "kept",
      tabs: r.length,
    };
  }
  let G = {
    permissionMode: "ask",
    sessionScope: {
      sessionId,
      tabGroupId: _,
    },
  };
  let k = 0;
  let S = 0;
  for (let j = r.length - 1; j >= 0; j--) {
    let { tabId } = r[j];
    try {
      let C = await withTimeout(
        n.callTool(
          "tabs_close_mcp",
          {
            tabId,
          },
          G,
        ),
        callTimeoutMs,
        "tabs_close_mcp timed out",
      );
      if (!closeTabGroupSucceeded(C)) {
        S++;
        break;
      }
      k++;
    } catch {
      S++;
      break;
    }
  }
  logForDebugging(
    `[closeSessionTabGroup] group ${_}: closed ${k}/${r.length} tabs` +
      (S > 0 ? ", stopped at a failed close" : ""),
  );
  if (S > 0) logFeatureSad("chrome_tab_group_close", "close_failed");
  else logFeatureOk("chrome_tab_group_close");
  return {
    status: "closed",
    closed: k,
    failed: S,
  };
}
//@ chunk-9a6n2431.js:6061-6519 placement
function registerTabGroupCleanup() {
  let e = claudeInChromeSession();
  if (e.tabGroupCleanupRegistered) return;
  e.tabGroupCleanupRegistered = true;
  let id = getRootSession().id;
  e.unsubscribeSessionSwitch = onSessionSwitch((c, b) => {
    if (c === id) return;
    let sessionId = id;
    id = c;
    closeSessionTabGroupInBackground({
      sessionId,
      onlyIfEmpty: true,
    }).catch(logError);
  });
  e.unregisterExitCleanup = registerCleanup(() => {
    if (!isTerminalShutdown()) return;
    let list = Array.from(e.closesInFlight.values(), (b) => b.promise);
    return withTimeout(
      Promise.allSettled([
        ...list,
        closeSessionTabGroupInBackground({
          sessionId: getRootSession().id,
          onlyIfEmpty: true,
        }),
      ]),
      EXIT_CLOSE_TIMEOUT_MS,
      "chrome tab group close timed out at exit",
    ).catch(() => {});
  });
}

/**
 * utils/claudeInChrome/closeSessionTabGroup.ts
 *
 * 2.1.316 新增：关闭会话浏览器标签组
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cj236k7y.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  undefinedSchema,
  nullSchema,
  literal,
  array,
  numberSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-cj236k7y.js:3863-4034 placement
var MAX_TABS_TO_CLOSE = 50;
var EXIT_CLOSE_TIMEOUT_MS = 1500;
var CLOSE_CALL_TIMEOUT_MS = 5000;
var BLANK_TAB_URLS = new Set(["chrome://newtab/", "about:blank"]);
var closeToolResultSchema = DoctorLazy(() =>
  objectSchema({
    error: undefinedSchema().or(nullSchema()).or(literal(false)).or(literal("")).optional(),
    result: objectSchema({
      isError: literal(true).optional(),
    }),
  }),
);
//@ chunk-cj236k7y.js:4034-4116 placement
/**
 * 判断关闭标签组的调用是否成功（结果为 isError 时算失败）。
 */
function closeTabGroupSucceeded(result) {
  let parseResult = closeToolResultSchema().safeParse(result);
  return parseResult.success && parseResult.data.result.isError !== true;
}
//@ chunk-cj236k7y.js:4116-4174 placement
/**
 * 可用标签页列表的 schema（tabId 与 url）。
 */
var availableTabsSchema = DoctorLazy(() =>
  objectSchema({
    availableTabs: array(
      objectSchema({
        tabId: numberSchema(),
        url: stringSchema(),
      }),
    ),
  }),
);
//@ chunk-cj236k7y.js:4174-4655 placement
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
  let existing = closesInFlight.get(sessionId);
  if (existing && (onlyIfEmpty || !existing.onlyIfEmpty)) return existing.promise;
  let closePromise = (existing?.promise ?? Promise.resolve())
    .then(() =>
      closeSessionTabGroup({
        sessionId,
        onlyIfEmpty,
        clientOverride,
        callTimeoutMs,
      }),
    )
    .finally(() => {
      if (closesInFlight.get(sessionId)?.promise === closePromise) closesInFlight.delete(sessionId);
    });
  closesInFlight.set(sessionId, {
    onlyIfEmpty,
    promise: closePromise,
  });
  return closePromise;
}
//@ chunk-cj236k7y.js:4655-6369 placement
/**
 * 关闭本会话在浏览器中创建的标签组（可只在为空时关闭），带超时。
 */
async function closeSessionTabGroup({ sessionId, onlyIfEmpty, clientOverride, callTimeoutMs }) {
  let client = clientOverride ?? claudeInChromeSession().bridgeBinding?.socketClient;
  if (!client || !client.isConnected()) {
    logForDebugging("[closeSessionTabGroup] bridge not connected, skipping");
    return {
      status: "not_connected",
    };
  }
  let sessionContext = {
    permissionMode: "ask",
    sessionScope: {
      sessionId,
    },
  };
  let tabs;
  let tabGroupId;
  try {
    let contextResult = await withTimeout(
      client.callTool(
        "tabs_context_mcp",
        {
          createIfEmpty: false,
        },
        sessionContext,
      ),
      callTimeoutMs,
      "tabs_context_mcp timed out",
    );
    let { tabGroupId: tabGroupId_2, json } = parseTabsContextResult(contextResult);
    if (tabGroupId_2 === undefined || json === undefined) {
      logForDebugging("[closeSessionTabGroup] no group for session");
      return {
        status: "no_group",
      };
    }
    tabGroupId = tabGroupId_2;
    let parseResult = availableTabsSchema().safeParse(jsonParse(json));
    if (!parseResult.success) {
      logForDebugging(`[closeSessionTabGroup] group ${tabGroupId}: unreadable tab list, keeping it`);
      logFeatureSad("chrome_tab_group_close", "tabs_unreadable");
      return {
        status: "kept",
        tabs: 0,
      };
    }
    tabs = parseResult.data.availableTabs;
  } catch (error) {
    logForDebugging(`[closeSessionTabGroup] tabs_context_mcp failed: ${String(error)}`);
    logFeatureBad("chrome_tab_group_close", "context_failed");
    return {
      status: "no_group",
    };
  }
  if (onlyIfEmpty && tabs.some((tab) => !BLANK_TAB_URLS.has(tab.url))) {
    logForDebugging(`[closeSessionTabGroup] group ${tabGroupId} has content, keeping ${tabs.length} tabs`);
    return {
      status: "kept",
      tabs: tabs.length,
    };
  }
  if (tabs.length > MAX_TABS_TO_CLOSE) {
    logForDebugging(
      `[closeSessionTabGroup] group ${tabGroupId} holds ${tabs.length} tabs, over the close cap; keeping it`,
    );
    logFeatureSad("chrome_tab_group_close", "over_cap");
    return {
      status: "kept",
      tabs: tabs.length,
    };
  }
  let tabContext = {
    permissionMode: "ask",
    sessionScope: {
      sessionId,
      tabGroupId,
    },
  };
  let closedCount = 0;
  let failedCount = 0;
  for (let idx = tabs.length - 1; idx >= 0; idx--) {
    let { tabId } = tabs[idx];
    try {
      let closeResult = await withTimeout(
        client.callTool(
          "tabs_close_mcp",
          {
            tabId,
          },
          tabContext,
        ),
        callTimeoutMs,
        "tabs_close_mcp timed out",
      );
      if (!closeTabGroupSucceeded(closeResult)) {
        failedCount++;
        break;
      }
      closedCount++;
    } catch {
      failedCount++;
      break;
    }
  }
  logForDebugging(
    `[closeSessionTabGroup] group ${tabGroupId}: closed ${closedCount}/${tabs.length} tabs` +
      (failedCount > 0 ? ", stopped at a failed close" : ""),
  );
  if (failedCount > 0) logFeatureSad("chrome_tab_group_close", "close_failed");
  else logFeatureOk("chrome_tab_group_close");
  return {
    status: "closed",
    closed: closedCount,
    failed: failedCount,
  };
}
//@ chunk-cj236k7y.js:6369-6827 placement
function registerTabGroupCleanup() {
  let session = claudeInChromeSession();
  if (session.tabGroupCleanupRegistered) return;
  session.tabGroupCleanupRegistered = true;
  let id = getRootSession().id;
  session.unsubscribeSessionSwitch = onSessionSwitch((nextSession, previousSession) => {
    if (nextSession === id) return;
    let sessionId = id;
    id = nextSession;
    closeSessionTabGroupInBackground({
      sessionId,
      onlyIfEmpty: true,
    }).catch(logError);
  });
  session.unregisterExitCleanup = registerCleanup(() => {
    if (!isTerminalShutdown()) return;
    let list = Array.from(session.closesInFlight.values(), (entry) => entry.promise);
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
export { closeSessionTabGroupInBackground, registerTabGroupCleanup };

/**
 * utils/claudeInChrome/chromeMcpServer.ts
 *
 * 2.1.316 新增：Claude in Chrome MCP 服务器的工具调用入口：本地处理切换/列出/选择浏览器，其余经 socket 转发给扩展，截图落盘。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w2264jxg.js (39)
 * attribution: placement 39
 */
import { mkdtemp, mkdir, lstat, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { safeCallPromise, pickBrowserDevice } from "./toolErrorClassification.js";
import { browserPreflightInstruction } from "./browserToolSchemas.js";
import {
  quoteTruncated,
  SocketConnectionError,
  NoExtensionConnectedError,
  ToolCallTimeoutError,
  ToolCallSupersededError,
  ExtensionDisconnectedMidCallError,
  RequestTooLargeError,
} from "./socketClient.js";

//@ chunk-w2264jxg.js:426-541 placement
var SCREENSHOT_EXT_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  },
  SCREENSHOT_SAVED_PREFIX = "Screenshot saved to: ",
  screenshotCounter = 0,
  cachedScreenshotDir;
//@ chunk-w2264jxg.js:541-637 placement
function S() {
  return (
    (cachedScreenshotDir ??= mkdtemp(join(tmpdir(), "claude-chrome-screenshots-")).catch((e) => {
      throw ((cachedScreenshotDir = void 0), e);
    })),
    cachedScreenshotDir
  );
}
/**
 * 确定截图保存目录：宿主提供 getScreenshotSaveDir 时用它（建目录 0700）；否则用缓存的私有临时目录，属主或权限不对时重新创建。
 */
//@ chunk-w2264jxg.js:637-936 placement
async function resolveScreenshotSaveDir(e) {
  if (e.getScreenshotSaveDir) {
    let screenshotSaveDir = e.getScreenshotSaveDir();
    if (screenshotSaveDir === void 0) return;
    return (await mkdir(screenshotSaveDir, { recursive: !0, mode: 448 }), screenshotSaveDir);
  }
  let t = await S();
  try {
    let n = await lstat(t),
      getuid = process.getuid;
    if (n.isDirectory() && (getuid === void 0 || (n.uid === getuid() && (n.mode & 511) === 448))) return t;
  } catch {}
  return ((cachedScreenshotDir = void 0), S());
}
//@ chunk-w2264jxg.js:936-2348 placement
async function saveScreenshotsToDisk(e, t) {
  if (e.isError || !e.content.some((o) => o.type === "image")) return e;
  let n;
  try {
    n = await resolveScreenshotSaveDir(t);
  } catch (error) {
    return (
      t.logger.warn(
        `[${t.serverName}] save_to_disk: could not prepare screenshot directory: ${error instanceof Error ? error.message : String(error)}`,
      ),
      {
        ...e,
        content: [
          ...e.content,
          {
            type: "text",
            text:
              "Note: save_to_disk failed \u2014 the screenshot directory could not " +
              "be created. The image is included inline above.",
          },
        ],
      }
    );
  }
  if (n === void 0)
    return {
      ...e,
      content: [
        ...e.content,
        {
          type: "text",
          text:
            "Note: save_to_disk had no effect \u2014 screenshots are not " +
            "persisted to disk in this session. The image is included inline above; refer to it directly. Do not retry with save_to_disk.",
        },
      ],
    };
  let r = [],
    u = !1,
    s = !1;
  for (let o of e.content) {
    if ((r.push(o), o.type !== "image")) continue;
    let a = Object.hasOwn(SCREENSHOT_EXT_BY_MIME, o.mimeType) ? SCREENSHOT_EXT_BY_MIME[o.mimeType] : "png",
      i = join(n, `screenshot-${Date.now()}-${screenshotCounter++}.${a}`);
    try {
      (await writeFile(i, Buffer.from(o.data, "base64"), { flag: "wx", mode: 384 }),
        (u = !0),
        r.push({ type: "text", text: `${SCREENSHOT_SAVED_PREFIX}${i}` }));
    } catch (error) {
      ((s = !0),
        t.logger.warn(
          `[${t.serverName}] save_to_disk: failed to write screenshot: ${error instanceof Error ? error.message : String(error)}`,
        ));
    }
  }
  if (u)
    r.push({
      type: "text",
      text: "Include the saved path(s) in your response so they can be attached for the user.",
    });
  if (s)
    r.push({
      type: "text",
      text:
        "Note: save_to_disk failed for at least one screenshot \u2014 it could " +
        "not be written to disk. The image is included inline above.",
    });
  return { ...e, content: r };
}
//@ chunk-w2264jxg.js:2348-2366 placement
var weakMap = new WeakMap();
//@ chunk-w2264jxg.js:2366-2415 placement
function W$r(e) {
  (weakMap.delete(e), e.clearSelection?.());
}
/**
 * 生成给模型看的浏览器名称：去控制/格式字符、统一引号、折叠空白，把 "this computer" 替换为 [?]，为空时用 "Browser N"。
 */
//@ chunk-w2264jxg.js:2415-2665 placement
function sanitizeBrowserLabel(e, t) {
  return (
    browserDisplayName(e, t)
      .replace(/[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, " ")
      .replace(/[\p{Quotation_Mark}\u02BA\u02DD\u02EE\u05F4\u2033\u3003]+/gu, "'")
      .replace(/\s+/g, " ")
      .replace(/this\s*computer/giu, "[?]")
      .trim() || `Browser ${t + 1}`
  );
}
//@ chunk-w2264jxg.js:2665-2820 placement
function browserDisplayName(e, t) {
  let trimmed = (e.name ?? "").replace(/[\r\n\t\u0000-\u001f]/g, " ").trim();
  if (!trimmed) return `Browser ${t + 1}`;
  return trimmed.length > 50 ? `${trimmed.slice(0, 50)}\u2026` : trimmed;
}
//@ chunk-w2264jxg.js:2820-3104 placement
var OS_DISPLAY_NAMES = new Map([
  ["macOS", "macOS"],
  ["Windows", "Windows"],
  ["Linux", "Linux"],
  ["Chrome OS", "Chrome OS"],
  ["Chromium OS", "Chromium OS"],
  ["Android", "Android"],
  ["iOS", "iOS"],
  ["MacIntel", "macOS"],
  ["Win32", "Windows"],
  ["Linux x86_64", "Linux"],
  ["Linux aarch64", "Linux"],
  ["Linux armv8l", "Linux"],
]);
//@ chunk-w2264jxg.js:3104-3160 placement
function z(e) {
  return (e !== void 0 && OS_DISPLAY_NAMES.get(e)) || "unknown OS";
}
/**
 * 工具调用前检查是否需要先让用户选浏览器：连接了多个扩展且未选定时，返回列出本机与其他设备浏览器（最多 8 个）的提示；已选或不需询问时返回 null 并记入 WeakMap。
 */
//@ chunk-w2264jxg.js:3160-4418 placement
async function browserSelectionPreflight(host, bridge) {
  if (!bridge.listConnectedExtensions) return (weakMap.set(bridge, !0), null);
  if (weakMap.get(bridge) && bridge.hasActiveSelection?.()) return null;
  weakMap.delete(bridge);
  let listConnectedExtensions = await bridge.listConnectedExtensions();
  if (listConnectedExtensions.length === 0) return null;
  let r = listConnectedExtensions.length > 1 ? await safeCallPromise(host.getLocalDeviceIds) : void 0,
    u = pickBrowserDevice(listConnectedExtensions, bridge.getSelectedDeviceId?.(), r);
  if (u.kind !== "ask") return (weakMap.set(bridge, !0), null);
  let { candidates: candidates, localCount: localCount } = u,
    sliced = candidates.slice(0, 8),
    i = (d, m) =>
      `${m + 1}. "${sanitizeBrowserLabel(d, m)}" (${z(d.osPlatform)})${r?.get(d.deviceId) === "remembered" ? " \u2014 seen recently, not answering right now" : ""} \u2014 deviceId: ${d.deviceId}`,
    mapped = sliced.slice(0, localCount).map(i),
    mapped_2 = sliced.slice(localCount).map((d, m) => i(d, m + mapped.length)),
    f =
      localCount > 0
        ? `Browsers on this computer:
${mapped.join(`
`)}

Other connected browsers:
${
  mapped_2.join(`
`) || (candidates.length === localCount ? "(none)" : "")
}`
        : `Connected browsers:
${mapped_2.join(`
`)}`,
    p =
      candidates.length > sliced.length
        ? `
\u2026and ${candidates.length - sliced.length} more not shown`
        : "";
  return {
    content: [
      {
        type: "text",
        text: `${localCount > 0 ? `${candidates.length} Chrome browsers are connected to this account, ${localCount} of them on this computer, and none has been selected for this session. ` : "Multiple Chrome browsers are connected to this account and none has been selected for this session. "}${browserPreflightInstruction(host.askUserToolName)}${localCount > 0 ? " List the browsers on this computer first, in the order below." : ""}

${f}${p}`,
      },
    ],
    isError: !0,
  };
}
//@ chunk-w2264jxg.js:4418-4529 placement
function jsonForLog(e) {
  return JSON.stringify(e, (t, n) =>
    typeof n === "string" && n.length > 256 ? `<${n.length} chars elided>` : n,
  );
}
//@ chunk-w2264jxg.js:4529-4552 placement
class k extends Error {}
//@ chunk-w2264jxg.js:4552-4675 placement
function callBridgeTool(e, t, n, r, u) {
  if (e.isDisabled?.()) return Promise.reject(new k(`disabled: ${n} not sent`));
  return t.callTool(n, r, u);
}
//@ chunk-w2264jxg.js:4675-5485 placement
async function fetchActiveTab(e, t, n) {
  if (e.isDisabled?.()) return;
  try {
    if (!(await t.ensureConnected())) return;
    let u = (await callBridgeTool(e, t, "tabs_context_mcp", {}, n ? { ...n, permissionMode: "ask" } : void 0))
      ?.result?.content;
    if (!Array.isArray(u)) return;
    let s;
    for (let i of u) {
      if (typeof i !== "object" || i === null || i.type !== "text" || typeof i.text !== "string") continue;
      try {
        let parsed = JSON.parse(i.text);
        if (Array.isArray(parsed.availableTabs)) {
          s = { ...parsed, availableTabs: parsed.availableTabs };
          break;
        }
      } catch {}
    }
    if (!s) return;
    let filtered = s.availableTabs.filter(
        (availableTab) =>
          typeof availableTab === "object" &&
          availableTab !== null &&
          typeof availableTab.tabId === "number" &&
          typeof availableTab.url === "string",
      ),
      a =
        typeof s.selectedTabId === "number"
          ? filtered.find((i) => i.tabId === s.selectedTabId)
          : filtered.length === 1
            ? filtered[0]
            : void 0;
    return a ? { tabId: a.tabId, origin: new URL(a.url).origin } : void 0;
  } catch (error) {
    e.logger.debug(`[${e.serverName}] fetchActiveTab failed`, error);
    return;
  }
}
//@ chunk-w2264jxg.js:5485-5614 placement
function errorContentOf(e) {
  if (typeof e !== "object" || e === null) return "";
  let n = e.error?.content;
  return typeof n === "string" || Array.isArray(n) ? n : "";
}
/**
 * 通过扩展的 computer 工具向指定标签页输入文字（跳过权限检查），可带 expected_origin；返回 {ok} 或失败原因（disabled/disconnected/origin_mismatch/tool_error/transport）。
 */
//@ chunk-w2264jxg.js:5614-6397 placement
async function typeIntoTabViaBridge(host, bridge, callOptions, tabId, text, expectedOrigin) {
  if (host.isDisabled?.()) return { ok: !1, reason: "disabled" };
  try {
    if (!(await bridge.ensureConnected())) return { ok: !1, reason: "disconnected" };
    let o = await callBridgeTool(
        host,
        bridge,
        "computer",
        {
          action: "type",
          text: text,
          tabId: tabId,
          ...(expectedOrigin !== void 0 ? { expected_origin: expectedOrigin } : {}),
        },
        { ...callOptions, permissionMode: "skip_all_permission_checks", onPermissionRequest: void 0 },
      ),
      a = typeof o === "object" && o !== null && !("error" in o) ? o.result : void 0,
      i = typeof a === "object" && a !== null && (a.isError === !0 || a.is_error === !0);
    if (a !== void 0 && a !== null && a !== !1 && !i) return { ok: !0 };
    let c = i ? (a.content ?? "") : "";
    if ((contentText(errorContentOf(o)) || contentText(c)).startsWith("Origin mismatch"))
      return { ok: !1, reason: "origin_mismatch" };
    return { ok: !1, reason: "tool_error" };
  } catch (error) {
    return (
      host.logger.debug(`[${host.serverName}] typeIntoTab failed`, error),
      { ok: !1, reason: error instanceof k ? "disabled" : "transport" }
    );
  }
}
//@ chunk-w2264jxg.js:6397-6552 placement
function hostToolContext(e, t, n, r) {
  return {
    sessionId: r,
    getActiveTabOrigin: async () => (await fetchActiveTab(e, t, n))?.origin,
    getActiveTab: () => fetchActiveTab(e, t, n),
    typeIntoTab: (u, s, o) => typeIntoTabViaBridge(e, t, n, u, s, o),
  };
}
/**
 * 从参数（含 browser_batch 内每个动作）中去掉 save_to_disk，并返回是否需要把截图落盘。
 */
//@ chunk-w2264jxg.js:6552-7042 placement
function stripSaveToDiskArgs(e, t) {
  if (e === "browser_batch" && Array.isArray(t.actions)) {
    let { save_to_disk: save_to_disk, ...s } = t,
      o = save_to_disk === !0,
      mapped = t.actions.map((action) => {
        if (typeof action !== "object" || action === null) return action;
        let l = action;
        if (typeof l.input !== "object" || l.input === null) return action;
        let { save_to_disk: save_to_disk, ...f } = l.input;
        if (save_to_disk === !0 && l.name === "computer") o = !0;
        return { ...l, input: f };
      });
    return { args: { ...s, actions: mapped }, wantsSave: o };
  }
  if (!("save_to_disk" in t)) return { args: t, wantsSave: !1 };
  let { save_to_disk: save_to_disk, ...r } = t;
  return { args: r, wantsSave: e === "computer" && save_to_disk === !0 };
}
/**
 * 被宿主排除的工具（含 browser_batch 内的动作）返回 "Unknown tool" 错误；batch 内动作缺名或嵌套 batch 也报错。
 */
//@ chunk-w2264jxg.js:7042-7455 placement
function excludedToolError(e, t, n) {
  let excludedTools = e.excludedTools;
  if (!excludedTools) return;
  if (excludedTools.has(t)) return `Unknown tool: ${t}`;
  if (t !== "browser_batch") return;
  if (!Array.isArray(n.actions)) return "browser_batch: actions must be an array";
  for (let action of n.actions) {
    let s = action?.name;
    if (typeof s !== "string" || s === "browser_batch")
      return "browser_batch: every action needs a string tool name (and batches don't nest)";
    if (excludedTools.has(s)) return `Unknown tool: ${s}`;
  }
  return;
}
//@ chunk-w2264jxg.js:7455-7604 placement
function guardPermissionRequests(e, t) {
  let n = t?.onPermissionRequest,
    isDisabled = e.isDisabled;
  if (!t || !n || !isDisabled) return t;
  return { ...t, onPermissionRequest: async (u) => !isDisabled() && (await n(u)) && !isDisabled() };
}
/**
 * Claude in Chrome MCP 的工具调用入口：去 save_to_disk、排除检查，本地处理 switch_browser / list_connected_browsers / select_browser 与宿主工具，
 * 其余确保连接后经 socket 桥转发（navigate 前补 tabs_context），出错交给 chromeToolErrorResult。
 */
//@ chunk-w2264jxg.js:7604-8608 placement
var handleChromeToolCall = async (host, bridge, toolName, rawArgs, callOptions) => {
  let { args: args, wantsSave: wantsSave } = stripSaveToDiskArgs(toolName, rawArgs);
  if (host.isDisabled?.()) return h(`Unknown tool: ${toolName}`);
  let a = guardPermissionRequests(host, callOptions),
    i = excludedToolError(host, toolName, args);
  if (i !== void 0) return h(i);
  if (toolName === "switch_browser") return switchBrowser(host, bridge);
  if (toolName === "list_connected_browsers") return listConnectedBrowsers(host, bridge);
  if (toolName === "select_browser") return selectBrowser(host, bridge, args);
  let l = a?.sessionScope?.sessionId ?? "";
  if (host.handleHostTool && host.hostToolBypassesBrowser?.(toolName, args)) {
    let handleHostTool = await host.handleHostTool(toolName, args, hostToolContext(host, bridge, a, l));
    if (handleHostTool !== void 0) return handleHostTool;
  }
  let c = { args: args };
  try {
    let ensureConnected = await bridge.ensureConnected();
    if (
      (host.logger.silly(
        `[${host.serverName}] Server is connected: ${ensureConnected}. Received tool call: ${quoteTruncated(toolName)} with args: ${jsonForLog(args)}.`,
      ),
      ensureConnected)
    ) {
      if (host.isDisabled?.()) return h(`Unknown tool: ${toolName}`);
      let p = await browserSelectionPreflight(host, bridge);
      if (p) return p;
      if (host.isDisabled?.()) return h(`Unknown tool: ${toolName}`);
      if (host.handleHostTool) {
        let handleHostTool = await host.handleHostTool(toolName, args, hostToolContext(host, bridge, a, l));
        if (handleHostTool !== void 0) return handleHostTool;
      }
      if (((c = await frontLoadTabContext(host, bridge, toolName, args, a)), c.error))
        return appendTabContext(c, c.error);
      let g = await forwardToolCall(host, bridge, toolName, c.args, a);
      if (wantsSave) g = await saveScreenshotsToDisk(g, host);
      return appendTabContext(c, g);
    }
    return b(host);
  } catch (error) {
    return appendTabContext(c, chromeToolErrorResult(error, toolName, host));
  }
};
//@ chunk-w2264jxg.js:8608-8690 placement
function h(e, t) {
  return { content: [{ type: "text", text: e }], isError: !0, ...(t && { _meta: t }) };
}
/**
 * 把工具调用异常映射为给模型的错误结果：禁用、未连接扩展、路由未确认/超时、被取代、发送失败等，各给出不同指引。
 */
//@ chunk-w2264jxg.js:8690-10253 placement
function chromeToolErrorResult(error, toolName, host) {
  if ((host.logger.info(`[${host.serverName}] Error calling tool:`, error), error instanceof k))
    return h(`Unknown tool: ${toolName}`);
  if (error instanceof SocketConnectionError || error instanceof NoExtensionConnectedError) return b(host);
  if (error instanceof ToolCallTimeoutError && error.routingAckReceived === !1)
    return h(
      `The "${toolName}" call was never delivered to the Chrome extension: the computer running that browser appears to be offline or asleep, or Chrome is not running there. This is a connection problem, not a permission or site-access issue. Ask the user to make sure that computer is awake and Chrome is open with the Claude extension, then retry.`,
      { isBridgeTimeout: !0 },
    );
  if (error instanceof ToolCallTimeoutError)
    return h(toolTimeoutMessage(toolName, error), { isBridgeTimeout: !0 });
  if (error instanceof ToolCallSupersededError)
    return h(
      `The "${toolName}" tool call was displaced by a newer call on the same browser connection before its result arrived. ` +
        'The action may already have executed \u2014 check the page state (e.g. "get_page_text") before repeating it.',
    );
  if (error instanceof ExtensionDisconnectedMidCallError)
    return h(
      `The "${toolName}" tool call failed because the Chrome extension disconnected mid-operation. This is usually transient (Chrome service worker restart, tab closed, network blip) and the extension often reconnects automatically. Retry the same tool call in a few seconds. If it keeps failing, ask the user to switch to Chrome (which wakes the extension) or check that the extension is still logged in.`,
    );
  if (error instanceof RequestTooLargeError)
    return h(`The "${toolName}" tool call was not sent: ${error.message} Do not retry the identical call.`);
  return h(
    `The "${toolName}" tool call failed unexpectedly. This is usually transient \u2014 retry the same call in a few seconds.`,
  );
}
//@ chunk-w2264jxg.js:10253-11036 placement
function toolTimeoutMessage(e, t) {
  let n = `The "${e}" tool did not respond in time.`,
    r = 'a lighter operation (e.g., "get_page_text" instead of a screenshot)';
  if (t.routingAckReceived === void 0)
    return `${n} The page or Chrome may be unresponsive, or Chrome may be waiting for the user. Try a lighter operation (e.g., "get_page_text" instead of a screenshot), or ask the user to check Chrome.`;
  return `${n} If Chrome is on another computer, that computer may be closed or asleep. The page may also be loading or unresponsive, or Chrome may be waiting for the user. Try a lighter operation (e.g., "get_page_text" instead of a screenshot) once. If that also gets no response, ask the user to check that the computer running Chrome is awake, that Chrome is open, and that nothing in Chrome is waiting for them.`;
}
/**
 * 从 tabs_context_mcp 结果文本中解析出第一个 tabId、tabGroupId 和原始 JSON。
 */
//@ chunk-w2264jxg.js:11036-11462 placement
function parseTabsContextResult(e) {
  let t = e?.result?.content;
  if (!Array.isArray(t)) return {};
  for (let n of t) {
    if (typeof n !== "object" || n === null || n.type !== "text" || typeof n.text !== "string") continue;
    let text = n.text;
    try {
      let parsed = JSON.parse(text);
      if (!Array.isArray(parsed.availableTabs)) continue;
      let s = parsed.availableTabs.find((availableTab) => typeof availableTab?.tabId === "number")?.tabId,
        o = typeof parsed.tabGroupId === "number" ? parsed.tabGroupId : void 0;
      return { tabId: s, tabGroupId: o, json: text };
    } catch {}
  }
  return {};
}
//@ chunk-w2264jxg.js:11462-11488 placement
var F = Symbol("timed-out");
//@ chunk-w2264jxg.js:11488-11636 placement
async function raceTimeoutSentinel(e, t) {
  let n;
  try {
    return await Promise.race([
      e,
      new Promise((r) => {
        n = setTimeout(() => r(F), t);
      }),
    ]);
  } finally {
    if (n !== void 0) clearTimeout(n);
  }
}
//@ chunk-w2264jxg.js:11636-11661 placement
var weakMap_2 = new WeakMap(),
  O = 8000;
/**
 * navigate 未带 tabId 时，按会话先隐式调用 tabs_context_mcp（同会话复用进行中的请求、带超时）取得标签页，再补到参数里；back/forward 必须显式给 tabId。
 */
//@ chunk-w2264jxg.js:11661-12885 placement
async function frontLoadTabContext(host, bridge, toolName, args, callOptions) {
  if (toolName !== "navigate" || (args.tabId !== null && args.tabId !== void 0)) return { args: args };
  let s = typeof args.url === "string" ? args.url.trim().toLowerCase() : "";
  if (s === "back" || s === "forward")
    return {
      args: args,
      error: h('tabId is required for url:"back"/"forward". Call tabs_context_mcp first to get a tab ID.'),
    };
  let o = callOptions?.sessionScope?.sessionId;
  if (!s || !o) return { args: args };
  let a = weakMap_2.get(bridge);
  if (!a) ((a = new Map()), weakMap_2.set(bridge, a));
  let i = a.get(o);
  if (!i)
    ((i = callBridgeTool(
      host,
      bridge,
      "tabs_context_mcp",
      { createIfEmpty: !0 },
      { ...callOptions, permissionMode: "ask" },
    ).finally(() => {
      if (a.get(o) === i) a.delete(o);
    })),
      a.set(o, i));
  let l = await raceTimeoutSentinel(i, O);
  if (l === F)
    return {
      args: args,
      error: h(
        `The hidden tabs_context_mcp lookup did not respond within ${O / 1000}s. The Chrome extension may be slow to start, or the computer running that browser may be offline or asleep. Retry navigate, or call tabs_context_mcp explicitly to get a tabId first.`,
        { isFrontLoadBoundExceeded: !0 },
      ),
    };
  let c = l?.error;
  if (c) {
    let d = Array.isArray(c.content)
      ? c.content
      : [{ type: "text", text: "tabs_context_mcp returned an error." }];
    if (j(d)) host.onAuthenticationError();
    return { args: args, error: { content: d, isError: !0 } };
  }
  let { tabId: tabId, tabGroupId: tabGroupId, json: json } = parseTabsContextResult(l);
  if (tabId === void 0) return { args: args, tabGroupId: tabGroupId };
  return { args: { ...args, tabId: tabId }, tabContextJson: json, tabGroupId: tabGroupId };
}
/**
 * 给 Chrome 工具结果附上预载的标签页上下文（并提醒任务结束前关闭本组标签页），以及在 _meta 中记录预载标签组 id。
 */
//@ chunk-w2264jxg.js:12885-13397 placement
function appendTabContext(state, result) {
  let augmented = result;
  if (state.tabContextJson && !augmented.isError)
    augmented = {
      ...augmented,
      content: [
        ...(Array.isArray(augmented.content) ? augmented.content : []),
        {
          type: "text",
          text: `
Tab context (from front-loaded tabs_context_mcp):
${state.tabContextJson}
Tabs in this group were opened for this task and are yours to clean up: close each with tabs_close_mcp once you no longer need it and before finishing, unless the user asked to see it or wants it kept open.`,
        },
      ],
    };
  if (state.tabGroupId !== void 0)
    augmented = { ...augmented, _meta: { ...augmented._meta, frontLoadedTabGroupId: state.tabGroupId } };
  return augmented;
}
/**
 * 经 socket 桥调用扩展工具并把结果规范成 MCP 内容：处理错误内容、认证失效回调、图片/文本内容与 notices 元数据。
 */
//@ chunk-w2264jxg.js:13397-14705 placement
async function forwardToolCall(host, bridge, toolName, args, callOptions) {
  let s = await callBridgeTool(host, bridge, toolName, args, callOptions);
  if (
    (host.logger.silly(`[${host.serverName}] Received result from socket bridge: ${jsonForLog(s)}`),
    s === null || s === void 0)
  )
    return { content: [{ type: "text", text: "Tool execution completed" }] };
  let { result: o, error: error, notices: notices } = s,
    l = Array.isArray(notices) && notices.length > 0 ? { notices: notices } : void 0,
    c = error || o,
    f = !!error;
  if (!c) return { content: [{ type: "text", text: "Tool execution completed" }], ...(l && { _meta: l }) };
  if (f && j(c.content)) host.onAuthenticationError();
  let { content: content } = c;
  if (content && Array.isArray(content)) {
    if (f)
      return {
        content: content.map((d) => {
          if (typeof d === "object" && d !== null && "type" in d) return d;
          return { type: "text", text: String(d) };
        }),
        isError: !0,
        ...(l && { _meta: l }),
      };
    return {
      content: content.map((d) => {
        if (typeof d === "object" && d !== null && "type" in d && "source" in d) {
          let m = d;
          if (m.type === "image" && typeof m.source === "object" && m.source !== null && "data" in m.source)
            return {
              type: "image",
              data: m.source.data,
              mimeType: "media_type" in m.source ? m.source.media_type || "image/png" : "image/png",
            };
        }
        if (typeof d === "object" && d !== null && "type" in d) return d;
        return { type: "text", text: String(d) };
      }),
      isError: f,
      ...(l && { _meta: l }),
    };
  }
  if (typeof content === "string")
    return { content: [{ type: "text", text: content }], isError: f, ...(l && { _meta: l }) };
  return (
    host.logger.warn(`[${host.serverName}] Unexpected result format from socket bridge`, s),
    { content: [{ type: "text", text: JSON.stringify(s) }], isError: f, ...(l && { _meta: l }) }
  );
}
//@ chunk-w2264jxg.js:14705-14783 placement
function b(e) {
  return { content: [{ type: "text", text: e.onToolCallDisconnected() }] };
}
//@ chunk-w2264jxg.js:14783-15520 placement
async function switchBrowser(e, t) {
  if (!e.bridgeConfig)
    return {
      content: [{ type: "text", text: "Browser switching is only available with bridge connections." }],
      isError: !0,
    };
  if (!(await t.ensureConnected())) return b(e);
  if (e.isDisabled?.()) return h("Unknown tool: switch_browser");
  let r = (await t.switchBrowser?.()) ?? null;
  if (r === "no_other_browsers")
    return {
      content: [
        {
          type: "text",
          text: "No other browsers available to switch to. Open Chrome with the Claude extension in another browser to switch.",
        },
      ],
      isError: !1,
    };
  if (r)
    return (
      weakMap.set(t, !0),
      { content: [{ type: "text", text: `Selected browser "${sanitizeBrowserLabel(r, 0)}".` }] }
    );
  return {
    content: [
      {
        type: "text",
        text: "No browser responded within the timeout. Make sure Chrome is open with the Claude extension installed, then try again.",
      },
    ],
    isError: !0,
  };
}
//@ chunk-w2264jxg.js:15520-16223 placement
async function listConnectedBrowsers(e, t) {
  if (!e.bridgeConfig || !t.listConnectedExtensions)
    return {
      content: [{ type: "text", text: "Listing browsers is only available with bridge connections." }],
      isError: !0,
    };
  if (!(await t.ensureConnected())) return b(e);
  if (e.isDisabled?.()) return h("Unknown tool: list_connected_browsers");
  let listConnectedExtensions = await t.listConnectedExtensions(),
    u = pickBrowserDevice(
      listConnectedExtensions,
      t.getSelectedDeviceId?.(),
      listConnectedExtensions.length > 1 ? await safeCallPromise(e.getLocalDeviceIds) : void 0,
    ),
    s = u.kind === "select" ? u.extension.deviceId : void 0,
    mapped = listConnectedExtensions.map((i, l) => ({
      ...i,
      name: browserDisplayName(i, l),
      osPlatform: i.osPlatform === void 0 ? void 0 : OS_DISPLAY_NAMES.get(i.osPlatform),
      ...(i.deviceId === s && { inUse: !0 }),
    })),
    a = [{ type: "text", text: JSON.stringify(mapped) }];
  if (listConnectedExtensions.length > 1)
    a.push({ type: "text", text: describeBrowserSelection(e, t, mapped, u) });
  return { content: a };
}
/**
 * 描述多浏览器连接时的选择情况：已选定（本机唯一、本会话正在用或上次选的）时说明无需询问；需询问时提示先列出本机浏览器，再按预检说明让用户选择。
 */
//@ chunk-w2264jxg.js:16223-17098 placement
function describeBrowserSelection(options, selector, browsers, decision) {
  if (decision.kind === "select") {
    let selectionClause = "is the one on this computer and will be used";
    if (decision.reason === "persisted")
      selectionClause = selector.hasActiveSelection?.()
        ? "is the one in use for this session"
        : "is the one picked last and will be used";
    let index = browsers.findIndex((o) => o.deviceId === decision.extension.deviceId);
    return `${browsers.length} browsers are connected; "${sanitizeBrowserLabel(decision.extension, index)}" (deviceId ${decision.extension.deviceId}) ${selectionClause}. No question is needed unless the user wants a different browser (then select_browser with its deviceId, or switch_browser).`;
  }
  if (decision.kind === "ask" && decision.localCount > 0)
    return `${browsers.length} browsers are connected, ${decision.localCount} of them on this computer (onThisComputer: true), and none is selected for this session. ${browserPreflightInstruction(options.askUserToolName)} List the browsers on this computer first.`;
  return `${browsers.length} browsers are connected and none is selected for this session. ${browserPreflightInstruction(options.askUserToolName)}`;
}
//@ chunk-w2264jxg.js:17098-17836 placement
async function selectBrowser(e, t, n) {
  let r = typeof n.deviceId === "string" ? n.deviceId : "";
  if (!e.bridgeConfig || !t.selectExtensionById || !t.listConnectedExtensions || !r)
    return {
      content: [
        { type: "text", text: "select_browser requires a bridge connection and a deviceId argument." },
      ],
      isError: !0,
    };
  if (!(await t.ensureConnected())) return b(e);
  let listConnectedExtensions = await t.listConnectedExtensions(),
    found = listConnectedExtensions.find((i) => i.deviceId === r);
  if (!found)
    return {
      content: [
        {
          type: "text",
          text: `No connected browser has deviceId "${r}". Call list_connected_browsers to see currently connected browsers.`,
        },
      ],
      isError: !0,
    };
  if (e.isDisabled?.()) return h("Unknown tool: select_browser");
  let index = listConnectedExtensions.indexOf(found);
  return (
    t.selectExtensionById(r, browserDisplayName(found, index)),
    weakMap.set(t, !0),
    { content: [{ type: "text", text: `Selected browser "${sanitizeBrowserLabel(found, index)}".` }] }
  );
}
//@ chunk-w2264jxg.js:17836-18045 placement
function contentText(e) {
  if (!Array.isArray(e)) return String(e);
  return e
    .map((t) => {
      if (typeof t === "string") return t;
      if (typeof t === "object" && t !== null && "text" in t && typeof t.text === "string") return t.text;
      return "";
    })
    .join(" ");
}
//@ chunk-w2264jxg.js:18045-18114 placement
function j(e) {
  return contentText(e).toLowerCase().includes("re-authenticated");
}

export { W$r, handleChromeToolCall, parseTabsContextResult };

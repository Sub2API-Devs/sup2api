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
};
var SCREENSHOT_SAVED_PREFIX = "Screenshot saved to: ";
var screenshotCounter = 0;
var cachedScreenshotDir;
//@ chunk-w2264jxg.js:541-637 placement
/**
 * 确定截图保存目录：宿主提供时用它（0700），否则用缓存的私有临时目录。
 */
function screenshotSaveDir() {
  cachedScreenshotDir ??= mkdtemp(join(tmpdir(), "claude-chrome-screenshots-")).catch((error) => {
    cachedScreenshotDir = undefined;
    throw error;
  });
  return cachedScreenshotDir;
}
//@ chunk-w2264jxg.js:637-936 placement
/**
 * 确定截图保存目录：宿主提供 getScreenshotSaveDir 时用它（建目录 0700）；否则用缓存的私有临时目录，属主或权限不对时重新创建。
 */
async function resolveScreenshotSaveDir(host) {
  if (host.getScreenshotSaveDir) {
    let screenshotSaveDir = host.getScreenshotSaveDir();
    if (screenshotSaveDir === undefined) return;
    await mkdir(screenshotSaveDir, {
      recursive: true,
      mode: 448,
    });
    return screenshotSaveDir;
  }
  let dir = await screenshotSaveDir();
  try {
    let stats = await lstat(dir);
    let getuid = process.getuid;
    if (
      stats.isDirectory() &&
      (getuid === undefined || (stats.uid === getuid() && (stats.mode & 511) === 448))
    )
      return dir;
  } catch {}
  cachedScreenshotDir = undefined;
  return screenshotSaveDir();
}
//@ chunk-w2264jxg.js:936-2348 placement
async function saveScreenshotsToDisk(result, host) {
  if (result.isError || !result.content.some((block) => block.type === "image")) return result;
  let saveDir;
  try {
    saveDir = await resolveScreenshotSaveDir(host);
  } catch (error) {
    host.logger.warn(
      `[${host.serverName}] save_to_disk: could not prepare screenshot directory: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      ...result,
      content: [
        ...result.content,
        {
          type: "text",
          text:
            "Note: save_to_disk failed \u2014 the screenshot directory could not " +
            "be created. The image is included inline above.",
        },
      ],
    };
  }
  if (saveDir === undefined)
    return {
      ...result,
      content: [
        ...result.content,
        {
          type: "text",
          text:
            "Note: save_to_disk had no effect \u2014 screenshots are not " +
            "persisted to disk in this session. The image is included inline above; refer to it directly. Do not retry with save_to_disk.",
        },
      ],
    };
  let content = [];
  let savedAny = false;
  let failedAny = false;
  for (let block of result.content) {
    content.push(block);
    if (block.type !== "image") continue;
    let ext = Object.hasOwn(SCREENSHOT_EXT_BY_MIME, block.mimeType)
      ? SCREENSHOT_EXT_BY_MIME[block.mimeType]
      : "png";
    let filePath = join(saveDir, `screenshot-${Date.now()}-${screenshotCounter++}.${ext}`);
    try {
      await writeFile(filePath, Buffer.from(block.data, "base64"), {
        flag: "wx",
        mode: 384,
      });
      savedAny = true;
      content.push({
        type: "text",
        text: `${SCREENSHOT_SAVED_PREFIX}${filePath}`,
      });
    } catch (error) {
      failedAny = true;
      host.logger.warn(
        `[${host.serverName}] save_to_disk: failed to write screenshot: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (savedAny)
    content.push({
      type: "text",
      text: "Include the saved path(s) in your response so they can be attached for the user.",
    });
  if (failedAny)
    content.push({
      type: "text",
      text:
        "Note: save_to_disk failed for at least one screenshot \u2014 it could " +
        "not be written to disk. The image is included inline above.",
    });
  return {
    ...result,
    content,
  };
}
//@ chunk-w2264jxg.js:2348-2366 placement
var weakMap = new WeakMap();
//@ chunk-w2264jxg.js:2366-2415 placement
/**
 * 清除浏览器选择记录并收起选择界面。
 */
function releaseBrowserSelection(socketClient) {
  weakMap.delete(socketClient);
  socketClient.clearSelection?.();
}
//@ chunk-w2264jxg.js:2415-2665 placement
/**
 * 生成给模型看的浏览器名称：去控制/格式字符、统一引号、折叠空白，把 "this computer" 替换为 [?]，为空时用 "Browser N"。
 */
function sanitizeBrowserLabel(extension, index) {
  return (
    browserDisplayName(extension, index)
      .replace(/[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, " ")
      .replace(/[\p{Quotation_Mark}\u02BA\u02DD\u02EE\u05F4\u2033\u3003]+/gu, "'")
      .replace(/\s+/g, " ")
      .replace(/this\s*computer/giu, "[?]")
      .trim() || `Browser ${index + 1}`
  );
}
//@ chunk-w2264jxg.js:2665-2820 placement
function browserDisplayName(extension, index) {
  let trimmed = (extension.name ?? "").replace(/[\r\n\t\u0000-\u001f]/g, " ").trim();
  if (!trimmed) return `Browser ${index + 1}`;
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
/**
 * 把 OS 平台代码转成展示名（未知返回 unknown OS）。
 */
function osDisplayName(osPlatform) {
  return (osPlatform !== undefined && OS_DISPLAY_NAMES.get(osPlatform)) || "unknown OS";
}
//@ chunk-w2264jxg.js:3160-4418 placement
/**
 * 工具调用前检查是否需要先让用户选浏览器：连接了多个扩展且未选定时，返回列出本机与其他设备浏览器（最多 8 个）的提示；已选或不需询问时返回 null 并记入 WeakMap。
 */
async function browserSelectionPreflight(host, bridge) {
  if (!bridge.listConnectedExtensions) {
    weakMap.set(bridge, true);
    return null;
  }
  if (weakMap.get(bridge) && bridge.hasActiveSelection?.()) return null;
  weakMap.delete(bridge);
  let extensions = await bridge.listConnectedExtensions();
  if (extensions.length === 0) return null;
  let localDeviceIds = extensions.length > 1 ? await safeCallPromise(host.getLocalDeviceIds) : undefined;
  let pick = pickBrowserDevice(extensions, bridge.getSelectedDeviceId?.(), localDeviceIds);
  if (pick.kind !== "ask") {
    weakMap.set(bridge, true);
    return null;
  }
  let { candidates, localCount } = pick;
  let sliced = candidates.slice(0, 8);
  let formatChoice = (extension, index) =>
    `${index + 1}. "${sanitizeBrowserLabel(extension, index)}" (${osDisplayName(extension.osPlatform)})${localDeviceIds?.get(extension.deviceId) === "remembered" ? " \u2014 seen recently, not answering right now" : ""} \u2014 deviceId: ${extension.deviceId}`;
  let mapped = sliced.slice(0, localCount).map(formatChoice);
  let mapped_2 = sliced
    .slice(localCount)
    .map((extension, index) => formatChoice(extension, index + mapped.length));
  let localChoices =
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
`)}`;
  let remoteChoices =
    candidates.length > sliced.length
      ? `
\u2026and ${candidates.length - sliced.length} more not shown`
      : "";
  return {
    content: [
      {
        type: "text",
        text: `${localCount > 0 ? `${candidates.length} Chrome browsers are connected to this account, ${localCount} of them on this computer, and none has been selected for this session. ` : "Multiple Chrome browsers are connected to this account and none has been selected for this session. "}${browserPreflightInstruction(host.askUserToolName)}${localCount > 0 ? " List the browsers on this computer first, in the order below." : ""}

${localChoices}${remoteChoices}`,
      },
    ],
    isError: true,
  };
}
//@ chunk-w2264jxg.js:4418-4529 placement
function jsonForLog(value) {
  return JSON.stringify(value, (key, value) =>
    typeof value === "string" && value.length > 256 ? `<${value.length} chars elided>` : value,
  );
}
//@ chunk-w2264jxg.js:4529-4552 placement
/**
 * 工具被禁用时抛出的错误类型。
 */
class ChromeToolDisabledError extends Error {}
//@ chunk-w2264jxg.js:4552-4675 placement
function callBridgeTool(host, bridge, toolName, args, options) {
  if (host.isDisabled?.())
    return Promise.reject(new ChromeToolDisabledError(`disabled: ${toolName} not sent`));
  return bridge.callTool(toolName, args, options);
}
//@ chunk-w2264jxg.js:4675-5485 placement
async function fetchActiveTab(host, bridge, options) {
  if (host.isDisabled?.()) return;
  try {
    if (!(await bridge.ensureConnected())) return;
    let content = (
      await callBridgeTool(
        host,
        bridge,
        "tabs_context_mcp",
        {},
        options
          ? {
              ...options,
              permissionMode: "ask",
            }
          : undefined,
      )
    )?.result?.content;
    if (!Array.isArray(content)) return;
    let context;
    for (let block of content) {
      if (
        typeof block !== "object" ||
        block === null ||
        block.type !== "text" ||
        typeof block.text !== "string"
      )
        continue;
      try {
        let parsed = JSON.parse(block.text);
        if (Array.isArray(parsed.availableTabs)) {
          context = {
            ...parsed,
            availableTabs: parsed.availableTabs,
          };
          break;
        }
      } catch {}
    }
    if (!context) return;
    let filtered = context.availableTabs.filter(
      (availableTab) =>
        typeof availableTab === "object" &&
        availableTab !== null &&
        typeof availableTab.tabId === "number" &&
        typeof availableTab.url === "string",
    );
    let tabs =
      typeof context.selectedTabId === "number"
        ? filtered.find((tab) => tab.tabId === context.selectedTabId)
        : filtered.length === 1
          ? filtered[0]
          : undefined;
    return tabs
      ? {
          tabId: tabs.tabId,
          origin: new URL(tabs.url).origin,
        }
      : undefined;
  } catch (error) {
    host.logger.debug(`[${host.serverName}] fetchActiveTab failed`, error);
    return;
  }
}
//@ chunk-w2264jxg.js:5485-5614 placement
function errorContentOf(result) {
  if (typeof result !== "object" || result === null) return "";
  let content = result.error?.content;
  return typeof content === "string" || Array.isArray(content) ? content : "";
}
//@ chunk-w2264jxg.js:5614-6397 placement
/**
 * 通过扩展的 computer 工具向指定标签页输入文字（跳过权限检查），可带 expected_origin；返回 {ok} 或失败原因（disabled/disconnected/origin_mismatch/tool_error/transport）。
 */
async function typeIntoTabViaBridge(host, bridge, callOptions, tabId, text, expectedOrigin) {
  if (host.isDisabled?.())
    return {
      ok: false,
      reason: "disabled",
    };
  try {
    if (!(await bridge.ensureConnected()))
      return {
        ok: false,
        reason: "disconnected",
      };
    let response = await callBridgeTool(
      host,
      bridge,
      "computer",
      {
        action: "type",
        text,
        tabId,
        ...(expectedOrigin !== undefined
          ? {
              expected_origin: expectedOrigin,
            }
          : {}),
      },
      {
        ...callOptions,
        permissionMode: "skip_all_permission_checks",
        onPermissionRequest: undefined,
      },
    );
    let body =
      typeof response === "object" && response !== null && !("error" in response)
        ? response.result
        : undefined;
    let isError =
      typeof body === "object" && body !== null && (body.isError === true || body.is_error === true);
    if (body !== undefined && body !== null && body !== false && !isError)
      return {
        ok: true,
      };
    let errorContent = isError ? (body.content ?? "") : "";
    if ((contentText(errorContentOf(response)) || contentText(errorContent)).startsWith("Origin mismatch"))
      return {
        ok: false,
        reason: "origin_mismatch",
      };
    return {
      ok: false,
      reason: "tool_error",
    };
  } catch (error) {
    host.logger.debug(`[${host.serverName}] typeIntoTab failed`, error);
    return {
      ok: false,
      reason: error instanceof ChromeToolDisabledError ? "disabled" : "transport",
    };
  }
}
//@ chunk-w2264jxg.js:6397-6552 placement
function hostToolContext(host, bridge, callOptions, sessionId) {
  return {
    sessionId,
    getActiveTabOrigin: async () => (await fetchActiveTab(host, bridge, callOptions))?.origin,
    getActiveTab: () => fetchActiveTab(host, bridge, callOptions),
    typeIntoTab: (tabId, text, expectedOrigin) =>
      typeIntoTabViaBridge(host, bridge, callOptions, tabId, text, expectedOrigin),
  };
}
//@ chunk-w2264jxg.js:6552-7042 placement
/**
 * 从参数（含 browser_batch 内每个动作）中去掉 save_to_disk，并返回是否需要把截图落盘。
 */
function stripSaveToDiskArgs(toolName, rawArgs) {
  if (toolName === "browser_batch" && Array.isArray(rawArgs.actions)) {
    let { save_to_disk: saveToDisk, ...restArgs } = rawArgs;
    let wantsSave = saveToDisk === true;
    let actions = rawArgs.actions.map((action) => {
      if (typeof action !== "object" || action === null) return action;
      let action_2 = action;
      if (typeof action_2.input !== "object" || action_2.input === null) return action;
      let { save_to_disk: saveToDisk, ...restInput } = action_2.input;
      if (saveToDisk === true && action_2.name === "computer") wantsSave = true;
      return {
        ...action_2,
        input: restInput,
      };
    });
    return {
      args: {
        ...restArgs,
        actions,
      },
      wantsSave,
    };
  }
  if (!("save_to_disk" in rawArgs))
    return {
      args: rawArgs,
      wantsSave: false,
    };
  let { save_to_disk: saveToDisk, ...restArgs } = rawArgs;
  return {
    args: restArgs,
    wantsSave: toolName === "computer" && saveToDisk === true,
  };
}
//@ chunk-w2264jxg.js:7042-7455 placement
/**
 * 被宿主排除的工具（含 browser_batch 内的动作）返回 "Unknown tool" 错误；batch 内动作缺名或嵌套 batch 也报错。
 */
function excludedToolError(host, toolName, args) {
  let excludedTools = host.excludedTools;
  if (!excludedTools) return;
  if (excludedTools.has(toolName)) return `Unknown tool: ${toolName}`;
  if (toolName !== "browser_batch") return;
  if (!Array.isArray(args.actions)) return "browser_batch: actions must be an array";
  for (let action of args.actions) {
    let actionName = action?.name;
    if (typeof actionName !== "string" || actionName === "browser_batch")
      return "browser_batch: every action needs a string tool name (and batches don't nest)";
    if (excludedTools.has(actionName)) return `Unknown tool: ${actionName}`;
  }
  return;
}
//@ chunk-w2264jxg.js:7455-7604 placement
function guardPermissionRequests(host, callOptions) {
  let onPermissionRequest = callOptions?.onPermissionRequest;
  let isDisabled = host.isDisabled;
  if (!callOptions || !onPermissionRequest || !isDisabled) return callOptions;
  return {
    ...callOptions,
    onPermissionRequest: async (request) =>
      !isDisabled() && (await onPermissionRequest(request)) && !isDisabled(),
  };
}
//@ chunk-w2264jxg.js:7604-8608 placement
/**
 * Claude in Chrome MCP 的工具调用入口：去 save_to_disk、排除检查，本地处理 switch_browser / list_connected_browsers / select_browser 与宿主工具，
 * 其余确保连接后经 socket 桥转发（navigate 前补 tabs_context），出错交给 chromeToolErrorResult。
 */
var handleChromeToolCall = async (host, bridge, toolName, rawArgs, callOptions) => {
  let { args, wantsSave } = stripSaveToDiskArgs(toolName, rawArgs);
  if (host.isDisabled?.()) return chromeToolErrorResult(`Unknown tool: ${toolName}`);
  let callOptions_2 = guardPermissionRequests(host, callOptions);
  let text = excludedToolError(host, toolName, args);
  if (text !== undefined) return chromeToolErrorResult(text);
  if (toolName === "switch_browser") return switchBrowser(host, bridge);
  if (toolName === "list_connected_browsers") return listConnectedBrowsers(host, bridge);
  if (toolName === "select_browser") return selectBrowser(host, bridge, args);
  let sessionId = callOptions_2?.sessionScope?.sessionId ?? "";
  if (host.handleHostTool && host.hostToolBypassesBrowser?.(toolName, args)) {
    let hostResult = await host.handleHostTool(
      toolName,
      args,
      hostToolContext(host, bridge, callOptions_2, sessionId),
    );
    if (hostResult !== undefined) return hostResult;
  }
  let state = {
    args,
  };
  try {
    let connected = await bridge.ensureConnected();
    host.logger.silly(
      `[${host.serverName}] Server is connected: ${connected}. Received tool call: ${quoteTruncated(toolName)} with args: ${jsonForLog(args)}.`,
    );
    if (connected) {
      if (host.isDisabled?.()) return chromeToolErrorResult(`Unknown tool: ${toolName}`);
      let preflight = await browserSelectionPreflight(host, bridge);
      if (preflight) return preflight;
      if (host.isDisabled?.()) return chromeToolErrorResult(`Unknown tool: ${toolName}`);
      if (host.handleHostTool) {
        let hostResult = await host.handleHostTool(
          toolName,
          args,
          hostToolContext(host, bridge, callOptions_2, sessionId),
        );
        if (hostResult !== undefined) return hostResult;
      }
      state = await frontLoadTabContext(host, bridge, toolName, args, callOptions_2);
      if (state.error) return appendTabContext(state, state.error);
      let result = await forwardToolCall(host, bridge, toolName, state.args, callOptions_2);
      if (wantsSave) result = await saveScreenshotsToDisk(result, host);
      return appendTabContext(state, result);
    }
    return disconnectedResult(host);
  } catch (error) {
    return appendTabContext(state, chromeToolErrorResult_2(error, toolName, host));
  }
};
//@ chunk-w2264jxg.js:8608-8690 placement
/**
 * 构造给模型的 Chrome 工具错误结果（文本 + isError）。
 */
function chromeToolErrorResult(text, meta) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
    isError: true,
    ...(meta && {
      _meta: meta,
    }),
  };
}
//@ chunk-w2264jxg.js:8690-10253 placement
/**
 * 把工具调用异常映射为给模型的错误结果：禁用、未连接扩展、路由未确认/超时、被取代、发送失败等，各给出不同指引。
 */
function chromeToolErrorResult_2(error, toolName, host) {
  host.logger.info(`[${host.serverName}] Error calling tool:`, error);
  if (error instanceof ChromeToolDisabledError) return chromeToolErrorResult(`Unknown tool: ${toolName}`);
  if (error instanceof SocketConnectionError || error instanceof NoExtensionConnectedError)
    return disconnectedResult(host);
  if (error instanceof ToolCallTimeoutError && error.routingAckReceived === false)
    return chromeToolErrorResult(
      `The "${toolName}" call was never delivered to the Chrome extension: the computer running that browser appears to be offline or asleep, or Chrome is not running there. This is a connection problem, not a permission or site-access issue. Ask the user to make sure that computer is awake and Chrome is open with the Claude extension, then retry.`,
      {
        isBridgeTimeout: true,
      },
    );
  if (error instanceof ToolCallTimeoutError)
    return chromeToolErrorResult(toolTimeoutMessage(toolName, error), {
      isBridgeTimeout: true,
    });
  if (error instanceof ToolCallSupersededError)
    return chromeToolErrorResult(
      `The "${toolName}" tool call was displaced by a newer call on the same browser connection before its result arrived. ` +
        'The action may already have executed \u2014 check the page state (e.g. "get_page_text") before repeating it.',
    );
  if (error instanceof ExtensionDisconnectedMidCallError)
    return chromeToolErrorResult(
      `The "${toolName}" tool call failed because the Chrome extension disconnected mid-operation. This is usually transient (Chrome service worker restart, tab closed, network blip) and the extension often reconnects automatically. Retry the same tool call in a few seconds. If it keeps failing, ask the user to switch to Chrome (which wakes the extension) or check that the extension is still logged in.`,
    );
  if (error instanceof RequestTooLargeError)
    return chromeToolErrorResult(
      `The "${toolName}" tool call was not sent: ${error.message} Do not retry the identical call.`,
    );
  return chromeToolErrorResult(
    `The "${toolName}" tool call failed unexpectedly. This is usually transient \u2014 retry the same call in a few seconds.`,
  );
}
//@ chunk-w2264jxg.js:10253-11036 placement
function toolTimeoutMessage(toolName, error) {
  let headline = `The "${toolName}" tool did not respond in time.`;
  let lighterHint = 'a lighter operation (e.g., "get_page_text" instead of a screenshot)';
  if (error.routingAckReceived === undefined)
    return `${headline} The page or Chrome may be unresponsive, or Chrome may be waiting for the user. Try a lighter operation (e.g., "get_page_text" instead of a screenshot), or ask the user to check Chrome.`;
  return `${headline} If Chrome is on another computer, that computer may be closed or asleep. The page may also be loading or unresponsive, or Chrome may be waiting for the user. Try a lighter operation (e.g., "get_page_text" instead of a screenshot) once. If that also gets no response, ask the user to check that the computer running Chrome is awake, that Chrome is open, and that nothing in Chrome is waiting for them.`;
}
//@ chunk-w2264jxg.js:11036-11462 placement
/**
 * 从 tabs_context_mcp 结果文本中解析出第一个 tabId、tabGroupId 和原始 JSON。
 */
function parseTabsContextResult(response) {
  let content = response?.result?.content;
  if (!Array.isArray(content)) return {};
  for (let block of content) {
    if (
      typeof block !== "object" ||
      block === null ||
      block.type !== "text" ||
      typeof block.text !== "string"
    )
      continue;
    let text = block.text;
    try {
      let parsed = JSON.parse(text);
      if (!Array.isArray(parsed.availableTabs)) continue;
      let tabId = parsed.availableTabs.find((availableTab) => typeof availableTab?.tabId === "number")?.tabId;
      let tabGroupId = typeof parsed.tabGroupId === "number" ? parsed.tabGroupId : undefined;
      return {
        tabId,
        tabGroupId,
        json: text,
      };
    } catch {}
  }
  return {};
}
//@ chunk-w2264jxg.js:11462-11488 placement
/**
 * 表示“超时”的特殊标记值。
 */
var TIMED_OUT_SENTINEL = Symbol("timed-out");
//@ chunk-w2264jxg.js:11488-11636 placement
async function raceTimeoutSentinel(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT_SENTINEL), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
//@ chunk-w2264jxg.js:11636-11661 placement
/**
 * 隐式取标签页的超时（8 秒）。
 */
var weakMap_2 = new WeakMap();
var MAX_IMPLICIT_TABS_TIMEOUT_MS = 8000;
//@ chunk-w2264jxg.js:11661-12885 placement
/**
 * navigate 未带 tabId 时，按会话先隐式调用 tabs_context_mcp（同会话复用进行中的请求、带超时）取得标签页，再补到参数里；back/forward 必须显式给 tabId。
 */
async function frontLoadTabContext(host, bridge, toolName, args, callOptions) {
  if (toolName !== "navigate" || (args.tabId !== null && args.tabId !== undefined))
    return {
      args,
    };
  let url = typeof args.url === "string" ? args.url.trim().toLowerCase() : "";
  if (url === "back" || url === "forward")
    return {
      args,
      error: chromeToolErrorResult(
        'tabId is required for url:"back"/"forward". Call tabs_context_mcp first to get a tab ID.',
      ),
    };
  let sessionId = callOptions?.sessionScope?.sessionId;
  if (!url || !sessionId)
    return {
      args,
    };
  let perBridge = weakMap_2.get(bridge);
  if (!perBridge) {
    perBridge = new Map();
    weakMap_2.set(bridge, perBridge);
  }
  let pending = perBridge.get(sessionId);
  if (!pending) {
    pending = callBridgeTool(
      host,
      bridge,
      "tabs_context_mcp",
      {
        createIfEmpty: true,
      },
      {
        ...callOptions,
        permissionMode: "ask",
      },
    ).finally(() => {
      if (perBridge.get(sessionId) === pending) perBridge.delete(sessionId);
    });
    perBridge.set(sessionId, pending);
  }
  let response = await raceTimeoutSentinel(pending, MAX_IMPLICIT_TABS_TIMEOUT_MS);
  if (response === TIMED_OUT_SENTINEL)
    return {
      args,
      error: chromeToolErrorResult(
        `The hidden tabs_context_mcp lookup did not respond within ${MAX_IMPLICIT_TABS_TIMEOUT_MS / 1000}s. The Chrome extension may be slow to start, or the computer running that browser may be offline or asleep. Retry navigate, or call tabs_context_mcp explicitly to get a tabId first.`,
        {
          isFrontLoadBoundExceeded: true,
        },
      ),
    };
  let error = response?.error;
  if (error) {
    let errorContent = Array.isArray(error.content)
      ? error.content
      : [
          {
            type: "text",
            text: "tabs_context_mcp returned an error.",
          },
        ];
    if (isReauthenticatedText(errorContent)) host.onAuthenticationError();
    return {
      args,
      error: {
        content: errorContent,
        isError: true,
      },
    };
  }
  let { tabId, tabGroupId, json } = parseTabsContextResult(response);
  if (tabId === undefined)
    return {
      args,
      tabGroupId,
    };
  return {
    args: {
      ...args,
      tabId,
    },
    tabContextJson: json,
    tabGroupId,
  };
}
//@ chunk-w2264jxg.js:12885-13397 placement
/**
 * 给 Chrome 工具结果附上预载的标签页上下文（并提醒任务结束前关闭本组标签页），以及在 _meta 中记录预载标签组 id。
 */
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
  if (state.tabGroupId !== undefined)
    augmented = {
      ...augmented,
      _meta: {
        ...augmented._meta,
        frontLoadedTabGroupId: state.tabGroupId,
      },
    };
  return augmented;
}
//@ chunk-w2264jxg.js:13397-14705 placement
/**
 * 经 socket 桥调用扩展工具并把结果规范成 MCP 内容：处理错误内容、认证失效回调、图片/文本内容与 notices 元数据。
 */
async function forwardToolCall(host, bridge, toolName, args, callOptions) {
  let response = await callBridgeTool(host, bridge, toolName, args, callOptions);
  host.logger.silly(`[${host.serverName}] Received result from socket bridge: ${jsonForLog(response)}`);
  if (response === null || response === undefined)
    return {
      content: [
        {
          type: "text",
          text: "Tool execution completed",
        },
      ],
    };
  let { result, error, notices } = response;
  let meta =
    Array.isArray(notices) && notices.length > 0
      ? {
          notices,
        }
      : undefined;
  let body = error || result;
  let isError = !!error;
  if (!body)
    return {
      content: [
        {
          type: "text",
          text: "Tool execution completed",
        },
      ],
      ...(meta && {
        _meta: meta,
      }),
    };
  if (isError && isReauthenticatedText(body.content)) host.onAuthenticationError();
  let { content } = body;
  if (content && Array.isArray(content)) {
    if (isError)
      return {
        content: content.map((item) => {
          if (typeof item === "object" && item !== null && "type" in item) return item;
          return {
            type: "text",
            text: String(item),
          };
        }),
        isError: true,
        ...(meta && {
          _meta: meta,
        }),
      };
    return {
      content: content.map((item) => {
        if (typeof item === "object" && item !== null && "type" in item && "source" in item) {
          let source = item;
          if (
            source.type === "image" &&
            typeof source.source === "object" &&
            source.source !== null &&
            "data" in source.source
          )
            return {
              type: "image",
              data: source.source.data,
              mimeType: "media_type" in source.source ? source.source.media_type || "image/png" : "image/png",
            };
        }
        if (typeof item === "object" && item !== null && "type" in item) return item;
        return {
          type: "text",
          text: String(item),
        };
      }),
      isError,
      ...(meta && {
        _meta: meta,
      }),
    };
  }
  if (typeof content === "string")
    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
      isError,
      ...(meta && {
        _meta: meta,
      }),
    };
  host.logger.warn(`[${host.serverName}] Unexpected result format from socket bridge`, response);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response),
      },
    ],
    isError,
    ...(meta && {
      _meta: meta,
    }),
  };
}
//@ chunk-w2264jxg.js:14705-14783 placement
/**
 * 扩展未连接时的结果文本。
 */
function disconnectedResult(host) {
  return {
    content: [
      {
        type: "text",
        text: host.onToolCallDisconnected(),
      },
    ],
  };
}
//@ chunk-w2264jxg.js:14783-15520 placement
async function switchBrowser(host, bridge) {
  if (!host.bridgeConfig)
    return {
      content: [
        {
          type: "text",
          text: "Browser switching is only available with bridge connections.",
        },
      ],
      isError: true,
    };
  if (!(await bridge.ensureConnected())) return disconnectedResult(host);
  if (host.isDisabled?.()) return chromeToolErrorResult("Unknown tool: switch_browser");
  let outcome = (await bridge.switchBrowser?.()) ?? null;
  if (outcome === "no_other_browsers")
    return {
      content: [
        {
          type: "text",
          text: "No other browsers available to switch to. Open Chrome with the Claude extension in another browser to switch.",
        },
      ],
      isError: false,
    };
  if (outcome) {
    weakMap.set(bridge, true);
    return {
      content: [
        {
          type: "text",
          text: `Selected browser "${sanitizeBrowserLabel(outcome, 0)}".`,
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text",
        text: "No browser responded within the timeout. Make sure Chrome is open with the Claude extension installed, then try again.",
      },
    ],
    isError: true,
  };
}
//@ chunk-w2264jxg.js:15520-16223 placement
async function listConnectedBrowsers(options, selector) {
  if (!options.bridgeConfig || !selector.listConnectedExtensions)
    return {
      content: [
        {
          type: "text",
          text: "Listing browsers is only available with bridge connections.",
        },
      ],
      isError: true,
    };
  if (!(await selector.ensureConnected())) return disconnectedResult(options);
  if (options.isDisabled?.()) return chromeToolErrorResult("Unknown tool: list_connected_browsers");
  let extensions = await selector.listConnectedExtensions();
  let decision = pickBrowserDevice(
    extensions,
    selector.getSelectedDeviceId?.(),
    extensions.length > 1 ? await safeCallPromise(options.getLocalDeviceIds) : undefined,
  );
  let deviceId = decision.kind === "select" ? decision.extension.deviceId : undefined;
  let browsers = extensions.map((extension, index) => ({
    ...extension,
    name: browserDisplayName(extension, index),
    osPlatform: extension.osPlatform === undefined ? undefined : OS_DISPLAY_NAMES.get(extension.osPlatform),
    ...(extension.deviceId === deviceId && {
      inUse: true,
    }),
  }));
  let content = [
    {
      type: "text",
      text: JSON.stringify(browsers),
    },
  ];
  if (extensions.length > 1)
    content.push({
      type: "text",
      text: describeBrowserSelection(options, selector, browsers, decision),
    });
  return {
    content,
  };
}
//@ chunk-w2264jxg.js:16223-17098 placement
/**
 * 描述多浏览器连接时的选择情况：已选定（本机唯一、本会话正在用或上次选的）时说明无需询问；需询问时提示先列出本机浏览器，再按预检说明让用户选择。
 */
function describeBrowserSelection(options, selector, browsers, decision) {
  if (decision.kind === "select") {
    let selectionClause = "is the one on this computer and will be used";
    if (decision.reason === "persisted")
      selectionClause = selector.hasActiveSelection?.()
        ? "is the one in use for this session"
        : "is the one picked last and will be used";
    let index = browsers.findIndex((browser) => browser.deviceId === decision.extension.deviceId);
    return `${browsers.length} browsers are connected; "${sanitizeBrowserLabel(decision.extension, index)}" (deviceId ${decision.extension.deviceId}) ${selectionClause}. No question is needed unless the user wants a different browser (then select_browser with its deviceId, or switch_browser).`;
  }
  if (decision.kind === "ask" && decision.localCount > 0)
    return `${browsers.length} browsers are connected, ${decision.localCount} of them on this computer (onThisComputer: true), and none is selected for this session. ${browserPreflightInstruction(options.askUserToolName)} List the browsers on this computer first.`;
  return `${browsers.length} browsers are connected and none is selected for this session. ${browserPreflightInstruction(options.askUserToolName)}`;
}
//@ chunk-w2264jxg.js:17098-17836 placement
async function selectBrowser(host, bridge, args) {
  let deviceId = typeof args.deviceId === "string" ? args.deviceId : "";
  if (!host.bridgeConfig || !bridge.selectExtensionById || !bridge.listConnectedExtensions || !deviceId)
    return {
      content: [
        {
          type: "text",
          text: "select_browser requires a bridge connection and a deviceId argument.",
        },
      ],
      isError: true,
    };
  if (!(await bridge.ensureConnected())) return disconnectedResult(host);
  let extensions = await bridge.listConnectedExtensions();
  let extension = extensions.find((extension) => extension.deviceId === deviceId);
  if (!extension)
    return {
      content: [
        {
          type: "text",
          text: `No connected browser has deviceId "${deviceId}". Call list_connected_browsers to see currently connected browsers.`,
        },
      ],
      isError: true,
    };
  if (host.isDisabled?.()) return chromeToolErrorResult("Unknown tool: select_browser");
  let index = extensions.indexOf(extension);
  bridge.selectExtensionById(deviceId, browserDisplayName(extension, index));
  weakMap.set(bridge, true);
  return {
    content: [
      {
        type: "text",
        text: `Selected browser "${sanitizeBrowserLabel(extension, index)}".`,
      },
    ],
  };
}
//@ chunk-w2264jxg.js:17836-18045 placement
function contentText(value) {
  if (!Array.isArray(value)) return String(value);
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null && "text" in item && typeof item.text === "string")
        return item.text;
      return "";
    })
    .join(" ");
}
//@ chunk-w2264jxg.js:18045-18114 placement
/**
 * 判断结果文本是否提示已重新认证。
 */
function isReauthenticatedText(value) {
  return contentText(value).toLowerCase().includes("re-authenticated");
}
export { releaseBrowserSelection, handleChromeToolCall, parseTabsContextResult };

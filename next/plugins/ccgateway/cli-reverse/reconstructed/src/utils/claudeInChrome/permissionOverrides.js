/**
 * utils/claudeInChrome/permissionOverrides.ts
 *
 * 2.1.316 新增。Claude in Chrome 工具的权限覆盖：确定动作作用的标签页与主机，校验 browser_batch，必要时弹出权限请求。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bhrstd6k.js (28)
 * attribution: placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  normalizeChromeSite,
  parseChromeUrl,
  hostWithDefaultPort,
  isSiteDenied,
  chromeNotConnectedAnswer,
  firstSiteActionInBatch,
  collectChromeSiteRules,
  chromeSiteDenyDecision,
} from "./chromePermissionRules.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { keyWithOrigin, sessionKeyOrHostKey } from "../hostSuppliedKey.js";
import { getSessionId } from "../../bootstrap/state.js";
import {
  CFC_TOOL_PREFIX,
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
} from "./common.js";
import { isPlainObject } from "../isPlainObject.js";
import { systemClock, sleep, withTimeout } from "../sleep.js";
import { logError } from "../log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { classifyToolError, firstTextContent } from "./toolErrorClassification.js";
import { jsonParse } from "../slowOperations.js";
import { NoExtensionConnectedError, ExtensionDisconnectedMidCallError } from "./socketClient.js";
import { setProvidedTabsProvider } from "./tabsProvider.js";
import { firstLineOf } from "../stringUtils.js";
import { SUPPORTED_IMAGE_TYPES } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { imageLimitsForModel } from "../attachmentMedia.js";
import { maybeResizeAndDownsampleImageBlock } from "../imageResizer.js";
import { CHROME_INPUT_APPROVED_TOOL_NAMES } from "./browserToolSchemas.js";
import {
  isBrowserHousekeepingCall,
  stripCyclesAndHiddenKeys,
} from "../permissions/browserComputerUseTools.js";
import { describeBrowserToolAction } from "../../components/TrustDialog/utils.js";
import { AbortError, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { handleChromeToolCall } from "./chromeMcpServer.js";
import { stripAnthropicMeta } from "../../services/mcp/anthropicMeta.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../services/mcp/client.js";
import { logChromeToolAttempted, noBrowserConnected } from "./telemetry.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { isAutoAllowedInMode, isPlanBypass } from "../permissions/browserToolNames.js";
import { matchesToolName } from "../../Tool.js";
import { isAutoClassifierActive } from "../permissions/autoModeState.js";
import { forgetClassifierContext } from "../permissions/serverClassifier/context.js";
import { createChromeDomainAllowRule } from "../permissions/permissions.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import {
  codeModeHidesToolNamesFromApi,
  offInCodeModeNoteForModel,
  notListedYetNoteForModel,
} from "../codeMode.js";
import { getHookCaller } from "../agentContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bhrstd6k.js:1465-1574 placement
function normalizedOriginOf(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.host === "") return;
  return `${parsed.protocol}//${normalizeChromeSite(parsed.host)}`;
}
//@ chunk-bhrstd6k.js:1574-1646 placement
/**
 * 判断两个来源是否不同（任一未知也视为不同）。
 */
function originsDiffer(leftUrl, rightUrl) {
  let leftOrigin = normalizedOriginOf(leftUrl);
  let rightOrigin = normalizedOriginOf(rightUrl);
  return leftOrigin === undefined || rightOrigin === undefined || leftOrigin !== rightOrigin;
}
//@ chunk-bhrstd6k.js:1646-1763 placement
function tabNavigationFor(scopeKey, rightUrl) {
  let lastUrl = claudeInChromeSession().lastExecutedTabUrlByScope.get(scopeKey);
  if (lastUrl === undefined) return;
  return originsDiffer(lastUrl, rightUrl)
    ? {
        from: lastUrl,
        to: rightUrl,
      }
    : undefined;
}
//@ chunk-bhrstd6k.js:1763-1819 placement
/**
 * 记录某作用域最近执行的标签页 URL。
 */
function rememberExecutedTabUrl(scopeKey, url) {
  claudeInChromeSession().lastExecutedTabUrlByScope.set(scopeKey, url);
}
//@ chunk-bhrstd6k.js:1819-1829 placement
/**
 * 按工具调用缓存解析结果的条数上限（200）。
 */
var MAX_RESOLVED_BY_TOOL_USE = 200;
//@ chunk-bhrstd6k.js:1829-1914 placement
/**
 * 记录某工具调用解析出的站点。
 */
function rememberResolvedHost(toolUseId, host) {
  let resolvedHostByToolUseId = claudeInChromeSession().resolvedHostByToolUseId;
  if (resolvedHostByToolUseId.size >= MAX_RESOLVED_BY_TOOL_USE) resolvedHostByToolUseId.clear();
  resolvedHostByToolUseId.set(toolUseId, host);
}
//@ chunk-bhrstd6k.js:1914-1999 placement
/**
 * 记录某工具调用解析出的 URL。
 */
function rememberResolvedUrl(toolUseId, url) {
  let resolvedUrlByToolUseId = claudeInChromeSession().resolvedUrlByToolUseId;
  if (resolvedUrlByToolUseId.size >= MAX_RESOLVED_BY_TOOL_USE) resolvedUrlByToolUseId.clear();
  resolvedUrlByToolUseId.set(toolUseId, url);
}
//@ chunk-bhrstd6k.js:1999-2095 placement
/**
 * 返回权限作用域使用的会话 id（宿主提供时用宿主键）。
 */
function permissionScopeOfSession() {
  let { key, fromHost } = keyWithOrigin();
  if (fromHost)
    return {
      sessionId: key,
    };
  let sessionId = getSessionId();
  return {
    sessionId,
  };
}
//@ chunk-bhrstd6k.js:2095-2159 placement
function setChromeBinding(context, socketClient) {
  claudeInChromeSession().bridgeBinding = {
    context,
    socketClient,
  };
}
//@ chunk-bhrstd6k.js:2159-2346 placement
/**
 * 是否有总是允许 Chrome 工具的规则
 */
function hasChromeAlwaysAllow(toolPermissionContext, toolName) {
  let sliced = CFC_TOOL_PREFIX.slice(0, -2);
  let wildcardRule = `${CFC_TOOL_PREFIX}*`;
  for (let alwaysAllowRule of Object.values(toolPermissionContext.alwaysAllowRules))
    for (let rule of alwaysAllowRule ?? []) {
      let replaced = rule.replace(/\(\*?\)$/, "");
      if (replaced === toolName || replaced === sliced || replaced === wildcardRule) return true;
    }
  return false;
}
//@ chunk-bhrstd6k.js:2346-3164 placement
/**
 * 切换/选择浏览器的工具名集合。
 */
var CHROME_TOOL_CLASSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BROWSER_SELECT_TOOL_NAMES;
var CHROME_TOOL_ERROR_MESSAGES;
deferInit("chunk-bhrstd6k.js:2346", () => {
  CHROME_TOOL_CLASSES = new Set([
    "tabs_context_mcp",
    "tabs_create_mcp",
    "tabs_close_mcp",
    "resize_window",
    "shortcuts_list",
    "list_connected_browsers",
  ]);
  BROWSER_SELECT_TOOL_NAMES = new Set(["switch_browser", "select_browser"]);
  CHROME_TOOL_ERROR_MESSAGES = {
    tab_missing:
      "Couldn't determine which page this action targets. Pass the tabId from tabs_context_mcp and try again.",
    batch_multiple_tabs:
      "Claude in Chrome: a browser_batch must act on one tab. Pass the same tabId on every action.",
    batch_after_navigate:
      "Claude in Chrome: a browser_batch cannot act on a page after navigating to it. Issue the navigate on its own, then batch the actions on the loaded page.",
    batch_browser_switch: "Claude in Chrome: switch browsers in its own call, not inside a browser_batch.",
    batch_malformed_item:
      "Claude in Chrome: a browser_batch action must be {name, input} and cannot nest another browser_batch.",
  };
});
//@ chunk-bhrstd6k.js:3164-3971 placement
/**
 * 检查 browser_batch 结构
 */
function vetBrowserBatch(toolName, input) {
  let actions = [];
  if (toolName === "browser_batch") {
    if (!Array.isArray(input.actions))
      return {
        kind: "deny",
        code: "batch_malformed_item",
      };
    for (let action of input.actions) {
      if (!isPlainObject(action) || typeof action.name !== "string" || action.name === "browser_batch")
        return {
          kind: "deny",
          code: "batch_malformed_item",
        };
      actions.push({
        name: action.name,
        input: isPlainObject(action.input) ? action.input : {},
      });
    }
  } else
    actions.push({
      name: toolName,
      input,
    });
  let tabIds = new Set();
  let sawNavigate = false;
  for (let action of actions) {
    if (action.name === "navigate") {
      sawNavigate = true;
      continue;
    }
    if (BROWSER_SELECT_TOOL_NAMES.has(action.name)) {
      if (actions.length > 1)
        return {
          kind: "deny",
          code: "batch_browser_switch",
        };
      continue;
    }
    if (CHROME_TOOL_CLASSES.has(action.name)) continue;
    if (sawNavigate)
      return {
        kind: "deny",
        code: "batch_after_navigate",
      };
    if (typeof action.input.tabId !== "number")
      return {
        kind: "deny",
        code: "tab_missing",
      };
    tabIds.add(action.input.tabId);
  }
  if (tabIds.size === 0)
    return {
      kind: "none",
    };
  if (tabIds.size > 1)
    return {
      kind: "deny",
      code: "batch_multiple_tabs",
    };
  return {
    kind: "tab",
    tabId: [...tabIds][0],
  };
}
//@ chunk-bhrstd6k.js:3971-4101 placement
var CHROME_CALL_BUDGET_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CHROME_RETRY_DELAY_MS;
var RETRYABLE_TIMEOUT_FAILURES;
deferInit("chunk-bhrstd6k.js:3971", () => {
  CHROME_CALL_BUDGET_MS = 5000;
  CHROME_RETRY_DELAY_MS = 2500;
  RETRYABLE_TIMEOUT_FAILURES = new Set([
    "connect_timeout",
    "no_browser_selected_timeout",
    "browser_selected_late_timeout",
    "answer_timeout",
  ]);
});
//@ chunk-bhrstd6k.js:4101-5279 placement
/**
 * 确定动作作用的标签页
 */
async function resolveTargetTab(tabId) {
  let startedMs = systemClock.monotonicNow();
  let deferred = Promise.withResolvers();
  let abortController = new AbortController();
  let quickListPromise = listTabsForPermission({
    onSentToSelectedBrowser: deferred.resolve,
  }).then((listResult) => {
    abortController.abort();
    return findTargetTab(listResult, tabId);
  });
  let retryState = {
    sent: false,
  };
  let deferredPromise = deferred.promise
    .then(async () => {
      await sleep(CHROME_RETRY_DELAY_MS, abortController.signal);
      let remainingBudgetMs = CHROME_CALL_BUDGET_MS - (systemClock.monotonicNow() - startedMs);
      let socketClient = claudeInChromeSession().bridgeBinding?.socketClient;
      if (
        abortController.signal.aborted ||
        remainingBudgetMs <= 0 ||
        socketClient?.isConnected() !== true ||
        socketClient.hasActiveSelection?.() !== true
      )
        return;
      retryState.sent = true;
      let result = findTargetTab(
        await listTabsForPermission({
          capMs: remainingBudgetMs,
        }),
        tabId,
      );
      if (parseOkTabUrl(result)) return result;
      if (result.ok || !RETRYABLE_TIMEOUT_FAILURES.has(result.failure)) retryState.callMs = result.callMs;
      return;
    })
    .catch((error) => {
      logError(error);
      return;
    });
  let winner = await Promise.race([
    quickListPromise.then(() => {
      return;
    }),
    deferredPromise,
  ]);
  if (winner === undefined) {
    let listResult = await quickListPromise;
    if (retryState.sent && !listResult.ok && listResult.failure === "answer_timeout")
      return {
        ...listResult,
        failure: "answer_timeout_after_retry",
        retryCallMs: retryState.callMs,
      };
    return listResult;
  }
  quickListPromise
    .then((listResult) => {
      let timingFields = {
        connect_ms: listResult.connectMs,
        call_ms: listResult.callMs,
        retry_call_ms: winner.callMs,
      };
      let okTabUrl = parseOkTabUrl(listResult);
      if (okTabUrl) {
        if (normalizeChromeSite(okTabUrl.host) !== normalizeChromeSite(parseOkTabUrl(winner)?.host ?? ""))
          logFeatureSad("chrome_permission_prompt", "tab_lookup_hosts_differed", timingFields);
        return;
      }
      let failure = listResult.ok ? "non_web_tab_url" : listResult.failure;
      if (failure === "answer_timeout") {
        logFeatureSad("chrome_permission_prompt", "tab_lookup_rescued_after_answer_timeout", timingFields);
        return;
      }
      logFeatureSad("chrome_permission_prompt", "tab_lookup_rescued_after_failure", {
        ...timingFields,
        first_lookup_failure: fromEnum(failure),
      });
    })
    .catch(logError);
  return winner;
}
//@ chunk-bhrstd6k.js:5279-5405 placement
function chromeCallTimingFields(result) {
  return {
    connect_ms: result.connectMs,
    call_ms: result.callMs,
    ...(!result.ok &&
      result.retryCallMs !== undefined && {
        retry_call_ms: result.retryCallMs,
      }),
  };
}
//@ chunk-bhrstd6k.js:5405-5449 placement
/**
 * 取成功结果里的 URL 并解析成主机信息。
 */
function parseOkTabUrl(result) {
  return result.ok ? parseChromeUrl(result.url) : undefined;
}
//@ chunk-bhrstd6k.js:5449-5884 placement
/**
 * 在标签列表中找目标标签
 */
function findTargetTab(result, tabId) {
  if (!result.ok) return result;
  let { tabs, connectMs, callMs } = result;
  let index = tabs.findIndex((tab) => tab == null || tab.tabId === tabId);
  let tab = tabs[index];
  if (index === -1)
    return {
      ok: false,
      failure: tabs.length === 0 ? "empty_tab_list" : "tab_not_listed",
      connectMs,
      callMs,
    };
  if (tab == null || typeof tab.url !== "string")
    return {
      ok: false,
      failure: "malformed_tab_list",
      connectMs,
      callMs,
    };
  if (tab.url === "")
    return {
      ok: false,
      failure: "tab_url_empty",
      connectMs,
      callMs,
    };
  return {
    ok: true,
    url: tab.url,
    connectMs,
    callMs,
  };
}
//@ chunk-bhrstd6k.js:5884-7552 placement
/**
 * 取标签上下文用于权限判断
 */
async function listTabsForPermission(options) {
  let startedMs = systemClock.monotonicNow();
  let timing = {};
  let outcome;
  try {
    let bridgeBinding = claudeInChromeSession().bridgeBinding;
    if (!bridgeBinding)
      return {
        ok: false,
        failure: "binding_missing",
        connectMs: 0,
        callMs: 0,
      };
    let { socketClient } = bridgeBinding;
    outcome = await withTimeout(
      (async () => {
        if (!(await socketClient.ensureConnected())) return "not_connected";
        timing.browserSelected = socketClient.hasActiveSelection?.();
        timing.startedAt = systemClock.monotonicNow();
        if (timing.browserSelected === true) options?.onSentToSelectedBrowser?.();
        let response = await socketClient.callTool(
          "tabs_context_mcp",
          {
            createIfEmpty: false,
            includePermissionState: false,
          },
          {
            permissionMode: "ask",
            sessionScope: permissionScopeOfSession(),
          },
        );
        if (!response) return "empty_result";
        if (response.error)
          return `tool_error_${classifyToolError("tabs_context_mcp", firstTextContent(response.error))}`;
        let content = response.result?.content;
        let text =
          Array.isArray(content) &&
          content[0] &&
          typeof content[0] === "object" &&
          "text" in content[0] &&
          typeof content[0].text === "string"
            ? content[0].text
            : undefined;
        if (!text) return "no_text";
        let parsed;
        try {
          parsed = jsonParse(text);
        } catch {
          return text.includes("createIfEmpty") ? "no_tab_group" : "not_json";
        }
        let availableTabs = parsed?.availableTabs;
        return Array.isArray(availableTabs) ? availableTabs : "no_tab_list";
      })().catch((error) => {
        if (timing.startedAt === undefined) return "connect_threw";
        if (
          error instanceof Error &&
          (error.name === "SocketConnectionError" || error.name === "ToolCallLostError")
        )
          return "connection_lost";
        if (error instanceof NoExtensionConnectedError) return "no_extension";
        if (error instanceof ExtensionDisconnectedMidCallError) return "extension_disconnected";
        return "call_threw";
      }),
      options?.capMs ?? CHROME_CALL_BUDGET_MS,
      "queryTabUrl bridge call",
    ).catch(() => {
      if (timing.startedAt === undefined) return "connect_timeout";
      if (socketClient.hasActiveSelection?.() === false) return "no_browser_selected_timeout";
      return timing.browserSelected === false ? "browser_selected_late_timeout" : "answer_timeout";
    });
  } catch {
    outcome = "other_threw";
  }
  let endedMs = systemClock.monotonicNow();
  let connectMs = Math.round((timing.startedAt ?? endedMs) - startedMs);
  let callMs = timing.startedAt === undefined ? 0 : Math.round(endedMs - timing.startedAt);
  return typeof outcome === "string"
    ? {
        ok: false,
        failure: outcome,
        connectMs,
        callMs,
      }
    : {
        ok: true,
        tabs: outcome,
        connectMs,
        callMs,
      };
}
//@ chunk-bhrstd6k.js:7552-7610 placement
// deferred: uses listTabsForPermission of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bhrstd6k.js:7552", () => {
  setProvidedTabsProvider(async () => {
    let listResult = await listTabsForPermission();
    return listResult.ok ? listResult.tabs : undefined;
  });
});
//@ chunk-bhrstd6k.js:7678-7774 placement
/**
 * 构造“图片未内联”的占位文本。
 */
function imageOmittedText(reason) {
  return {
    type: "text",
    text: `[Image from Claude in Chrome \u2014 ${reason}; not inlined]`,
  };
}
//@ chunk-bhrstd6k.js:7774-7887 placement
function isSupportedImageMimeType(mimeType) {
  if (!mimeType) return false;
  let lower = firstLineOf(mimeType, ";").trim().toLowerCase();
  return SUPPORTED_IMAGE_TYPES.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-bhrstd6k.js:7887-8248 placement
/**
 * 转换 Chrome 工具结果中的图片
 */
async function convertChromeResult(result, model) {
  let limits = imageLimitsForModel(model);
  let blocks = [];
  for (let contentBlock of result.content ?? [])
    if (contentBlock.type === "text")
      blocks.push({
        type: "text",
        text: contentBlock.text,
      });
    else if (contentBlock.type === "image")
      if (isSupportedImageMimeType(contentBlock.mimeType))
        try {
          let { block } = await maybeResizeAndDownsampleImageBlock({
            data: String(contentBlock.data),
            mediaType: contentBlock.mimeType,
            limits,
          });
          blocks.push(block);
        } catch {
          blocks.push(imageOmittedText("could not be decoded"));
        }
      else blocks.push(imageOmittedText(`unsupported type ${contentBlock.mimeType ?? "unknown"}`));
  return blocks;
}
//@ chunk-bhrstd6k.js:8248-8460 placement
/**
 * batch 是否需要目标标签
 */
function batchNeedsTab(input) {
  if (!Array.isArray(input.actions)) return false;
  return input.actions.some((action) => {
    if (!isPlainObject(action) || typeof action.name !== "string") return true;
    return (
      action.name === "browser_batch" ||
      (CHROME_INPUT_APPROVED_TOOL_NAMES.has(action.name) &&
        !isBrowserHousekeepingCall(action.name, isPlainObject(action.input) ? action.input : {}))
    );
  });
}
//@ chunk-bhrstd6k.js:8460-8883 placement
/**
 * 取 browser_batch 中的导航地址
 */
function batchNavigateUrls(input) {
  if (!Array.isArray(input.actions)) return [];
  let hosts = [];
  for (let action of input.actions) {
    if (!isPlainObject(action)) continue;
    let input = isPlainObject(action.input) ? action.input : {};
    if (action.name === "browser_batch") {
      let nestedHosts = batchNavigateUrls(input);
      if (nestedHosts === "unvettable") return nestedHosts;
      hosts.push(...nestedHosts);
      continue;
    }
    if (action.name !== "navigate" || typeof input.url !== "string") continue;
    let lower = input.url.trim().toLowerCase();
    if (lower === "back" || lower === "forward") continue;
    let chromeUrl = parseChromeUrl(input.url);
    if (!chromeUrl) return "unvettable";
    hosts.push(chromeUrl.host, hostWithDefaultPort(chromeUrl));
  }
  return hosts;
}
//@ chunk-bhrstd6k.js:8975-9093 placement
function chromePermissionQuestion(toolName, input, site) {
  let actionText = describeBrowserToolAction(toolName, input);
  return site
    ? `Allow Claude in Chrome to ${actionText} on ${site}?`
    : `Allow Claude in Chrome to ${actionText}?`;
}
//@ chunk-bhrstd6k.js:9093-9296 placement
/**
 * 主机是否仍在允许集合
 */
function isHostStillAllowed(allowed, sites) {
  return async (request) => {
    let url;
    try {
      url = new URL(request.url);
    } catch {}
    let stillAllowed =
      !!url?.host &&
      allowed.has(normalizeChromeSite(url.host)) &&
      !isSiteDenied(
        sites,
        normalizeChromeSite(
          hostWithDefaultPort({
            url: url.href,
          }),
        ),
      );
    if (!stillAllowed) logFeatureBad("chrome_permission_prompt", "stale_host_mismatch");
    return stillAllowed;
  };
}
//@ chunk-bhrstd6k.js:9296-10386 placement
/**
 * 带权限检查调用 Chrome 工具
 */
async function callChromeWithPermission(toolName, input, signal, model, callOptions, timing, toolUseContext) {
  let bridgeBinding = claudeInChromeSession().bridgeBinding;
  if (!bridgeBinding) {
    logFeatureBad("chrome_permission_prompt", "binding_missing");
    throw Error("Claude in Chrome bridge is not initialized in this session.");
  }
  if (signal.aborted) throw new AbortError("Claude in Chrome tool call aborted");
  let onAbort;
  let promise = new Promise((resolve, reject) => {
    onAbort = () => reject(new AbortError("Claude in Chrome tool call aborted"));
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
  });
  let result;
  let markExternal = timing?.mark("external");
  try {
    result = await Promise.race([
      handleChromeToolCall(
        bridgeBinding.context,
        bridgeBinding.socketClient,
        toolName,
        stripCyclesAndHiddenKeys(input ?? {}),
        callOptions,
      ),
      promise,
    ]);
  } finally {
    markExternal?.();
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
  if (result.isError) {
    let errorText =
      (result.content ?? []).flatMap((block) => (block.type === "text" ? [block.text] : [])).join(`
`) || `${toolName} failed`;
    let _meta = result._meta;
    let toolCallFailureCause = _meta?.toolCallFailureCause;
    let classifiedCode =
      _meta?.isBridgeTimeout === true
        ? "bridge_timeout"
        : _meta?.isFrontLoadBoundExceeded === true
          ? "front_load_bound_exceeded"
          : toolCallFailureCause === "connection_lost_mid_call" ||
              toolCallFailureCause === "connection_lost_before_call"
            ? toolCallFailureCause
            : undefined;
    let cleanMeta = isPlainObject(_meta) ? stripAnthropicMeta(_meta) : undefined;
    throw Object.assign(
      new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        errorText,
        "Claude in Chrome tool returned error",
        cleanMeta
          ? {
              _meta: cleanMeta,
            }
          : undefined,
        `chrome_${classifiedCode ?? classifyToolError(toolName, errorText)}`,
      ),
      {
        mcpErrorSource: "other",
      },
    );
  }
  let data = await convertChromeResult(await chromeNotConnectedAnswer(result, toolUseContext), model);
  let cleanMeta = stripAnthropicMeta(result._meta);
  return {
    data,
    ...(cleanMeta && {
      mcpMeta: {
        _meta: cleanMeta,
      },
    }),
  };
}
//@ chunk-bhrstd6k.js:10386-16847 placement
/**
 * Claude in Chrome 工具的权限覆盖：确定动作作用的标签页与主机，校验 browser_batch，必要时弹出权限请求。
 */
function getClaudeInChromePermissionOverrides(toolName) {
  let commandName = `${CFC_TOOL_PREFIX}${toolName}`;
  return {
    checkPermissions: async (input, toolUseContext) => {
      logChromeToolAttempted(toolUseContext.options?.messageClientPlatform);
      let toolUseId = toolUseContext.toolUseId;
      let isInputApprovedTool = CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName);
      if (isInputApprovedTool && isBrowserHousekeepingCall(toolName, input)) {
        let toolPermissionContext = getToolPermissionContext(toolUseContext);
        if (
          toolPermissionContext?.chromeHostToolAsksEnabled !== false &&
          toolPermissionContext?.mcpAskForTools?.[CLAUDE_IN_CHROME_MCP_SERVER_NAME]?.includes(toolName) ===
            true &&
          toolPermissionContext.shouldAvoidPermissionPrompts !== true &&
          toolPermissionContext.mode !== "dontAsk"
        )
          return {
            behavior: "ask",
            message: "Claude in Chrome requires permission.",
            suppressAlwaysAllowRule: true,
            decisionReason: {
              type: "other",
              reason: "Claude in Chrome action",
            },
            metadata: {
              command: {
                name: commandName,
                description: chromePermissionQuestion(toolName, input, undefined),
              },
            },
          };
        return {
          behavior: "allow",
          updatedInput: input,
        };
      }
      let needsSiteCheck =
        (isInputApprovedTool && !isBrowserHousekeepingCall(toolName, input)) ||
        (toolName === "browser_batch" && batchNeedsTab(input));
      if (
        toolName === "navigate" &&
        typeof input.url === "string" &&
        (input.url.trim().toLowerCase() === "back" || input.url.trim().toLowerCase() === "forward")
      )
        return {
          behavior: "allow",
          updatedInput: input,
        };
      let siteAction =
        toolName === "browser_batch"
          ? firstSiteActionInBatch(input)
          : {
              input,
              toolName,
            };
      let chromeUrl;
      if (siteAction && siteAction.toolName === "navigate" && typeof siteAction.input.url === "string") {
        chromeUrl = parseChromeUrl(siteAction.input.url);
        if (!chromeUrl) {
          logFeatureBad("chrome_permission_prompt", "non_web_url");
          return {
            behavior: "deny",
            message:
              "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
            decisionReason: {
              type: "safetyCheck",
              reason: "Claude in Chrome: non-web or unparseable URL",
              classifierApprovable: false,
            },
          };
        }
      } else if (siteAction && typeof siteAction.input.tabId === "number") {
        let result = await resolveTargetTab(siteAction.input.tabId);
        if (!result.ok) {
          logFeatureBad(
            "chrome_permission_prompt",
            `tab_url_unresolved_${result.failure}`,
            chromeCallTimingFields(result),
          );
          return {
            behavior: "deny",
            message:
              "Couldn't determine which page this action targets. Re-read tabs_context_mcp and try again.",
            decisionReason: {
              type: "safetyCheck",
              reason: "Claude in Chrome: tab URL unresolved",
              classifierApprovable: false,
            },
          };
        }
        chromeUrl = parseChromeUrl(result.url);
        if (!chromeUrl) {
          logFeatureBad("chrome_permission_prompt", "non_web_tab_url");
          return {
            behavior: "deny",
            message:
              "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
            decisionReason: {
              type: "safetyCheck",
              reason: "Claude in Chrome: non-web or unparseable tab URL",
              classifierApprovable: false,
            },
          };
        }
      }
      let toolPermissionContext = getToolPermissionContext(toolUseContext);
      let autoAllowed = isAutoAllowedInMode(
        toolUseContext.options?.tools?.find((tool) => matchesToolName(tool, commandName)),
        toolPermissionContext,
      );
      let isBypass =
        autoAllowed === "bypassPermissions" ||
        isPlanBypass(autoAllowed, toolPermissionContext.isBypassPermissionsModeAvailable);
      let needsClassifier =
        toolPermissionContext.chromeNavigationClassifierEnabled === true &&
        !isBypass &&
        (toolPermissionContext.chromeClassifierFloorEnabled === true || isAutoClassifierActive(autoAllowed));
      let navigation;
      let resolvedUrl;
      let finalizeToolUse = () => {
        if (!toolUseId) return;
        if (resolvedUrl === undefined) claudeInChromeSession().resolvedUrlByToolUseId.delete(toolUseId);
        else rememberResolvedUrl(toolUseId, resolvedUrl);
        if (navigation === undefined) forgetClassifierContext(toolUseId);
      };
      if (needsClassifier) {
        let vetResult = vetBrowserBatch(toolName, input);
        if (vetResult.kind === "deny") {
          logFeatureBad("chrome_permission_prompt", vetResult.code);
          finalizeToolUse();
          return {
            behavior: "deny",
            message: CHROME_TOOL_ERROR_MESSAGES[vetResult.code],
            decisionReason: {
              type: "safetyCheck",
              reason: `Claude in Chrome: ${vetResult.code}`,
              classifierApprovable: false,
            },
          };
        }
        if (vetResult.kind === "tab") {
          let tabResult =
            chromeUrl && siteAction?.toolName !== "navigate" && siteAction?.input.tabId === vetResult.tabId
              ? {
                  ok: true,
                  url: chromeUrl.url,
                  connectMs: 0,
                  callMs: 0,
                }
              : await resolveTargetTab(vetResult.tabId);
          let tabActionUrl = tabResult.ok ? parseChromeUrl(tabResult.url) : undefined;
          if (tabActionUrl === undefined) {
            logFeatureBad(
              "chrome_permission_prompt",
              `tab_url_unresolved_${tabResult.ok ? "non_web_tab_url" : tabResult.failure}`,
              chromeCallTimingFields(tabResult),
            );
            finalizeToolUse();
            return {
              behavior: "deny",
              message:
                "Couldn't determine which page this action targets. Re-read tabs_context_mcp and try again.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Claude in Chrome: tab URL unresolved",
                classifierApprovable: false,
              },
            };
          }
          navigation = tabNavigationFor(sessionKeyOrHostKey(), tabActionUrl.url);
          if (!(needsSiteCheck && toolPermissionContext.mode === "plan")) resolvedUrl = tabActionUrl.url;
        }
      }
      finalizeToolUse();
      let batchHosts = toolName === "browser_batch" ? batchNavigateUrls(input) : [];
      if (batchHosts === "unvettable") {
        logFeatureBad("chrome_permission_prompt", "non_web_url");
        return {
          behavior: "deny",
          message: "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
          decisionReason: {
            type: "safetyCheck",
            reason: "Claude in Chrome: non-web or unparseable URL",
            classifierApprovable: false,
          },
        };
      }
      let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
      let found = [...(chromeUrl ? [chromeUrl.host, hostWithDefaultPort(chromeUrl)] : []), ...batchHosts]
        .map((host) => chromeSiteDenyDecision(chromeSiteRules, host))
        .find((denyDecision) => denyDecision !== undefined);
      if (found) {
        logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
        return found;
      }
      let hostAllowed = false;
      let grantRule;
      if (chromeUrl) {
        let site = normalizeChromeSite(chromeUrl.host);
        let source = chromeSiteRules.sourceOf.get(site) ?? "session";
        hostAllowed = chromeSiteRules.allowed.has(site);
        grantRule = hostAllowed ? createChromeDomainAllowRule(chromeUrl.host, source) : undefined;
        if (
          hostAllowed &&
          navigation === undefined &&
          toolPermissionContext.chromeClassifierFloorEnabled !== true &&
          !needsSiteCheck
        ) {
          if (toolUseId) rememberResolvedHost(toolUseId, chromeUrl);
          return {
            behavior: "allow",
            updatedInput: input,
            decisionReason: {
              type: "rule",
              rule: createChromeDomainAllowRule(chromeUrl.host, source),
            },
          };
        }
        if (
          toolUseId &&
          (hostAllowed ||
            toolPermissionContext.chromeClassifierFloorEnabled === true ||
            !hasChromeAlwaysAllow(toolPermissionContext, commandName))
        )
          rememberResolvedHost(toolUseId, chromeUrl);
      }
      let bridgeBinding = claudeInChromeSession().bridgeBinding;
      if (
        toolUseId &&
        bridgeBinding &&
        !isBypass &&
        !(
          toolPermissionContext.chromeClassifierFloorEnabled !== true &&
          hasChromeAlwaysAllow(toolPermissionContext, commandName)
        ) &&
        (await noBrowserConnected(toolUseContext.abortController.signal))
      )
        return {
          behavior: "deny",
          message: bridgeBinding.context.onToolCallDisconnected(),
          decisionReason: {
            type: "other",
            reason: "Claude in Chrome: no browser connected",
          },
        };
      if (needsSiteCheck && toolPermissionContext.mode === "plan")
        return {
          behavior: "passthrough",
          message: "Claude in Chrome requires permission.",
          suggestions: [
            {
              type: "addRules",
              rules: [
                {
                  toolName: commandName,
                  ruleContent: undefined,
                },
              ],
              behavior: "allow",
              destination: "session",
            },
          ],
        };
      return {
        behavior: "ask",
        message: "Claude in Chrome requires permission.",
        suggestions: chromeUrl
          ? hostAllowed
            ? undefined
            : [
                {
                  type: "addRules",
                  rules: [
                    {
                      toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                      ruleContent: chromeUrl.host,
                    },
                  ],
                  behavior: "allow",
                  destination: "session",
                },
              ]
          : [
              {
                type: "addRules",
                rules: [
                  {
                    toolName: commandName,
                    ruleContent: undefined,
                  },
                ],
                behavior: "allow",
                destination: "session",
              },
            ],
        decisionReason: navigation
          ? {
              type: "safetyCheck",
              reason: "Claude in Chrome: cross-site navigation pending",
              classifierApprovable: true,
            }
          : {
              type: "other",
              reason: chromeUrl ? `Claude in Chrome action on ${chromeUrl.host}` : "Claude in Chrome action",
            },
        metadata: {
          command: {
            name: commandName,
            description: chromePermissionQuestion(toolName, input, chromeUrl?.host),
            chrome: chromeUrl
              ? {
                  ...chromeUrl,
                  domainAllowed: hostAllowed,
                  navigation,
                  ...(grantRule && {
                    grantRule,
                    classifierUnavailable:
                      toolPermissionContext.chromeClassifierFloorEnabled === true &&
                      toolPermissionContext.canAutoClassifierRun === false,
                  }),
                }
              : undefined,
          },
        },
      };
    },
    call: async (input, toolUseContext, canUseTool, assistantMessage, progressCallback, options) => {
      let toolUseId = toolUseContext.toolUseId;
      let resolvedHost = toolUseId
        ? claudeInChromeSession().resolvedHostByToolUseId.get(toolUseId)
        : undefined;
      let host = resolvedHost?.host;
      let url = toolUseId ? claudeInChromeSession().resolvedUrlByToolUseId.get(toolUseId) : undefined;
      if (toolUseId) {
        claudeInChromeSession().resolvedHostByToolUseId.delete(toolUseId);
        claudeInChromeSession().resolvedUrlByToolUseId.delete(toolUseId);
      }
      if (
        codeModeAccepted() &&
        codeModeHidesToolNamesFromApi({
          agentId: toolUseContext.agentId,
          stickyBetas: toolUseContext.stickyBetas,
          namesShownToApi: toolUseContext.namesShownToApi,
          toolName: commandName,
        })
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          codeModeHidesToolNamesFromApi() ? offInCodeModeNoteForModel() : notListedYetNoteForModel(),
          "Claude in Chrome call refused in REPL mode",
        );
      let toolPermissionContext = getToolPermissionContext(toolUseContext);
      let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
      let allowed = chromeSiteRules.allowed;
      let allowedDomainsRaw = [...chromeSiteRules.allowedRaw];
      let matchedRule =
        resolvedHost &&
        [
          resolvedHost.host,
          resolvedHost.url === undefined
            ? `${resolvedHost.host}:80`
            : hostWithDefaultPort({
                url: resolvedHost.url,
              }),
        ]
          .map((candidate) => chromeSiteDenyDecision(chromeSiteRules, candidate))
          .find((candidate) => candidate !== undefined);
      if (matchedRule) {
        logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          matchedRule.message,
          "Claude in Chrome call refused under a deny rule",
        );
      }
      if (host && !allowed.has(normalizeChromeSite(host))) {
        allowed.add(normalizeChromeSite(host));
        allowedDomainsRaw.push(host);
      }
      let found = toolUseContext.options?.tools?.find((tool) => matchesToolName(tool, commandName));
      let autoAllowed = isAutoAllowedInMode(found, toolPermissionContext);
      let isAutoRun =
        autoAllowed === "bypassPermissions" ||
        (autoAllowed === "auto" &&
          toolUseContext.autoModeClassified === true &&
          host !== undefined &&
          chromeSiteRules.denied.size === 0 &&
          resolvedHost?.keepHostPin !== true);
      let sessionScope = permissionScopeOfSession();
      let callOptions = isAutoRun
        ? {
            permissionMode: "skip_all_permission_checks",
            sessionScope,
          }
        : host
          ? {
              permissionMode: "follow_a_plan",
              allowedDomains: allowedDomainsRaw,
              onPermissionRequest: isHostStillAllowed(allowed, chromeSiteRules.denied),
              sessionScope,
            }
          : allowedDomainsRaw.length > 0
            ? {
                permissionMode: "follow_a_plan",
                allowedDomains: allowedDomainsRaw,
                sessionScope,
              }
            : {
                permissionMode: "ask",
                sessionScope,
              };
      let callResult = await callChromeWithPermission(
        toolName,
        input,
        toolUseContext.abortController.signal,
        toolUseContext.options.mainLoopModel,
        callOptions,
        options?.timing,
        toolUseContext,
      );
      if (url !== undefined) {
        let scopeKey = sessionKeyOrHostKey();
        if (
          getHookCaller(toolUseContext) === undefined ||
          !claudeInChromeSession().lastExecutedTabUrlByScope.has(scopeKey)
        )
          rememberExecutedTabUrl(scopeKey, url);
      }
      if (host) logFeatureOk("chrome_permission_prompt");
      return callResult;
    },
    ignoresWholeToolAllowRule: (input) =>
      CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName) && isBrowserHousekeepingCall(toolName, input),
  };
}
export { getClaudeInChromePermissionOverrides, setChromeBinding };

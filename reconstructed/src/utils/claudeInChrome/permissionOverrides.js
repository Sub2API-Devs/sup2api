/**
 * utils/claudeInChrome/permissionOverrides.ts
 *
 * 2.1.316 新增。Claude in Chrome 工具的权限覆盖：确定动作作用的标签页与主机，校验 browser_batch，必要时弹出权限请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-38x90rmj.js (28)
 * attribution: placement 28
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
import { ce } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { imageLimitsForModel } from "../attachmentMedia.js";
import { maybeResizeAndDownsampleImageBlock } from "../imageResizer.js";
import { CHROME_INPUT_APPROVED_TOOL_NAMES } from "./browserToolSchemas.js";
import {
  isBrowserHousekeepingCall,
  stripCyclesAndHiddenKeys,
} from "../permissions/browserComputerUseTools.js";
import { describeBrowserToolAction } from "../../components/TrustDialog/utils.js";
import { AbortError } from "../errors.js";
import { handleChromeToolCall } from "./chromeMcpServer.js";
import { stripAnthropicMeta } from "../../services/mcp/anthropicMeta.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../services/mcp/client.js";
import { logChromeToolAttempted, noBrowserConnected } from "./telemetry.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { isAutoAllowedInMode, isPlanBypass } from "../permissions/browserToolNames.js";
import { toolMatchesName } from "../../Tool.js";
import { isAutoClassifierActive } from "../permissions/autoModeState.js";
import { forgetClassifierContext } from "../permissions/serverClassifier/context.js";
import { createChromeDomainAllowRule } from "../permissions/permissions.js";

//@ chunk-38x90rmj.js:1314-1423 placement
function normalizedOriginOf(e) {
  let o;
  try {
    o = new URL(e);
  } catch {
    return;
  }
  if (o.host === "") return;
  return `${o.protocol}//${normalizeChromeSite(o.host)}`;
}
//@ chunk-38x90rmj.js:1423-1494 placement
/**
 * 判断两个来源是否不同（任一未知也视为不同）。
 */
function originsDiffer(e, o) {
  let t = normalizedOriginOf(e);
  let i = normalizedOriginOf(o);
  return t === undefined || i === undefined || t !== i;
}
//@ chunk-38x90rmj.js:1494-1610 placement
function tabNavigationFor(e, url) {
  let t = claudeInChromeSession().lastExecutedTabUrlByScope.get(e);
  if (t === undefined) return;
  return originsDiffer(t, url)
    ? {
        from: t,
        to: url,
      }
    : undefined;
}
//@ chunk-38x90rmj.js:1610-1666 placement
/**
 * 记录某作用域最近执行的标签页 URL。
 */
function rememberExecutedTabUrl(e, o) {
  claudeInChromeSession().lastExecutedTabUrlByScope.set(e, o);
}
//@ chunk-38x90rmj.js:1666-1676 placement
/**
 * 按工具调用缓存解析结果的条数上限（200）。
 */
var MAX_RESOLVED_BY_TOOL_USE = 200;
//@ chunk-38x90rmj.js:1676-1761 placement
/**
 * 记录某工具调用解析出的站点。
 */
function rememberResolvedHost(toolUseId, o) {
  let resolvedHostByToolUseId = claudeInChromeSession().resolvedHostByToolUseId;
  if (resolvedHostByToolUseId.size >= MAX_RESOLVED_BY_TOOL_USE) resolvedHostByToolUseId.clear();
  resolvedHostByToolUseId.set(toolUseId, o);
}
//@ chunk-38x90rmj.js:1761-1846 placement
/**
 * 记录某工具调用解析出的 URL。
 */
function rememberResolvedUrl(toolUseId, o) {
  let resolvedUrlByToolUseId = claudeInChromeSession().resolvedUrlByToolUseId;
  if (resolvedUrlByToolUseId.size >= MAX_RESOLVED_BY_TOOL_USE) resolvedUrlByToolUseId.clear();
  resolvedUrlByToolUseId.set(toolUseId, o);
}
//@ chunk-38x90rmj.js:1846-1942 placement
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
//@ chunk-38x90rmj.js:1942-2006 placement
function setChromeBinding(context, socketClient) {
  claudeInChromeSession().bridgeBinding = {
    context,
    socketClient,
  };
}
//@ chunk-38x90rmj.js:2006-2193 placement
/**
 * 是否有总是允许 Chrome 工具的规则
 */
function hasChromeAlwaysAllow(toolPermissionContext, o) {
  let sliced = CFC_TOOL_PREFIX.slice(0, -2);
  let i = `${CFC_TOOL_PREFIX}*`;
  for (let alwaysAllowRule of Object.values(toolPermissionContext.alwaysAllowRules))
    for (let s of alwaysAllowRule ?? []) {
      let replaced = s.replace(/\(\*?\)$/, "");
      if (replaced === o || replaced === sliced || replaced === i) return true;
    }
  return false;
}
//@ chunk-38x90rmj.js:2193-3011 placement
/**
 * 切换/选择浏览器的工具名集合。
 */
var CHROME_TOOL_CLASSES = new Set([
  "tabs_context_mcp",
  "tabs_create_mcp",
  "tabs_close_mcp",
  "resize_window",
  "shortcuts_list",
  "list_connected_browsers",
]);
var BROWSER_SELECT_TOOL_NAMES = new Set(["switch_browser", "select_browser"]);
var CHROME_TOOL_ERROR_MESSAGES = {
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
//@ chunk-38x90rmj.js:3011-3818 placement
/**
 * 检查 browser_batch 结构
 */
function vetBrowserBatch(e, o) {
  let t = [];
  if (e === "browser_batch") {
    if (!Array.isArray(o.actions))
      return {
        kind: "deny",
        code: "batch_malformed_item",
      };
    for (let action of o.actions) {
      if (!isPlainObject(action) || typeof action.name !== "string" || action.name === "browser_batch")
        return {
          kind: "deny",
          code: "batch_malformed_item",
        };
      t.push({
        name: action.name,
        input: isPlainObject(action.input) ? action.input : {},
      });
    }
  } else
    t.push({
      name: e,
      input: o,
    });
  let i = new Set();
  let n = false;
  for (let s of t) {
    if (s.name === "navigate") {
      n = true;
      continue;
    }
    if (BROWSER_SELECT_TOOL_NAMES.has(s.name)) {
      if (t.length > 1)
        return {
          kind: "deny",
          code: "batch_browser_switch",
        };
      continue;
    }
    if (CHROME_TOOL_CLASSES.has(s.name)) continue;
    if (n)
      return {
        kind: "deny",
        code: "batch_after_navigate",
      };
    if (typeof s.input.tabId !== "number")
      return {
        kind: "deny",
        code: "tab_missing",
      };
    i.add(s.input.tabId);
  }
  if (i.size === 0)
    return {
      kind: "none",
    };
  if (i.size > 1)
    return {
      kind: "deny",
      code: "batch_multiple_tabs",
    };
  return {
    kind: "tab",
    tabId: [...i][0],
  };
}
//@ chunk-38x90rmj.js:3818-3948 placement
var CHROME_CALL_BUDGET_MS = 5000;
var CHROME_RETRY_DELAY_MS = 2500;
var RETRYABLE_TIMEOUT_FAILURES = new Set([
  "connect_timeout",
  "no_browser_selected_timeout",
  "browser_selected_late_timeout",
  "answer_timeout",
]);
//@ chunk-38x90rmj.js:3948-5126 placement
/**
 * 确定动作作用的标签页
 */
async function resolveTargetTab(tabId) {
  let o = systemClock.monotonicNow();
  let deferred = Promise.withResolvers();
  let abortController = new AbortController();
  let n = listTabsForPermission({
    onSentToSelectedBrowser: deferred.resolve,
  }).then((a) => {
    abortController.abort();
    return findTargetTab(a, tabId);
  });
  let s = {
    sent: false,
  };
  let u = deferred.promise
    .then(async () => {
      await sleep(CHROME_RETRY_DELAY_MS, abortController.signal);
      let a = CHROME_CALL_BUDGET_MS - (systemClock.monotonicNow() - o);
      let socketClient = claudeInChromeSession().bridgeBinding?.socketClient;
      if (
        abortController.signal.aborted ||
        a <= 0 ||
        socketClient?.isConnected() !== true ||
        socketClient.hasActiveSelection?.() !== true
      )
        return;
      s.sent = true;
      let targetTab = findTargetTab(
        await listTabsForPermission({
          capMs: a,
        }),
        tabId,
      );
      if (parseOkTabUrl(targetTab)) return targetTab;
      if (targetTab.ok || !RETRYABLE_TIMEOUT_FAILURES.has(targetTab.failure)) s.callMs = targetTab.callMs;
      return;
    })
    .catch((error) => {
      logError(error);
      return;
    });
  let winner = await Promise.race([
    n.then(() => {
      return;
    }),
    u,
  ]);
  if (winner === undefined) {
    let a = await n;
    if (s.sent && !a.ok && a.failure === "answer_timeout")
      return {
        ...a,
        failure: "answer_timeout_after_retry",
        retryCallMs: s.callMs,
      };
    return a;
  }
  n.then((a) => {
    let d = {
      connect_ms: a.connectMs,
      call_ms: a.callMs,
      retry_call_ms: winner.callMs,
    };
    let okTabUrl = parseOkTabUrl(a);
    if (okTabUrl) {
      if (normalizeChromeSite(okTabUrl.host) !== normalizeChromeSite(parseOkTabUrl(winner)?.host ?? ""))
        logFeatureSad("chrome_permission_prompt", "tab_lookup_hosts_differed", d);
      return;
    }
    let failure = a.ok ? "non_web_tab_url" : a.failure;
    if (failure === "answer_timeout") {
      logFeatureSad("chrome_permission_prompt", "tab_lookup_rescued_after_answer_timeout", d);
      return;
    }
    logFeatureSad("chrome_permission_prompt", "tab_lookup_rescued_after_failure", {
      ...d,
      first_lookup_failure: fromEnum(failure),
    });
  }).catch(logError);
  return winner;
}
//@ chunk-38x90rmj.js:5126-5252 placement
function chromeCallTimingFields(e) {
  return {
    connect_ms: e.connectMs,
    call_ms: e.callMs,
    ...(!e.ok &&
      e.retryCallMs !== undefined && {
        retry_call_ms: e.retryCallMs,
      }),
  };
}
//@ chunk-38x90rmj.js:5252-5296 placement
/**
 * 取成功结果里的 URL 并解析成主机信息。
 */
function parseOkTabUrl(e) {
  return e.ok ? parseChromeUrl(e.url) : undefined;
}
//@ chunk-38x90rmj.js:5296-5731 placement
/**
 * 在标签列表中找目标标签
 */
function findTargetTab(e, o) {
  if (!e.ok) return e;
  let { tabs, connectMs, callMs } = e;
  let index = tabs.findIndex((tab) => tab == null || tab.tabId === o);
  let u = tabs[index];
  if (index === -1)
    return {
      ok: false,
      failure: tabs.length === 0 ? "empty_tab_list" : "tab_not_listed",
      connectMs,
      callMs,
    };
  if (u == null || typeof u.url !== "string")
    return {
      ok: false,
      failure: "malformed_tab_list",
      connectMs,
      callMs,
    };
  if (u.url === "")
    return {
      ok: false,
      failure: "tab_url_empty",
      connectMs,
      callMs,
    };
  return {
    ok: true,
    url: u.url,
    connectMs,
    callMs,
  };
}
//@ chunk-38x90rmj.js:5731-7399 placement
/**
 * 取标签上下文用于权限判断
 */
async function listTabsForPermission(e) {
  let o = systemClock.monotonicNow();
  let t = {};
  let i;
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
    i = await withTimeout(
      (async () => {
        if (!(await socketClient.ensureConnected())) return "not_connected";
        t.browserSelected = socketClient.hasActiveSelection?.();
        t.startedAt = systemClock.monotonicNow();
        if (t.browserSelected === true) e?.onSentToSelectedBrowser?.();
        let d = await socketClient.callTool(
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
        if (!d) return "empty_result";
        if (d.error) return `tool_error_${classifyToolError("tabs_context_mcp", firstTextContent(d.error))}`;
        let content = d.result?.content;
        let text =
          Array.isArray(content) &&
          content[0] &&
          typeof content[0] === "object" &&
          "text" in content[0] &&
          typeof content[0].text === "string"
            ? content[0].text
            : undefined;
        if (!text) return "no_text";
        let C;
        try {
          C = jsonParse(text);
        } catch {
          return text.includes("createIfEmpty") ? "no_tab_group" : "not_json";
        }
        let availableTabs = C?.availableTabs;
        return Array.isArray(availableTabs) ? availableTabs : "no_tab_list";
      })().catch((error) => {
        if (t.startedAt === undefined) return "connect_threw";
        if (
          error instanceof Error &&
          (error.name === "SocketConnectionError" || error.name === "ToolCallLostError")
        )
          return "connection_lost";
        if (error instanceof NoExtensionConnectedError) return "no_extension";
        if (error instanceof ExtensionDisconnectedMidCallError) return "extension_disconnected";
        return "call_threw";
      }),
      e?.capMs ?? CHROME_CALL_BUDGET_MS,
      "queryTabUrl bridge call",
    ).catch(() => {
      if (t.startedAt === undefined) return "connect_timeout";
      if (socketClient.hasActiveSelection?.() === false) return "no_browser_selected_timeout";
      return t.browserSelected === false ? "browser_selected_late_timeout" : "answer_timeout";
    });
  } catch {
    i = "other_threw";
  }
  let n = systemClock.monotonicNow();
  let connectMs = Math.round((t.startedAt ?? n) - o);
  let callMs = t.startedAt === undefined ? 0 : Math.round(n - t.startedAt);
  return typeof i === "string"
    ? {
        ok: false,
        failure: i,
        connectMs,
        callMs,
      }
    : {
        ok: true,
        tabs: i,
        connectMs,
        callMs,
      };
}
//@ chunk-38x90rmj.js:7399-7457 placement
setProvidedTabsProvider(async () => {
  let e = await listTabsForPermission();
  return e.ok ? e.tabs : undefined;
});
//@ chunk-38x90rmj.js:7525-7621 placement
/**
 * 构造“图片未内联”的占位文本。
 */
function imageOmittedText(e) {
  return {
    type: "text",
    text: `[Image from Claude in Chrome \u2014 ${e}; not inlined]`,
  };
}
//@ chunk-38x90rmj.js:7621-7734 placement
function isSupportedImageMimeType(mimeType) {
  if (!mimeType) return false;
  let lower = firstLineOf(mimeType, ";").trim().toLowerCase();
  return ce.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-38x90rmj.js:7734-8095 placement
/**
 * 转换 Chrome 工具结果中的图片
 */
async function convertChromeResult(e, o) {
  let limits = imageLimitsForModel(o);
  let i = [];
  for (let n of e.content ?? [])
    if (n.type === "text")
      i.push({
        type: "text",
        text: n.text,
      });
    else if (n.type === "image")
      if (isSupportedImageMimeType(n.mimeType))
        try {
          let { block } = await maybeResizeAndDownsampleImageBlock({
            data: String(n.data),
            mediaType: n.mimeType,
            limits,
          });
          i.push(block);
        } catch {
          i.push(imageOmittedText("could not be decoded"));
        }
      else i.push(imageOmittedText(`unsupported type ${n.mimeType ?? "unknown"}`));
  return i;
}
//@ chunk-38x90rmj.js:8095-8307 placement
/**
 * batch 是否需要目标标签
 */
function batchNeedsTab(e) {
  if (!Array.isArray(e.actions)) return false;
  return e.actions.some((action) => {
    if (!isPlainObject(action) || typeof action.name !== "string") return true;
    return (
      action.name === "browser_batch" ||
      (CHROME_INPUT_APPROVED_TOOL_NAMES.has(action.name) &&
        !isBrowserHousekeepingCall(action.name, isPlainObject(action.input) ? action.input : {}))
    );
  });
}
//@ chunk-38x90rmj.js:8307-8730 placement
/**
 * 取 browser_batch 中的导航地址
 */
function batchNavigateUrls(e) {
  if (!Array.isArray(e.actions)) return [];
  let o = [];
  for (let action of e.actions) {
    if (!isPlainObject(action)) continue;
    let input = isPlainObject(action.input) ? action.input : {};
    if (action.name === "browser_batch") {
      let u = batchNavigateUrls(input);
      if (u === "unvettable") return u;
      o.push(...u);
      continue;
    }
    if (action.name !== "navigate" || typeof input.url !== "string") continue;
    let lower = input.url.trim().toLowerCase();
    if (lower === "back" || lower === "forward") continue;
    let chromeUrl = parseChromeUrl(input.url);
    if (!chromeUrl) return "unvettable";
    o.push(chromeUrl.host, hostWithDefaultPort(chromeUrl));
  }
  return o;
}
//@ chunk-38x90rmj.js:8822-8940 placement
function chromePermissionQuestion(e, o, t) {
  let i = describeBrowserToolAction(e, o);
  return t ? `Allow Claude in Chrome to ${i} on ${t}?` : `Allow Claude in Chrome to ${i}?`;
}
//@ chunk-38x90rmj.js:8940-9143 placement
/**
 * 主机是否仍在允许集合
 */
function isHostStillAllowed(allowed, denied) {
  return async (t) => {
    let i;
    try {
      i = new URL(t.url);
    } catch {}
    let n =
      !!i?.host &&
      allowed.has(normalizeChromeSite(i.host)) &&
      !isSiteDenied(
        denied,
        normalizeChromeSite(
          hostWithDefaultPort({
            url: i.href,
          }),
        ),
      );
    if (!n) logFeatureBad("chrome_permission_prompt", "stale_host_mismatch");
    return n;
  };
}
//@ chunk-38x90rmj.js:9143-10233 placement
/**
 * 带权限检查调用 Chrome 工具
 */
async function callChromeWithPermission(toolName, o, signal, mainLoopModel, callOptions, timing, u) {
  let bridgeBinding = claudeInChromeSession().bridgeBinding;
  if (!bridgeBinding) {
    logFeatureBad("chrome_permission_prompt", "binding_missing");
    throw Error("Claude in Chrome bridge is not initialized in this session.");
  }
  if (signal.aborted) throw new AbortError("Claude in Chrome tool call aborted");
  let a;
  let promise = new Promise((resolve, reject) => {
    a = () => reject(new AbortError("Claude in Chrome tool call aborted"));
    signal.addEventListener("abort", a, {
      once: true,
    });
  });
  let r;
  let b = timing?.mark("external");
  try {
    r = await Promise.race([
      handleChromeToolCall(
        bridgeBinding.context,
        bridgeBinding.socketClient,
        toolName,
        stripCyclesAndHiddenKeys(o ?? {}),
        callOptions,
      ),
      promise,
    ]);
  } finally {
    b?.();
    if (a) signal.removeEventListener("abort", a);
  }
  if (r.isError) {
    let k =
      (r.content ?? []).flatMap((S) => (S.type === "text" ? [S.text] : [])).join(`
`) || `${toolName} failed`;
    let _meta = r._meta;
    let toolCallFailureCause = _meta?.toolCallFailureCause;
    let v =
      _meta?.isBridgeTimeout === true
        ? "bridge_timeout"
        : _meta?.isFrontLoadBoundExceeded === true
          ? "front_load_bound_exceeded"
          : toolCallFailureCause === "connection_lost_mid_call" ||
              toolCallFailureCause === "connection_lost_before_call"
            ? toolCallFailureCause
            : undefined;
    let A = isPlainObject(_meta) ? stripAnthropicMeta(_meta) : undefined;
    throw Object.assign(
      new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        k,
        "Claude in Chrome tool returned error",
        A
          ? {
              _meta: A,
            }
          : undefined,
        `chrome_${v ?? classifyToolError(toolName, k)}`,
      ),
      {
        mcpErrorSource: "other",
      },
    );
  }
  let data = await convertChromeResult(await chromeNotConnectedAnswer(r, u), mainLoopModel);
  let y = stripAnthropicMeta(r._meta);
  return {
    data,
    ...(y && {
      mcpMeta: {
        _meta: y,
      },
    }),
  };
}
//@ chunk-38x90rmj.js:10233-16217 placement
/**
 * Claude in Chrome 工具的权限覆盖：确定动作作用的标签页与主机，校验 browser_batch，必要时弹出权限请求。
 */
function getClaudeInChromePermissionOverrides(toolName) {
  let o = `${CFC_TOOL_PREFIX}${toolName}`;
  return {
    checkPermissions: async (n, s) => {
      logChromeToolAttempted(s.options?.messageClientPlatform);
      let toolUseId = s.toolUseId;
      let _ = CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName);
      if (_ && isBrowserHousekeepingCall(toolName, n)) {
        let toolPermissionContext = getToolPermissionContext(s);
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
                name: o,
                description: chromePermissionQuestion(toolName, n, undefined),
              },
            },
          };
        return {
          behavior: "allow",
          updatedInput: n,
        };
      }
      let a =
        (_ && !isBrowserHousekeepingCall(toolName, n)) || (toolName === "browser_batch" && batchNeedsTab(n));
      if (
        toolName === "navigate" &&
        typeof n.url === "string" &&
        (n.url.trim().toLowerCase() === "back" || n.url.trim().toLowerCase() === "forward")
      )
        return {
          behavior: "allow",
          updatedInput: n,
        };
      let d =
        toolName === "browser_batch"
          ? firstSiteActionInBatch(n)
          : {
              input: n,
              toolName,
            };
      let r;
      if (d && d.toolName === "navigate" && typeof d.input.url === "string") {
        r = parseChromeUrl(d.input.url);
        if (!r) {
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
      } else if (d && typeof d.input.tabId === "number") {
        let targetTab = await resolveTargetTab(d.input.tabId);
        if (!targetTab.ok) {
          logFeatureBad(
            "chrome_permission_prompt",
            `tab_url_unresolved_${targetTab.failure}`,
            chromeCallTimingFields(targetTab),
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
        r = parseChromeUrl(targetTab.url);
        if (!r) {
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
      let toolPermissionContext = getToolPermissionContext(s);
      let C = isAutoAllowedInMode(
        s.options?.tools?.find((tool) => toolMatchesName(tool, o)),
        toolPermissionContext,
      );
      let y =
        C === "bypassPermissions" || isPlanBypass(C, toolPermissionContext.isBypassPermissionsModeAvailable);
      let k =
        toolPermissionContext.chromeNavigationClassifierEnabled === true &&
        !y &&
        (toolPermissionContext.chromeClassifierFloorEnabled === true || isAutoClassifierActive(C));
      let h;
      let w;
      let v = () => {
        if (!toolUseId) return;
        if (w === undefined) claudeInChromeSession().resolvedUrlByToolUseId.delete(toolUseId);
        else rememberResolvedUrl(toolUseId, w);
        if (h === undefined) forgetClassifierContext(toolUseId);
      };
      if (k) {
        let p = vetBrowserBatch(toolName, n);
        if (p.kind === "deny") {
          logFeatureBad("chrome_permission_prompt", p.code);
          v();
          return {
            behavior: "deny",
            message: CHROME_TOOL_ERROR_MESSAGES[p.code],
            decisionReason: {
              type: "safetyCheck",
              reason: `Claude in Chrome: ${p.code}`,
              classifierApprovable: false,
            },
          };
        }
        if (p.kind === "tab") {
          let R =
            r && d?.toolName !== "navigate" && d?.input.tabId === p.tabId
              ? {
                  ok: true,
                  url: r.url,
                  connectMs: 0,
                  callMs: 0,
                }
              : await resolveTargetTab(p.tabId);
          let P = R.ok ? parseChromeUrl(R.url) : undefined;
          if (P === undefined) {
            logFeatureBad(
              "chrome_permission_prompt",
              `tab_url_unresolved_${R.ok ? "non_web_tab_url" : R.failure}`,
              chromeCallTimingFields(R),
            );
            v();
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
          h = tabNavigationFor(sessionKeyOrHostKey(), P.url);
          if (!(a && toolPermissionContext.mode === "plan")) w = P.url;
        }
      }
      v();
      let A = toolName === "browser_batch" ? batchNavigateUrls(n) : [];
      if (A === "unvettable") {
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
      let found = [...(r ? [r.host, hostWithDefaultPort(r)] : []), ...A]
        .map((p) => chromeSiteDenyDecision(chromeSiteRules, p))
        .find((p) => p !== undefined);
      if (found) {
        logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
        return found;
      }
      let T = false;
      let M;
      if (r) {
        let p = normalizeChromeSite(r.host);
        let source = chromeSiteRules.sourceOf.get(p) ?? "session";
        T = chromeSiteRules.allowed.has(p);
        M = T ? createChromeDomainAllowRule(r.host, source) : undefined;
        if (T && h === undefined && toolPermissionContext.chromeClassifierFloorEnabled !== true && !a) {
          if (toolUseId) rememberResolvedHost(toolUseId, r);
          return {
            behavior: "allow",
            updatedInput: n,
            decisionReason: {
              type: "rule",
              rule: createChromeDomainAllowRule(r.host, source),
            },
          };
        }
        if (
          toolUseId &&
          (T ||
            toolPermissionContext.chromeClassifierFloorEnabled === true ||
            !hasChromeAlwaysAllow(toolPermissionContext, o))
        )
          rememberResolvedHost(toolUseId, r);
      }
      let bridgeBinding = claudeInChromeSession().bridgeBinding;
      if (
        toolUseId &&
        bridgeBinding &&
        !y &&
        !(
          toolPermissionContext.chromeClassifierFloorEnabled !== true &&
          hasChromeAlwaysAllow(toolPermissionContext, o)
        ) &&
        (await noBrowserConnected(s.abortController.signal))
      )
        return {
          behavior: "deny",
          message: bridgeBinding.context.onToolCallDisconnected(),
          decisionReason: {
            type: "other",
            reason: "Claude in Chrome: no browser connected",
          },
        };
      if (a && toolPermissionContext.mode === "plan")
        return {
          behavior: "passthrough",
          message: "Claude in Chrome requires permission.",
          suggestions: [
            {
              type: "addRules",
              rules: [
                {
                  toolName: o,
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
        suggestions: r
          ? T
            ? undefined
            : [
                {
                  type: "addRules",
                  rules: [
                    {
                      toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                      ruleContent: r.host,
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
                    toolName: o,
                    ruleContent: undefined,
                  },
                ],
                behavior: "allow",
                destination: "session",
              },
            ],
        decisionReason: h
          ? {
              type: "safetyCheck",
              reason: "Claude in Chrome: cross-site navigation pending",
              classifierApprovable: true,
            }
          : {
              type: "other",
              reason: r ? `Claude in Chrome action on ${r.host}` : "Claude in Chrome action",
            },
        metadata: {
          command: {
            name: o,
            description: chromePermissionQuestion(toolName, n, r?.host),
            chrome: r
              ? {
                  ...r,
                  domainAllowed: T,
                  navigation: h,
                  ...(M && {
                    grantRule: M,
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
    call: async (n, s, u, _, a, d) => {
      let toolUseId = s.toolUseId;
      let b = toolUseId ? claudeInChromeSession().resolvedHostByToolUseId.get(toolUseId) : undefined;
      let host = b?.host;
      let y = toolUseId ? claudeInChromeSession().resolvedUrlByToolUseId.get(toolUseId) : undefined;
      if (toolUseId) {
        claudeInChromeSession().resolvedHostByToolUseId.delete(toolUseId);
        claudeInChromeSession().resolvedUrlByToolUseId.delete(toolUseId);
      }
      let toolPermissionContext = getToolPermissionContext(s);
      let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
      let allowed = chromeSiteRules.allowed;
      let v = [...chromeSiteRules.allowedRaw];
      if (host && !allowed.has(normalizeChromeSite(host))) {
        allowed.add(normalizeChromeSite(host));
        v.push(host);
      }
      let found = s.options?.tools?.find((tool) => toolMatchesName(tool, o));
      let S = isAutoAllowedInMode(found, toolPermissionContext);
      let E =
        S === "bypassPermissions" ||
        (S === "auto" &&
          s.autoModeClassified === true &&
          host !== undefined &&
          chromeSiteRules.denied.size === 0 &&
          b?.keepHostPin !== true);
      let sessionScope = permissionScopeOfSession();
      let M = E
        ? {
            permissionMode: "skip_all_permission_checks",
            sessionScope,
          }
        : host
          ? {
              permissionMode: "follow_a_plan",
              allowedDomains: v,
              onPermissionRequest: isHostStillAllowed(allowed, chromeSiteRules.denied),
              sessionScope,
            }
          : v.length > 0
            ? {
                permissionMode: "follow_a_plan",
                allowedDomains: v,
                sessionScope,
              }
            : {
                permissionMode: "ask",
                sessionScope,
              };
      let I = await callChromeWithPermission(
        toolName,
        n,
        s.abortController.signal,
        s.options.mainLoopModel,
        M,
        d?.timing,
        s,
      );
      if (y !== undefined) rememberExecutedTabUrl(sessionKeyOrHostKey(), y);
      if (host) logFeatureOk("chrome_permission_prompt");
      return I;
    },
    ignoresWholeToolAllowRule: (n) =>
      CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName) && isBrowserHousekeepingCall(toolName, n),
  };
}
export { getClaudeInChromePermissionOverrides };

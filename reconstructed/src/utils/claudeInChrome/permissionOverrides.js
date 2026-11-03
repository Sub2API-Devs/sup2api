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
  K$r,
  chromeNotConnectedAnswer,
  firstSiteActionInBatch,
  collectChromeSiteRules,
  chromeSiteDenyDecision,
} from "./chromePermissionRules.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { dHo, ycn } from "../hostSuppliedKey.js";
import { getSessionId } from "../../bootstrap/state.js";
import {
  CFC_TOOL_PREFIX,
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
} from "./common.js";
import { isPlainObject } from "../isPlainObject.js";
import { Aa, sleep, withTimeout } from "../sleep.js";
import { logError } from "../log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { classifyToolError, firstTextContent } from "./toolErrorClassification.js";
import { jsonParse } from "../slowOperations.js";
import { NoExtensionConnectedError, ExtensionDisconnectedMidCallError } from "./socketClient.js";
import { s2s } from "./tabsProvider.js";
import { firstLineOf } from "../stringUtils.js";
import { ce } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { imageLimitsForModel } from "../attachmentMedia.js";
import { maybeResizeAndDownsampleImageBlock } from "../imageResizer.js";
import { Goe } from "./browserToolSchemas.js";
import { ise, stripCyclesAndHiddenKeys } from "../permissions/browserComputerUseTools.js";
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
import { Fbt } from "../permissions/serverClassifier/context.js";
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
function Z(e, o) {
  let t = normalizedOriginOf(e),
    i = normalizedOriginOf(o);
  return t === void 0 || i === void 0 || t !== i;
}
//@ chunk-38x90rmj.js:1494-1610 placement
function tabNavigationFor(e, o) {
  let t = Yi().lastExecutedTabUrlByScope.get(e);
  if (t === void 0) return;
  return Z(t, o) ? { from: t, to: o } : void 0;
}
//@ chunk-38x90rmj.js:1610-1666 placement
function F(e, o) {
  Yi().lastExecutedTabUrlByScope.set(e, o);
}
//@ chunk-38x90rmj.js:1666-1676 placement
var Y = 200;
//@ chunk-38x90rmj.js:1676-1761 placement
function B(e, o) {
  let resolvedHostByToolUseId = Yi().resolvedHostByToolUseId;
  if (resolvedHostByToolUseId.size >= Y) resolvedHostByToolUseId.clear();
  resolvedHostByToolUseId.set(e, o);
}
//@ chunk-38x90rmj.js:1761-1846 placement
function ee(e, o) {
  let resolvedUrlByToolUseId = Yi().resolvedUrlByToolUseId;
  if (resolvedUrlByToolUseId.size >= Y) resolvedUrlByToolUseId.clear();
  resolvedUrlByToolUseId.set(e, o);
}
//@ chunk-38x90rmj.js:1846-1942 placement
function W() {
  let { key: key, fromHost: fromHost } = dHo();
  if (fromHost) return { sessionId: key };
  let t = getSessionId();
  return { sessionId: t };
}
//@ chunk-38x90rmj.js:1942-2006 placement
function setChromeBinding(e, o) {
  Yi().bridgeBinding = { context: e, socketClient: o };
}
/**
 * 是否有总是允许 Chrome 工具的规则
 */
//@ chunk-38x90rmj.js:2006-2193 placement
function hasChromeAlwaysAllow(e, o) {
  let sliced = CFC_TOOL_PREFIX.slice(0, -2),
    i = `${CFC_TOOL_PREFIX}*`;
  for (let n of Object.values(e.alwaysAllowRules))
    for (let s of n ?? []) {
      let replaced = s.replace(/\(\*?\)$/, "");
      if (replaced === o || replaced === sliced || replaced === i) return !0;
    }
  return !1;
}
/**
 * Chrome 工具分类与拒绝文案
 */
//@ chunk-38x90rmj.js:2193-3011 placement
var CHROME_TOOL_CLASSES = new Set([
    "tabs_context_mcp",
    "tabs_create_mcp",
    "tabs_close_mcp",
    "resize_window",
    "shortcuts_list",
    "list_connected_browsers",
  ]),
  re = new Set(["switch_browser", "select_browser"]),
  ne = {
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
/**
 * 检查 browser_batch 结构
 */
//@ chunk-38x90rmj.js:3011-3818 placement
function vetBrowserBatch(e, o) {
  let t = [];
  if (e === "browser_batch") {
    if (!Array.isArray(o.actions)) return { kind: "deny", code: "batch_malformed_item" };
    for (let action of o.actions) {
      if (!isPlainObject(action) || typeof action.name !== "string" || action.name === "browser_batch")
        return { kind: "deny", code: "batch_malformed_item" };
      t.push({ name: action.name, input: isPlainObject(action.input) ? action.input : {} });
    }
  } else t.push({ name: e, input: o });
  let i = new Set(),
    n = !1;
  for (let s of t) {
    if (s.name === "navigate") {
      n = !0;
      continue;
    }
    if (re.has(s.name)) {
      if (t.length > 1) return { kind: "deny", code: "batch_browser_switch" };
      continue;
    }
    if (CHROME_TOOL_CLASSES.has(s.name)) continue;
    if (n) return { kind: "deny", code: "batch_after_navigate" };
    if (typeof s.input.tabId !== "number") return { kind: "deny", code: "tab_missing" };
    i.add(s.input.tabId);
  }
  if (i.size === 0) return { kind: "none" };
  if (i.size > 1) return { kind: "deny", code: "batch_multiple_tabs" };
  return { kind: "tab", tabId: [...i][0] };
}
//@ chunk-38x90rmj.js:3818-3948 placement
var CHROME_CALL_BUDGET_MS = 5000,
  CHROME_RETRY_DELAY_MS = 2500,
  RETRYABLE_TIMEOUT_FAILURES = new Set([
    "connect_timeout",
    "no_browser_selected_timeout",
    "browser_selected_late_timeout",
    "answer_timeout",
  ]);
/**
 * 确定动作作用的标签页
 */
//@ chunk-38x90rmj.js:3948-5126 placement
async function resolveTargetTab(e) {
  let monotonicNow = Aa.monotonicNow(),
    withResolvers = Promise.withResolvers(),
    abortController = new AbortController(),
    n = listTabsForPermission({ onSentToSelectedBrowser: withResolvers.resolve }).then(
      (a) => (abortController.abort(), findTargetTab(a, e)),
    ),
    s = { sent: !1 },
    u = withResolvers.promise
      .then(async () => {
        await sleep(CHROME_RETRY_DELAY_MS, abortController.signal);
        let a = CHROME_CALL_BUDGET_MS - (Aa.monotonicNow() - monotonicNow),
          d = Yi().bridgeBinding?.socketClient;
        if (
          abortController.signal.aborted ||
          a <= 0 ||
          d?.isConnected() !== !0 ||
          d.hasActiveSelection?.() !== !0
        )
          return;
        s.sent = !0;
        let r = findTargetTab(await listTabsForPermission({ capMs: a }), e);
        if (U(r)) return r;
        if (r.ok || !RETRYABLE_TIMEOUT_FAILURES.has(r.failure)) s.callMs = r.callMs;
        return;
      })
      .catch((a) => {
        logError(a);
        return;
      }),
    winner = await Promise.race([
      n.then(() => {
        return;
      }),
      u,
    ]);
  if (winner === void 0) {
    let a = await n;
    if (s.sent && !a.ok && a.failure === "answer_timeout")
      return { ...a, failure: "answer_timeout_after_retry", retryCallMs: s.callMs };
    return a;
  }
  return (
    n
      .then((a) => {
        let d = { connect_ms: a.connectMs, call_ms: a.callMs, retry_call_ms: winner.callMs },
          r = U(a);
        if (r) {
          if (normalizeChromeSite(r.host) !== normalizeChromeSite(U(winner)?.host ?? ""))
            logFeatureSad("chrome_permission_prompt", "tab_lookup_hosts_differed", d);
          return;
        }
        let b = a.ok ? "non_web_tab_url" : a.failure;
        if (b === "answer_timeout") {
          logFeatureSad("chrome_permission_prompt", "tab_lookup_rescued_after_answer_timeout", d);
          return;
        }
        logFeatureSad("chrome_permission_prompt", "tab_lookup_rescued_after_failure", {
          ...d,
          first_lookup_failure: fromEnum(b),
        });
      })
      .catch(logError),
    winner
  );
}
//@ chunk-38x90rmj.js:5126-5252 placement
function chromeCallTimingFields(e) {
  return {
    connect_ms: e.connectMs,
    call_ms: e.callMs,
    ...(!e.ok && e.retryCallMs !== void 0 && { retry_call_ms: e.retryCallMs }),
  };
}
//@ chunk-38x90rmj.js:5252-5296 placement
function U(e) {
  return e.ok ? parseChromeUrl(e.url) : void 0;
}
/**
 * 在标签列表中找目标标签
 */
//@ chunk-38x90rmj.js:5296-5731 placement
function findTargetTab(e, o) {
  if (!e.ok) return e;
  let { tabs: tabs, connectMs: connectMs, callMs: callMs } = e,
    index = tabs.findIndex((_) => _ == null || _.tabId === o),
    u = tabs[index];
  if (index === -1)
    return {
      ok: !1,
      failure: tabs.length === 0 ? "empty_tab_list" : "tab_not_listed",
      connectMs: connectMs,
      callMs: callMs,
    };
  if (u == null || typeof u.url !== "string")
    return { ok: !1, failure: "malformed_tab_list", connectMs: connectMs, callMs: callMs };
  if (u.url === "") return { ok: !1, failure: "tab_url_empty", connectMs: connectMs, callMs: callMs };
  return { ok: !0, url: u.url, connectMs: connectMs, callMs: callMs };
}
/**
 * 取标签上下文用于权限判断
 */
//@ chunk-38x90rmj.js:5731-7399 placement
async function listTabsForPermission(e) {
  let monotonicNow = Aa.monotonicNow(),
    t = {},
    i;
  try {
    let bridgeBinding = Yi().bridgeBinding;
    if (!bridgeBinding) return { ok: !1, failure: "binding_missing", connectMs: 0, callMs: 0 };
    let { socketClient: socketClient } = bridgeBinding;
    i = await withTimeout(
      (async () => {
        if (!(await socketClient.ensureConnected())) return "not_connected";
        if (
          ((t.browserSelected = socketClient.hasActiveSelection?.()),
          (t.startedAt = Aa.monotonicNow()),
          t.browserSelected === !0)
        )
          e?.onSentToSelectedBrowser?.();
        let callTool = await socketClient.callTool(
          "tabs_context_mcp",
          { createIfEmpty: !1, includePermissionState: !1 },
          { permissionMode: "ask", sessionScope: W() },
        );
        if (!callTool) return "empty_result";
        if (callTool.error)
          return `tool_error_${classifyToolError("tabs_context_mcp", firstTextContent(callTool.error))}`;
        let r = callTool.result?.content,
          b =
            Array.isArray(r) &&
            r[0] &&
            typeof r[0] === "object" &&
            "text" in r[0] &&
            typeof r[0].text === "string"
              ? r[0].text
              : void 0;
        if (!b) return "no_text";
        let C;
        try {
          C = jsonParse(b);
        } catch {
          return b.includes("createIfEmpty") ? "no_tab_group" : "not_json";
        }
        let y = C?.availableTabs;
        return Array.isArray(y) ? y : "no_tab_list";
      })().catch((d) => {
        if (t.startedAt === void 0) return "connect_threw";
        if (d instanceof Error && (d.name === "SocketConnectionError" || d.name === "ToolCallLostError"))
          return "connection_lost";
        if (d instanceof NoExtensionConnectedError) return "no_extension";
        if (d instanceof ExtensionDisconnectedMidCallError) return "extension_disconnected";
        return "call_threw";
      }),
      e?.capMs ?? CHROME_CALL_BUDGET_MS,
      "queryTabUrl bridge call",
    ).catch(() => {
      if (t.startedAt === void 0) return "connect_timeout";
      if (socketClient.hasActiveSelection?.() === !1) return "no_browser_selected_timeout";
      return t.browserSelected === !1 ? "browser_selected_late_timeout" : "answer_timeout";
    });
  } catch {
    i = "other_threw";
  }
  let monotonicNow_2 = Aa.monotonicNow(),
    rounded = Math.round((t.startedAt ?? monotonicNow_2) - monotonicNow),
    u = t.startedAt === void 0 ? 0 : Math.round(monotonicNow_2 - t.startedAt);
  return typeof i === "string"
    ? { ok: !1, failure: i, connectMs: rounded, callMs: u }
    : { ok: !0, tabs: i, connectMs: rounded, callMs: u };
}
//@ chunk-38x90rmj.js:7399-7457 placement
s2s(async () => {
  let e = await listTabsForPermission();
  return e.ok ? e.tabs : void 0;
});
//@ chunk-38x90rmj.js:7525-7621 placement
function z(e) {
  return { type: "text", text: `[Image from Claude in Chrome \u2014 ${e}; not inlined]` };
}
//@ chunk-38x90rmj.js:7621-7734 placement
function isSupportedImageMimeType(e) {
  if (!e) return !1;
  let lower = firstLineOf(e, ";").trim().toLowerCase();
  return ce.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
/**
 * 转换 Chrome 工具结果中的图片
 */
//@ chunk-38x90rmj.js:7734-8095 placement
async function convertChromeResult(e, o) {
  let t = imageLimitsForModel(o),
    i = [];
  for (let n of e.content ?? [])
    if (n.type === "text") i.push({ type: "text", text: n.text });
    else if (n.type === "image")
      if (isSupportedImageMimeType(n.mimeType))
        try {
          let { block: block } = await maybeResizeAndDownsampleImageBlock({
            data: String(n.data),
            mediaType: n.mimeType,
            limits: t,
          });
          i.push(block);
        } catch {
          i.push(z("could not be decoded"));
        }
      else i.push(z(`unsupported type ${n.mimeType ?? "unknown"}`));
  return i;
}
/**
 * batch 是否需要目标标签
 */
//@ chunk-38x90rmj.js:8095-8307 placement
function batchNeedsTab(e) {
  if (!Array.isArray(e.actions)) return !1;
  return e.actions.some((action) => {
    if (!isPlainObject(action) || typeof action.name !== "string") return !0;
    return (
      action.name === "browser_batch" ||
      (Goe.has(action.name) && !ise(action.name, isPlainObject(action.input) ? action.input : {}))
    );
  });
}
/**
 * 取 browser_batch 中的导航地址
 */
//@ chunk-38x90rmj.js:8307-8730 placement
function batchNavigateUrls(e) {
  if (!Array.isArray(e.actions)) return [];
  let o = [];
  for (let action of e.actions) {
    if (!isPlainObject(action)) continue;
    let i = isPlainObject(action.input) ? action.input : {};
    if (action.name === "browser_batch") {
      let u = batchNavigateUrls(i);
      if (u === "unvettable") return u;
      o.push(...u);
      continue;
    }
    if (action.name !== "navigate" || typeof i.url !== "string") continue;
    let lower = i.url.trim().toLowerCase();
    if (lower === "back" || lower === "forward") continue;
    let s = parseChromeUrl(i.url);
    if (!s) return "unvettable";
    o.push(s.host, hostWithDefaultPort(s));
  }
  return o;
}
//@ chunk-38x90rmj.js:8822-8940 placement
function chromePermissionQuestion(e, o, t) {
  let i = describeBrowserToolAction(e, o);
  return t ? `Allow Claude in Chrome to ${i} on ${t}?` : `Allow Claude in Chrome to ${i}?`;
}
/**
 * 主机是否仍在允许集合
 */
//@ chunk-38x90rmj.js:8940-9143 placement
function isHostStillAllowed(e, o) {
  return async (t) => {
    let i;
    try {
      i = new URL(t.url);
    } catch {}
    let n =
      !!i?.host &&
      e.has(normalizeChromeSite(i.host)) &&
      !K$r(o, normalizeChromeSite(hostWithDefaultPort({ url: i.href })));
    if (!n) logFeatureBad("chrome_permission_prompt", "stale_host_mismatch");
    return n;
  };
}
/**
 * 带权限检查调用 Chrome 工具
 */
//@ chunk-38x90rmj.js:9143-10233 placement
async function callChromeWithPermission(e, o, t, i, n, s, u) {
  let bridgeBinding = Yi().bridgeBinding;
  if (!bridgeBinding)
    throw (
      logFeatureBad("chrome_permission_prompt", "binding_missing"),
      Error("Claude in Chrome bridge is not initialized in this session.")
    );
  if (t.aborted) throw new AbortError("Claude in Chrome tool call aborted");
  let a,
    promise = new Promise((k, h) => {
      ((a = () => h(new AbortError("Claude in Chrome tool call aborted"))),
        t.addEventListener("abort", a, { once: !0 }));
    }),
    r,
    b = s?.mark("external");
  try {
    r = await Promise.race([
      handleChromeToolCall(
        bridgeBinding.context,
        bridgeBinding.socketClient,
        e,
        stripCyclesAndHiddenKeys(o ?? {}),
        n,
      ),
      promise,
    ]);
  } finally {
    if ((b?.(), a)) t.removeEventListener("abort", a);
  }
  if (r.isError) {
    let k =
        (r.content ?? []).flatMap((S) => (S.type === "text" ? [S.text] : [])).join(`
`) || `${e} failed`,
      _meta = r._meta,
      w = _meta?.toolCallFailureCause,
      v =
        _meta?.isBridgeTimeout === !0
          ? "bridge_timeout"
          : _meta?.isFrontLoadBoundExceeded === !0
            ? "front_load_bound_exceeded"
            : w === "connection_lost_mid_call" || w === "connection_lost_before_call"
              ? w
              : void 0,
      A = isPlainObject(_meta) ? stripAnthropicMeta(_meta) : void 0;
    throw Object.assign(
      new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        k,
        "Claude in Chrome tool returned error",
        A ? { _meta: A } : void 0,
        `chrome_${v ?? classifyToolError(e, k)}`,
      ),
      { mcpErrorSource: "other" },
    );
  }
  let C = await convertChromeResult(await chromeNotConnectedAnswer(r, u), i),
    y = stripAnthropicMeta(r._meta);
  return { data: C, ...(y && { mcpMeta: { _meta: y } }) };
}
/**
 * Claude in Chrome 工具的权限覆盖：确定动作作用的标签页与主机，校验 browser_batch，必要时弹出权限请求。
 */
//@ chunk-38x90rmj.js:10233-16217 placement
function getClaudeInChromePermissionOverrides(e) {
  let o = `${CFC_TOOL_PREFIX}${e}`;
  return {
    checkPermissions: async (n, s) => {
      logChromeToolAttempted(s.options?.messageClientPlatform);
      let toolUseId = s.toolUseId,
        _ = Goe.has(e);
      if (_ && ise(e, n)) {
        let p = getToolPermissionContext(s);
        if (
          p?.chromeHostToolAsksEnabled !== !1 &&
          p?.mcpAskForTools?.[CLAUDE_IN_CHROME_MCP_SERVER_NAME]?.includes(e) === !0 &&
          p.shouldAvoidPermissionPrompts !== !0 &&
          p.mode !== "dontAsk"
        )
          return {
            behavior: "ask",
            message: "Claude in Chrome requires permission.",
            suppressAlwaysAllowRule: !0,
            decisionReason: { type: "other", reason: "Claude in Chrome action" },
            metadata: { command: { name: o, description: chromePermissionQuestion(e, n, void 0) } },
          };
        return { behavior: "allow", updatedInput: n };
      }
      let a = (_ && !ise(e, n)) || (e === "browser_batch" && batchNeedsTab(n));
      if (
        e === "navigate" &&
        typeof n.url === "string" &&
        (n.url.trim().toLowerCase() === "back" || n.url.trim().toLowerCase() === "forward")
      )
        return { behavior: "allow", updatedInput: n };
      let d = e === "browser_batch" ? firstSiteActionInBatch(n) : { input: n, toolName: e },
        r;
      if (d && d.toolName === "navigate" && typeof d.input.url === "string") {
        if (((r = parseChromeUrl(d.input.url)), !r))
          return (
            logFeatureBad("chrome_permission_prompt", "non_web_url"),
            {
              behavior: "deny",
              message:
                "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Claude in Chrome: non-web or unparseable URL",
                classifierApprovable: !1,
              },
            }
          );
      } else if (d && typeof d.input.tabId === "number") {
        let p = await resolveTargetTab(d.input.tabId);
        if (!p.ok)
          return (
            logFeatureBad(
              "chrome_permission_prompt",
              `tab_url_unresolved_${p.failure}`,
              chromeCallTimingFields(p),
            ),
            {
              behavior: "deny",
              message:
                "Couldn't determine which page this action targets. Re-read tabs_context_mcp and try again.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Claude in Chrome: tab URL unresolved",
                classifierApprovable: !1,
              },
            }
          );
        if (((r = parseChromeUrl(p.url)), !r))
          return (
            logFeatureBad("chrome_permission_prompt", "non_web_tab_url"),
            {
              behavior: "deny",
              message:
                "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Claude in Chrome: non-web or unparseable tab URL",
                classifierApprovable: !1,
              },
            }
          );
      }
      let b = getToolPermissionContext(s),
        C = isAutoAllowedInMode(
          s.options?.tools?.find((p) => toolMatchesName(p, o)),
          b,
        ),
        y = C === "bypassPermissions" || isPlanBypass(C, b.isBypassPermissionsModeAvailable),
        k =
          b.chromeNavigationClassifierEnabled === !0 &&
          !y &&
          (b.chromeClassifierFloorEnabled === !0 || isAutoClassifierActive(C)),
        h,
        w,
        v = () => {
          if (!toolUseId) return;
          if (w === void 0) Yi().resolvedUrlByToolUseId.delete(toolUseId);
          else ee(toolUseId, w);
          if (h === void 0) Fbt(toolUseId);
        };
      if (k) {
        let p = vetBrowserBatch(e, n);
        if (p.kind === "deny")
          return (
            logFeatureBad("chrome_permission_prompt", p.code),
            v(),
            {
              behavior: "deny",
              message: ne[p.code],
              decisionReason: {
                type: "safetyCheck",
                reason: `Claude in Chrome: ${p.code}`,
                classifierApprovable: !1,
              },
            }
          );
        if (p.kind === "tab") {
          let R =
              r && d?.toolName !== "navigate" && d?.input.tabId === p.tabId
                ? { ok: !0, url: r.url, connectMs: 0, callMs: 0 }
                : await resolveTargetTab(p.tabId),
            P = R.ok ? parseChromeUrl(R.url) : void 0;
          if (P === void 0)
            return (
              logFeatureBad(
                "chrome_permission_prompt",
                `tab_url_unresolved_${R.ok ? "non_web_tab_url" : R.failure}`,
                chromeCallTimingFields(R),
              ),
              v(),
              {
                behavior: "deny",
                message:
                  "Couldn't determine which page this action targets. Re-read tabs_context_mcp and try again.",
                decisionReason: {
                  type: "safetyCheck",
                  reason: "Claude in Chrome: tab URL unresolved",
                  classifierApprovable: !1,
                },
              }
            );
          if (((h = tabNavigationFor(ycn(), P.url)), !(a && b.mode === "plan"))) w = P.url;
        }
      }
      v();
      let A = e === "browser_batch" ? batchNavigateUrls(n) : [];
      if (A === "unvettable")
        return (
          logFeatureBad("chrome_permission_prompt", "non_web_url"),
          {
            behavior: "deny",
            message:
              "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
            decisionReason: {
              type: "safetyCheck",
              reason: "Claude in Chrome: non-web or unparseable URL",
              classifierApprovable: !1,
            },
          }
        );
      let S = collectChromeSiteRules(b),
        found = [...(r ? [r.host, hostWithDefaultPort(r)] : []), ...A]
          .map((p) => chromeSiteDenyDecision(S, p))
          .find((p) => p !== void 0);
      if (found) return (logFeatureSad("chrome_permission_prompt", "domain_rule_denied"), found);
      let T = !1,
        M;
      if (r) {
        let p = normalizeChromeSite(r.host),
          R = S.sourceOf.get(p) ?? "session";
        if (
          ((T = S.allowed.has(p)),
          (M = T ? createChromeDomainAllowRule(r.host, R) : void 0),
          T && h === void 0 && b.chromeClassifierFloorEnabled !== !0 && !a)
        ) {
          if (toolUseId) B(toolUseId, r);
          return {
            behavior: "allow",
            updatedInput: n,
            decisionReason: { type: "rule", rule: createChromeDomainAllowRule(r.host, R) },
          };
        }
        if (toolUseId && (T || b.chromeClassifierFloorEnabled === !0 || !hasChromeAlwaysAllow(b, o)))
          B(toolUseId, r);
      }
      let bridgeBinding = Yi().bridgeBinding;
      if (
        toolUseId &&
        bridgeBinding &&
        !y &&
        !(b.chromeClassifierFloorEnabled !== !0 && hasChromeAlwaysAllow(b, o)) &&
        (await noBrowserConnected(s.abortController.signal))
      )
        return {
          behavior: "deny",
          message: bridgeBinding.context.onToolCallDisconnected(),
          decisionReason: { type: "other", reason: "Claude in Chrome: no browser connected" },
        };
      if (a && b.mode === "plan")
        return {
          behavior: "passthrough",
          message: "Claude in Chrome requires permission.",
          suggestions: [
            {
              type: "addRules",
              rules: [{ toolName: o, ruleContent: void 0 }],
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
            ? void 0
            : [
                {
                  type: "addRules",
                  rules: [{ toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, ruleContent: r.host }],
                  behavior: "allow",
                  destination: "session",
                },
              ]
          : [
              {
                type: "addRules",
                rules: [{ toolName: o, ruleContent: void 0 }],
                behavior: "allow",
                destination: "session",
              },
            ],
        decisionReason: h
          ? {
              type: "safetyCheck",
              reason: "Claude in Chrome: cross-site navigation pending",
              classifierApprovable: !0,
            }
          : { type: "other", reason: r ? `Claude in Chrome action on ${r.host}` : "Claude in Chrome action" },
        metadata: {
          command: {
            name: o,
            description: chromePermissionQuestion(e, n, r?.host),
            chrome: r
              ? {
                  ...r,
                  domainAllowed: T,
                  navigation: h,
                  ...(M && {
                    grantRule: M,
                    classifierUnavailable:
                      b.chromeClassifierFloorEnabled === !0 && b.canAutoClassifierRun === !1,
                  }),
                }
              : void 0,
          },
        },
      };
    },
    call: async (n, s, u, _, a, d) => {
      let toolUseId = s.toolUseId,
        b = toolUseId ? Yi().resolvedHostByToolUseId.get(toolUseId) : void 0,
        C = b?.host,
        y = toolUseId ? Yi().resolvedUrlByToolUseId.get(toolUseId) : void 0;
      if (toolUseId)
        (Yi().resolvedHostByToolUseId.delete(toolUseId), Yi().resolvedUrlByToolUseId.delete(toolUseId));
      let k = getToolPermissionContext(s),
        h = collectChromeSiteRules(k),
        allowed = h.allowed,
        v = [...h.allowedRaw];
      if (C && !allowed.has(normalizeChromeSite(C))) (allowed.add(normalizeChromeSite(C)), v.push(C));
      let A = s.options?.tools?.find((p) => toolMatchesName(p, o)),
        S = isAutoAllowedInMode(A, k),
        E =
          S === "bypassPermissions" ||
          (S === "auto" &&
            s.autoModeClassified === !0 &&
            C !== void 0 &&
            h.denied.size === 0 &&
            b?.keepHostPin !== !0),
        T = W(),
        M = E
          ? { permissionMode: "skip_all_permission_checks", sessionScope: T }
          : C
            ? {
                permissionMode: "follow_a_plan",
                allowedDomains: v,
                onPermissionRequest: isHostStillAllowed(allowed, h.denied),
                sessionScope: T,
              }
            : v.length > 0
              ? { permissionMode: "follow_a_plan", allowedDomains: v, sessionScope: T }
              : { permissionMode: "ask", sessionScope: T },
        I = await callChromeWithPermission(
          e,
          n,
          s.abortController.signal,
          s.options.mainLoopModel,
          M,
          d?.timing,
          s,
        );
      if (y !== void 0) F(ycn(), y);
      if (C) logFeatureOk("chrome_permission_prompt");
      return I;
    },
    ignoresWholeToolAllowRule: (n) => Goe.has(e) && ise(e, n),
  };
}

export { getClaudeInChromePermissionOverrides };

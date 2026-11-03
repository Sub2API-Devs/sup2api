/**
 * services/api/teleportRelay.ts
 *
 * teleport 中继请求（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r1wk8q25.js (13)
 * attribution: placement 13
 */
import { jsonStringifyRaw, jsonParseRaw } from "../../utils/slowOperations.js";
import {
  closeOpenRelayBootVerdict,
  getTeleportCacheState,
  revertTeleportCache,
  noteRelayDispatch,
  noteForkWentDirect,
  logTeleportFallbackOnce,
  noteRelayFallback,
  revertAfterDirectServe,
  isPreAnchorIntact,
  hasForkGoneDirect,
  verifyPreAnchorIntact,
  toolsBaselineVerdict,
  verifyToolsBaselineIntact,
  relayTakesGzip,
  noteRelayRefusedGzip,
  registerRelayFetch,
} from "../teleport/relayState.js";
import { logForDebugging } from "../../utils/debug.js";
import { getTeleportRelayEnvConfig } from "../../utils/teleport/relayEnv.js";
import {
  accountMemoryRedactionActive,
  isAccountMemoryAttachment,
} from "../../utils/messages/accountMemory.js";
import { logError } from "../../utils/log.js";
import { isThinkingOrEmptyText, thinkingRemovedPlaceholder } from "../../utils/messages.js";
import {
  NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS,
  getNonstreamingFallbackTimeoutMs,
  UPGRADE_RELAY_USAGE_LIMIT,
  UPGRADE_RELAY_REQUEST_CLASS,
  UPGRADE_RELAY_INHERITED_TOOLS,
} from "./claude.js";
import { fetchWithRequestBodyCompression, isSerialisedBody } from "./gzipRequestBody.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isSameOriginAsCcr } from "../mcp/ccrMcpUrls.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { getSessionIngressAuthHeaders } from "../../utils/sessionIngressAuth.js";
import { ANTHROPIC_USAGE_LIMIT } from "../lowPriority/headers.js";
import { REQUEST_CLASSES, X_CLAUDE_CODE_REQUEST_CLASS } from "./requestHeaders.js";
import { SANDY_PLOVER_HEADER, UNREADABLE_TOOLS_BEFORE_SUMMARY } from "./clientHelpers.js";
import { TOOL_NAME_PATTERN } from "../../bootstrap/stateSlices.js";
import { testGuardedFetch } from "../../utils/testNetworkGuard.js";
import { mcpProxyFetchOptions } from "../mcp/agentProxyFallback.js";
import { takesRequestBodyBytes, markTakesRequestBodyBytes } from "./incrementalRequestBody.js";

//@ chunk-r1wk8q25.js:12238-12368 placement
function appendJsonFields(body, s) {
  let sliced = jsonStringifyRaw(s).slice(1, -1);
  if (sliced === "") return body;
  let n = body.trimEnd().length;
  return `${body.slice(0, n - 1)},${sliced}}${body.slice(n)}`;
}
//@ chunk-r1wk8q25.js:12479-12498 placement
var MAX_RELAY_ERROR_BODY_BYTES = 4096;
var RELAY_ERROR_READ_TIMEOUT_MS = 5000;
//@ chunk-r1wk8q25.js:12498-12947 placement
/**
 * 读取中继响应体（有超时与大小上限），解析出 error.type；超时、过大或解析失败返回 null。
 */
async function readRelayErrorType(response, timeoutMs = RELAY_ERROR_READ_TIMEOUT_MS) {
  let reader = response.body?.getReader();
  if (!reader) return null;
  let n = [];
  let _ = 0;
  let h = false;
  let timer = setTimeout(() => {
    h = true;
    reader.cancel().catch(() => {});
  }, timeoutMs);
  try {
    for (;;) {
      let { done: k, value: p } = await reader.read();
      if (k || h) break;
      _ += p.byteLength;
      if (_ > MAX_RELAY_ERROR_BODY_BYTES) {
        reader.cancel().catch(() => {});
        return null;
      }
      n.push(p);
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (h) return null;
  try {
    let str = Buffer.concat(n).toString("utf8");
    let f = jsonParseRaw(str)?.error?.type;
    return typeof f === "string" ? f : null;
  } catch {
    return null;
  }
}
//@ chunk-r1wk8q25.js:12947-13222 placement
function checkRelayAccountMemory(e, s, o, n) {
  if (o === "main") closeOpenRelayBootVerdict();
  if (o === "main" && getTeleportCacheState().status === "active" && hasAccountMemoryInRequest(n)) {
    revertTeleportCache("account_memory_withdrawn", o);
    logForDebugging(
      "teleport relay: account memory is withdrawn or withheld \u2014 reverting to standard behavior",
    );
  }
  return relayTeleportRequest(e, getTeleportRelayEnvConfig(), s, {
    loop: o,
    isMemoryWithdrawn: () => hasAccountMemoryInRequest(n),
  });
}
//@ chunk-r1wk8q25.js:13222-13388 placement
function hasAccountMemoryInRequest(e) {
  try {
    return accountMemoryRedactionActive() || e.some(isAccountMemoryAttachment);
  } catch (error) {
    logForDebugging("teleport relay: the account memory check failed \u2014 treated as withdrawn", {
      level: "error",
    });
    logError(error);
    return true;
  }
}
//@ chunk-r1wk8q25.js:13388-13482 placement
function urlHref(e) {
  if (typeof e === "string") return e;
  if (e instanceof URL) return e.href;
  return e.url;
}
//@ chunk-r1wk8q25.js:13482-13576 placement
function isDeferredLoadingTool(e) {
  return typeof e === "object" && e !== null && "defer_loading" in e && e.defer_loading === true;
}
//@ chunk-r1wk8q25.js:13576-13646 placement
function isPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-r1wk8q25.js:13646-13726 placement = hasThinkingContent (1)
function isThinkingBlockLoose(m) {
  return isPlainObject(m) && (m.type === "thinking" || m.type === "redacted_thinking");
}
//@ chunk-r1wk8q25.js:13726-13916 placement
function stripThinkingFromApiMessage(message) {
  if (
    !isPlainObject(message) ||
    message.role !== "assistant" ||
    !Array.isArray(message.content) ||
    !message.content.some(isThinkingBlockLoose)
  )
    return message;
  let filtered = message.content.filter((o) => !(isPlainObject(o) && isThinkingOrEmptyText(o)));
  return {
    ...message,
    content: filtered.length > 0 ? filtered : [thinkingRemovedPlaceholder()],
  };
}
//@ chunk-r1wk8q25.js:13916-14298 placement
/**
 * 转发 teleport 请求前移除消息中的 thinking 块（末条为助手消息时不处理），保持原请求体末尾空白。
 */
function stripThinkingForRelay(init, parsedBody) {
  try {
    let body = init?.body;
    let n = parsedBody ?? (typeof body === "string" ? jsonParseRaw(body) : undefined);
    if (!isPlainObject(n) || !Array.isArray(n.messages)) return init;
    let last = n.messages.at(-1);
    if (isPlainObject(last) && last.role === "assistant") return init;
    let h = false;
    let messages = n.messages.map((message) => {
      let f = stripThinkingFromApiMessage(message);
      if (f !== message) h = true;
      return f;
    });
    if (!h) return init;
    let k = typeof body === "string" ? body.slice(body.trimEnd().length) : "";
    return {
      ...init,
      body:
        jsonStringifyRaw({
          ...n,
          messages,
        }) + k,
    };
  } catch {
    return init;
  }
}
//@ chunk-r1wk8q25.js:14298-14486 placement
function isMessagesPost(e, s) {
  if ((s?.method ?? (e instanceof Request ? e.method : "GET")).toUpperCase() !== "POST") return false;
  let n;
  try {
    n = new URL(urlHref(e)).pathname;
  } catch {
    return false;
  }
  return n.endsWith("/v1/messages");
}
//@ chunk-r1wk8q25.js:14486-19478 placement
/**
 * teleport 中继：转发派生会话请求，处理账号记忆撤回
 */
function relayTeleportRequest(
  e,
  teleportRelayEnvConfig,
  o,
  {
    loop,
    isMemoryWithdrawn,
    dispatchTimeoutMs = NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS,
    errorBodyReadTimeoutMs = RELAY_ERROR_READ_TIMEOUT_MS,
    headersAbortLatchFloorMs = getNonstreamingFallbackTimeoutMs(),
  },
) {
  if (!teleportRelayEnvConfig) return e;
  let p = getTeleportCacheState().status === "active";
  let f = (d, y) => (e ? e(d, y) : fetchWithRequestBodyCompression(d, y));
  let x = (lastDispatchRelayed) => {
    if (loop === "main") noteRelayDispatch(lastDispatchRelayed);
  };
  let S = async (d, init) => {
    x(false);
    let teleportCacheState = getTeleportCacheState();
    if (teleportCacheState.status !== "active") return f(d, p ? stripThinkingForRelay(init) : init);
    let init_2 = isSerialisedBody(init?.body)
      ? {
          ...init,
          body: init.body.toString(),
        }
      : init;
    if (!isMessagesPost(d, init_2)) return f(d, init_2);
    let body = init_2?.body;
    if (typeof body !== "string") return f(d, init_2);
    let U = false;
    let F = null;
    let v;
    let parsedBody;
    try {
      let r = jsonParseRaw(body);
      parsedBody = r;
      let a = r;
      U = a.stream === true;
      F = typeof a.model === "string" ? a.model : null;
      v = a.tools;
    } catch {
      return f(d, init_2);
    }
    let R = () => f(d, stripThinkingForRelay(init_2, parsedBody));
    let M = (r, a) => {
      if (getTeleportCacheState().status === "active") {
        if (r !== undefined) noteForkWentDirect(o(), r);
        logForDebugging(
          r !== undefined
            ? `teleport relay: a fork's request leaves the relay (${a ?? r}) \u2014 the session's relay stays on`
            : "teleport relay: a fork's request stays off the relay, because an earlier request of the same fork went direct",
          {
            level: r !== undefined ? "warn" : "debug",
          },
        );
      }
      return R();
    };
    let E = (r, a, u) => {
      if (loop === "fork") return M(r, `${r}: ${a}`);
      revertTeleportCache(r, loop, a);
      if (u !== undefined)
        logForDebugging(u, {
          level: "warn",
        });
      return R();
    };
    let T = async (cause, httpStatus) => {
      if (getTeleportCacheState().status !== "active") return R();
      if (loop === "fork") return M(cause);
      logTeleportFallbackOnce(cause);
      noteRelayFallback(cause, httpStatus);
      let u = await R();
      if (u.ok && getTeleportCacheState().status === "active") {
        revertAfterDirectServe(cause, loop);
        logForDebugging(
          `teleport relay: the standard path served a request the relay did not take (${cause}) \u2014 reverting to standard behavior`,
          {
            level: "warn",
          },
        );
      }
      return u;
    };
    let q =
      teleportCacheState.marker.model !== undefined && F !== null && F !== teleportCacheState.marker.model;
    if (loop === "fork") {
      let r = o();
      if (q || !isPreAnchorIntact(r)) return R();
      if (hasForkGoneDirect(r)) return M();
    }
    if (isMemoryWithdrawn())
      return E(
        "account_memory_withdrawn",
        "account memory is withdrawn or withheld",
        "teleport relay: account memory is withdrawn or withheld \u2014 reverting to standard behavior",
      );
    if (!U) return T("nonstreaming_request");
    if (q) return T("model_mismatch");
    if (loop === "main" && !verifyPreAnchorIntact(o())) return R();
    let P;
    try {
      P =
        v === undefined
          ? null
          : computeContentHash(
              jsonStringifyRaw(
                Array.isArray(v)
                  ? [v.some((r) => isDeferredLoadingTool(r)), v.filter((r) => !isDeferredLoadingTool(r))]
                  : v,
              ),
            );
    } catch {
      logForDebugging(
        "teleport relay tools-fingerprint computation failed \u2014 standard path for this attempt",
        {
          level: "warn",
        },
      );
      return T("relay_compose_error");
    }
    if (loop === "fork") {
      let r = toolsBaselineVerdict(F, P);
      if (r !== "intact") return r === "changed" ? M("tools_changed") : R();
    } else if (!verifyToolsBaselineIntact(F, P)) return T("model_mismatch");
    let D = `${teleportCacheState.ingressOrigin}/v2/ccr-sessions/${teleportCacheState.remoteSessionId}/teleport/conversations/${teleportCacheState.marker.conversation_uuid}/completion`;
    if (!isSameOriginAsCcr(D)) return E("relay_unreachable", "relay url failed the CCR origin gate");
    let compress = isFirstPartyAnthropicHost(D) && relayTakesGzip() ? init_2?.compress : undefined;
    let A;
    let body_2 = body;
    try {
      let headers = new Headers(init_2?.headers);
      A = new Headers();
      A.set("content-type", headers.get("content-type") ?? "application/json");
      let a = headers.get("anthropic-beta");
      if (a !== null) A.set("anthropic-beta", a);
      for (let [key, value] of Object.entries(getSessionIngressAuthHeaders())) A.set(key, value);
      A.set("anthropic-version", teleportCacheState.marker.anthropic_version);
      if (isPlainObject(parsedBody)) {
        let u = {};
        if (headers.get(ANTHROPIC_USAGE_LIMIT) === "extended") {
          u[UPGRADE_RELAY_USAGE_LIMIT] = "extended";
          logForDebugging("upgrade relay: the relayed request asks for the usage-limit allowance");
        }
        let found = REQUEST_CLASSES.find((g) => g === headers.get(X_CLAUDE_CODE_REQUEST_CLASS));
        if (found !== undefined) u[UPGRADE_RELAY_REQUEST_CLASS] = found;
        let G = headers.get(SANDY_PLOVER_HEADER);
        if (G !== null) {
          let g;
          try {
            let Q = jsonParseRaw(G);
            if (Array.isArray(Q)) {
              g = [];
              for (let C of Q) {
                if (!isPlainObject(C) || typeof C.name !== "string" || !TOOL_NAME_PATTERN.test(C.name)) {
                  g = undefined;
                  break;
                }
                g.push({
                  name: C.name,
                });
              }
            }
          } catch {
            g = undefined;
          }
          if (g === undefined)
            logForDebugging(
              "upgrade relay: the tools-used header could not be read as a list of tool names; the relayed body carries the incomplete-list entry instead",
              {
                level: "error",
              },
            );
          u[UPGRADE_RELAY_INHERITED_TOOLS] = g ?? [
            {
              name: UNREADABLE_TOOLS_BEFORE_SUMMARY,
            },
          ];
        }
        body_2 = appendJsonFields(body, u);
      }
    } catch {
      logForDebugging("teleport relay request composition failed \u2014 standard path for this attempt", {
        level: "warn",
      });
      return T("relay_compose_error");
    }
    let response;
    let startTime = performance.now();
    let abortController = new AbortController();
    let timer = setTimeout((r) => r.abort(), dispatchTimeoutMs, abortController);
    let signal = abortController.signal;
    try {
      response = await testGuardedFetch(D, {
        ...(await mcpProxyFetchOptions(D)),
        method: "POST",
        headers: A,
        body: body_2,
        ...(compress !== undefined && {
          compress,
        }),
        signal: init_2?.signal ? AbortSignal.any([init_2.signal, signal]) : signal,
        redirect: "error",
      });
    } catch (error) {
      if (signal.aborted && !init_2?.signal?.aborted)
        return E(
          "relay_dispatch_timeout",
          `relay dispatch timed out after ${dispatchTimeoutMs}ms`,
          "teleport relay dispatch timed out \u2014 reverting to standard behavior",
        );
      if (init_2?.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        let a = performance.now() - startTime;
        if (a >= headersAbortLatchFloorMs)
          return E(
            "relay_dispatch_timeout",
            `caller signal aborted after ${Math.round(a)}ms awaiting relay headers`,
            "teleport relay dispatch aborted after a long headers wait \u2014 reverting to standard behavior",
          );
        throw error;
      }
      logForDebugging("teleport relay transport error \u2014 standard path for this attempt", {
        level: "warn",
      });
      return T("relay_transport_error");
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      if (response.status === 409) {
        if ((await readRelayErrorType(response, errorBodyReadTimeoutMs)) === "teleport_relay_refused") {
          if (compress !== undefined) {
            noteRelayRefusedGzip();
            return S(d, init_2);
          }
          return E(
            "relay_refused",
            "relay http 409 with the refusal discriminant",
            "teleport relay refused \u2014 reverting to standard behavior",
          );
        }
      } else response.body?.cancel().catch(() => {});
      logForDebugging(
        `teleport relay unavailable (http ${response.status}) \u2014 standard path for this attempt`,
        {
          level: "warn",
        },
      );
      return T("relay_unavailable", response.status);
    }
    let lower = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!lower.includes("text/event-stream")) {
      response.body?.cancel().catch(() => {});
      return E("relay_not_sse", `relay 200 with content-type ${lower}`);
    }
    x(true);
    return response;
  };
  registerRelayFetch(S, loop);
  if (loop === "main" && !p && takesRequestBodyBytes(e)) markTakesRequestBodyBytes(S);
  return S;
}

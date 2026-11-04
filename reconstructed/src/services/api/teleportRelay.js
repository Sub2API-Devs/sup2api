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
function appendJsonFields(body, fields) {
  let sliced = jsonStringifyRaw(fields).slice(1, -1);
  if (sliced === "") return body;
  let endIndex = body.trimEnd().length;
  return `${body.slice(0, endIndex - 1)},${sliced}}${body.slice(endIndex)}`;
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
  let chunks = [];
  let total = 0;
  let timedOut = false;
  let timer = setTimeout(() => {
    timedOut = true;
    reader.cancel().catch(() => {});
  }, timeoutMs);
  try {
    for (;;) {
      let { done, value: chunk } = await reader.read();
      if (done || timedOut) break;
      total += chunk.byteLength;
      if (total > MAX_RELAY_ERROR_BODY_BYTES) {
        reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(chunk);
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (timedOut) return null;
  try {
    let str = Buffer.concat(chunks).toString("utf8");
    let errorType = jsonParseRaw(str)?.error?.type;
    return typeof errorType === "string" ? errorType : null;
  } catch {
    return null;
  }
}
//@ chunk-r1wk8q25.js:12947-13222 placement
function checkRelayAccountMemory(fetchImpl, init, loopKind, messages) {
  if (loopKind === "main") closeOpenRelayBootVerdict();
  if (
    loopKind === "main" &&
    getTeleportCacheState().status === "active" &&
    hasAccountMemoryInRequest(messages)
  ) {
    revertTeleportCache("account_memory_withdrawn", loopKind);
    logForDebugging(
      "teleport relay: account memory is withdrawn or withheld \u2014 reverting to standard behavior",
    );
  }
  return relayTeleportRequest(fetchImpl, getTeleportRelayEnvConfig(), init, {
    loop: loopKind,
    isMemoryWithdrawn: () => hasAccountMemoryInRequest(messages),
  });
}
//@ chunk-r1wk8q25.js:13222-13388 placement
function hasAccountMemoryInRequest(messages) {
  try {
    return accountMemoryRedactionActive() || messages.some(isAccountMemoryAttachment);
  } catch (error) {
    logForDebugging("teleport relay: the account memory check failed \u2014 treated as withdrawn", {
      level: "error",
    });
    logError(error);
    return true;
  }
}
//@ chunk-r1wk8q25.js:13388-13482 placement
function urlHref(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
//@ chunk-r1wk8q25.js:13482-13576 placement
function isDeferredLoadingTool(tool) {
  return typeof tool === "object" && tool !== null && "defer_loading" in tool && tool.defer_loading === true;
}
//@ chunk-r1wk8q25.js:13576-13646 placement
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  let filtered = message.content.filter((block) => !(isPlainObject(block) && isThinkingOrEmptyText(block)));
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
    let parsedBodyValue = parsedBody ?? (typeof body === "string" ? jsonParseRaw(body) : undefined);
    if (!isPlainObject(parsedBodyValue) || !Array.isArray(parsedBodyValue.messages)) return init;
    let last = parsedBodyValue.messages.at(-1);
    if (isPlainObject(last) && last.role === "assistant") return init;
    let changed = false;
    let messages = parsedBodyValue.messages.map((message) => {
      let stripped = stripThinkingFromApiMessage(message);
      if (stripped !== message) changed = true;
      return stripped;
    });
    if (!changed) return init;
    let trailing = typeof body === "string" ? body.slice(body.trimEnd().length) : "";
    return {
      ...init,
      body:
        jsonStringifyRaw({
          ...parsedBodyValue,
          messages,
        }) + trailing,
    };
  } catch {
    return init;
  }
}
//@ chunk-r1wk8q25.js:14298-14486 placement
function isMessagesPost(input, init) {
  if ((init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase() !== "POST")
    return false;
  let pathname;
  try {
    pathname = new URL(urlHref(input)).pathname;
  } catch {
    return false;
  }
  return pathname.endsWith("/v1/messages");
}
//@ chunk-r1wk8q25.js:14486-19478 placement
/**
 * teleport 中继：转发派生会话请求，处理账号记忆撤回
 */
function relayTeleportRequest(
  fallbackFetch,
  teleportRelayEnvConfig,
  currentSessionId,
  {
    loop,
    isMemoryWithdrawn,
    dispatchTimeoutMs = NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS,
    errorBodyReadTimeoutMs = RELAY_ERROR_READ_TIMEOUT_MS,
    headersAbortLatchFloorMs = getNonstreamingFallbackTimeoutMs(),
  },
) {
  if (!teleportRelayEnvConfig) return fallbackFetch;
  let relayActive = getTeleportCacheState().status === "active";
  let dispatchDirect = (input, init) =>
    fallbackFetch ? fallbackFetch(input, init) : fetchWithRequestBodyCompression(input, init);
  let noteDispatchRelayed = (lastDispatchRelayed) => {
    if (loop === "main") noteRelayDispatch(lastDispatchRelayed);
  };
  let dispatch = async (input, init) => {
    noteDispatchRelayed(false);
    let teleportCacheState = getTeleportCacheState();
    if (teleportCacheState.status !== "active")
      return dispatchDirect(input, relayActive ? stripThinkingForRelay(init) : init);
    let init_2 = isSerialisedBody(init?.body)
      ? {
          ...init,
          body: init.body.toString(),
        }
      : init;
    if (!isMessagesPost(input, init_2)) return dispatchDirect(input, init_2);
    let body = init_2?.body;
    if (typeof body !== "string") return dispatchDirect(input, init_2);
    let isStreaming = false;
    let model = null;
    let tools;
    let parsedBody;
    try {
      let parsed = jsonParseRaw(body);
      parsedBody = parsed;
      let parsedBodyValue = parsed;
      isStreaming = parsedBodyValue.stream === true;
      model = typeof parsedBodyValue.model === "string" ? parsedBodyValue.model : null;
      tools = parsedBodyValue.tools;
    } catch {
      return dispatchDirect(input, init_2);
    }
    let dispatchStandard = () => dispatchDirect(input, stripThinkingForRelay(init_2, parsedBody));
    let fallBackToDirect = (sessionId, detail) => {
      if (getTeleportCacheState().status === "active") {
        if (sessionId !== undefined) noteForkWentDirect(currentSessionId(), sessionId);
        logForDebugging(
          sessionId !== undefined
            ? `teleport relay: a fork's request leaves the relay (${detail ?? sessionId}) \u2014 the session's relay stays on`
            : "teleport relay: a fork's request stays off the relay, because an earlier request of the same fork went direct",
          {
            level: sessionId !== undefined ? "warn" : "debug",
          },
        );
      }
      return dispatchStandard();
    };
    let revertToStandard = (sessionId, detail, warning) => {
      if (loop === "fork") return fallBackToDirect(sessionId, `${sessionId}: ${detail}`);
      revertTeleportCache(sessionId, loop, detail);
      if (warning !== undefined)
        logForDebugging(warning, {
          level: "warn",
        });
      return dispatchStandard();
    };
    let handleFallback = async (error, httpStatus) => {
      if (getTeleportCacheState().status !== "active") return dispatchStandard();
      if (loop === "fork") return fallBackToDirect(error);
      logTeleportFallbackOnce(error);
      noteRelayFallback(error, httpStatus);
      let response = await dispatchStandard();
      if (response.ok && getTeleportCacheState().status === "active") {
        revertAfterDirectServe(error, loop);
        logForDebugging(
          `teleport relay: the standard path served a request the relay did not take (${error}) \u2014 reverting to standard behavior`,
          {
            level: "warn",
          },
        );
      }
      return response;
    };
    let modelMismatch =
      teleportCacheState.marker.model !== undefined &&
      model !== null &&
      model !== teleportCacheState.marker.model;
    if (loop === "fork") {
      let sessionId = currentSessionId();
      if (modelMismatch || !isPreAnchorIntact(sessionId)) return dispatchStandard();
      if (hasForkGoneDirect(sessionId)) return fallBackToDirect();
    }
    if (isMemoryWithdrawn())
      return revertToStandard(
        "account_memory_withdrawn",
        "account memory is withdrawn or withheld",
        "teleport relay: account memory is withdrawn or withheld \u2014 reverting to standard behavior",
      );
    if (!isStreaming) return handleFallback("nonstreaming_request");
    if (modelMismatch) return handleFallback("model_mismatch");
    if (loop === "main" && !verifyPreAnchorIntact(currentSessionId())) return dispatchStandard();
    let toolsHash;
    try {
      toolsHash =
        tools === undefined
          ? null
          : computeContentHash(
              jsonStringifyRaw(
                Array.isArray(tools)
                  ? [
                      tools.some((tool) => isDeferredLoadingTool(tool)),
                      tools.filter((tool) => !isDeferredLoadingTool(tool)),
                    ]
                  : tools,
              ),
            );
    } catch {
      logForDebugging(
        "teleport relay tools-fingerprint computation failed \u2014 standard path for this attempt",
        {
          level: "warn",
        },
      );
      return handleFallback("relay_compose_error");
    }
    if (loop === "fork") {
      let baselineVerdict = toolsBaselineVerdict(model, toolsHash);
      if (baselineVerdict !== "intact")
        return baselineVerdict === "changed" ? fallBackToDirect("tools_changed") : dispatchStandard();
    } else if (!verifyToolsBaselineIntact(model, toolsHash)) return handleFallback("model_mismatch");
    let relayUrl = `${teleportCacheState.ingressOrigin}/v2/ccr-sessions/${teleportCacheState.remoteSessionId}/teleport/conversations/${teleportCacheState.marker.conversation_uuid}/completion`;
    if (!isSameOriginAsCcr(relayUrl))
      return revertToStandard("relay_unreachable", "relay url failed the CCR origin gate");
    let compress = isFirstPartyAnthropicHost(relayUrl) && relayTakesGzip() ? init_2?.compress : undefined;
    let relayHeaders;
    let body_2 = body;
    try {
      let headers = new Headers(init_2?.headers);
      relayHeaders = new Headers();
      relayHeaders.set("content-type", headers.get("content-type") ?? "application/json");
      let anthropicBeta = headers.get("anthropic-beta");
      if (anthropicBeta !== null) relayHeaders.set("anthropic-beta", anthropicBeta);
      for (let [key, value] of Object.entries(getSessionIngressAuthHeaders())) relayHeaders.set(key, value);
      relayHeaders.set("anthropic-version", teleportCacheState.marker.anthropic_version);
      if (isPlainObject(parsedBody)) {
        let extraFields = {};
        if (headers.get(ANTHROPIC_USAGE_LIMIT) === "extended") {
          extraFields[UPGRADE_RELAY_USAGE_LIMIT] = "extended";
          logForDebugging("upgrade relay: the relayed request asks for the usage-limit allowance");
        }
        let found = REQUEST_CLASSES.find(
          (requestClass) => requestClass === headers.get(X_CLAUDE_CODE_REQUEST_CLASS),
        );
        if (found !== undefined) extraFields[UPGRADE_RELAY_REQUEST_CLASS] = found;
        let toolsUsedHeader = headers.get(SANDY_PLOVER_HEADER);
        if (toolsUsedHeader !== null) {
          let inheritedTools;
          try {
            let parsedTools = jsonParseRaw(toolsUsedHeader);
            if (Array.isArray(parsedTools)) {
              inheritedTools = [];
              for (let toolEntry of parsedTools) {
                if (
                  !isPlainObject(toolEntry) ||
                  typeof toolEntry.name !== "string" ||
                  !TOOL_NAME_PATTERN.test(toolEntry.name)
                ) {
                  inheritedTools = undefined;
                  break;
                }
                inheritedTools.push({
                  name: toolEntry.name,
                });
              }
            }
          } catch {
            inheritedTools = undefined;
          }
          if (inheritedTools === undefined)
            logForDebugging(
              "upgrade relay: the tools-used header could not be read as a list of tool names; the relayed body carries the incomplete-list entry instead",
              {
                level: "error",
              },
            );
          extraFields[UPGRADE_RELAY_INHERITED_TOOLS] = inheritedTools ?? [
            {
              name: UNREADABLE_TOOLS_BEFORE_SUMMARY,
            },
          ];
        }
        body_2 = appendJsonFields(body, extraFields);
      }
    } catch {
      logForDebugging("teleport relay request composition failed \u2014 standard path for this attempt", {
        level: "warn",
      });
      return handleFallback("relay_compose_error");
    }
    let response;
    let startTime = performance.now();
    let abortController = new AbortController();
    let timer = setTimeout((abortController) => abortController.abort(), dispatchTimeoutMs, abortController);
    let signal = abortController.signal;
    try {
      response = await testGuardedFetch(relayUrl, {
        ...(await mcpProxyFetchOptions(relayUrl)),
        method: "POST",
        headers: relayHeaders,
        body: body_2,
        ...(compress !== undefined && {
          compress,
        }),
        signal: init_2?.signal ? AbortSignal.any([init_2.signal, signal]) : signal,
        redirect: "error",
      });
    } catch (error) {
      if (signal.aborted && !init_2?.signal?.aborted)
        return revertToStandard(
          "relay_dispatch_timeout",
          `relay dispatch timed out after ${dispatchTimeoutMs}ms`,
          "teleport relay dispatch timed out \u2014 reverting to standard behavior",
        );
      if (init_2?.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        let elapsedMs = performance.now() - startTime;
        if (elapsedMs >= headersAbortLatchFloorMs)
          return revertToStandard(
            "relay_dispatch_timeout",
            `caller signal aborted after ${Math.round(elapsedMs)}ms awaiting relay headers`,
            "teleport relay dispatch aborted after a long headers wait \u2014 reverting to standard behavior",
          );
        throw error;
      }
      logForDebugging("teleport relay transport error \u2014 standard path for this attempt", {
        level: "warn",
      });
      return handleFallback("relay_transport_error");
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      if (response.status === 409) {
        if ((await readRelayErrorType(response, errorBodyReadTimeoutMs)) === "teleport_relay_refused") {
          if (compress !== undefined) {
            noteRelayRefusedGzip();
            return dispatch(input, init_2);
          }
          return revertToStandard(
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
      return handleFallback("relay_unavailable", response.status);
    }
    let lower = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!lower.includes("text/event-stream")) {
      response.body?.cancel().catch(() => {});
      return revertToStandard("relay_not_sse", `relay 200 with content-type ${lower}`);
    }
    noteDispatchRelayed(true);
    return response;
  };
  registerRelayFetch(dispatch, loop);
  if (loop === "main" && !relayActive && takesRequestBodyBytes(fallbackFetch))
    markTakesRequestBodyBytes(dispatch);
  return dispatch;
}
export { checkRelayAccountMemory };

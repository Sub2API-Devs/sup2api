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
import { Fli, isAccountMemoryAttachment } from "../../utils/messages/accountMemory.js";
import { logError } from "../../utils/log.js";
import { isThinkingOrEmptyText, thinkingRemovedPlaceholder } from "../../utils/messages.js";
import { NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS } from "../../_unattributed/chunk-r1wk8q25/part-001.js";
import {
  getNonstreamingFallbackTimeoutMs,
  UPGRADE_RELAY_USAGE_LIMIT,
  UPGRADE_RELAY_REQUEST_CLASS,
  UPGRADE_RELAY_INHERITED_TOOLS,
} from "./claude.js";
import { fetchWithRequestBodyCompression, Ast } from "./gzipRequestBody.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isSameOriginAsCcr } from "../mcp/ccrMcpUrls.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { getSessionIngressAuthHeaders } from "../../utils/sessionIngressAuth.js";
import { ANTHROPIC_USAGE_LIMIT } from "../lowPriority/headers.js";
import { DEi, X_CLAUDE_CODE_REQUEST_CLASS } from "./requestHeaders.js";
import { SANDY_PLOVER_HEADER, zXo } from "./clientHelpers.js";
import { cLn } from "../../bootstrap/stateSlices.js";
import { testGuardedFetch } from "../../utils/testNetworkGuard.js";
import { mcpProxyFetchOptions } from "../mcp/agentProxyFallback.js";
import { oGr, SXn } from "./incrementalRequestBody.js";

//@ chunk-r1wk8q25.js:12238-12368 placement
function appendJsonFields(e, s) {
  let sliced = jsonStringifyRaw(s).slice(1, -1);
  if (sliced === "") return e;
  let n = e.trimEnd().length;
  return `${e.slice(0, n - 1)},${sliced}}${e.slice(n)}`;
}
//@ chunk-r1wk8q25.js:12479-12498 placement
var se = 4096,
  X = 5000;
/**
 * 读取中继响应体（有超时与大小上限），解析出 error.type；超时、过大或解析失败返回 null。
 */
//@ chunk-r1wk8q25.js:12498-12947 placement
async function readRelayErrorType(response, timeoutMs = X) {
  let o = response.body?.getReader();
  if (!o) return null;
  let n = [],
    _ = 0,
    h = !1,
    L = setTimeout(() => {
      ((h = !0), o.cancel().catch(() => {}));
    }, timeoutMs);
  try {
    for (;;) {
      let { done: k, value: p } = await o.read();
      if (k || h) break;
      if (((_ += p.byteLength), _ > se)) return (o.cancel().catch(() => {}), null);
      n.push(p);
    }
  } catch {
    return null;
  } finally {
    clearTimeout(L);
  }
  if (h) return null;
  try {
    let str = Buffer.concat(n).toString("utf8"),
      f = jsonParseRaw(str)?.error?.type;
    return typeof f === "string" ? f : null;
  } catch {
    return null;
  }
}
//@ chunk-r1wk8q25.js:12947-13222 placement
function checkRelayAccountMemory(e, s, o, n) {
  if (o === "main") closeOpenRelayBootVerdict();
  if (o === "main" && getTeleportCacheState().status === "active" && hasAccountMemoryInRequest(n))
    (revertTeleportCache("account_memory_withdrawn", o),
      logForDebugging(
        "teleport relay: account memory is withdrawn or withheld \u2014 reverting to standard behavior",
      ));
  return relayTeleportRequest(e, getTeleportRelayEnvConfig(), s, {
    loop: o,
    isMemoryWithdrawn: () => hasAccountMemoryInRequest(n),
  });
}
//@ chunk-r1wk8q25.js:13222-13388 placement
function hasAccountMemoryInRequest(e) {
  try {
    return Fli() || e.some(isAccountMemoryAttachment);
  } catch (error) {
    return (
      logForDebugging("teleport relay: the account memory check failed \u2014 treated as withdrawn", {
        level: "error",
      }),
      logError(error),
      !0
    );
  }
}
//@ chunk-r1wk8q25.js:13388-13482 placement
function ce(e) {
  if (typeof e === "string") return e;
  if (e instanceof URL) return e.href;
  return e.url;
}
//@ chunk-r1wk8q25.js:13482-13576 placement
function J(e) {
  return typeof e === "object" && e !== null && "defer_loading" in e && e.defer_loading === !0;
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
function stripThinkingFromApiMessage(e) {
  if (
    !isPlainObject(e) ||
    e.role !== "assistant" ||
    !Array.isArray(e.content) ||
    !e.content.some(isThinkingBlockLoose)
  )
    return e;
  let filtered = e.content.filter((o) => !(isPlainObject(o) && isThinkingOrEmptyText(o)));
  return { ...e, content: filtered.length > 0 ? filtered : [thinkingRemovedPlaceholder()] };
}
/**
 * 转发 teleport 请求前移除消息中的 thinking 块（末条为助手消息时不处理），保持原请求体末尾空白。
 */
//@ chunk-r1wk8q25.js:13916-14298 placement
function stripThinkingForRelay(init, parsedBody) {
  try {
    let o = init?.body,
      n = parsedBody ?? (typeof o === "string" ? jsonParseRaw(o) : void 0);
    if (!isPlainObject(n) || !Array.isArray(n.messages)) return init;
    let at = n.messages.at(-1);
    if (isPlainObject(at) && at.role === "assistant") return init;
    let h = !1,
      mapped = n.messages.map((message) => {
        let f = stripThinkingFromApiMessage(message);
        if (f !== message) h = !0;
        return f;
      });
    if (!h) return init;
    let k = typeof o === "string" ? o.slice(o.trimEnd().length) : "";
    return { ...init, body: jsonStringifyRaw({ ...n, messages: mapped }) + k };
  } catch {
    return init;
  }
}
//@ chunk-r1wk8q25.js:14298-14486 placement
function isMessagesPost(e, s) {
  if ((s?.method ?? (e instanceof Request ? e.method : "GET")).toUpperCase() !== "POST") return !1;
  let n;
  try {
    n = new URL(ce(e)).pathname;
  } catch {
    return !1;
  }
  return n.endsWith("/v1/messages");
}
/**
 * teleport 中继：转发派生会话请求，处理账号记忆撤回
 */
//@ chunk-r1wk8q25.js:14486-19478 placement
function relayTeleportRequest(
  e,
  s,
  o,
  {
    loop: loop,
    isMemoryWithdrawn: isMemoryWithdrawn,
    dispatchTimeoutMs: dispatchTimeoutMs = NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS,
    errorBodyReadTimeoutMs: errorBodyReadTimeoutMs = X,
    headersAbortLatchFloorMs: headersAbortLatchFloorMs = getNonstreamingFallbackTimeoutMs(),
  },
) {
  if (!s) return e;
  let p = getTeleportCacheState().status === "active",
    f = (d, y) => (e ? e(d, y) : fetchWithRequestBodyCompression(d, y)),
    x = (d) => {
      if (loop === "main") noteRelayDispatch(d);
    },
    S = async (d, y) => {
      x(!1);
      let w = getTeleportCacheState();
      if (w.status !== "active") return f(d, p ? stripThinkingForRelay(y) : y);
      let c = Ast(y?.body) ? { ...y, body: y.body.toString() } : y;
      if (!isMessagesPost(d, c)) return f(d, c);
      let O = c?.body;
      if (typeof O !== "string") return f(d, c);
      let U = !1,
        F = null,
        v,
        B;
      try {
        let r = jsonParseRaw(O);
        B = r;
        let a = r;
        ((U = a.stream === !0), (F = typeof a.model === "string" ? a.model : null), (v = a.tools));
      } catch {
        return f(d, c);
      }
      let R = () => f(d, stripThinkingForRelay(c, B)),
        M = (r, a) => {
          if (getTeleportCacheState().status === "active") {
            if (r !== void 0) noteForkWentDirect(o(), r);
            logForDebugging(
              r !== void 0
                ? `teleport relay: a fork's request leaves the relay (${a ?? r}) \u2014 the session's relay stays on`
                : "teleport relay: a fork's request stays off the relay, because an earlier request of the same fork went direct",
              { level: r !== void 0 ? "warn" : "debug" },
            );
          }
          return R();
        },
        E = (r, a, u) => {
          if (loop === "fork") return M(r, `${r}: ${a}`);
          if ((revertTeleportCache(r, loop, a), u !== void 0)) logForDebugging(u, { level: "warn" });
          return R();
        },
        T = async (r, a) => {
          if (getTeleportCacheState().status !== "active") return R();
          if (loop === "fork") return M(r);
          (logTeleportFallbackOnce(r), noteRelayFallback(r, a));
          let u = await R();
          if (u.ok && getTeleportCacheState().status === "active")
            (revertAfterDirectServe(r, loop),
              logForDebugging(
                `teleport relay: the standard path served a request the relay did not take (${r}) \u2014 reverting to standard behavior`,
                { level: "warn" },
              ));
          return u;
        },
        q = w.marker.model !== void 0 && F !== null && F !== w.marker.model;
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
          v === void 0
            ? null
            : computeContentHash(
                jsonStringifyRaw(Array.isArray(v) ? [v.some((r) => J(r)), v.filter((r) => !J(r))] : v),
              );
      } catch {
        return (
          logForDebugging(
            "teleport relay tools-fingerprint computation failed \u2014 standard path for this attempt",
            { level: "warn" },
          ),
          T("relay_compose_error")
        );
      }
      if (loop === "fork") {
        let r = toolsBaselineVerdict(F, P);
        if (r !== "intact") return r === "changed" ? M("tools_changed") : R();
      } else if (!verifyToolsBaselineIntact(F, P)) return T("model_mismatch");
      let D = `${w.ingressOrigin}/v2/ccr-sessions/${w.remoteSessionId}/teleport/conversations/${w.marker.conversation_uuid}/completion`;
      if (!isSameOriginAsCcr(D)) return E("relay_unreachable", "relay url failed the CCR origin gate");
      let H = isFirstPartyAnthropicHost(D) && relayTakesGzip() ? c?.compress : void 0,
        A,
        Y = O;
      try {
        let headers = new Headers(c?.headers);
        ((A = new Headers()), A.set("content-type", headers.get("content-type") ?? "application/json"));
        let a = headers.get("anthropic-beta");
        if (a !== null) A.set("anthropic-beta", a);
        for (let [u, I] of Object.entries(getSessionIngressAuthHeaders())) A.set(u, I);
        if ((A.set("anthropic-version", w.marker.anthropic_version), isPlainObject(B))) {
          let u = {};
          if (headers.get(ANTHROPIC_USAGE_LIMIT) === "extended")
            ((u[UPGRADE_RELAY_USAGE_LIMIT] = "extended"),
              logForDebugging("upgrade relay: the relayed request asks for the usage-limit allowance"));
          let found = DEi.find((g) => g === headers.get(X_CLAUDE_CODE_REQUEST_CLASS));
          if (found !== void 0) u[UPGRADE_RELAY_REQUEST_CLASS] = found;
          let G = headers.get(SANDY_PLOVER_HEADER);
          if (G !== null) {
            let g;
            try {
              let Q = jsonParseRaw(G);
              if (Array.isArray(Q)) {
                g = [];
                for (let C of Q) {
                  if (!isPlainObject(C) || typeof C.name !== "string" || !cLn.test(C.name)) {
                    g = void 0;
                    break;
                  }
                  g.push({ name: C.name });
                }
              }
            } catch {
              g = void 0;
            }
            if (g === void 0)
              logForDebugging(
                "upgrade relay: the tools-used header could not be read as a list of tool names; the relayed body carries the incomplete-list entry instead",
                { level: "error" },
              );
            u[UPGRADE_RELAY_INHERITED_TOOLS] = g ?? [{ name: zXo }];
          }
          Y = appendJsonFields(O, u);
        }
      } catch {
        return (
          logForDebugging("teleport relay request composition failed \u2014 standard path for this attempt", {
            level: "warn",
          }),
          T("relay_compose_error")
        );
      }
      let m,
        startTime = performance.now(),
        abortController = new AbortController(),
        ee = setTimeout((r) => r.abort(), dispatchTimeoutMs, abortController),
        signal = abortController.signal;
      try {
        m = await testGuardedFetch(D, {
          ...(await mcpProxyFetchOptions(D)),
          method: "POST",
          headers: A,
          body: Y,
          ...(H !== void 0 && { compress: H }),
          signal: c?.signal ? AbortSignal.any([c.signal, signal]) : signal,
          redirect: "error",
        });
      } catch (error) {
        if (signal.aborted && !c?.signal?.aborted)
          return E(
            "relay_dispatch_timeout",
            `relay dispatch timed out after ${dispatchTimeoutMs}ms`,
            "teleport relay dispatch timed out \u2014 reverting to standard behavior",
          );
        if (c?.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          let a = performance.now() - startTime;
          if (a >= headersAbortLatchFloorMs)
            return E(
              "relay_dispatch_timeout",
              `caller signal aborted after ${Math.round(a)}ms awaiting relay headers`,
              "teleport relay dispatch aborted after a long headers wait \u2014 reverting to standard behavior",
            );
          throw error;
        }
        return (
          logForDebugging("teleport relay transport error \u2014 standard path for this attempt", {
            level: "warn",
          }),
          T("relay_transport_error")
        );
      } finally {
        clearTimeout(ee);
      }
      if (!m.ok) {
        if (m.status === 409) {
          if ((await readRelayErrorType(m, errorBodyReadTimeoutMs)) === "teleport_relay_refused") {
            if (H !== void 0) return (noteRelayRefusedGzip(), S(d, c));
            return E(
              "relay_refused",
              "relay http 409 with the refusal discriminant",
              "teleport relay refused \u2014 reverting to standard behavior",
            );
          }
        } else m.body?.cancel().catch(() => {});
        return (
          logForDebugging(
            `teleport relay unavailable (http ${m.status}) \u2014 standard path for this attempt`,
            { level: "warn" },
          ),
          T("relay_unavailable", m.status)
        );
      }
      let lower = (m.headers.get("content-type") ?? "").toLowerCase();
      if (!lower.includes("text/event-stream"))
        return (m.body?.cancel().catch(() => {}), E("relay_not_sse", `relay 200 with content-type ${lower}`));
      return (x(!0), m);
    };
  if ((registerRelayFetch(S, loop), loop === "main" && !p && oGr(e))) SXn(S);
  return S;
}

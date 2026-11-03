/**
 * services/claudeGateway/proxyRequest.ts
 *
 * 2.1.316 新增：网关代理请求构造
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (7)
 * attribution: placement 7
 */
import { resolveUpstreamModel } from "./models.js";
import { wE, setUserIdentityHeaders } from "./messagesHandler.js";
import { ssrfSafeFetch } from "./ssrfGuard.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import {
  extractModelIdFromArn,
  getBedrockRegionPrefix_2,
  isFoundationModel,
} from "../../utils/model/bedrock.js";

/**
 * 转发给上游的请求头白名单（另含 x-stainless-*）。
 */
//@ chunk-1ny7cxrt.js:1345635-1345745 placement
var FORWARDED_REQUEST_HEADERS = new Set([
  "content-type",
  "accept",
  "accept-encoding",
  "anthropic-beta",
  "anthropic-version",
  "user-agent",
]);
/**
 * 从客户端请求头中挑出允许转发的头。
 */
//@ chunk-1ny7cxrt.js:1345745-1345883 placement
function pickForwardedHeaders(e) {
  let headers = new Headers();
  return (
    e.forEach((n, o) => {
      let lower = o.toLowerCase();
      if (FORWARDED_REQUEST_HEADERS.has(lower) || lower.startsWith("x-stainless-")) headers.set(o, n);
    }),
    headers
  );
}
//@ chunk-1ny7cxrt.js:1345883-1345957 placement
function f_(e) {
  return { search: new URL(e.url).search, headers: pickForwardedHeaders(e.headers) };
}
/**
 * 代理常量：上游请求 id 头、不回传的响应头、SSE 响应头、心跳间隔与 ping 帧、请求超时、可代理路径。
 */
//@ chunk-1ny7cxrt.js:1345957-1346344 placement
var UPSTREAM_REQUEST_ID_HEADERS = ["x-gateway-upstream-request-id", "x-gateway-upstream-cloud-request-id"],
  STRIPPED_RESPONSE_HEADERS = [
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
    "cf-ray",
    "via",
    "request-id",
    ...UPSTREAM_REQUEST_ID_HEADERS,
  ],
  SSE_RESPONSE_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
  SSE_PING_INTERVAL_MS = 15000,
  SSE_PING_FRAME = `event: ping
data: {"type": "ping"}

`,
  UPSTREAM_TIMEOUT_MS = 600000,
  PROXIED_PATHS = ["/v1/messages", "/v1/messages/count_tokens"];
/**
 * 依次尝试各上游的 count_tokens（SDK 或 HTTP），Bedrock 用 countTokens 或 max_tokens=1 的请求；都失败时按字符数/4 估算。
 */
//@ chunk-1ny7cxrt.js:1346344-1347543 placement
async function countTokensViaUpstreams(e, t, n, o, r) {
  let s = typeof e.model === "string" ? e.model : null,
    a = { system: e.system, messages: e.messages, tools: e.tools };
  for (let l of t) {
    if (l.kind === "sdk" && l.provider === "bedrock") continue;
    let c = s ? resolveUpstreamModel(s, l, n, o) : null;
    if (!c?.ok) continue;
    let u = { ...a, model: c.model };
    try {
      if (l.kind === "sdk") return (await l.client.messages.countTokens(u)).input_tokens;
      let headers = new Headers({ "content-type": "application/json", "anthropic-version": "2023-06-01" });
      (wE(headers, l), setUserIdentityHeaders(headers, l, r), await l.applyAuth(headers));
      let h = `${l.baseUrl.replace(/\/$/, "")}/v1/messages/count_tokens`,
        m = await (l.fetch ?? ssrfSafeFetch)(h, {
          method: "POST",
          headers: headers,
          body: jsonStringify(u),
          ...getProxyFetchOptions({ url: h }),
          timeout: !1,
          signal: AbortSignal.timeout(1e4),
        });
      if (!m.ok) continue;
      let body = await m.json();
      if (typeof body.input_tokens === "number") return body.input_tokens;
    } catch {}
  }
  for (let l of t) {
    if (l.kind !== "sdk" || l.provider !== "bedrock") continue;
    let c = s ? resolveUpstreamModel(s, l, n, o) : null;
    if (!c?.ok) continue;
    let u = await l.countTokens?.(c.model, {
      ...a,
      max_tokens: typeof e.max_tokens === "number" ? e.max_tokens : 1,
      ...(e.thinking !== void 0 && { thinking: e.thinking }),
    });
    if (typeof u === "number") return u;
    try {
      return (await l.client.messages.create({ ...a, model: c.model, max_tokens: 1, stream: !1 })).usage
        .input_tokens;
    } catch {}
  }
  return Math.ceil(jsonStringify(a).length / 4);
}
//@ chunk-1ny7cxrt.js:1347543-1347580 placement
function p_(e) {
  return PROXIED_PATHS.includes(e);
}
//@ chunk-1ny7cxrt.js:1347580-1347664 placement
function hE(e) {
  let t = extractModelIdFromArn(e),
    n = getBedrockRegionPrefix_2(t),
    o = n ? t.slice(n.length + 1) : t;
  return isFoundationModel(o) ? o : null;
}

export {
  hE,
  UPSTREAM_REQUEST_ID_HEADERS,
  UPSTREAM_TIMEOUT_MS,
  f_,
  STRIPPED_RESPONSE_HEADERS,
  SSE_PING_INTERVAL_MS,
  SSE_PING_FRAME,
  SSE_RESPONSE_HEADERS,
  p_,
  countTokensViaUpstreams,
};

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
import { copyHeadersInto, setUserIdentityHeaders } from "./messagesHandler.js";
import { ssrfSafeFetch } from "./ssrfGuard.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import {
  extractModelIdFromArn,
  getBedrockRegionPrefix_2,
  isFoundationModel,
} from "../../utils/model/bedrock.js";

//@ chunk-1ny7cxrt.js:1345635-1345745 placement
/**
 * 转发给上游的请求头白名单（另含 x-stainless-*）。
 */
var FORWARDED_REQUEST_HEADERS = new Set([
  "content-type",
  "accept",
  "accept-encoding",
  "anthropic-beta",
  "anthropic-version",
  "user-agent",
]);
//@ chunk-1ny7cxrt.js:1345745-1345883 placement
/**
 * 从客户端请求头中挑出允许转发的头。
 */
function pickForwardedHeaders(headers) {
  let headers_2 = new Headers();
  headers.forEach((n, o) => {
    let lower = o.toLowerCase();
    if (FORWARDED_REQUEST_HEADERS.has(lower) || lower.startsWith("x-stainless-")) headers_2.set(o, n);
  });
  return headers_2;
}
//@ chunk-1ny7cxrt.js:1345883-1345957 placement
/**
 * 取要转发的请求部分（查询串与允许转发的请求头）。
 */
function forwardedRequestParts(e) {
  return {
    search: new URL(e.url).search,
    headers: pickForwardedHeaders(e.headers),
  };
}
//@ chunk-1ny7cxrt.js:1345957-1346344 placement
/**
 * 代理常量：上游请求 id 头、不回传的响应头、SSE 响应头、心跳间隔与 ping 帧、请求超时、可代理路径。
 */
var UPSTREAM_REQUEST_ID_HEADERS = ["x-gateway-upstream-request-id", "x-gateway-upstream-cloud-request-id"];
var STRIPPED_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "cf-ray",
  "via",
  "request-id",
  ...UPSTREAM_REQUEST_ID_HEADERS,
];
var SSE_RESPONSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};
var SSE_PING_INTERVAL_MS = 15000;
var SSE_PING_FRAME = `event: ping
data: {"type": "ping"}

`;
var UPSTREAM_TIMEOUT_MS = 600000;
var PROXIED_PATHS = ["/v1/messages", "/v1/messages/count_tokens"];
//@ chunk-1ny7cxrt.js:1346344-1347543 placement
/**
 * 依次尝试各上游的 count_tokens（SDK 或 HTTP），Bedrock 用 countTokens 或 max_tokens=1 的请求；都失败时按字符数/4 估算。
 */
async function countTokensViaUpstreams(e, t, n, autoIncludeBuiltinModels, r) {
  let model = typeof e.model === "string" ? e.model : null;
  let a = {
    system: e.system,
    messages: e.messages,
    tools: e.tools,
  };
  for (let l of t) {
    if (l.kind === "sdk" && l.provider === "bedrock") continue;
    let c = model ? resolveUpstreamModel(model, l, n, autoIncludeBuiltinModels) : null;
    if (!c?.ok) continue;
    let u = {
      ...a,
      model: c.model,
    };
    try {
      if (l.kind === "sdk") return (await l.client.messages.countTokens(u)).input_tokens;
      let headers = new Headers({
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      });
      copyHeadersInto(headers, l);
      setUserIdentityHeaders(headers, l, r);
      await l.applyAuth(headers);
      let h = `${l.baseUrl.replace(/\/$/, "")}/v1/messages/count_tokens`;
      let m = await (l.fetch ?? ssrfSafeFetch)(h, {
        method: "POST",
        headers,
        body: jsonStringify(u),
        ...getProxyFetchOptions({
          url: h,
        }),
        timeout: false,
        signal: AbortSignal.timeout(1e4),
      });
      if (!m.ok) continue;
      let body = await m.json();
      if (typeof body.input_tokens === "number") return body.input_tokens;
    } catch {}
  }
  for (let l of t) {
    if (l.kind !== "sdk" || l.provider !== "bedrock") continue;
    let c = model ? resolveUpstreamModel(model, l, n, autoIncludeBuiltinModels) : null;
    if (!c?.ok) continue;
    let u = await l.countTokens?.(c.model, {
      ...a,
      max_tokens: typeof e.max_tokens === "number" ? e.max_tokens : 1,
      ...(e.thinking !== undefined && {
        thinking: e.thinking,
      }),
    });
    if (typeof u === "number") return u;
    try {
      return (
        await l.client.messages.create({
          ...a,
          model: c.model,
          max_tokens: 1,
          stream: false,
        })
      ).usage.input_tokens;
    } catch {}
  }
  return Math.ceil(jsonStringify(a).length / 4);
}
//@ chunk-1ny7cxrt.js:1347543-1347580 placement
/**
 * 判断该路径是否属于可代理路径。
 */
function isProxiedPath(pathname) {
  return PROXIED_PATHS.includes(pathname);
}
//@ chunk-1ny7cxrt.js:1347580-1347664 placement
/**
 * 从 Bedrock ARN 或模型名里取出基础模型名（区域前缀剥掉后校验）。
 */
function bedrockModelFromArnOrName(modelId) {
  let modelIdFromArn = extractModelIdFromArn(modelId);
  let bedrockRegionPrefix = getBedrockRegionPrefix_2(modelIdFromArn);
  let modelId_2 = bedrockRegionPrefix ? modelIdFromArn.slice(bedrockRegionPrefix.length + 1) : modelIdFromArn;
  return isFoundationModel(modelId_2) ? modelId_2 : null;
}
export {
  bedrockModelFromArnOrName,
  UPSTREAM_REQUEST_ID_HEADERS,
  UPSTREAM_TIMEOUT_MS,
  forwardedRequestParts,
  STRIPPED_RESPONSE_HEADERS,
  SSE_PING_INTERVAL_MS,
  SSE_PING_FRAME,
  SSE_RESPONSE_HEADERS,
  isProxiedPath,
  countTokensViaUpstreams,
};

/**
 * services/claudeGateway/proxyRequest.ts
 *
 * 2.1.316 新增：网关代理请求构造
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (7)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1hnjmk23.js:1346598-1346708 placement
/**
 * 转发给上游的请求头白名单（另含 x-stainless-*）。
 */
var FORWARDED_REQUEST_HEADERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1346598", () => {
  FORWARDED_REQUEST_HEADERS = new Set([
    "content-type",
    "accept",
    "accept-encoding",
    "anthropic-beta",
    "anthropic-version",
    "user-agent",
  ]);
});
//@ chunk-1hnjmk23.js:1346708-1346846 placement
/**
 * 从客户端请求头中挑出允许转发的头。
 */
function pickForwardedHeaders(headers) {
  let headers_2 = new Headers();
  headers.forEach((value, name) => {
    let lower = name.toLowerCase();
    if (FORWARDED_REQUEST_HEADERS.has(lower) || lower.startsWith("x-stainless-")) headers_2.set(name, value);
  });
  return headers_2;
}
//@ chunk-1hnjmk23.js:1346846-1346920 placement
/**
 * 取要转发的请求部分（查询串与允许转发的请求头）。
 */
function forwardedRequestParts(request) {
  return {
    search: new URL(request.url).search,
    headers: pickForwardedHeaders(request.headers),
  };
}
//@ chunk-1hnjmk23.js:1346920-1347307 placement
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
//@ chunk-1hnjmk23.js:1347307-1348506 placement
/**
 * 依次尝试各上游的 count_tokens（SDK 或 HTTP），Bedrock 用 countTokens 或 max_tokens=1 的请求；都失败时按字符数/4 估算。
 */
async function countTokensViaUpstreams(payload, upstreams, models, autoIncludeBuiltinModels, principal) {
  let model = typeof payload.model === "string" ? payload.model : null;
  let countPayload = {
    system: payload.system,
    messages: payload.messages,
    tools: payload.tools,
  };
  for (let upstream of upstreams) {
    if (upstream.kind === "sdk" && upstream.provider === "bedrock") continue;
    let resolved = model ? resolveUpstreamModel(model, upstream, models, autoIncludeBuiltinModels) : null;
    if (!resolved?.ok) continue;
    let upstreamPayload = {
      ...countPayload,
      model: resolved.model,
    };
    try {
      if (upstream.kind === "sdk")
        return (await upstream.client.messages.countTokens(upstreamPayload)).input_tokens;
      let headers = new Headers({
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      });
      copyHeadersInto(headers, upstream);
      setUserIdentityHeaders(headers, upstream, principal);
      await upstream.applyAuth(headers);
      let countUrl = `${upstream.baseUrl.replace(/\/$/, "")}/v1/messages/count_tokens`;
      let response = await (upstream.fetch ?? ssrfSafeFetch)(countUrl, {
        method: "POST",
        headers,
        body: jsonStringify(upstreamPayload),
        ...getProxyFetchOptions({
          url: countUrl,
        }),
        timeout: false,
        signal: AbortSignal.timeout(1e4),
      });
      if (!response.ok) continue;
      let body = await response.json();
      if (typeof body.input_tokens === "number") return body.input_tokens;
    } catch {}
  }
  for (let upstream of upstreams) {
    if (upstream.kind !== "sdk" || upstream.provider !== "bedrock") continue;
    let resolved = model ? resolveUpstreamModel(model, upstream, models, autoIncludeBuiltinModels) : null;
    if (!resolved?.ok) continue;
    let tokenCount = await upstream.countTokens?.(resolved.model, {
      ...countPayload,
      max_tokens: typeof payload.max_tokens === "number" ? payload.max_tokens : 1,
      ...(payload.thinking !== undefined && {
        thinking: payload.thinking,
      }),
    });
    if (typeof tokenCount === "number") return tokenCount;
    try {
      return (
        await upstream.client.messages.create({
          ...countPayload,
          model: resolved.model,
          max_tokens: 1,
          stream: false,
        })
      ).usage.input_tokens;
    } catch {}
  }
  return Math.ceil(jsonStringify(countPayload).length / 4);
}
//@ chunk-1hnjmk23.js:1348506-1348543 placement
/**
 * 判断该路径是否属于可代理路径。
 */
function isProxiedPath(pathname) {
  return PROXIED_PATHS.includes(pathname);
}
//@ chunk-1hnjmk23.js:1348543-1348627 placement
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

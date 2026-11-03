/**
 * services/claudeGateway/upstreams/stream.ts
 *
 * 2.1.316 新增：网关上游流式响应处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (4)
 * attribution: placement 4
 */
import { SSE_PING_INTERVAL_MS, SSE_PING_FRAME, SSE_RESPONSE_HEADERS } from "../proxyRequest.js";
import { reportGuardrailTrace } from "../bedrockGuardrails.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import { Uf } from "./aws.js";
import { errorMessage } from "../../../utils/errors.js";
import { Ot, fT } from "../../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  Bu,
  UPSTREAM_ERROR_MESSAGES,
  Ja,
  jsonErrorResponse,
  withUpstreamRequestIds,
  upstreamErrorMessage,
  weakMap,
} from "../upstreamErrors.js";
import { getBetaByName } from "../../../utils/betas.js";
import { uniq } from "../../../utils/collections.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

/**
 * 把 SDK 流事件转为 SSE 响应流：定时发 ping 保活、改写 message_start 的模型名、上报 guardrail trace，出错时发 error 事件。
 */
//@ chunk-1ny7cxrt.js:1371328-1372364 placement
function sdkStreamToSse(
  e,
  { requestId: t, wireModel: n, guardrailTraceRow: o, keepaliveIntervalMs: r = SSE_PING_INTERVAL_MS } = {},
) {
  let textEncoder = new TextEncoder(),
    encode = textEncoder.encode(SSE_PING_FRAME),
    l = e[Symbol.asyncIterator](),
    now = Date.now(),
    u = !1,
    f;
  return new ReadableStream({
    start(h) {
      ((f = setInterval(
        () => {
          if (!u && Date.now() - now >= r && (h.desiredSize ?? 0) > 0)
            (h.enqueue(encode), (now = Date.now()));
        },
        Math.ceil(r / 3),
      )),
        f.unref?.());
    },
    async pull(h) {
      try {
        let { value: m, done: y } = await l.next();
        if (u) return;
        if (y) {
          ((u = !0), clearInterval(f), h.close());
          return;
        }
        if (o) reportGuardrailTrace(m, o);
        let b = m,
          w =
            n !== void 0 && m.type === "message_start" && typeof b.message === "object" && b.message !== null
              ? { ...m, message: { ...b.message, model: n } }
              : m;
        (h.enqueue(
          textEncoder.encode(`event: ${w.type}
data: ${jsonStringify(w)}

`),
        ),
          (now = Date.now()));
      } catch (error) {
        if (u) return;
        gatewayLog("warn", `upstream stream error request_id=${t ?? "-"}: ${Uf(errorMessage(error))}`);
        let y = error instanceof Ot ? (error.status ?? 500) : 500;
        (h.enqueue(
          textEncoder.encode(`event: error
data: ${jsonStringify({ type: "error", ...(t && { request_id: t }), error: { type: Bu(y), message: UPSTREAM_ERROR_MESSAGES[y] ?? "upstream error" } })}

`),
        ),
          (u = !0),
          clearInterval(f),
          h.close());
      }
    },
    async cancel() {
      ((u = !0), clearInterval(f), await l.return?.(void 0).catch(() => {}));
    },
  });
}
/**
 * Bedrock 上游时把 anthropic-beta 头转成请求体 anthropic_beta 字段。
 */
//@ chunk-1ny7cxrt.js:1372364-1372700 placement
function moveBetasToBody(e, t, n) {
  if (n !== "bedrock" || !t) return { body: e, betaHeader: t || void 0 };
  let o = [];
  for (let s of t.split(",")) {
    let trimmed = s.trim();
    if (!trimmed) continue;
    let l = getBetaByName(trimmed);
    o.push(l ? l.header : trimmed);
  }
  if (o.length === 0) return { body: e, betaHeader: void 0 };
  let anthropic_beta = e.anthropic_beta;
  return {
    body: { ...e, anthropic_beta: uniq([...(Array.isArray(anthropic_beta) ? anthropic_beta : []), ...o]) },
    betaHeader: void 0,
  };
}
//@ chunk-1ny7cxrt.js:1372700-1372724 placement
var GH = ["workspace_id"];
/**
 * 通过 SDK 客户端转发 /v1/messages（流式或非流式）与 count_tokens（Bedrock 特殊处理），把 API 错误转为网关错误响应。
 */
//@ chunk-1ny7cxrt.js:1372724-1374403 placement
async function forwardViaSdk(e, t, n, o, r, s, a, l, c, u, f, h) {
  let m = moveBetasToBody(t, r, n),
    body = m.body,
    b = { ...s, ...(m.betaHeader && { "anthropic-beta": m.betaHeader }) },
    w = l !== void 0 && (e !== "/v1/messages" || Boolean(body.stream)),
    S = {
      signal: a,
      ...(w && { timeout: Math.min(l, Ja) }),
      ...(Object.keys(b).length > 0 && { headers: b }),
    },
    found = GH.find((M) => Object.hasOwn(body, M));
  if (found !== void 0)
    return jsonErrorResponse(400, "invalid_request_error", `${found}: not supported through the gateway`, c);
  if (e === "/v1/messages/count_tokens" && n === "bedrock") {
    let { model: model, ...N } = body,
      F = body.thinking?.budget_tokens,
      X = await f?.(model, { max_tokens: typeof F === "number" ? F + 1 : 1, ...N });
    if (typeof X === "number") return Response.json({ input_tokens: X });
    return jsonErrorResponse(
      501,
      "not_supported",
      "count_tokens is not available on this Bedrock upstream",
      c,
      { "x-should-retry": "false" },
    );
  }
  try {
    switch (e) {
      case "/v1/messages": {
        if (body.stream) {
          let { data: Z, response: response } = await o.messages
            .create({ ...body, stream: !0 }, S)
            .withResponse();
          return withUpstreamRequestIds(
            new Response(sdkStreamToSse(Z, { requestId: c, wireModel: u, guardrailTraceRow: h }), {
              headers: SSE_RESPONSE_HEADERS,
            }),
            response.headers,
          );
        }
        let { data: M, response: response } = await o.messages.create(body, S).withResponse();
        if (h) reportGuardrailTrace(M, h);
        return withUpstreamRequestIds(Response.json(u !== void 0 ? { ...M, model: u } : M), response.headers);
      }
      case "/v1/messages/count_tokens": {
        let { data: M, response: response } = await o.messages.countTokens(body, S).withResponse();
        return withUpstreamRequestIds(Response.json(M), response.headers);
      }
    }
  } catch (error) {
    if (error instanceof Ot) {
      let N = error.status ?? 500,
        Z = w && error instanceof fT ? ` (timeouts.upstream_ttfb_ms: ${l})` : "",
        F =
          error.cause instanceof Error
            ? `${error.message} (cause: ${error.cause.name}: ${truncateToLength(error.cause.message, 1000)})`
            : error.message;
      gatewayLog("warn", `${n} upstream ${N} request_id=${c ?? "-"}: ${Uf(F)}${Z}`);
      let X = jsonErrorResponse(N, Bu(N), upstreamErrorMessage(N, error, r), c);
      return (
        weakMap.set(X, {
          errorType: error.headers?.get("x-amzn-errortype") ?? void 0,
          message: error.message,
        }),
        withUpstreamRequestIds(X, error.headers)
      );
    }
    throw error;
  }
}

export { forwardViaSdk };

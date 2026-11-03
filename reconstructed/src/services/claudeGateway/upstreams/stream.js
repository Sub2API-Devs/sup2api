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
import { redactAwsSessionName } from "./aws.js";
import { errorMessage } from "../../../utils/errors.js";
import { APIError, APIConnectionTimeoutError } from "../../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  errorTypeForStatus,
  UPSTREAM_ERROR_MESSAGES,
  ERROR_RETRY_AFTER_MS,
  jsonErrorResponse,
  withUpstreamRequestIds,
  upstreamErrorMessage,
  weakMap,
} from "../upstreamErrors.js";
import { getBetaByName } from "../../../utils/betas.js";
import { uniq } from "../../../utils/collections.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-1ny7cxrt.js:1371328-1372364 placement
/**
 * 把 SDK 流事件转为 SSE 响应流：定时发 ping 保活、改写 message_start 的模型名、上报 guardrail trace，出错时发 error 事件。
 */
function sdkStreamToSse(
  e,
  { requestId: t, wireModel: n, guardrailTraceRow: o, keepaliveIntervalMs: r = SSE_PING_INTERVAL_MS } = {},
) {
  let textEncoder = new TextEncoder();
  let a = textEncoder.encode(SSE_PING_FRAME);
  let l = e[Symbol.asyncIterator]();
  let now = Date.now();
  let u = false;
  let f;
  return new ReadableStream({
    start(h) {
      f = setInterval(
        () => {
          if (!u && Date.now() - now >= r && (h.desiredSize ?? 0) > 0) {
            h.enqueue(a);
            now = Date.now();
          }
        },
        Math.ceil(r / 3),
      );
      f.unref?.();
    },
    async pull(h) {
      try {
        let { value: m, done: y } = await l.next();
        if (u) return;
        if (y) {
          u = true;
          clearInterval(f);
          h.close();
          return;
        }
        if (o) reportGuardrailTrace(m, o);
        let b = m;
        let w =
          n !== undefined && m.type === "message_start" && typeof b.message === "object" && b.message !== null
            ? {
                ...m,
                message: {
                  ...b.message,
                  model: n,
                },
              }
            : m;
        h.enqueue(
          textEncoder.encode(`event: ${w.type}
data: ${jsonStringify(w)}

`),
        );
        now = Date.now();
      } catch (error) {
        if (u) return;
        gatewayLog(
          "warn",
          `upstream stream error request_id=${t ?? "-"}: ${redactAwsSessionName(errorMessage(error))}`,
        );
        let y = error instanceof APIError ? (error.status ?? 500) : 500;
        h.enqueue(
          textEncoder.encode(`event: error
data: ${jsonStringify({
            type: "error",
            ...(t && {
              request_id: t,
            }),
            error: {
              type: errorTypeForStatus(y),
              message: UPSTREAM_ERROR_MESSAGES[y] ?? "upstream error",
            },
          })}

`),
        );
        u = true;
        clearInterval(f);
        h.close();
      }
    },
    async cancel() {
      u = true;
      clearInterval(f);
      await l.return?.(undefined).catch(() => {});
    },
  });
}
//@ chunk-1ny7cxrt.js:1372364-1372700 placement
/**
 * Bedrock 上游时把 anthropic-beta 头转成请求体 anthropic_beta 字段。
 */
function moveBetasToBody(e, t, n) {
  if (n !== "bedrock" || !t)
    return {
      body: e,
      betaHeader: t || undefined,
    };
  let o = [];
  for (let s of t.split(",")) {
    let trimmed = s.trim();
    if (!trimmed) continue;
    let betaByName = getBetaByName(trimmed);
    o.push(betaByName ? betaByName.header : trimmed);
  }
  if (o.length === 0)
    return {
      body: e,
      betaHeader: undefined,
    };
  let anthropicBeta = e.anthropic_beta;
  return {
    body: {
      ...e,
      anthropic_beta: uniq([...(Array.isArray(anthropicBeta) ? anthropicBeta : []), ...o]),
    },
    betaHeader: undefined,
  };
}
//@ chunk-1ny7cxrt.js:1372700-1372724 placement
/**
 * 请求体里若出现这些键就视为带 id 的调用（workspace_id）。
 */
var BODY_ID_KEYS = ["workspace_id"];
//@ chunk-1ny7cxrt.js:1372724-1374403 placement
/**
 * 通过 SDK 客户端转发 /v1/messages（流式或非流式）与 count_tokens（Bedrock 特殊处理），把 API 错误转为网关错误响应。
 */
async function forwardViaSdk(e, t, provider, o, r, s, signal, l, c, u, countTokens, h) {
  let m = moveBetasToBody(t, r, provider);
  let body = m.body;
  let b = {
    ...s,
    ...(m.betaHeader && {
      "anthropic-beta": m.betaHeader,
    }),
  };
  let w = l !== undefined && (e !== "/v1/messages" || Boolean(body.stream));
  let S = {
    signal,
    ...(w && {
      timeout: Math.min(l, ERROR_RETRY_AFTER_MS),
    }),
    ...(Object.keys(b).length > 0 && {
      headers: b,
    }),
  };
  let found = BODY_ID_KEYS.find((M) => Object.hasOwn(body, M));
  if (found !== undefined)
    return jsonErrorResponse(400, "invalid_request_error", `${found}: not supported through the gateway`, c);
  if (e === "/v1/messages/count_tokens" && provider === "bedrock") {
    let { model, ...N } = body;
    let budgetTokens = body.thinking?.budget_tokens;
    let X = await countTokens?.(model, {
      max_tokens: typeof budgetTokens === "number" ? budgetTokens + 1 : 1,
      ...N,
    });
    if (typeof X === "number")
      return Response.json({
        input_tokens: X,
      });
    return jsonErrorResponse(
      501,
      "not_supported",
      "count_tokens is not available on this Bedrock upstream",
      c,
      {
        "x-should-retry": "false",
      },
    );
  }
  try {
    switch (e) {
      case "/v1/messages": {
        if (body.stream) {
          let { data: Z, response } = await o.messages
            .create(
              {
                ...body,
                stream: true,
              },
              S,
            )
            .withResponse();
          return withUpstreamRequestIds(
            new Response(
              sdkStreamToSse(Z, {
                requestId: c,
                wireModel: u,
                guardrailTraceRow: h,
              }),
              {
                headers: SSE_RESPONSE_HEADERS,
              },
            ),
            response.headers,
          );
        }
        let { data: M, response } = await o.messages.create(body, S).withResponse();
        if (h) reportGuardrailTrace(M, h);
        return withUpstreamRequestIds(
          Response.json(
            u !== undefined
              ? {
                  ...M,
                  model: u,
                }
              : M,
          ),
          response.headers,
        );
      }
      case "/v1/messages/count_tokens": {
        let { data: M, response } = await o.messages.countTokens(body, S).withResponse();
        return withUpstreamRequestIds(Response.json(M), response.headers);
      }
    }
  } catch (error) {
    if (error instanceof APIError) {
      let status = error.status ?? 500;
      let Z = w && error instanceof APIConnectionTimeoutError ? ` (timeouts.upstream_ttfb_ms: ${l})` : "";
      let F =
        error.cause instanceof Error
          ? `${error.message} (cause: ${error.cause.name}: ${truncateToLength(error.cause.message, 1000)})`
          : error.message;
      gatewayLog(
        "warn",
        `${provider} upstream ${status} request_id=${c ?? "-"}: ${redactAwsSessionName(F)}${Z}`,
      );
      let X = jsonErrorResponse(
        status,
        errorTypeForStatus(status),
        upstreamErrorMessage(status, error, r),
        c,
      );
      weakMap.set(X, {
        errorType: error.headers?.get("x-amzn-errortype") ?? undefined,
        message: error.message,
      });
      return withUpstreamRequestIds(X, error.headers);
    }
    throw error;
  }
}
export { forwardViaSdk };

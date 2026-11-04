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
  stream,
  { requestId, wireModel, guardrailTraceRow, keepaliveIntervalMs = SSE_PING_INTERVAL_MS } = {},
) {
  let textEncoder = new TextEncoder();
  let pingFrame = textEncoder.encode(SSE_PING_FRAME);
  let iterator = stream[Symbol.asyncIterator]();
  let now = Date.now();
  let finished = false;
  let keepaliveTimer;
  return new ReadableStream({
    start(controller) {
      keepaliveTimer = setInterval(
        () => {
          if (!finished && Date.now() - now >= keepaliveIntervalMs && (controller.desiredSize ?? 0) > 0) {
            controller.enqueue(pingFrame);
            now = Date.now();
          }
        },
        Math.ceil(keepaliveIntervalMs / 3),
      );
      keepaliveTimer.unref?.();
    },
    async pull(controller) {
      try {
        let { value: event, done } = await iterator.next();
        if (finished) return;
        if (done) {
          finished = true;
          clearInterval(keepaliveTimer);
          controller.close();
          return;
        }
        if (guardrailTraceRow) reportGuardrailTrace(event, guardrailTraceRow);
        let rawEvent = event;
        let outboundEvent =
          wireModel !== undefined &&
          event.type === "message_start" &&
          typeof rawEvent.message === "object" &&
          rawEvent.message !== null
            ? {
                ...event,
                message: {
                  ...rawEvent.message,
                  model: wireModel,
                },
              }
            : event;
        controller.enqueue(
          textEncoder.encode(`event: ${outboundEvent.type}
data: ${jsonStringify(outboundEvent)}

`),
        );
        now = Date.now();
      } catch (error) {
        if (finished) return;
        gatewayLog(
          "warn",
          `upstream stream error request_id=${requestId ?? "-"}: ${redactAwsSessionName(errorMessage(error))}`,
        );
        let status = error instanceof APIError ? (error.status ?? 500) : 500;
        controller.enqueue(
          textEncoder.encode(`event: error
data: ${jsonStringify({
            type: "error",
            ...(requestId && {
              request_id: requestId,
            }),
            error: {
              type: errorTypeForStatus(status),
              message: UPSTREAM_ERROR_MESSAGES[status] ?? "upstream error",
            },
          })}

`),
        );
        finished = true;
        clearInterval(keepaliveTimer);
        controller.close();
      }
    },
    async cancel() {
      finished = true;
      clearInterval(keepaliveTimer);
      await iterator.return?.(undefined).catch(() => {});
    },
  });
}
//@ chunk-1ny7cxrt.js:1372364-1372700 placement
/**
 * Bedrock 上游时把 anthropic-beta 头转成请求体 anthropic_beta 字段。
 */
function moveBetasToBody(body, betaHeader, provider) {
  if (provider !== "bedrock" || !betaHeader)
    return {
      body,
      betaHeader: betaHeader || undefined,
    };
  let betas = [];
  for (let entry of betaHeader.split(",")) {
    let name = entry.trim();
    if (!name) continue;
    let betaByName = getBetaByName(name);
    betas.push(betaByName ? betaByName.header : name);
  }
  if (betas.length === 0)
    return {
      body,
      betaHeader: undefined,
    };
  let anthropicBeta = body.anthropic_beta;
  return {
    body: {
      ...body,
      anthropic_beta: uniq([...(Array.isArray(anthropicBeta) ? anthropicBeta : []), ...betas]),
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
async function forwardViaSdk(
  pathname,
  payload,
  provider,
  client,
  betaHeader,
  baseHeaders,
  signal,
  ttfbMs,
  requestId,
  wireModel,
  countTokens,
  traceRow,
) {
  let prepared = moveBetasToBody(payload, betaHeader, provider);
  let body = prepared.body;
  let headers = {
    ...baseHeaders,
    ...(prepared.betaHeader && {
      "anthropic-beta": prepared.betaHeader,
    }),
  };
  let streamingOrNonMessages = ttfbMs !== undefined && (pathname !== "/v1/messages" || Boolean(body.stream));
  let requestOptions = {
    signal,
    ...(streamingOrNonMessages && {
      timeout: Math.min(ttfbMs, ERROR_RETRY_AFTER_MS),
    }),
    ...(Object.keys(headers).length > 0 && {
      headers,
    }),
  };
  let found = BODY_ID_KEYS.find((bodyIdKey) => Object.hasOwn(body, bodyIdKey));
  if (found !== undefined)
    return jsonErrorResponse(
      400,
      "invalid_request_error",
      `${found}: not supported through the gateway`,
      requestId,
    );
  if (pathname === "/v1/messages/count_tokens" && provider === "bedrock") {
    let { model, ...restBody } = body;
    let budgetTokens = body.thinking?.budget_tokens;
    let tokenCount = await countTokens?.(model, {
      max_tokens: typeof budgetTokens === "number" ? budgetTokens + 1 : 1,
      ...restBody,
    });
    if (typeof tokenCount === "number")
      return Response.json({
        input_tokens: tokenCount,
      });
    return jsonErrorResponse(
      501,
      "not_supported",
      "count_tokens is not available on this Bedrock upstream",
      requestId,
      {
        "x-should-retry": "false",
      },
    );
  }
  try {
    switch (pathname) {
      case "/v1/messages": {
        if (body.stream) {
          let { data: stream, response } = await client.messages
            .create(
              {
                ...body,
                stream: true,
              },
              requestOptions,
            )
            .withResponse();
          return withUpstreamRequestIds(
            new Response(
              sdkStreamToSse(stream, {
                requestId,
                wireModel,
                guardrailTraceRow: traceRow,
              }),
              {
                headers: SSE_RESPONSE_HEADERS,
              },
            ),
            response.headers,
          );
        }
        let { data: message, response } = await client.messages.create(body, requestOptions).withResponse();
        if (traceRow) reportGuardrailTrace(message, traceRow);
        return withUpstreamRequestIds(
          Response.json(
            wireModel !== undefined
              ? {
                  ...message,
                  model: wireModel,
                }
              : message,
          ),
          response.headers,
        );
      }
      case "/v1/messages/count_tokens": {
        let { data: countResult, response } = await client.messages
          .countTokens(body, requestOptions)
          .withResponse();
        return withUpstreamRequestIds(Response.json(countResult), response.headers);
      }
    }
  } catch (error) {
    if (error instanceof APIError) {
      let status = error.status ?? 500;
      let ttfbNote =
        streamingOrNonMessages && error instanceof APIConnectionTimeoutError
          ? ` (timeouts.upstream_ttfb_ms: ${ttfbMs})`
          : "";
      let message =
        error.cause instanceof Error
          ? `${error.message} (cause: ${error.cause.name}: ${truncateToLength(error.cause.message, 1000)})`
          : error.message;
      gatewayLog(
        "warn",
        `${provider} upstream ${status} request_id=${requestId ?? "-"}: ${redactAwsSessionName(message)}${ttfbNote}`,
      );
      let errorResponse = jsonErrorResponse(
        status,
        errorTypeForStatus(status),
        upstreamErrorMessage(status, error, betaHeader),
        requestId,
      );
      weakMap.set(errorResponse, {
        errorType: error.headers?.get("x-amzn-errortype") ?? undefined,
        message: error.message,
      });
      return withUpstreamRequestIds(errorResponse, error.headers);
    }
    throw error;
  }
}
export { forwardViaSdk };

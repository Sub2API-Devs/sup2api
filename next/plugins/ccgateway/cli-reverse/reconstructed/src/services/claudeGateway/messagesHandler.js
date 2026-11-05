/**
 * services/claudeGateway/messagesHandler.ts
 *
 * 2.1.316 新增：网关 /v1/messages 处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (4)
 * attribution: placement 4
 */
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import {
  jsonErrorResponse,
  weakMap,
  INVALID_MODEL_ID_MESSAGE,
  copyDiagnosticHeaders,
} from "./upstreamErrors.js";
import {
  getRoleModelRestrictionMessage,
  findModelEntryById,
  operatorModelNotAllowedMessage,
  resolveUpstreamModel,
} from "./models.js";
import { findDisallowedNestedModel } from "./requestValidation.js";
import { sanitizeModelIdForMessage } from "../../utils/permissions/permissionExplainer.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { forwardRawRequest } from "./versionInfo.js";
import { applyBedrockGuardrails } from "./bedrockGuardrails.js";
import { errorMessage } from "../../utils/errors.js";
import { forwardViaSdk } from "./upstreams/stream.js";
import { isAwsCredentialError } from "../../utils/aws.js";
import { UPSTREAM_REQUEST_ID_HEADERS } from "./proxyRequest.js";
import { redactAwsSessionName } from "./upstreams/aws.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";

//@ chunk-1hnjmk23.js:1365386-1371256 placement
/**
 * 网关 /v1/messages 处理：读取并解析请求体、校验、按策略选择上游、计量与转发。
 */
async function handleGatewayMessagesRequest(
  request,
  pathname,
  upstreams,
  models,
  autoIncludeBuiltinModels = true,
  role,
  ttfbMs = 120000,
  requestId,
  requestContext,
) {
  let rawBody;
  let payload;
  if (requestContext?.body) {
    rawBody = requestContext.body.buf;
    payload = requestContext.body.parsed;
  } else {
    rawBody = await request.arrayBuffer();
    try {
      payload = jsonParse(Buffer.from(rawBody).toString("utf8"));
    } catch {
      return jsonErrorResponse(400, "invalid_request_error", "invalid JSON", requestId);
    }
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload))
    return jsonErrorResponse(400, "invalid_request_error", "request body must be a JSON object", requestId);
  if (!("model" in payload) || payload.model === "")
    return jsonErrorResponse(400, "invalid_request_error", "model is required", requestId);
  if (typeof payload.model !== "string")
    return jsonErrorResponse(400, "invalid_request_error", "model must be a string", requestId);
  let model = payload.model;
  let roleModelRestrictionMessage = getRoleModelRestrictionMessage(model, role, models);
  if (roleModelRestrictionMessage)
    return jsonErrorResponse(400, "invalid_request_error", roleModelRestrictionMessage, requestId);
  if (upstreams.length === 0)
    return jsonErrorResponse(
      400,
      "invalid_request_error",
      "you aren't in a group that can use this gateway. Ask your administrator to add you to one",
      requestId,
    );
  if (role?.availableModels || role?.deniedModels || !autoIncludeBuiltinModels) {
    let disallowedNestedModel = findDisallowedNestedModel(
      payload,
      (modelId) =>
        getRoleModelRestrictionMessage(modelId, role, models) ??
        (autoIncludeBuiltinModels || findModelEntryById(modelId, models)
          ? undefined
          : operatorModelNotAllowedMessage(modelId)),
    );
    if (disallowedNestedModel)
      return jsonErrorResponse(
        400,
        "invalid_request_error",
        `${sanitizeModelIdForMessage(disallowedNestedModel.path)}: ${disallowedNestedModel.reason}`,
        requestId,
      );
  }
  let errors = [];
  let anyAttempted = false;
  let listErrors = [];
  let logListErrors = () => {
    let mapped = listErrors.filter((entry) => !anyAttempted || !entry.listSkip).map((entry) => entry.text);
    if (mapped.length === 0) return;
    gatewayLog(
      "warn",
      `inference: model resolution failed request_id=${requestId ?? "-"}: ${mapped.join("; ")}`,
    );
  };
  let notImplementedResponse = null;
  let rateLimitedResponse = null;
  let authFailedResponse = null;
  let notFoundResponse = null;
  let requestIdResponse = null;
  let betaHeader = request.headers.get("anthropic-beta") ?? undefined;
  let stainlessHeaders = {};
  request.headers.forEach((header, headerName) => {
    if (headerName.toLowerCase().startsWith("x-stainless-")) stainlessHeaders[headerName] = header;
  });
  let isCri = requestContext?.criPrincipal === true;
  let ttfbMs_2 = requestContext?.ttfbOnSdkLegs ? ttfbMs : undefined;
  for (let upstream of upstreams) {
    if (request.signal.aborted) break;
    let upstreamModel = resolveUpstreamModel(model, upstream, models, autoIncludeBuiltinModels, isCri);
    if (!upstreamModel.ok) {
      errors.push(upstreamModel.error);
      listErrors.push({
        text: `${upstream.name}: ${upstreamModel.error}`,
        listSkip: upstreamModel.listSkip === true,
      });
      continue;
    }
    let model_2 = upstreamModel.model;
    let upstreamPayload =
      model_2 === model
        ? payload
        : {
            ...payload,
            model: model_2,
          };
    anyAttempted = true;
    try {
      let response;
      if (upstream.kind === "raw") {
        let body =
          upstreamPayload === payload ? rawBody : new TextEncoder().encode(jsonStringify(upstreamPayload));
        response = await forwardRawRequest(request, pathname, body, upstream, ttfbMs, requestContext?.user);
        if (response.status === 401 && upstream.invalidateAuth) {
          upstream.invalidateAuth();
          gatewayLog(
            "warn",
            `401 from ${upstream.name}; invalidated WIF bearer cache, retrying request_id=${requestId ?? "-"}`,
          );
          response.body?.cancel().catch(() => {});
          response = await forwardRawRequest(request, pathname, body, upstream, ttfbMs, requestContext?.user);
        }
      } else {
        let bedrockHeaderKey =
          (upstream.guardrail || upstream.guardrailTrace) && pathname === "/v1/messages"
            ? Object.keys(payload).find((key) => /^amazon-bedrock-/i.test(key))
            : undefined;
        let guardedPayload = upstreamPayload;
        if (bedrockHeaderKey === undefined && upstream.inputTagging && pathname === "/v1/messages")
          try {
            guardedPayload = applyBedrockGuardrails(upstreamPayload, upstream.inputTagging);
          } catch (error) {
            guardedPayload = undefined;
            gatewayLog(
              "warn",
              `upstream '${upstream.name}': input_tagging failed, answered 400 request_id=${requestId ?? "-"}: ${errorMessage(error)}`,
            );
          }
        if (bedrockHeaderKey !== undefined || guardedPayload === undefined) {
          for (let staleResponse of [
            notImplementedResponse,
            rateLimitedResponse,
            authFailedResponse,
            notFoundResponse,
          ])
            staleResponse?.body?.cancel().catch(() => {});
          logListErrors();
          return jsonErrorResponse(
            400,
            "invalid_request_error",
            bedrockHeaderKey === undefined
              ? isCri
                ? "the request could not be processed on this upstream"
                : "the request could not be prepared for the guardrail this gateway applies to Bedrock requests, so it was not sent"
              : isCri
                ? `${bedrockHeaderKey} is not permitted on this upstream`
                : `${bedrockHeaderKey} is not permitted: this gateway applies a guardrail to Bedrock requests`,
            requestId,
          );
        }
        let criModel = isCri ? model : undefined;
        let isCountTokens = pathname === "/v1/messages/count_tokens";
        let user = isCountTokens ? undefined : requestContext?.user;
        let traceContext = upstream.guardrailTrace
          ? {
              request_id: requestId,
              sub: requestContext?.user?.sub,
              email: requestContext?.user?.email,
              upstream: upstream.name,
            }
          : undefined;
        let assumeRoleSession =
          upstream.assumeRole && !(isCountTokens && upstream.provider === "bedrock")
            ? await upstream.assumeRole.clientFor(user)
            : undefined;
        response = await forwardViaSdk(
          pathname,
          guardedPayload,
          upstream.provider,
          assumeRoleSession?.client ?? upstream.client,
          betaHeader,
          stainlessHeaders,
          request.signal,
          ttfbMs_2,
          requestId,
          criModel,
          upstream.countTokens,
          traceContext,
        );
        let sdkError = weakMap.get(response);
        let invalidateCredentials =
          response.status === 401 || response.status === 403
            ? assumeRoleSession
              ? assumeRoleSession.invalidate
              : upstream.invalidateAuth
            : undefined;
        let isCredentialError =
          sdkError !== undefined && isAwsCredentialError(sdkError.errorType, sdkError.message);
        if (invalidateCredentials && !isCredentialError) invalidateCredentials();
        if (invalidateCredentials && isCredentialError) {
          let invalidationResult = invalidateCredentials();
          gatewayLog(
            "warn",
            `${response.status} from ${upstream.name}; ${invalidationResult ? "invalidated credential cache" : "credential invalidation debounced"}, retrying request_id=${requestId ?? "-"}`,
          );
          response.body?.cancel().catch(() => {});
          if (assumeRoleSession && upstream.assumeRole)
            assumeRoleSession = await upstream.assumeRole.clientFor(user);
          response = await forwardViaSdk(
            pathname,
            guardedPayload,
            upstream.provider,
            assumeRoleSession?.client ?? upstream.client,
            betaHeader,
            stainlessHeaders,
            request.signal,
            ttfbMs_2,
            requestId,
            criModel,
            upstream.countTokens,
            traceContext,
          );
        }
        let cachedSdkError = weakMap.get(response);
        let needsInferenceProfile = cachedSdkError?.message.startsWith(
          `400 Invocation of model ID ${model_2} with on-demand throughput isn`,
        );
        if (
          cachedSdkError &&
          upstream.provider === "bedrock" &&
          (needsInferenceProfile || cachedSdkError.message === INVALID_MODEL_ID_MESSAGE)
        ) {
          let safeModelId = sanitizeModelIdForMessage(model);
          gatewayLog(
            "warn",
            `upstream '${upstream.name}': AWS says model id ${model_2} (sent for ${safeModelId}) ${needsInferenceProfile ? "runs only through an inference profile here" : "is invalid"} request_id=${requestId ?? "-"}: under models:, map ${safeModelId} to ${needsInferenceProfile ? "an inference profile this AWS account offers; AWS may then run it in any region that profile spans" : "a model id or inference profile this AWS account and region offer"}`,
          );
          let bedrockErrorResponse = jsonErrorResponse(
            400,
            "invalid_request_error",
            `model ${safeModelId} is not available on bedrock`,
            requestId,
          );
          copyDiagnosticHeaders(response.headers, bedrockErrorResponse.headers);
          response = bedrockErrorResponse;
          weakMap.set(response, cachedSdkError);
        }
      }
      response.headers.set("x-gateway-upstream", upstream.name);
      response.headers.set("x-gateway-upstream-kind", "operator");
      response.headers.set("x-gateway-model", model);
      response.headers.set("x-gateway-upstream-model", model_2);
      if (
        !(
          response.status === 429 &&
          upstream.kind === "raw" &&
          upstream.forwardUserIdentity &&
          encodeHeaderValue(requestContext?.user?.email) !== undefined
        ) &&
        (response.status >= 500 ||
          response.status === 429 ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 404)
      ) {
        errors.push(`${response.status} ${response.statusText}`);
        if (response.status === 501) {
          if (notImplementedResponse) notImplementedResponse.body?.cancel().catch(() => {});
          notImplementedResponse = response;
        } else if (response.status === 429) {
          if (rateLimitedResponse) rateLimitedResponse.body?.cancel().catch(() => {});
          rateLimitedResponse = response;
        } else if (response.status === 401 || response.status === 403) {
          if (authFailedResponse) authFailedResponse.body?.cancel().catch(() => {});
          authFailedResponse = response;
        } else if (response.status === 404) {
          if (notFoundResponse) notFoundResponse.body?.cancel().catch(() => {});
          notFoundResponse = response;
        } else {
          response.body?.cancel().catch(() => {});
          if (UPSTREAM_REQUEST_ID_HEADERS.some((headerName) => response.headers.has(headerName)))
            requestIdResponse = response;
        }
        continue;
      }
      for (let staleResponse of [
        notImplementedResponse,
        rateLimitedResponse,
        authFailedResponse,
        notFoundResponse,
      ])
        staleResponse?.body?.cancel().catch(() => {});
      if (response.status >= 300) logListErrors();
      return response;
    } catch (error) {
      let redactedMessage = redactAwsSessionName(errorMessage(error));
      errors.push(redactedMessage);
      gatewayLog("warn", `upstream failed, trying next request_id=${requestId ?? "-"}: ${redactedMessage}`);
    }
  }
  if (request.signal.aborted) {
    for (let staleResponse of [
      notImplementedResponse,
      rateLimitedResponse,
      authFailedResponse,
      notFoundResponse,
    ])
      staleResponse?.body?.cancel().catch(() => {});
    return jsonErrorResponse(499, "api_error", "client closed request", requestId, {
      "x-gateway-model": sanitizeModelIdForMessage(model),
    });
  }
  logListErrors();
  if (!anyAttempted) return jsonErrorResponse(400, "invalid_request_error", errors.join("; "), requestId);
  if (rateLimitedResponse) {
    for (let staleResponse of [notImplementedResponse, authFailedResponse, notFoundResponse])
      staleResponse?.body?.cancel().catch(() => {});
    return rateLimitedResponse;
  }
  if (authFailedResponse) {
    for (let staleResponse of [notImplementedResponse, notFoundResponse])
      staleResponse?.body?.cancel().catch(() => {});
    return authFailedResponse;
  }
  if (notFoundResponse) {
    notImplementedResponse?.body?.cancel().catch(() => {});
    return notFoundResponse;
  }
  if (notImplementedResponse) return notImplementedResponse;
  gatewayLog("warn", `all upstreams failed request_id=${requestId ?? "-"}: ${errors.join("; ")}`);
  let failureResponse = jsonErrorResponse(
    502,
    "api_error",
    `all upstreams failed (${upstreams.length} attempted)`,
    requestId,
    {
      "x-gateway-model": sanitizeModelIdForMessage(model),
    },
  );
  for (let headerName of UPSTREAM_REQUEST_ID_HEADERS) {
    let headerValue = requestIdResponse?.headers.get(headerName);
    if (headerValue) failureResponse.headers.set(headerName, headerValue);
  }
  return failureResponse;
}
//@ chunk-1hnjmk23.js:1371256-1371372 placement
/**
 * 头部值规范化：去空白、全角空格转换，非可打印 ASCII 与 % 做 URL 编码。
 */
function encodeHeaderValue(email) {
  return email === undefined
    ? undefined
    : normalizeFullWidthSpace(email.trim()).replace(/[^\x21-\x7e]|%/gu, (char) => encodeURIComponent(char)) ||
        undefined;
}
//@ chunk-1hnjmk23.js:1371372-1371445 placement
/**
 * 把来源对象的 headers 逐项 set 到目标 Headers 上。
 */
function copyHeadersInto(headers, source) {
  for (let [key, value] of Object.entries(source.headers ?? {})) headers.set(key, value);
}
//@ chunk-1hnjmk23.js:1371445-1371661 placement
/**
 * 开启身份转发时设置 x-litellm-end-user-id、x-claude-gateway-user-id/email 头。
 */
function setUserIdentityHeaders(headers, options, identity) {
  if (!options.forwardUserIdentity || !identity) return;
  let email = encodeHeaderValue(identity.email);
  let sub = encodeHeaderValue(identity.sub);
  let pairs = [
    ["x-litellm-end-user-id", email],
    ["x-claude-gateway-user-id", sub],
    ["x-claude-gateway-user-email", email],
  ];
  for (let [headerName, headerValue] of pairs) if (headerValue) headers.set(headerName, headerValue);
}
export { copyHeadersInto, setUserIdentityHeaders, handleGatewayMessagesRequest };

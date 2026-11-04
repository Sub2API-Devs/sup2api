/**
 * utils/sideQuery.ts
 *
 * 旁路查询：在主对话之外发一次独立的小模型请求完成辅助任务
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sideQuery.ts
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 8, fingerprint 1
 */
import { randomUUID } from "crypto";
import { logError } from "./log.js";
import { withTelemetryMessage, toError, errorMessage, isAbortError } from "./errors.js";
import { logOTelEvent } from "./telemetry/events.js";
import { unlessManagedDeniedModel } from "./model/smallFastModel.js";
import {
  logUnrecognizedModel,
  isStructuredOutputsUnsupportedClaude,
  lowerEffort,
  learnedEffortCap,
  applyEffortToOutputConfig,
  isOneHourCacheTtl,
  getPromptCachingEnabled,
  getAPIMetadata,
  getDispatchVersion,
  V2P,
  ANTHROPIC_DISPATCH_ID,
  markStructuredOutputsUnsupportedClaude,
} from "../services/api/claude.js";
import { mainAgentContext, turnAttributionKeyFor } from "./agentContext.js";
import {
  isMainOrAgentQuerySource,
  isAutoModeQuerySource,
  classifyQuerySource,
} from "../services/api/requestHeaders.js";
import {
  getAnthropicClient,
  getToolNameList,
  hasCustomAuthorizationHeader,
  CLIENT_REQUEST_ID_HEADER,
} from "../services/api/client.js";
import {
  fetchWithRequestBodyCompression,
  takeGzipTelemetry,
  isRoutedFinalAnswerError,
  gzipTelemetryFields,
} from "../services/api/gzipRequestBody.js";
import { markRetryAfterTooLong, retryAfterTooLongMs } from "../services/api/retryAfter.js";
import { isAnthropicAuthEnabled, handleOAuth401Error, resetAuthFailureTracking } from "./auth.js";
import { env } from "./env.js";
import { withCatalogSuppressed } from "./model/modelCatalog/servedCatalog.js";
import {
  getModelBetas,
  BETA_THINKING_TOKEN_COUNT,
  BETA_MID_CONVERSATION_SYSTEM,
  modelSupportsStructuredOutputs,
  BETA_STRUCTURED_OUTPUTS,
  canSendFirstPartyBetas,
  BETA_EXTENDED_CACHE_TTL,
  modelSupportsTemperature,
  betasRequestParam,
  hitsAnthropicBackend,
  BETA_EFFORT,
  BETA_LONG_CONTEXT,
  rejectContextBetaForModel,
} from "./betas.js";
import {
  buildSideQuerySystem,
  classifyProviderErrorForModel,
  classifyModelAccess,
} from "./model/modelAccessCheck.js";
import { modelRejectsDisabledThinking } from "./thinking.js";
import {
  resolveEffortValue,
  isAboveHighEffort,
  modelCapsEffortWhenThinkingDisabled,
  THINKING_DISABLED_EFFORT_CAP,
} from "./effort.js";
import { logForDebugging } from "./debug.js";
import { count } from "./collections.js";
import { stripAnyVersatileSuffix } from "./model/modelIds.js";
import { toProviderWireModelId } from "./model/model.js";
import { containsMalformedStringDeep, repairMalformedStringsDeep } from "./stringUtils.js";
import { clone } from "./slowOperations.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2, fromEnumOpt, fromEnum, fromNumber } from "../services/analytics/safeMetadata.js";
import {
  agentTypeForTelemetry,
  redactAttribution,
  buildAttribution,
} from "../services/analytics/metadata.js";
import {
  startLLMRequestSpan,
  recordLlmRequestAttempt,
  getUpstreamTraceparent,
  endLLMRequestSpan,
} from "./telemetry/sessionTracing.js";
import { isLowPriorityActiveSafe } from "../services/lowPriority/lowPriorityMode.js";
import { isFirstPartyApiBackend, getProviderForModel } from "./model/providers.js";
import {
  parseFoundryUnsupportedCapabilities,
  recordFoundryUnsupportedCapabilities,
} from "../services/api/foundryCapabilities.js";
import {
  isEffortUnsupportedError,
  isStructuredOutputsUnsupported,
  isContext1mBetaRejected,
  isInvalidBetaFlagError,
  headerlessDeclineKind,
  headerlessDeclineRetryDelay,
  classifyAPIError,
  getAssistantMessageFromApiError,
} from "../services/api/errors.js";
import {
  markEffortUnsupported,
  getLastApiCompletionTimestamp,
  setLastApiCompletionTimestamp,
  addSideQueryCostUSD,
} from "../bootstrap/state.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { alwaysFalseD, emptyString } from "../services/api/responseDiagnostics.js";
import { APIError, APIConnectionError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { sanitizeMarkName } from "./startupMarks.js";
import { sleep } from "./sleep.js";
import { isOAuthTokenRevokedError } from "../services/api/withRetry.js";
import {
  apiErrorFields,
  apiErrorText,
  addUsageToSession,
  apiSuccessFields,
} from "../services/api/logging.js";
import { calculateCostWithPricingSource } from "./modelCost.js";
import { emitPrefetchChanged } from "../services/policyLimits/prefetchToggle.js";

//@ chunk-e6aww6q8.js:2808592-2808644 placement
var logSideQueryError = (error) => logError(withTelemetryMessage(toError(error), "side query record failed"));
//@ chunk-e6aww6q8.js:2808644-2808778 placement
/**
 * 发送旁路查询的 OTel 事件（出错只记录）。
 */
function emitSideQueryOtelEvent({ record, event, attributes, agentContext }) {
  try {
    logOTelEvent(
      event,
      {
        ...attributes(),
        ...record.names,
      },
      agentContext,
      record.hookOrigin,
    ).catch(logSideQueryError);
  } catch (error) {
    logSideQueryError(error);
  }
}
//@ chunk-e6aww6q8.js:2808778-2808844 placement
/**
 * 带并发计数的旁路查询，供插件/分类器调用模型。
 */
async function sideQueryWithCounter(opts) {
  activeSideQueryCount++;
  try {
    return await sideQuery(opts);
  } finally {
    activeSideQueryCount--;
  }
}
//@ chunk-e6aww6q8.js:2808844-2808854 placement
var activeSideQueryCount = 0;
//@ chunk-e6aww6q8.js:2808854-2817687 fingerprint = sideQuery (0.349)
/**
 * 旁路查询：用独立的小请求（不进主对话）调用模型完成分类/摘要等辅助任务，支持结构化输出与超时。
 */
async function sideQuery(opts) {
  let {
    model,
    system,
    messages,
    tools,
    tool_choice,
    output_format,
    max_tokens = 1024,
    maxRetries = 2,
    timeout,
    signal,
    skipSystemPromptPrefix,
    forceAttributionHeader,
    dropCacheControlWhenCachingDisabled,
    temperature,
    thinking,
    effort,
    stop_sequences,
    extraBodyParams,
    extraBetas,
    onFetchAttempt,
    retryAfterBudgetMs,
    credentials,
    classifierJudgesServedCall,
    servedSessionMode,
    record,
  } = opts;
  let messageText = unlessManagedDeniedModel(model);
  logUnrecognizedModel(messageText, opts.querySource);
  let agentContext = mainAgentContext();
  let clientRetries = isMainOrAgentQuerySource(opts.querySource) ? maxRetries : 0;
  let createClient = () =>
    getAnthropicClient({
      maxRetries: clientRetries,
      model: messageText,
      source: "side_query",
      querySource: opts.querySource,
      toolNames: getToolNameList(tools ?? [], messages),
      agentContext,
      classifierJudgesServedCall,
      credentials,
      signal,
      ...((onFetchAttempt || retryAfterBudgetMs) && {
        fetchOverride: async (url, init) => {
          onFetchAttempt?.();
          let response = await fetchWithRequestBodyCompression(url, init);
          return retryAfterBudgetMs ? markRetryAfterTooLong(response, retryAfterBudgetMs()) : response;
        },
      }),
    });
  let client = await createClient();
  let authToken =
    isAnthropicAuthEnabled() && !hasCustomAuthorizationHeader() && !env.ANTHROPIC_UNIX_SOCKET
      ? (client.authToken ?? undefined)
      : undefined;
  let withCatalogsSuppressed = (produce) =>
    isAutoModeQuerySource(opts.querySource) ? withCatalogSuppressed(produce) : produce();
  let systemBlocks = withCatalogsSuppressed(() => getModelBetas(messageText)).filter(
    (block) => block !== BETA_THINKING_TOKEN_COUNT && block !== BETA_MID_CONVERSATION_SYSTEM,
  );
  for (let extraBeta of extraBetas ?? []) if (!systemBlocks.includes(extraBeta)) systemBlocks.push(extraBeta);
  let supportsStructuredOutput =
    Boolean(output_format) &&
    withCatalogsSuppressed(() => modelSupportsStructuredOutputs(messageText)) &&
    !isStructuredOutputsUnsupportedClaude(messageText);
  let shouldAddStructuredBeta = supportsStructuredOutput && !systemBlocks.includes(BETA_STRUCTURED_OUTPUTS);
  if (shouldAddStructuredBeta) systemBlocks.push(BETA_STRUCTURED_OUTPUTS);
  let sideQuerySystem = buildSideQuerySystem({
    messages,
    system,
    skipSystemPromptPrefix,
    forceAttributionHeader,
    agentContext,
  });
  let thinkingConfig;
  let thinkingRejected =
    thinking === false &&
    messageText !== model &&
    withCatalogsSuppressed(() => modelRejectsDisabledThinking(messageText));
  if (thinking === false && !thinkingRejected)
    thinkingConfig = {
      type: "disabled",
    };
  else if (thinking !== undefined && thinking !== false)
    thinkingConfig = {
      type: "enabled",
      budget_tokens: Math.min(thinking, max_tokens - 1),
    };
  let outputConfig = {};
  if (effort !== undefined) {
    let normalizedModel = withCatalogsSuppressed(() =>
      lowerEffort(
        resolveEffortValue(messageText, undefined, {
          hookEffortValue: effort,
        }),
        learnedEffortCap(messageText, opts.querySource),
      ),
    );
    let effortCapped =
      thinkingConfig?.type === "disabled" &&
      typeof normalizedModel === "string" &&
      isAboveHighEffort(normalizedModel) &&
      withCatalogsSuppressed(() => modelCapsEffortWhenThinkingDisabled(messageText));
    if (effortCapped)
      logForDebugging(
        `sideQuery: output_config.effort '${normalizedModel}' held to '${THINKING_DISABLED_EFFORT_CAP}': ${messageText} rejects higher effort when thinking is disabled`,
      );
    let effortValue = effortCapped ? THINKING_DISABLED_EFFORT_CAP : normalizedModel;
    if (effortValue !== undefined)
      withCatalogsSuppressed(() =>
        applyEffortToOutputConfig(effortValue, outputConfig, {}, systemBlocks, messageText),
      );
  }
  let outputConfigBody = {
    ...(supportsStructuredOutput && {
      format: output_format,
    }),
    ...(outputConfig.effort !== undefined && {
      effort: outputConfig.effort,
    }),
  };
  let hasOutputConfig = Object.keys(outputConfigBody).length > 0;
  let cacheTtl = isOneHourCacheTtl(opts.querySource) ? "1h" : undefined;
  if (cacheTtl === "1h" && canSendFirstPartyBetas() && !systemBlocks.includes(BETA_EXTENDED_CACHE_TTL))
    systemBlocks.push(BETA_EXTENDED_CACHE_TTL);
  let dropCaching = dropCacheControlWhenCachingDisabled === true && !getPromptCachingEnabled(messageText);
  let systemWithCache = dropCaching ? sideQuerySystem.map(withoutCacheControl) : sideQuerySystem;
  let messagesWithCache = dropCaching
    ? messages.map((message) =>
        typeof message.content === "string"
          ? message
          : {
              ...message,
              content: message.content.map(withoutCacheControl),
            },
      )
    : messages;
  let droppedCacheMarks = dropCaching
    ? count(
        [
          ...sideQuerySystem,
          ...messages.flatMap((message) => (typeof message.content === "string" ? [] : message.content)),
        ],
        stripCacheControl,
      )
    : 0;
  if (droppedCacheMarks > 0)
    logForDebugging(
      `sideQuery (${opts.querySource}): ${droppedCacheMarks} cache mark(s) dropped, prompt caching is off for ${messageText}`,
    );
  let system_2 = cacheTtl
    ? systemWithCache.map((block) => stripCacheControl_3(block, cacheTtl))
    : systemWithCache;
  let messages_2 = cacheTtl
    ? messagesWithCache.map((message) =>
        typeof message.content === "string"
          ? message
          : {
              ...message,
              content: message.content.map((block) => stripCacheControl_3(block, cacheTtl)),
            },
      )
    : messagesWithCache;
  let baseModelName = stripAnyVersatileSuffix(messageText);
  let extraHeaderFields = () => ({});
  let requestBody = {
    model: toProviderWireModelId(messageText),
    max_tokens: thinkingRejected ? max_tokens + 2048 : max_tokens,
    system: system_2,
    messages: messages_2,
    ...(tools && {
      tools,
    }),
    ...(tool_choice && {
      tool_choice,
    }),
    ...(hasOutputConfig && {
      output_config: outputConfigBody,
    }),
    ...(temperature !== undefined &&
      withCatalogsSuppressed(() => modelSupportsTemperature(baseModelName)) && {
        temperature,
      }),
    ...(stop_sequences && {
      stop_sequences,
    }),
    ...(thinkingConfig && {
      thinking: thinkingConfig,
    }),
    ...betasRequestParam(systemBlocks),
    metadata: getAPIMetadata({
      servedSessionMode,
    }),
    ...extraBodyParams,
    ...extraHeaderFields(),
  };
  if (containsMalformedStringDeep(requestBody)) {
    try {
      requestBody = clone(requestBody);
    } catch {}
    repairMalformedStringsDeep(requestBody);
    logEvent("tengu_lone_surrogate_sanitized", {
      source: lit_2("sideQuery"),
      querySource: agentTypeForTelemetry(opts.querySource),
    });
  }
  let start = performance.now();
  let span = startLLMRequestSpan(messageText, agentContext, undefined, undefined, false, opts.querySource);
  let attemptCount = 0;
  let attemptStartedAt = start;
  let clientRequestId;
  let dispatchForBackend = (isFirstParty) =>
    isFirstParty && !isLowPriorityActiveSafe()
      ? getDispatchVersion(classifyQuerySource(opts.querySource))
      : null;
  let dispatchFellBack = false;
  let sentDispatchId = null;
  let backendIsFirstParty = false;
  let cacheMarkCounter = {
    count: 0,
  };
  let sendAttempt = (clientArg) => {
    let firstParty = isFirstPartyApiBackend();
    backendIsFirstParty = firstParty;
    let dispatchId = dispatchFellBack ? null : dispatchForBackend(firstParty);
    let effectiveDispatchId = dispatchFellBack ? (firstParty ? V2P : null) : dispatchId;
    sentDispatchId = effectiveDispatchId;
    if (effectiveDispatchId !== null)
      logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${effectiveDispatchId} (side query)`);
    attemptCount++;
    attemptStartedAt = performance.now();
    takeGzipTelemetry(clientRequestId);
    clientRequestId = hitsAnthropicBackend() ? randomUUID() : undefined;
    recordLlmRequestAttempt(span, {
      attempt: attemptCount,
      clientRequestId,
    });
    let upstreamTraceparent = getUpstreamTraceparent();
    let requestHeaders = {
      ...(effectiveDispatchId !== null && {
        [ANTHROPIC_DISPATCH_ID]: effectiveDispatchId,
      }),
      ...(clientRequestId && {
        [CLIENT_REQUEST_ID_HEADER]: clientRequestId,
      }),
      ...(upstreamTraceparent && {
        traceparent: upstreamTraceparent,
      }),
    };
    return clientArg.beta.messages
      .create(requestBody, {
        signal,
        ...(timeout !== undefined && {
          timeout,
        }),
        ...(dispatchId !== null && {
          maxRetries: 0,
        }),
        ...(Object.keys(requestHeaders).length > 0 && {
          headers: requestHeaders,
        }),
      })
      .catch((error) => {
        let capabilities = parseFoundryUnsupportedCapabilities(error);
        if (capabilities) recordFoundryUnsupportedCapabilities(messageText, capabilities);
        if (requestBody.output_config?.effort !== undefined && isEffortUnsupportedError(error)) {
          markEffortUnsupported(messageText);
          logForDebugging(
            `[effort] side query: the server refused effort for model ${messageText} (the output_config.effort field or the anthropic-beta value ${BETA_EFFORT.header}). Sending the request again without either; this Claude Code process will not send either to this model again.`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_effort_unsupported_retry", {
            model: telemetrySafeModelName(messageText),
          });
          let { effort, ...restOutputConfig } = requestBody.output_config;
          let { output_config: outputConfig, betas, ...restBody } = requestBody;
          let filtered = betas?.filter((betaName) => betaName !== BETA_EFFORT.header);
          requestBody = {
            ...restBody,
            ...(Object.keys(restOutputConfig).length > 0 && {
              output_config: restOutputConfig,
            }),
            ...(filtered !== undefined &&
              filtered.length > 0 && {
                betas: filtered,
              }),
          };
          return sendAttempt(clientArg);
        }
        if (
          supportsStructuredOutput &&
          !(extraBodyParams !== undefined && "output_config" in extraBodyParams) &&
          requestBody.output_config?.format !== undefined &&
          isStructuredOutputsUnsupported(error)
        ) {
          markStructuredOutputsUnsupportedClaude(messageText);
          logForDebugging(
            `[structured-outputs] model ${messageText} rejected output_config.format (side query); latching unsupported and retrying without it.`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_structured_outputs_unsupported_retry", {
            model: telemetrySafeModelName(messageText),
          });
          let { format, ...restOutputConfig } = requestBody.output_config;
          let { output_config: outputConfig, betas, ...restBody } = requestBody;
          let keptBetas = shouldAddStructuredBeta
            ? betas?.filter((betaName) => betaName !== BETA_STRUCTURED_OUTPUTS.header)
            : betas;
          requestBody = {
            ...restBody,
            ...(Object.keys(restOutputConfig).length > 0 && {
              output_config: restOutputConfig,
            }),
            ...(keptBetas !== undefined &&
              keptBetas.length > 0 && {
                betas: keptBetas,
              }),
          };
          return sendAttempt(clientArg);
        }
        if (
          opts.resendWithoutRefusedContext1m &&
          requestBody.betas?.includes(BETA_LONG_CONTEXT.header) &&
          !hitsAnthropicBackend(getProviderForModel(messageText)) &&
          (isContext1mBetaRejected(error) || isInvalidBetaFlagError(error))
        ) {
          let { betas, ...restBody } = requestBody;
          let filtered = betas.filter((betaName) => betaName !== BETA_LONG_CONTEXT.header);
          requestBody = {
            ...restBody,
            ...(filtered.length > 0 && {
              betas: filtered,
            }),
          };
          return sendAttempt(clientArg).then((response) => {
            rejectContextBetaForModel(messageText);
            return response;
          });
        }
        if (alwaysFalseD(error, getProviderForModel(messageText))) {
          let error_2 = error.error !== null && typeof error.error === "object" ? error.error : {};
          throw new APIError(
            error.status,
            {
              ...error_2,
              message: emptyString(error.message),
            },
            undefined,
            error.headers,
          );
        }
        if (
          opts.querySource !== "model_validation" &&
          classifyProviderErrorForModel(messageText, error) === "refused"
        )
          classifyModelAccess(messageText, error, "refused");
        throw error;
      });
  };
  let sendWithFallback = async (clientArg) => {
    try {
      return await sendAttempt(clientArg);
    } catch (error) {
      let failedDispatchId = sentDispatchId;
      if (dispatchFellBack || signal?.aborted) throw error;
      let status = error instanceof APIError ? error.status : undefined;
      let is5xx = status !== undefined && status >= 500;
      let isConnectionError = error instanceof APIConnectionError;
      let fallbackReason;
      let fallbackLogLine;
      let retryDelayMs = 0;
      if (failedDispatchId === null) {
        if (!backendIsFirstParty || status !== 503) throw error;
        fallbackReason = headerlessDeclineKind(error);
        retryDelayMs = headerlessDeclineRetryDelay(error);
        fallbackLogLine = `HTTP 503 with no ${ANTHROPIC_DISPATCH_ID} (side query); retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`;
      } else if (is5xx || isConnectionError) {
        fallbackReason = is5xx ? lit_2("5xx") : lit_2("conn_err");
        fallbackLogLine = `${is5xx ? `HTTP ${status}` : "connection error"} with ${ANTHROPIC_DISPATCH_ID}=${failedDispatchId} (side query); retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`;
      } else if (
        (status === 408 || status === 409 || status === 429) &&
        clientRetries > 0 &&
        !(retryAfterBudgetMs && retryAfterTooLongMs(error) !== undefined)
      ) {
        fallbackReason = lit_2("retryable_4xx");
        fallbackLogLine = `HTTP ${status} with ${ANTHROPIC_DISPATCH_ID}=${failedDispatchId} (side query); re-sending with ${ANTHROPIC_DISPATCH_ID}=${V2P} and the client retry budget`;
      } else throw error;
      logForDebugging(`[dispatch] ${fallbackLogLine}`, {
        level: "warn",
      });
      logEvent("tengu_dispatch_header_fallback", {
        model: telemetrySafeModelName(messageText),
        dispatch: fromEnumOpt(failedDispatchId) ?? lit_2("none"),
        resend_dispatch: fromEnum(V2P),
        reason: fallbackReason,
        status: status !== undefined ? fromNumber(status) : lit_2("none"),
        query_source: agentTypeForTelemetry(opts.querySource),
        request_id: sanitizeMarkName(error instanceof APIError ? error.requestID : undefined),
      });
      dispatchFellBack = true;
      if (retryDelayMs > 0) {
        await sleep(retryDelayMs, signal);
        if (signal?.aborted) throw error;
      }
      return await sendAttempt(clientArg);
    }
  };
  let response;
  try {
    try {
      response = await sendWithFallback(client);
    } catch (error) {
      if (
        !(error instanceof APIError) ||
        !(error.status === 401 || isOAuthTokenRevokedError(error)) ||
        isRoutedFinalAnswerError(error) ||
        !authToken ||
        signal?.aborted
      )
        throw error;
      let oauthRefreshed = false;
      try {
        oauthRefreshed = await handleOAuth401Error(authToken, credentials);
      } catch (error_2) {
        logForDebugging(
          `sideQuery: OAuth refresh after ${error.status} failed: ${error_2 instanceof Error ? error_2.message : String(error_2)}`,
          {
            level: "error",
          },
        );
      }
      if (!oauthRefreshed) throw error;
      if (signal?.aborted) throw error;
      response = await sendWithFallback(await createClient());
      logEvent("tengu_oauth_401_sidequery_recovered", {
        querySource: agentTypeForTelemetry(opts.querySource),
        httpStatus: error.status,
      });
    }
  } catch (error) {
    endLLMRequestSpan(span, {
      success: false,
      statusCode: error instanceof APIError ? error.status : undefined,
      error: errorMessage(error),
      errorClass: classifyAPIError(error),
      attempt: attemptCount,
      clientRequestId,
      requestId: (error instanceof APIError ? error.requestID : undefined) ?? undefined,
    });
    takeGzipTelemetry(clientRequestId);
    if (record && !signal?.aborted && !isAbortError(error))
      emitSideQueryOtelEvent({
        record,
        event: "api_error",
        attributes: () =>
          apiErrorFields({
            model: baseModelName,
            error: apiErrorText({
              error,
              errorClass: classifyAPIError(error),
              querySource: record.querySource,
            }),
            status: error instanceof APIError ? error.status : undefined,
            durationMs: Math.max(0, Math.round(performance.now() - attemptStartedAt)),
            attempt: attemptCount,
            requestId: error instanceof APIError ? error.requestID : undefined,
            clientRequestId,
            fastMode: false,
            querySource: record.querySource,
            effort: requestBody.output_config?.effort ?? undefined,
          }),
        agentContext,
      });
    throw error;
  }
  resetAuthFailureTracking();
  let _request_id = response._request_id ?? undefined;
  let finalDispatchId = sentDispatchId;
  let now = performance.now();
  let now_2 = Date.now();
  let lastCompletion = getLastApiCompletionTimestamp();
  endLLMRequestSpan(span, {
    success: true,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? undefined,
    requestId: _request_id,
    clientRequestId,
    stopReason: response.stop_reason ?? undefined,
    attempt: attemptCount,
  });
  addUsageToSession(response.usage, false);
  logEvent("tengu_api_success", {
    requestId: sanitizeMarkName(_request_id),
    clientRequestId: sanitizeMarkName(clientRequestId) || undefined,
    user_message_uuid: sanitizeMarkName(turnAttributionKeyFor(agentContext)),
    querySource: agentTypeForTelemetry(opts.querySource),
    model: telemetrySafeModelName(baseModelName),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
    uncachedInputTokens: response.usage.cache_creation_input_tokens ?? 0,
    cache_creation_5m_input_tokens: response.usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    cache_creation_1h_input_tokens: response.usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    durationMs: Math.max(0, Math.round(now - attemptStartedAt)),
    durationMsIncludingRetries: Math.max(0, Math.round(now - start)),
    attempt: attemptCount,
    dispatch: fromEnumOpt(finalDispatchId) ?? lit_2("none"),
    stop_reason: fromEnumOpt(response.stop_reason) ?? undefined,
    ...gzipTelemetryFields(takeGzipTelemetry(clientRequestId)),
    timeSinceLastApiCallMs:
      lastCompletion !== null ? Math.max(0, Math.round(now_2 - lastCompletion)) : undefined,
    ...redactAttribution(opts.querySource, buildAttribution(opts.querySource, undefined, undefined)),
  });
  setLastApiCompletionTimestamp(now_2);
  let costUSD = Number.NaN;
  try {
    costUSD = calculateCostWithPricingSource(baseModelName, response.usage).usd;
    addSideQueryCostUSD(costUSD);
  } catch (error) {
    logForDebugging(`sideQuery: not priced: ${errorMessage(error)}`, {
      level: "error",
    });
    logError(error);
  }
  if (record)
    emitSideQueryOtelEvent({
      record,
      event: "api_request",
      attributes: () =>
        apiSuccessFields({
          model: response.model || baseModelName,
          usage: response.usage,
          costUSD,
          durationMs: Math.max(0, Math.round(now - attemptStartedAt)),
          ttftMs: null,
          requestId: _request_id,
          clientRequestId,
          fastMode: false,
          querySource: record.querySource,
          effort: requestBody.output_config?.effort ?? undefined,
        }),
      agentContext,
    });
  emitPrefetchChanged();
  return response;
}
//@ chunk-e6aww6q8.js:2817687-2817781 placement
function describeApiErrorForPlugin(error, userSpecifiedModel) {
  let assistantMessageFromApiError = getAssistantMessageFromApiError(error, userSpecifiedModel);
  return {
    status: assistantMessageFromApiError.apiErrorStatus ?? null,
    kind: assistantMessageFromApiError.error ?? "unknown",
  };
}
//@ chunk-e6aww6q8.js:2817781-2817849 placement = stripCacheControl (1)
function stripCacheControl(items) {
  return "cache_control" in items && Boolean(items.cache_control);
}
//@ chunk-e6aww6q8.js:2817849-2817909 placement
function withoutCacheControl(block) {
  return stripCacheControl(block)
    ? {
        ...block,
        cache_control: undefined,
      }
    : block;
}
//@ chunk-e6aww6q8.js:2817909-2818055 placement = stripCacheControl (0.857)
function stripCacheControl_3(block, ttl) {
  if (!("cache_control" in block) || !block.cache_control || block.cache_control.ttl) return block;
  return {
    ...block,
    cache_control: {
      ...block.cache_control,
      ttl,
    },
  };
}
export { sideQueryWithCounter, describeApiErrorForPlugin };

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
  let gt = mainAgentContext();
  let At = isMainOrAgentQuerySource(opts.querySource) ? maxRetries : 0;
  let It = () =>
    getAnthropicClient({
      maxRetries: At,
      model: messageText,
      source: "side_query",
      querySource: opts.querySource,
      toolNames: getToolNameList(tools ?? [], messages),
      agentContext: gt,
      classifierJudgesServedCall,
      credentials,
      signal,
      ...((onFetchAttempt || retryAfterBudgetMs) && {
        fetchOverride: async (as, Vi) => {
          onFetchAttempt?.();
          let response = await fetchWithRequestBodyCompression(as, Vi);
          return retryAfterBudgetMs ? markRetryAfterTooLong(response, retryAfterBudgetMs()) : response;
        },
      }),
    });
  let Yt = await It();
  let qt =
    isAnthropicAuthEnabled() && !hasCustomAuthorizationHeader() && !env.ANTHROPIC_UNIX_SOCKET
      ? (Yt.authToken ?? undefined)
      : undefined;
  let Zt = (as) => (isAutoModeQuerySource(opts.querySource) ? withCatalogSuppressed(as) : as());
  let systemBlocks = Zt(() => getModelBetas(messageText)).filter(
    (block) => block !== BETA_THINKING_TOKEN_COUNT && block !== BETA_MID_CONVERSATION_SYSTEM,
  );
  for (let as of extraBetas ?? []) if (!systemBlocks.includes(as)) systemBlocks.push(as);
  let pn =
    Boolean(output_format) &&
    Zt(() => modelSupportsStructuredOutputs(messageText)) &&
    !isStructuredOutputsUnsupportedClaude(messageText);
  let no = pn && !systemBlocks.includes(BETA_STRUCTURED_OUTPUTS);
  if (no) systemBlocks.push(BETA_STRUCTURED_OUTPUTS);
  let sideQuerySystem = buildSideQuerySystem({
    messages,
    system,
    skipSystemPromptPrefix,
    forceAttributionHeader,
    agentContext: gt,
  });
  let ho;
  let yn = thinking === false && messageText !== model && Zt(() => modelRejectsDisabledThinking(messageText));
  if (thinking === false && !yn)
    ho = {
      type: "disabled",
    };
  else if (thinking !== undefined && thinking !== false)
    ho = {
      type: "enabled",
      budget_tokens: Math.min(thinking, max_tokens - 1),
    };
  let outputConfig = {};
  if (effort !== undefined) {
    let normalizedModel = Zt(() =>
      lowerEffort(
        resolveEffortValue(messageText, undefined, {
          hookEffortValue: effort,
        }),
        learnedEffortCap(messageText, opts.querySource),
      ),
    );
    let Vi =
      ho?.type === "disabled" &&
      typeof normalizedModel === "string" &&
      isAboveHighEffort(normalizedModel) &&
      Zt(() => modelCapsEffortWhenThinkingDisabled(messageText));
    if (Vi)
      logForDebugging(
        `sideQuery: output_config.effort '${normalizedModel}' held to '${THINKING_DISABLED_EFFORT_CAP}': ${messageText} rejects higher effort when thinking is disabled`,
      );
    let effortValue = Vi ? THINKING_DISABLED_EFFORT_CAP : normalizedModel;
    if (effortValue !== undefined)
      Zt(() => applyEffortToOutputConfig(effortValue, outputConfig, {}, systemBlocks, messageText));
  }
  let Xn = {
    ...(pn && {
      format: output_format,
    }),
    ...(outputConfig.effort !== undefined && {
      effort: outputConfig.effort,
    }),
  };
  let fo = Object.keys(Xn).length > 0;
  let To = isOneHourCacheTtl(opts.querySource) ? "1h" : undefined;
  if (To === "1h" && canSendFirstPartyBetas() && !systemBlocks.includes(BETA_EXTENDED_CACHE_TTL))
    systemBlocks.push(BETA_EXTENDED_CACHE_TTL);
  let bo = dropCacheControlWhenCachingDisabled === true && !getPromptCachingEnabled(messageText);
  let vn = bo ? sideQuerySystem.map(withoutCacheControl) : sideQuerySystem;
  let co = bo
    ? messages.map((message) =>
        typeof message.content === "string"
          ? message
          : {
              ...message,
              content: message.content.map(withoutCacheControl),
            },
      )
    : messages;
  let So = bo
    ? count(
        [
          ...sideQuerySystem,
          ...messages.flatMap((message) => (typeof message.content === "string" ? [] : message.content)),
        ],
        stripCacheControl,
      )
    : 0;
  if (So > 0)
    logForDebugging(
      `sideQuery (${opts.querySource}): ${So} cache mark(s) dropped, prompt caching is off for ${messageText}`,
    );
  let system_2 = To ? vn.map((as) => stripCacheControl_3(as, To)) : vn;
  let messages_2 = To
    ? co.map((as) =>
        typeof as.content === "string"
          ? as
          : {
              ...as,
              content: as.content.map((Vi) => stripCacheControl_3(Vi, To)),
            },
      )
    : co;
  let ao = stripAnyVersatileSuffix(messageText);
  let $o = () => ({});
  let yo = {
    model: toProviderWireModelId(messageText),
    max_tokens: yn ? max_tokens + 2048 : max_tokens,
    system: system_2,
    messages: messages_2,
    ...(tools && {
      tools,
    }),
    ...(tool_choice && {
      tool_choice,
    }),
    ...(fo && {
      output_config: Xn,
    }),
    ...(temperature !== undefined &&
      Zt(() => modelSupportsTemperature(ao)) && {
        temperature,
      }),
    ...(stop_sequences && {
      stop_sequences,
    }),
    ...(ho && {
      thinking: ho,
    }),
    ...betasRequestParam(systemBlocks),
    metadata: getAPIMetadata({
      servedSessionMode,
    }),
    ...extraBodyParams,
    ...$o(),
  };
  if (containsMalformedStringDeep(yo)) {
    try {
      yo = clone(yo);
    } catch {}
    repairMalformedStringsDeep(yo);
    logEvent("tengu_lone_surrogate_sanitized", {
      source: lit_2("sideQuery"),
      querySource: agentTypeForTelemetry(opts.querySource),
    });
  }
  let start = performance.now();
  let llmRequestSpan = startLLMRequestSpan(messageText, gt, undefined, undefined, false, opts.querySource);
  let br = 0;
  let Hr = start;
  let Fr;
  let cs = (as) =>
    as && !isLowPriorityActiveSafe() ? getDispatchVersion(classifyQuerySource(opts.querySource)) : null;
  let _r = false;
  let Cr = null;
  let Vr = false;
  let Oo = {
    count: 0,
  };
  let jr = (as) => {
    let Vi = isFirstPartyApiBackend();
    Vr = Vi;
    let ji = _r ? null : cs(Vi);
    let Wi = _r ? (Vi ? V2P : null) : ji;
    Cr = Wi;
    if (Wi !== null) logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${Wi} (side query)`);
    br++;
    Hr = performance.now();
    takeGzipTelemetry(Fr);
    Fr = hitsAnthropicBackend() ? randomUUID() : undefined;
    recordLlmRequestAttempt(llmRequestSpan, {
      attempt: br,
      clientRequestId: Fr,
    });
    let upstreamTraceparent = getUpstreamTraceparent();
    let wa = {
      ...(Wi !== null && {
        [ANTHROPIC_DISPATCH_ID]: Wi,
      }),
      ...(Fr && {
        [CLIENT_REQUEST_ID_HEADER]: Fr,
      }),
      ...(upstreamTraceparent && {
        traceparent: upstreamTraceparent,
      }),
    };
    return as.beta.messages
      .create(yo, {
        signal,
        ...(timeout !== undefined && {
          timeout,
        }),
        ...(ji !== null && {
          maxRetries: 0,
        }),
        ...(Object.keys(wa).length > 0 && {
          headers: wa,
        }),
      })
      .catch((error) => {
        let foundryUnsupportedCapabilities = parseFoundryUnsupportedCapabilities(error);
        if (foundryUnsupportedCapabilities)
          recordFoundryUnsupportedCapabilities(messageText, foundryUnsupportedCapabilities);
        if (yo.output_config?.effort !== undefined && isEffortUnsupportedError(error)) {
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
          let { effort, ...$a } = yo.output_config;
          let { output_config: outputConfig, betas, ...Vs } = yo;
          let filtered = betas?.filter((jo) => jo !== BETA_EFFORT.header);
          yo = {
            ...Vs,
            ...(Object.keys($a).length > 0 && {
              output_config: $a,
            }),
            ...(filtered !== undefined &&
              filtered.length > 0 && {
                betas: filtered,
              }),
          };
          return jr(as);
        }
        if (
          pn &&
          !(extraBodyParams !== undefined && "output_config" in extraBodyParams) &&
          yo.output_config?.format !== undefined &&
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
          let { format, ...$a } = yo.output_config;
          let { output_config: outputConfig, betas, ...Vs } = yo;
          let _i = no ? betas?.filter((jo) => jo !== BETA_STRUCTURED_OUTPUTS.header) : betas;
          yo = {
            ...Vs,
            ...(Object.keys($a).length > 0 && {
              output_config: $a,
            }),
            ...(_i !== undefined &&
              _i.length > 0 && {
                betas: _i,
              }),
          };
          return jr(as);
        }
        if (
          opts.resendWithoutRefusedContext1m &&
          yo.betas?.includes(BETA_LONG_CONTEXT.header) &&
          !hitsAnthropicBackend(getProviderForModel(messageText)) &&
          (isContext1mBetaRejected(error) || isInvalidBetaFlagError(error))
        ) {
          let { betas, ...$a } = yo;
          let filtered = betas.filter((Ti) => Ti !== BETA_LONG_CONTEXT.header);
          yo = {
            ...$a,
            ...(filtered.length > 0 && {
              betas: filtered,
            }),
          };
          return jr(as).then((Ti) => {
            rejectContextBetaForModel(messageText);
            return Ti;
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
  let Or = async (as) => {
    try {
      return await jr(as);
    } catch (error) {
      let ji = Cr;
      if (_r || signal?.aborted) throw error;
      let status = error instanceof APIError ? error.status : undefined;
      let ii = status !== undefined && status >= 500;
      let wa = error instanceof APIConnectionError;
      let hr;
      let mi;
      let Ha = 0;
      if (ji === null) {
        if (!Vr || status !== 503) throw error;
        hr = headerlessDeclineKind(error);
        Ha = headerlessDeclineRetryDelay(error);
        mi = `HTTP 503 with no ${ANTHROPIC_DISPATCH_ID} (side query); retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`;
      } else if (ii || wa) {
        hr = ii ? lit_2("5xx") : lit_2("conn_err");
        mi = `${ii ? `HTTP ${status}` : "connection error"} with ${ANTHROPIC_DISPATCH_ID}=${ji} (side query); retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`;
      } else if (
        (status === 408 || status === 409 || status === 429) &&
        At > 0 &&
        !(retryAfterBudgetMs && retryAfterTooLongMs(error) !== undefined)
      ) {
        hr = lit_2("retryable_4xx");
        mi = `HTTP ${status} with ${ANTHROPIC_DISPATCH_ID}=${ji} (side query); re-sending with ${ANTHROPIC_DISPATCH_ID}=${V2P} and the client retry budget`;
      } else throw error;
      logForDebugging(`[dispatch] ${mi}`, {
        level: "warn",
      });
      logEvent("tengu_dispatch_header_fallback", {
        model: telemetrySafeModelName(messageText),
        dispatch: fromEnumOpt(ji) ?? lit_2("none"),
        resend_dispatch: fromEnum(V2P),
        reason: hr,
        status: status !== undefined ? fromNumber(status) : lit_2("none"),
        query_source: agentTypeForTelemetry(opts.querySource),
        request_id: sanitizeMarkName(error instanceof APIError ? error.requestID : undefined),
      });
      _r = true;
      if (Ha > 0) {
        await sleep(Ha, signal);
        if (signal?.aborted) throw error;
      }
      return await jr(as);
    }
  };
  let Io;
  try {
    try {
      Io = await Or(Yt);
    } catch (error) {
      if (
        !(error instanceof APIError) ||
        !(error.status === 401 || isOAuthTokenRevokedError(error)) ||
        isRoutedFinalAnswerError(error) ||
        !qt ||
        signal?.aborted
      )
        throw error;
      let Vi = false;
      try {
        Vi = await handleOAuth401Error(qt, credentials);
      } catch (error_2) {
        logForDebugging(
          `sideQuery: OAuth refresh after ${error.status} failed: ${error_2 instanceof Error ? error_2.message : String(error_2)}`,
          {
            level: "error",
          },
        );
      }
      if (!Vi) throw error;
      if (signal?.aborted) throw error;
      Io = await Or(await It());
      logEvent("tengu_oauth_401_sidequery_recovered", {
        querySource: agentTypeForTelemetry(opts.querySource),
        httpStatus: error.status,
      });
    }
  } catch (error) {
    endLLMRequestSpan(llmRequestSpan, {
      success: false,
      statusCode: error instanceof APIError ? error.status : undefined,
      error: errorMessage(error),
      errorClass: classifyAPIError(error),
      attempt: br,
      clientRequestId: Fr,
      requestId: (error instanceof APIError ? error.requestID : undefined) ?? undefined,
    });
    takeGzipTelemetry(Fr);
    if (record && !signal?.aborted && !isAbortError(error))
      emitSideQueryOtelEvent({
        record,
        event: "api_error",
        attributes: () =>
          apiErrorFields({
            model: ao,
            error: apiErrorText({
              error,
              errorClass: classifyAPIError(error),
              querySource: record.querySource,
            }),
            status: error instanceof APIError ? error.status : undefined,
            durationMs: Math.max(0, Math.round(performance.now() - Hr)),
            attempt: br,
            requestId: error instanceof APIError ? error.requestID : undefined,
            clientRequestId: Fr,
            fastMode: false,
            querySource: record.querySource,
            effort: yo.output_config?.effort ?? undefined,
          }),
        agentContext: gt,
      });
    throw error;
  }
  resetAuthFailureTracking();
  let _request_id = Io._request_id ?? undefined;
  let rs = Cr;
  let now = performance.now();
  let now_2 = Date.now();
  let lastCompletion = getLastApiCompletionTimestamp();
  endLLMRequestSpan(llmRequestSpan, {
    success: true,
    inputTokens: Io.usage.input_tokens,
    outputTokens: Io.usage.output_tokens,
    cacheReadTokens: Io.usage.cache_read_input_tokens ?? undefined,
    cacheCreationTokens: Io.usage.cache_creation_input_tokens ?? undefined,
    requestId: _request_id,
    clientRequestId: Fr,
    stopReason: Io.stop_reason ?? undefined,
    attempt: br,
  });
  addUsageToSession(Io.usage, false);
  logEvent("tengu_api_success", {
    requestId: sanitizeMarkName(_request_id),
    clientRequestId: sanitizeMarkName(Fr) || undefined,
    user_message_uuid: sanitizeMarkName(turnAttributionKeyFor(gt)),
    querySource: agentTypeForTelemetry(opts.querySource),
    model: telemetrySafeModelName(ao),
    inputTokens: Io.usage.input_tokens,
    outputTokens: Io.usage.output_tokens,
    cachedInputTokens: Io.usage.cache_read_input_tokens ?? 0,
    uncachedInputTokens: Io.usage.cache_creation_input_tokens ?? 0,
    cache_creation_5m_input_tokens: Io.usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    cache_creation_1h_input_tokens: Io.usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    durationMs: Math.max(0, Math.round(now - Hr)),
    durationMsIncludingRetries: Math.max(0, Math.round(now - start)),
    attempt: br,
    dispatch: fromEnumOpt(rs) ?? lit_2("none"),
    stop_reason: fromEnumOpt(Io.stop_reason) ?? undefined,
    ...gzipTelemetryFields(takeGzipTelemetry(Fr)),
    timeSinceLastApiCallMs:
      lastCompletion !== null ? Math.max(0, Math.round(now_2 - lastCompletion)) : undefined,
    ...redactAttribution(opts.querySource, buildAttribution(opts.querySource, undefined, undefined)),
  });
  setLastApiCompletionTimestamp(now_2);
  let fs = Number.NaN;
  try {
    fs = calculateCostWithPricingSource(ao, Io.usage).usd;
    addSideQueryCostUSD(fs);
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
          model: Io.model || ao,
          usage: Io.usage,
          costUSD: fs,
          durationMs: Math.max(0, Math.round(now - Hr)),
          ttftMs: null,
          requestId: _request_id,
          clientRequestId: Fr,
          fastMode: false,
          querySource: record.querySource,
          effort: yo.output_config?.effort ?? undefined,
        }),
      agentContext: gt,
    });
  emitPrefetchChanged();
  return Io;
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
function withoutCacheControl(e) {
  return stripCacheControl(e)
    ? {
        ...e,
        cache_control: undefined,
      }
    : e;
}
//@ chunk-e6aww6q8.js:2817909-2818055 placement = stripCacheControl (0.857)
function stripCacheControl_3(e, ttl) {
  if (!("cache_control" in e) || !e.cache_control || e.cache_control.ttl) return e;
  return {
    ...e,
    cache_control: {
      ...e.cache_control,
      ttl,
    },
  };
}
export { sideQueryWithCounter, describeApiErrorForPlugin };

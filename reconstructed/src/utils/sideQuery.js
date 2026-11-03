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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { logError } from "./log.js";
import { withTelemetryMessage, toError, errorMessage, isAbortError } from "./errors.js";
import { logOTelEvent } from "./telemetry/events.js";
import { unlessManagedDeniedModel } from "./model/smallFastModel.js";
import {
  logUnrecognizedModel,
  Qve,
  yV,
  learnedEffortCap,
  applyEffortToOutputConfig,
  isOneHourCacheTtl,
  getPromptCachingEnabled,
  getAPIMetadata,
  getDispatchVersion,
  V2P,
  ANTHROPIC_DISPATCH_ID,
  Jve,
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
  AU,
  LO,
  modelSupportsStructuredOutputs,
  n8,
  canSendFirstPartyBetas,
  l9t,
  modelSupportsTemperature,
  betasRequestParam,
  hitsAnthropicBackend,
  Cge,
  yv,
  rejectContextBetaForModel,
} from "./betas.js";
import { buildSideQuerySystem, DKt, classifyModelAccess } from "./model/modelAccessCheck.js";
import { modelRejectsDisabledThinking } from "./thinking.js";
import {
  resolveEffortValue,
  isAboveHighEffort,
  modelCapsEffortWhenThinkingDisabled,
  THINKING_DISABLED_EFFORT_CAP,
} from "./effort.js";
import { logForDebugging } from "./debug.js";
import { count } from "./collections.js";
import { Bn } from "./model/modelIds.js";
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
import { _st } from "../services/lowPriority/lowPriorityMode.js";
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
  Ioo,
  Ooo,
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
import { RK, PQt } from "../services/api/responseDiagnostics.js";
import { Ot, ef } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { ye } from "./startupMarks.js";
import { sleep } from "./sleep.js";
import { isOAuthTokenRevokedError } from "../services/api/withRetry.js";
import { apiErrorFields, apiErrorText, nEe, apiSuccessFields } from "../services/api/logging.js";
import { calculateCostWithPricingSource } from "./modelCost.js";
import { H7r } from "../services/policyLimits/prefetchToggle.js";

//@ chunk-e6aww6q8.js:2808592-2808644 placement
var x_n = (e) => logError(withTelemetryMessage(toError(e), "side query record failed"));
/**
 * 发送旁路查询的 OTel 事件（出错只记录）。
 */
//@ chunk-e6aww6q8.js:2808644-2808778 placement
function emitSideQueryOtelEvent({
  record: record,
  event: event,
  attributes: attributes,
  agentContext: agentContext,
}) {
  try {
    logOTelEvent(event, { ...attributes(), ...record.names }, agentContext, record.hookOrigin).catch(x_n);
  } catch (error) {
    x_n(error);
  }
}
//@ chunk-e6aww6q8.js:2808778-2808844 placement
async function aN(e) {
  P_n++;
  try {
    return await sideQuery(e);
  } finally {
    P_n--;
  }
}
//@ chunk-e6aww6q8.js:2808844-2808854 placement
var P_n = 0;
/**
 * 旁路查询：用独立的小请求（不进主对话）调用模型完成分类/摘要等辅助任务，支持结构化输出与超时。
 */
//@ chunk-e6aww6q8.js:2808854-2817687 fingerprint = sideQuery (0.349)
async function sideQuery(opts) {
  let {
      model: model,
      system: system,
      messages: messages,
      tools: tools,
      tool_choice: tool_choice,
      output_format: output_format,
      max_tokens: max_tokens = 1024,
      maxRetries: maxRetries = 2,
      timeout: timeout,
      signal: signal,
      skipSystemPromptPrefix: skipSystemPromptPrefix,
      forceAttributionHeader: forceAttributionHeader,
      dropCacheControlWhenCachingDisabled: dropCacheControlWhenCachingDisabled,
      temperature: temperature,
      thinking: thinking,
      effort: effort,
      stop_sequences: stop_sequences,
      extraBodyParams: extraBodyParams,
      extraBetas: extraBetas,
      onFetchAttempt: onFetchAttempt,
      retryAfterBudgetMs: retryAfterBudgetMs,
      credentials: credentials,
      classifierJudgesServedCall: classifierJudgesServedCall,
      servedSessionMode: servedSessionMode,
      record: record,
    } = opts,
    messageText = unlessManagedDeniedModel(model);
  logUnrecognizedModel(messageText, opts.querySource);
  let gt = mainAgentContext(),
    At = isMainOrAgentQuerySource(opts.querySource) ? maxRetries : 0,
    It = () =>
      getAnthropicClient({
        maxRetries: At,
        model: messageText,
        source: "side_query",
        querySource: opts.querySource,
        toolNames: getToolNameList(tools ?? [], messages),
        agentContext: gt,
        classifierJudgesServedCall: classifierJudgesServedCall,
        credentials: credentials,
        signal: signal,
        ...((onFetchAttempt || retryAfterBudgetMs) && {
          fetchOverride: async (as, Vi) => {
            onFetchAttempt?.();
            let ji = await fetchWithRequestBodyCompression(as, Vi);
            return retryAfterBudgetMs ? markRetryAfterTooLong(ji, retryAfterBudgetMs()) : ji;
          },
        }),
      }),
    Yt = await It(),
    qt =
      isAnthropicAuthEnabled() && !hasCustomAuthorizationHeader() && !env.ANTHROPIC_UNIX_SOCKET
        ? (Yt.authToken ?? void 0)
        : void 0,
    Zt = (as) => (isAutoModeQuerySource(opts.querySource) ? withCatalogSuppressed(as) : as()),
    systemBlocks = Zt(() => getModelBetas(messageText)).filter((block) => block !== AU && block !== LO);
  for (let as of extraBetas ?? []) if (!systemBlocks.includes(as)) systemBlocks.push(as);
  let pn =
      Boolean(output_format) && Zt(() => modelSupportsStructuredOutputs(messageText)) && !Qve(messageText),
    no = pn && !systemBlocks.includes(n8);
  if (no) systemBlocks.push(n8);
  let hn = buildSideQuerySystem({
      messages: messages,
      system: system,
      skipSystemPromptPrefix: skipSystemPromptPrefix,
      forceAttributionHeader: forceAttributionHeader,
      agentContext: gt,
    }),
    ho,
    yn = thinking === !1 && messageText !== model && Zt(() => modelRejectsDisabledThinking(messageText));
  if (thinking === !1 && !yn) ho = { type: "disabled" };
  else if (thinking !== void 0 && thinking !== !1)
    ho = { type: "enabled", budget_tokens: Math.min(thinking, max_tokens - 1) };
  let Kn = {};
  if (effort !== void 0) {
    let normalizedModel = Zt(() =>
        yV(
          resolveEffortValue(messageText, void 0, { hookEffortValue: effort }),
          learnedEffortCap(messageText, opts.querySource),
        ),
      ),
      Vi =
        ho?.type === "disabled" &&
        typeof normalizedModel === "string" &&
        isAboveHighEffort(normalizedModel) &&
        Zt(() => modelCapsEffortWhenThinkingDisabled(messageText));
    if (Vi)
      logForDebugging(
        `sideQuery: output_config.effort '${normalizedModel}' held to '${THINKING_DISABLED_EFFORT_CAP}': ${messageText} rejects higher effort when thinking is disabled`,
      );
    let ji = Vi ? THINKING_DISABLED_EFFORT_CAP : normalizedModel;
    if (ji !== void 0) Zt(() => applyEffortToOutputConfig(ji, Kn, {}, systemBlocks, messageText));
  }
  let Xn = { ...(pn && { format: output_format }), ...(Kn.effort !== void 0 && { effort: Kn.effort }) },
    fo = Object.keys(Xn).length > 0,
    To = isOneHourCacheTtl(opts.querySource) ? "1h" : void 0;
  if (To === "1h" && canSendFirstPartyBetas() && !systemBlocks.includes(l9t)) systemBlocks.push(l9t);
  let bo = dropCacheControlWhenCachingDisabled === !0 && !getPromptCachingEnabled(messageText),
    vn = bo ? hn.map(M_n) : hn,
    co = bo
      ? messages.map((as) => (typeof as.content === "string" ? as : { ...as, content: as.content.map(M_n) }))
      : messages,
    So = bo
      ? count(
          [...hn, ...messages.flatMap((as) => (typeof as.content === "string" ? [] : as.content))],
          stripCacheControl,
        )
      : 0;
  if (So > 0)
    logForDebugging(
      `sideQuery (${opts.querySource}): ${So} cache mark(s) dropped, prompt caching is off for ${messageText}`,
    );
  let ko = To ? vn.map((as) => stripCacheControl_3(as, To)) : vn,
    un = To
      ? co.map((as) =>
          typeof as.content === "string"
            ? as
            : { ...as, content: as.content.map((Vi) => stripCacheControl_3(Vi, To)) },
        )
      : co,
    ao = Bn(messageText),
    $o = () => ({}),
    yo = {
      model: toProviderWireModelId(messageText),
      max_tokens: yn ? max_tokens + 2048 : max_tokens,
      system: ko,
      messages: un,
      ...(tools && { tools: tools }),
      ...(tool_choice && { tool_choice: tool_choice }),
      ...(fo && { output_config: Xn }),
      ...(temperature !== void 0 && Zt(() => modelSupportsTemperature(ao)) && { temperature: temperature }),
      ...(stop_sequences && { stop_sequences: stop_sequences }),
      ...(ho && { thinking: ho }),
      ...betasRequestParam(systemBlocks),
      metadata: getAPIMetadata({ servedSessionMode: servedSessionMode }),
      ...extraBodyParams,
      ...$o(),
    };
  if (containsMalformedStringDeep(yo)) {
    try {
      yo = clone(yo);
    } catch {}
    (repairMalformedStringsDeep(yo),
      logEvent("tengu_lone_surrogate_sanitized", {
        source: lit_2("sideQuery"),
        querySource: agentTypeForTelemetry(opts.querySource),
      }));
  }
  let start = performance.now(),
    rr = startLLMRequestSpan(messageText, gt, void 0, void 0, !1, opts.querySource),
    br = 0,
    Hr = start,
    Fr,
    cs = (as) => (as && !_st() ? getDispatchVersion(classifyQuerySource(opts.querySource)) : null),
    _r = !1,
    Cr = null,
    Vr = !1,
    Oo = { count: 0 },
    jr = (as) => {
      let Vi = isFirstPartyApiBackend();
      Vr = Vi;
      let ji = _r ? null : cs(Vi),
        Wi = _r ? (Vi ? V2P : null) : ji;
      if (((Cr = Wi), Wi !== null))
        logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${Wi} (side query)`);
      (br++,
        (Hr = performance.now()),
        takeGzipTelemetry(Fr),
        (Fr = hitsAnthropicBackend() ? randomUUID_30() : void 0),
        recordLlmRequestAttempt(rr, { attempt: br, clientRequestId: Fr }));
      let ii = getUpstreamTraceparent(),
        wa = {
          ...(Wi !== null && { [ANTHROPIC_DISPATCH_ID]: Wi }),
          ...(Fr && { [CLIENT_REQUEST_ID_HEADER]: Fr }),
          ...(ii && { traceparent: ii }),
        };
      return as.beta.messages
        .create(yo, {
          signal: signal,
          ...(timeout !== void 0 && { timeout: timeout }),
          ...(ji !== null && { maxRetries: 0 }),
          ...(Object.keys(wa).length > 0 && { headers: wa }),
        })
        .catch((hr) => {
          let mi = parseFoundryUnsupportedCapabilities(hr);
          if (mi) recordFoundryUnsupportedCapabilities(messageText, mi);
          if (yo.output_config?.effort !== void 0 && isEffortUnsupportedError(hr)) {
            (markEffortUnsupported(messageText),
              logForDebugging(
                `[effort] side query: the server refused effort for model ${messageText} (the output_config.effort field or the anthropic-beta value ${Cge.header}). Sending the request again without either; this Claude Code process will not send either to this model again.`,
                { level: "warn" },
              ),
              logEvent("tengu_effort_unsupported_retry", { model: telemetrySafeModelName(messageText) }));
            let { effort: effort, ...$a } = yo.output_config,
              { output_config: output_config, betas: betas, ...Vs } = yo,
              _i = betas?.filter((jo) => jo !== Cge.header);
            return (
              (yo = {
                ...Vs,
                ...(Object.keys($a).length > 0 && { output_config: $a }),
                ...(_i !== void 0 && _i.length > 0 && { betas: _i }),
              }),
              jr(as)
            );
          }
          if (
            pn &&
            !(extraBodyParams !== void 0 && "output_config" in extraBodyParams) &&
            yo.output_config?.format !== void 0 &&
            isStructuredOutputsUnsupported(hr)
          ) {
            (Jve(messageText),
              logForDebugging(
                `[structured-outputs] model ${messageText} rejected output_config.format (side query); latching unsupported and retrying without it.`,
                { level: "warn" },
              ),
              logEvent("tengu_structured_outputs_unsupported_retry", {
                model: telemetrySafeModelName(messageText),
              }));
            let { format: format, ...$a } = yo.output_config,
              { output_config: output_config, betas: betas, ...Vs } = yo,
              _i = no ? betas?.filter((jo) => jo !== n8.header) : betas;
            return (
              (yo = {
                ...Vs,
                ...(Object.keys($a).length > 0 && { output_config: $a }),
                ...(_i !== void 0 && _i.length > 0 && { betas: _i }),
              }),
              jr(as)
            );
          }
          if (
            opts.resendWithoutRefusedContext1m &&
            yo.betas?.includes(yv.header) &&
            !hitsAnthropicBackend(getProviderForModel(messageText)) &&
            (isContext1mBetaRejected(hr) || isInvalidBetaFlagError(hr))
          ) {
            let { betas: betas, ...$a } = yo,
              filtered = betas.filter((Ti) => Ti !== yv.header);
            return (
              (yo = { ...$a, ...(filtered.length > 0 && { betas: filtered }) }),
              jr(as).then((Ti) => (rejectContextBetaForModel(messageText), Ti))
            );
          }
          if (RK(hr, getProviderForModel(messageText))) {
            let Ha = hr.error !== null && typeof hr.error === "object" ? hr.error : {};
            throw new Ot(hr.status, { ...Ha, message: PQt(hr.message) }, void 0, hr.headers);
          }
          if (opts.querySource !== "model_validation" && DKt(messageText, hr) === "refused")
            classifyModelAccess(messageText, hr, "refused");
          throw hr;
        });
    },
    Or = async (as) => {
      try {
        return await jr(as);
      } catch (error) {
        let ji = Cr;
        if (_r || signal?.aborted) throw error;
        let Wi = error instanceof Ot ? error.status : void 0,
          ii = Wi !== void 0 && Wi >= 500,
          wa = error instanceof ef,
          hr,
          mi,
          Ha = 0;
        if (ji === null) {
          if (!Vr || Wi !== 503) throw error;
          ((hr = Ioo(error)),
            (Ha = Ooo(error)),
            (mi = `HTTP 503 with no ${ANTHROPIC_DISPATCH_ID} (side query); retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`));
        } else if (ii || wa)
          ((hr = ii ? lit_2("5xx") : lit_2("conn_err")),
            (mi = `${ii ? `HTTP ${Wi}` : "connection error"} with ${ANTHROPIC_DISPATCH_ID}=${ji} (side query); retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`));
        else if (
          (Wi === 408 || Wi === 409 || Wi === 429) &&
          At > 0 &&
          !(retryAfterBudgetMs && retryAfterTooLongMs(error) !== void 0)
        )
          ((hr = lit_2("retryable_4xx")),
            (mi = `HTTP ${Wi} with ${ANTHROPIC_DISPATCH_ID}=${ji} (side query); re-sending with ${ANTHROPIC_DISPATCH_ID}=${V2P} and the client retry budget`));
        else throw error;
        if (
          (logForDebugging(`[dispatch] ${mi}`, { level: "warn" }),
          logEvent("tengu_dispatch_header_fallback", {
            model: telemetrySafeModelName(messageText),
            dispatch: fromEnumOpt(ji) ?? lit_2("none"),
            resend_dispatch: fromEnum(V2P),
            reason: hr,
            status: Wi !== void 0 ? fromNumber(Wi) : lit_2("none"),
            query_source: agentTypeForTelemetry(opts.querySource),
            request_id: ye(error instanceof Ot ? error.requestID : void 0),
          }),
          (_r = !0),
          Ha > 0)
        ) {
          if ((await sleep(Ha, signal), signal?.aborted)) throw error;
        }
        return await jr(as);
      }
    },
    Io;
  try {
    try {
      Io = await Or(Yt);
    } catch (error) {
      if (
        !(error instanceof Ot) ||
        !(error.status === 401 || isOAuthTokenRevokedError(error)) ||
        isRoutedFinalAnswerError(error) ||
        !qt ||
        signal?.aborted
      )
        throw error;
      let Vi = !1;
      try {
        Vi = await handleOAuth401Error(qt, credentials);
      } catch (error_2) {
        logForDebugging(
          `sideQuery: OAuth refresh after ${error.status} failed: ${error_2 instanceof Error ? error_2.message : String(error_2)}`,
          { level: "error" },
        );
      }
      if (!Vi) throw error;
      if (signal?.aborted) throw error;
      ((Io = await Or(await It())),
        logEvent("tengu_oauth_401_sidequery_recovered", {
          querySource: agentTypeForTelemetry(opts.querySource),
          httpStatus: error.status,
        }));
    }
  } catch (error) {
    if (
      (endLLMRequestSpan(rr, {
        success: !1,
        statusCode: error instanceof Ot ? error.status : void 0,
        error: errorMessage(error),
        errorClass: classifyAPIError(error),
        attempt: br,
        clientRequestId: Fr,
        requestId: (error instanceof Ot ? error.requestID : void 0) ?? void 0,
      }),
      takeGzipTelemetry(Fr),
      record && !signal?.aborted && !isAbortError(error))
    )
      emitSideQueryOtelEvent({
        record: record,
        event: "api_error",
        attributes: () =>
          apiErrorFields({
            model: ao,
            error: apiErrorText({
              error: error,
              errorClass: classifyAPIError(error),
              querySource: record.querySource,
            }),
            status: error instanceof Ot ? error.status : void 0,
            durationMs: Math.max(0, Math.round(performance.now() - Hr)),
            attempt: br,
            requestId: error instanceof Ot ? error.requestID : void 0,
            clientRequestId: Fr,
            fastMode: !1,
            querySource: record.querySource,
            effort: yo.output_config?.effort ?? void 0,
          }),
        agentContext: gt,
      });
    throw error;
  }
  resetAuthFailureTracking();
  let zo = Io._request_id ?? void 0,
    rs = Cr,
    now = performance.now(),
    now_2 = Date.now(),
    lastCompletion = getLastApiCompletionTimestamp();
  (endLLMRequestSpan(rr, {
    success: !0,
    inputTokens: Io.usage.input_tokens,
    outputTokens: Io.usage.output_tokens,
    cacheReadTokens: Io.usage.cache_read_input_tokens ?? void 0,
    cacheCreationTokens: Io.usage.cache_creation_input_tokens ?? void 0,
    requestId: zo,
    clientRequestId: Fr,
    stopReason: Io.stop_reason ?? void 0,
    attempt: br,
  }),
    nEe(Io.usage, !1),
    logEvent("tengu_api_success", {
      requestId: ye(zo),
      clientRequestId: ye(Fr) || void 0,
      user_message_uuid: ye(turnAttributionKeyFor(gt)),
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
      stop_reason: fromEnumOpt(Io.stop_reason) ?? void 0,
      ...gzipTelemetryFields(takeGzipTelemetry(Fr)),
      timeSinceLastApiCallMs:
        lastCompletion !== null ? Math.max(0, Math.round(now_2 - lastCompletion)) : void 0,
      ...redactAttribution(opts.querySource, buildAttribution(opts.querySource, void 0, void 0)),
    }),
    setLastApiCompletionTimestamp(now_2));
  let fs = Number.NaN;
  try {
    ((fs = calculateCostWithPricingSource(ao, Io.usage).usd), addSideQueryCostUSD(fs));
  } catch (error) {
    (logForDebugging(`sideQuery: not priced: ${errorMessage(error)}`, { level: "error" }), logError(error));
  }
  if (record)
    emitSideQueryOtelEvent({
      record: record,
      event: "api_request",
      attributes: () =>
        apiSuccessFields({
          model: Io.model || ao,
          usage: Io.usage,
          costUSD: fs,
          durationMs: Math.max(0, Math.round(now - Hr)),
          ttftMs: null,
          requestId: zo,
          clientRequestId: Fr,
          fastMode: !1,
          querySource: record.querySource,
          effort: yo.output_config?.effort ?? void 0,
        }),
      agentContext: gt,
    });
  return (H7r(), Io);
}
//@ chunk-e6aww6q8.js:2817687-2817781 placement
function I_n(e, n) {
  let r = getAssistantMessageFromApiError(e, n);
  return { status: r.apiErrorStatus ?? null, kind: r.error ?? "unknown" };
}
//@ chunk-e6aww6q8.js:2817781-2817849 placement = stripCacheControl (1)
function stripCacheControl(items) {
  return "cache_control" in items && Boolean(items.cache_control);
}
//@ chunk-e6aww6q8.js:2817849-2817909 placement
function M_n(e) {
  return stripCacheControl(e) ? { ...e, cache_control: void 0 } : e;
}
//@ chunk-e6aww6q8.js:2817909-2818055 placement = stripCacheControl (0.857)
function stripCacheControl_3(e, n) {
  if (!("cache_control" in e) || !e.cache_control || e.cache_control.ttl) return e;
  return { ...e, cache_control: { ...e.cache_control, ttl: n } };
}

export { aN, I_n };

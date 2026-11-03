/**
 * services/api/logging.ts
 *
 * API 请求的遥测：tengu_api_query（发请求前）、tengu_api_success / tengu_api_error（含 token、耗时、TTFT、缓存、网关识别）、拒答事件、请求内容与工具 schema 规模统计。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/logging.ts
 * pieces: chunk-e6aww6q8.js (37)
 * attribution: fingerprint 6, affinity 1, placement 17, layout 12, callgraph-witnessed 1
 */
import {
  fromEnumOpt,
  lit as lit_2,
  fromEnum,
  fromNumberOpt,
  concatSafe,
  fromNumber,
} from "../analytics/safeMetadata.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  getSessionId,
  isDiskless,
  addSafetyStop,
  getTeleportedSessionInfo,
  markFirstTeleportMessageLogged,
  getIsNonInteractiveSession,
  consumePostCompaction,
  getLastApiCompletionTimestamp,
  setLastApiCompletionTimestamp,
  noteObservedGateway,
  addToTotalDurationState,
} from "../../bootstrap/state.js";
import { getTokenCountFromUsage as getTokenCountFromUsage_5 } from "../../utils/messages/usageAndStopReason.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  redactAccountMemoryText,
  accountMemoryRedactionKeys,
} from "../../utils/telemetry/accountMemoryRedaction.js";
import { normalizeAgentQuerySource, classifyQuerySource } from "./requestHeaders.js";
import { Dki, hashToolNames, hashEntries } from "../../utils/model/modelCatalog/maskedIds.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { logEvent } from "../analytics/index.js";
import { getAPIProviderForAnalytics } from "../../utils/model/providers.js";
import {
  agentTypeForTelemetry,
  redactAttribution,
  attributionForLog,
  isToolDetailsLoggingEnabled,
  sanitizeToolNameForAnalytics,
} from "../analytics/metadata.js";
import { ye } from "../../utils/startupMarks.js";
import {
  isRequestTooLargeError_2,
  _3e,
  classifyAPIError,
  DLP_REQUEST_DENIED,
  CLAUDE_CODE_VERSION_TOO_OLD,
} from "./errors.js";
import { Qos, TUNNEL_CREDENTIAL_EPOCH_HEADER } from "../../utils/auth/credentialEpoch.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { extractConnectionErrorDetails, formatApiErrorType } from "./errorUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { consumeInvokingRequestId, turnAttributionKeyFor, isMainAgent } from "../../utils/agentContext.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import {
  classifyApiErrorKind,
  connectionSetupFacts,
  responseDiagnosticFields,
} from "./responseDiagnostics.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { gzipTelemetryFields, takeGzipTelemetry } from "./gzipRequestBody.js";
import { logOTelEvent, isAssistantResponseLoggingEnabled } from "../../utils/telemetry/events.js";
import { endLLMRequestSpan, truncateContentForTelemetry } from "../../utils/telemetry/sessionTracing.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { isBase64ImageBlock as isBase64ImageBlock_3 } from "../../utils/imageValidation.js";
import { parseWebpHeader } from "../../utils/imageFormats.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { getCachedJsonLength, roughTokenCountEstimationForContent } from "../tokenEstimation.js";
import { jsonStringify, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { bl } from "../../utils/toolResultStorage.js";
import { isRealApiResponse } from "./claude.js";
import { gn } from "../../utils/shortHash.js";
import { resetAuthFailureTracking } from "../../utils/auth.js";
import { H7r } from "../policyLimits/prefetchToggle.js";
import { eagerHasCliFlag } from "../../utils/cliArgs.js";
import { onMainRequestLogged } from "./cacheKeepalive.js";
import { getFallbackLatchKind, X_CC_TENDER_QUILT } from "./refusalFallbackHeaders.js";
import { isNarrationThinking } from "./narrationClassifier.js";
import { SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { writeOtelResponseBody } from "../../utils/telemetry/otelRawBodies.js";
import { isBetaTracingEnabled } from "../../utils/telemetry/betaSessionTracing.js";

/**
 * 已知 LLM 网关指纹：litellm、helicone、portkey、cloudflare-ai-gateway、kong、braintrust、bifrost（按响应头前缀）、databricks（按 host 后缀）。
 */
//@ chunk-e6aww6q8.js:1559771-1560221 fingerprint = GATEWAY_FINGERPRINTS (0.715)
var GATEWAY_FINGERPRINTS = {
    litellm: { headerPrefixes: ["x-litellm-"], versionHeader: "x-litellm-version" },
    helicone: { headerPrefixes: ["helicone-"] },
    portkey: { headerPrefixes: ["x-portkey-"] },
    "cloudflare-ai-gateway": { headerPrefixes: ["cf-aig-"] },
    kong: { headerPrefixes: ["x-kong-"] },
    braintrust: { headerPrefixes: ["x-bt-"] },
    bifrost: { headerPrefixes: ["x-bifrost-"] },
    databricks: { hostSuffixes: [".cloud.databricks.com", ".azuredatabricks.net", ".gcp.databricks.com"] },
  },
  GATEWAY_FINGERPRINT_ENTRIES = Object.entries(GATEWAY_FINGERPRINTS);
/**
 * 按响应头前缀或 base URL 主机后缀识别中间网关名，写进 API 成功/失败事件。
 */
//@ chunk-e6aww6q8.js:1560221-1560527 affinity
function detectGateway({ headers: headers, baseUrl: baseUrl }) {
  if (headers) {
    let r = [];
    headers.forEach((s, h) => r.push(h));
    for (let [s, { headerPrefixes: h }] of GATEWAY_FINGERPRINT_ENTRIES)
      if (h?.some((y) => r.some((S) => S.startsWith(y)))) return s;
  }
  if (baseUrl)
    try {
      let lower = new URL(baseUrl).hostname.toLowerCase();
      for (let [s, { hostSuffixes: h }] of GATEWAY_FINGERPRINT_ENTRIES)
        if (h?.some((y) => lower.endsWith(y))) return s;
    } catch {}
  return;
}
/**
 * 已知的请求入口（entrypoint）名单，未列出的按 unknown 处理。
 */
//@ chunk-e6aww6q8.js:2539755-2540118 placement
var KNOWN_ENTRYPOINTS = [
  "android",
  "ios",
  "desktop_app",
  "web_claude_ai",
  "claude_in_slack",
  "claude-in-slack",
  "claude_code_cli",
  "claude_code_vscode",
  "claude_code_remote",
  "claude_code_sdk",
  "claude_code_mcp",
  "claude_code_github_action",
  "claude_code_local_agent",
  "unknown",
  "scheduled_trigger",
  "force_run_trigger",
  "fire_routine",
  "github_webhook_trigger",
  "pr_steward",
  "claude-in-teams",
];
//@ chunk-e6aww6q8.js:2540118-2540185 placement
function yW(e) {
  let found = KNOWN_ENTRYPOINTS.find((r) => r === e);
  return fromEnumOpt(found) ?? lit_2("other");
}
//@ chunk-e6aww6q8.js:2540185-2540288 placement = _temp9 (0.529)
function emptyUsageCounters() {
  return { inputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, outputTokens: 0, requests: 0 };
}
//@ chunk-e6aww6q8.js:2540288-2540322 placement
var ehr = 32,
  thr = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:2540322-2540396 placement
function Cun(e, n) {
  return n && (e.startsWith("repl_main_thread") || e === "sdk");
}
//@ chunk-e6aww6q8.js:2540396-2540588 placement
function sessionUsageTotals(e) {
  let of = thr.of(e ?? getRootSession().host),
    r = getSessionId(),
    s = of.get(r);
  if (s === void 0) {
    s = { all: emptyUsageCounters(), main: emptyUsageCounters() };
    for (let h of of.keys()) {
      if (of.size < ehr) break;
      of.delete(h);
    }
  } else of.delete(r);
  return (of.set(r, s), s);
}
//@ chunk-e6aww6q8.js:2540588-2540665 placement
function nEe(e, n, r) {
  try {
    let s = sessionUsageTotals(r);
    if ((addUsage(s.all, e), n)) addUsage(s.main, e);
  } catch {}
}
//@ chunk-e6aww6q8.js:2540665-2540877 placement
function addUsage(e, n) {
  ((e.inputTokens += tEe(n.input_tokens)),
    (e.cacheCreationTokens += tEe(n.cache_creation_input_tokens)),
    (e.cacheReadTokens += tEe(n.cache_read_input_tokens)),
    (e.outputTokens += tEe(n.output_tokens)),
    (e.requests += 1));
}
//@ chunk-e6aww6q8.js:2540877-2540944 placement
function tEe(e) {
  return typeof e === "number" && Number.isFinite(e) ? e : 0;
}
//@ chunk-e6aww6q8.js:2540944-2541063 placement
var EXCUSED_TAIL_REASONS = new Set([
    "none",
    "sent_once_text",
    "sent_once_oversized",
    "sent_once_mislabeled",
    "request_scoped_user",
  ]),
  MIN_EXCESS_TOKENS = 4096;
/**
 * 计算未被缓存覆盖的尾部字段：原因、标记后的消息数、重发/单次发送/无理由的尾部 token 估计，以及普通输入超出量。
 */
//@ chunk-e6aww6q8.js:2541063-2541674 placement
function uncoveredTailFields(audit, usage) {
  let r = !Array.isArray(usage.iterations) || usage.iterations.length <= 1,
    s = getTokenCountFromUsage_5(usage),
    h = s.input_tokens + s.cache_read_input_tokens + s.cache_creation_input_tokens,
    y =
      audit.resentTailTokensEst +
      audit.sentOnceTailTokensEst -
      (audit.reason === "sent_once_oversized" || audit.reason === "sent_once_mislabeled"
        ? audit.unexcusedTailTokensEst
        : 0);
  return {
    uncoveredTailReason: fromEnum(audit.reason),
    uncoveredTailMessages: audit.messagesAfterMarker,
    resentTailTokensEst: audit.resentTailTokensEst,
    sentOnceTailTokensEst: audit.sentOnceTailTokensEst,
    unexcusedTailTokensEst: audit.unexcusedTailTokensEst,
    ...(r &&
      h >= MIN_EXCESS_TOKENS &&
      EXCUSED_TAIL_REASONS.has(audit.reason) && { plainInputExcessTokens: Math.max(0, s.input_tokens - y) }),
  };
}
//@ chunk-e6aww6q8.js:2541674-2541686 placement
var shr = 1e6;
//@ chunk-e6aww6q8.js:2541686-2541833 placement
function getErrorMessage(error) {
  if (error instanceof Ot) {
    let n = error.error?.error?.message;
    if (typeof n === "string" && n) return n;
  }
  return error instanceof Error ? error.message : String(error);
}
//@ chunk-e6aww6q8.js:2541833-2541954 placement
function apiErrorText({
  error: error,
  errorClass: errorClass,
  querySource: querySource,
  accountMemoryKeys: accountMemoryKeys,
}) {
  return isDiskless()
    ? errorClass
    : redactAccountMemoryText(
        accountMemoryKeys ?? (() => accountMemoryRedactionKeys(getRootSession().host)),
        querySource,
        getErrorMessage(error),
      );
}
//@ chunk-e6aww6q8.js:2541954-2541990 placement
var ihr = (e) => (Number.isFinite(e) ? e : 0);
/**
 * 构造 API 成功日志字段：模型、各类 token、费用（美元与微美元）、耗时、首 token 时间、请求 id、速度、查询来源与 effort。
 */
//@ chunk-e6aww6q8.js:2541990-2542644 placement
function apiSuccessFields(
  {
    model: model,
    usage: usage,
    costUSD: costUSD,
    durationMs: durationMs,
    ttftMs: ttftMs,
    requestId: requestId,
    clientRequestId: clientRequestId,
    fastMode: fastMode,
    querySource: querySource,
    effort: effort,
  },
  extraFields,
) {
  let costUsd = ihr(costUSD);
  return {
    model: model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_input_tokens ?? 0,
    cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_creation_5m_tokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    cache_creation_1h_tokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    cost_usd: costUsd,
    cost_usd_micros: Math.round(costUsd * shr),
    ...extraFields,
    duration_ms: durationMs,
    ...(ttftMs !== null && { ttft_ms: ttftMs }),
    request_id: requestId ?? void 0,
    client_request_id: clientRequestId,
    speed: fastMode ? "fast" : "normal",
    query_source: normalizeAgentQuerySource(querySource),
    ...(effort && { effort: effort }),
  };
}
/**
 * 构造 API 错误日志字段：模型、错误、状态码、耗时、尝试次数、请求 id、速度、查询来源与 effort。
 */
//@ chunk-e6aww6q8.js:2542644-2542969 placement
function apiErrorFields({
  model: model,
  error: error,
  status: status,
  durationMs: durationMs,
  attempt: attempt,
  requestId: requestId,
  clientRequestId: clientRequestId,
  fastMode: fastMode,
  querySource: querySource,
  effort: effort,
}) {
  let q = normalizeAgentQuerySource(querySource);
  return {
    model: model,
    error: error,
    ...(status !== void 0 && { status_code: status }),
    duration_ms: durationMs,
    attempt: attempt,
    request_id: requestId ?? void 0,
    client_request_id: clientRequestId,
    speed: fastMode ? "fast" : "normal",
    ...(q && { query_source: q }),
    ...(effort && { effort: effort }),
  };
}
/**
 * 非受限环境下返回 ANTHROPIC_BASE_URL（供网关识别与遥测）。
 */
//@ chunk-e6aww6q8.js:2542969-2543033 layout
function getCustomApiBaseUrl() {
  return isDiskless() ? void 0 : process.env.ANTHROPIC_BASE_URL;
}
/**
 * 遥测用环境元数据：baseUrl、ANTHROPIC_MODEL、ANTHROPIC_SMALL_FAST_MODEL。
 */
//@ chunk-e6aww6q8.js:2543033-2543272 fingerprint = getAnthropicEnvMetadata (0.926)
function getAnthropicEnvMetadata() {
  let e = getCustomApiBaseUrl();
  return {
    ...(e && { baseUrl: Dki(e) }),
    ...(process.env.ANTHROPIC_MODEL && { envModel: telemetrySafeModelName(process.env.ANTHROPIC_MODEL) }),
    ...(process.env.ANTHROPIC_SMALL_FAST_MODEL && {
      envSmallFastModel: telemetrySafeModelName(process.env.ANTHROPIC_SMALL_FAST_MODEL),
    }),
  };
}
/**
 * 距构建时间（BUILD_TIME 2026-10-30T23:28:13Z）的分钟数。
 */
//@ chunk-e6aww6q8.js:2543272-2544363 callgraph-witnessed = getBuildAgeMinutes (0.151)
function getBuildAgeMinutes() {
  if (
    !{
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME
  )
    return;
  let buildTime = new Date(
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME,
  ).getTime();
  if (isNaN(buildTime)) return;
  return Math.floor((Date.now() - buildTime) / 60000);
}
/**
 * 发请求前记 tengu_api_query：模型、消息数、temperature、betas、权限模式、querySource、thinking 类型、effort、fast mode、前一个 request id。
 */
//@ chunk-e6aww6q8.js:2544363-2545020 fingerprint = logAPIQuery (0.921)
function logAPIQuery({
  model: model,
  messagesLength: messagesLength,
  temperature: temperature,
  betas: betas,
  permissionMode: permissionMode,
  proactivityLevel: proactivityLevel,
  querySource: querySource,
  messageClientPlatform: messageClientPlatform,
  queryTracking: queryTracking,
  thinkingType: thinkingType,
  thinkingPrefixMismatchBehavior: thinkingPrefixMismatchBehavior,
  effortValue: effortValue,
  fastMode: fastMode,
  previousRequestId: previousRequestId,
}) {
  logEvent("tengu_api_query", {
    model: telemetrySafeModelName(model),
    messagesLength: messagesLength,
    temperature: temperature,
    provider: getAPIProviderForAnalytics(),
    buildAgeMins: getBuildAgeMinutes(),
    ...(betas?.length && { betas: hashToolNames(betas) }),
    permissionMode: fromEnumOpt(permissionMode),
    proactivityLevel: fromEnumOpt(proactivityLevel),
    querySource: agentTypeForTelemetry(querySource),
    ...(messageClientPlatform && { messageClientPlatform: yW(messageClientPlatform) }),
    ...(queryTracking && { queryChainId: ye(queryTracking.chainId), queryDepth: queryTracking.depth }),
    thinkingType: fromEnumOpt(thinkingType),
    thinkingPrefixMismatchBehavior: fromEnumOpt(thinkingPrefixMismatchBehavior),
    effortValue: fromEnumOpt(effortValue),
    fastMode: fastMode,
    ...(previousRequestId && { previousRequestId: ye(previousRequestId) }),
    ...getAnthropicEnvMetadata(),
  });
}
/**
 * 记 API 失败：tengu_api_error（错误类型、状态、耗时、重试次数、request id、是否回退非流式、网关等），并做相关诊断。
 */
//@ chunk-e6aww6q8.js:2545020-2549172 fingerprint = logAPIError (0.492)
function logAPIError({
  error: error,
  model: model,
  messageCount: messageCount,
  messageTokens: messageTokens,
  durationMs: durationMs,
  durationMsIncludingRetries: durationMsIncludingRetries,
  attempt: attempt,
  requestId: requestId,
  clientRequestId: clientRequestId,
  didFallBackToNonStreaming: didFallBackToNonStreaming,
  nonStreamingFallbackSkipped: nonStreamingFallbackSkipped,
  observedResponse: observedResponse,
  queryTracking: queryTracking,
  querySource: querySource,
  accountMemoryKeys: accountMemoryKeys,
  messageClientPlatform: messageClientPlatform,
  llmSpan: llmSpan,
  fastMode: fastMode,
  previousRequestId: previousRequestId,
  effort: effort,
  attribution: attribution,
  modelCallNames: modelCallNames,
  promptTooLongIsHandled: promptTooLongIsHandled,
  agentContext: agentContext,
  isLowPriority: isLowPriority,
  dispatch: dispatch,
}) {
  if (isRequestTooLargeError_2(error) || _3e(error)) addSafetyStop();
  let yt = error instanceof Ot && error.headers ? error.headers : observedResponse?.headers;
  Qos(yt?.get?.(TUNNEL_CREDENTIAL_EPOCH_HEADER));
  let gt = didFallBackToNonStreaming ? void 0 : clientRequestId,
    gateway = getErrorMessage(error),
    It = error instanceof Ot ? error.status : void 0,
    errStr = fromNumberOpt(It),
    qt = classifyAPIError(error),
    Zt = normalizeAgentQuerySource(querySource);
  if (qt === "stored_login_refused" && classifyQuerySource(querySource) === "main")
    logFeatureBad("managed_settings_stored_login_refused", "helper_not_in_force");
  let rn = promptTooLongIsHandled && qt === "prompt_too_long",
    pn = extractConnectionErrorDetails(error);
  if (pn) {
    let yn = pn.isSSLError ? " (SSL error)" : "";
    logForDebugging(`Connection error details: code=${pn.code}${yn}, message=${pn.message}`, {
      level: "error",
    });
  }
  let no = rn ? void 0 : consumeInvokingRequestId(agentContext);
  if (clientRequestId)
    logForDebugging(
      `API error x-client-request-id=${clientRequestId} (give this to the API team for server-log lookup)`,
      { level: "error" },
    );
  if (!rn) {
    if (
      (logForDiagnosticsNoPII("error", "cli_api_error", () => ({
        ...classifyApiErrorKind(error, qt, observedResponse),
        attempt: attempt,
        duration_ms: durationMs,
        duration_ms_including_retries: durationMsIncludingRetries,
        did_fallback_to_non_streaming: didFallBackToNonStreaming ?? !1,
        client_request_id: ye(gt) ?? null,
        model: telemetrySafeModelName(model) ?? null,
        query_source: Zt ?? null,
        route: connectionSetupFacts(),
      })),
      qt === "connection_error" ||
        qt === "server_overload" ||
        qt === "api_timeout" ||
        qt === "stream_idle_timeout" ||
        qt === "rate_limit" ||
        qt === "no_api_attempts_left")
    )
      logForDebugging(`API ${qt} after retries: ${gateway}`, { level: "error" });
    else if (qt === "model_not_found") logForDebugging(`API model not found: ${gateway}`, { level: "error" });
    else if (qt === "invalid_api_key" || qt === "invalid_request_header")
      logForDebugging(`API ${qt}: ${gateway}`, { level: "error" });
    else if (qt === "output_content_filtered")
      logForDebugging(`API output_content_filtered: ${gateway}`, { level: "error" });
    else if (qt === DLP_REQUEST_DENIED) logForDebugging(`API ${qt}: ${gateway}`, { level: "error" });
    else if (qt === CLAUDE_CODE_VERSION_TOO_OLD) logForDebugging(`API ${qt}: ${gateway}`, { level: "error" });
    else if (qt === "request_too_large")
      logForDebugging(`API request_too_large: ${gateway}`, { level: "error" });
    else if (qt === "system_role_misplaced") logForDebugging(`API ${qt}: ${gateway}`, { level: "error" });
    else if (qt === "wif_credential_error" || qt === "cloud_credential_error")
      logForDebugging(`API ${qt}: ${gateway}`, { level: "error" });
    else if (
      qt === "auth_error" ||
      qt === "token_revoked" ||
      qt === "oauth_org_not_allowed" ||
      qt === "oauth_refresh_lock_timeout" ||
      qt === "oauth_refresh_disk_full" ||
      qt === "stored_login_refused" ||
      qt === "verification_required"
    )
      logForDebugging(`API ${qt}: ${gateway}`, { level: "error" });
    else {
      let Kn = formatApiErrorType(qt, It);
      if (qt === "unknown") {
        let Xn = classifyApiErrorKind(error, qt, observedResponse);
        Kn += ` class=${Xn.error_class} name=${Xn.error_name ?? "none"} code=${Xn.connection_code ?? "none"}`;
      }
      logError(withTelemetryMessage(error, Kn));
    }
    let errorType = detectGateway({ headers: yt, baseUrl: getCustomApiBaseUrl() });
    logEvent("tengu_api_error", {
      model: telemetrySafeModelName(model),
      ...(isLowPriority && { is_low_priority: !0 }),
      dispatch: dispatch ?? lit_2("none"),
      error: formatApiErrorType(qt, It),
      ...errorTelemetryFields(error),
      status: errStr,
      errorType: fromEnum(qt),
      ...(effort && { effort_level: fromEnum(effort) }),
      messageCount: messageCount,
      messageTokens: messageTokens,
      durationMs: durationMs,
      durationMsIncludingRetries: durationMsIncludingRetries,
      attempt: attempt,
      provider: getAPIProviderForAnalytics(),
      requestId: ye(requestId) || void 0,
      ...(no && {
        invokingRequestId: ye(no.invokingRequestId),
        invocationKind: fromEnumOpt(no.invocationKind),
      }),
      clientRequestId: ye(clientRequestId) || void 0,
      user_message_uuid: ye(turnAttributionKeyFor(agentContext)),
      didFallBackToNonStreaming: didFallBackToNonStreaming,
      ...gzipTelemetryFields(takeGzipTelemetry(gt)),
      ...(errorType && { gateway: fromEnum(errorType) }),
      ...responseDiagnosticFields(error, observedResponse),
      fallback_disabled: nonStreamingFallbackSkipped ?? !1,
      ...(queryTracking && { queryChainId: ye(queryTracking.chainId), queryDepth: queryTracking.depth }),
      ...(querySource && { querySource: agentTypeForTelemetry(querySource) }),
      ...(messageClientPlatform && { messageClientPlatform: yW(messageClientPlatform) }),
      fastMode: fastMode,
      ...(previousRequestId && { previousRequestId: ye(previousRequestId) }),
      ...(attribution && redactAttribution(querySource, attribution)),
      ...(attribution?.attributionSkill && { _PROTO_skill_name: attribution.attributionSkill }),
      ...getAnthropicEnvMetadata(),
    });
  }
  let connectionDetails = apiErrorText({
    error: error,
    errorClass: qt,
    querySource: querySource,
    accountMemoryKeys: accountMemoryKeys,
  });
  if (
    (logOTelEvent(
      "api_error",
      {
        ...apiErrorFields({
          model: model,
          error: connectionDetails,
          status: It,
          durationMs: durationMs,
          attempt: attempt,
          requestId: requestId,
          clientRequestId: gt,
          fastMode: fastMode,
          querySource: querySource,
          effort: effort,
        }),
        ...(attribution && attributionForLog(querySource, attribution)),
        ...modelCallNames,
      },
      agentContext,
    ),
    attempt > 1)
  )
    logOTelEvent(
      "api_retries_exhausted",
      {
        model: model,
        error: connectionDetails,
        ...(It !== void 0 && { status_code: It }),
        total_attempts: attempt,
        total_retry_duration_ms: durationMsIncludingRetries,
        speed: fastMode ? "fast" : "normal",
        ...(Zt && { query_source: Zt }),
        ...(effort && { effort: effort }),
      },
      agentContext,
    );
  endLLMRequestSpan(llmSpan, {
    success: !1,
    statusCode: errStr ? parseInt(errStr) : void 0,
    error: connectionDetails,
    errorClass: qt,
    attempt: attempt,
    requestId: requestId ?? void 0,
    clientRequestId: gt,
    effort: effort,
  });
  let ho = rn ? void 0 : getTeleportedSessionInfo();
  if (ho?.isTeleported && !ho.hasLoggedFirstMessage)
    (logEvent("tengu_teleport_first_message_error", {
      session_id: ye(ho.sessionId),
      error_type: fromEnum(qt),
    }),
      markFirstTeleportMessageLogged());
}
/**
 * 可上报的拒答类别：cyber/bio/frontier_llm/reasoning_extraction。
 */
//@ chunk-e6aww6q8.js:2549172-2549243 layout
var SHAREABLE_REFUSAL_CATEGORIES = new Set(["cyber", "bio", "frontier_llm", "reasoning_extraction"]);
/**
 * 记 api_refusal 事件（模型、request id、速度、类别是否存在等）。
 */
//@ chunk-e6aww6q8.js:2549243-2549704 layout
function logApiRefusal({
  model: model,
  requestId: requestId,
  querySource: querySource,
  effort: effort,
  fastMode: fastMode,
  attempt: attempt,
  attribution: attribution,
  serverFallbackHop: serverFallbackHop,
  stopDetails: stopDetails,
  agentContext: agentContext,
}) {
  addSafetyStop();
  let q = normalizeAgentQuerySource(querySource),
    Z = stopDetails?.category,
    Se = Z && SHAREABLE_REFUSAL_CATEGORIES.has(Z) ? Z : null;
  logOTelEvent(
    "api_refusal",
    {
      model: model,
      request_id: requestId,
      speed: fastMode ? "fast" : "normal",
      attempt: attempt,
      server_fallback_hop: serverFallbackHop,
      ...(q && { query_source: q }),
      ...(effort && { effort: effort }),
      ...(stopDetails !== void 0 && {
        has_category: Se !== null,
        has_explanation: Boolean(stopDetails?.explanation),
      }),
      ...(Se && isToolDetailsLoggingEnabled() && { category: Se }),
      ...(attribution && attributionForLog(querySource, attribution)),
    },
    agentContext,
  );
}
/**
 * base64 字符串解码后的字节数。
 */
//@ chunk-e6aww6q8.js:2549704-2549799 layout
function base64DecodedLength(e) {
  let n = e.endsWith("==") ? 2 : e.endsWith("=") ? 1 : 0;
  return Math.floor((e.length * 3) / 4) - n;
}
/**
 * 87400 / 40：读图片尺寸时先取 40 字符再取 87400 字符解码头部；WeakMap 缓存每个 source 的统计。
 */
//@ chunk-e6aww6q8.js:2549799-2549836 layout
var IMAGE_HEADER_SNIFF_LONG_CHARS = 87400,
  IMAGE_HEADER_SNIFF_SHORT_CHARS = 40,
  imageStatsCache = new WeakMap();
/**
 * requestContentStats 的异常保护版。
 */
//@ chunk-e6aww6q8.js:2549836-2549938 layout
function safeRequestContentStats(e, n) {
  try {
    return requestContentStats(e, n);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "request content telemetry failed"));
    return;
  }
}
/**
 * 统计请求消息内容：图片数/字节/像素、文档数/字节、文本/思考/工具输入/工具结果字符数。
 */
//@ chunk-e6aww6q8.js:2549938-2551984 layout
function requestContentStats(e, n) {
  let r = bytesPerTokenForModel(n),
    weakMap = new WeakMap(),
    h = (S, w) => {
      switch (w.type) {
        case "image": {
          if (((S.imageBlockCount += 1), !isBase64ImageBlock_3(w))) return S;
          let L = w.source.data,
            G = imageStatsCache.get(w.source);
          if (G?.data !== L) {
            let q =
              parseWebpHeader(Buffer.from(L.slice(0, IMAGE_HEADER_SNIFF_SHORT_CHARS), "base64")) ??
              parseWebpHeader(Buffer.from(L.slice(0, IMAGE_HEADER_SNIFF_LONG_CHARS), "base64"));
            ((G = { data: L, bytes: base64DecodedLength(L), pixels: q ? q.width * q.height : 0 }),
              imageStatsCache.set(w.source, G));
          }
          return ((S.imageTotalBytes += G.bytes), (S.imageTotalPixels += G.pixels), S);
        }
        case "document": {
          S.documentBlockCount += 1;
          let source = w.source;
          if (!isPlainObject_4(source)) return S;
          switch (w.source.type) {
            case "base64":
              if (isBase64ImageBlock_3(w)) S.documentTotalBytes += base64DecodedLength(w.source.data);
              return S;
            case "text":
              if (typeof w.source.data === "string") S.documentTotalBytes += w.source.data.length;
              return S;
            case "content": {
              let content = w.source.content;
              if (typeof content === "string") S.documentTotalBytes += content.length;
              else if (Array.isArray(content))
                S.documentTotalBytes += content.reduce(
                  (q, Z) => q + (Z?.type === "text" && typeof Z.text === "string" ? Z.text.length : 0),
                  0,
                );
              return S;
            }
            default:
              return S;
          }
        }
        case "text":
          return ((S.inputTextCharLength += typeof w.text === "string" ? w.text.length : 0), S);
        case "thinking":
          return ((S.inputTextCharLength += typeof w.thinking === "string" ? w.thinking.length : 0), S);
        case "redacted_thinking":
          return ((S.inputTextCharLength += typeof w.data === "string" ? w.data.length : 0), S);
        case "tool_use":
        case "server_tool_use":
        case "mcp_tool_use":
          return (
            (S.inputTextCharLength +=
              (typeof w.name === "string" ? w.name.length : 0) +
              (getCachedJsonLength(w.input, weakMap) ?? jsonStringify(w.input ?? {}).length)),
            S
          );
        case "tool_result":
        case "mcp_tool_result": {
          let content = w.content;
          if (typeof content === "string") return ((S.inputTextCharLength += content.length), S);
          if (!Array.isArray(content)) return S;
          return content.reduce(y, S);
        }
        default:
          return ((S.inputTextCharLength += jsonStringify(w).length), S);
      }
    },
    y = (S, w) => {
      if (typeof w === "string") return ((S.inputTextCharLength += jsonStringify(w).length), S);
      return bl(w) ? h(S, w) : S;
    };
  return e.reduce(
    (S, w) => {
      let content = w.message.content;
      if (
        ((S.estimatedInputTokens += roughTokenCountEstimationForContent(content, r, weakMap)),
        typeof content === "string")
      )
        return ((S.inputTextCharLength += content.length), S);
      if (!Array.isArray(content)) return S;
      for (let G of content) y(S, G);
      return S;
    },
    {
      imageBlockCount: 0,
      imageTotalPixels: 0,
      imageTotalBytes: 0,
      documentBlockCount: 0,
      documentTotalBytes: 0,
      inputTextCharLength: 0,
      estimatedInputTokens: 0,
    },
  );
}
/**
 * 统计本次新发与重发的图片块数与字节。
 */
//@ chunk-e6aww6q8.js:2551984-2552630 layout
function sentImageStats(e, n) {
  try {
    let r = { imageNewBlockCount: 0, imageNewBytes: 0, imageResentBlockCount: 0, imageResentBytes: 0 },
      lastIndex = e.findLastIndex((h) => h.type === "assistant" && isRealApiResponse(h));
    for (let [h, y] of e.entries()) {
      let content = y.message.content;
      if (h < n || !Array.isArray(content)) continue;
      for (let w of content) {
        let L =
          bl(w) && (w.type === "tool_result" || w.type === "mcp_tool_result") && "content" in w
            ? w.content
            : void 0;
        for (let G of Array.isArray(L) ? L : [w]) {
          if (!bl(G) || G.type !== "image" || !isBase64ImageBlock_3(G)) continue;
          let q = base64DecodedLength(G.source.data);
          if (h < lastIndex) ((r.imageResentBlockCount += 1), (r.imageResentBytes += q));
          else ((r.imageNewBlockCount += 1), (r.imageNewBytes += q));
        }
      }
    }
    return r;
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "sent image telemetry failed"));
    return;
  }
}
/**
 * 遥测用工具名：内置工具原名，MCP 工具归为 mcp_tool，其他为 other。
 */
//@ chunk-e6aww6q8.js:2552630-2552765 layout
function toolNameForTelemetry(e, n) {
  let r = n.get(e);
  if (r === "static") return sanitizeToolNameForAnalytics(e);
  if (r === "mcp") {
    let s = sanitizeToolNameForAnalytics(e);
    return s === e ? lit_2("mcp_tool") : s;
  }
  return lit_2("other");
}
/**
 * 把 [工具类别, 字符数] 列表拼成脱敏 JSON 字符串（遥测元数据）。
 */
//@ chunk-e6aww6q8.js:2552765-2552875 layout
function buildToolSizeJson(e) {
  return concatSafe(
    lit_2("{"),
    ...e.flatMap(([n, r], s) => [...(s > 0 ? [lit_2(",")] : []), lit_2('"'), n, lit_2('":'), fromNumber(r)]),
    lit_2("}"),
  );
}
/**
 * system 字符数、工具 schema 字符数、工具数、延迟工具数与 schema 哈希（请求前缀遥测）。
 */
//@ chunk-e6aww6q8.js:2552875-2553413 layout
function requestPrefixStats(e, n, r) {
  try {
    let s = 0;
    for (let G of e) s += G.text.length;
    let h = 0,
      y = 0,
      S = new Map();
    for (let G of n) {
      if ("defer_loading" in G && G.defer_loading === !0) {
        y += 1;
        continue;
      }
      let q = jsonStringifyRaw(G).length;
      h += q;
      let Z = "name" in G && typeof G.name === "string" ? toolNameForTelemetry(G.name, r) : lit_2("other");
      S.set(Z, (S.get(Z) ?? 0) + q);
    }
    let sorted = [...S.entries()].sort(([G], [q]) => (G < q ? -1 : G > q ? 1 : 0)),
      L = buildToolSizeJson(sorted);
    return {
      systemCharLength: s,
      toolsCharLength: h,
      toolsCount: n.length,
      deferredToolsCount: y,
      toolSchemasHash: gn(L),
      toolSchemaCharLengths: L,
    };
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "request prefix telemetry failed"));
    return;
  }
}
/**
 * 512：tengu_tool_schema_sizes 去重集合及其上限。
 */
//@ chunk-e6aww6q8.js:2553413-2553448 layout
var loggedToolSchemaKeys = new HostScoped(() => new Set()),
  MAX_LOGGED_TOOL_SCHEMA_KEYS = 512;
/**
 * 记 tengu_api_success：模型、usage、耗时（含重试）、TTFT、首内容时间、stop_reason、成本、是否回退非流式、网关等；必要时记工具 schema 大小。
 */
//@ chunk-e6aww6q8.js:2553448-2557974 fingerprint = logAPISuccess (0.505)
function logAPISuccess({
  model: model,
  preNormalizedModel: preNormalizedModel,
  messageCount: messageCount,
  messageTokens: messageTokens,
  usage: usage,
  durationMs: durationMs,
  durationMsIncludingRetries: durationMsIncludingRetries,
  attempt: attempt,
  ttftMs: ttftMs,
  firstContentMs: firstContentMs,
  streamEventCount: streamEventCount,
  queryOverheadMs: queryOverheadMs,
  requestId: requestId,
  clientRequestId: clientRequestId,
  firstAttemptRequestId: firstAttemptRequestId,
  stopReason: stopReason,
  costUSD: costUSD,
  didFallBackToNonStreaming: didFallBackToNonStreaming,
  querySource: querySource,
  messageClientPlatform: messageClientPlatform,
  gateway: gateway,
  extraEventFields: extraEventFields,
  queryTracking: queryTracking,
  permissionMode: permissionMode,
  proactivityLevel: proactivityLevel,
  globalCacheStrategy: globalCacheStrategy,
  promptCacheTtl: promptCacheTtl,
  promptCacheMessagesTtl: promptCacheMessagesTtl,
  textContentLength: textContentLength,
  thinkingContentLength: thinkingContentLength,
  narrationBlockCount: narrationBlockCount,
  toolUseContentLengths: toolUseContentLengths,
  requestContentTelemetry: requestContentTelemetry,
  sentBody: sentBody,
  requestPrefixTelemetry: requestPrefixTelemetry,
  requestBodyCompression: requestBodyCompression,
  fastMode: fastMode,
  previousRequestId: previousRequestId,
  betas: betas,
  thinkingPrefixMismatchBehavior: thinkingPrefixMismatchBehavior,
  echoWireToolInputs: echoWireToolInputs,
  effort: effort,
  turnOrigin: turnOrigin,
  isDefaultModel: isDefaultModel,
  defaultModel: defaultModel,
  isDefaultEffort: isDefaultEffort,
  defaultEffortLevel: defaultEffortLevel,
  carriedEffort: carriedEffort,
  carriedEffortEnded: carriedEffortEnded,
  attribution: attribution,
  agentContext: agentContext,
  isLowPriority: isLowPriority,
  tenderQuiltHeader: tenderQuiltHeader,
  dispatch: dispatch,
  uncoveredTail: uncoveredTail,
}) {
  (resetAuthFailureTracking(), H7r());
  let isNonInteractiveSession = getIsNonInteractiveSession(),
    isPostCompaction = consumePostCompaction(),
    hasPrintFlag = eagerHasCliFlag("-p") || eagerHasCliFlag("--print"),
    of = loggedToolSchemaKeys.of(getRootSession().host),
    now = Date.now(),
    lastCompletion = getLastApiCompletionTimestamp(),
    timeSinceLastApiCallMs = lastCompletion !== null ? Math.max(0, Math.round(now - lastCompletion)) : void 0,
    jr = consumeInvokingRequestId(agentContext),
    Or = Cun(querySource, isMainAgent(agentContext));
  if (
    (onMainRequestLogged({ isMainLoop: Or, now: now }),
    nEe(usage, Or),
    logEvent("tengu_api_success", {
      model: telemetrySafeModelName(model),
      ...(isLowPriority && { is_low_priority: !0 }),
      dispatch: dispatch ?? lit_2("none"),
      ...(tenderQuiltHeader && { tender_quilt_header: !0, arm_source: fromEnum(getFallbackLatchKind()) }),
      ...(preNormalizedModel !== model && { preNormalizedModel: telemetrySafeModelName(preNormalizedModel) }),
      ...(betas?.length && { betas: hashToolNames(betas) }),
      thinkingPrefixMismatchBehavior: fromEnumOpt(thinkingPrefixMismatchBehavior),
      ...(echoWireToolInputs !== void 0 && { echoWireToolInputs: echoWireToolInputs }),
      messageCount: messageCount,
      messageTokens: messageTokens,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cachedInputTokens: usage.cache_read_input_tokens ?? 0,
      uncachedInputTokens: usage.cache_creation_input_tokens ?? 0,
      cache_creation_5m_input_tokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
      cache_creation_1h_input_tokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
      ...(uncoveredTail && uncoveredTailFields(uncoveredTail, usage)),
      durationMs: durationMs,
      durationMsIncludingRetries: durationMsIncludingRetries,
      attempt: attempt,
      ttftMs: ttftMs ?? void 0,
      firstContentMs: firstContentMs ?? void 0,
      streamEventCount: streamEventCount,
      queryOverheadMs: queryOverheadMs,
      buildAgeMins: getBuildAgeMinutes(),
      provider: getAPIProviderForAnalytics(),
      requestId: ye(requestId) ?? void 0,
      clientRequestId: ye(clientRequestId) || void 0,
      user_message_uuid: ye(turnAttributionKeyFor(agentContext)),
      ...(firstAttemptRequestId &&
        requestId &&
        firstAttemptRequestId !== requestId && { firstAttemptRequestId: ye(firstAttemptRequestId) }),
      ...(jr && {
        invokingRequestId: ye(jr.invokingRequestId),
        invocationKind: fromEnumOpt(jr.invocationKind),
      }),
      stop_reason: fromEnumOpt(stopReason) ?? void 0,
      ...(effort && { effort_level: fromEnum(effort) }),
      ...(turnOrigin && { turn_origin: fromEnum(turnOrigin) }),
      ...(isDefaultModel !== void 0 && { is_default_model: isDefaultModel }),
      ...(defaultModel !== void 0 && { default_model: telemetrySafeModelName(defaultModel) }),
      ...(isDefaultEffort !== void 0 && { is_default_effort: isDefaultEffort }),
      ...(defaultEffortLevel !== void 0 && { default_effort_level: fromEnum(defaultEffortLevel) }),
      ...(carriedEffort !== void 0 && {
        carried_effort_level: fromEnum(carriedEffort.level),
        carried_effort_outcome: fromEnum(carriedEffort.outcome),
      }),
      ...(carriedEffortEnded !== void 0 && { carried_effort_ended: fromEnum(carriedEffortEnded) }),
      costUSD: costUSD,
      didFallBackToNonStreaming: didFallBackToNonStreaming,
      isNonInteractiveSession: isNonInteractiveSession,
      ...(!isDiskless() && { print: hasPrintFlag, isTTY: process.stdout.isTTY ?? !1 }),
      querySource: agentTypeForTelemetry(querySource),
      ...(messageClientPlatform && { messageClientPlatform: yW(messageClientPlatform) }),
      ...(gateway && { gateway: fromEnum(gateway) }),
      ...extraEventFields,
      ...(queryTracking && { queryChainId: ye(queryTracking.chainId), queryDepth: queryTracking.depth }),
      permissionMode: fromEnumOpt(permissionMode),
      proactivityLevel: fromEnumOpt(proactivityLevel),
      ...(globalCacheStrategy && { globalCacheStrategy: fromEnum(globalCacheStrategy) }),
      ...(promptCacheTtl && {
        prompt_cache_ttl: fromEnum(promptCacheTtl.ttl),
        prompt_cache_ttl_reason: fromEnum(promptCacheTtl.reason),
      }),
      ...(promptCacheMessagesTtl && { prompt_cache_messages_ttl: fromEnum(promptCacheMessagesTtl) }),
      ...(textContentLength !== void 0 && { textContentLength: textContentLength }),
      ...(thinkingContentLength !== void 0 && { thinkingContentLength: thinkingContentLength }),
      ...(narrationBlockCount !== void 0 && { narrationBlockCount: narrationBlockCount }),
      ...(toolUseContentLengths !== void 0 && { toolUseContentLengths: toolUseContentLengths }),
      ...(requestContentTelemetry && {
        imageBlockCount: requestContentTelemetry.imageBlockCount,
        imageTotalPixels: requestContentTelemetry.imageTotalPixels,
        imageTotalBytes: requestContentTelemetry.imageTotalBytes,
        documentBlockCount: requestContentTelemetry.documentBlockCount,
        documentTotalBytes: requestContentTelemetry.documentTotalBytes,
        inputTextCharLength: requestContentTelemetry.inputTextCharLength,
        estimatedInputTokens: requestContentTelemetry.estimatedInputTokens,
      }),
      ...(sentBody && {
        imageNewBlockCount: sentBody.imageNewBlockCount,
        imageNewBytes: sentBody.imageNewBytes,
        imageResentBlockCount: sentBody.imageResentBlockCount,
        imageResentBytes: sentBody.imageResentBytes,
        sentThreadType: fromEnum(sentBody.threadType),
      }),
      ...(requestPrefixTelemetry && {
        systemCharLength: requestPrefixTelemetry.systemCharLength,
        systemPromptSource: requestPrefixTelemetry.systemPromptSource,
        snapshotHash: requestPrefixTelemetry.snapshotHash,
        toolsCharLength: requestPrefixTelemetry.toolsCharLength,
        toolsCount: requestPrefixTelemetry.toolsCount,
        deferredToolsCount: requestPrefixTelemetry.deferredToolsCount,
        toolSchemasHash: requestPrefixTelemetry.toolSchemasHash,
      }),
      ...gzipTelemetryFields(requestBodyCompression),
      fastMode: fastMode,
      ...(previousRequestId && { previousRequestId: ye(previousRequestId) }),
      ...(isPostCompaction && { isPostCompaction: isPostCompaction }),
      ...(attribution && redactAttribution(querySource, attribution)),
      ...(attribution?.attributionSkill && { _PROTO_skill_name: attribution.attributionSkill }),
      ...getAnthropicEnvMetadata(),
      timeSinceLastApiCallMs: timeSinceLastApiCallMs,
    }),
    requestPrefixTelemetry && !of.has(requestPrefixTelemetry.toolSchemasHash))
  ) {
    if (of.size >= MAX_LOGGED_TOOL_SCHEMA_KEYS) of.clear();
    (of.add(requestPrefixTelemetry.toolSchemasHash),
      logEvent("tengu_tool_schema_sizes", {
        toolSchemasHash: requestPrefixTelemetry.toolSchemasHash,
        toolSchemaCharLengths: requestPrefixTelemetry.toolSchemaCharLengths,
        toolsCharLength: requestPrefixTelemetry.toolsCharLength,
        toolsCount: requestPrefixTelemetry.toolsCount,
        deferredToolsCount: requestPrefixTelemetry.deferredToolsCount,
      }));
  }
  setLastApiCompletionTimestamp(now);
}
/**
 * 响应完成后汇总：统计输出文本/思考/工具输入长度，识别网关，累加 API 时长，调用 logAPISuccess。
 */
//@ chunk-e6aww6q8.js:2557974-2562306 fingerprint = logAPISuccessAndDuration (0.59)
function logAPISuccessAndDuration({
  model: model,
  preNormalizedModel: preNormalizedModel,
  start: start,
  startIncludingRetries: startIncludingRetries,
  ttftMs: ttftMs,
  firstContentMs: firstContentMs,
  streamEventCount: streamEventCount,
  queryOverheadMs: queryOverheadMs,
  usage: usage,
  attempt: attempt,
  messageCount: messageCount,
  messageTokens: messageTokens,
  requestId: requestId,
  rawRequestBodyId: rawRequestBodyId,
  accountMemoryKeys: accountMemoryKeys,
  clientRequestId: clientRequestId,
  firstAttemptRequestId: firstAttemptRequestId,
  stopReason: stopReason,
  didFallBackToNonStreaming: didFallBackToNonStreaming,
  querySource: querySource,
  messageClientPlatform: messageClientPlatform,
  headers: headers,
  extraEventFields: extraEventFields,
  costUSD: costUSD,
  queryTracking: queryTracking,
  permissionMode: permissionMode,
  proactivityLevel: proactivityLevel,
  newMessages: newMessages,
  requestContentTelemetry: requestContentTelemetry,
  sentBody: sentBody,
  requestPrefixTelemetry: requestPrefixTelemetry,
  llmSpan: llmSpan,
  globalCacheStrategy: globalCacheStrategy,
  promptCacheTtl: promptCacheTtl,
  promptCacheMessagesTtl: promptCacheMessagesTtl,
  requestSetupMs: requestSetupMs,
  attemptStartTimes: attemptStartTimes,
  fastMode: fastMode,
  previousRequestId: previousRequestId,
  betas: betas,
  thinkingPrefixMismatchBehavior: thinkingPrefixMismatchBehavior,
  echoWireToolInputs: echoWireToolInputs,
  effort: effort,
  turnOrigin: turnOrigin,
  isDefaultModel: isDefaultModel,
  defaultModel: defaultModel,
  isDefaultEffort: isDefaultEffort,
  defaultEffortLevel: defaultEffortLevel,
  carriedEffort: carriedEffort,
  carriedEffortEnded: carriedEffortEnded,
  attribution: attribution,
  modelCallNames: modelCallNames,
  agentContext: agentContext,
  isLowPriority: isLowPriority,
  dispatch: dispatch,
  uncoveredTail: uncoveredTail,
}) {
  Qos(headers?.get?.(TUNNEL_CREDENTIAL_EPOCH_HEADER));
  let gateway = detectGateway({ headers: headers, baseUrl: getCustomApiBaseUrl() });
  if (gateway !== void 0) noteObservedGateway(gateway);
  let cs, _r, Cr, Vr;
  if (newMessages)
    try {
      let fs = 0,
        as = 0,
        Vi = !1,
        ji = 0,
        Wi = new Map();
      for (let msg of newMessages)
        for (let block of msg.message.content)
          if (block.type === "text") fs += block.text?.length ?? 0;
          else if (block.type === "thinking") {
            if (((as += block.thinking?.length ?? 0), (Vi = !0), isNarrationThinking(block))) ji++;
          } else if (block.type === "redacted_thinking") Vi = !0;
          else if (
            block.type === "tool_use" ||
            block.type === "server_tool_use" ||
            block.type === "mcp_tool_use"
          ) {
            let inputLen = jsonStringify(block.input ?? {}).length,
              mi =
                block.type === "mcp_tool_use"
                  ? lit_2("mcp_tool")
                  : block.name.startsWith(SKILL_2)
                    ? lit_2("skill_tool")
                    : sanitizeToolNameForAnalytics(block.name);
            Wi.set(mi, (Wi.get(mi) ?? 0) + inputLen);
          }
      ((cs = fs), (_r = Vi ? as : void 0), (Cr = ji), (Vr = Wi.size > 0 ? hashEntries(Wi) : void 0));
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "response content telemetry failed"));
    }
  let max = Math.max(0, Math.round(performance.now() - start)),
    max_2 = Math.max(0, Math.round(performance.now() - startIncludingRetries));
  (addToTotalDurationState(max_2, max),
    logAPISuccess({
      model: model,
      preNormalizedModel: preNormalizedModel,
      messageCount: messageCount,
      messageTokens: messageTokens,
      usage: usage,
      durationMs: max,
      durationMsIncludingRetries: max_2,
      attempt: attempt,
      ttftMs: ttftMs,
      firstContentMs: firstContentMs,
      streamEventCount: streamEventCount,
      queryOverheadMs: queryOverheadMs,
      requestId: requestId,
      clientRequestId: didFallBackToNonStreaming ? void 0 : clientRequestId,
      firstAttemptRequestId: firstAttemptRequestId,
      stopReason: stopReason,
      costUSD: costUSD,
      didFallBackToNonStreaming: didFallBackToNonStreaming,
      querySource: querySource,
      messageClientPlatform: messageClientPlatform,
      gateway: gateway,
      extraEventFields: extraEventFields,
      queryTracking: queryTracking,
      permissionMode: permissionMode,
      proactivityLevel: proactivityLevel,
      globalCacheStrategy: globalCacheStrategy,
      promptCacheTtl: promptCacheTtl,
      promptCacheMessagesTtl: promptCacheMessagesTtl,
      textContentLength: cs,
      thinkingContentLength: _r,
      narrationBlockCount: Cr,
      toolUseContentLengths: Vr,
      requestContentTelemetry: requestContentTelemetry,
      sentBody: sentBody,
      requestPrefixTelemetry: requestPrefixTelemetry,
      requestBodyCompression: takeGzipTelemetry(clientRequestId),
      fastMode: fastMode,
      previousRequestId: previousRequestId,
      betas: betas,
      thinkingPrefixMismatchBehavior: thinkingPrefixMismatchBehavior,
      echoWireToolInputs: echoWireToolInputs,
      effort: effort,
      turnOrigin: turnOrigin,
      isDefaultModel: isDefaultModel,
      defaultModel: defaultModel,
      isDefaultEffort: isDefaultEffort,
      defaultEffortLevel: defaultEffortLevel,
      carriedEffort: carriedEffort,
      carriedEffortEnded: carriedEffortEnded,
      attribution: attribution,
      agentContext: agentContext,
      isLowPriority: isLowPriority,
      tenderQuiltHeader: headers?.get(X_CC_TENDER_QUILT) === "1",
      dispatch: dispatch,
      uncoveredTail: uncoveredTail,
    }));
  let Or = Number.isFinite(costUSD) ? costUSD : 0,
    Io = apiSuccessFields(
      {
        model: model,
        usage: usage,
        costUSD: Or,
        durationMs: max,
        ttftMs: ttftMs,
        requestId: requestId,
        clientRequestId: didFallBackToNonStreaming ? void 0 : clientRequestId,
        fastMode: fastMode,
        querySource: querySource,
        effort: effort,
      },
      {},
    );
  logOTelEvent(
    "api_request",
    { ...Io, ...(attribution && attributionForLog(querySource, attribution)), ...modelCallNames },
    agentContext,
  );
  let zo = (fs) => redactAccountMemoryText(accountMemoryKeys, querySource, fs);
  if (newMessages) {
    let joined = newMessages.flatMap((as) =>
      as.message.content.filter((Vi) => Vi.type === "text").map((Vi) => Vi.text),
    ).join(`
`);
    if (joined)
      logOTelEvent(
        "assistant_response",
        {
          response_length: joined.length,
          response: isAssistantResponseLoggingEnabled()
            ? truncateContentForTelemetry(zo(joined)).content
            : "<REDACTED>",
          request_id: requestId ?? void 0,
          "message.uuid": newMessages.at(-1)?.uuid,
          model: model,
          query_source: normalizeAgentQuerySource(querySource),
        },
        agentContext,
      );
    writeOtelResponseBody(newMessages, {
      model: model,
      querySource: querySource,
      requestId: requestId,
      requestBodyId: rawRequestBodyId,
      accountMemoryKeys: accountMemoryKeys,
      agentContext: agentContext,
    });
  }
  let rs, Es, Nr;
  if (isBetaTracingEnabled() && newMessages)
    ((rs =
      newMessages.flatMap((fs) => fs.message.content.filter((as) => as.type === "text").map((as) => as.text))
        .join(`
`) || void 0),
      (Nr = newMessages.some((fs) => fs.message.content.some((as) => as.type === "tool_use"))));
  endLLMRequestSpan(llmSpan, {
    success: !0,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens,
    attempt: attempt,
    modelOutput: rs,
    thinkingOutput: Es,
    accountMemoryKeys: accountMemoryKeys,
    querySource: querySource,
    hasToolCall: Nr,
    requestId: requestId ?? void 0,
    clientRequestId: clientRequestId,
    stopReason: stopReason ?? void 0,
    effort: effort,
    ttftMs: ttftMs ?? void 0,
    firstContentMs: firstContentMs ?? void 0,
    requestSetupMs: requestSetupMs,
    attemptStartTimes: attemptStartTimes,
    traceresponse: didFallBackToNonStreaming ? void 0 : (headers?.get("traceresponse") ?? void 0),
  });
  let teleportInfo = getTeleportedSessionInfo();
  if (teleportInfo?.isTeleported && !teleportInfo.hasLoggedFirstMessage)
    (logEvent("tengu_teleport_first_message_success", { session_id: ye(teleportInfo.sessionId) }),
      markFirstTeleportMessageLogged());
}

export {
  logAPIQuery,
  logApiRefusal,
  logAPIError,
  safeRequestContentStats,
  sentImageStats,
  requestPrefixStats,
  logAPISuccessAndDuration,
  yW,
  GATEWAY_FINGERPRINT_ENTRIES,
  detectGateway,
  GATEWAY_FINGERPRINTS,
  apiErrorFields,
  apiErrorText,
  nEe,
  apiSuccessFields,
};

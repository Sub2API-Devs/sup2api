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
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  redactAccountMemoryText,
  accountMemoryRedactionKeys,
} from "../../utils/telemetry/accountMemoryRedaction.js";
import { normalizeAgentQuerySource, classifyQuerySource } from "./requestHeaders.js";
import { hashOrRedactUrl, hashToolNames, hashEntries } from "../../utils/model/modelCatalog/maskedIds.js";
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import {
  isRequestTooLargeError_2,
  alwaysFalseErrors,
  classifyAPIError,
  DLP_REQUEST_DENIED,
  CLAUDE_CODE_VERSION_TOO_OLD,
} from "./errors.js";
import { emitEpochFromHeader, TUNNEL_CREDENTIAL_EPOCH_HEADER } from "../../utils/auth/credentialEpoch.js";
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
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { getCachedJsonLength, roughTokenCountEstimationForContent } from "../tokenEstimation.js";
import { jsonStringify, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { isRealApiResponse } from "./claude.js";
import { shortHash } from "../../utils/shortHash.js";
import { resetAuthFailureTracking } from "../../utils/auth.js";
import { emitPrefetchChanged } from "../policyLimits/prefetchToggle.js";
import { eagerHasCliFlag } from "../../utils/cliArgs.js";
import { onMainRequestLogged } from "./cacheKeepalive.js";
import { getFallbackLatchKind, X_CC_TENDER_QUILT } from "./refusalFallbackHeaders.js";
import { isNarrationThinking } from "./narrationClassifier.js";
import { SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { writeOtelResponseBody } from "../../utils/telemetry/otelRawBodies.js";
import { isBetaTracingEnabled } from "../../utils/telemetry/betaSessionTracing.js";

//@ chunk-e6aww6q8.js:1559771-1560221 fingerprint = GATEWAY_FINGERPRINTS (0.715)
/**
 * 已知 LLM 网关指纹：litellm、helicone、portkey、cloudflare-ai-gateway、kong、braintrust、bifrost（按响应头前缀）、databricks（按 host 后缀）。
 */
var GATEWAY_FINGERPRINTS = {
  litellm: {
    headerPrefixes: ["x-litellm-"],
    versionHeader: "x-litellm-version",
  },
  helicone: {
    headerPrefixes: ["helicone-"],
  },
  portkey: {
    headerPrefixes: ["x-portkey-"],
  },
  "cloudflare-ai-gateway": {
    headerPrefixes: ["cf-aig-"],
  },
  kong: {
    headerPrefixes: ["x-kong-"],
  },
  braintrust: {
    headerPrefixes: ["x-bt-"],
  },
  bifrost: {
    headerPrefixes: ["x-bifrost-"],
  },
  databricks: {
    hostSuffixes: [".cloud.databricks.com", ".azuredatabricks.net", ".gcp.databricks.com"],
  },
};
var GATEWAY_FINGERPRINT_ENTRIES = Object.entries(GATEWAY_FINGERPRINTS);
//@ chunk-e6aww6q8.js:1560221-1560527 affinity
/**
 * 按响应头前缀或 base URL 主机后缀识别中间网关名，写进 API 成功/失败事件。
 */
function detectGateway({ headers, baseUrl }) {
  if (headers) {
    let r = [];
    headers.forEach((header, h) => r.push(h));
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
//@ chunk-e6aww6q8.js:2539755-2540118 placement
/**
 * 已知的请求入口（entrypoint）名单，未列出的按 unknown 处理。
 */
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
/**
 * 导出函数 `entrypointForTelemetry`：参数 e，返回 fromEnumOpt(found) ?? lit_2("other")。
 */
function entrypointForTelemetry(messageClientPlatform) {
  let found = KNOWN_ENTRYPOINTS.find((r) => r === messageClientPlatform);
  return fromEnumOpt(found) ?? lit_2("other");
}
//@ chunk-e6aww6q8.js:2540185-2540288 placement = _temp9 (0.529)
function emptyUsageCounters() {
  return {
    inputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    outputTokens: 0,
    requests: 0,
  };
}
//@ chunk-e6aww6q8.js:2540288-2540322 placement
var MAX_TRACKED_MAPS = 32;
var usageMapsByHost = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:2540322-2540396 placement
function isMainThreadQueryLogging(querySource, n) {
  return n && (querySource.startsWith("repl_main_thread") || querySource === "sdk");
}
//@ chunk-e6aww6q8.js:2540396-2540588 placement
function sessionUsageTotals(e) {
  let n = usageMapsByHost.of(e ?? getRootSession().host);
  let sessionId = getSessionId();
  let s = n.get(sessionId);
  if (s === undefined) {
    s = {
      all: emptyUsageCounters(),
      main: emptyUsageCounters(),
    };
    for (let key of n.keys()) {
      if (n.size < MAX_TRACKED_MAPS) break;
      n.delete(key);
    }
  } else n.delete(sessionId);
  n.set(sessionId, s);
  return s;
}
//@ chunk-e6aww6q8.js:2540588-2540665 placement
function addUsageToSession(usage, n, r) {
  try {
    let s = sessionUsageTotals(r);
    addUsage(s.all, usage);
    if (n) addUsage(s.main, usage);
  } catch {}
}
//@ chunk-e6aww6q8.js:2540665-2540877 placement
function addUsage(e, n) {
  e.inputTokens += finiteOrZero(n.input_tokens);
  e.cacheCreationTokens += finiteOrZero(n.cache_creation_input_tokens);
  e.cacheReadTokens += finiteOrZero(n.cache_read_input_tokens);
  e.outputTokens += finiteOrZero(n.output_tokens);
  e.requests += 1;
}
//@ chunk-e6aww6q8.js:2540877-2540944 placement
function finiteOrZero(e) {
  return typeof e === "number" && Number.isFinite(e) ? e : 0;
}
//@ chunk-e6aww6q8.js:2540944-2541063 placement
var EXCUSED_TAIL_REASONS = new Set([
  "none",
  "sent_once_text",
  "sent_once_oversized",
  "sent_once_mislabeled",
  "request_scoped_user",
]);
var MIN_EXCESS_TOKENS = 4096;
//@ chunk-e6aww6q8.js:2541063-2541674 placement
/**
 * 计算未被缓存覆盖的尾部字段：原因、标记后的消息数、重发/单次发送/无理由的尾部 token 估计，以及普通输入超出量。
 */
function uncoveredTailFields(audit, usage) {
  let r = !Array.isArray(usage.iterations) || usage.iterations.length <= 1;
  let tokenCountFromUsage = getTokenCountFromUsage_5(usage);
  let h =
    tokenCountFromUsage.input_tokens +
    tokenCountFromUsage.cache_read_input_tokens +
    tokenCountFromUsage.cache_creation_input_tokens;
  let y =
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
      EXCUSED_TAIL_REASONS.has(audit.reason) && {
        plainInputExcessTokens: Math.max(0, tokenCountFromUsage.input_tokens - y),
      }),
  };
}
//@ chunk-e6aww6q8.js:2541674-2541686 placement
/**
 * 费用以微美元记录（cost_usd_micros）的换算系数 1e6。
 */
var MICRO_USD_PER_USD = 1e6;
//@ chunk-e6aww6q8.js:2541686-2541833 placement
function getErrorMessage(error) {
  if (error instanceof APIError) {
    let body = error.error?.error?.message;
    if (typeof body === "string" && body) return body;
  }
  return error instanceof Error ? error.message : String(error);
}
//@ chunk-e6aww6q8.js:2541833-2541954 placement
function apiErrorText({ error, errorClass, querySource, accountMemoryKeys }) {
  return isDiskless()
    ? errorClass
    : redactAccountMemoryText(
        accountMemoryKeys ?? (() => accountMemoryRedactionKeys(getRootSession().host)),
        querySource,
        getErrorMessage(error),
      );
}
//@ chunk-e6aww6q8.js:2541954-2541990 placement
var finiteCost = (costUSD) => (Number.isFinite(costUSD) ? costUSD : 0);
//@ chunk-e6aww6q8.js:2541990-2542644 placement
/**
 * 构造 API 成功日志字段：模型、各类 token、费用（美元与微美元）、耗时、首 token 时间、请求 id、速度、查询来源与 effort。
 */
function apiSuccessFields(
  { model, usage, costUSD, durationMs, ttftMs, requestId, clientRequestId, fastMode, querySource, effort },
  extraFields,
) {
  let costUsd = finiteCost(costUSD);
  return {
    model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_input_tokens ?? 0,
    cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_creation_5m_tokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    cache_creation_1h_tokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    cost_usd: costUsd,
    cost_usd_micros: Math.round(costUsd * MICRO_USD_PER_USD),
    ...extraFields,
    duration_ms: durationMs,
    ...(ttftMs !== null && {
      ttft_ms: ttftMs,
    }),
    request_id: requestId ?? undefined,
    client_request_id: clientRequestId,
    speed: fastMode ? "fast" : "normal",
    query_source: normalizeAgentQuerySource(querySource),
    ...(effort && {
      effort,
    }),
  };
}
//@ chunk-e6aww6q8.js:2542644-2542969 placement
/**
 * 构造 API 错误日志字段：模型、错误、状态码、耗时、尝试次数、请求 id、速度、查询来源与 effort。
 */
function apiErrorFields({
  model,
  error,
  status,
  durationMs,
  attempt,
  requestId,
  clientRequestId,
  fastMode,
  querySource,
  effort,
}) {
  let q = normalizeAgentQuerySource(querySource);
  return {
    model,
    error,
    ...(status !== undefined && {
      status_code: status,
    }),
    duration_ms: durationMs,
    attempt,
    request_id: requestId ?? undefined,
    client_request_id: clientRequestId,
    speed: fastMode ? "fast" : "normal",
    ...(q && {
      query_source: q,
    }),
    ...(effort && {
      effort,
    }),
  };
}
//@ chunk-e6aww6q8.js:2542969-2543033 layout
/**
 * 非受限环境下返回 ANTHROPIC_BASE_URL（供网关识别与遥测）。
 */
function getCustomApiBaseUrl() {
  return isDiskless() ? undefined : process.env.ANTHROPIC_BASE_URL;
}
//@ chunk-e6aww6q8.js:2543033-2543272 fingerprint = getAnthropicEnvMetadata (0.926)
/**
 * 遥测用环境元数据：baseUrl、ANTHROPIC_MODEL、ANTHROPIC_SMALL_FAST_MODEL。
 */
function getAnthropicEnvMetadata() {
  let customApiBaseUrl = getCustomApiBaseUrl();
  return {
    ...(customApiBaseUrl && {
      baseUrl: hashOrRedactUrl(customApiBaseUrl),
    }),
    ...(process.env.ANTHROPIC_MODEL && {
      envModel: telemetrySafeModelName(process.env.ANTHROPIC_MODEL),
    }),
    ...(process.env.ANTHROPIC_SMALL_FAST_MODEL && {
      envSmallFastModel: telemetrySafeModelName(process.env.ANTHROPIC_SMALL_FAST_MODEL),
    }),
  };
}
//@ chunk-e6aww6q8.js:2543272-2544363 callgraph-witnessed = getBuildAgeMinutes (0.151)
/**
 * 距构建时间（BUILD_TIME 2026-10-30T23:28:13Z）的分钟数。
 */
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
//@ chunk-e6aww6q8.js:2544363-2545020 fingerprint = logAPIQuery (0.921)
/**
 * 发请求前记 tengu_api_query：模型、消息数、temperature、betas、权限模式、querySource、thinking 类型、effort、fast mode、前一个 request id。
 */
function logAPIQuery({
  model,
  messagesLength,
  temperature,
  betas,
  permissionMode,
  proactivityLevel,
  querySource,
  messageClientPlatform,
  queryTracking,
  thinkingType,
  thinkingPrefixMismatchBehavior,
  effortValue,
  fastMode,
  previousRequestId,
}) {
  logEvent("tengu_api_query", {
    model: telemetrySafeModelName(model),
    messagesLength,
    temperature,
    provider: getAPIProviderForAnalytics(),
    buildAgeMins: getBuildAgeMinutes(),
    ...(betas?.length && {
      betas: hashToolNames(betas),
    }),
    permissionMode: fromEnumOpt(permissionMode),
    proactivityLevel: fromEnumOpt(proactivityLevel),
    querySource: agentTypeForTelemetry(querySource),
    ...(messageClientPlatform && {
      messageClientPlatform: entrypointForTelemetry(messageClientPlatform),
    }),
    ...(queryTracking && {
      queryChainId: sanitizeMarkName(queryTracking.chainId),
      queryDepth: queryTracking.depth,
    }),
    thinkingType: fromEnumOpt(thinkingType),
    thinkingPrefixMismatchBehavior: fromEnumOpt(thinkingPrefixMismatchBehavior),
    effortValue: fromEnumOpt(effortValue),
    fastMode,
    ...(previousRequestId && {
      previousRequestId: sanitizeMarkName(previousRequestId),
    }),
    ...getAnthropicEnvMetadata(),
  });
}
//@ chunk-e6aww6q8.js:2545020-2549172 fingerprint = logAPIError (0.492)
/**
 * 记 API 失败：tengu_api_error（错误类型、状态、耗时、重试次数、request id、是否回退非流式、网关等），并做相关诊断。
 */
function logAPIError({
  error,
  model,
  messageCount,
  messageTokens,
  durationMs,
  durationMsIncludingRetries,
  attempt,
  requestId,
  clientRequestId,
  didFallBackToNonStreaming,
  nonStreamingFallbackSkipped,
  observedResponse,
  queryTracking,
  querySource,
  accountMemoryKeys,
  messageClientPlatform,
  llmSpan,
  fastMode,
  previousRequestId,
  effort,
  attribution,
  modelCallNames,
  promptTooLongIsHandled,
  agentContext,
  isLowPriority,
  dispatch,
}) {
  if (isRequestTooLargeError_2(error) || alwaysFalseErrors(error)) addSafetyStop();
  let headers = error instanceof APIError && error.headers ? error.headers : observedResponse?.headers;
  emitEpochFromHeader(headers?.get?.(TUNNEL_CREDENTIAL_EPOCH_HEADER));
  let gt = didFallBackToNonStreaming ? undefined : clientRequestId;
  let gateway = getErrorMessage(error);
  let status = error instanceof APIError ? error.status : undefined;
  let errStr = fromNumberOpt(status);
  let qt = classifyAPIError(error);
  let Zt = normalizeAgentQuerySource(querySource);
  if (qt === "stored_login_refused" && classifyQuerySource(querySource) === "main")
    logFeatureBad("managed_settings_stored_login_refused", "helper_not_in_force");
  let rn = promptTooLongIsHandled && qt === "prompt_too_long";
  let connectionErrorDetails = extractConnectionErrorDetails(error);
  if (connectionErrorDetails) {
    let sslLabel = connectionErrorDetails.isSSLError ? " (SSL error)" : "";
    logForDebugging(
      `Connection error details: code=${connectionErrorDetails.code}${sslLabel}, message=${connectionErrorDetails.message}`,
      {
        level: "error",
      },
    );
  }
  let no = rn ? undefined : consumeInvokingRequestId(agentContext);
  if (clientRequestId)
    logForDebugging(
      `API error x-client-request-id=${clientRequestId} (give this to the API team for server-log lookup)`,
      {
        level: "error",
      },
    );
  if (!rn) {
    logForDiagnosticsNoPII("error", "cli_api_error", () => ({
      ...classifyApiErrorKind(error, qt, observedResponse),
      attempt,
      duration_ms: durationMs,
      duration_ms_including_retries: durationMsIncludingRetries,
      did_fallback_to_non_streaming: didFallBackToNonStreaming ?? false,
      client_request_id: sanitizeMarkName(gt) ?? null,
      model: telemetrySafeModelName(model) ?? null,
      query_source: Zt ?? null,
      route: connectionSetupFacts(),
    }));
    if (
      qt === "connection_error" ||
      qt === "server_overload" ||
      qt === "api_timeout" ||
      qt === "stream_idle_timeout" ||
      qt === "rate_limit" ||
      qt === "no_api_attempts_left"
    )
      logForDebugging(`API ${qt} after retries: ${gateway}`, {
        level: "error",
      });
    else if (qt === "model_not_found")
      logForDebugging(`API model not found: ${gateway}`, {
        level: "error",
      });
    else if (qt === "invalid_api_key" || qt === "invalid_request_header")
      logForDebugging(`API ${qt}: ${gateway}`, {
        level: "error",
      });
    else if (qt === "output_content_filtered")
      logForDebugging(`API output_content_filtered: ${gateway}`, {
        level: "error",
      });
    else if (qt === DLP_REQUEST_DENIED)
      logForDebugging(`API ${qt}: ${gateway}`, {
        level: "error",
      });
    else if (qt === CLAUDE_CODE_VERSION_TOO_OLD)
      logForDebugging(`API ${qt}: ${gateway}`, {
        level: "error",
      });
    else if (qt === "request_too_large")
      logForDebugging(`API request_too_large: ${gateway}`, {
        level: "error",
      });
    else if (qt === "system_role_misplaced")
      logForDebugging(`API ${qt}: ${gateway}`, {
        level: "error",
      });
    else if (qt === "wif_credential_error" || qt === "cloud_credential_error")
      logForDebugging(`API ${qt}: ${gateway}`, {
        level: "error",
      });
    else if (
      qt === "auth_error" ||
      qt === "token_revoked" ||
      qt === "oauth_org_not_allowed" ||
      qt === "oauth_refresh_lock_timeout" ||
      qt === "oauth_refresh_disk_full" ||
      qt === "stored_login_refused" ||
      qt === "verification_required"
    )
      logForDebugging(`API ${qt}: ${gateway}`, {
        level: "error",
      });
    else {
      let Kn = formatApiErrorType(qt, status);
      if (qt === "unknown") {
        let Xn = classifyApiErrorKind(error, qt, observedResponse);
        Kn += ` class=${Xn.error_class} name=${Xn.error_name ?? "none"} code=${Xn.connection_code ?? "none"}`;
      }
      logError(withTelemetryMessage(error, Kn));
    }
    let errorType = detectGateway({
      headers,
      baseUrl: getCustomApiBaseUrl(),
    });
    logEvent("tengu_api_error", {
      model: telemetrySafeModelName(model),
      ...(isLowPriority && {
        is_low_priority: true,
      }),
      dispatch: dispatch ?? lit_2("none"),
      error: formatApiErrorType(qt, status),
      ...errorTelemetryFields(error),
      status: errStr,
      errorType: fromEnum(qt),
      ...(effort && {
        effort_level: fromEnum(effort),
      }),
      messageCount,
      messageTokens,
      durationMs,
      durationMsIncludingRetries,
      attempt,
      provider: getAPIProviderForAnalytics(),
      requestId: sanitizeMarkName(requestId) || undefined,
      ...(no && {
        invokingRequestId: sanitizeMarkName(no.invokingRequestId),
        invocationKind: fromEnumOpt(no.invocationKind),
      }),
      clientRequestId: sanitizeMarkName(clientRequestId) || undefined,
      user_message_uuid: sanitizeMarkName(turnAttributionKeyFor(agentContext)),
      didFallBackToNonStreaming,
      ...gzipTelemetryFields(takeGzipTelemetry(gt)),
      ...(errorType && {
        gateway: fromEnum(errorType),
      }),
      ...responseDiagnosticFields(error, observedResponse),
      fallback_disabled: nonStreamingFallbackSkipped ?? false,
      ...(queryTracking && {
        queryChainId: sanitizeMarkName(queryTracking.chainId),
        queryDepth: queryTracking.depth,
      }),
      ...(querySource && {
        querySource: agentTypeForTelemetry(querySource),
      }),
      ...(messageClientPlatform && {
        messageClientPlatform: entrypointForTelemetry(messageClientPlatform),
      }),
      fastMode,
      ...(previousRequestId && {
        previousRequestId: sanitizeMarkName(previousRequestId),
      }),
      ...(attribution && redactAttribution(querySource, attribution)),
      ...(attribution?.attributionSkill && {
        _PROTO_skill_name: attribution.attributionSkill,
      }),
      ...getAnthropicEnvMetadata(),
    });
  }
  let connectionDetails = apiErrorText({
    error,
    errorClass: qt,
    querySource,
    accountMemoryKeys,
  });
  logOTelEvent(
    "api_error",
    {
      ...apiErrorFields({
        model,
        error: connectionDetails,
        status,
        durationMs,
        attempt,
        requestId,
        clientRequestId: gt,
        fastMode,
        querySource,
        effort,
      }),
      ...(attribution && attributionForLog(querySource, attribution)),
      ...modelCallNames,
    },
    agentContext,
  );
  if (attempt > 1)
    logOTelEvent(
      "api_retries_exhausted",
      {
        model,
        error: connectionDetails,
        ...(status !== undefined && {
          status_code: status,
        }),
        total_attempts: attempt,
        total_retry_duration_ms: durationMsIncludingRetries,
        speed: fastMode ? "fast" : "normal",
        ...(Zt && {
          query_source: Zt,
        }),
        ...(effort && {
          effort,
        }),
      },
      agentContext,
    );
  endLLMRequestSpan(llmSpan, {
    success: false,
    statusCode: errStr ? parseInt(errStr) : undefined,
    error: connectionDetails,
    errorClass: qt,
    attempt,
    requestId: requestId ?? undefined,
    clientRequestId: gt,
    effort,
  });
  let teleportInfo = rn ? undefined : getTeleportedSessionInfo();
  if (teleportInfo?.isTeleported && !teleportInfo.hasLoggedFirstMessage) {
    logEvent("tengu_teleport_first_message_error", {
      session_id: sanitizeMarkName(teleportInfo.sessionId),
      error_type: fromEnum(qt),
    });
    markFirstTeleportMessageLogged();
  }
}
//@ chunk-e6aww6q8.js:2549172-2549243 layout
/**
 * 可上报的拒答类别：cyber/bio/frontier_llm/reasoning_extraction。
 */
var SHAREABLE_REFUSAL_CATEGORIES = new Set(["cyber", "bio", "frontier_llm", "reasoning_extraction"]);
//@ chunk-e6aww6q8.js:2549243-2549704 layout
/**
 * 记 api_refusal 事件（模型、request id、速度、类别是否存在等）。
 */
function logApiRefusal({
  model,
  requestId,
  querySource,
  effort,
  fastMode,
  attempt,
  attribution,
  serverFallbackHop,
  stopDetails,
  agentContext,
}) {
  addSafetyStop();
  let q = normalizeAgentQuerySource(querySource);
  let category = stopDetails?.category;
  let Se = category && SHAREABLE_REFUSAL_CATEGORIES.has(category) ? category : null;
  logOTelEvent(
    "api_refusal",
    {
      model,
      request_id: requestId,
      speed: fastMode ? "fast" : "normal",
      attempt,
      server_fallback_hop: serverFallbackHop,
      ...(q && {
        query_source: q,
      }),
      ...(effort && {
        effort,
      }),
      ...(stopDetails !== undefined && {
        has_category: Se !== null,
        has_explanation: Boolean(stopDetails?.explanation),
      }),
      ...(Se &&
        isToolDetailsLoggingEnabled() && {
          category: Se,
        }),
      ...(attribution && attributionForLog(querySource, attribution)),
    },
    agentContext,
  );
}
//@ chunk-e6aww6q8.js:2549704-2549799 layout
/**
 * base64 字符串解码后的字节数。
 */
function base64DecodedLength(e) {
  let n = e.endsWith("==") ? 2 : e.endsWith("=") ? 1 : 0;
  return Math.floor((e.length * 3) / 4) - n;
}
//@ chunk-e6aww6q8.js:2549799-2549836 layout
/**
 * 87400 / 40：读图片尺寸时先取 40 字符再取 87400 字符解码头部；WeakMap 缓存每个 source 的统计。
 */
var IMAGE_HEADER_SNIFF_LONG_CHARS = 87400;
var IMAGE_HEADER_SNIFF_SHORT_CHARS = 40;
var imageStatsCache = new WeakMap();
//@ chunk-e6aww6q8.js:2549836-2549938 layout
/**
 * requestContentStats 的异常保护版。
 */
function safeRequestContentStats(messagesForAPI, model) {
  try {
    return requestContentStats(messagesForAPI, model);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "request content telemetry failed"));
    return;
  }
}
//@ chunk-e6aww6q8.js:2549938-2551984 layout
/**
 * 统计请求消息内容：图片数/字节/像素、文档数/字节、文本/思考/工具输入/工具结果字符数。
 */
function requestContentStats(e, n) {
  let r = bytesPerTokenForModel(n);
  let weakMap = new WeakMap();
  let h = (S, w) => {
    switch (w.type) {
      case "image": {
        S.imageBlockCount += 1;
        if (!isBase64ImageBlock_3(w)) return S;
        let L = w.source.data;
        let G = imageStatsCache.get(w.source);
        if (G?.data !== L) {
          let q =
            parseWebpHeader(Buffer.from(L.slice(0, IMAGE_HEADER_SNIFF_SHORT_CHARS), "base64")) ??
            parseWebpHeader(Buffer.from(L.slice(0, IMAGE_HEADER_SNIFF_LONG_CHARS), "base64"));
          G = {
            data: L,
            bytes: base64DecodedLength(L),
            pixels: q ? q.width * q.height : 0,
          };
          imageStatsCache.set(w.source, G);
        }
        S.imageTotalBytes += G.bytes;
        S.imageTotalPixels += G.pixels;
        return S;
      }
      case "document": {
        S.documentBlockCount += 1;
        let source = w.source;
        if (!isPlainObject_5(source)) return S;
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
                (acc, Z) => acc + (Z?.type === "text" && typeof Z.text === "string" ? Z.text.length : 0),
                0,
              );
            return S;
          }
          default:
            return S;
        }
      }
      case "text":
        S.inputTextCharLength += typeof w.text === "string" ? w.text.length : 0;
        return S;
      case "thinking":
        S.inputTextCharLength += typeof w.thinking === "string" ? w.thinking.length : 0;
        return S;
      case "redacted_thinking":
        S.inputTextCharLength += typeof w.data === "string" ? w.data.length : 0;
        return S;
      case "tool_use":
      case "server_tool_use":
      case "mcp_tool_use":
        S.inputTextCharLength +=
          (typeof w.name === "string" ? w.name.length : 0) +
          (getCachedJsonLength(w.input, weakMap) ?? jsonStringify(w.input ?? {}).length);
        return S;
      case "tool_result":
      case "mcp_tool_result": {
        let content = w.content;
        if (typeof content === "string") {
          S.inputTextCharLength += content.length;
          return S;
        }
        if (!Array.isArray(content)) return S;
        return content.reduce(y, S);
      }
      default:
        S.inputTextCharLength += jsonStringify(w).length;
        return S;
    }
  };
  let y = (S, w) => {
    if (typeof w === "string") {
      S.inputTextCharLength += jsonStringify(w).length;
      return S;
    }
    return isObjectBlock(w) ? h(S, w) : S;
  };
  return e.reduce(
    (acc, w) => {
      let content = w.message.content;
      acc.estimatedInputTokens += roughTokenCountEstimationForContent(content, r, weakMap);
      if (typeof content === "string") {
        acc.inputTextCharLength += content.length;
        return acc;
      }
      if (!Array.isArray(content)) return acc;
      for (let G of content) y(acc, G);
      return acc;
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
//@ chunk-e6aww6q8.js:2551984-2552630 layout
/**
 * 统计本次新发与重发的图片块数与字节。
 */
function sentImageStats(messagesForAPI, n) {
  try {
    let r = {
      imageNewBlockCount: 0,
      imageNewBytes: 0,
      imageResentBlockCount: 0,
      imageResentBytes: 0,
    };
    let lastIndex = messagesForAPI.findLastIndex((h) => h.type === "assistant" && isRealApiResponse(h));
    for (let [h, y] of messagesForAPI.entries()) {
      let content = y.message.content;
      if (h < n || !Array.isArray(content)) continue;
      for (let w of content) {
        let content =
          isObjectBlock(w) && (w.type === "tool_result" || w.type === "mcp_tool_result") && "content" in w
            ? w.content
            : undefined;
        for (let G of Array.isArray(content) ? content : [w]) {
          if (!isObjectBlock(G) || G.type !== "image" || !isBase64ImageBlock_3(G)) continue;
          let q = base64DecodedLength(G.source.data);
          if (h < lastIndex) {
            r.imageResentBlockCount += 1;
            r.imageResentBytes += q;
          } else {
            r.imageNewBlockCount += 1;
            r.imageNewBytes += q;
          }
        }
      }
    }
    return r;
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "sent image telemetry failed"));
    return;
  }
}
//@ chunk-e6aww6q8.js:2552630-2552765 layout
/**
 * 遥测用工具名：内置工具原名，MCP 工具归为 mcp_tool，其他为 other。
 */
function toolNameForTelemetry_2(name, n) {
  let r = n.get(name);
  if (r === "static") return sanitizeToolNameForAnalytics(name);
  if (r === "mcp") {
    let s = sanitizeToolNameForAnalytics(name);
    return s === name ? lit_2("mcp_tool") : s;
  }
  return lit_2("other");
}
//@ chunk-e6aww6q8.js:2552765-2552875 layout
/**
 * 把 [工具类别, 字符数] 列表拼成脱敏 JSON 字符串（遥测元数据）。
 */
function buildToolSizeJson(e) {
  return concatSafe(
    lit_2("{"),
    ...e.flatMap(([n, r], s) => [...(s > 0 ? [lit_2(",")] : []), lit_2('"'), n, lit_2('":'), fromNumber(r)]),
    lit_2("}"),
  );
}
//@ chunk-e6aww6q8.js:2552875-2553413 layout
/**
 * system 字符数、工具 schema 字符数、工具数、延迟工具数与 schema 哈希（请求前缀遥测）。
 */
function requestPrefixStats(e, n, r) {
  try {
    let systemCharLength = 0;
    for (let G of e) systemCharLength += G.text.length;
    let toolsCharLength = 0;
    let deferredToolsCount = 0;
    let S = new Map();
    for (let G of n) {
      if ("defer_loading" in G && G.defer_loading === true) {
        deferredToolsCount += 1;
        continue;
      }
      let q = jsonStringifyRaw(G).length;
      toolsCharLength += q;
      let Z = "name" in G && typeof G.name === "string" ? toolNameForTelemetry_2(G.name, r) : lit_2("other");
      S.set(Z, (S.get(Z) ?? 0) + q);
    }
    let sorted = [...S.entries()].sort(([G], [q]) => (G < q ? -1 : G > q ? 1 : 0));
    let toolSizeJson = buildToolSizeJson(sorted);
    return {
      systemCharLength,
      toolsCharLength,
      toolsCount: n.length,
      deferredToolsCount,
      toolSchemasHash: shortHash(toolSizeJson),
      toolSchemaCharLengths: toolSizeJson,
    };
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "request prefix telemetry failed"));
    return;
  }
}
//@ chunk-e6aww6q8.js:2553413-2553448 layout
/**
 * 512：tengu_tool_schema_sizes 去重集合及其上限。
 */
var loggedToolSchemaKeys = new HostScoped(() => new Set());
var MAX_LOGGED_TOOL_SCHEMA_KEYS = 512;
//@ chunk-e6aww6q8.js:2553448-2557974 fingerprint = logAPISuccess (0.505)
/**
 * 记 tengu_api_success：模型、usage、耗时（含重试）、TTFT、首内容时间、stop_reason、成本、是否回退非流式、网关等；必要时记工具 schema 大小。
 */
function logAPISuccess({
  model,
  preNormalizedModel,
  messageCount,
  messageTokens,
  usage,
  durationMs,
  durationMsIncludingRetries,
  attempt,
  ttftMs,
  firstContentMs,
  streamEventCount,
  queryOverheadMs,
  requestId,
  clientRequestId,
  firstAttemptRequestId,
  stopReason,
  costUSD,
  didFallBackToNonStreaming,
  querySource,
  messageClientPlatform,
  gateway,
  extraEventFields,
  queryTracking,
  permissionMode,
  proactivityLevel,
  globalCacheStrategy,
  promptCacheTtl,
  promptCacheMessagesTtl,
  textContentLength,
  thinkingContentLength,
  narrationBlockCount,
  toolUseContentLengths,
  requestContentTelemetry,
  sentBody,
  requestPrefixTelemetry,
  requestBodyCompression,
  fastMode,
  previousRequestId,
  betas,
  thinkingPrefixMismatchBehavior,
  echoWireToolInputs,
  effort,
  turnOrigin,
  isDefaultModel,
  defaultModel,
  isDefaultEffort,
  defaultEffortLevel,
  carriedEffort,
  carriedEffortEnded,
  attribution,
  agentContext,
  isLowPriority,
  tenderQuiltHeader,
  dispatch,
  uncoveredTail,
}) {
  resetAuthFailureTracking();
  emitPrefetchChanged();
  let isNonInteractiveSession = getIsNonInteractiveSession();
  let isPostCompaction = consumePostCompaction();
  let hasPrintFlag = eagerHasCliFlag("-p") || eagerHasCliFlag("--print");
  let _r = loggedToolSchemaKeys.of(getRootSession().host);
  let now = Date.now();
  let lastCompletion = getLastApiCompletionTimestamp();
  let timeSinceLastApiCallMs =
    lastCompletion !== null ? Math.max(0, Math.round(now - lastCompletion)) : undefined;
  let jr = consumeInvokingRequestId(agentContext);
  let Or = isMainThreadQueryLogging(querySource, isMainAgent(agentContext));
  onMainRequestLogged({
    isMainLoop: Or,
    now,
  });
  addUsageToSession(usage, Or);
  logEvent("tengu_api_success", {
    model: telemetrySafeModelName(model),
    ...(isLowPriority && {
      is_low_priority: true,
    }),
    dispatch: dispatch ?? lit_2("none"),
    ...(tenderQuiltHeader && {
      tender_quilt_header: true,
      arm_source: fromEnum(getFallbackLatchKind()),
    }),
    ...(preNormalizedModel !== model && {
      preNormalizedModel: telemetrySafeModelName(preNormalizedModel),
    }),
    ...(betas?.length && {
      betas: hashToolNames(betas),
    }),
    thinkingPrefixMismatchBehavior: fromEnumOpt(thinkingPrefixMismatchBehavior),
    ...(echoWireToolInputs !== undefined && {
      echoWireToolInputs,
    }),
    messageCount,
    messageTokens,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    uncachedInputTokens: usage.cache_creation_input_tokens ?? 0,
    cache_creation_5m_input_tokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
    cache_creation_1h_input_tokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    ...(uncoveredTail && uncoveredTailFields(uncoveredTail, usage)),
    durationMs,
    durationMsIncludingRetries,
    attempt,
    ttftMs: ttftMs ?? undefined,
    firstContentMs: firstContentMs ?? undefined,
    streamEventCount,
    queryOverheadMs,
    buildAgeMins: getBuildAgeMinutes(),
    provider: getAPIProviderForAnalytics(),
    requestId: sanitizeMarkName(requestId) ?? undefined,
    clientRequestId: sanitizeMarkName(clientRequestId) || undefined,
    user_message_uuid: sanitizeMarkName(turnAttributionKeyFor(agentContext)),
    ...(firstAttemptRequestId &&
      requestId &&
      firstAttemptRequestId !== requestId && {
        firstAttemptRequestId: sanitizeMarkName(firstAttemptRequestId),
      }),
    ...(jr && {
      invokingRequestId: sanitizeMarkName(jr.invokingRequestId),
      invocationKind: fromEnumOpt(jr.invocationKind),
    }),
    stop_reason: fromEnumOpt(stopReason) ?? undefined,
    ...(effort && {
      effort_level: fromEnum(effort),
    }),
    ...(turnOrigin && {
      turn_origin: fromEnum(turnOrigin),
    }),
    ...(isDefaultModel !== undefined && {
      is_default_model: isDefaultModel,
    }),
    ...(defaultModel !== undefined && {
      default_model: telemetrySafeModelName(defaultModel),
    }),
    ...(isDefaultEffort !== undefined && {
      is_default_effort: isDefaultEffort,
    }),
    ...(defaultEffortLevel !== undefined && {
      default_effort_level: fromEnum(defaultEffortLevel),
    }),
    ...(carriedEffort !== undefined && {
      carried_effort_level: fromEnum(carriedEffort.level),
      carried_effort_outcome: fromEnum(carriedEffort.outcome),
    }),
    ...(carriedEffortEnded !== undefined && {
      carried_effort_ended: fromEnum(carriedEffortEnded),
    }),
    costUSD,
    didFallBackToNonStreaming,
    isNonInteractiveSession,
    ...(!isDiskless() && {
      print: hasPrintFlag,
      isTTY: process.stdout.isTTY ?? false,
    }),
    querySource: agentTypeForTelemetry(querySource),
    ...(messageClientPlatform && {
      messageClientPlatform: entrypointForTelemetry(messageClientPlatform),
    }),
    ...(gateway && {
      gateway: fromEnum(gateway),
    }),
    ...extraEventFields,
    ...(queryTracking && {
      queryChainId: sanitizeMarkName(queryTracking.chainId),
      queryDepth: queryTracking.depth,
    }),
    permissionMode: fromEnumOpt(permissionMode),
    proactivityLevel: fromEnumOpt(proactivityLevel),
    ...(globalCacheStrategy && {
      globalCacheStrategy: fromEnum(globalCacheStrategy),
    }),
    ...(promptCacheTtl && {
      prompt_cache_ttl: fromEnum(promptCacheTtl.ttl),
      prompt_cache_ttl_reason: fromEnum(promptCacheTtl.reason),
    }),
    ...(promptCacheMessagesTtl && {
      prompt_cache_messages_ttl: fromEnum(promptCacheMessagesTtl),
    }),
    ...(textContentLength !== undefined && {
      textContentLength,
    }),
    ...(thinkingContentLength !== undefined && {
      thinkingContentLength,
    }),
    ...(narrationBlockCount !== undefined && {
      narrationBlockCount,
    }),
    ...(toolUseContentLengths !== undefined && {
      toolUseContentLengths,
    }),
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
    fastMode,
    ...(previousRequestId && {
      previousRequestId: sanitizeMarkName(previousRequestId),
    }),
    ...(isPostCompaction && {
      isPostCompaction,
    }),
    ...(attribution && redactAttribution(querySource, attribution)),
    ...(attribution?.attributionSkill && {
      _PROTO_skill_name: attribution.attributionSkill,
    }),
    ...getAnthropicEnvMetadata(),
    timeSinceLastApiCallMs,
  });
  if (requestPrefixTelemetry && !_r.has(requestPrefixTelemetry.toolSchemasHash)) {
    if (_r.size >= MAX_LOGGED_TOOL_SCHEMA_KEYS) _r.clear();
    _r.add(requestPrefixTelemetry.toolSchemasHash);
    logEvent("tengu_tool_schema_sizes", {
      toolSchemasHash: requestPrefixTelemetry.toolSchemasHash,
      toolSchemaCharLengths: requestPrefixTelemetry.toolSchemaCharLengths,
      toolsCharLength: requestPrefixTelemetry.toolsCharLength,
      toolsCount: requestPrefixTelemetry.toolsCount,
      deferredToolsCount: requestPrefixTelemetry.deferredToolsCount,
    });
  }
  setLastApiCompletionTimestamp(now);
}
//@ chunk-e6aww6q8.js:2557974-2562306 fingerprint = logAPISuccessAndDuration (0.59)
/**
 * 响应完成后汇总：统计输出文本/思考/工具输入长度，识别网关，累加 API 时长，调用 logAPISuccess。
 */
function logAPISuccessAndDuration({
  model,
  preNormalizedModel,
  start,
  startIncludingRetries,
  ttftMs,
  firstContentMs,
  streamEventCount,
  queryOverheadMs,
  usage,
  attempt,
  messageCount,
  messageTokens,
  requestId,
  rawRequestBodyId,
  accountMemoryKeys,
  clientRequestId,
  firstAttemptRequestId,
  stopReason,
  didFallBackToNonStreaming,
  querySource,
  messageClientPlatform,
  headers,
  extraEventFields,
  costUSD,
  queryTracking,
  permissionMode,
  proactivityLevel,
  newMessages,
  requestContentTelemetry,
  sentBody,
  requestPrefixTelemetry,
  llmSpan,
  globalCacheStrategy,
  promptCacheTtl,
  promptCacheMessagesTtl,
  requestSetupMs,
  attemptStartTimes,
  fastMode,
  previousRequestId,
  betas,
  thinkingPrefixMismatchBehavior,
  echoWireToolInputs,
  effort,
  turnOrigin,
  isDefaultModel,
  defaultModel,
  isDefaultEffort,
  defaultEffortLevel,
  carriedEffort,
  carriedEffortEnded,
  attribution,
  modelCallNames,
  agentContext,
  isLowPriority,
  dispatch,
  uncoveredTail,
}) {
  emitEpochFromHeader(headers?.get?.(TUNNEL_CREDENTIAL_EPOCH_HEADER));
  let gateway = detectGateway({
    headers,
    baseUrl: getCustomApiBaseUrl(),
  });
  if (gateway !== undefined) noteObservedGateway(gateway);
  let textContentLength;
  let thinkingContentLength;
  let narrationBlockCount;
  let toolUseContentLengths;
  if (newMessages)
    try {
      let textLen = 0;
      let thinkingLen = 0;
      let Vi = false;
      let ji = 0;
      let Wi = new Map();
      for (let msg of newMessages)
        for (let block of msg.message.content)
          if (block.type === "text") textLen += block.text?.length ?? 0;
          else if (block.type === "thinking") {
            thinkingLen += block.thinking?.length ?? 0;
            Vi = true;
            if (isNarrationThinking(block)) ji++;
          } else if (block.type === "redacted_thinking") Vi = true;
          else if (
            block.type === "tool_use" ||
            block.type === "server_tool_use" ||
            block.type === "mcp_tool_use"
          ) {
            let inputLen = jsonStringify(block.input ?? {}).length;
            let sanitizedName =
              block.type === "mcp_tool_use"
                ? lit_2("mcp_tool")
                : block.name.startsWith(SKILL_2)
                  ? lit_2("skill_tool")
                  : sanitizeToolNameForAnalytics(block.name);
            Wi.set(sanitizedName, (Wi.get(sanitizedName) ?? 0) + inputLen);
          }
      textContentLength = textLen;
      thinkingContentLength = Vi ? thinkingLen : undefined;
      narrationBlockCount = ji;
      toolUseContentLengths = Wi.size > 0 ? hashEntries(Wi) : undefined;
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "response content telemetry failed"));
    }
  let max = Math.max(0, Math.round(performance.now() - start));
  let durationMsIncludingRetries = Math.max(0, Math.round(performance.now() - startIncludingRetries));
  addToTotalDurationState(durationMsIncludingRetries, max);
  logAPISuccess({
    model,
    preNormalizedModel,
    messageCount,
    messageTokens,
    usage,
    durationMs: max,
    durationMsIncludingRetries,
    attempt,
    ttftMs,
    firstContentMs,
    streamEventCount,
    queryOverheadMs,
    requestId,
    clientRequestId: didFallBackToNonStreaming ? undefined : clientRequestId,
    firstAttemptRequestId,
    stopReason,
    costUSD,
    didFallBackToNonStreaming,
    querySource,
    messageClientPlatform,
    gateway,
    extraEventFields,
    queryTracking,
    permissionMode,
    proactivityLevel,
    globalCacheStrategy,
    promptCacheTtl,
    promptCacheMessagesTtl,
    textContentLength,
    thinkingContentLength,
    narrationBlockCount,
    toolUseContentLengths,
    requestContentTelemetry,
    sentBody,
    requestPrefixTelemetry,
    requestBodyCompression: takeGzipTelemetry(clientRequestId),
    fastMode,
    previousRequestId,
    betas,
    thinkingPrefixMismatchBehavior,
    echoWireToolInputs,
    effort,
    turnOrigin,
    isDefaultModel,
    defaultModel,
    isDefaultEffort,
    defaultEffortLevel,
    carriedEffort,
    carriedEffortEnded,
    attribution,
    agentContext,
    isLowPriority,
    tenderQuiltHeader: headers?.get(X_CC_TENDER_QUILT) === "1",
    dispatch,
    uncoveredTail,
  });
  let costUSD_2 = Number.isFinite(costUSD) ? costUSD : 0;
  let Io = apiSuccessFields(
    {
      model,
      usage,
      costUSD: costUSD_2,
      durationMs: max,
      ttftMs,
      requestId,
      clientRequestId: didFallBackToNonStreaming ? undefined : clientRequestId,
      fastMode,
      querySource,
      effort,
    },
    {},
  );
  logOTelEvent(
    "api_request",
    {
      ...Io,
      ...(attribution && attributionForLog(querySource, attribution)),
      ...modelCallNames,
    },
    agentContext,
  );
  let zo = (fs) => redactAccountMemoryText(accountMemoryKeys, querySource, fs);
  if (newMessages) {
    let joined = newMessages.flatMap((m) =>
      m.message.content.filter((Vi) => Vi.type === "text").map((Vi) => Vi.text),
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
          request_id: requestId ?? undefined,
          "message.uuid": newMessages.at(-1)?.uuid,
          model,
          query_source: normalizeAgentQuerySource(querySource),
        },
        agentContext,
      );
    writeOtelResponseBody(newMessages, {
      model,
      querySource,
      requestId,
      requestBodyId: rawRequestBodyId,
      accountMemoryKeys,
      agentContext,
    });
  }
  let modelOutput;
  let thinkingOutput;
  let hasToolCall;
  if (isBetaTracingEnabled() && newMessages) {
    modelOutput =
      newMessages.flatMap((m) => m.message.content.filter((as) => as.type === "text").map((as) => as.text))
        .join(`
`) || undefined;
    hasToolCall = newMessages.some((m) => m.message.content.some((as) => as.type === "tool_use"));
  }
  endLLMRequestSpan(llmSpan, {
    success: true,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens,
    attempt,
    modelOutput,
    thinkingOutput,
    accountMemoryKeys,
    querySource,
    hasToolCall,
    requestId: requestId ?? undefined,
    clientRequestId,
    stopReason: stopReason ?? undefined,
    effort,
    ttftMs: ttftMs ?? undefined,
    firstContentMs: firstContentMs ?? undefined,
    requestSetupMs,
    attemptStartTimes,
    traceresponse: didFallBackToNonStreaming ? undefined : (headers?.get("traceresponse") ?? undefined),
  });
  let teleportInfo = getTeleportedSessionInfo();
  if (teleportInfo?.isTeleported && !teleportInfo.hasLoggedFirstMessage) {
    logEvent("tengu_teleport_first_message_success", {
      session_id: sanitizeMarkName(teleportInfo.sessionId),
    });
    markFirstTeleportMessageLogged();
  }
}
export {
  logAPIQuery,
  logApiRefusal,
  logAPIError,
  safeRequestContentStats,
  sentImageStats,
  requestPrefixStats,
  logAPISuccessAndDuration,
  entrypointForTelemetry,
  GATEWAY_FINGERPRINT_ENTRIES,
  detectGateway,
  GATEWAY_FINGERPRINTS,
  apiErrorFields,
  apiErrorText,
  addUsageToSession,
  apiSuccessFields,
};

/**
 * utils/telemetry/instrumentation.ts
 *
 * OTel 初始化：CLAUDE_CODE_ENABLE_TELEMETRY、OTEL_*_EXPORTER、OTLP 配置与头、BigQuery reader、resource、flush 与关闭。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/instrumentation.ts
 * pieces: chunk-9vvvg0d3.js (49), chunk-jhrww53q.js (1)
 * attribution: sole-consumer 29, fingerprint 11, affinity 1, callgraph-witnessed 2, layout 6, file-local 1
 */
import { arch } from "os";
import http from "http";
import https from "https";
import { __export, __toESM } from "../../../runtime/bun-runtime.js";
import {
  EMPTY_ENV_DECLARATIONS,
  ANT_CLAUDE_CODE_METRICS_ENDPOINT,
  ANT_OTEL_EXPORTER_OTLP_ENDPOINT,
  ANT_OTEL_EXPORTER_OTLP_HEADERS,
  ANT_OTEL_EXPORTER_OTLP_PROTOCOL,
  ANT_OTEL_LOGS_EXPORTER,
  ANT_OTEL_METRICS_EXPORTER,
  ANT_OTEL_RESOURCE_ATTRIBUTES,
  ANT_OTEL_TRACES_EXPORTER,
  BETA_TRACING_ENDPOINT,
  CLAUDE_CODE_BENCH_LIVE_COUNTS,
  CLAUDE_CODE_BYOC_ENABLE_DATADOG,
  CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS,
  CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS,
  CLAUDE_CODE_DEBUG_LOGS_DIR,
  CLAUDE_CODE_DEBUG_LOG_LEVEL,
  CLAUDE_CODE_DEBUG_REPAINTS,
  CLAUDE_CODE_DIAGNOSTICS_FILE,
  CLAUDE_CODE_ENHANCED_TELEMETRY_BETA,
  CLAUDE_CODE_FRAME_TIMING_LOG,
  CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY,
  CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH,
  CLAUDE_CODE_OTEL_DIAG_STDERR,
  CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS,
  CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS,
  CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS,
  CLAUDE_CODE_PERFETTO_TRACE,
  CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S,
  CLAUDE_CODE_PROFILE_STARTUP,
  CLAUDE_CODE_SESSION_LOG,
  CLAUDE_CODE_TEE_SDK_STDOUT,
  CLAUDE_CODE_TERMINAL_RECORDING,
  CLAUDE_DEBUG,
  CLAUDE_PTY_RECORD,
  DEBUG,
  DEBUG_CLAUDE_AGENT_SDK,
  DEBUG_SDK,
  OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_EXPORTER_OTLP_HEADERS,
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  OTEL_EXPORTER_OTLP_LOGS_HEADERS,
  OTEL_EXPORTER_OTLP_LOGS_PROTOCOL,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  OTEL_EXPORTER_OTLP_METRICS_HEADERS,
  OTEL_EXPORTER_OTLP_METRICS_PROTOCOL,
  OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE,
  OTEL_EXPORTER_OTLP_PROTOCOL,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  OTEL_EXPORTER_OTLP_TRACES_HEADERS,
  OTEL_EXPORTER_OTLP_TRACES_PROTOCOL,
  OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_LOGS_EXPORTER,
  OTEL_LOGS_EXPORT_INTERVAL,
  OTEL_LOG_ASSISTANT_RESPONSES,
  OTEL_LOG_MANAGED_SETTINGS,
  OTEL_LOG_RAW_API_BODIES,
  OTEL_LOG_TOOL_CONTENT,
  OTEL_LOG_TOOL_DETAILS,
  OTEL_LOG_USER_PROMPTS,
  OTEL_METRICS_EXPORTER,
  OTEL_METRIC_EXPORT_INTERVAL,
  OTEL_RESOURCE_ATTRIBUTES,
  OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_TRACES_EXPORTER,
  OTEL_TRACES_EXPORT_INTERVAL,
} from "../env/envRegistry.js";
import { require_error_3 } from "../../../vendor/@anthropic-ai/bedrock-sdk/core/error.js";
import { isTelemetryDisabled } from "../privacyLevel.js";
import {
  getSubscriptionType,
  isClaudeAISubscriber,
  is1PApiCustomer,
  otelHeadersHelperFailureKind,
  getConfiguredOtelHeadersHelper,
  getOtelHeadersFromHelper,
  prefetchOtelHeadersFromHelper,
  isHostManagedProviderAuth,
} from "../auth.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { hasExactErrorMessage, errorMessage } from "../errors.js";
import { extractConnectionErrorDetails, sanitizableErrorCode } from "../../services/api/errorUtils.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  import_api,
  import_resources,
  ConsoleLogRecordExporter,
  import_core,
} from "../../../vendor/@opentelemetry/sdk-logs/build/src/export/ConsoleLogRecordExporter.js";
import { otelContextManager } from "./messageContentAttributes.js";
import { env } from "../env.js";
import { isBetaTracingEnabled } from "./betaSessionTracing.js";
import {
  getTracerProvider,
  getCachedTelemetryResource,
  setCachedTelemetryResource,
  setTracerProvider,
  setLoggerProvider,
  setEventLogger,
  getCachedOtlpHttpAgentFactory,
  replaceMeterProvider,
  getLoggerProvider,
  isDiskless,
  getMeterProvider,
  getGatewayAuth,
  isGatewayAuthPinned,
  setCachedOtlpHttpAgentFactory,
} from "../../bootstrap/state.js";
import {
  hasRemoteOtelLogsEndpoint,
  isTracesRelayed,
  SIGNAL_ENV_SUFFIX,
  ccrTracesRelayUrl,
  isCcrTracesEndpoint,
  tracesRelayedLatch,
  getRemoteOtlpEndpoint,
} from "./otlpRelay.js";
import { firstLineOf } from "../stringUtils.js";
import { getPlatform, getWslVersion } from "../platform.js";
import { normalizeArchForOtel } from "../../../vendor/@opentelemetry/resources/build/esm/detectors/platform/node/utils.js";
import { gatewayIdentityAttributes } from "./gatewayIdentityAttributes.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { BatchSpanProcessor } from "../../../vendor/@opentelemetry/sdk-trace-base/build/esm/platform/node/RandomIdGenerator.js";
import { BasicTracerProvider } from "../../../vendor/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js";
import { LoggerProvider } from "../../../vendor/@opentelemetry/sdk-logs/build/src/LoggerProvider.js";
import { BatchLogRecordProcessor } from "../../../vendor/@opentelemetry/sdk-logs/build/esm/platform/node/export/BatchLogRecordProcessor.js";
import { diagnosticTracker } from "../../services/diagnosticTracking.js";
import { logForDebugging, getHasFormattedOutput } from "../debug.js";
import { import_sdk_metrics } from "../../../vendor/@opentelemetry/sdk-trace-base/build/esm/enums.js";
import { ConsoleSpanExporter } from "../../../vendor/@opentelemetry/sdk-trace-base/build/src/export/ConsoleSpanExporter.js";
import { logError } from "../log.js";
import { jsonStringify } from "../slowOperations.js";
import { isEnvTruthy } from "../envUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { BigQueryMetricsExporter } from "./bigqueryExporter.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { profileCheckpoint } from "../startupProfiler.js";
import { ClaudeCodeDiagLogger } from "./logger.js";
import { initializePerfettoTracing } from "./perfettoTracing.js";
import { endInteractionSpan, isEnhancedTelemetryEnabled } from "./sessionTracing.js";
import { eventRecordQueue } from "./thirdPartyEventRecords.js";
import { refreshGatewayToken } from "../../services/gateway/gatewayAuth.js";
import { configureApiKeyHeaders } from "../../services/api/client.js";
import { redactUrlsInText } from "../redaction/urlRedaction.js";
import { getPolicySettingsOrigin, getAllPolicyTierSettings } from "../settings/settings.js";
import {
  isRemoteManagedSettingsVerified,
  getRemoteSettingsPathOverride,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { decodeJwtPayload, isGatewayToken } from "../../bridge/jwtUtils.js";
import { getAPIProvider } from "../model/providers.js";
import { getSessionIngressAuthHeaders } from "../sessionIngressAuth.js";
import { getUsableProxyUrl, shouldBypassProxy, TlsCheckingProxyAgent } from "../proxy.js";
import { anthropicHostOf } from "../anthropicHosts.js";
import { getMTLSConfig, caListBehindProxy } from "../mtls.js";

//@ chunk-jhrww53q.js:3176-5552 fingerprint (2.1.88 match: bootstrapTelemetry, 0.317)
__export(EMPTY_ENV_DECLARATIONS, {
  ANT_CLAUDE_CODE_METRICS_ENDPOINT: () => ANT_CLAUDE_CODE_METRICS_ENDPOINT,
  ANT_OTEL_EXPORTER_OTLP_ENDPOINT: () => ANT_OTEL_EXPORTER_OTLP_ENDPOINT,
  ANT_OTEL_EXPORTER_OTLP_HEADERS: () => ANT_OTEL_EXPORTER_OTLP_HEADERS,
  ANT_OTEL_EXPORTER_OTLP_PROTOCOL: () => ANT_OTEL_EXPORTER_OTLP_PROTOCOL,
  ANT_OTEL_LOGS_EXPORTER: () => ANT_OTEL_LOGS_EXPORTER,
  ANT_OTEL_METRICS_EXPORTER: () => ANT_OTEL_METRICS_EXPORTER,
  ANT_OTEL_RESOURCE_ATTRIBUTES: () => ANT_OTEL_RESOURCE_ATTRIBUTES,
  ANT_OTEL_TRACES_EXPORTER: () => ANT_OTEL_TRACES_EXPORTER,
  BETA_TRACING_ENDPOINT: () => BETA_TRACING_ENDPOINT,
  CLAUDE_CODE_BENCH_LIVE_COUNTS: () => CLAUDE_CODE_BENCH_LIVE_COUNTS,
  CLAUDE_CODE_BYOC_ENABLE_DATADOG: () => CLAUDE_CODE_BYOC_ENABLE_DATADOG,
  CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS: () => CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS,
  CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS: () => CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS,
  CLAUDE_CODE_DEBUG_LOGS_DIR: () => CLAUDE_CODE_DEBUG_LOGS_DIR,
  CLAUDE_CODE_DEBUG_LOG_LEVEL: () => CLAUDE_CODE_DEBUG_LOG_LEVEL,
  CLAUDE_CODE_DEBUG_REPAINTS: () => CLAUDE_CODE_DEBUG_REPAINTS,
  CLAUDE_CODE_DIAGNOSTICS_FILE: () => CLAUDE_CODE_DIAGNOSTICS_FILE,
  CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: () => CLAUDE_CODE_ENHANCED_TELEMETRY_BETA,
  CLAUDE_CODE_FRAME_TIMING_LOG: () => CLAUDE_CODE_FRAME_TIMING_LOG,
  CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY: () => CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY,
  CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH: () => CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH,
  CLAUDE_CODE_OTEL_DIAG_STDERR: () => CLAUDE_CODE_OTEL_DIAG_STDERR,
  CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS: () => CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS,
  CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS: () => CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS,
  CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS: () => CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS,
  CLAUDE_CODE_PERFETTO_TRACE: () => CLAUDE_CODE_PERFETTO_TRACE,
  CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S: () => CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S,
  CLAUDE_CODE_PROFILE_STARTUP: () => CLAUDE_CODE_PROFILE_STARTUP,
  CLAUDE_CODE_SESSION_LOG: () => CLAUDE_CODE_SESSION_LOG,
  CLAUDE_CODE_TEE_SDK_STDOUT: () => CLAUDE_CODE_TEE_SDK_STDOUT,
  CLAUDE_CODE_TERMINAL_RECORDING: () => CLAUDE_CODE_TERMINAL_RECORDING,
  CLAUDE_DEBUG: () => CLAUDE_DEBUG,
  CLAUDE_PTY_RECORD: () => CLAUDE_PTY_RECORD,
  DEBUG: () => DEBUG,
  DEBUG_CLAUDE_AGENT_SDK: () => DEBUG_CLAUDE_AGENT_SDK,
  DEBUG_SDK: () => DEBUG_SDK,
  OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_EXPORTER_OTLP_ENDPOINT: () => OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_EXPORTER_OTLP_HEADERS: () => OTEL_EXPORTER_OTLP_HEADERS,
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: () => OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  OTEL_EXPORTER_OTLP_LOGS_HEADERS: () => OTEL_EXPORTER_OTLP_LOGS_HEADERS,
  OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: () => OTEL_EXPORTER_OTLP_LOGS_PROTOCOL,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: () => OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  OTEL_EXPORTER_OTLP_METRICS_HEADERS: () => OTEL_EXPORTER_OTLP_METRICS_HEADERS,
  OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: () => OTEL_EXPORTER_OTLP_METRICS_PROTOCOL,
  OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: () => OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE,
  OTEL_EXPORTER_OTLP_PROTOCOL: () => OTEL_EXPORTER_OTLP_PROTOCOL,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: () => OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  OTEL_EXPORTER_OTLP_TRACES_HEADERS: () => OTEL_EXPORTER_OTLP_TRACES_HEADERS,
  OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: () => OTEL_EXPORTER_OTLP_TRACES_PROTOCOL,
  OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_LOGS_EXPORTER: () => OTEL_LOGS_EXPORTER,
  OTEL_LOGS_EXPORT_INTERVAL: () => OTEL_LOGS_EXPORT_INTERVAL,
  OTEL_LOG_ASSISTANT_RESPONSES: () => OTEL_LOG_ASSISTANT_RESPONSES,
  OTEL_LOG_MANAGED_SETTINGS: () => OTEL_LOG_MANAGED_SETTINGS,
  OTEL_LOG_RAW_API_BODIES: () => OTEL_LOG_RAW_API_BODIES,
  OTEL_LOG_TOOL_CONTENT: () => OTEL_LOG_TOOL_CONTENT,
  OTEL_LOG_TOOL_DETAILS: () => OTEL_LOG_TOOL_DETAILS,
  OTEL_LOG_USER_PROMPTS: () => OTEL_LOG_USER_PROMPTS,
  OTEL_METRICS_EXPORTER: () => OTEL_METRICS_EXPORTER,
  OTEL_METRIC_EXPORT_INTERVAL: () => OTEL_METRIC_EXPORT_INTERVAL,
  OTEL_RESOURCE_ATTRIBUTES: () => OTEL_RESOURCE_ATTRIBUTES,
  OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_TRACES_EXPORTER: () => OTEL_TRACES_EXPORTER,
  OTEL_TRACES_EXPORT_INTERVAL: () => OTEL_TRACES_EXPORT_INTERVAL,
});
//@ chunk-9vvvg0d3.js:24056-24074 sole-consumer
var otelSemconv_2 = __toESM(require_error_3(), 1);
//@ chunk-9vvvg0d3.js:24144-24241 fingerprint (2.1.88 match: isBigQueryMetricsEnabled, 1)
/**
 * BigQuery 指标是否启用：隐私级别 default 且（Slt() 或 Claude.ai 的 team/enterprise 订阅）。
 */
function isBigQueryMetricsEnabled() {
  if (isTelemetryDisabled()) return false;
  let subscriptionType = getSubscriptionType();
  let isC4EOrTeamUser =
    isClaudeAISubscriber() && (subscriptionType === "enterprise" || subscriptionType === "team");
  return is1PApiCustomer() || isC4EOrTeamUser;
}
//@ chunk-9vvvg0d3.js:31114-31176 sole-consumer
var otelCore = __toESM(require_core(), 1);
var MAX_BUFFERED_RECORDS = 64;
var EXPORT_SUCCESS_RESULT = {
  code: otelCore.ExportResultCode.SUCCESS,
};
//@ chunk-9vvvg0d3.js:31176-31246 sole-consumer
function exportFailureResult(error) {
  return {
    code: otelCore.ExportResultCode.FAILED,
    error: Error(error),
  };
}
//@ chunk-9vvvg0d3.js:31246-31261 sole-consumer
function noopExportCallback() {}
//@ chunk-9vvvg0d3.js:31261-31823 sole-consumer
/**
 * 委托就绪前缓冲导出的导出器（span，支持 forceFlush）。
 */
class BufferingSpanExporter {
  delegate;
  buffer = [];
  shutDown = false;
  setDelegate(delegate) {
    if (this.shutDown) {
      delegate.shutdown().catch(() => {});
      return;
    }
    this.delegate = delegate;
    let buffer = this.buffer;
    this.buffer = [];
    for (let buffered of buffer) delegate.export(buffered, noopExportCallback);
  }
  export(record, callback) {
    if (this.shutDown) {
      callback(exportFailureResult("Exporter has been shut down"));
      return;
    }
    if (this.delegate) {
      this.delegate.export(record, callback);
      return;
    }
    if (this.buffer.length >= MAX_BUFFERED_RECORDS) this.buffer.shift();
    this.buffer.push(record);
    callback(EXPORT_SUCCESS_RESULT);
  }
  async forceFlush() {
    if (this.delegate?.forceFlush) await this.delegate.forceFlush();
  }
  async shutdown() {
    this.shutDown = true;
    this.buffer = [];
    if (this.delegate) await this.delegate.shutdown();
  }
}
//@ chunk-9vvvg0d3.js:31823-32304 sole-consumer
/**
 * 委托就绪前缓冲导出的导出器。
 */
class BufferingExporter {
  delegate;
  buffer = [];
  shutDown = false;
  setDelegate(delegate) {
    if (this.shutDown) {
      delegate.shutdown().catch(() => {});
      return;
    }
    this.delegate = delegate;
    let buffer = this.buffer;
    this.buffer = [];
    for (let buffered of buffer) delegate.export(buffered, noopExportCallback);
  }
  export(record, callback) {
    if (this.shutDown) {
      callback(exportFailureResult("Exporter has been shut down"));
      return;
    }
    if (this.delegate) {
      this.delegate.export(record, callback);
      return;
    }
    if (this.buffer.length >= MAX_BUFFERED_RECORDS) this.buffer.shift();
    this.buffer.push(record);
    callback(EXPORT_SUCCESS_RESULT);
  }
  async shutdown() {
    this.shutDown = true;
    this.buffer = [];
    if (this.delegate) await this.delegate.shutdown();
  }
}
//@ chunk-9vvvg0d3.js:32304-32322 sole-consumer
var otelCore_2 = __toESM(require_core(), 1);
//@ chunk-9vvvg0d3.js:32322-32920 sole-consumer
/**
 * OTLP 导出错误归类（grpc/http 状态、headers helper、超时等）。
 */
function classifyExportError(error, protocol) {
  let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (typeof code === "number" && Number.isInteger(code)) {
    if (protocol === "grpc" && code >= 0 && code <= 16)
      return {
        errorCode: `grpc_${code}`,
      };
    if (protocol !== "grpc" && code >= 300 && code < 600)
      return {
        errorCode: code === 401 || code === 403 ? `http_${code}` : `http_${Math.floor(code / 100)}xx`,
        httpStatus: code,
      };
  }
  let helperFailureKind = otelHeadersHelperFailureKind(error);
  if (helperFailureKind !== undefined)
    return {
      errorCode: `headers_helper_${helperFailureKind}`,
    };
  if (hasExactErrorMessage(error, "Request Timeout"))
    return {
      errorCode: "timeout",
    };
  if (hasExactErrorMessage(error, "Export failed with retryable status"))
    return {
      errorCode: "http_retries_exhausted",
    };
  let connectionErrorDetails = extractConnectionErrorDetails(error);
  return {
    errorCode:
      (connectionErrorDetails &&
        (sanitizableErrorCode(connectionErrorDetails.code) ??
          (connectionErrorDetails.isSSLError ? connectionErrorDetails.code : undefined))) ||
      "other",
  };
}
//@ chunk-9vvvg0d3.js:32920-33393 sole-consumer
function buildExporterDiagnostics(signal, transportInfo) {
  let baseAttrs = {
    signal: fromEnum(signal),
    protocol: fromEnum(
      transportInfo.protocol === "grpc"
        ? "grpc"
        : transportInfo.protocol === "http/json"
          ? "http_json"
          : transportInfo.protocol === "http/protobuf"
            ? "http_protobuf"
            : "other",
    ),
    ...(transportInfo.viaProxy === undefined
      ? {}
      : {
          via_proxy: transportInfo.viaProxy,
        }),
  };
  let reportedSuccess = false;
  let reportedKeys = new Set();
  return (result) => {
    if (result.code === otelCore_2.ExportResultCode.SUCCESS) {
      if (!reportedSuccess) {
        reportedSuccess = true;
        logFeatureOk("otlp_export", baseAttrs);
      }
      return;
    }
    let { errorCode, httpStatus } = classifyExportError(result.error, transportInfo.protocol);
    let reportKey = `${errorCode}:${httpStatus ?? ""}`;
    if (reportedKeys.has(reportKey)) return;
    reportedKeys.add(reportKey);
    logFeatureBad(
      "otlp_export",
      errorCode,
      httpStatus === undefined
        ? baseAttrs
        : {
            ...baseAttrs,
            http_status: httpStatus,
          },
    );
  };
}
//@ chunk-9vvvg0d3.js:33393-33443 sole-consumer
var DEFAULT_METRICS_EXPORT_INTERVAL_MS = 60000;
var DEFAULT_LOGS_EXPORT_INTERVAL_MS = 5000;
var DEFAULT_TRACES_EXPORT_INTERVAL_MS = 5000;
var MIN_METRICS_EXPORT_INTERVAL_MS = 300000;
var MAX_METRICS_EXPORT_INTERVAL_MS = 3600000;
//@ chunk-9vvvg0d3.js:33443-33467 affinity
class TelemetryTimeoutError extends Error {}
//@ chunk-9vvvg0d3.js:33467-33559 callgraph-witnessed (2.1.88 match: telemetryTimeout, 1)
function telemetryTimeout(ms, message) {
  return new Promise((resolve, reject) => {
    setTimeout((rej, msg) => rej(new TelemetryTimeoutError(msg)), ms, reject, message).unref();
  });
}
//@ chunk-9vvvg0d3.js:33559-33759 sole-consumer
/**
 * OTel 全局配置：注册 AsyncLocalStorage 上下文管理器，未设置时把 OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE 设为 delta。
 */
function configureOtelGlobals() {
  import_api.context.setGlobalContextManager(otelContextManager);
  if (!env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE)
    process.env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE = "delta";
  if (isBetaTracingEnabled() && !getTracerProvider()) initializeBetaTracing();
}
//@ chunk-9vvvg0d3.js:33759-34768 sole-consumer
function getServiceVersion() {
  return hasRemoteOtelLogsEndpoint()
    ? firstLineOf(
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
        }.VERSION,
        "-",
      )
    : {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION;
}
//@ chunk-9vvvg0d3.js:34883-35485 sole-consumer
/**
 * OTel resource：service.name=claude-code、service.version、os/arch、wsl.version 及 OTEL_RESOURCE_ATTRIBUTES。
 */
function buildOtelResource() {
  let cachedTelemetryResource = getCachedTelemetryResource();
  if (cachedTelemetryResource) return cachedTelemetryResource;
  let platform = getPlatform();
  let coreAttrs = {
    [otelSemconv_2.ATTR_SERVICE_NAME]: "claude-code",
    [otelSemconv_2.ATTR_SERVICE_VERSION]: getServiceVersion(),
  };
  if (platform === "wsl") {
    let wslVersion = getWslVersion();
    if (wslVersion) coreAttrs["wsl.version"] = wslVersion;
  }
  let serviceResource = import_resources.resourceFromAttributes(coreAttrs);
  let osResource = import_resources.resourceFromAttributes(
    hasRemoteOtelLogsEndpoint() ? {} : import_resources.osDetector.detect().attributes || {},
  );
  let hostResource = import_resources.resourceFromAttributes({
    [otelSemconv_2.SEMRESATTRS_HOST_ARCH]: normalizeArchForOtel(arch()),
  });
  let identityAttrs = gatewayIdentityAttributes();
  let hasIdentity = Object.keys(identityAttrs).length > 0;
  let attributes = import_resources.envDetector.detect().attributes || {};
  let envAttrs = import_resources.resourceFromAttributes(
    isTracesRelayed()
      ? {}
      : hasIdentity
        ? import_reject(
            attributes,
            (attrKey, attrName) => attrName.startsWith("user.") || attrName.startsWith("identity."),
          )
        : attributes,
  );
  let mergedResource = serviceResource
    .merge(osResource)
    .merge(hostResource)
    .merge(envAttrs)
    .merge(import_resources.resourceFromAttributes(identityAttrs));
  setCachedTelemetryResource(mergedResource);
  return mergedResource;
}
//@ chunk-9vvvg0d3.js:35485-36594 fingerprint (2.1.88 match: initializeBetaTracing, 0.51)
/**
 * beta 详细追踪：把 trace/log 发到 BETA_TRACING_ENDPOINT。
 */
function initializeBetaTracing() {
  let resource = buildOtelResource();
  let spanExporter = new BufferingSpanExporter();
  let spanProcessor = new BatchSpanProcessor(spanExporter, {
    scheduledDelayMillis: DEFAULT_TRACES_EXPORT_INTERVAL_MS,
  });
  let tracerProvider = new BasicTracerProvider({
    resource,
    spanProcessors: [spanProcessor],
  });
  import_api.trace.setGlobalTracerProvider(tracerProvider);
  setTracerProvider(tracerProvider);
  let logExporter = new BufferingExporter();
  let loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor(logExporter, {
        scheduledDelayMillis: DEFAULT_LOGS_EXPORT_INTERVAL_MS,
      }),
    ],
  });
  diagnosticTracker.setGlobalLoggerProvider(loggerProvider);
  setLoggerProvider(loggerProvider);
  let eventLogger = diagnosticTracker.getLogger(
    "com.anthropic.claude_code.events",
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
    }.VERSION,
  );
  setEventLogger(eventLogger, "beta");
  process.on("beforeExit", async () => {
    await loggerProvider.forceFlush().catch(() => {});
    await tracerProvider.forceFlush().catch(() => {});
  });
  process.on("exit", () => {
    loggerProvider.forceFlush().catch(() => {});
    tracerProvider.forceFlush().catch(() => {});
  });
  initializeBetaTracingExporters(spanExporter, logExporter).catch((error) =>
    logForDebugging(`Beta tracing exporter wiring failed: ${error}`, {
      level: "error",
    }),
  );
}
//@ chunk-9vvvg0d3.js:36594-36876 layout
/**
 * beta 追踪导出器：把 trace 与 log 分别发往 BETA_TRACING_ENDPOINT/v1/traces 与 /v1/logs。
 */
async function initializeBetaTracingExporters(traceExporter, logExporter) {
  let BETA_TRACING_ENDPOINT = env.BETA_TRACING_ENDPOINT;
  if (!BETA_TRACING_ENDPOINT) return;
  let [{ OTLPTraceExporter }, { OTLPLogExporter }] = await Promise.all([
    import("../../../vendor/@opentelemetry/exporter-trace-otlp-http/build/src/platform/node/OTLPTraceExporter.js"),
    import("../../../vendor/@opentelemetry/exporter-logs-otlp-http/build/src/platform/node/OTLPLogExporter.js"),
  ]);
  traceExporter.setDelegate(
    new OTLPTraceExporter({
      url: `${BETA_TRACING_ENDPOINT}/v1/traces`,
    }),
  );
  logExporter.setDelegate(
    new OTLPLogExporter({
      url: `${BETA_TRACING_ENDPOINT}/v1/logs`,
    }),
  );
}
//@ chunk-9vvvg0d3.js:36876-36897 layout
async function initializeAntTelemetry() {}
//@ chunk-9vvvg0d3.js:36897-37003 file-local
function parseExporterTypes(value) {
  return (value || "")
    .trim()
    .split(",")
    .filter(Boolean)
    .map((t) => t.trim())
    .filter((t) => t !== "none");
}
//@ chunk-9vvvg0d3.js:37003-37369 layout
function wrapExporterWithFirstExportLog(signal, transportInfo) {
  let reportedFirstExport = false;
  let diagnostics = transportInfo && buildExporterDiagnostics(signal, transportInfo);
  return (wrapExporter) => {
    let diagnostics_2 =
      wrapExporter instanceof import_sdk_metrics.ConsoleMetricExporter ||
      wrapExporter instanceof ConsoleLogRecordExporter ||
      wrapExporter instanceof ConsoleSpanExporter
        ? undefined
        : diagnostics;
    let boundExport = wrapExporter.export.bind(wrapExporter);
    wrapExporter.export = (record, callback) =>
      boundExport(record, (result) => {
        if (!reportedFirstExport) {
          reportedFirstExport = true;
          logForDebugging(
            `[3P telemetry] First ${signal} export: ${result.code === import_core.ExportResultCode.SUCCESS ? "SUCCESS" : `FAILED (${result.error?.message ?? "unknown"})`}`,
          );
        }
        try {
          diagnostics_2?.(result);
        } catch (error) {
          logError(error);
        }
        callback(result);
      });
    return wrapExporter;
  };
}
//@ chunk-9vvvg0d3.js:37369-37511 layout
function describeExporterTransport(protocol, httpConfig) {
  return {
    protocol,
    viaProxy:
      protocol === "grpc"
        ? undefined
        : httpConfig.httpAgentOptions === getCachedOtlpHttpAgentFactory(true, "strict") ||
          httpConfig.httpAgentOptions === getCachedOtlpHttpAgentFactory(true, "customer"),
  };
}
//@ chunk-9vvvg0d3.js:37511-37796 layout
/**
 * 收集 OTLP 请求头：OTEL_EXPORTER_OTLP_HEADERS、OTEL_EXPORTER_OTLP_<SIGNAL>_HEADERS 与 otelHeadersHelper 输出。
 */
function getOtlpHeaders(signal, httpConfig) {
  let unsetHeaders =
    httpConfig.onlyConfigHeaders === true
      ? ["OTEL_EXPORTER_OTLP_HEADERS", `OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[signal]}_HEADERS`].flatMap(
          (headerName) => {
            let headerValue = env[headerName];
            return headerValue === undefined
              ? []
              : [
                  {
                    name: headerName,
                    value: headerValue,
                  },
                ];
          },
        )
      : [];
  for (let { name: headerName_2 } of unsetHeaders) env.unset(headerName_2);
  return {
    [Symbol.dispose]() {
      for (let { name: headerName_3, value: headerValue_2 } of unsetHeaders)
        env.set(headerName_3, headerValue_2);
    },
  };
}
//@ chunk-9vvvg0d3.js:37796-39309 fingerprint (2.1.88 match: getOtlpReaders, 0.626)
/**
 * 按 OTEL_METRICS_EXPORTER（otlp/prometheus/console）和 OTEL_EXPORTER_OTLP_PROTOCOL 创建 metric reader，导出间隔 OTEL_METRIC_EXPORT_INTERVAL（默认 60 秒）。
 */
async function getOtlpReaders(exporterTypes) {
  let OTEL_METRIC_EXPORT_INTERVAL = env.OTEL_METRIC_EXPORT_INTERVAL ?? DEFAULT_METRICS_EXPORT_INTERVAL_MS;
  logForDebugging(
    `[3P telemetry] getOtlpReaders: types=${jsonStringify(exporterTypes)}, interval=${OTEL_METRIC_EXPORT_INTERVAL}, protocol=${env.OTEL_EXPORTER_OTLP_PROTOCOL}, endpoint=${env.OTEL_EXPORTER_OTLP_ENDPOINT}`,
  );
  let exporters = [];
  let transport;
  for (let exporterType of exporterTypes)
    if (exporterType === "console") {
      let consoleExporter = new import_sdk_metrics.ConsoleMetricExporter();
      let originalExport = consoleExporter.export.bind(consoleExporter);
      consoleExporter.export = (metrics, callback) => {
        if (metrics.resource && metrics.resource.attributes) {
          logForDebugging(`
=== Resource Attributes ===`);
          logForDebugging(jsonStringify(metrics.resource.attributes));
          logForDebugging(`===========================
`);
        }
        return originalExport(metrics, callback);
      };
      exporters.push(consoleExporter);
    } else if (exporterType === "otlp") {
      let protocol = env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL;
      let httpConfig = getOTLPExporterConfig("metrics", protocol);
      switch (((transport = describeExporterTransport(protocol, httpConfig)), protocol)) {
        case "grpc": {
          let { OTLPMetricExporter } =
            await import("../../../vendor/@opentelemetry/exporter-metrics-otlp-grpc/build/src/index.js").then(
              (otlpModule) => __toESM(otlpModule.default, 1),
            );
          exporters.push(new OTLPMetricExporter());
          break;
        }
        case "http/json": {
          let { OTLPMetricExporter } =
            await import("../../../vendor/@opentelemetry/exporter-metrics-otlp-http/index.js").then((ns_2) =>
              __toESM(ns_2.default, 1),
            );
          using otlpHeaders = getOtlpHeaders("metrics", httpConfig);
          exporters.push(new OTLPMetricExporter(httpConfig));
          break;
        }
        case "http/protobuf": {
          let { OTLPMetricExporter } =
            await import("../../../vendor/@opentelemetry/exporter-metrics-otlp-proto/build/src/platform/node/OTLPMetricExporter.js");
          using otlpHeaders = getOtlpHeaders("metrics", httpConfig);
          exporters.push(new OTLPMetricExporter(httpConfig));
          break;
        }
        default:
          throw Error(
            `Unknown protocol set in OTEL_EXPORTER_OTLP_METRICS_PROTOCOL or OTEL_EXPORTER_OTLP_PROTOCOL env var: ${protocol}`,
          );
      }
    } else if (exporterType === "prometheus") {
      let { PrometheusExporter } =
        await import("../../../vendor/@opentelemetry/exporter-prometheus/build/src/index.js").then((ns_3) =>
          __toESM(ns_3.default, 1),
        );
      exporters.push(new PrometheusExporter());
    } else throw Error(`Unknown exporter type set in OTEL_METRICS_EXPORTER env var: ${exporterType}`);
  let wrap = wrapExporterWithFirstExportLog("metrics", transport);
  return exporters.map((exporter) => {
    if ("export" in exporter)
      return new import_sdk_metrics.PeriodicExportingMetricReader({
        exporter: wrap(exporter),
        exportIntervalMillis: OTEL_METRIC_EXPORT_INTERVAL,
      });
    return exporter;
  });
}
//@ chunk-9vvvg0d3.js:39309-40257 fingerprint (2.1.88 match: getOtlpLogExporters, 0.86)
/**
 * 按 OTEL_LOGS_EXPORTER 创建日志导出器（otlp/console）。
 */
async function getOtlpLogExporters() {
  let exporterTypes = parseExporterTypes(env.OTEL_LOGS_EXPORTER);
  let protocol = env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL;
  let endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  logForDebugging(
    `[3P telemetry] getOtlpLogExporters: types=${jsonStringify(exporterTypes)}, protocol=${protocol}, endpoint=${endpoint}`,
  );
  let exporters = [];
  let transport;
  for (let exporterType of exporterTypes)
    if (exporterType === "console") exporters.push(new ConsoleLogRecordExporter());
    else if (exporterType === "otlp") {
      let httpConfig = getOTLPExporterConfig("logs", protocol);
      switch (((transport = describeExporterTransport(protocol, httpConfig)), protocol)) {
        case "grpc": {
          let { OTLPLogExporter } =
            await import("../../../vendor/@opentelemetry/exporter-logs-otlp-grpc/build/src/index.js").then(
              (otlpModule) => __toESM(otlpModule.default, 1),
            );
          exporters.push(new OTLPLogExporter());
          break;
        }
        case "http/json": {
          let { OTLPLogExporter } =
            await import("../../../vendor/@opentelemetry/exporter-logs-otlp-http/build/src/platform/node/OTLPLogExporter.js");
          using otlpHeaders = getOtlpHeaders("logs", httpConfig);
          exporters.push(new OTLPLogExporter(httpConfig));
          break;
        }
        case "http/protobuf": {
          let { OTLPLogExporter } =
            await import("../../../vendor/@opentelemetry/exporter-logs-otlp-proto/build/src/platform/node/OTLPLogExporter.js");
          using otlpHeaders = getOtlpHeaders("logs", httpConfig);
          exporters.push(new OTLPLogExporter(httpConfig));
          break;
        }
        default:
          throw Error(
            `Unknown protocol set in OTEL_EXPORTER_OTLP_LOGS_PROTOCOL or OTEL_EXPORTER_OTLP_PROTOCOL env var: ${protocol}`,
          );
      }
    } else throw Error(`Unknown exporter type set in OTEL_LOGS_EXPORTER env var: ${exporterType}`);
  return exporters.map(wrapExporterWithFirstExportLog("logs", transport));
}
//@ chunk-9vvvg0d3.js:40257-41145 fingerprint (2.1.88 match: getOtlpTraceExporters, 0.811)
/**
 * 按 OTEL_TRACES_EXPORTER 创建 trace 导出器。
 */
async function getOtlpTraceExporters() {
  let exporterTypes = parseExporterTypes(env.OTEL_TRACES_EXPORTER);
  let exporters = [];
  let transport;
  for (let exporterType of exporterTypes)
    if (exporterType === "console") exporters.push(new ConsoleSpanExporter());
    else if (exporterType === "otlp") {
      let protocol =
        ccrTracesRelayUrl() !== null
          ? "http/protobuf"
          : env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL;
      let otlpExporterConfig = getOTLPExporterConfig("traces", protocol);
      if (!isCcrTracesEndpoint()) transport = describeExporterTransport(protocol, otlpExporterConfig);
      switch (protocol) {
        case "grpc": {
          let { OTLPTraceExporter } =
            await import("../../../vendor/@opentelemetry/exporter-trace-otlp-grpc/build/src/index.js").then(
              (otlpModule) => __toESM(otlpModule.default, 1),
            );
          exporters.push(new OTLPTraceExporter());
          break;
        }
        case "http/json": {
          let { OTLPTraceExporter } =
            await import("../../../vendor/@opentelemetry/exporter-trace-otlp-http/build/src/platform/node/OTLPTraceExporter.js");
          using otlpHeaders = getOtlpHeaders("traces", otlpExporterConfig);
          exporters.push(new OTLPTraceExporter(otlpExporterConfig));
          break;
        }
        case "http/protobuf": {
          let { OTLPTraceExporter } =
            await import("../../../vendor/@opentelemetry/exporter-trace-otlp-proto/build/src/platform/node/OTLPTraceExporter.js");
          using otlpHeaders = getOtlpHeaders("traces", otlpExporterConfig);
          exporters.push(new OTLPTraceExporter(otlpExporterConfig));
          break;
        }
        default:
          throw Error(
            `Unknown protocol set in OTEL_EXPORTER_OTLP_TRACES_PROTOCOL or OTEL_EXPORTER_OTLP_PROTOCOL env var: ${protocol}`,
          );
      }
    } else throw Error(`Unknown exporter type set in OTEL_TRACES_EXPORTER env var: ${exporterType}`);
  return exporters.map(wrapExporterWithFirstExportLog("traces", transport));
}
//@ chunk-9vvvg0d3.js:41145-41211 fingerprint (2.1.88 match: isTelemetryEnabled, 1)
/**
 * CLAUDE_CODE_ENABLE_TELEMETRY 是否为真（第三方 OTel 导出总开关）。
 */
function isTelemetryEnabled() {
  return isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY);
}
//@ chunk-9vvvg0d3.js:41211-41333 layout
/**
 * BigQuery 指标导出间隔：GrowthBook tengu_cozy_dusk，限制在 5–60 分钟，默认 5 分钟。
 */
function getBigQueryExportIntervalMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_cozy_dusk",
    MIN_METRICS_EXPORT_INTERVAL_MS,
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE)
    ? Math.min(
        Math.max(featureValue_CACHED_MAY_BE_STALE, MIN_METRICS_EXPORT_INTERVAL_MS),
        MAX_METRICS_EXPORT_INTERVAL_MS,
      )
    : MIN_METRICS_EXPORT_INTERVAL_MS;
}
//@ chunk-9vvvg0d3.js:41333-41489 fingerprint (2.1.88 match: getBigQueryExportingReader, 0.665)
/**
 * BigQuery 指标 reader，导出间隔 tengu_cozy_dusk（默认 5 分钟）。
 */
function getBigQueryExportingReader(storageV5) {
  let bigqueryExporter = new BigQueryMetricsExporter({
    storageV5,
  });
  registerCleanup(() => bigqueryExporter.armShutdownReport());
  return new import_sdk_metrics.PeriodicExportingMetricReader({
    exporter: bigqueryExporter,
    exportIntervalMillis: getBigQueryExportIntervalMs(),
  });
}
//@ chunk-9vvvg0d3.js:41489-44472 fingerprint (2.1.88 match: initializeTelemetry, 0.806)
/**
 * 初始化 OTel：设置传播器与诊断 logger；CLAUDE_CODE_ENABLE_TELEMETRY 时按 OTEL_METRICS_EXPORTER 建 metric reader，team/enterprise 另加 BigQuery 指标；按 OTEL_LOGS_EXPORTER 建事件 logger（com.anthropic.claude_code.events）；增强遥测时按 OTEL_TRACES_EXPORTER 建 trace；注册退出 flush。
 */
async function initializeTelemetry(storageV5, options) {
  profileCheckpoint("telemetry_init_start");
  configureOtelGlobals();
  await initializeAntTelemetry();
  import_api.propagation.setGlobalPropagator(new import_core.W3CTraceContextPropagator());
  if (getHasFormattedOutput())
    for (let key of ["OTEL_METRICS_EXPORTER", "OTEL_LOGS_EXPORTER", "OTEL_TRACES_EXPORTER"]) {
      let v = process.env[key];
      if (v?.includes("console"))
        process.env[key] = v
          .split(",")
          .map((value_3) => value_3.trim())
          .filter((value_2) => value_2 !== "console")
          .join(",");
    }
  import_api.diag.setLogger(
    new ClaudeCodeDiagLogger(),
    env.CLAUDE_CODE_IS_COWORK ? import_api.DiagLogLevel.WARN : import_api.DiagLogLevel.ERROR,
  );
  initializePerfettoTracing();
  let readers = [];
  let telemetryEnabled = isTelemetryEnabled();
  let exporterTypes = telemetryEnabled ? parseExporterTypes(env.OTEL_METRICS_EXPORTER) : [];
  logForDebugging(
    `[3P telemetry] isTelemetryEnabled=${telemetryEnabled} (CLAUDE_CODE_ENABLE_TELEMETRY=${process.env.CLAUDE_CODE_ENABLE_TELEMETRY})`,
  );
  if (telemetryEnabled) readers.push(...(await getOtlpReaders(exporterTypes)));
  if (!options?.disableBigQuery && isBigQueryMetricsEnabled())
    readers.push(getBigQueryExportingReader(storageV5));
  let platform = buildOtelResource();
  if (isBetaTracingEnabled()) {
    if (!getTracerProvider()) initializeBetaTracing();
    let meterProvider = new import_sdk_metrics.MeterProvider({
      resource: platform,
      views: [],
      readers,
    });
    replaceMeterProvider(meterProvider);
    registerCleanup(async () => {
      let timeoutMs = env.CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS ?? 2000;
      try {
        endInteractionSpan();
        let loggerProvider = getLoggerProvider();
        let tracerProvider = getTracerProvider();
        let chains = [meterProvider.shutdown()];
        if (loggerProvider)
          chains.push(
            eventRecordQueue
              .settledWithin(timeoutMs / 2)
              .then(() => loggerProvider.forceFlush())
              .then(() => loggerProvider.shutdown()),
          );
        if (tracerProvider) chains.push(tracerProvider.forceFlush().then(() => tracerProvider.shutdown()));
        await Promise.race([
          Promise.all(chains),
          telemetryTimeout(timeoutMs, "OpenTelemetry shutdown timeout"),
        ]);
      } catch {}
    });
    return {
      meter: meterProvider.getMeter("com.anthropic.claude_code", getServiceVersion()),
      metricsExporterKinds: exporterTypes,
    };
  }
  let meterProvider = new import_sdk_metrics.MeterProvider({
    resource: platform,
    views: [],
    readers,
  });
  replaceMeterProvider(meterProvider);
  if (telemetryEnabled && (!isDiskless() || hasRemoteOtelLogsEndpoint())) {
    let logExporters = await getOtlpLogExporters();
    logForDebugging(`[3P telemetry] Created ${logExporters.length} log exporter(s)`);
    if (logExporters.length > 0) {
      let loggerProvider = new LoggerProvider({
        resource: platform,
        processors: logExporters.map(
          (exporter) =>
            new BatchLogRecordProcessor(exporter, {
              scheduledDelayMillis: env.OTEL_LOGS_EXPORT_INTERVAL ?? DEFAULT_LOGS_EXPORT_INTERVAL_MS,
            }),
        ),
      });
      if (!isDiskless()) diagnosticTracker.setGlobalLoggerProvider(loggerProvider);
      setLoggerProvider(loggerProvider);
      let eventLogger = loggerProvider.getLogger("com.anthropic.claude_code.events", getServiceVersion());
      setEventLogger(eventLogger, "org");
      logForDebugging("[3P telemetry] Event logger set successfully");
      process.on("beforeExit", async () => {
        await loggerProvider?.forceFlush();
        await getTracerProvider()?.forceFlush();
      });
      process.on("exit", () => {
        loggerProvider?.forceFlush();
        getTracerProvider()?.forceFlush();
      });
    }
  }
  if (telemetryEnabled && isEnhancedTelemetryEnabled() && !isDiskless()) {
    let traceExporters = await getOtlpTraceExporters();
    if (traceExporters.length > 0) {
      tracesRelayedLatch.freeze();
      let maxExportBatchSize = isTracesRelayed() ? TRACE_RELAY_BATCH_MS : undefined;
      let spanProcessors = traceExporters.map(
        (exporter) =>
          new BatchSpanProcessor(exporter, {
            scheduledDelayMillis: env.OTEL_TRACES_EXPORT_INTERVAL ?? DEFAULT_TRACES_EXPORT_INTERVAL_MS,
            ...(maxExportBatchSize !== undefined && {
              maxExportBatchSize,
            }),
          }),
      );
      let tracerProvider = new BasicTracerProvider({
        resource: platform,
        spanProcessors,
      });
      import_api.trace.setGlobalTracerProvider(tracerProvider);
      setTracerProvider(tracerProvider);
      process.on("beforeExit", async () => {
        await tracerProvider.forceFlush();
      });
    }
  }
  registerCleanup(async () => {
    let timeoutMs = env.CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS ?? 2000;
    try {
      endInteractionSpan();
      let shutdownPromises = [meterProvider.shutdown()];
      let loggerProvider = getLoggerProvider();
      if (loggerProvider)
        shutdownPromises.push(
          eventRecordQueue.settledWithin(timeoutMs / 2).then(() => loggerProvider.shutdown()),
        );
      let tracerProvider = getTracerProvider();
      if (tracerProvider) shutdownPromises.push(tracerProvider.shutdown());
      await Promise.race([
        Promise.all(shutdownPromises),
        telemetryTimeout(timeoutMs, "OpenTelemetry shutdown timeout"),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout"))
        logForDebugging(
          `
OpenTelemetry telemetry flush timed out after ${timeoutMs}ms

To resolve this issue, you can:
1. Increase the timeout by setting CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS env var (e.g., 5000 for 5 seconds)
2. Check if your OpenTelemetry backend is experiencing scalability issues
3. Disable OpenTelemetry by unsetting CLAUDE_CODE_ENABLE_TELEMETRY env var

Current timeout: ${timeoutMs}ms
`,
          {
            level: "error",
          },
        );
      throw error;
    }
  });
  return {
    meter: meterProvider.getMeter("com.anthropic.claude_code", getServiceVersion()),
    metricsExporterKinds: exporterTypes,
  };
}
//@ chunk-9vvvg0d3.js:44472-44991 fingerprint (2.1.88 match: flushTelemetry, 0.963)
/**
 * flush 全部 OTel provider，超时记录日志。
 */
async function flushTelemetry() {
  let meterProvider = getMeterProvider();
  if (!meterProvider) return;
  let timeoutMs = env.CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS ?? 5000;
  try {
    let flushPromises = [meterProvider.forceFlush()];
    let loggerProvider = getLoggerProvider();
    if (loggerProvider)
      flushPromises.push(
        eventRecordQueue.settledWithin(timeoutMs / 2).then(() => loggerProvider.forceFlush()),
      );
    let tracerProvider = getTracerProvider();
    if (tracerProvider) flushPromises.push(tracerProvider.forceFlush());
    await Promise.race([
      Promise.all(flushPromises),
      telemetryTimeout(timeoutMs, "OpenTelemetry flush timeout"),
    ]);
    logForDebugging("Telemetry flushed successfully");
  } catch (error) {
    if (error instanceof TelemetryTimeoutError)
      logForDebugging(`Telemetry flush timed out after ${timeoutMs}ms. Some metrics may not be exported.`, {
        level: "warn",
      });
    else
      logForDebugging(`Telemetry flush failed: ${errorMessage(error)}`, {
        level: "error",
      });
  }
}
//@ chunk-9vvvg0d3.js:44991-45159 fingerprint (2.1.88 match: parseOtelHeadersEnvVar, 1)
function parseOtelHeadersEnvVar() {
  let headers = {};
  let envHeaders = env.OTEL_EXPORTER_OTLP_HEADERS;
  if (envHeaders)
    for (let pair of envHeaders.split(",")) {
      let [key, ...valueParts] = pair.split("=");
      if (key && valueParts.length > 0) headers[key.trim()] = valueParts.join("=").trim();
    }
  return headers;
}
//@ chunk-9vvvg0d3.js:45159-46457 callgraph-witnessed (2.1.88 match: getOTLPExporterConfig, 0.158)
/**
 * OTLP 导出器配置：endpoint（OTEL_EXPORTER_OTLP_<SIGNAL>_ENDPOINT/ENDPOINT + /v1/<signal>）、headers（含 otelHeadersHelper）、代理与 mTLS。
 */
function getOTLPExporterConfig(signal, protocol) {
  let usesHeadersHelper = !!getConfiguredOtelHeadersHelper();
  let config = {};
  let staticHeaders = getGatewayAuth();
  let managedCollectorUrl = isGatewayAuthPinned(staticHeaders)
    ? gatewayManagedCollectorUrl(signal, staticHeaders, usesHeadersHelper)
    : null;
  if (isGatewayAuthPinned(staticHeaders) && managedCollectorUrl === null) {
    let url = staticHeaders.url;
    config.url = `${url}/v1/${signal}`;
    config.headers = async () => {
      await refreshGatewayToken();
      let dynamicHeaders = getGatewayAuth();
      if (!dynamicHeaders || dynamicHeaders.url !== url) return {};
      return {
        Authorization: `Bearer ${dynamicHeaders.jwt}`,
      };
    };
    config.httpAgentOptions = createOtlpAgentFactory(url, {
      carriesOurToken: false,
    });
    return config;
  }
  let remoteEndpoint = isGatewayAuthPinned(staticHeaders) ? null : getRemoteOtlpEndpoint(signal);
  if (remoteEndpoint !== null) {
    config.url = remoteEndpoint;
    config.headers = async () => {
      if (getRemoteOtlpEndpoint(signal) !== remoteEndpoint) return {};
      return configureApiKeyHeaders(env.CLAUDE_CODE_SESSION_ACCESS_TOKEN);
    };
    config.httpAgentOptions = createOtlpAgentFactory(remoteEndpoint, {
      carriesOurToken: true,
    });
    return config;
  }
  let caCerts = parseOtelHeadersEnvVar();
  let gatewayRelay = gatewayRelayConfig(signal, usesHeadersHelper);
  let ccrRelay = ccrTraceRelayConfig(signal);
  if (ccrRelay.send) {
    config.url = ccrRelay.url;
    config.headers = ccrRelay.headers;
    config.httpAgentOptions = createOtlpAgentFactory(ccrRelay.url, {
      carriesOurToken: true,
    });
    tracesRelayedLatch.arm();
    return config;
  }
  if (usesHeadersHelper) {
    config.headers = async () => {
      let otelHeadersFromHelper = await getOtelHeadersFromHelper();
      return {
        ...caCerts,
        ...otelHeadersFromHelper,
      };
    };
    if (protocol === "http/json" || protocol === "http/protobuf") prefetchOtelHeadersFromHelper();
  } else if (gatewayRelay.send) {
    config.url = gatewayRelay.url;
    config.headers = gatewayRelay.headers;
    config.onlyConfigHeaders = true;
    config.httpAgentOptions = createOtlpAgentFactory(gatewayRelay.url, {
      carriesOurToken: false,
    });
    return config;
  } else if (Object.keys(caCerts).length > 0) config.headers = async () => caCerts;
  let httpAgentOptions = createOtlpAgentFactory(
    managedCollectorUrl ??
      (process.env[`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[signal]}_ENDPOINT`]?.trim() ||
        env.OTEL_EXPORTER_OTLP_ENDPOINT),
    {
      carriesOurToken: false,
    },
  );
  config.httpAgentOptions = httpAgentOptions;
  if (managedCollectorUrl !== null) {
    config.url = managedCollectorUrl;
    let url = staticHeaders?.url;
    let headers = config.headers;
    config.headers = async () => {
      if (getGatewayAuth()?.url !== url)
        throw Error(
          "The Cloud gateway session that named this collector ended \u2014 dropping this telemetry batch",
        );
      return typeof headers === "function" ? await headers() : {};
    };
  }
  return config;
}
//@ chunk-9vvvg0d3.js:46457-46731 sole-consumer
function gatewayManagedCollectorUrl(signal, auth, usesHeadersHelper) {
  if (usesHeadersHelper) return null;
  let url = resolveOtlpEndpoint(remotePolicySettings()?.env, signal);
  if (url === null) return null;
  if (
    envOtlpEndpoint(signal) !== url ||
    isGatewayHost(url, auth) ||
    !isAllowedCollectorUrl(url) ||
    !isOtlpSignalPath(url, signal)
  )
    return null;
  logForDebugging(
    `[3P telemetry] ${signal}: exporting to the collector the gateway's managed settings name (${redactUrlsInText(url)}), not through the gateway relay`,
  );
  return url;
}
//@ chunk-9vvvg0d3.js:46731-46833 sole-consumer
function remotePolicySettings() {
  if (getPolicySettingsOrigin() !== "remote") return null;
  if (!isRemoteManagedSettingsVerified() && getRemoteSettingsPathOverride() === undefined) return null;
  return getAllPolicyTierSettings()[0] ?? null;
}
//@ chunk-9vvvg0d3.js:46833-47009 sole-consumer
function envOtlpEndpoint(signal) {
  let suffix = SIGNAL_ENV_SUFFIX[signal];
  return resolveOtlpEndpoint(
    {
      OTEL_EXPORTER_OTLP_ENDPOINT: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      [`OTEL_EXPORTER_OTLP_${suffix}_ENDPOINT`]: env[`OTEL_EXPORTER_OTLP_${suffix}_ENDPOINT`],
    },
    signal,
  );
}
//@ chunk-9vvvg0d3.js:47009-47368 sole-consumer
/**
 * 从环境映射中解析某信号的 OTLP 端点（专用或通用 + /v1/<信号>）。
 */
function resolveOtlpEndpoint(source, signal) {
  if (!source) return null;
  let byUpper = new Map();
  for (let [key, value] of Object.entries(source)) {
    let upper = key.toUpperCase();
    if (value !== undefined && (!byUpper.has(upper) || key === upper)) byUpper.set(upper, value);
  }
  let signalEndpoint = byUpper.get(`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[signal]}_ENDPOINT`);
  if (signalEndpoint?.trim()) return normalizeHttpUrl(signalEndpoint);
  let baseEndpoint = byUpper.get("OTEL_EXPORTER_OTLP_ENDPOINT");
  if (!baseEndpoint?.trim() || normalizeHttpUrl(baseEndpoint) === null) return null;
  return normalizeHttpUrl(`${baseEndpoint}${baseEndpoint.endsWith("/") ? "" : "/"}v1/${signal}`);
}
//@ chunk-9vvvg0d3.js:47368-47557 sole-consumer
function isGatewayHost(url, auth) {
  let endpointHost = hostOfUrl(url);
  if (endpointHost === null) return false;
  let allowedHosts = [auth.url];
  let jwtPayload = decodeJwtPayload(auth.jwt);
  if (
    jwtPayload !== null &&
    typeof jwtPayload === "object" &&
    "iss" in jwtPayload &&
    typeof jwtPayload.iss === "string"
  )
    allowedHosts.push(jwtPayload.iss);
  return allowedHosts.some((host) => hostOfUrl(host) === endpointHost);
}
//@ chunk-9vvvg0d3.js:47557-47644 sole-consumer
function hostOfUrl(url) {
  let normalized = normalizeHttpUrl(url);
  return normalized === null ? null : new URL(normalized).host.replace(/\.(?=:|$)/, "");
}
//@ chunk-9vvvg0d3.js:47644-47737 sole-consumer
function isOtlpSignalPath(url, signal) {
  let parsed = new URL(url);
  return parsed.pathname.endsWith(`/v1/${signal}`) && !parsed.search && !parsed.hash;
}
//@ chunk-9vvvg0d3.js:47737-47832 sole-consumer
function isAllowedCollectorUrl(url) {
  let parsed = new URL(url);
  return parsed.protocol === "https:" || (parsed.protocol === "http:" && isLoopbackUrl(parsed.href));
}
//@ chunk-9vvvg0d3.js:47832-47958 sole-consumer
function normalizeHttpUrl(url) {
  try {
    let parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.host ? parsed.href : null;
  } catch {
    return null;
  }
}
//@ chunk-9vvvg0d3.js:47958-48457 sole-consumer
/**
 * 宿主托管网关令牌时经网关中继导出的配置。
 */
function gatewayRelayConfig(signal, usesHeadersHelper) {
  let disabled = {
    send: false,
  };
  let toSignalUrl = (baseUrl) => {
    if (!baseUrl || normalizeHttpUrl(baseUrl) === null) return null;
    let signalUrl = normalizeHttpUrl(`${baseUrl.replace(/\/+$/, "")}/v1/${signal}`);
    return signalUrl !== null && isAllowedCollectorUrl(signalUrl) && isOtlpSignalPath(signalUrl, signal)
      ? signalUrl
      : null;
  };
  if (!isHostManagedProviderAuth()) return disabled;
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty" && apiProvider !== "gateway") return disabled;
  if (!isGatewayToken(env.ANTHROPIC_AUTH_TOKEN)) return disabled;
  if (usesHeadersHelper) return disabled;
  let relayUrl = toSignalUrl(env.ANTHROPIC_BASE_URL);
  if (!relayUrl) return disabled;
  if (envOtlpEndpoint(signal) !== relayUrl) return disabled;
  return {
    send: true,
    url: relayUrl,
    headers: async () => {
      let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
      return ANTHROPIC_AUTH_TOKEN &&
        isGatewayToken(ANTHROPIC_AUTH_TOKEN) &&
        toSignalUrl(env.ANTHROPIC_BASE_URL) === relayUrl
        ? {
            Authorization: `Bearer ${ANTHROPIC_AUTH_TOKEN}`,
          }
        : {};
    },
  };
}
//@ chunk-9vvvg0d3.js:48457-48468 sole-consumer
var TRACE_RELAY_BATCH_MS = 100;
//@ chunk-9vvvg0d3.js:48468-48601 sole-consumer
function ccrTraceRelayConfig(signal) {
  let disabled = {
    send: false,
  };
  if (signal !== "traces") return disabled;
  let relayUrl = ccrTracesRelayUrl();
  if (relayUrl === null) return disabled;
  return {
    send: true,
    url: relayUrl,
    headers: async () => getSessionIngressAuthHeaders(),
  };
}
//@ chunk-9vvvg0d3.js:48601-48769 sole-consumer
function isLoopbackUrl(url) {
  if (!url) return false;
  try {
    let lower = new URL(url).hostname.toLowerCase();
    return lower === "localhost" || lower === "::1" || lower === "[::1]" || /^127(\.\d{1,3}){3}$/.test(lower);
  } catch {
    return false;
  }
}
//@ chunk-9vvvg0d3.js:48769-49019 sole-consumer
function toBufferChunk(chunk, encoding) {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === "string")
    return typeof encoding === "string" ? Buffer.from(chunk, encoding) : Buffer.from(chunk);
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  throw TypeError("OTLP request body chunk is not string or Uint8Array");
}
//@ chunk-9vvvg0d3.js:49019-49768 sole-consumer
/**
 * 给 Agent 打补丁：无长度头的请求先缓冲整个请求体再发送。
 */
function bufferRequestBodies(request) {
  let client = request;
  let boundAddRequest = client.addRequest.bind(client);
  client.addRequest = function (req, ...args) {
    if (!req.getHeader("content-length") && !req.getHeader("transfer-encoding")) {
      let restoreWriteAndEnd = function () {
        req.write = write;
        req.end = boundEnd;
      };
      let onConvertError = function (error) {
        restoreWriteAndEnd();
        req.destroy(error instanceof Error ? error : TypeError("OTLP request body chunk conversion failed"));
      };
      let chunks = [];
      let write = req.write.bind(req);
      let boundEnd = req.end.bind(req);
      req.write = function (chunk_2, encoding, callback) {
        try {
          chunks.push(toBufferChunk(chunk_2, encoding));
        } catch (error) {
          onConvertError(error);
          return false;
        }
        let writeCallback = typeof encoding === "function" ? encoding : callback;
        if (writeCallback) process.nextTick(writeCallback, null);
        return true;
      };
      req.end = function (chunk_3, encoding_2, callback_2) {
        if (chunk_3 != null && typeof chunk_3 !== "function")
          try {
            chunks.push(toBufferChunk(chunk_3, encoding_2));
          } catch (error) {
            onConvertError(error);
            return req;
          }
        let cb_2 =
          typeof chunk_3 === "function"
            ? chunk_3
            : typeof encoding_2 === "function"
              ? encoding_2
              : callback_2;
        let buffer = Buffer.concat(chunks);
        if (!req.headersSent) req.setHeader("Content-Length", String(buffer.byteLength));
        restoreWriteAndEnd();
        return boundEnd(buffer, cb_2);
      };
    }
    boundAddRequest(req, ...args);
  };
  return request;
}
//@ chunk-9vvvg0d3.js:49768-50235 sole-consumer
/**
 * OTLP HTTP Agent 工厂（代理、mTLS、CA，按协议缓存）。
 */
function createOtlpAgentFactory(url, { carriesOurToken }) {
  let usableProxyUrl = getUsableProxyUrl();
  let usesProxy = !!(usableProxyUrl && !isLoopbackUrl(url) && !(url && shouldBypassProxy(url)));
  let anthropicHost = carriesOurToken ? undefined : anthropicHostOf(url);
  let proxyMode = anthropicHost ? "customer" : "strict";
  let cachedOtlpHttpAgentFactory = getCachedOtlpHttpAgentFactory(usesProxy, proxyMode);
  if (cachedOtlpHttpAgentFactory) return cachedOtlpHttpAgentFactory;
  let mtlsConfig = getMTLSConfig();
  let caCerts = caListBehindProxy(anthropicHost);
  let agentOptions = {
    ...mtlsConfig,
    ...(caCerts && {
      ca: caCerts,
    }),
  };
  let httpAgent;
  let httpsAgent;
  let proxyAgent;
  let getAgent = (protocol) => {
    if (usesProxy) {
      if (!proxyAgent) {
        proxyAgent = bufferRequestBodies(
          new TlsCheckingProxyAgent(usableProxyUrl, {
            ...agentOptions,
            keepAlive: true,
            maxSockets: 1,
          }),
        );
        proxyAgent.options = {
          ...proxyAgent.options,
          ...agentOptions,
        };
      }
      return proxyAgent;
    }
    if (protocol === "http:") {
      if (!httpAgent)
        httpAgent = bufferRequestBodies(
          new http.Agent({
            keepAlive: true,
            maxSockets: 1,
          }),
        );
      return httpAgent;
    }
    if (!httpsAgent)
      httpsAgent = bufferRequestBodies(
        new https.Agent({
          ...agentOptions,
          keepAlive: true,
          maxSockets: 1,
        }),
      );
    return httpsAgent;
  };
  setCachedOtlpHttpAgentFactory(usesProxy, proxyMode, getAgent);
  return getAgent;
}
export {
  getBigQueryExportIntervalMs,
  configureOtelGlobals,
  flushTelemetry,
  getOTLPExporterConfig,
  getOtlpLogExporters,
  initializeTelemetry,
  isTelemetryEnabled,
  resolveOtlpEndpoint,
  parseExporterTypes,
  parseOtelHeadersEnvVar,
  initializeAntTelemetry,
  bufferRequestBodies,
};

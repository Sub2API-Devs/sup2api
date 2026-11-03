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
import { Re, Ar } from "../../../runtime/bun-runtime.js";
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
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { j } from "../../../vendor/@opentelemetry/sdk-trace-base/build/esm/platform/node/RandomIdGenerator.js";
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
import {
  EMPTY_ENV_DECLARATIONS,
  M_,
  I_,
  U_,
  i_,
  x_,
  N_,
  P_,
  l_,
  a_,
  Ft,
  vt,
  Yt,
  gt,
  It,
  pt,
  Ut,
  it,
  dt,
  at,
  ut,
  O_,
  yt,
  ft,
  Wt,
  Kt,
  Pt,
  CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S,
  lt,
  bt,
  mt,
  Ht,
  St,
  Gt,
  Rt,
  xt,
  Nt,
  C_,
  ht,
  kt,
  Zt,
  Jt,
  Qt,
  zt,
  $t,
  qt,
  o_,
  jt,
  t_,
  __,
  E_,
  D_,
  wt,
  e_,
  T_,
  R_,
  p_,
  c_,
  S_,
  L_,
  Vt,
  r_,
  s_,
  A_,
  Xt,
  n_,
} from "../env/envRegistry.js";

//@ chunk-9vvvg0d3.js:24056-24074 sole-consumer
var otelSemconv_2 = Re(require_error_3(), 1);
//@ chunk-9vvvg0d3.js:24144-24241 fingerprint = isBigQueryMetricsEnabled (1)
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
var otelCore = Re(require_core(), 1);
var MAX_BUFFERED_RECORDS = 64;
var EXPORT_SUCCESS_RESULT = {
  code: otelCore.ExportResultCode.SUCCESS,
};
//@ chunk-9vvvg0d3.js:31176-31246 sole-consumer
function exportFailureResult(e) {
  return {
    code: otelCore.ExportResultCode.FAILED,
    error: Error(e),
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
  setDelegate(e) {
    if (this.shutDown) {
      e.shutdown().catch(() => {});
      return;
    }
    this.delegate = e;
    let buffer = this.buffer;
    this.buffer = [];
    for (let o of buffer) e.export(o, noopExportCallback);
  }
  export(e, r) {
    if (this.shutDown) {
      r(exportFailureResult("Exporter has been shut down"));
      return;
    }
    if (this.delegate) {
      this.delegate.export(e, r);
      return;
    }
    if (this.buffer.length >= MAX_BUFFERED_RECORDS) this.buffer.shift();
    this.buffer.push(e);
    r(EXPORT_SUCCESS_RESULT);
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
  setDelegate(e) {
    if (this.shutDown) {
      e.shutdown().catch(() => {});
      return;
    }
    this.delegate = e;
    let buffer = this.buffer;
    this.buffer = [];
    for (let o of buffer) e.export(o, noopExportCallback);
  }
  export(e, r) {
    if (this.shutDown) {
      r(exportFailureResult("Exporter has been shut down"));
      return;
    }
    if (this.delegate) {
      this.delegate.export(e, r);
      return;
    }
    if (this.buffer.length >= MAX_BUFFERED_RECORDS) this.buffer.shift();
    this.buffer.push(e);
    r(EXPORT_SUCCESS_RESULT);
  }
  async shutdown() {
    this.shutDown = true;
    this.buffer = [];
    if (this.delegate) await this.delegate.shutdown();
  }
}
//@ chunk-9vvvg0d3.js:32304-32322 sole-consumer
var otelCore_2 = Re(require_core(), 1);
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
  let n = otelHeadersHelperFailureKind(error);
  if (n !== undefined)
    return {
      errorCode: `headers_helper_${n}`,
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
function buildExporterDiagnostics(e, r) {
  let o = {
    signal: fromEnum(e),
    protocol: fromEnum(
      r.protocol === "grpc"
        ? "grpc"
        : r.protocol === "http/json"
          ? "http_json"
          : r.protocol === "http/protobuf"
            ? "http_protobuf"
            : "other",
    ),
    ...(r.viaProxy === undefined
      ? {}
      : {
          via_proxy: r.viaProxy,
        }),
  };
  let n = false;
  let s = new Set();
  return (u) => {
    if (u.code === otelCore_2.ExportResultCode.SUCCESS) {
      if (!n) {
        n = true;
        logFeatureOk("otlp_export", o);
      }
      return;
    }
    let { errorCode, httpStatus } = classifyExportError(u.error, r.protocol);
    let f = `${errorCode}:${httpStatus ?? ""}`;
    if (s.has(f)) return;
    s.add(f);
    logFeatureBad(
      "otlp_export",
      errorCode,
      httpStatus === undefined
        ? o
        : {
            ...o,
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
//@ chunk-9vvvg0d3.js:33467-33559 callgraph-witnessed = telemetryTimeout (1)
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
  let o = {
    [otelSemconv_2.ATTR_SERVICE_NAME]: "claude-code",
    [otelSemconv_2.ATTR_SERVICE_VERSION]: getServiceVersion(),
  };
  if (platform === "wsl") {
    let wslVersion = getWslVersion();
    if (wslVersion) o["wsl.version"] = wslVersion;
  }
  let n = import_resources.resourceFromAttributes(o);
  let s = import_resources.resourceFromAttributes(
    hasRemoteOtelLogsEndpoint() ? {} : import_resources.osDetector.detect().attributes || {},
  );
  let u = import_resources.resourceFromAttributes({
    [otelSemconv_2.SEMRESATTRS_HOST_ARCH]: normalizeArchForOtel(arch()),
  });
  let a = gatewayIdentityAttributes();
  let p = Object.keys(a).length > 0;
  let attributes = import_resources.envDetector.detect().attributes || {};
  let h = import_resources.resourceFromAttributes(
    isTracesRelayed()
      ? {}
      : p
        ? wi(attributes, (O, T) => T.startsWith("user.") || T.startsWith("identity."))
        : attributes,
  );
  let E = n.merge(s).merge(u).merge(h).merge(import_resources.resourceFromAttributes(a));
  setCachedTelemetryResource(E);
  return E;
}
//@ chunk-9vvvg0d3.js:35485-36594 fingerprint = initializeBetaTracing (0.51)
/**
 * beta 详细追踪：把 trace/log 发到 BETA_TRACING_ENDPOINT。
 */
function initializeBetaTracing() {
  let resource = buildOtelResource();
  let r = new BufferingSpanExporter();
  let spanProcessor = new j(r, {
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
  initializeBetaTracingExporters(r, logExporter).catch((error) =>
    logForDebugging(`Beta tracing exporter wiring failed: ${error}`, {
      level: "error",
    }),
  );
}
//@ chunk-9vvvg0d3.js:36594-36876 layout
/**
 * beta 追踪导出器：把 trace 与 log 分别发往 BETA_TRACING_ENDPOINT/v1/traces 与 /v1/logs。
 */
async function initializeBetaTracingExporters(e, logExporter) {
  let BETA_TRACING_ENDPOINT = env.BETA_TRACING_ENDPOINT;
  if (!BETA_TRACING_ENDPOINT) return;
  let [{ OTLPTraceExporter: n }, { OTLPLogExporter: s }] = await Promise.all([
    import("./chunk-733pppnh.js"),
    import("./chunk-3pt5dasv.js"),
  ]);
  e.setDelegate(
    new n({
      url: `${BETA_TRACING_ENDPOINT}/v1/traces`,
    }),
  );
  logExporter.setDelegate(
    new s({
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
function wrapExporterWithFirstExportLog(e, r) {
  let o = false;
  let n = r && buildExporterDiagnostics(e, r);
  return (s) => {
    let u =
      s instanceof import_sdk_metrics.ConsoleMetricExporter ||
      s instanceof ConsoleLogRecordExporter ||
      s instanceof ConsoleSpanExporter
        ? undefined
        : n;
    let a = s.export.bind(s);
    s.export = (p, f) =>
      a(p, (h) => {
        if (!o) {
          o = true;
          logForDebugging(
            `[3P telemetry] First ${e} export: ${h.code === import_core.ExportResultCode.SUCCESS ? "SUCCESS" : `FAILED (${h.error?.message ?? "unknown"})`}`,
          );
        }
        try {
          u?.(h);
        } catch (error) {
          logError(error);
        }
        f(h);
      });
    return s;
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
function getOtlpHeaders(e, httpConfig) {
  let o =
    httpConfig.onlyConfigHeaders === true
      ? ["OTEL_EXPORTER_OTLP_HEADERS", `OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[e]}_HEADERS`].flatMap((n) => {
          let s = env[n];
          return s === undefined
            ? []
            : [
                {
                  name: n,
                  value: s,
                },
              ];
        })
      : [];
  for (let { name: n } of o) env.unset(n);
  return {
    [Symbol.dispose]() {
      for (let { name: n, value: s } of o) env.set(n, s);
    },
  };
}
//@ chunk-9vvvg0d3.js:37796-39309 fingerprint = getOtlpReaders (0.626)
/**
 * 按 OTEL_METRICS_EXPORTER（otlp/prometheus/console）和 OTEL_EXPORTER_OTLP_PROTOCOL 创建 metric reader，导出间隔 OTEL_METRIC_EXPORT_INTERVAL（默认 60 秒）。
 */
async function getOtlpReaders(e) {
  let OTEL_METRIC_EXPORT_INTERVAL = env.OTEL_METRIC_EXPORT_INTERVAL ?? DEFAULT_METRICS_EXPORT_INTERVAL_MS;
  logForDebugging(
    `[3P telemetry] getOtlpReaders: types=${jsonStringify(e)}, interval=${OTEL_METRIC_EXPORT_INTERVAL}, protocol=${env.OTEL_EXPORTER_OTLP_PROTOCOL}, endpoint=${env.OTEL_EXPORTER_OTLP_ENDPOINT}`,
  );
  let exporters = [];
  let n;
  for (let exporterType of e)
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
      let a = env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL;
      let httpConfig = getOTLPExporterConfig("metrics", a);
      switch (((n = describeExporterTransport(a, httpConfig)), a)) {
        case "grpc": {
          let { OTLPMetricExporter } = await import("./chunk-6n5d7gpq.js").then((m) => Re(m.default, 1));
          exporters.push(new OTLPMetricExporter());
          break;
        }
        case "http/json": {
          let { OTLPMetricExporter } = await import("./chunk-jw1wb0qr.js").then((m) => Re(m.default, 1));
          using otlpHeaders = getOtlpHeaders("metrics", httpConfig);
          exporters.push(new OTLPMetricExporter(httpConfig));
          break;
        }
        case "http/protobuf": {
          let { OTLPMetricExporter } = await import("./chunk-qrf13zdh.js");
          using otlpHeaders = getOtlpHeaders("metrics", httpConfig);
          exporters.push(new OTLPMetricExporter(httpConfig));
          break;
        }
        default:
          throw Error(
            `Unknown protocol set in OTEL_EXPORTER_OTLP_METRICS_PROTOCOL or OTEL_EXPORTER_OTLP_PROTOCOL env var: ${a}`,
          );
      }
    } else if (exporterType === "prometheus") {
      let { PrometheusExporter } = await import("./chunk-1gzy30bn.js").then((m) => Re(m.default, 1));
      exporters.push(new PrometheusExporter());
    } else throw Error(`Unknown exporter type set in OTEL_METRICS_EXPORTER env var: ${exporterType}`);
  let s = wrapExporterWithFirstExportLog("metrics", n);
  return exporters.map((exporter) => {
    if ("export" in exporter)
      return new import_sdk_metrics.PeriodicExportingMetricReader({
        exporter: s(exporter),
        exportIntervalMillis: OTEL_METRIC_EXPORT_INTERVAL,
      });
    return exporter;
  });
}
//@ chunk-9vvvg0d3.js:39309-40257 fingerprint = getOtlpLogExporters (0.86)
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
  let s;
  for (let exporterType of exporterTypes)
    if (exporterType === "console") exporters.push(new ConsoleLogRecordExporter());
    else if (exporterType === "otlp") {
      let httpConfig = getOTLPExporterConfig("logs", protocol);
      switch (((s = describeExporterTransport(protocol, httpConfig)), protocol)) {
        case "grpc": {
          let { OTLPLogExporter } = await import("./chunk-vt7p2m92.js").then((m) => Re(m.default, 1));
          exporters.push(new OTLPLogExporter());
          break;
        }
        case "http/json": {
          let { OTLPLogExporter } = await import("./chunk-3pt5dasv.js");
          using otlpHeaders = getOtlpHeaders("logs", httpConfig);
          exporters.push(new OTLPLogExporter(httpConfig));
          break;
        }
        case "http/protobuf": {
          let { OTLPLogExporter } = await import("./chunk-290z83zt.js");
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
  return exporters.map(wrapExporterWithFirstExportLog("logs", s));
}
//@ chunk-9vvvg0d3.js:40257-41145 fingerprint = getOtlpTraceExporters (0.811)
/**
 * 按 OTEL_TRACES_EXPORTER 创建 trace 导出器。
 */
async function getOtlpTraceExporters() {
  let exporterTypes = parseExporterTypes(env.OTEL_TRACES_EXPORTER);
  let exporters = [];
  let o;
  for (let exporterType of exporterTypes)
    if (exporterType === "console") exporters.push(new ConsoleSpanExporter());
    else if (exporterType === "otlp") {
      let protocol =
        ccrTracesRelayUrl() !== null
          ? "http/protobuf"
          : env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL;
      let otlpExporterConfig = getOTLPExporterConfig("traces", protocol);
      if (!isCcrTracesEndpoint()) o = describeExporterTransport(protocol, otlpExporterConfig);
      switch (protocol) {
        case "grpc": {
          let { OTLPTraceExporter } = await import("./chunk-qz9ye512.js").then((m) => Re(m.default, 1));
          exporters.push(new OTLPTraceExporter());
          break;
        }
        case "http/json": {
          let { OTLPTraceExporter } = await import("./chunk-733pppnh.js");
          using otlpHeaders = getOtlpHeaders("traces", otlpExporterConfig);
          exporters.push(new OTLPTraceExporter(otlpExporterConfig));
          break;
        }
        case "http/protobuf": {
          let { OTLPTraceExporter } = await import("./chunk-yj0w6kkt.js");
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
  return exporters.map(wrapExporterWithFirstExportLog("traces", o));
}
//@ chunk-9vvvg0d3.js:41145-41211 fingerprint = isTelemetryEnabled (1)
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
//@ chunk-9vvvg0d3.js:41333-41489 fingerprint = getBigQueryExportingReader (0.665)
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
//@ chunk-9vvvg0d3.js:41489-44472 fingerprint = initializeTelemetry (0.806)
/**
 * 初始化 OTel：设置传播器与诊断 logger；CLAUDE_CODE_ENABLE_TELEMETRY 时按 OTEL_METRICS_EXPORTER 建 metric reader，team/enterprise 另加 BigQuery 指标；按 OTEL_LOGS_EXPORTER 建事件 logger（com.anthropic.claude_code.events）；增强遥测时按 OTEL_TRACES_EXPORTER 建 trace；注册退出 flush。
 */
async function initializeTelemetry(storageV5, r) {
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
          .map((E) => E.trim())
          .filter((E) => E !== "console")
          .join(",");
    }
  import_api.diag.setLogger(
    new ClaudeCodeDiagLogger(),
    env.CLAUDE_CODE_IS_COWORK ? import_api.DiagLogLevel.WARN : import_api.DiagLogLevel.ERROR,
  );
  initializePerfettoTracing();
  let readers = [];
  let telemetryEnabled = isTelemetryEnabled();
  let s = telemetryEnabled ? parseExporterTypes(env.OTEL_METRICS_EXPORTER) : [];
  logForDebugging(
    `[3P telemetry] isTelemetryEnabled=${telemetryEnabled} (CLAUDE_CODE_ENABLE_TELEMETRY=${process.env.CLAUDE_CODE_ENABLE_TELEMETRY})`,
  );
  if (telemetryEnabled) readers.push(...(await getOtlpReaders(s)));
  if (!r?.disableBigQuery && isBigQueryMetricsEnabled()) readers.push(getBigQueryExportingReader(storageV5));
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
      metricsExporterKinds: s,
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
      let E = isTracesRelayed() ? TRACE_RELAY_BATCH_MS : undefined;
      let spanProcessors = traceExporters.map(
        (exporter) =>
          new j(exporter, {
            scheduledDelayMillis: env.OTEL_TRACES_EXPORT_INTERVAL ?? DEFAULT_TRACES_EXPORT_INTERVAL_MS,
            ...(E !== undefined && {
              maxExportBatchSize: E,
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
    metricsExporterKinds: s,
  };
}
//@ chunk-9vvvg0d3.js:44472-44991 fingerprint = flushTelemetry (0.963)
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
//@ chunk-9vvvg0d3.js:44991-45159 fingerprint = parseOtelHeadersEnvVar (1)
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
//@ chunk-9vvvg0d3.js:45159-46457 callgraph-witnessed = getOTLPExporterConfig (0.158)
/**
 * OTLP 导出器配置：endpoint（OTEL_EXPORTER_OTLP_<SIGNAL>_ENDPOINT/ENDPOINT + /v1/<signal>）、headers（含 otelHeadersHelper）、代理与 mTLS。
 */
function getOTLPExporterConfig(e, protocol) {
  let o = !!getConfiguredOtelHeadersHelper();
  let config = {};
  let staticHeaders = getGatewayAuth();
  let u = isGatewayAuthPinned(staticHeaders) ? gatewayManagedCollectorUrl(e, staticHeaders, o) : null;
  if (isGatewayAuthPinned(staticHeaders) && u === null) {
    let url = staticHeaders.url;
    config.url = `${url}/v1/${e}`;
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
  let a = isGatewayAuthPinned(staticHeaders) ? null : getRemoteOtlpEndpoint(e);
  if (a !== null) {
    config.url = a;
    config.headers = async () => {
      if (getRemoteOtlpEndpoint(e) !== a) return {};
      return configureApiKeyHeaders(env.CLAUDE_CODE_SESSION_ACCESS_TOKEN);
    };
    config.httpAgentOptions = createOtlpAgentFactory(a, {
      carriesOurToken: true,
    });
    return config;
  }
  let caCerts = parseOtelHeadersEnvVar();
  let f = gatewayRelayConfig(e, o);
  let h = ccrTraceRelayConfig(e);
  if (h.send) {
    config.url = h.url;
    config.headers = h.headers;
    config.httpAgentOptions = createOtlpAgentFactory(h.url, {
      carriesOurToken: true,
    });
    tracesRelayedLatch.arm();
    return config;
  }
  if (o) {
    config.headers = async () => {
      let otelHeadersFromHelper = await getOtelHeadersFromHelper();
      return {
        ...caCerts,
        ...otelHeadersFromHelper,
      };
    };
    if (protocol === "http/json" || protocol === "http/protobuf") prefetchOtelHeadersFromHelper();
  } else if (f.send) {
    config.url = f.url;
    config.headers = f.headers;
    config.onlyConfigHeaders = true;
    config.httpAgentOptions = createOtlpAgentFactory(f.url, {
      carriesOurToken: false,
    });
    return config;
  } else if (Object.keys(caCerts).length > 0) config.headers = async () => caCerts;
  let httpAgentOptions = createOtlpAgentFactory(
    u ??
      (process.env[`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[e]}_ENDPOINT`]?.trim() ||
        env.OTEL_EXPORTER_OTLP_ENDPOINT),
    {
      carriesOurToken: false,
    },
  );
  config.httpAgentOptions = httpAgentOptions;
  if (u !== null) {
    config.url = u;
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
function gatewayManagedCollectorUrl(e, staticHeaders, o) {
  if (o) return null;
  let otlpEndpoint = resolveOtlpEndpoint(remotePolicySettings()?.env, e);
  if (otlpEndpoint === null) return null;
  if (
    envOtlpEndpoint(e) !== otlpEndpoint ||
    isGatewayHost(otlpEndpoint, staticHeaders) ||
    !isAllowedCollectorUrl(otlpEndpoint) ||
    !isOtlpSignalPath(otlpEndpoint, e)
  )
    return null;
  logForDebugging(
    `[3P telemetry] ${e}: exporting to the collector the gateway's managed settings name (${redactUrlsInText(otlpEndpoint)}), not through the gateway relay`,
  );
  return otlpEndpoint;
}
//@ chunk-9vvvg0d3.js:46731-46833 sole-consumer
function remotePolicySettings() {
  if (getPolicySettingsOrigin() !== "remote") return null;
  if (!isRemoteManagedSettingsVerified() && getRemoteSettingsPathOverride() === undefined) return null;
  return getAllPolicyTierSettings()[0] ?? null;
}
//@ chunk-9vvvg0d3.js:46833-47009 sole-consumer
function envOtlpEndpoint(e) {
  let r = SIGNAL_ENV_SUFFIX[e];
  return resolveOtlpEndpoint(
    {
      OTEL_EXPORTER_OTLP_ENDPOINT: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      [`OTEL_EXPORTER_OTLP_${r}_ENDPOINT`]: env[`OTEL_EXPORTER_OTLP_${r}_ENDPOINT`],
    },
    e,
  );
}
//@ chunk-9vvvg0d3.js:47009-47368 sole-consumer
/**
 * 从环境映射中解析某信号的 OTLP 端点（专用或通用 + /v1/<信号>）。
 */
function resolveOtlpEndpoint(e, r) {
  if (!e) return null;
  let o = new Map();
  for (let [key, value] of Object.entries(e)) {
    let upper = key.toUpperCase();
    if (value !== undefined && (!o.has(upper) || key === upper)) o.set(upper, value);
  }
  let n = o.get(`OTEL_EXPORTER_OTLP_${SIGNAL_ENV_SUFFIX[r]}_ENDPOINT`);
  if (n?.trim()) return normalizeHttpUrl(n);
  let s = o.get("OTEL_EXPORTER_OTLP_ENDPOINT");
  if (!s?.trim() || normalizeHttpUrl(s) === null) return null;
  return normalizeHttpUrl(`${s}${s.endsWith("/") ? "" : "/"}v1/${r}`);
}
//@ chunk-9vvvg0d3.js:47368-47557 sole-consumer
function isGatewayHost(otlpEndpoint, r) {
  let o = hostOfUrl(otlpEndpoint);
  if (o === null) return false;
  let n = [r.url];
  let s = decodeJwtPayload(r.jwt);
  if (s !== null && typeof s === "object" && "iss" in s && typeof s.iss === "string") n.push(s.iss);
  return n.some((u) => hostOfUrl(u) === o);
}
//@ chunk-9vvvg0d3.js:47557-47644 sole-consumer
function hostOfUrl(e) {
  let r = normalizeHttpUrl(e);
  return r === null ? null : new URL(r).host.replace(/\.(?=:|$)/, "");
}
//@ chunk-9vvvg0d3.js:47644-47737 sole-consumer
function isOtlpSignalPath(e, r) {
  let o = new URL(e);
  return o.pathname.endsWith(`/v1/${r}`) && !o.search && !o.hash;
}
//@ chunk-9vvvg0d3.js:47737-47832 sole-consumer
function isAllowedCollectorUrl(e) {
  let r = new URL(e);
  return r.protocol === "https:" || (r.protocol === "http:" && isLoopbackUrl(r.href));
}
//@ chunk-9vvvg0d3.js:47832-47958 sole-consumer
function normalizeHttpUrl(e) {
  try {
    let r = new URL(e);
    return (r.protocol === "https:" || r.protocol === "http:") && r.host ? r.href : null;
  } catch {
    return null;
  }
}
//@ chunk-9vvvg0d3.js:47958-48457 sole-consumer
/**
 * 宿主托管网关令牌时经网关中继导出的配置。
 */
function gatewayRelayConfig(e, r) {
  let o = {
    send: false,
  };
  let n = (a) => {
    if (!a || normalizeHttpUrl(a) === null) return null;
    let p = normalizeHttpUrl(`${a.replace(/\/+$/, "")}/v1/${e}`);
    return p !== null && isAllowedCollectorUrl(p) && isOtlpSignalPath(p, e) ? p : null;
  };
  if (!isHostManagedProviderAuth()) return o;
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty" && apiProvider !== "gateway") return o;
  if (!isGatewayToken(env.ANTHROPIC_AUTH_TOKEN)) return o;
  if (r) return o;
  let u = n(env.ANTHROPIC_BASE_URL);
  if (!u) return o;
  if (envOtlpEndpoint(e) !== u) return o;
  return {
    send: true,
    url: u,
    headers: async () => {
      let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
      return ANTHROPIC_AUTH_TOKEN && isGatewayToken(ANTHROPIC_AUTH_TOKEN) && n(env.ANTHROPIC_BASE_URL) === u
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
function ccrTraceRelayConfig(e) {
  let r = {
    send: false,
  };
  if (e !== "traces") return r;
  let o = ccrTracesRelayUrl();
  if (o === null) return r;
  return {
    send: true,
    url: o,
    headers: async () => getSessionIngressAuthHeaders(),
  };
}
//@ chunk-9vvvg0d3.js:48601-48769 sole-consumer
function isLoopbackUrl(e) {
  if (!e) return false;
  try {
    let lower = new URL(e).hostname.toLowerCase();
    return lower === "localhost" || lower === "::1" || lower === "[::1]" || /^127(\.\d{1,3}){3}$/.test(lower);
  } catch {
    return false;
  }
}
//@ chunk-9vvvg0d3.js:48769-49019 sole-consumer
function toBufferChunk(e, r) {
  if (Buffer.isBuffer(e)) return e;
  if (typeof e === "string") return typeof r === "string" ? Buffer.from(e, r) : Buffer.from(e);
  if (e instanceof Uint8Array) return Buffer.from(e);
  throw TypeError("OTLP request body chunk is not string or Uint8Array");
}
//@ chunk-9vvvg0d3.js:49019-49768 sole-consumer
/**
 * 给 Agent 打补丁：无长度头的请求先缓冲整个请求体再发送。
 */
function bufferRequestBodies(e) {
  let r = e;
  let o = r.addRequest.bind(r);
  r.addRequest = function (s, ...u) {
    if (!s.getHeader("content-length") && !s.getHeader("transfer-encoding")) {
      let h = function () {
        s.write = write;
        s.end = f;
      };
      let E = function (error) {
        h();
        s.destroy(error instanceof Error ? error : TypeError("OTLP request body chunk conversion failed"));
      };
      let a = [];
      let write = s.write.bind(s);
      let f = s.end.bind(s);
      s.write = function (T, P, C) {
        try {
          a.push(toBufferChunk(T, P));
        } catch (error) {
          E(error);
          return false;
        }
        let F = typeof P === "function" ? P : C;
        if (F) process.nextTick(F, null);
        return true;
      };
      s.end = function (T, P, C) {
        if (T != null && typeof T !== "function")
          try {
            a.push(toBufferChunk(T, P));
          } catch (error) {
            E(error);
            return s;
          }
        let F = typeof T === "function" ? T : typeof P === "function" ? P : C;
        let buffer = Buffer.concat(a);
        if (!s.headersSent) s.setHeader("Content-Length", String(buffer.byteLength));
        h();
        return f(buffer, F);
      };
    }
    o(s, ...u);
  };
  return e;
}
//@ chunk-9vvvg0d3.js:49768-50235 sole-consumer
/**
 * OTLP HTTP Agent 工厂（代理、mTLS、CA，按协议缓存）。
 */
function createOtlpAgentFactory(url, { carriesOurToken }) {
  let usableProxyUrl = getUsableProxyUrl();
  let n = !!(usableProxyUrl && !isLoopbackUrl(url) && !(url && shouldBypassProxy(url)));
  let s = carriesOurToken ? undefined : anthropicHostOf(url);
  let u = s ? "customer" : "strict";
  let cachedOtlpHttpAgentFactory = getCachedOtlpHttpAgentFactory(n, u);
  if (cachedOtlpHttpAgentFactory) return cachedOtlpHttpAgentFactory;
  let mtlsConfig = getMTLSConfig();
  let f = caListBehindProxy(s);
  let h = {
    ...mtlsConfig,
    ...(f && {
      ca: f,
    }),
  };
  let E;
  let O;
  let T;
  let P = (C) => {
    if (n) {
      if (!T) {
        T = bufferRequestBodies(
          new TlsCheckingProxyAgent(usableProxyUrl, {
            ...h,
            keepAlive: true,
            maxSockets: 1,
          }),
        );
        T.options = {
          ...T.options,
          ...h,
        };
      }
      return T;
    }
    if (C === "http:") {
      if (!E)
        E = bufferRequestBodies(
          new http.Agent({
            keepAlive: true,
            maxSockets: 1,
          }),
        );
      return E;
    }
    if (!O)
      O = bufferRequestBodies(
        new https.Agent({
          ...h,
          keepAlive: true,
          maxSockets: 1,
        }),
      );
    return O;
  };
  setCachedOtlpHttpAgentFactory(n, u, P);
  return P;
}
//@ chunk-jhrww53q.js:3176-5552 fingerprint = bootstrapTelemetry (0.317)
Ar(EMPTY_ENV_DECLARATIONS, {
  ANT_CLAUDE_CODE_METRICS_ENDPOINT: () => M_,
  ANT_OTEL_EXPORTER_OTLP_ENDPOINT: () => I_,
  ANT_OTEL_EXPORTER_OTLP_HEADERS: () => U_,
  ANT_OTEL_EXPORTER_OTLP_PROTOCOL: () => i_,
  ANT_OTEL_LOGS_EXPORTER: () => x_,
  ANT_OTEL_METRICS_EXPORTER: () => N_,
  ANT_OTEL_RESOURCE_ATTRIBUTES: () => P_,
  ANT_OTEL_TRACES_EXPORTER: () => l_,
  BETA_TRACING_ENDPOINT: () => a_,
  CLAUDE_CODE_BENCH_LIVE_COUNTS: () => Ft,
  CLAUDE_CODE_BYOC_ENABLE_DATADOG: () => vt,
  CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS: () => Yt,
  CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS: () => gt,
  CLAUDE_CODE_DEBUG_LOGS_DIR: () => It,
  CLAUDE_CODE_DEBUG_LOG_LEVEL: () => pt,
  CLAUDE_CODE_DEBUG_REPAINTS: () => Ut,
  CLAUDE_CODE_DIAGNOSTICS_FILE: () => it,
  CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: () => dt,
  CLAUDE_CODE_FRAME_TIMING_LOG: () => at,
  CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY: () => ut,
  CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH: () => O_,
  CLAUDE_CODE_OTEL_DIAG_STDERR: () => yt,
  CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS: () => ft,
  CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS: () => Wt,
  CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS: () => Kt,
  CLAUDE_CODE_PERFETTO_TRACE: () => Pt,
  CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S: () => CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S,
  CLAUDE_CODE_PROFILE_STARTUP: () => lt,
  CLAUDE_CODE_SESSION_LOG: () => bt,
  CLAUDE_CODE_TEE_SDK_STDOUT: () => mt,
  CLAUDE_CODE_TERMINAL_RECORDING: () => Ht,
  CLAUDE_DEBUG: () => St,
  CLAUDE_PTY_RECORD: () => Gt,
  DEBUG: () => Rt,
  DEBUG_CLAUDE_AGENT_SDK: () => xt,
  DEBUG_SDK: () => Nt,
  OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => C_,
  OTEL_EXPORTER_OTLP_ENDPOINT: () => ht,
  OTEL_EXPORTER_OTLP_HEADERS: () => kt,
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: () => Zt,
  OTEL_EXPORTER_OTLP_LOGS_HEADERS: () => Jt,
  OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: () => Qt,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: () => zt,
  OTEL_EXPORTER_OTLP_METRICS_HEADERS: () => $t,
  OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: () => qt,
  OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: () => o_,
  OTEL_EXPORTER_OTLP_PROTOCOL: () => jt,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: () => t_,
  OTEL_EXPORTER_OTLP_TRACES_HEADERS: () => __,
  OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: () => E_,
  OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => D_,
  OTEL_LOGS_EXPORTER: () => wt,
  OTEL_LOGS_EXPORT_INTERVAL: () => e_,
  OTEL_LOG_ASSISTANT_RESPONSES: () => T_,
  OTEL_LOG_MANAGED_SETTINGS: () => R_,
  OTEL_LOG_RAW_API_BODIES: () => p_,
  OTEL_LOG_TOOL_CONTENT: () => c_,
  OTEL_LOG_TOOL_DETAILS: () => S_,
  OTEL_LOG_USER_PROMPTS: () => L_,
  OTEL_METRICS_EXPORTER: () => Vt,
  OTEL_METRIC_EXPORT_INTERVAL: () => r_,
  OTEL_RESOURCE_ATTRIBUTES: () => s_,
  OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => A_,
  OTEL_TRACES_EXPORTER: () => Xt,
  OTEL_TRACES_EXPORT_INTERVAL: () => n_,
});

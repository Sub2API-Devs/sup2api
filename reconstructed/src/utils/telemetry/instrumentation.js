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
import { p3e } from "../../../vendor/@anthropic-ai/bedrock-sdk/core/error.js";
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
import { Qm } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { hasExactErrorMessage, errorMessage } from "../errors.js";
import { extractConnectionErrorDetails, oIt } from "../../services/api/errorUtils.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  A,
  D,
  ie,
  me,
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
  XYo,
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
  j5t,
  ccrTracesRelayUrl,
  isCcrTracesEndpoint,
  AQr,
  getRemoteOtlpEndpoint,
} from "./otlpRelay.js";
import { firstLineOf } from "../stringUtils.js";
import { getPlatform, getWslVersion } from "../platform.js";
import { normalizeArchForOtel } from "../../../vendor/@opentelemetry/resources/build/esm/detectors/platform/node/utils.js";
import { gatewayIdentityAttributes } from "./gatewayIdentityAttributes.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { j } from "../../../vendor/@opentelemetry/sdk-trace-base/build/esm/platform/node/RandomIdGenerator.js";
import { te } from "../../../vendor/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js";
import { P8t } from "../../../vendor/@opentelemetry/sdk-logs/build/src/LoggerProvider.js";
import { vlt } from "../../../vendor/@opentelemetry/sdk-logs/build/esm/platform/node/export/BatchLogRecordProcessor.js";
import { diagnosticTracker } from "../../services/diagnosticTracking.js";
import { logForDebugging, getHasFormattedOutput } from "../debug.js";
import { k } from "../../../vendor/@opentelemetry/sdk-trace-base/build/esm/enums.js";
import { oe } from "../../../vendor/@opentelemetry/sdk-trace-base/build/src/export/ConsoleSpanExporter.js";
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
  P,
  str_34,
  str_27,
  str_28,
  str_29,
  str_30,
  str_31,
  str_33,
  str_32,
  str_35,
  bool_7,
  bool_9,
  int_6,
  int_7,
  str_3,
  str_2,
  bool_2,
  str_4,
  bool_8,
  str_6,
  int_2,
  int_14,
  bool_10,
  int_3,
  int_5,
  int_4,
  str_5,
  int,
  bool_5,
  str_7,
  bool_6,
  str_9,
  bool,
  str_8,
  str,
  bool_3,
  bool_4,
  int_11,
  str_13,
  str_14,
  str_16,
  str_17,
  str_18,
  str_19,
  str_20,
  str_21,
  str_22,
  str_15,
  str_23,
  str_24,
  str_25,
  int_12,
  str_11,
  int_9,
  triBool,
  bool_14,
  bool_15,
  bool_12,
  bool_13,
  bool_11,
  str_10,
  int_8,
  str_26,
  int_13,
  str_12,
  int_10,
} from "../env/envRegistry.js";

//@ chunk-9vvvg0d3.js:24056-24074 sole-consumer
var Z = Re(p3e(), 1);
/**
 * BigQuery 指标是否启用：隐私级别 default 且（Slt() 或 Claude.ai 的 team/enterprise 订阅）。
 */
//@ chunk-9vvvg0d3.js:24144-24241 fingerprint = isBigQueryMetricsEnabled (1)
function isBigQueryMetricsEnabled() {
  if (isTelemetryDisabled()) return !1;
  let subscriptionType = getSubscriptionType(),
    isC4EOrTeamUser =
      isClaudeAISubscriber() && (subscriptionType === "enterprise" || subscriptionType === "team");
  return is1PApiCustomer() || isC4EOrTeamUser;
}
//@ chunk-9vvvg0d3.js:31114-31176 sole-consumer
var ye = Re(Qm(), 1),
  Ye = 64,
  Ke = { code: ye.ExportResultCode.SUCCESS };
//@ chunk-9vvvg0d3.js:31176-31246 sole-consumer
function qe(e) {
  return { code: ye.ExportResultCode.FAILED, error: Error(e) };
}
//@ chunk-9vvvg0d3.js:31246-31261 sole-consumer
function Je() {}
/**
 * 委托就绪前缓冲导出的导出器（span，支持 forceFlush）。
 */
//@ chunk-9vvvg0d3.js:31261-31823 sole-consumer
class BufferingSpanExporter {
  delegate;
  buffer = [];
  shutDown = !1;
  setDelegate(e) {
    if (this.shutDown) {
      e.shutdown().catch(() => {});
      return;
    }
    this.delegate = e;
    let buffer = this.buffer;
    this.buffer = [];
    for (let o of buffer) e.export(o, Je);
  }
  export(e, r) {
    if (this.shutDown) {
      r(qe("Exporter has been shut down"));
      return;
    }
    if (this.delegate) {
      this.delegate.export(e, r);
      return;
    }
    if (this.buffer.length >= Ye) this.buffer.shift();
    (this.buffer.push(e), r(Ke));
  }
  async forceFlush() {
    if (this.delegate?.forceFlush) await this.delegate.forceFlush();
  }
  async shutdown() {
    if (((this.shutDown = !0), (this.buffer = []), this.delegate)) await this.delegate.shutdown();
  }
}
/**
 * 委托就绪前缓冲导出的导出器。
 */
//@ chunk-9vvvg0d3.js:31823-32304 sole-consumer
class BufferingExporter {
  delegate;
  buffer = [];
  shutDown = !1;
  setDelegate(e) {
    if (this.shutDown) {
      e.shutdown().catch(() => {});
      return;
    }
    this.delegate = e;
    let buffer = this.buffer;
    this.buffer = [];
    for (let o of buffer) e.export(o, Je);
  }
  export(e, r) {
    if (this.shutDown) {
      r(qe("Exporter has been shut down"));
      return;
    }
    if (this.delegate) {
      this.delegate.export(e, r);
      return;
    }
    if (this.buffer.length >= Ye) this.buffer.shift();
    (this.buffer.push(e), r(Ke));
  }
  async shutdown() {
    if (((this.shutDown = !0), (this.buffer = []), this.delegate)) await this.delegate.shutdown();
  }
}
//@ chunk-9vvvg0d3.js:32304-32322 sole-consumer
var et = Re(Qm(), 1);
/**
 * OTLP 导出错误归类（grpc/http 状态、headers helper、超时等）。
 */
//@ chunk-9vvvg0d3.js:32322-32920 sole-consumer
function classifyExportError(e, r) {
  let o = typeof e === "object" && e !== null && "code" in e ? e.code : void 0;
  if (typeof o === "number" && Number.isInteger(o)) {
    if (r === "grpc" && o >= 0 && o <= 16) return { errorCode: `grpc_${o}` };
    if (r !== "grpc" && o >= 300 && o < 600)
      return {
        errorCode: o === 401 || o === 403 ? `http_${o}` : `http_${Math.floor(o / 100)}xx`,
        httpStatus: o,
      };
  }
  let n = otelHeadersHelperFailureKind(e);
  if (n !== void 0) return { errorCode: `headers_helper_${n}` };
  if (hasExactErrorMessage(e, "Request Timeout")) return { errorCode: "timeout" };
  if (hasExactErrorMessage(e, "Export failed with retryable status"))
    return { errorCode: "http_retries_exhausted" };
  let s = extractConnectionErrorDetails(e);
  return { errorCode: (s && (oIt(s.code) ?? (s.isSSLError ? s.code : void 0))) || "other" };
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
      ...(r.viaProxy === void 0 ? {} : { via_proxy: r.viaProxy }),
    },
    n = !1,
    s = new Set();
  return (u) => {
    if (u.code === et.ExportResultCode.SUCCESS) {
      if (!n) ((n = !0), logFeatureOk("otlp_export", o));
      return;
    }
    let { errorCode: errorCode, httpStatus: httpStatus } = classifyExportError(u.error, r.protocol),
      f = `${errorCode}:${httpStatus ?? ""}`;
    if (s.has(f)) return;
    (s.add(f),
      logFeatureBad("otlp_export", errorCode, httpStatus === void 0 ? o : { ...o, http_status: httpStatus }));
  };
}
//@ chunk-9vvvg0d3.js:33393-33443 sole-consumer
var DEFAULT_METRICS_EXPORT_INTERVAL_MS = 60000,
  nt = 5000,
  st = 5000,
  Ce = 300000,
  yt = 3600000;
//@ chunk-9vvvg0d3.js:33443-33467 affinity
class TelemetryTimeoutError extends Error {}
//@ chunk-9vvvg0d3.js:33467-33559 callgraph-witnessed = telemetryTimeout (1)
function telemetryTimeout(ms, message) {
  return new Promise((o, reject) => {
    setTimeout((rej, msg) => rej(new TelemetryTimeoutError(msg)), ms, reject, message).unref();
  });
}
/**
 * OTel 全局配置：注册 AsyncLocalStorage 上下文管理器，未设置时把 OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE 设为 delta。
 */
//@ chunk-9vvvg0d3.js:33559-33759 sole-consumer
function configureOtelGlobals() {
  if (
    (A.context.setGlobalContextManager(otelContextManager),
    !env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE)
  )
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
/**
 * OTel resource：service.name=claude-code、service.version、os/arch、wsl.version 及 OTEL_RESOURCE_ATTRIBUTES。
 */
//@ chunk-9vvvg0d3.js:34883-35485 sole-consumer
function buildOtelResource() {
  let e = getCachedTelemetryResource();
  if (e) return e;
  let r = getPlatform(),
    o = { [Z.ATTR_SERVICE_NAME]: "claude-code", [Z.ATTR_SERVICE_VERSION]: getServiceVersion() };
  if (r === "wsl") {
    let O = getWslVersion();
    if (O) o["wsl.version"] = O;
  }
  let resourceFromAttributes = D.resourceFromAttributes(o),
    resourceFromAttributes_2 = D.resourceFromAttributes(
      hasRemoteOtelLogsEndpoint() ? {} : D.osDetector.detect().attributes || {},
    ),
    resourceFromAttributes_3 = D.resourceFromAttributes({
      [Z.SEMRESATTRS_HOST_ARCH]: normalizeArchForOtel(arch()),
    }),
    a = gatewayIdentityAttributes(),
    p = Object.keys(a).length > 0,
    f = D.envDetector.detect().attributes || {},
    resourceFromAttributes_4 = D.resourceFromAttributes(
      isTracesRelayed() ? {} : p ? wi(f, (O, T) => T.startsWith("user.") || T.startsWith("identity.")) : f,
    ),
    merge = resourceFromAttributes
      .merge(resourceFromAttributes_2)
      .merge(resourceFromAttributes_3)
      .merge(resourceFromAttributes_4)
      .merge(D.resourceFromAttributes(a));
  return (setCachedTelemetryResource(merge), merge);
}
/**
 * beta 详细追踪：把 trace/log 发到 BETA_TRACING_ENDPOINT。
 */
//@ chunk-9vvvg0d3.js:35485-36594 fingerprint = initializeBetaTracing (0.51)
function initializeBetaTracing() {
  let e = buildOtelResource(),
    r = new BufferingSpanExporter(),
    spanProcessor = new j(r, { scheduledDelayMillis: st }),
    tracerProvider = new te({ resource: e, spanProcessors: [spanProcessor] });
  (A.trace.setGlobalTracerProvider(tracerProvider), setTracerProvider(tracerProvider));
  let s = new BufferingExporter(),
    logExporter = new P8t({ resource: e, processors: [new vlt(s, { scheduledDelayMillis: nt })] });
  (diagnosticTracker.setGlobalLoggerProvider(logExporter), setLoggerProvider(logExporter));
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
  (setEventLogger(eventLogger, "beta"),
    process.on("beforeExit", async () => {
      (await logExporter.forceFlush().catch(() => {}), await tracerProvider.forceFlush().catch(() => {}));
    }),
    process.on("exit", () => {
      (logExporter.forceFlush().catch(() => {}), tracerProvider.forceFlush().catch(() => {}));
    }),
    initializeBetaTracingExporters(r, s).catch((p) =>
      logForDebugging(`Beta tracing exporter wiring failed: ${p}`, { level: "error" }),
    ));
}
/**
 * beta 追踪导出器：把 trace 与 log 分别发往 BETA_TRACING_ENDPOINT/v1/traces 与 /v1/logs。
 */
//@ chunk-9vvvg0d3.js:36594-36876 layout
async function initializeBetaTracingExporters(e, r) {
  let BETA_TRACING_ENDPOINT = env.BETA_TRACING_ENDPOINT;
  if (!BETA_TRACING_ENDPOINT) return;
  let [{ OTLPTraceExporter: n }, { OTLPLogExporter: s }] = await Promise.all([
    import("./chunk-733pppnh.js"),
    import("./chunk-3pt5dasv.js"),
  ]);
  (e.setDelegate(new n({ url: `${BETA_TRACING_ENDPOINT}/v1/traces` })),
    r.setDelegate(new s({ url: `${BETA_TRACING_ENDPOINT}/v1/logs` })));
}
//@ chunk-9vvvg0d3.js:36876-36897 layout
async function initializeAntTelemetry() {}
//@ chunk-9vvvg0d3.js:36897-37003 file-local
function parseExporterTypes(value) {
  return (value || "")
    .trim()
    .split(",")
    .filter(Boolean)
    .map((r) => r.trim())
    .filter((r) => r !== "none");
}
//@ chunk-9vvvg0d3.js:37003-37369 layout
function wrapExporterWithFirstExportLog(e, r) {
  let o = !1,
    n = r && buildExporterDiagnostics(e, r);
  return (s) => {
    let u = s instanceof k.ConsoleMetricExporter || s instanceof ie || s instanceof oe ? void 0 : n,
      a = s.export.bind(s);
    return (
      (s.export = (p, f) =>
        a(p, (h) => {
          if (!o)
            ((o = !0),
              logForDebugging(
                `[3P telemetry] First ${e} export: ${h.code === me.ExportResultCode.SUCCESS ? "SUCCESS" : `FAILED (${h.error?.message ?? "unknown"})`}`,
              ));
          try {
            u?.(h);
          } catch (error) {
            logError(error);
          }
          f(h);
        })),
      s
    );
  };
}
//@ chunk-9vvvg0d3.js:37369-37511 layout
function describeExporterTransport(e, r) {
  return {
    protocol: e,
    viaProxy:
      e === "grpc"
        ? void 0
        : r.httpAgentOptions === getCachedOtlpHttpAgentFactory(!0, "strict") ||
          r.httpAgentOptions === getCachedOtlpHttpAgentFactory(!0, "customer"),
  };
}
/**
 * 收集 OTLP 请求头：OTEL_EXPORTER_OTLP_HEADERS、OTEL_EXPORTER_OTLP_<SIGNAL>_HEADERS 与 otelHeadersHelper 输出。
 */
//@ chunk-9vvvg0d3.js:37511-37796 layout
function getOtlpHeaders(e, r) {
  let o =
    r.onlyConfigHeaders === !0
      ? ["OTEL_EXPORTER_OTLP_HEADERS", `OTEL_EXPORTER_OTLP_${j5t[e]}_HEADERS`].flatMap((n) => {
          let s = env[n];
          return s === void 0 ? [] : [{ name: n, value: s }];
        })
      : [];
  for (let { name: n } of o) env.unset(n);
  return {
    [Symbol.dispose]() {
      for (let { name: n, value: s } of o) env.set(n, s);
    },
  };
}
/**
 * 按 OTEL_METRICS_EXPORTER（otlp/prometheus/console）和 OTEL_EXPORTER_OTLP_PROTOCOL 创建 metric reader，导出间隔 OTEL_METRIC_EXPORT_INTERVAL（默认 60 秒）。
 */
//@ chunk-9vvvg0d3.js:37796-39309 fingerprint = getOtlpReaders (0.626)
async function getOtlpReaders(e) {
  let r = env.OTEL_METRIC_EXPORT_INTERVAL ?? DEFAULT_METRICS_EXPORT_INTERVAL_MS;
  logForDebugging(
    `[3P telemetry] getOtlpReaders: types=${jsonStringify(e)}, interval=${r}, protocol=${env.OTEL_EXPORTER_OTLP_PROTOCOL}, endpoint=${env.OTEL_EXPORTER_OTLP_ENDPOINT}`,
  );
  let exporters = [],
    n;
  for (let exporterType of e)
    if (exporterType === "console") {
      let a = new k.ConsoleMetricExporter(),
        originalExport = a.export.bind(a);
      ((a.export = (metrics, callback) => {
        if (metrics.resource && metrics.resource.attributes)
          (logForDebugging(`
=== Resource Attributes ===`),
            logForDebugging(jsonStringify(metrics.resource.attributes)),
            logForDebugging(`===========================
`));
        return originalExport(metrics, callback);
      }),
        exporters.push(a));
    } else if (exporterType === "otlp") {
      let a = env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL,
        p = getOTLPExporterConfig("metrics", a);
      switch (((n = describeExporterTransport(a, p)), a)) {
        case "grpc": {
          let { OTLPMetricExporter: OTLPMetricExporter } = await import("./chunk-6n5d7gpq.js").then((m) =>
            Re(m.default, 1),
          );
          exporters.push(new OTLPMetricExporter());
          break;
        }
        case "http/json": {
          let { OTLPMetricExporter: OTLPMetricExporter } = await import("./chunk-jw1wb0qr.js").then((m) =>
            Re(m.default, 1),
          );
          using h = getOtlpHeaders("metrics", p);
          exporters.push(new OTLPMetricExporter(p));
          break;
        }
        case "http/protobuf": {
          let { OTLPMetricExporter: OTLPMetricExporter } = await import("./chunk-qrf13zdh.js");
          using h = getOtlpHeaders("metrics", p);
          exporters.push(new OTLPMetricExporter(p));
          break;
        }
        default:
          throw Error(
            `Unknown protocol set in OTEL_EXPORTER_OTLP_METRICS_PROTOCOL or OTEL_EXPORTER_OTLP_PROTOCOL env var: ${a}`,
          );
      }
    } else if (exporterType === "prometheus") {
      let { PrometheusExporter: PrometheusExporter } = await import("./chunk-1gzy30bn.js").then((m) =>
        Re(m.default, 1),
      );
      exporters.push(new PrometheusExporter());
    } else throw Error(`Unknown exporter type set in OTEL_METRICS_EXPORTER env var: ${exporterType}`);
  let s = wrapExporterWithFirstExportLog("metrics", n);
  return exporters.map((exporter) => {
    if ("export" in exporter)
      return new k.PeriodicExportingMetricReader({ exporter: s(exporter), exportIntervalMillis: r });
    return exporter;
  });
}
/**
 * 按 OTEL_LOGS_EXPORTER 创建日志导出器（otlp/console）。
 */
//@ chunk-9vvvg0d3.js:39309-40257 fingerprint = getOtlpLogExporters (0.86)
async function getOtlpLogExporters() {
  let exporterTypes = parseExporterTypes(env.OTEL_LOGS_EXPORTER),
    protocol = env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL,
    endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  logForDebugging(
    `[3P telemetry] getOtlpLogExporters: types=${jsonStringify(exporterTypes)}, protocol=${protocol}, endpoint=${endpoint}`,
  );
  let exporters = [],
    s;
  for (let exporterType of exporterTypes)
    if (exporterType === "console") exporters.push(new ie());
    else if (exporterType === "otlp") {
      let a = getOTLPExporterConfig("logs", protocol);
      switch (((s = describeExporterTransport(protocol, a)), protocol)) {
        case "grpc": {
          let { OTLPLogExporter: OTLPLogExporter } = await import("./chunk-vt7p2m92.js").then((m) =>
            Re(m.default, 1),
          );
          exporters.push(new OTLPLogExporter());
          break;
        }
        case "http/json": {
          let { OTLPLogExporter: OTLPLogExporter } = await import("./chunk-3pt5dasv.js");
          using f = getOtlpHeaders("logs", a);
          exporters.push(new OTLPLogExporter(a));
          break;
        }
        case "http/protobuf": {
          let { OTLPLogExporter: OTLPLogExporter } = await import("./chunk-290z83zt.js");
          using f = getOtlpHeaders("logs", a);
          exporters.push(new OTLPLogExporter(a));
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
/**
 * 按 OTEL_TRACES_EXPORTER 创建 trace 导出器。
 */
//@ chunk-9vvvg0d3.js:40257-41145 fingerprint = getOtlpTraceExporters (0.811)
async function getOtlpTraceExporters() {
  let exporterTypes = parseExporterTypes(env.OTEL_TRACES_EXPORTER),
    exporters = [],
    o;
  for (let exporterType of exporterTypes)
    if (exporterType === "console") exporters.push(new oe());
    else if (exporterType === "otlp") {
      let s =
          ccrTracesRelayUrl() !== null
            ? "http/protobuf"
            : env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL || env.OTEL_EXPORTER_OTLP_PROTOCOL,
        u = getOTLPExporterConfig("traces", s);
      if (!isCcrTracesEndpoint()) o = describeExporterTransport(s, u);
      switch (s) {
        case "grpc": {
          let { OTLPTraceExporter: OTLPTraceExporter } = await import("./chunk-qz9ye512.js").then((m) =>
            Re(m.default, 1),
          );
          exporters.push(new OTLPTraceExporter());
          break;
        }
        case "http/json": {
          let { OTLPTraceExporter: OTLPTraceExporter } = await import("./chunk-733pppnh.js");
          using p = getOtlpHeaders("traces", u);
          exporters.push(new OTLPTraceExporter(u));
          break;
        }
        case "http/protobuf": {
          let { OTLPTraceExporter: OTLPTraceExporter } = await import("./chunk-yj0w6kkt.js");
          using p = getOtlpHeaders("traces", u);
          exporters.push(new OTLPTraceExporter(u));
          break;
        }
        default:
          throw Error(
            `Unknown protocol set in OTEL_EXPORTER_OTLP_TRACES_PROTOCOL or OTEL_EXPORTER_OTLP_PROTOCOL env var: ${s}`,
          );
      }
    } else throw Error(`Unknown exporter type set in OTEL_TRACES_EXPORTER env var: ${exporterType}`);
  return exporters.map(wrapExporterWithFirstExportLog("traces", o));
}
/**
 * CLAUDE_CODE_ENABLE_TELEMETRY 是否为真（第三方 OTel 导出总开关）。
 */
//@ chunk-9vvvg0d3.js:41145-41211 fingerprint = isTelemetryEnabled (1)
function isTelemetryEnabled() {
  return isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY);
}
/**
 * BigQuery 指标导出间隔：GrowthBook tengu_cozy_dusk，限制在 5–60 分钟，默认 5 分钟。
 */
//@ chunk-9vvvg0d3.js:41211-41333 layout
function getBigQueryExportIntervalMs() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_dusk", Ce);
  return typeof e === "number" && Number.isFinite(e) ? Math.min(Math.max(e, Ce), yt) : Ce;
}
/**
 * BigQuery 指标 reader，导出间隔 tengu_cozy_dusk（默认 5 分钟）。
 */
//@ chunk-9vvvg0d3.js:41333-41489 fingerprint = getBigQueryExportingReader (0.665)
function getBigQueryExportingReader(e) {
  let r = new BigQueryMetricsExporter({ storageV5: e });
  return (
    registerCleanup(() => r.armShutdownReport()),
    new k.PeriodicExportingMetricReader({ exporter: r, exportIntervalMillis: getBigQueryExportIntervalMs() })
  );
}
/**
 * 初始化 OTel：设置传播器与诊断 logger；CLAUDE_CODE_ENABLE_TELEMETRY 时按 OTEL_METRICS_EXPORTER 建 metric reader，team/enterprise 另加 BigQuery 指标；按 OTEL_LOGS_EXPORTER 建事件 logger（com.anthropic.claude_code.events）；增强遥测时按 OTEL_TRACES_EXPORTER 建 trace；注册退出 flush。
 */
//@ chunk-9vvvg0d3.js:41489-44472 fingerprint = initializeTelemetry (0.806)
async function initializeTelemetry(e, r) {
  if (
    (profileCheckpoint("telemetry_init_start"),
    configureOtelGlobals(),
    await initializeAntTelemetry(),
    A.propagation.setGlobalPropagator(new me.W3CTraceContextPropagator()),
    getHasFormattedOutput())
  )
    for (let f of ["OTEL_METRICS_EXPORTER", "OTEL_LOGS_EXPORTER", "OTEL_TRACES_EXPORTER"]) {
      let h = process.env[f];
      if (h?.includes("console"))
        process.env[f] = h
          .split(",")
          .map((E) => E.trim())
          .filter((E) => E !== "console")
          .join(",");
    }
  (A.diag.setLogger(
    new ClaudeCodeDiagLogger(),
    env.CLAUDE_CODE_IS_COWORK ? A.DiagLogLevel.WARN : A.DiagLogLevel.ERROR,
  ),
    initializePerfettoTracing());
  let readers = [],
    telemetryEnabled = isTelemetryEnabled(),
    s = telemetryEnabled ? parseExporterTypes(env.OTEL_METRICS_EXPORTER) : [];
  if (
    (logForDebugging(
      `[3P telemetry] isTelemetryEnabled=${telemetryEnabled} (CLAUDE_CODE_ENABLE_TELEMETRY=${process.env.CLAUDE_CODE_ENABLE_TELEMETRY})`,
    ),
    telemetryEnabled)
  )
    readers.push(...(await getOtlpReaders(s)));
  if (!r?.disableBigQuery && isBigQueryMetricsEnabled()) readers.push(getBigQueryExportingReader(e));
  let platform = buildOtelResource();
  if (isBetaTracingEnabled()) {
    if (!getTracerProvider()) initializeBetaTracing();
    let f = new k.MeterProvider({ resource: platform, views: [], readers: readers });
    return (
      XYo(f),
      registerCleanup(async () => {
        let E = env.CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS ?? 2000;
        try {
          endInteractionSpan();
          let wslVersion = getLoggerProvider(),
            loggerProvider = getTracerProvider(),
            chains = [f.shutdown()];
          if (wslVersion)
            chains.push(
              eventRecordQueue
                .settledWithin(E / 2)
                .then(() => wslVersion.forceFlush())
                .then(() => wslVersion.shutdown()),
            );
          if (loggerProvider) chains.push(loggerProvider.forceFlush().then(() => loggerProvider.shutdown()));
          await Promise.race([Promise.all(chains), telemetryTimeout(E, "OpenTelemetry shutdown timeout")]);
        } catch {}
      }),
      { meter: f.getMeter("com.anthropic.claude_code", getServiceVersion()), metricsExporterKinds: s }
    );
  }
  let a = new k.MeterProvider({ resource: platform, views: [], readers: readers });
  if ((XYo(a), telemetryEnabled && (!isDiskless() || hasRemoteOtelLogsEndpoint()))) {
    let logExporters = await getOtlpLogExporters();
    if (
      (logForDebugging(`[3P telemetry] Created ${logExporters.length} log exporter(s)`),
      logExporters.length > 0)
    ) {
      let loggerProvider = new P8t({
        resource: platform,
        processors: logExporters.map(
          (exporter) => new vlt(exporter, { scheduledDelayMillis: env.OTEL_LOGS_EXPORT_INTERVAL ?? nt }),
        ),
      });
      if (!isDiskless()) diagnosticTracker.setGlobalLoggerProvider(loggerProvider);
      setLoggerProvider(loggerProvider);
      let eventLogger = loggerProvider.getLogger("com.anthropic.claude_code.events", getServiceVersion());
      (setEventLogger(eventLogger, "org"),
        logForDebugging("[3P telemetry] Event logger set successfully"),
        process.on("beforeExit", async () => {
          (await loggerProvider?.forceFlush(), await getTracerProvider()?.forceFlush());
        }),
        process.on("exit", () => {
          (loggerProvider?.forceFlush(), getTracerProvider()?.forceFlush());
        }));
    }
  }
  if (telemetryEnabled && isEnhancedTelemetryEnabled() && !isDiskless()) {
    let traceExporters = await getOtlpTraceExporters();
    if (traceExporters.length > 0) {
      AQr.freeze();
      let E = isTracesRelayed() ? zt : void 0,
        spanProcessors = traceExporters.map(
          (exporter) =>
            new j(exporter, {
              scheduledDelayMillis: env.OTEL_TRACES_EXPORT_INTERVAL ?? st,
              ...(E !== void 0 && { maxExportBatchSize: E }),
            }),
        ),
        tracerProvider = new te({ resource: platform, spanProcessors: spanProcessors });
      (A.trace.setGlobalTracerProvider(tracerProvider),
        setTracerProvider(tracerProvider),
        process.on("beforeExit", async () => {
          await tracerProvider.forceFlush();
        }));
    }
  }
  return (
    registerCleanup(async () => {
      let f = env.CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS ?? 2000;
      try {
        endInteractionSpan();
        let shutdownPromises = [a.shutdown()],
          loggerProvider = getLoggerProvider();
        if (loggerProvider)
          shutdownPromises.push(eventRecordQueue.settledWithin(f / 2).then(() => loggerProvider.shutdown()));
        let tracerProvider = getTracerProvider();
        if (tracerProvider) shutdownPromises.push(tracerProvider.shutdown());
        await Promise.race([
          Promise.all(shutdownPromises),
          telemetryTimeout(f, "OpenTelemetry shutdown timeout"),
        ]);
      } catch (error) {
        if (error instanceof Error && error.message.includes("timeout"))
          logForDebugging(
            `
OpenTelemetry telemetry flush timed out after ${f}ms

To resolve this issue, you can:
1. Increase the timeout by setting CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS env var (e.g., 5000 for 5 seconds)
2. Check if your OpenTelemetry backend is experiencing scalability issues
3. Disable OpenTelemetry by unsetting CLAUDE_CODE_ENABLE_TELEMETRY env var

Current timeout: ${f}ms
`,
            { level: "error" },
          );
        throw error;
      }
    }),
    { meter: a.getMeter("com.anthropic.claude_code", getServiceVersion()), metricsExporterKinds: s }
  );
}
/**
 * flush 全部 OTel provider，超时记录日志。
 */
//@ chunk-9vvvg0d3.js:44472-44991 fingerprint = flushTelemetry (0.963)
async function flushTelemetry() {
  let meterProvider = getMeterProvider();
  if (!meterProvider) return;
  let r = env.CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS ?? 5000;
  try {
    let flushPromises = [meterProvider.forceFlush()],
      loggerProvider = getLoggerProvider();
    if (loggerProvider)
      flushPromises.push(eventRecordQueue.settledWithin(r / 2).then(() => loggerProvider.forceFlush()));
    let tracerProvider = getTracerProvider();
    if (tracerProvider) flushPromises.push(tracerProvider.forceFlush());
    (await Promise.race([Promise.all(flushPromises), telemetryTimeout(r, "OpenTelemetry flush timeout")]),
      logForDebugging("Telemetry flushed successfully"));
  } catch (error) {
    if (error instanceof TelemetryTimeoutError)
      logForDebugging(`Telemetry flush timed out after ${r}ms. Some metrics may not be exported.`, {
        level: "warn",
      });
    else logForDebugging(`Telemetry flush failed: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-9vvvg0d3.js:44991-45159 fingerprint = parseOtelHeadersEnvVar (1)
function parseOtelHeadersEnvVar() {
  let headers = {},
    envHeaders = env.OTEL_EXPORTER_OTLP_HEADERS;
  if (envHeaders)
    for (let pair of envHeaders.split(",")) {
      let [n, ...s] = pair.split("=");
      if (n && s.length > 0) headers[n.trim()] = s.join("=").trim();
    }
  return headers;
}
/**
 * OTLP 导出器配置：endpoint（OTEL_EXPORTER_OTLP_<SIGNAL>_ENDPOINT/ENDPOINT + /v1/<signal>）、headers（含 otelHeadersHelper）、代理与 mTLS。
 */
//@ chunk-9vvvg0d3.js:45159-46457 callgraph-witnessed = getOTLPExporterConfig (0.158)
function getOTLPExporterConfig(e, r) {
  let o = !!getConfiguredOtelHeadersHelper(),
    config = {},
    staticHeaders = getGatewayAuth(),
    u = isGatewayAuthPinned(staticHeaders) ? gatewayManagedCollectorUrl(e, staticHeaders, o) : null;
  if (isGatewayAuthPinned(staticHeaders) && u === null) {
    let url = staticHeaders.url;
    return (
      (config.url = `${url}/v1/${e}`),
      (config.headers = async () => {
        await refreshGatewayToken();
        let dynamicHeaders = getGatewayAuth();
        if (!dynamicHeaders || dynamicHeaders.url !== url) return {};
        return { Authorization: `Bearer ${dynamicHeaders.jwt}` };
      }),
      (config.httpAgentOptions = createOtlpAgentFactory(url, { carriesOurToken: !1 })),
      config
    );
  }
  let a = isGatewayAuthPinned(staticHeaders) ? null : getRemoteOtlpEndpoint(e);
  if (a !== null)
    return (
      (config.url = a),
      (config.headers = async () => {
        if (getRemoteOtlpEndpoint(e) !== a) return {};
        return configureApiKeyHeaders(env.CLAUDE_CODE_SESSION_ACCESS_TOKEN);
      }),
      (config.httpAgentOptions = createOtlpAgentFactory(a, { carriesOurToken: !0 })),
      config
    );
  let caCerts = parseOtelHeadersEnvVar(),
    f = gatewayRelayConfig(e, o),
    h = ccrTraceRelayConfig(e);
  if (h.send)
    return (
      (config.url = h.url),
      (config.headers = h.headers),
      (config.httpAgentOptions = createOtlpAgentFactory(h.url, { carriesOurToken: !0 })),
      AQr.arm(),
      config
    );
  if (o) {
    if (
      ((config.headers = async () => {
        let O = await getOtelHeadersFromHelper();
        return { ...caCerts, ...O };
      }),
      r === "http/json" || r === "http/protobuf")
    )
      prefetchOtelHeadersFromHelper();
  } else if (f.send)
    return (
      (config.url = f.url),
      (config.headers = f.headers),
      (config.onlyConfigHeaders = !0),
      (config.httpAgentOptions = createOtlpAgentFactory(f.url, { carriesOurToken: !1 })),
      config
    );
  else if (Object.keys(caCerts).length > 0) config.headers = async () => caCerts;
  let E = createOtlpAgentFactory(
    u ?? (process.env[`OTEL_EXPORTER_OTLP_${j5t[e]}_ENDPOINT`]?.trim() || env.OTEL_EXPORTER_OTLP_ENDPOINT),
    { carriesOurToken: !1 },
  );
  if (((config.httpAgentOptions = E), u !== null)) {
    config.url = u;
    let O = staticHeaders?.url,
      headers = config.headers;
    config.headers = async () => {
      if (getGatewayAuth()?.url !== O)
        throw Error(
          "The Cloud gateway session that named this collector ended \u2014 dropping this telemetry batch",
        );
      return typeof headers === "function" ? await headers() : {};
    };
  }
  return config;
}
//@ chunk-9vvvg0d3.js:46457-46731 sole-consumer
function gatewayManagedCollectorUrl(e, r, o) {
  if (o) return null;
  let n = resolveOtlpEndpoint(remotePolicySettings()?.env, e);
  if (n === null) return null;
  if (envOtlpEndpoint(e) !== n || isGatewayHost(n, r) || !lt(n) || !pt(n, e)) return null;
  return (
    logForDebugging(
      `[3P telemetry] ${e}: exporting to the collector the gateway's managed settings name (${redactUrlsInText(n)}), not through the gateway relay`,
    ),
    n
  );
}
//@ chunk-9vvvg0d3.js:46731-46833 sole-consumer
function remotePolicySettings() {
  if (getPolicySettingsOrigin() !== "remote") return null;
  if (!isRemoteManagedSettingsVerified() && getRemoteSettingsPathOverride() === void 0) return null;
  return getAllPolicyTierSettings()[0] ?? null;
}
//@ chunk-9vvvg0d3.js:46833-47009 sole-consumer
function envOtlpEndpoint(e) {
  let r = j5t[e];
  return resolveOtlpEndpoint(
    {
      OTEL_EXPORTER_OTLP_ENDPOINT: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      [`OTEL_EXPORTER_OTLP_${r}_ENDPOINT`]: env[`OTEL_EXPORTER_OTLP_${r}_ENDPOINT`],
    },
    e,
  );
}
/**
 * 从环境映射中解析某信号的 OTLP 端点（专用或通用 + /v1/<信号>）。
 */
//@ chunk-9vvvg0d3.js:47009-47368 sole-consumer
function resolveOtlpEndpoint(e, r) {
  if (!e) return null;
  let o = new Map();
  for (let [u, a] of Object.entries(e)) {
    let upper = u.toUpperCase();
    if (a !== void 0 && (!o.has(upper) || u === upper)) o.set(upper, a);
  }
  let n = o.get(`OTEL_EXPORTER_OTLP_${j5t[r]}_ENDPOINT`);
  if (n?.trim()) return normalizeHttpUrl(n);
  let s = o.get("OTEL_EXPORTER_OTLP_ENDPOINT");
  if (!s?.trim() || normalizeHttpUrl(s) === null) return null;
  return normalizeHttpUrl(`${s}${s.endsWith("/") ? "" : "/"}v1/${r}`);
}
//@ chunk-9vvvg0d3.js:47368-47557 sole-consumer
function isGatewayHost(e, r) {
  let o = rt(e);
  if (o === null) return !1;
  let n = [r.url],
    s = decodeJwtPayload(r.jwt);
  if (s !== null && typeof s === "object" && "iss" in s && typeof s.iss === "string") n.push(s.iss);
  return n.some((u) => rt(u) === o);
}
//@ chunk-9vvvg0d3.js:47557-47644 sole-consumer
function rt(e) {
  let r = normalizeHttpUrl(e);
  return r === null ? null : new URL(r).host.replace(/\.(?=:|$)/, "");
}
//@ chunk-9vvvg0d3.js:47644-47737 sole-consumer
function pt(e, r) {
  let o = new URL(e);
  return o.pathname.endsWith(`/v1/${r}`) && !o.search && !o.hash;
}
//@ chunk-9vvvg0d3.js:47737-47832 sole-consumer
function lt(e) {
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
/**
 * 宿主托管网关令牌时经网关中继导出的配置。
 */
//@ chunk-9vvvg0d3.js:47958-48457 sole-consumer
function gatewayRelayConfig(e, r) {
  let o = { send: !1 },
    n = (a) => {
      if (!a || normalizeHttpUrl(a) === null) return null;
      let p = normalizeHttpUrl(`${a.replace(/\/+$/, "")}/v1/${e}`);
      return p !== null && lt(p) && pt(p, e) ? p : null;
    };
  if (!isHostManagedProviderAuth()) return o;
  let s = getAPIProvider();
  if (s !== "firstParty" && s !== "gateway") return o;
  if (!isGatewayToken(env.ANTHROPIC_AUTH_TOKEN)) return o;
  if (r) return o;
  let u = n(env.ANTHROPIC_BASE_URL);
  if (!u) return o;
  if (envOtlpEndpoint(e) !== u) return o;
  return {
    send: !0,
    url: u,
    headers: async () => {
      let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
      return ANTHROPIC_AUTH_TOKEN && isGatewayToken(ANTHROPIC_AUTH_TOKEN) && n(env.ANTHROPIC_BASE_URL) === u
        ? { Authorization: `Bearer ${ANTHROPIC_AUTH_TOKEN}` }
        : {};
    },
  };
}
//@ chunk-9vvvg0d3.js:48457-48468 sole-consumer
var zt = 100;
//@ chunk-9vvvg0d3.js:48468-48601 sole-consumer
function ccrTraceRelayConfig(e) {
  let r = { send: !1 };
  if (e !== "traces") return r;
  let o = ccrTracesRelayUrl();
  if (o === null) return r;
  return { send: !0, url: o, headers: async () => getSessionIngressAuthHeaders() };
}
//@ chunk-9vvvg0d3.js:48601-48769 sole-consumer
function isLoopbackUrl(e) {
  if (!e) return !1;
  try {
    let lower = new URL(e).hostname.toLowerCase();
    return lower === "localhost" || lower === "::1" || lower === "[::1]" || /^127(\.\d{1,3}){3}$/.test(lower);
  } catch {
    return !1;
  }
}
//@ chunk-9vvvg0d3.js:48769-49019 sole-consumer
function toBufferChunk(e, r) {
  if (Buffer.isBuffer(e)) return e;
  if (typeof e === "string") return typeof r === "string" ? Buffer.from(e, r) : Buffer.from(e);
  if (e instanceof Uint8Array) return Buffer.from(e);
  throw TypeError("OTLP request body chunk is not string or Uint8Array");
}
/**
 * 给 Agent 打补丁：无长度头的请求先缓冲整个请求体再发送。
 */
//@ chunk-9vvvg0d3.js:49019-49768 sole-consumer
function bufferRequestBodies(e) {
  let r = e,
    o = r.addRequest.bind(r);
  return (
    (r.addRequest = function (s, ...u) {
      if (!s.getHeader("content-length") && !s.getHeader("transfer-encoding")) {
        let h = function () {
            ((s.write = p), (s.end = f));
          },
          E = function (O) {
            (h(), s.destroy(O instanceof Error ? O : TypeError("OTLP request body chunk conversion failed")));
          },
          a = [],
          p = s.write.bind(s),
          f = s.end.bind(s);
        ((s.write = function (T, P, C) {
          try {
            a.push(toBufferChunk(T, P));
          } catch (error) {
            return (E(error), !1);
          }
          let F = typeof P === "function" ? P : C;
          if (F) process.nextTick(F, null);
          return !0;
        }),
          (s.end = function (T, P, C) {
            if (T != null && typeof T !== "function")
              try {
                a.push(toBufferChunk(T, P));
              } catch (error) {
                return (E(error), s);
              }
            let F = typeof T === "function" ? T : typeof P === "function" ? P : C,
              buffer = Buffer.concat(a);
            if (!s.headersSent) s.setHeader("Content-Length", String(buffer.byteLength));
            return (h(), f(buffer, F));
          }));
      }
      o(s, ...u);
    }),
    e
  );
}
/**
 * OTLP HTTP Agent 工厂（代理、mTLS、CA，按协议缓存）。
 */
//@ chunk-9vvvg0d3.js:49768-50235 sole-consumer
function createOtlpAgentFactory(e, { carriesOurToken: carriesOurToken }) {
  let o = getUsableProxyUrl(),
    n = !!(o && !isLoopbackUrl(e) && !(e && shouldBypassProxy(e))),
    s = carriesOurToken ? void 0 : anthropicHostOf(e),
    u = s ? "customer" : "strict",
    a = getCachedOtlpHttpAgentFactory(n, u);
  if (a) return a;
  let p = getMTLSConfig(),
    f = caListBehindProxy(s),
    h = { ...p, ...(f && { ca: f }) },
    E,
    O,
    T,
    P = (C) => {
      if (n) {
        if (!T)
          ((T = bufferRequestBodies(new TlsCheckingProxyAgent(o, { ...h, keepAlive: !0, maxSockets: 1 }))),
            (T.options = { ...T.options, ...h }));
        return T;
      }
      if (C === "http:") {
        if (!E) E = bufferRequestBodies(new http.Agent({ keepAlive: !0, maxSockets: 1 }));
        return E;
      }
      if (!O) O = bufferRequestBodies(new https.Agent({ ...h, keepAlive: !0, maxSockets: 1 }));
      return O;
    };
  return (setCachedOtlpHttpAgentFactory(n, u, P), P);
}
//@ chunk-jhrww53q.js:3176-5552 fingerprint = bootstrapTelemetry (0.317)
Ar(P, {
  ANT_CLAUDE_CODE_METRICS_ENDPOINT: () => str_34,
  ANT_OTEL_EXPORTER_OTLP_ENDPOINT: () => str_27,
  ANT_OTEL_EXPORTER_OTLP_HEADERS: () => str_28,
  ANT_OTEL_EXPORTER_OTLP_PROTOCOL: () => str_29,
  ANT_OTEL_LOGS_EXPORTER: () => str_30,
  ANT_OTEL_METRICS_EXPORTER: () => str_31,
  ANT_OTEL_RESOURCE_ATTRIBUTES: () => str_33,
  ANT_OTEL_TRACES_EXPORTER: () => str_32,
  BETA_TRACING_ENDPOINT: () => str_35,
  CLAUDE_CODE_BENCH_LIVE_COUNTS: () => bool_7,
  CLAUDE_CODE_BYOC_ENABLE_DATADOG: () => bool_9,
  CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS: () => int_6,
  CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS: () => int_7,
  CLAUDE_CODE_DEBUG_LOGS_DIR: () => str_3,
  CLAUDE_CODE_DEBUG_LOG_LEVEL: () => str_2,
  CLAUDE_CODE_DEBUG_REPAINTS: () => bool_2,
  CLAUDE_CODE_DIAGNOSTICS_FILE: () => str_4,
  CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: () => bool_8,
  CLAUDE_CODE_FRAME_TIMING_LOG: () => str_6,
  CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY: () => int_2,
  CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH: () => int_14,
  CLAUDE_CODE_OTEL_DIAG_STDERR: () => bool_10,
  CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS: () => int_3,
  CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS: () => int_5,
  CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS: () => int_4,
  CLAUDE_CODE_PERFETTO_TRACE: () => str_5,
  CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S: () => int,
  CLAUDE_CODE_PROFILE_STARTUP: () => bool_5,
  CLAUDE_CODE_SESSION_LOG: () => str_7,
  CLAUDE_CODE_TEE_SDK_STDOUT: () => bool_6,
  CLAUDE_CODE_TERMINAL_RECORDING: () => str_9,
  CLAUDE_DEBUG: () => bool,
  CLAUDE_PTY_RECORD: () => str_8,
  DEBUG: () => str,
  DEBUG_CLAUDE_AGENT_SDK: () => bool_3,
  DEBUG_SDK: () => bool_4,
  OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => int_11,
  OTEL_EXPORTER_OTLP_ENDPOINT: () => str_13,
  OTEL_EXPORTER_OTLP_HEADERS: () => str_14,
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: () => str_16,
  OTEL_EXPORTER_OTLP_LOGS_HEADERS: () => str_17,
  OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: () => str_18,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: () => str_19,
  OTEL_EXPORTER_OTLP_METRICS_HEADERS: () => str_20,
  OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: () => str_21,
  OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: () => str_22,
  OTEL_EXPORTER_OTLP_PROTOCOL: () => str_15,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: () => str_23,
  OTEL_EXPORTER_OTLP_TRACES_HEADERS: () => str_24,
  OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: () => str_25,
  OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => int_12,
  OTEL_LOGS_EXPORTER: () => str_11,
  OTEL_LOGS_EXPORT_INTERVAL: () => int_9,
  OTEL_LOG_ASSISTANT_RESPONSES: () => triBool,
  OTEL_LOG_MANAGED_SETTINGS: () => bool_14,
  OTEL_LOG_RAW_API_BODIES: () => bool_15,
  OTEL_LOG_TOOL_CONTENT: () => bool_12,
  OTEL_LOG_TOOL_DETAILS: () => bool_13,
  OTEL_LOG_USER_PROMPTS: () => bool_11,
  OTEL_METRICS_EXPORTER: () => str_10,
  OTEL_METRIC_EXPORT_INTERVAL: () => int_8,
  OTEL_RESOURCE_ATTRIBUTES: () => str_26,
  OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: () => int_13,
  OTEL_TRACES_EXPORTER: () => str_12,
  OTEL_TRACES_EXPORT_INTERVAL: () => int_10,
});

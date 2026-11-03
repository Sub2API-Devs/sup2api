/**
 * utils/telemetry/bigqueryExporter.ts
 *
 * BigQuery 指标导出器：POST <BASE_API_URL>/api/claude_code/metrics（team/enterprise）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/bigqueryExporter.ts
 * pieces: chunk-9vvvg0d3.js (8)
 * attribution: placement 6, affinity 1, fingerprint 1
 */
import {
  isClaudeAISubscriber,
  getSubscriptionType,
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  getClaudeAIOAuthTokens,
  handleOAuth401Error,
} from "../auth.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { require_sdk_metrics } from "../../../vendor/@opentelemetry/sdk-metrics/build/src/index.js";
import { classifyAxiosError } from "../errors.js";
import { env } from "../env.js";
import { CLEANUP_TIMEOUT_MS } from "../cleanupRegistry.js";
import {
  ExportFailureCounter,
  TELEMETRY_LOG_PREFIX,
} from "../../services/analytics/anthropicTelemetryExport.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { logForDebugging } from "../debug.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getAuthHeadersAsync, withOAuth401Retry_2, claudeCodeUserAgent } from "../http.js";
import { guardTelemetryCredentials } from "../../services/analytics/telemetryCredentialGuard.js";
import { refreshMetricsStatus } from "../../services/api/metricsOptOut.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify, jsonStringifyRaw } from "../slowOperations.js";
import { getResolvedWIFBaseUrlSnapshot } from "../../services/oauth/wifCredentials.js";
import {
  gzipTelemetryBody,
  sanitizeByValidators,
  validateCommonField,
  sanitizeFieldValue,
} from "../../services/analytics/eventSerialization.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { isPolicyLimitsCacheMissing } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { applyMetricAttribution } from "../../services/analytics/metadata.js";

//@ chunk-9vvvg0d3.js:24241-24416 placement
function customerTypeAttributes() {
  if (!isClaudeAISubscriber())
    return {
      "user.customer_type": "api",
    };
  let subscriptionType = getSubscriptionType();
  return subscriptionType
    ? {
        "user.customer_type": "claude_ai",
        "user.subscription_type": subscriptionType,
      }
    : {
        "user.customer_type": "claude_ai",
      };
}
//@ chunk-9vvvg0d3.js:24416-24448 placement
var otelSemconv = Re(require_core(), 1);
var promClient = Re(require_sdk_metrics(), 1);
//@ chunk-9vvvg0d3.js:24448-24772 placement
/**
 * BigQuery 导出错误归类。
 */
function classifyBigQueryError(error) {
  let { kind, status } = classifyAxiosError(error);
  switch (kind) {
    case "auth":
      return [status === 401 ? "http_401" : "http_403", status];
    case "timeout":
      return ["timeout"];
    case "network":
      return ["network_error"];
    default:
      if (status !== undefined && status >= 500) return ["http_5xx", status];
      if (status !== undefined && status >= 400) return ["http_4xx", status];
      return status !== undefined ? ["unknown_error", status] : ["unknown_error"];
  }
}
//@ chunk-9vvvg0d3.js:24772-24855 placement
function describeAxiosFailure(error) {
  let { status, message } = classifyAxiosError(error);
  return status === undefined ? message : `HTTP ${status}: ${message}`;
}
//@ chunk-9vvvg0d3.js:24855-24866 placement
var SHUTDOWN_MARGIN_MS = 250;
//@ chunk-9vvvg0d3.js:24866-24960 placement
function shutdownTimeoutMs() {
  return Math.max(
    0,
    Math.min(env.CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS ?? CLEANUP_TIMEOUT_MS, CLEANUP_TIMEOUT_MS) -
      SHUTDOWN_MARGIN_MS,
  );
}
//@ chunk-9vvvg0d3.js:25161-25205 affinity
function reportMetricsAtShutdown(e) {
  e.reportInFlightAtShutdown();
}
//@ chunk-9vvvg0d3.js:25205-31114 fingerprint = BigQueryMetricsExporter (0.642)
/**
 * BigQuery 指标导出器：POST <BASE_API_URL>/api/claude_code/metrics（OAuth/API key），失败重试与 OAuth 刷新。
 */
class BigQueryMetricsExporter {
  endpoint;
  isAntEndpointOverride;
  timeout;
  storageV5;
  pendingExports = [];
  isShutdown = false;
  reportedFailures = new Set();
  failures = new ExportFailureCounter("BigQuery metrics");
  successReported = false;
  inFlight = 0;
  oauthRefreshAttempted = false;
  constructor(e) {
    let defaultEndpoint = `${getOauthConfig().BASE_API_URL}/api/claude_code/metrics`;
    let o = undefined;
    this.isAntEndpointOverride = false;
    this.endpoint = defaultEndpoint;
    this.timeout = e.timeout || 5000;
    this.storageV5 = e.storageV5;
  }
  async export(metrics, resultCallback) {
    if (this.isShutdown) {
      logForDebugging(`${TELEMETRY_LOG_PREFIX} BigQuery metrics export arrived after shutdown, skipping`);
      resultCallback({
        code: otelSemconv.ExportResultCode.SUCCESS,
      });
      return;
    }
    let exportPromise = this.doExport(metrics, resultCallback);
    this.pendingExports.push(exportPromise);
    exportPromise.finally(() => {
      let index = this.pendingExports.indexOf(exportPromise);
      if (index > -1) this.pendingExports.splice(index, 1);
    });
  }
  async doExport(e, r) {
    try {
      if (!(checkHasTrustDialogAccepted() || getIsNonInteractiveSession())) {
        logForDebugging(`${TELEMETRY_LOG_PREFIX} BigQuery metrics export: trust not established, skipping`);
        r({
          code: otelSemconv.ExportResultCode.SUCCESS,
        });
        return;
      }
      if (!this.dispatchHostMatchesEndpoint()) {
        logForDebugging(
          `${TELEMETRY_LOG_PREFIX} BigQuery metrics export: WIF dispatch host differs from the metrics endpoint host, skipping`,
        );
        r({
          code: otelSemconv.ExportResultCode.SUCCESS,
        });
        return;
      }
      let authHeaders = await getAuthHeadersAsync();
      let s = guardTelemetryCredentials(authHeaders, this.endpoint).reasonCode === "misrouted_credential";
      if (s && !this.isAntEndpointOverride) {
        logForDebugging(
          `${TELEMETRY_LOG_PREFIX} BigQuery metrics export: credential does not belong to the metrics endpoint host, skipping`,
        );
        r({
          code: otelSemconv.ExportResultCode.SUCCESS,
        });
        return;
      }
      let u =
        guardTelemetryCredentials(
          authHeaders,
          `${getOauthConfig().BASE_API_URL}/api/claude_code/organizations/metrics_enabled`,
        ).reasonCode === "misrouted_credential";
      if (!s && !u) {
        let E = await refreshMetricsStatus(this.storageV5);
        if (E.hasError) {
          if (authHeaders.reasonCode === "wif_error") {
            this.reportFailure("wif_error");
            this.failures.record(
              `metrics opt-out check failed (WIF exchange failed: ${authHeaders.error}); skipping export`,
            );
          } else this.failures.record("metrics opt-out check failed; skipping export");
          r({
            code: otelSemconv.ExportResultCode.SUCCESS,
          });
          return;
        }
        if (!E.enabled) {
          logForDebugging(
            `${TELEMETRY_LOG_PREFIX} BigQuery metrics export disabled by organization setting, skipping`,
          );
          r({
            code: otelSemconv.ExportResultCode.SUCCESS,
          });
          return;
        }
      }
      let a = this.transformMetricsForInternal(e);
      let p = guardTelemetryCredentials(await getAuthHeadersAsync(), this.endpoint);
      let f = p.reasonCode === "misrouted_credential";
      if (p.error && !f) {
        if (p.reasonCode === "wif_error") this.reportFailure("wif_error");
        this.failures.record(p.error);
        r({
          code: otelSemconv.ExportResultCode.SUCCESS,
        });
        return;
      }
      let h;
      try {
        h = await this.postWithOAuth401Recovery(a, f ? {} : p.headers);
      } catch (error) {
        this.reportFailure(...classifyBigQueryError(error));
        throw error;
      }
      logForDebugging(`${TELEMETRY_LOG_PREFIX} BigQuery metrics exported successfully`);
      if (!this.successReported) {
        this.successReported = true;
        logFeatureOk("internal_metrics_export");
      }
      logForDebugging(`${TELEMETRY_LOG_PREFIX} BigQuery API Response: ${jsonStringify(h.data, null, 2)}`);
      r({
        code: otelSemconv.ExportResultCode.SUCCESS,
      });
    } catch (error) {
      let { kind, status } = classifyAxiosError(error);
      if (kind === "other" && status === undefined)
        logForDebugging(
          `${TELEMETRY_LOG_PREFIX} BigQuery metrics export threw before the request: ${describeAxiosFailure(error)}`,
          {
            level: "error",
          },
        );
      this.failures.record(describeAxiosFailure(error));
      r({
        code: otelSemconv.ExportResultCode.SUCCESS,
      });
    }
  }
  reportFailure(e, r) {
    let o = `${e}:${r ?? ""}`;
    if (this.reportedFailures.has(o)) return;
    this.reportedFailures.add(o);
    logFeatureBad(
      "internal_metrics_export",
      e,
      r === undefined
        ? {}
        : {
            http_status: r,
          },
    );
  }
  dispatchHostMatchesEndpoint() {
    if (!(getAnthropicApiKeySafe() === null && shouldUseWIFAuth())) return true;
    let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
    if (resolvedWIFBaseUrlSnapshot === undefined) return false;
    return (
      (resolvedWIFBaseUrlSnapshot === null
        ? "api.anthropic.com"
        : new URL(resolvedWIFBaseUrlSnapshot).host) === new URL(this.endpoint).host
    );
  }
  async postWithOAuth401Recovery(e, r) {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    let accessToken =
      claudeAIOAuthTokens?.accessToken &&
      claudeAIOAuthTokens.refreshToken &&
      r.Authorization === `Bearer ${claudeAIOAuthTokens.accessToken}`
        ? claudeAIOAuthTokens.accessToken
        : undefined;
    this.inFlight++;
    try {
      return await this.postOnce(e, r);
    } catch (error) {
      if (!accessToken || !withOAuth401Retry_2(error)) throw error;
      let accessToken_2 = getClaudeAIOAuthTokens()?.accessToken;
      if (accessToken_2 && accessToken_2 !== accessToken)
        return await this.postOnce(e, {
          ...r,
          Authorization: `Bearer ${accessToken_2}`,
        });
      if (this.oauthRefreshAttempted) throw error;
      this.oauthRefreshAttempted = true;
      try {
        await handleOAuth401Error(accessToken, undefined, this.storageV5);
      } catch {
        throw error;
      }
      let accessToken_3 = getClaudeAIOAuthTokens()?.accessToken;
      if (!accessToken_3 || accessToken_3 === accessToken) throw error;
      let p = await this.postOnce(e, {
        ...r,
        Authorization: `Bearer ${accessToken_3}`,
      });
      this.oauthRefreshAttempted = false;
      return p;
    } finally {
      this.inFlight--;
    }
  }
  postOnce(e, r) {
    let o = {
      "Content-Type": "application/json",
      "User-Agent": claudeCodeUserAgent(),
      ...r,
    };
    let n = gzipTelemetryBody({
      url: this.endpoint,
      payload: e,
      storageV5: this.storageV5,
    });
    return axios_default.post(this.endpoint, n?.body ?? e, {
      timeout: this.timeout,
      maxRedirects: 0,
      headers: n
        ? {
            ...o,
            ...n.headers,
          }
        : o,
    });
  }
  transformMetricsForInternal(metrics) {
    let attrs = metrics.resource.attributes;
    let resourceAttributes = {
      "service.name": attrs["service.name"] || "claude-code",
      "service.version": attrs["service.version"] || "unknown",
      "os.type": attrs["os.type"] || "unknown",
      "os.version": attrs["os.version"] || "unknown",
      "host.arch": attrs["host.arch"] || "unknown",
      "aggregation.temporality":
        this.selectAggregationTemporality() === promClient.AggregationTemporality.DELTA
          ? "delta"
          : "cumulative",
    };
    if (attrs["wsl.version"]) resourceAttributes["wsl.version"] = attrs["wsl.version"];
    Object.assign(resourceAttributes, customerTypeAttributes());
    let subscriptionType = isPolicyLimitsCacheMissing() || hasComplianceTaint("hipaa");
    return {
      resource_attributes: subscriptionType
        ? sanitizeByValidators(resourceAttributes, validateCommonField)
        : resourceAttributes,
      metrics: metrics.scopeMetrics.flatMap((scopeMetric) =>
        scopeMetric.metrics.map((metric) => ({
          name: metric.descriptor.name,
          description: metric.descriptor.description,
          unit: metric.descriptor.unit,
          data_points: this.extractDataPoints(metric, subscriptionType),
        })),
      ),
    };
  }
  extractDataPoints(metric, r) {
    let dataPoints = metric.dataPoints || [];
    let n = new Map();
    for (let dataPoint of dataPoints) {
      if (typeof dataPoint.value !== "number") continue;
      let u = applyMetricAttribution(dataPoint.attributes);
      let a = this.convertAttributes(u);
      let p = r ? sanitizeByValidators(a, sanitizeFieldValue) : a;
      let f = this.hrTimeToISOString(dataPoint.endTime || dataPoint.startTime || [Date.now() / 1000, 0]);
      let h = jsonStringifyRaw(Object.entries(r ? p : u).sort(([O], [T]) => (O < T ? -1 : 1)));
      let E = n.get(h);
      if (E) {
        E.value += dataPoint.value;
        if (f > E.timestamp) E.timestamp = f;
        continue;
      }
      n.set(h, {
        attributes: p,
        value: dataPoint.value,
        timestamp: f,
      });
    }
    return Array.from(n.values());
  }
  async shutdown() {
    this.isShutdown = true;
    await this.forceFlush();
    logForDebugging(`${TELEMETRY_LOG_PREFIX} BigQuery metrics exporter shutdown complete`);
  }
  armShutdownReport() {
    let e = shutdownTimeoutMs();
    if (e <= 0) return;
    setTimeout(reportMetricsAtShutdown, e, this).unref?.();
  }
  reportInFlightAtShutdown() {
    if (this.inFlight === 0) return;
    logForDebugging(
      `${TELEMETRY_LOG_PREFIX} BigQuery metrics export still in flight at the shutdown budget (${this.inFlight})`,
    );
    this.reportFailure("pending_at_shutdown");
  }
  async forceFlush() {
    await Promise.all(this.pendingExports);
    this.failures.logSummary();
    logForDebugging(`${TELEMETRY_LOG_PREFIX} BigQuery metrics exporter flush complete`);
  }
  convertAttributes(attributes) {
    let result = {};
    if (attributes)
      for (let [key, value] of Object.entries(attributes)) {
        if (key.startsWith("vcs.")) continue;
        if (value !== undefined && value !== null) result[key] = String(value);
      }
    return result;
  }
  hrTimeToISOString(hrTime) {
    let [seconds, nanoseconds] = hrTime;
    return new Date(seconds * 1000 + nanoseconds / 1e6).toISOString();
  }
  selectAggregationTemporality() {
    return promClient.AggregationTemporality.DELTA;
  }
}
export { BigQueryMetricsExporter };

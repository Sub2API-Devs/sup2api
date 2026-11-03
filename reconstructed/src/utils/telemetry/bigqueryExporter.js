/**
 * utils/telemetry/bigqueryExporter.ts
 *
 * BigQuery 指标导出器：POST <BASE_API_URL>/api/claude_code/metrics（team/enterprise）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/bigqueryExporter.ts
 * pieces: chunk-9vvvg0d3.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { ExportFailureCounter, X3 } from "../../services/analytics/anthropicTelemetryExport.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { logForDebugging } from "../debug.js";
import {
  N,
  classifyBigQueryError,
  Qe,
  Pe,
  customerTypeAttributes,
  _t,
} from "./_new/classifyBigQueryError.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getAuthHeadersAsync, withOAuth401Retry_2, claudeCodeUserAgent } from "../http.js";
import { guardTelemetryCredentials } from "../../services/analytics/telemetryCredentialGuard.js";
import { refreshMetricsStatus } from "../../services/api/metricsOptOut.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify, jsonStringifyRaw } from "../slowOperations.js";
import { classifyAxiosError } from "../errors.js";
import {
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  getClaudeAIOAuthTokens,
  handleOAuth401Error,
} from "../auth.js";
import { getResolvedWIFBaseUrlSnapshot } from "../../services/oauth/wifCredentials.js";
import {
  gzipTelemetryBody,
  sanitizeByValidators,
  Aki,
  Cki,
} from "../../services/analytics/eventSerialization.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { isPolicyLimitsCacheMissing } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { applyMetricAttribution } from "../../services/analytics/metadata.js";

//@ chunk-9vvvg0d3.js:25161-25205 affinity
function gt(e) {
  e.reportInFlightAtShutdown();
}
/**
 * BigQuery 指标导出器：POST <BASE_API_URL>/api/claude_code/metrics（OAuth/API key），失败重试与 OAuth 刷新。
 */
//@ chunk-9vvvg0d3.js:25205-31114 fingerprint = BigQueryMetricsExporter (0.642)
class BigQueryMetricsExporter {
  endpoint;
  isAntEndpointOverride;
  timeout;
  storageV5;
  pendingExports = [];
  isShutdown = !1;
  reportedFailures = new Set();
  failures = new ExportFailureCounter("BigQuery metrics");
  successReported = !1;
  inFlight = 0;
  oauthRefreshAttempted = !1;
  constructor(e) {
    let r = `${getOauthConfig().BASE_API_URL}/api/claude_code/metrics`,
      o = void 0;
    ((this.isAntEndpointOverride = !1),
      (this.endpoint = r),
      (this.timeout = e.timeout || 5000),
      (this.storageV5 = e.storageV5));
  }
  async export(e, r) {
    if (this.isShutdown) {
      (logForDebugging(`${X3} BigQuery metrics export arrived after shutdown, skipping`),
        r({ code: N.ExportResultCode.SUCCESS }));
      return;
    }
    let doExport = this.doExport(e, r);
    (this.pendingExports.push(doExport),
      doExport.finally(() => {
        let index = this.pendingExports.indexOf(doExport);
        if (index > -1) this.pendingExports.splice(index, 1);
      }));
  }
  async doExport(e, r) {
    try {
      if (!(checkHasTrustDialogAccepted() || getIsNonInteractiveSession())) {
        (logForDebugging(`${X3} BigQuery metrics export: trust not established, skipping`),
          r({ code: N.ExportResultCode.SUCCESS }));
        return;
      }
      if (!this.dispatchHostMatchesEndpoint()) {
        (logForDebugging(
          `${X3} BigQuery metrics export: WIF dispatch host differs from the metrics endpoint host, skipping`,
        ),
          r({ code: N.ExportResultCode.SUCCESS }));
        return;
      }
      let n = await getAuthHeadersAsync(),
        s = guardTelemetryCredentials(n, this.endpoint).reasonCode === "misrouted_credential";
      if (s && !this.isAntEndpointOverride) {
        (logForDebugging(
          `${X3} BigQuery metrics export: credential does not belong to the metrics endpoint host, skipping`,
        ),
          r({ code: N.ExportResultCode.SUCCESS }));
        return;
      }
      let u =
        guardTelemetryCredentials(
          n,
          `${getOauthConfig().BASE_API_URL}/api/claude_code/organizations/metrics_enabled`,
        ).reasonCode === "misrouted_credential";
      if (!s && !u) {
        let E = await refreshMetricsStatus(this.storageV5);
        if (E.hasError) {
          if (n.reasonCode === "wif_error")
            (this.reportFailure("wif_error"),
              this.failures.record(
                `metrics opt-out check failed (WIF exchange failed: ${n.error}); skipping export`,
              ));
          else this.failures.record("metrics opt-out check failed; skipping export");
          r({ code: N.ExportResultCode.SUCCESS });
          return;
        }
        if (!E.enabled) {
          (logForDebugging(`${X3} BigQuery metrics export disabled by organization setting, skipping`),
            r({ code: N.ExportResultCode.SUCCESS }));
          return;
        }
      }
      let transformMetricsForInternal = this.transformMetricsForInternal(e),
        p = guardTelemetryCredentials(await getAuthHeadersAsync(), this.endpoint),
        f = p.reasonCode === "misrouted_credential";
      if (p.error && !f) {
        if (p.reasonCode === "wif_error") this.reportFailure("wif_error");
        (this.failures.record(p.error), r({ code: N.ExportResultCode.SUCCESS }));
        return;
      }
      let h;
      try {
        h = await this.postWithOAuth401Recovery(transformMetricsForInternal, f ? {} : p.headers);
      } catch (error) {
        throw (this.reportFailure(...classifyBigQueryError(error)), error);
      }
      if ((logForDebugging(`${X3} BigQuery metrics exported successfully`), !this.successReported))
        ((this.successReported = !0), logFeatureOk("internal_metrics_export"));
      (logForDebugging(`${X3} BigQuery API Response: ${jsonStringify(h.data, null, 2)}`),
        r({ code: N.ExportResultCode.SUCCESS }));
    } catch (error) {
      let { kind: kind, status: status } = classifyAxiosError(error);
      if (kind === "other" && status === void 0)
        logForDebugging(`${X3} BigQuery metrics export threw before the request: ${Qe(error)}`, {
          level: "error",
        });
      (this.failures.record(Qe(error)), r({ code: N.ExportResultCode.SUCCESS }));
    }
  }
  reportFailure(e, r) {
    let o = `${e}:${r ?? ""}`;
    if (this.reportedFailures.has(o)) return;
    (this.reportedFailures.add(o),
      logFeatureBad("internal_metrics_export", e, r === void 0 ? {} : { http_status: r }));
  }
  dispatchHostMatchesEndpoint() {
    if (!(getAnthropicApiKeySafe() === null && shouldUseWIFAuth())) return !0;
    let e = getResolvedWIFBaseUrlSnapshot();
    if (e === void 0) return !1;
    return (e === null ? "api.anthropic.com" : new URL(e).host) === new URL(this.endpoint).host;
  }
  async postWithOAuth401Recovery(e, r) {
    let o = getClaudeAIOAuthTokens(),
      n =
        o?.accessToken && o.refreshToken && r.Authorization === `Bearer ${o.accessToken}`
          ? o.accessToken
          : void 0;
    this.inFlight++;
    try {
      return await this.postOnce(e, r);
    } catch (error) {
      if (!n || !withOAuth401Retry_2(error)) throw error;
      let u = getClaudeAIOAuthTokens()?.accessToken;
      if (u && u !== n) return await this.postOnce(e, { ...r, Authorization: `Bearer ${u}` });
      if (this.oauthRefreshAttempted) throw error;
      this.oauthRefreshAttempted = !0;
      try {
        await handleOAuth401Error(n, void 0, this.storageV5);
      } catch {
        throw error;
      }
      let a = getClaudeAIOAuthTokens()?.accessToken;
      if (!a || a === n) throw error;
      let postOnce = await this.postOnce(e, { ...r, Authorization: `Bearer ${a}` });
      return ((this.oauthRefreshAttempted = !1), postOnce);
    } finally {
      this.inFlight--;
    }
  }
  postOnce(e, r) {
    let o = { "Content-Type": "application/json", "User-Agent": claudeCodeUserAgent(), ...r },
      n = gzipTelemetryBody({ url: this.endpoint, payload: e, storageV5: this.storageV5 });
    return Dt.post(this.endpoint, n?.body ?? e, {
      timeout: this.timeout,
      maxRedirects: 0,
      headers: n ? { ...o, ...n.headers } : o,
    });
  }
  transformMetricsForInternal(e) {
    let attributes = e.resource.attributes,
      o = {
        "service.name": attributes["service.name"] || "claude-code",
        "service.version": attributes["service.version"] || "unknown",
        "os.type": attributes["os.type"] || "unknown",
        "os.version": attributes["os.version"] || "unknown",
        "host.arch": attributes["host.arch"] || "unknown",
        "aggregation.temporality":
          this.selectAggregationTemporality() === Pe.AggregationTemporality.DELTA ? "delta" : "cumulative",
      };
    if (attributes["wsl.version"]) o["wsl.version"] = attributes["wsl.version"];
    Object.assign(o, customerTypeAttributes());
    let s = isPolicyLimitsCacheMissing() || hasComplianceTaint("hipaa");
    return {
      resource_attributes: s ? sanitizeByValidators(o, Aki) : o,
      metrics: e.scopeMetrics.flatMap((scopeMetric) =>
        scopeMetric.metrics.map((metric) => ({
          name: metric.descriptor.name,
          description: metric.descriptor.description,
          unit: metric.descriptor.unit,
          data_points: this.extractDataPoints(metric, s),
        })),
      ),
    };
  }
  extractDataPoints(e, r) {
    let o = e.dataPoints || [],
      n = new Map();
    for (let s of o) {
      if (typeof s.value !== "number") continue;
      let u = applyMetricAttribution(s.attributes),
        convertAttributes = this.convertAttributes(u),
        p = r ? sanitizeByValidators(convertAttributes, Cki) : convertAttributes,
        hrTimeToISOString = this.hrTimeToISOString(s.endTime || s.startTime || [Date.now() / 1000, 0]),
        h = jsonStringifyRaw(Object.entries(r ? p : u).sort(([O], [T]) => (O < T ? -1 : 1))),
        E = n.get(h);
      if (E) {
        if (((E.value += s.value), hrTimeToISOString > E.timestamp)) E.timestamp = hrTimeToISOString;
        continue;
      }
      n.set(h, { attributes: p, value: s.value, timestamp: hrTimeToISOString });
    }
    return Array.from(n.values());
  }
  async shutdown() {
    ((this.isShutdown = !0),
      await this.forceFlush(),
      logForDebugging(`${X3} BigQuery metrics exporter shutdown complete`));
  }
  armShutdownReport() {
    let e = _t();
    if (e <= 0) return;
    setTimeout(gt, e, this).unref?.();
  }
  reportInFlightAtShutdown() {
    if (this.inFlight === 0) return;
    (logForDebugging(
      `${X3} BigQuery metrics export still in flight at the shutdown budget (${this.inFlight})`,
    ),
      this.reportFailure("pending_at_shutdown"));
  }
  async forceFlush() {
    (await Promise.all(this.pendingExports),
      this.failures.logSummary(),
      logForDebugging(`${X3} BigQuery metrics exporter flush complete`));
  }
  convertAttributes(e) {
    let r = {};
    if (e)
      for (let [o, n] of Object.entries(e)) {
        if (o.startsWith("vcs.")) continue;
        if (n !== void 0 && n !== null) r[o] = String(n);
      }
    return r;
  }
  hrTimeToISOString(e) {
    let [r, o] = e;
    return new Date(r * 1000 + o / 1e6).toISOString();
  }
  selectAggregationTemporality() {
    return Pe.AggregationTemporality.DELTA;
  }
}

export { BigQueryMetricsExporter };

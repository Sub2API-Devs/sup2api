/**
 * @opentelemetry/sdk-metrics/build/src/export/PeriodicExportingMetricReader.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_core } from "../../../../core/build/src/index.js";
import { require_MetricReader } from "./MetricReader.js";
import { require_utils } from "../utils.js";
import { require_MetricData } from "./MetricData.js";

//@ chunk-q87n5wsq.js:26839-29617 cjs-fingerprint
var require_PeriodicExportingMetricReader = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PeriodicExportingMetricReader = undefined;
  var api = require_api();
  var core_1 = require_core();
  var MetricReader_1 = require_MetricReader();
  var utils_1 = require_utils();
  var MetricData_1 = require_MetricData();
  class PeriodicExportingMetricReader extends MetricReader_1.MetricReader {
    _interval;
    _exporter;
    _exportInterval;
    _exportTimeout;
    constructor(options) {
      let { exporter, exportIntervalMillis = 60000, metricProducers, cardinalityLimits } = options;
      let { exportTimeoutMillis = 30000 } = options;
      super({
        aggregationSelector: exporter.selectAggregation?.bind(exporter),
        aggregationTemporalitySelector: exporter.selectAggregationTemporality?.bind(exporter),
        metricProducers,
        cardinalitySelector: (instrumentType) => {
          let limits = {
            default: 2000,
            ...cardinalityLimits,
          };
          switch (instrumentType) {
            case MetricData_1.InstrumentType.COUNTER:
              return limits.counter ?? limits.default;
            case MetricData_1.InstrumentType.GAUGE:
              return limits.gauge ?? limits.default;
            case MetricData_1.InstrumentType.HISTOGRAM:
              return limits.histogram ?? limits.default;
            case MetricData_1.InstrumentType.OBSERVABLE_COUNTER:
              return limits.observableCounter ?? limits.default;
            case MetricData_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
              return limits.observableUpDownCounter ?? limits.default;
            case MetricData_1.InstrumentType.OBSERVABLE_GAUGE:
              return limits.observableGauge ?? limits.default;
            case MetricData_1.InstrumentType.UP_DOWN_COUNTER:
              return limits.upDownCounter ?? limits.default;
            default:
              return limits.default;
          }
        },
      });
      if (exportIntervalMillis <= 0) throw Error("exportIntervalMillis must be greater than 0");
      if (exportTimeoutMillis <= 0) throw Error("exportTimeoutMillis must be greater than 0");
      if (exportIntervalMillis < exportTimeoutMillis)
        if ("exportIntervalMillis" in options && "exportTimeoutMillis" in options)
          throw Error("exportIntervalMillis must be greater than or equal to exportTimeoutMillis");
        else {
          api.diag.info(
            `Timeout of ${exportTimeoutMillis} exceeds the interval of ${exportIntervalMillis}. Clamping timeout to interval duration.`,
          );
          exportTimeoutMillis = exportIntervalMillis;
        }
      this._exportInterval = exportIntervalMillis;
      this._exportTimeout = exportTimeoutMillis;
      this._exporter = exporter;
    }
    async _runOnce() {
      try {
        await utils_1.callWithTimeout(this._doRun(), this._exportTimeout);
      } catch (err) {
        if (err instanceof utils_1.TimeoutError) {
          api.diag.error("Export took longer than %s milliseconds and timed out.", this._exportTimeout);
          return;
        }
        core_1.globalErrorHandler(err);
      }
    }
    async _doRun() {
      let { resourceMetrics, errors } = await this.collect({
        timeoutMillis: this._exportTimeout,
      });
      if (errors.length > 0)
        api.diag.error("PeriodicExportingMetricReader: metrics collection errors", ...errors);
      if (resourceMetrics.resource.asyncAttributesPending)
        try {
          await resourceMetrics.resource.waitForAsyncAttributes?.();
        } catch (e) {
          api.diag.debug("Error while resolving async portion of resource: ", e);
          core_1.globalErrorHandler(e);
        }
      if (resourceMetrics.scopeMetrics.length === 0) return;
      let result = await core_1.internal._export(this._exporter, resourceMetrics);
      if (result.code !== core_1.ExportResultCode.SUCCESS)
        throw Error(`PeriodicExportingMetricReader: metrics export failed (error ${result.error})`);
    }
    onInitialized() {
      this._interval = setInterval(() => {
        this._runOnce();
      }, this._exportInterval);
      if (typeof this._interval !== "number") this._interval.unref();
    }
    async onForceFlush() {
      await this._runOnce();
      await this._exporter.forceFlush();
    }
    async onShutdown() {
      if (this._interval) clearInterval(this._interval);
      await this.onForceFlush();
      await this._exporter.shutdown();
    }
  }
  cjsExports.PeriodicExportingMetricReader = PeriodicExportingMetricReader;
});
export { require_PeriodicExportingMetricReader };

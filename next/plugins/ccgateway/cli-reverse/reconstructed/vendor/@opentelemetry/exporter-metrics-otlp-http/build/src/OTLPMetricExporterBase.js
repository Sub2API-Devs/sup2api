/**
 * @opentelemetry/exporter-metrics-otlp-http/build/src/OTLPMetricExporterBase.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-http@0.208.0..0.220.0
 * pieces: chunk-hvqbmbtb.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";
import { require_sdk_metrics } from "../../../sdk-metrics/build/src/index.js";
import { require_OTLPMetricExporterOptions } from "./OTLPMetricExporterOptions.js";
import { require_otlp_exporter_base } from "../../../otlp-exporter-base/build/src/index.js";
import { require_api } from "../../../api/build/src/index.js";

//@ chunk-hvqbmbtb.js:639-2962 cjs-fingerprint
var require_OTLPMetricExporterBase = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPMetricExporterBase =
    cjsExports.LowMemoryTemporalitySelector =
    cjsExports.DeltaTemporalitySelector =
    cjsExports.CumulativeTemporalitySelector =
      undefined;
  var core_1 = require_core();
  var sdk_metrics_1 = require_sdk_metrics();
  var OTLPMetricExporterOptions_1 = require_OTLPMetricExporterOptions();
  var otlp_exporter_base_1 = require_otlp_exporter_base();
  var api_1 = require_api();
  var CumulativeTemporalitySelector = () => sdk_metrics_1.AggregationTemporality.CUMULATIVE;
  cjsExports.CumulativeTemporalitySelector = CumulativeTemporalitySelector;
  var DeltaTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
      case sdk_metrics_1.InstrumentType.COUNTER:
      case sdk_metrics_1.InstrumentType.OBSERVABLE_COUNTER:
      case sdk_metrics_1.InstrumentType.GAUGE:
      case sdk_metrics_1.InstrumentType.HISTOGRAM:
      case sdk_metrics_1.InstrumentType.OBSERVABLE_GAUGE:
        return sdk_metrics_1.AggregationTemporality.DELTA;
      case sdk_metrics_1.InstrumentType.UP_DOWN_COUNTER:
      case sdk_metrics_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
        return sdk_metrics_1.AggregationTemporality.CUMULATIVE;
    }
  };
  cjsExports.DeltaTemporalitySelector = DeltaTemporalitySelector;
  var LowMemoryTemporalitySelector = (instrumentType) => {
    switch (instrumentType) {
      case sdk_metrics_1.InstrumentType.COUNTER:
      case sdk_metrics_1.InstrumentType.HISTOGRAM:
        return sdk_metrics_1.AggregationTemporality.DELTA;
      case sdk_metrics_1.InstrumentType.GAUGE:
      case sdk_metrics_1.InstrumentType.UP_DOWN_COUNTER:
      case sdk_metrics_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
      case sdk_metrics_1.InstrumentType.OBSERVABLE_COUNTER:
      case sdk_metrics_1.InstrumentType.OBSERVABLE_GAUGE:
        return sdk_metrics_1.AggregationTemporality.CUMULATIVE;
    }
  };
  cjsExports.LowMemoryTemporalitySelector = LowMemoryTemporalitySelector;
  function chooseTemporalitySelectorFromEnvironment() {
    let configuredTemporality = (
      core_1.getStringFromEnv("OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE") ?? "cumulative"
    ).toLowerCase();
    if (configuredTemporality === "cumulative") return cjsExports.CumulativeTemporalitySelector;
    if (configuredTemporality === "delta") return cjsExports.DeltaTemporalitySelector;
    if (configuredTemporality === "lowmemory") return cjsExports.LowMemoryTemporalitySelector;
    api_1.diag.warn(
      `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE is set to '${configuredTemporality}', but only 'cumulative' and 'delta' are allowed. Using default ('cumulative') instead.`,
    );
    return cjsExports.CumulativeTemporalitySelector;
  }
  function chooseTemporalitySelector(temporalityPreference) {
    if (temporalityPreference != null) {
      if (temporalityPreference === OTLPMetricExporterOptions_1.AggregationTemporalityPreference.DELTA)
        return cjsExports.DeltaTemporalitySelector;
      else if (
        temporalityPreference === OTLPMetricExporterOptions_1.AggregationTemporalityPreference.LOWMEMORY
      )
        return cjsExports.LowMemoryTemporalitySelector;
      return cjsExports.CumulativeTemporalitySelector;
    }
    return chooseTemporalitySelectorFromEnvironment();
  }
  var DEFAULT_AGGREGATION = Object.freeze({
    type: sdk_metrics_1.AggregationType.DEFAULT,
  });
  function chooseAggregationSelector(config) {
    return config?.aggregationPreference ?? (() => DEFAULT_AGGREGATION);
  }
  class OTLPMetricExporterBase extends otlp_exporter_base_1.OTLPExporterBase {
    _aggregationTemporalitySelector;
    _aggregationSelector;
    constructor(delegate, config) {
      super(delegate);
      this._aggregationSelector = chooseAggregationSelector(config);
      this._aggregationTemporalitySelector = chooseTemporalitySelector(config?.temporalityPreference);
    }
    selectAggregation(instrumentType) {
      return this._aggregationSelector(instrumentType);
    }
    selectAggregationTemporality(instrumentType) {
      return this._aggregationTemporalitySelector(instrumentType);
    }
  }
  cjsExports.OTLPMetricExporterBase = OTLPMetricExporterBase;
});
export { require_OTLPMetricExporterBase };

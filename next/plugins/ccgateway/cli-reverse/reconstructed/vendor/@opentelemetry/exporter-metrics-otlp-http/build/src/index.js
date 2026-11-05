/**
 * @opentelemetry/exporter-metrics-otlp-http/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-http@0.208.0..0.220.0
 * pieces: chunk-hvqbmbtb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_platform_2 } from "./platform/index.js";
import { require_OTLPMetricExporterOptions } from "./OTLPMetricExporterOptions.js";
import { require_OTLPMetricExporterBase } from "./OTLPMetricExporterBase.js";

//@ chunk-hvqbmbtb.js:3754-4761 cjs-fingerprint
var require_exporter_metrics_otlp_http = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPMetricExporterBase =
    cjsExports.LowMemoryTemporalitySelector =
    cjsExports.DeltaTemporalitySelector =
    cjsExports.CumulativeTemporalitySelector =
    cjsExports.AggregationTemporalityPreference =
    cjsExports.OTLPMetricExporter =
      undefined;
  var platform_1 = require_platform_2();
  Object.defineProperty(cjsExports, "OTLPMetricExporter", {
    enumerable: true,
    get: function () {
      return platform_1.OTLPMetricExporter;
    },
  });
  var OTLPMetricExporterOptions_1 = require_OTLPMetricExporterOptions();
  Object.defineProperty(cjsExports, "AggregationTemporalityPreference", {
    enumerable: true,
    get: function () {
      return OTLPMetricExporterOptions_1.AggregationTemporalityPreference;
    },
  });
  var OTLPMetricExporterBase_1 = require_OTLPMetricExporterBase();
  Object.defineProperty(cjsExports, "CumulativeTemporalitySelector", {
    enumerable: true,
    get: function () {
      return OTLPMetricExporterBase_1.CumulativeTemporalitySelector;
    },
  });
  Object.defineProperty(cjsExports, "DeltaTemporalitySelector", {
    enumerable: true,
    get: function () {
      return OTLPMetricExporterBase_1.DeltaTemporalitySelector;
    },
  });
  Object.defineProperty(cjsExports, "LowMemoryTemporalitySelector", {
    enumerable: true,
    get: function () {
      return OTLPMetricExporterBase_1.LowMemoryTemporalitySelector;
    },
  });
  Object.defineProperty(cjsExports, "OTLPMetricExporterBase", {
    enumerable: true,
    get: function () {
      return OTLPMetricExporterBase_1.OTLPMetricExporterBase;
    },
  });
});
export { require_exporter_metrics_otlp_http };

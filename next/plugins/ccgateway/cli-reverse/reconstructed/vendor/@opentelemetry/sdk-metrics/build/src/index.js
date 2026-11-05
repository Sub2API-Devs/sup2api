/**
 * @opentelemetry/sdk-metrics/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_AggregationTemporality } from "./export/AggregationTemporality.js";
import { require_MetricData } from "./export/MetricData.js";
import { require_MetricReader } from "./export/MetricReader.js";
import { require_PeriodicExportingMetricReader } from "./export/PeriodicExportingMetricReader.js";
import { require_InMemoryMetricExporter } from "./export/InMemoryMetricExporter.js";
import { require_ConsoleMetricExporter } from "./export/ConsoleMetricExporter.js";
import { require_MeterProvider } from "./MeterProvider.js";
import { require_AggregationOption } from "./view/AggregationOption.js";
import { require_AttributesProcessor } from "./view/AttributesProcessor.js";
import { require_utils } from "./utils.js";

//@ chunk-q87n5wsq.js:58901-60705 cjs-fingerprint
var require_sdk_metrics = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.TimeoutError =
    cjsExports.createDenyListAttributesProcessor =
    cjsExports.createAllowListAttributesProcessor =
    cjsExports.AggregationType =
    cjsExports.MeterProvider =
    cjsExports.ConsoleMetricExporter =
    cjsExports.InMemoryMetricExporter =
    cjsExports.PeriodicExportingMetricReader =
    cjsExports.MetricReader =
    cjsExports.InstrumentType =
    cjsExports.DataPointType =
    cjsExports.AggregationTemporality =
      undefined;
  var AggregationTemporality_1 = require_AggregationTemporality();
  Object.defineProperty(cjsExports, "AggregationTemporality", {
    enumerable: true,
    get: function () {
      return AggregationTemporality_1.AggregationTemporality;
    },
  });
  var MetricData_1 = require_MetricData();
  Object.defineProperty(cjsExports, "DataPointType", {
    enumerable: true,
    get: function () {
      return MetricData_1.DataPointType;
    },
  });
  Object.defineProperty(cjsExports, "InstrumentType", {
    enumerable: true,
    get: function () {
      return MetricData_1.InstrumentType;
    },
  });
  var MetricReader_1 = require_MetricReader();
  Object.defineProperty(cjsExports, "MetricReader", {
    enumerable: true,
    get: function () {
      return MetricReader_1.MetricReader;
    },
  });
  var PeriodicExportingMetricReader_1 = require_PeriodicExportingMetricReader();
  Object.defineProperty(cjsExports, "PeriodicExportingMetricReader", {
    enumerable: true,
    get: function () {
      return PeriodicExportingMetricReader_1.PeriodicExportingMetricReader;
    },
  });
  var InMemoryMetricExporter_1 = require_InMemoryMetricExporter();
  Object.defineProperty(cjsExports, "InMemoryMetricExporter", {
    enumerable: true,
    get: function () {
      return InMemoryMetricExporter_1.InMemoryMetricExporter;
    },
  });
  var ConsoleMetricExporter_1 = require_ConsoleMetricExporter();
  Object.defineProperty(cjsExports, "ConsoleMetricExporter", {
    enumerable: true,
    get: function () {
      return ConsoleMetricExporter_1.ConsoleMetricExporter;
    },
  });
  var MeterProvider_1 = require_MeterProvider();
  Object.defineProperty(cjsExports, "MeterProvider", {
    enumerable: true,
    get: function () {
      return MeterProvider_1.MeterProvider;
    },
  });
  var AggregationOption_1 = require_AggregationOption();
  Object.defineProperty(cjsExports, "AggregationType", {
    enumerable: true,
    get: function () {
      return AggregationOption_1.AggregationType;
    },
  });
  var AttributesProcessor_1 = require_AttributesProcessor();
  Object.defineProperty(cjsExports, "createAllowListAttributesProcessor", {
    enumerable: true,
    get: function () {
      return AttributesProcessor_1.createAllowListAttributesProcessor;
    },
  });
  Object.defineProperty(cjsExports, "createDenyListAttributesProcessor", {
    enumerable: true,
    get: function () {
      return AttributesProcessor_1.createDenyListAttributesProcessor;
    },
  });
  var utils_1 = require_utils();
  Object.defineProperty(cjsExports, "TimeoutError", {
    enumerable: true,
    get: function () {
      return utils_1.TimeoutError;
    },
  });
});
export { require_sdk_metrics };

/**
 * @opentelemetry/otlp-transformer/build/src/metrics/internal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_sdk_metrics } from "../../../../sdk-metrics/build/src/index.js";
import { require_internal_types } from "./internal-types.js";
import { require_utils } from "../common/utils.js";
import { require_internal } from "../common/internal.js";

//@ chunk-vxhm2nqe.js:247011-249557 cjs-fingerprint
var require_internal_3 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createExportMetricsServiceRequest =
    cjsExports.toMetric =
    cjsExports.toScopeMetrics =
    cjsExports.toResourceMetrics =
      undefined;
  var api_1 = require_api();
  var sdk_metrics_1 = require_sdk_metrics();
  var internal_types_1 = require_internal_types();
  var utils_1 = require_utils();
  var internal_1 = require_internal();
  function toResourceMetrics(resourceMetrics, options) {
    let encoder = utils_1.getOtlpEncoder(options);
    let processedResource = internal_1.createResource(resourceMetrics.resource);
    return {
      resource: processedResource,
      schemaUrl: processedResource.schemaUrl,
      scopeMetrics: toScopeMetrics(resourceMetrics.scopeMetrics, encoder),
    };
  }
  cjsExports.toResourceMetrics = toResourceMetrics;
  function toScopeMetrics(scopeMetrics, encoder) {
    return Array.from(
      scopeMetrics.map((metrics) => ({
        scope: internal_1.createInstrumentationScope(metrics.scope),
        metrics: metrics.metrics.map((metricData) => toMetric(metricData, encoder)),
        schemaUrl: metrics.scope.schemaUrl,
      })),
    );
  }
  cjsExports.toScopeMetrics = toScopeMetrics;
  function toMetric(metricData, encoder) {
    let out = {
      name: metricData.descriptor.name,
      description: metricData.descriptor.description,
      unit: metricData.descriptor.unit,
    };
    let aggregationTemporality = toAggregationTemporality(metricData.aggregationTemporality);
    switch (metricData.dataPointType) {
      case sdk_metrics_1.DataPointType.SUM:
        out.sum = {
          aggregationTemporality,
          isMonotonic: metricData.isMonotonic,
          dataPoints: toSingularDataPoints(metricData, encoder),
        };
        break;
      case sdk_metrics_1.DataPointType.GAUGE:
        out.gauge = {
          dataPoints: toSingularDataPoints(metricData, encoder),
        };
        break;
      case sdk_metrics_1.DataPointType.HISTOGRAM:
        out.histogram = {
          aggregationTemporality,
          dataPoints: toHistogramDataPoints(metricData, encoder),
        };
        break;
      case sdk_metrics_1.DataPointType.EXPONENTIAL_HISTOGRAM:
        out.exponentialHistogram = {
          aggregationTemporality,
          dataPoints: toExponentialHistogramDataPoints(metricData, encoder),
        };
        break;
    }
    return out;
  }
  cjsExports.toMetric = toMetric;
  function toSingularDataPoint(dataPoint, valueType, encoder) {
    let out = {
      attributes: internal_1.toAttributes(dataPoint.attributes),
      startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
      timeUnixNano: encoder.encodeHrTime(dataPoint.endTime),
    };
    switch (valueType) {
      case api_1.ValueType.INT:
        out.asInt = dataPoint.value;
        break;
      case api_1.ValueType.DOUBLE:
        out.asDouble = dataPoint.value;
        break;
    }
    return out;
  }
  function toSingularDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) =>
      toSingularDataPoint(dataPoint, metricData.descriptor.valueType, encoder),
    );
  }
  function toHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      let histogram = dataPoint.value;
      return {
        attributes: internal_1.toAttributes(dataPoint.attributes),
        bucketCounts: histogram.buckets.counts,
        explicitBounds: histogram.buckets.boundaries,
        count: histogram.count,
        sum: histogram.sum,
        min: histogram.min,
        max: histogram.max,
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime),
      };
    });
  }
  function toExponentialHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map((dataPoint) => {
      let histogram = dataPoint.value;
      return {
        attributes: internal_1.toAttributes(dataPoint.attributes),
        count: histogram.count,
        min: histogram.min,
        max: histogram.max,
        sum: histogram.sum,
        positive: {
          offset: histogram.positive.offset,
          bucketCounts: histogram.positive.bucketCounts,
        },
        negative: {
          offset: histogram.negative.offset,
          bucketCounts: histogram.negative.bucketCounts,
        },
        scale: histogram.scale,
        zeroCount: histogram.zeroCount,
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime),
      };
    });
  }
  function toAggregationTemporality(temporality) {
    switch (temporality) {
      case sdk_metrics_1.AggregationTemporality.DELTA:
        return internal_types_1.EAggregationTemporality.AGGREGATION_TEMPORALITY_DELTA;
      case sdk_metrics_1.AggregationTemporality.CUMULATIVE:
        return internal_types_1.EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE;
    }
  }
  function createExportMetricsServiceRequest(resourceMetrics, options) {
    return {
      resourceMetrics: resourceMetrics.map((metrics) => toResourceMetrics(metrics, options)),
    };
  }
  cjsExports.createExportMetricsServiceRequest = createExportMetricsServiceRequest;
});
export { require_internal_3 };

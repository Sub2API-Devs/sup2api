/**
 * @opentelemetry/exporter-prometheus/build/src/PrometheusSerializer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-prometheus@0.217.0..0.218.0
 * pieces: chunk-1gzy30bn.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_sdk_metrics } from "../../../sdk-metrics/build/src/index.js";
import { require_core } from "../../../core/build/src/index.js";
import { require_error_3 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-1gzy30bn.js:309-3985 cjs-fingerprint
var require_PrometheusSerializer = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PrometheusSerializer = undefined;
  var api_1 = require_api();
  var sdk_metrics_1 = require_sdk_metrics();
  var core_1 = require_core();
  var semantic_conventions_1 = require_error_3();
  var ATTR_OTEL_SCOPE_SCHEMA_URL = "otel.scope.schema_url";
  function escapeString(str) {
    return str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
  }
  function escapeAttributeValue(str = "") {
    if (typeof str !== "string") str = JSON.stringify(str);
    return escapeString(str).replace(/"/g, '\\"');
  }
  var invalidCharacterRegex = /[^a-z0-9_]/gi;
  var multipleUnderscoreRegex = /_{2,}/g;
  function sanitizePrometheusMetricName(name) {
    return name.replace(invalidCharacterRegex, "_").replace(multipleUnderscoreRegex, "_");
  }
  function enforcePrometheusNamingConvention(name, data) {
    if (
      !name.endsWith("_total") &&
      data.dataPointType === sdk_metrics_1.DataPointType.SUM &&
      data.isMonotonic
    )
      name = name + "_total";
    return name;
  }
  function valueString(value) {
    if (value === 1 / 0) return "+Inf";
    else if (value === -1 / 0) return "-Inf";
    else return `${value}`;
  }
  function toPrometheusType(metricData) {
    switch (metricData.dataPointType) {
      case sdk_metrics_1.DataPointType.SUM:
        if (metricData.isMonotonic) return "counter";
        return "gauge";
      case sdk_metrics_1.DataPointType.GAUGE:
        return "gauge";
      case sdk_metrics_1.DataPointType.HISTOGRAM:
        return "histogram";
      default:
        return "untyped";
    }
  }
  function stringify(metricName, attributes, value, timestamp, additionalAttributes) {
    let hasAttribute = false;
    let attributesStr = "";
    for (let [key, val] of Object.entries(attributes)) {
      let sanitizedAttributeName = sanitizePrometheusMetricName(key);
      hasAttribute = true;
      attributesStr += `${attributesStr.length > 0 ? "," : ""}${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
    }
    if (additionalAttributes)
      for (let [key, val] of Object.entries(additionalAttributes)) {
        let sanitizedAttributeName = sanitizePrometheusMetricName(key);
        hasAttribute = true;
        attributesStr += `${attributesStr.length > 0 ? "," : ""}${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
      }
    if (hasAttribute) metricName += `{${attributesStr}}`;
    return `${metricName} ${valueString(value)}${timestamp !== undefined ? " " + String(timestamp) : ""}
`;
  }
  var NO_REGISTERED_METRICS = "# no registered metrics";
  class PrometheusSerializer {
    _prefix;
    _appendTimestamp;
    _additionalAttributes;
    _withResourceConstantLabels;
    _withoutScopeInfo;
    _withoutTargetInfo;
    constructor(
      prefix,
      appendTimestamp = false,
      withResourceConstantLabels,
      withoutTargetInfo,
      withoutScopeInfo,
    ) {
      if (prefix) this._prefix = prefix + "_";
      this._appendTimestamp = appendTimestamp;
      this._withResourceConstantLabels = withResourceConstantLabels;
      this._withoutScopeInfo = !!withoutScopeInfo;
      this._withoutTargetInfo = !!withoutTargetInfo;
    }
    serialize(resourceMetrics) {
      let str = "";
      this._additionalAttributes = this._filterResourceConstantLabels(
        resourceMetrics.resource.attributes,
        this._withResourceConstantLabels,
      );
      for (let scopeMetrics of resourceMetrics.scopeMetrics) str += this._serializeScopeMetrics(scopeMetrics);
      if (str === "") str += NO_REGISTERED_METRICS;
      return this._serializeResource(resourceMetrics.resource) + str;
    }
    _filterResourceConstantLabels(attributes, pattern) {
      if (pattern) {
        let filteredAttributes = {};
        for (let [key, value] of Object.entries(attributes))
          if (key.match(pattern)) filteredAttributes[key] = value;
        return filteredAttributes;
      }
      return;
    }
    _serializeScopeMetrics(scopeMetrics) {
      let str = "";
      for (let metric of scopeMetrics.metrics)
        str +=
          this._serializeMetricData(metric, scopeMetrics.scope) +
          `
`;
      return str;
    }
    _serializeMetricData(metricData, scope) {
      let name = sanitizePrometheusMetricName(escapeString(metricData.descriptor.name));
      if (this._prefix) name = `${this._prefix}${name}`;
      let dataPointType = metricData.dataPointType;
      name = enforcePrometheusNamingConvention(name, metricData);
      let help = `# HELP ${name} ${escapeString(metricData.descriptor.description || "description missing")}`;
      let unit = metricData.descriptor.unit
        ? `
# UNIT ${name} ${escapeString(metricData.descriptor.unit)}`
        : "";
      let type = `# TYPE ${name} ${toPrometheusType(metricData)}`;
      let additionalAttributes;
      if (this._withoutScopeInfo) additionalAttributes = this._additionalAttributes;
      else {
        let scopeInfo = {
          [semantic_conventions_1.ATTR_OTEL_SCOPE_NAME]: scope.name,
        };
        if (scope.schemaUrl) scopeInfo[ATTR_OTEL_SCOPE_SCHEMA_URL] = scope.schemaUrl;
        if (scope.version) scopeInfo[semantic_conventions_1.ATTR_OTEL_SCOPE_VERSION] = scope.version;
        additionalAttributes = Object.assign(scopeInfo, this._additionalAttributes);
      }
      let results = "";
      switch (dataPointType) {
        case sdk_metrics_1.DataPointType.SUM:
        case sdk_metrics_1.DataPointType.GAUGE: {
          results = metricData.dataPoints
            .map((it) => this._serializeSingularDataPoint(name, metricData, it, additionalAttributes))
            .join("");
          break;
        }
        case sdk_metrics_1.DataPointType.HISTOGRAM: {
          results = metricData.dataPoints
            .map((it) => this._serializeHistogramDataPoint(name, metricData, it, additionalAttributes))
            .join("");
          break;
        }
        default:
          api_1.diag.error(`Unrecognizable DataPointType: ${dataPointType} for metric "${name}"`);
      }
      return `${help}${unit}
${type}
${results}`.trim();
    }
    _serializeSingularDataPoint(name, data, dataPoint, additionalAttributes) {
      let results = "";
      let { value, attributes } = dataPoint;
      let timestamp = core_1.hrTimeToMilliseconds(dataPoint.endTime);
      results += stringify(
        name,
        attributes,
        value,
        this._appendTimestamp ? timestamp : undefined,
        additionalAttributes,
      );
      return results;
    }
    _serializeHistogramDataPoint(name, data, dataPoint, additionalAttributes) {
      let results = "";
      let { attributes, value: histogram } = dataPoint;
      let timestamp = core_1.hrTimeToMilliseconds(dataPoint.endTime);
      for (let key of ["count", "sum"]) {
        let value = histogram[key];
        if (value != null)
          results += stringify(
            name + "_" + key,
            attributes,
            value,
            this._appendTimestamp ? timestamp : undefined,
            additionalAttributes,
          );
      }
      let cumulativeSum = 0;
      let countEntries = histogram.buckets.counts.entries();
      let infiniteBoundaryDefined = false;
      for (let [idx, val] of countEntries) {
        cumulativeSum += val;
        let upperBound = histogram.buckets.boundaries[idx];
        if (upperBound === undefined && infiniteBoundaryDefined) break;
        if (upperBound === 1 / 0) infiniteBoundaryDefined = true;
        results += stringify(
          name + "_bucket",
          attributes,
          cumulativeSum,
          this._appendTimestamp ? timestamp : undefined,
          Object.assign({}, additionalAttributes, {
            le: upperBound === undefined || upperBound === 1 / 0 ? "+Inf" : String(upperBound),
          }),
        );
      }
      return results;
    }
    _serializeResource(resource) {
      if (this._withoutTargetInfo === true) return "";
      let name = "target_info";
      let help = `# HELP ${name} Target metadata`;
      let type = `# TYPE ${name} gauge`;
      let results = stringify(name, resource.attributes, 1).trim();
      return `${help}
${type}
${results}
`;
    }
  }
  cjsExports.PrometheusSerializer = PrometheusSerializer;
});
export { require_PrometheusSerializer };

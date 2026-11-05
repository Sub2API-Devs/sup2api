/**
 * @opentelemetry/api/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_utils_5 } from "./baggage/utils.js";
import { require_context } from "./context/context.js";
import { require_consoleLogger } from "./diag/consoleLogger.js";
import { require_types } from "./diag/types.js";
import { require_NoopMeter } from "./metrics/NoopMeter.js";
import { require_Metric } from "./metrics/Metric.js";
import { require_TextMapPropagator } from "./propagation/TextMapPropagator.js";
import { require_ProxyTracer } from "./trace/ProxyTracer.js";
import { require_ProxyTracerProvider } from "./trace/ProxyTracerProvider.js";
import { require_SamplingResult } from "./trace/SamplingResult.js";
import { require_span_kind } from "./trace/span_kind.js";
import { require_status } from "./trace/status.js";
import { require_trace_flags } from "./trace/trace_flags.js";
import { require_utils_6 } from "./trace/internal/utils.js";
import { require_spancontext_utils } from "./trace/spancontext-utils.js";
import { require_invalid_span_constants } from "./trace/invalid-span-constants.js";
import { require_context_api } from "./context-api.js";
import { require_diag_api } from "./diag-api.js";
import { require_metrics_api } from "./metrics-api.js";
import { require_propagation_api } from "./propagation-api.js";
import { require_trace_api } from "./trace-api.js";

//@ chunk-7kayq7nc.js:50045-53598 cjs-fingerprint
var require_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.trace =
    cjsExports.propagation =
    cjsExports.metrics =
    cjsExports.diag =
    cjsExports.context =
    cjsExports.INVALID_SPAN_CONTEXT =
    cjsExports.INVALID_TRACEID =
    cjsExports.INVALID_SPANID =
    cjsExports.isValidSpanId =
    cjsExports.isValidTraceId =
    cjsExports.isSpanContextValid =
    cjsExports.createTraceState =
    cjsExports.TraceFlags =
    cjsExports.SpanStatusCode =
    cjsExports.SpanKind =
    cjsExports.SamplingDecision =
    cjsExports.ProxyTracerProvider =
    cjsExports.ProxyTracer =
    cjsExports.defaultTextMapSetter =
    cjsExports.defaultTextMapGetter =
    cjsExports.ValueType =
    cjsExports.createNoopMeter =
    cjsExports.DiagLogLevel =
    cjsExports.DiagConsoleLogger =
    cjsExports.ROOT_CONTEXT =
    cjsExports.createContextKey =
    cjsExports.baggageEntryMetadataFromString =
      undefined;
  var utils_1 = require_utils_5();
  Object.defineProperty(cjsExports, "baggageEntryMetadataFromString", {
    enumerable: true,
    get: function () {
      return utils_1.baggageEntryMetadataFromString;
    },
  });
  var context_1 = require_context();
  Object.defineProperty(cjsExports, "createContextKey", {
    enumerable: true,
    get: function () {
      return context_1.createContextKey;
    },
  });
  Object.defineProperty(cjsExports, "ROOT_CONTEXT", {
    enumerable: true,
    get: function () {
      return context_1.ROOT_CONTEXT;
    },
  });
  var consoleLogger_1 = require_consoleLogger();
  Object.defineProperty(cjsExports, "DiagConsoleLogger", {
    enumerable: true,
    get: function () {
      return consoleLogger_1.DiagConsoleLogger;
    },
  });
  var types_1 = require_types();
  Object.defineProperty(cjsExports, "DiagLogLevel", {
    enumerable: true,
    get: function () {
      return types_1.DiagLogLevel;
    },
  });
  var NoopMeter_1 = require_NoopMeter();
  Object.defineProperty(cjsExports, "createNoopMeter", {
    enumerable: true,
    get: function () {
      return NoopMeter_1.createNoopMeter;
    },
  });
  var Metric_1 = require_Metric();
  Object.defineProperty(cjsExports, "ValueType", {
    enumerable: true,
    get: function () {
      return Metric_1.ValueType;
    },
  });
  var TextMapPropagator_1 = require_TextMapPropagator();
  Object.defineProperty(cjsExports, "defaultTextMapGetter", {
    enumerable: true,
    get: function () {
      return TextMapPropagator_1.defaultTextMapGetter;
    },
  });
  Object.defineProperty(cjsExports, "defaultTextMapSetter", {
    enumerable: true,
    get: function () {
      return TextMapPropagator_1.defaultTextMapSetter;
    },
  });
  var ProxyTracer_1 = require_ProxyTracer();
  Object.defineProperty(cjsExports, "ProxyTracer", {
    enumerable: true,
    get: function () {
      return ProxyTracer_1.ProxyTracer;
    },
  });
  var ProxyTracerProvider_1 = require_ProxyTracerProvider();
  Object.defineProperty(cjsExports, "ProxyTracerProvider", {
    enumerable: true,
    get: function () {
      return ProxyTracerProvider_1.ProxyTracerProvider;
    },
  });
  var SamplingResult_1 = require_SamplingResult();
  Object.defineProperty(cjsExports, "SamplingDecision", {
    enumerable: true,
    get: function () {
      return SamplingResult_1.SamplingDecision;
    },
  });
  var span_kind_1 = require_span_kind();
  Object.defineProperty(cjsExports, "SpanKind", {
    enumerable: true,
    get: function () {
      return span_kind_1.SpanKind;
    },
  });
  var status_1 = require_status();
  Object.defineProperty(cjsExports, "SpanStatusCode", {
    enumerable: true,
    get: function () {
      return status_1.SpanStatusCode;
    },
  });
  var trace_flags_1 = require_trace_flags();
  Object.defineProperty(cjsExports, "TraceFlags", {
    enumerable: true,
    get: function () {
      return trace_flags_1.TraceFlags;
    },
  });
  var utils_2 = require_utils_6();
  Object.defineProperty(cjsExports, "createTraceState", {
    enumerable: true,
    get: function () {
      return utils_2.createTraceState;
    },
  });
  var spancontext_utils_1 = require_spancontext_utils();
  Object.defineProperty(cjsExports, "isSpanContextValid", {
    enumerable: true,
    get: function () {
      return spancontext_utils_1.isSpanContextValid;
    },
  });
  Object.defineProperty(cjsExports, "isValidTraceId", {
    enumerable: true,
    get: function () {
      return spancontext_utils_1.isValidTraceId;
    },
  });
  Object.defineProperty(cjsExports, "isValidSpanId", {
    enumerable: true,
    get: function () {
      return spancontext_utils_1.isValidSpanId;
    },
  });
  var invalid_span_constants_1 = require_invalid_span_constants();
  Object.defineProperty(cjsExports, "INVALID_SPANID", {
    enumerable: true,
    get: function () {
      return invalid_span_constants_1.INVALID_SPANID;
    },
  });
  Object.defineProperty(cjsExports, "INVALID_TRACEID", {
    enumerable: true,
    get: function () {
      return invalid_span_constants_1.INVALID_TRACEID;
    },
  });
  Object.defineProperty(cjsExports, "INVALID_SPAN_CONTEXT", {
    enumerable: true,
    get: function () {
      return invalid_span_constants_1.INVALID_SPAN_CONTEXT;
    },
  });
  var context_api_1 = require_context_api();
  Object.defineProperty(cjsExports, "context", {
    enumerable: true,
    get: function () {
      return context_api_1.context;
    },
  });
  var diag_api_1 = require_diag_api();
  Object.defineProperty(cjsExports, "diag", {
    enumerable: true,
    get: function () {
      return diag_api_1.diag;
    },
  });
  var metrics_api_1 = require_metrics_api();
  Object.defineProperty(cjsExports, "metrics", {
    enumerable: true,
    get: function () {
      return metrics_api_1.metrics;
    },
  });
  var propagation_api_1 = require_propagation_api();
  Object.defineProperty(cjsExports, "propagation", {
    enumerable: true,
    get: function () {
      return propagation_api_1.propagation;
    },
  });
  var trace_api_1 = require_trace_api();
  Object.defineProperty(cjsExports, "trace", {
    enumerable: true,
    get: function () {
      return trace_api_1.trace;
    },
  });
  cjsExports.default = {
    context: context_api_1.context,
    diag: diag_api_1.diag,
    metrics: metrics_api_1.metrics,
    propagation: propagation_api_1.propagation,
    trace: trace_api_1.trace,
  };
});
export { require_api };

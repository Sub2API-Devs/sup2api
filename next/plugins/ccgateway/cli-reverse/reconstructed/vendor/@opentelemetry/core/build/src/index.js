/**
 * @opentelemetry/core/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_W3CBaggagePropagator } from "./baggage/propagation/W3CBaggagePropagator.js";
import { require_anchored_clock } from "./common/anchored-clock.js";
import { require_attributes } from "./common/attributes.js";
import { require_global_error_handler } from "./common/global-error-handler.js";
import { require_logging_error_handler } from "./common/logging-error-handler.js";
import { require_time } from "./common/time.js";
import { require_timer_util } from "./common/timer-util.js";
import { require_ExportResult } from "./ExportResult.js";
import { require_utils } from "./baggage/utils.js";
import { require_platform_4 } from "./platform/index.js";
import { require_composite } from "./propagation/composite.js";
import { require_W3CTraceContextPropagator } from "./trace/W3CTraceContextPropagator.js";
import { require_rpc_metadata } from "./trace/rpc-metadata.js";
import { require_suppress_tracing } from "./trace/suppress-tracing.js";
import { require_TraceState } from "./trace/TraceState.js";
import { require_merge } from "./utils/merge.js";
import { require_timeout } from "./utils/timeout.js";
import { require_url } from "./utils/url.js";
import { require_callback } from "./utils/callback.js";
import { require_configuration } from "./utils/configuration.js";
import { require_exporter } from "./internal/exporter.js";

//@ chunk-7kayq7nc.js:129792-136051 cjs-fingerprint
var require_core = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.internal =
    cjsExports.diagLogLevelFromString =
    cjsExports.BindOnceFuture =
    cjsExports.urlMatches =
    cjsExports.isUrlIgnored =
    cjsExports.callWithTimeout =
    cjsExports.TimeoutError =
    cjsExports.merge =
    cjsExports.TraceState =
    cjsExports.unsuppressTracing =
    cjsExports.suppressTracing =
    cjsExports.isTracingSuppressed =
    cjsExports.setRPCMetadata =
    cjsExports.getRPCMetadata =
    cjsExports.deleteRPCMetadata =
    cjsExports.RPCType =
    cjsExports.parseTraceParent =
    cjsExports.W3CTraceContextPropagator =
    cjsExports.TRACE_STATE_HEADER =
    cjsExports.TRACE_PARENT_HEADER =
    cjsExports.CompositePropagator =
    cjsExports.otperformance =
    cjsExports.getStringListFromEnv =
    cjsExports.getNumberFromEnv =
    cjsExports.getBooleanFromEnv =
    cjsExports.getStringFromEnv =
    cjsExports._globalThis =
    cjsExports.SDK_INFO =
    cjsExports.parseKeyPairsIntoRecord =
    cjsExports.ExportResultCode =
    cjsExports.unrefTimer =
    cjsExports.timeInputToHrTime =
    cjsExports.millisToHrTime =
    cjsExports.isTimeInputHrTime =
    cjsExports.isTimeInput =
    cjsExports.hrTimeToTimeStamp =
    cjsExports.hrTimeToNanoseconds =
    cjsExports.hrTimeToMilliseconds =
    cjsExports.hrTimeToMicroseconds =
    cjsExports.hrTimeDuration =
    cjsExports.hrTime =
    cjsExports.getTimeOrigin =
    cjsExports.addHrTimes =
    cjsExports.loggingErrorHandler =
    cjsExports.setGlobalErrorHandler =
    cjsExports.globalErrorHandler =
    cjsExports.sanitizeAttributes =
    cjsExports.isAttributeValue =
    cjsExports.AnchoredClock =
    cjsExports.W3CBaggagePropagator =
      undefined;
  var W3CBaggagePropagator_1 = require_W3CBaggagePropagator();
  Object.defineProperty(cjsExports, "W3CBaggagePropagator", {
    enumerable: true,
    get: function () {
      return W3CBaggagePropagator_1.W3CBaggagePropagator;
    },
  });
  var anchored_clock_1 = require_anchored_clock();
  Object.defineProperty(cjsExports, "AnchoredClock", {
    enumerable: true,
    get: function () {
      return anchored_clock_1.AnchoredClock;
    },
  });
  var attributes_1 = require_attributes();
  Object.defineProperty(cjsExports, "isAttributeValue", {
    enumerable: true,
    get: function () {
      return attributes_1.isAttributeValue;
    },
  });
  Object.defineProperty(cjsExports, "sanitizeAttributes", {
    enumerable: true,
    get: function () {
      return attributes_1.sanitizeAttributes;
    },
  });
  var global_error_handler_1 = require_global_error_handler();
  Object.defineProperty(cjsExports, "globalErrorHandler", {
    enumerable: true,
    get: function () {
      return global_error_handler_1.globalErrorHandler;
    },
  });
  Object.defineProperty(cjsExports, "setGlobalErrorHandler", {
    enumerable: true,
    get: function () {
      return global_error_handler_1.setGlobalErrorHandler;
    },
  });
  var logging_error_handler_1 = require_logging_error_handler();
  Object.defineProperty(cjsExports, "loggingErrorHandler", {
    enumerable: true,
    get: function () {
      return logging_error_handler_1.loggingErrorHandler;
    },
  });
  var time_1 = require_time();
  Object.defineProperty(cjsExports, "addHrTimes", {
    enumerable: true,
    get: function () {
      return time_1.addHrTimes;
    },
  });
  Object.defineProperty(cjsExports, "getTimeOrigin", {
    enumerable: true,
    get: function () {
      return time_1.getTimeOrigin;
    },
  });
  Object.defineProperty(cjsExports, "hrTime", {
    enumerable: true,
    get: function () {
      return time_1.hrTime;
    },
  });
  Object.defineProperty(cjsExports, "hrTimeDuration", {
    enumerable: true,
    get: function () {
      return time_1.hrTimeDuration;
    },
  });
  Object.defineProperty(cjsExports, "hrTimeToMicroseconds", {
    enumerable: true,
    get: function () {
      return time_1.hrTimeToMicroseconds;
    },
  });
  Object.defineProperty(cjsExports, "hrTimeToMilliseconds", {
    enumerable: true,
    get: function () {
      return time_1.hrTimeToMilliseconds;
    },
  });
  Object.defineProperty(cjsExports, "hrTimeToNanoseconds", {
    enumerable: true,
    get: function () {
      return time_1.hrTimeToNanoseconds;
    },
  });
  Object.defineProperty(cjsExports, "hrTimeToTimeStamp", {
    enumerable: true,
    get: function () {
      return time_1.hrTimeToTimeStamp;
    },
  });
  Object.defineProperty(cjsExports, "isTimeInput", {
    enumerable: true,
    get: function () {
      return time_1.isTimeInput;
    },
  });
  Object.defineProperty(cjsExports, "isTimeInputHrTime", {
    enumerable: true,
    get: function () {
      return time_1.isTimeInputHrTime;
    },
  });
  Object.defineProperty(cjsExports, "millisToHrTime", {
    enumerable: true,
    get: function () {
      return time_1.millisToHrTime;
    },
  });
  Object.defineProperty(cjsExports, "timeInputToHrTime", {
    enumerable: true,
    get: function () {
      return time_1.timeInputToHrTime;
    },
  });
  var timer_util_1 = require_timer_util();
  Object.defineProperty(cjsExports, "unrefTimer", {
    enumerable: true,
    get: function () {
      return timer_util_1.unrefTimer;
    },
  });
  var ExportResult_1 = require_ExportResult();
  Object.defineProperty(cjsExports, "ExportResultCode", {
    enumerable: true,
    get: function () {
      return ExportResult_1.ExportResultCode;
    },
  });
  var utils_1 = require_utils();
  Object.defineProperty(cjsExports, "parseKeyPairsIntoRecord", {
    enumerable: true,
    get: function () {
      return utils_1.parseKeyPairsIntoRecord;
    },
  });
  var platform_1 = require_platform_4();
  Object.defineProperty(cjsExports, "SDK_INFO", {
    enumerable: true,
    get: function () {
      return platform_1.SDK_INFO;
    },
  });
  Object.defineProperty(cjsExports, "_globalThis", {
    enumerable: true,
    get: function () {
      return platform_1._globalThis;
    },
  });
  Object.defineProperty(cjsExports, "getStringFromEnv", {
    enumerable: true,
    get: function () {
      return platform_1.getStringFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getBooleanFromEnv", {
    enumerable: true,
    get: function () {
      return platform_1.getBooleanFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getNumberFromEnv", {
    enumerable: true,
    get: function () {
      return platform_1.getNumberFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "getStringListFromEnv", {
    enumerable: true,
    get: function () {
      return platform_1.getStringListFromEnv;
    },
  });
  Object.defineProperty(cjsExports, "otperformance", {
    enumerable: true,
    get: function () {
      return platform_1.otperformance;
    },
  });
  var composite_1 = require_composite();
  Object.defineProperty(cjsExports, "CompositePropagator", {
    enumerable: true,
    get: function () {
      return composite_1.CompositePropagator;
    },
  });
  var W3CTraceContextPropagator_1 = require_W3CTraceContextPropagator();
  Object.defineProperty(cjsExports, "TRACE_PARENT_HEADER", {
    enumerable: true,
    get: function () {
      return W3CTraceContextPropagator_1.TRACE_PARENT_HEADER;
    },
  });
  Object.defineProperty(cjsExports, "TRACE_STATE_HEADER", {
    enumerable: true,
    get: function () {
      return W3CTraceContextPropagator_1.TRACE_STATE_HEADER;
    },
  });
  Object.defineProperty(cjsExports, "W3CTraceContextPropagator", {
    enumerable: true,
    get: function () {
      return W3CTraceContextPropagator_1.W3CTraceContextPropagator;
    },
  });
  Object.defineProperty(cjsExports, "parseTraceParent", {
    enumerable: true,
    get: function () {
      return W3CTraceContextPropagator_1.parseTraceParent;
    },
  });
  var rpc_metadata_1 = require_rpc_metadata();
  Object.defineProperty(cjsExports, "RPCType", {
    enumerable: true,
    get: function () {
      return rpc_metadata_1.RPCType;
    },
  });
  Object.defineProperty(cjsExports, "deleteRPCMetadata", {
    enumerable: true,
    get: function () {
      return rpc_metadata_1.deleteRPCMetadata;
    },
  });
  Object.defineProperty(cjsExports, "getRPCMetadata", {
    enumerable: true,
    get: function () {
      return rpc_metadata_1.getRPCMetadata;
    },
  });
  Object.defineProperty(cjsExports, "setRPCMetadata", {
    enumerable: true,
    get: function () {
      return rpc_metadata_1.setRPCMetadata;
    },
  });
  var suppress_tracing_1 = require_suppress_tracing();
  Object.defineProperty(cjsExports, "isTracingSuppressed", {
    enumerable: true,
    get: function () {
      return suppress_tracing_1.isTracingSuppressed;
    },
  });
  Object.defineProperty(cjsExports, "suppressTracing", {
    enumerable: true,
    get: function () {
      return suppress_tracing_1.suppressTracing;
    },
  });
  Object.defineProperty(cjsExports, "unsuppressTracing", {
    enumerable: true,
    get: function () {
      return suppress_tracing_1.unsuppressTracing;
    },
  });
  var TraceState_1 = require_TraceState();
  Object.defineProperty(cjsExports, "TraceState", {
    enumerable: true,
    get: function () {
      return TraceState_1.TraceState;
    },
  });
  var merge_1 = require_merge();
  Object.defineProperty(cjsExports, "merge", {
    enumerable: true,
    get: function () {
      return merge_1.merge;
    },
  });
  var timeout_1 = require_timeout();
  Object.defineProperty(cjsExports, "TimeoutError", {
    enumerable: true,
    get: function () {
      return timeout_1.TimeoutError;
    },
  });
  Object.defineProperty(cjsExports, "callWithTimeout", {
    enumerable: true,
    get: function () {
      return timeout_1.callWithTimeout;
    },
  });
  var url_1 = require_url();
  Object.defineProperty(cjsExports, "isUrlIgnored", {
    enumerable: true,
    get: function () {
      return url_1.isUrlIgnored;
    },
  });
  Object.defineProperty(cjsExports, "urlMatches", {
    enumerable: true,
    get: function () {
      return url_1.urlMatches;
    },
  });
  var callback_1 = require_callback();
  Object.defineProperty(cjsExports, "BindOnceFuture", {
    enumerable: true,
    get: function () {
      return callback_1.BindOnceFuture;
    },
  });
  var configuration_1 = require_configuration();
  Object.defineProperty(cjsExports, "diagLogLevelFromString", {
    enumerable: true,
    get: function () {
      return configuration_1.diagLogLevelFromString;
    },
  });
  var exporter_1 = require_exporter();
  cjsExports.internal = {
    _export: exporter_1._export,
  };
});
export { require_core };

/**
 * @opentelemetry/api/build/src/trace/spancontext-utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_invalid_span_constants } from "./invalid-span-constants.js";
import { require_NonRecordingSpan } from "./NonRecordingSpan.js";

//@ chunk-7kayq7nc.js:40951-41472 cjs-fingerprint
var require_spancontext_utils = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.wrapSpanContext =
    cjsExports.isSpanContextValid =
    cjsExports.isValidSpanId =
    cjsExports.isValidTraceId =
      undefined;
  var invalid_span_constants_1 = require_invalid_span_constants();
  var NonRecordingSpan_1 = require_NonRecordingSpan();
  var VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
  var VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
  function isValidTraceId(traceId) {
    return VALID_TRACEID_REGEX.test(traceId) && traceId !== invalid_span_constants_1.INVALID_TRACEID;
  }
  cjsExports.isValidTraceId = isValidTraceId;
  function isValidSpanId(spanId) {
    return VALID_SPANID_REGEX.test(spanId) && spanId !== invalid_span_constants_1.INVALID_SPANID;
  }
  cjsExports.isValidSpanId = isValidSpanId;
  function isSpanContextValid(spanContext) {
    return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
  }
  cjsExports.isSpanContextValid = isSpanContextValid;
  function wrapSpanContext(spanContext) {
    return new NonRecordingSpan_1.NonRecordingSpan(spanContext);
  }
  cjsExports.wrapSpanContext = wrapSpanContext;
});
export { require_spancontext_utils };

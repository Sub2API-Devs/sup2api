/**
 * @opentelemetry/core/build/src/trace/W3CTraceContextPropagator.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_suppress_tracing } from "./suppress-tracing.js";
import { require_TraceState } from "./TraceState.js";

//@ chunk-7kayq7nc.js:123101-124488 cjs-fingerprint
var require_W3CTraceContextPropagator = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.W3CTraceContextPropagator =
    cjsExports.parseTraceParent =
    cjsExports.TRACE_STATE_HEADER =
    cjsExports.TRACE_PARENT_HEADER =
      undefined;
  var api_1 = require_api();
  var suppress_tracing_1 = require_suppress_tracing();
  var TraceState_1 = require_TraceState();
  cjsExports.TRACE_PARENT_HEADER = "traceparent";
  cjsExports.TRACE_STATE_HEADER = "tracestate";
  var VERSION = "00";
  var VERSION_PART = "(?!ff)[\\da-f]{2}";
  var TRACE_ID_PART = "(?![0]{32})[\\da-f]{32}";
  var PARENT_ID_PART = "(?![0]{16})[\\da-f]{16}";
  var FLAGS_PART = "[\\da-f]{2}";
  var TRACE_PARENT_REGEX = new RegExp(
    `^\\s?(${VERSION_PART})-(${TRACE_ID_PART})-(${PARENT_ID_PART})-(${FLAGS_PART})(-.*)?\\s?$`,
  );
  function parseTraceParent(traceParent) {
    let match = TRACE_PARENT_REGEX.exec(traceParent);
    if (!match) return null;
    if (match[1] === "00" && match[5]) return null;
    return {
      traceId: match[2],
      spanId: match[3],
      traceFlags: parseInt(match[4], 16),
    };
  }
  cjsExports.parseTraceParent = parseTraceParent;
  class W3CTraceContextPropagator {
    inject(context, carrier, setter) {
      let spanContext = api_1.trace.getSpanContext(context);
      if (
        !spanContext ||
        suppress_tracing_1.isTracingSuppressed(context) ||
        !api_1.isSpanContextValid(spanContext)
      )
        return;
      let traceParent = `${VERSION}-${spanContext.traceId}-${spanContext.spanId}-0${Number(spanContext.traceFlags || api_1.TraceFlags.NONE).toString(16)}`;
      setter.set(carrier, cjsExports.TRACE_PARENT_HEADER, traceParent);
      if (spanContext.traceState)
        setter.set(carrier, cjsExports.TRACE_STATE_HEADER, spanContext.traceState.serialize());
    }
    extract(context, carrier, getter) {
      let traceParentHeader = getter.get(carrier, cjsExports.TRACE_PARENT_HEADER);
      if (!traceParentHeader) return context;
      let traceParent = Array.isArray(traceParentHeader) ? traceParentHeader[0] : traceParentHeader;
      if (typeof traceParent !== "string") return context;
      let spanContext = parseTraceParent(traceParent);
      if (!spanContext) return context;
      spanContext.isRemote = true;
      let traceStateHeader = getter.get(carrier, cjsExports.TRACE_STATE_HEADER);
      if (traceStateHeader) {
        let state = Array.isArray(traceStateHeader) ? traceStateHeader.join(",") : traceStateHeader;
        spanContext.traceState = new TraceState_1.TraceState(typeof state === "string" ? state : undefined);
      }
      return api_1.trace.setSpanContext(context, spanContext);
    }
    fields() {
      return [cjsExports.TRACE_PARENT_HEADER, cjsExports.TRACE_STATE_HEADER];
    }
  }
  cjsExports.W3CTraceContextPropagator = W3CTraceContextPropagator;
});
export { require_W3CTraceContextPropagator };

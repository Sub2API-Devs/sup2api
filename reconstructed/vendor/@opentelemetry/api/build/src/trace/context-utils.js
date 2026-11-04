/**
 * @opentelemetry/api/build/src/trace/context-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_context } from "../context/context.js";
import { require_NonRecordingSpan } from "./NonRecordingSpan.js";
import { require_context_2 } from "../api/context.js";

//@ chunk-bwbq4xvm.js:40179-40865 cjs-fingerprint
var require_context_utils = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSpanContext =
    cjsExports.setSpanContext =
    cjsExports.deleteSpan =
    cjsExports.setSpan =
    cjsExports.getActiveSpan =
    cjsExports.getSpan =
      undefined;
  var context_1 = require_context();
  var NonRecordingSpan_1 = require_NonRecordingSpan();
  var context_2 = require_context_2();
  var SPAN_KEY = context_1.createContextKey("OpenTelemetry Context Key SPAN");
  function getSpan(context) {
    return context.getValue(SPAN_KEY) || undefined;
  }
  cjsExports.getSpan = getSpan;
  function getActiveSpan() {
    return getSpan(context_2.ContextAPI.getInstance().active());
  }
  cjsExports.getActiveSpan = getActiveSpan;
  function setSpan(context, span) {
    return context.setValue(SPAN_KEY, span);
  }
  cjsExports.setSpan = setSpan;
  function deleteSpan(context) {
    return context.deleteValue(SPAN_KEY);
  }
  cjsExports.deleteSpan = deleteSpan;
  function setSpanContext(context, spanContext) {
    return setSpan(context, new NonRecordingSpan_1.NonRecordingSpan(spanContext));
  }
  cjsExports.setSpanContext = setSpanContext;
  function getSpanContext(context) {
    var _a;
    return (_a = getSpan(context)) === null || _a === undefined ? undefined : _a.spanContext();
  }
  cjsExports.getSpanContext = getSpanContext;
});
export { require_context_utils };

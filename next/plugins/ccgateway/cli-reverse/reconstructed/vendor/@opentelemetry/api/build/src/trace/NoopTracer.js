/**
 * @opentelemetry/api/build/src/trace/NoopTracer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_context_2 } from "../api/context.js";
import { require_context_utils } from "./context-utils.js";
import { require_NonRecordingSpan } from "./NonRecordingSpan.js";
import { require_spancontext_utils } from "./spancontext-utils.js";

//@ chunk-7kayq7nc.js:41472-42298 cjs-fingerprint
var require_NoopTracer = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NoopTracer = undefined;
  var context_1 = require_context_2();
  var context_utils_1 = require_context_utils();
  var NonRecordingSpan_1 = require_NonRecordingSpan();
  var spancontext_utils_1 = require_spancontext_utils();
  var contextApi = context_1.ContextAPI.getInstance();
  class NoopTracer {
    startSpan(name, options, context = contextApi.active()) {
      if (Boolean(options === null || options === undefined ? undefined : options.root))
        return new NonRecordingSpan_1.NonRecordingSpan();
      let parentFromContext = context && context_utils_1.getSpanContext(context);
      if (isSpanContext(parentFromContext) && spancontext_utils_1.isSpanContextValid(parentFromContext))
        return new NonRecordingSpan_1.NonRecordingSpan(parentFromContext);
      else return new NonRecordingSpan_1.NonRecordingSpan();
    }
    startActiveSpan(name, arg2, arg3, arg4) {
      let opts;
      let ctx;
      let fn;
      if (arguments.length < 2) return;
      else if (arguments.length === 2) fn = arg2;
      else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      let parentContext = ctx !== null && ctx !== undefined ? ctx : contextApi.active();
      let span = this.startSpan(name, opts, parentContext);
      let contextWithSpanSet = context_utils_1.setSpan(parentContext, span);
      return contextApi.with(contextWithSpanSet, fn, undefined, span);
    }
  }
  cjsExports.NoopTracer = NoopTracer;
  function isSpanContext(spanContext) {
    return (
      typeof spanContext === "object" &&
      typeof spanContext.spanId === "string" &&
      typeof spanContext.traceId === "string" &&
      typeof spanContext.traceFlags === "number"
    );
  }
});
export { require_NoopTracer };

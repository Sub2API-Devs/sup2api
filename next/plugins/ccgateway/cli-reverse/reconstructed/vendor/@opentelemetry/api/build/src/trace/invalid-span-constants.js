/**
 * @opentelemetry/api/build/src/trace/invalid-span-constants.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_trace_flags } from "./trace_flags.js";

//@ chunk-7kayq7nc.js:39432-39785 cjs-fingerprint
var require_invalid_span_constants = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.INVALID_SPAN_CONTEXT = cjsExports.INVALID_TRACEID = cjsExports.INVALID_SPANID = undefined;
  var trace_flags_1 = require_trace_flags();
  cjsExports.INVALID_SPANID = "0000000000000000";
  cjsExports.INVALID_TRACEID = "00000000000000000000000000000000";
  cjsExports.INVALID_SPAN_CONTEXT = {
    traceId: cjsExports.INVALID_TRACEID,
    spanId: cjsExports.INVALID_SPANID,
    traceFlags: trace_flags_1.TraceFlags.NONE,
  };
});
export { require_invalid_span_constants };

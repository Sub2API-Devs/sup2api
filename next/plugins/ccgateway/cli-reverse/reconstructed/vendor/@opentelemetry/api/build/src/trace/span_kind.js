/**
 * @opentelemetry/api/build/src/trace/span_kind.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:43851-44127 cjs-fingerprint
var require_span_kind = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SpanKind = undefined;
  var SpanKind;
  (function (SpanKind) {
    SpanKind[(SpanKind.INTERNAL = 0)] = "INTERNAL";
    SpanKind[(SpanKind.SERVER = 1)] = "SERVER";
    SpanKind[(SpanKind.CLIENT = 2)] = "CLIENT";
    SpanKind[(SpanKind.PRODUCER = 3)] = "PRODUCER";
    SpanKind[(SpanKind.CONSUMER = 4)] = "CONSUMER";
  })((SpanKind = cjsExports.SpanKind || (cjsExports.SpanKind = {})));
});
export { require_span_kind };

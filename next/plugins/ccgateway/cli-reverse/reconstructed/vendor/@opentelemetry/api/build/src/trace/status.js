/**
 * @opentelemetry/api/build/src/trace/status.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:44127-44351 cjs-fingerprint
var require_status = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SpanStatusCode = undefined;
  var SpanStatusCode;
  (function (SpanStatusCode) {
    SpanStatusCode[(SpanStatusCode.UNSET = 0)] = "UNSET";
    SpanStatusCode[(SpanStatusCode.OK = 1)] = "OK";
    SpanStatusCode[(SpanStatusCode.ERROR = 2)] = "ERROR";
  })((SpanStatusCode = cjsExports.SpanStatusCode || (cjsExports.SpanStatusCode = {})));
});
export { require_status };

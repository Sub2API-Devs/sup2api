/**
 * @opentelemetry/otlp-transformer/build/src/trace/json/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_trace_2 } from "./trace.js";

//@ chunk-vxhm2nqe.js:254897-255123 cjs-fingerprint
var require_json_3 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JsonTraceSerializer = undefined;
  var trace_1 = require_trace_2();
  Object.defineProperty(cjsExports, "JsonTraceSerializer", {
    enumerable: true,
    get: function () {
      return trace_1.JsonTraceSerializer;
    },
  });
});
export { require_json_3 };

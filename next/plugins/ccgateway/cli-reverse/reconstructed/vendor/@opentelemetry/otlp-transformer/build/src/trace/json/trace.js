/**
 * @opentelemetry/otlp-transformer/build/src/trace/json/trace.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_internal_4 } from "../internal.js";

//@ chunk-vxhm2nqe.js:254511-254897 cjs-fingerprint
var require_trace_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JsonTraceSerializer = undefined;
  var internal_1 = require_internal_4();
  cjsExports.JsonTraceSerializer = {
    serializeRequest: (arg) => {
      let request = internal_1.createExportTraceServiceRequest(arg, {
        useHex: true,
        useLongBits: false,
      });
      return new TextEncoder().encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) return {};
      return JSON.parse(new TextDecoder().decode(arg));
    },
  };
});
export { require_trace_2 };

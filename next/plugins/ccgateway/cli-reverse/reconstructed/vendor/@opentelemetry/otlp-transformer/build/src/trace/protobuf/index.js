/**
 * @opentelemetry/otlp-transformer/build/src/trace/protobuf/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_trace } from "./trace.js";

//@ chunk-vxhm2nqe.js:253051-253289 cjs-fingerprint
var require_protobuf_3 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProtobufTraceSerializer = undefined;
  var trace_1 = require_trace();
  Object.defineProperty(cjsExports, "ProtobufTraceSerializer", {
    enumerable: true,
    get: function () {
      return trace_1.ProtobufTraceSerializer;
    },
  });
});
export { require_protobuf_3 };

/**
 * @opentelemetry/otlp-transformer/build/src/trace/protobuf/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_trace } from "./trace.js";

//@ chunk-798ashq9.js:253051-253289 cjs-fingerprint
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

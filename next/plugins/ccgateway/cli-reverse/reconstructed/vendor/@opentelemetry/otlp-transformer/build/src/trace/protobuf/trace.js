/**
 * @opentelemetry/otlp-transformer/build/src/trace/protobuf/trace.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_root } from "../../generated/root.js";
import { require_internal_4 } from "../internal.js";

//@ chunk-vxhm2nqe.js:252616-253051 cjs-fingerprint
var require_trace = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProtobufTraceSerializer = undefined;
  var root = require_root();
  var internal_1 = require_internal_4();
  var traceResponseType = root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
  var traceRequestType = root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
  cjsExports.ProtobufTraceSerializer = {
    serializeRequest: (arg) => {
      let request = internal_1.createExportTraceServiceRequest(arg);
      return traceRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => traceResponseType.decode(arg),
  };
});
export { require_trace };

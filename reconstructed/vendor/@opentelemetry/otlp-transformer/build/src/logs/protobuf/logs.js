/**
 * @opentelemetry/otlp-transformer/build/src/logs/protobuf/logs.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_root } from "../../generated/root.js";
import { require_internal_2 } from "../internal.js";

//@ chunk-798ashq9.js:245925-246353 cjs-fingerprint
var require_logs = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProtobufLogsSerializer = undefined;
  var root = require_root();
  var internal_1 = require_internal_2();
  var logsResponseType = root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
  var logsRequestType = root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
  cjsExports.ProtobufLogsSerializer = {
    serializeRequest: (arg) => {
      let request = internal_1.createExportLogsServiceRequest(arg);
      return logsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => logsResponseType.decode(arg),
  };
});
export { require_logs };

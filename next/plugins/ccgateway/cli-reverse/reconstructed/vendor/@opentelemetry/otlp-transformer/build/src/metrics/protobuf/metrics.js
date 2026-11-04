/**
 * @opentelemetry/otlp-transformer/build/src/metrics/protobuf/metrics.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_root } from "../../generated/root.js";
import { require_internal_3 } from "../internal.js";

//@ chunk-798ashq9.js:249557-250008 cjs-fingerprint
var require_metrics = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProtobufMetricsSerializer = undefined;
  var root = require_root();
  var internal_1 = require_internal_3();
  var metricsResponseType = root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
  var metricsRequestType = root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
  cjsExports.ProtobufMetricsSerializer = {
    serializeRequest: (arg) => {
      let request = internal_1.createExportMetricsServiceRequest([arg]);
      return metricsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => metricsResponseType.decode(arg),
  };
});
export { require_metrics };

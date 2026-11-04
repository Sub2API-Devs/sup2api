/**
 * @opentelemetry/exporter-trace-otlp-grpc/build/src/OTLPTraceExporter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-trace-otlp-grpc@0.208.0
 * pieces: chunk-qz9ye512.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_otlp_grpc_exporter_base } from "../../../otlp-grpc-exporter-base/build/src/index.js";
import { require_otlp_transformer } from "../../../otlp-transformer/build/src/index.js";
import { require_otlp_exporter_base } from "../../../otlp-exporter-base/build/src/index.js";

//@ chunk-qz9ye512.js:330-721 cjs-fingerprint
var require_OTLPTraceExporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPTraceExporter = undefined;
  var otlp_grpc_exporter_base_1 = require_otlp_grpc_exporter_base();
  var otlp_transformer_1 = require_otlp_transformer();
  var otlp_exporter_base_1 = require_otlp_exporter_base();
  class OTLPTraceExporter extends otlp_exporter_base_1.OTLPExporterBase {
    constructor(config = {}) {
      super(
        otlp_grpc_exporter_base_1.createOtlpGrpcExportDelegate(
          otlp_grpc_exporter_base_1.convertLegacyOtlpGrpcOptions(config, "TRACES"),
          otlp_transformer_1.ProtobufTraceSerializer,
          "TraceExportService",
          "/opentelemetry.proto.collector.trace.v1.TraceService/Export",
        ),
      );
    }
  }
  cjsExports.OTLPTraceExporter = OTLPTraceExporter;
});
export { require_OTLPTraceExporter };

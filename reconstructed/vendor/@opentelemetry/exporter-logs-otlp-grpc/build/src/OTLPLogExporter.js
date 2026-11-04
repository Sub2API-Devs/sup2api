/**
 * @opentelemetry/exporter-logs-otlp-grpc/build/src/OTLPLogExporter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-logs-otlp-grpc@0.208.0
 * pieces: chunk-vt7p2m92.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { Ian } from "../../../otlp-grpc-exporter-base/build/src/index.js";
import { require_otlp_transformer } from "../../../otlp-transformer/build/src/index.js";
import { require_otlp_exporter_base } from "../../../otlp-exporter-base/build/src/index.js";

//@ chunk-vt7p2m92.js:330-711 cjs-fingerprint
var require_OTLPLogExporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPLogExporter = undefined;
  var otlp_grpc_exporter_base_1 = Ian();
  var otlp_transformer_1 = require_otlp_transformer();
  var otlp_exporter_base_1 = require_otlp_exporter_base();
  class OTLPLogExporter extends otlp_exporter_base_1.OTLPExporterBase {
    constructor(config = {}) {
      super(
        otlp_grpc_exporter_base_1.createOtlpGrpcExportDelegate(
          otlp_grpc_exporter_base_1.convertLegacyOtlpGrpcOptions(config, "LOGS"),
          otlp_transformer_1.ProtobufLogsSerializer,
          "LogsExportService",
          "/opentelemetry.proto.collector.logs.v1.LogsService/Export",
        ),
      );
    }
  }
  cjsExports.OTLPLogExporter = OTLPLogExporter;
});
export { require_OTLPLogExporter };

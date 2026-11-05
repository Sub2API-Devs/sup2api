/**
 * @opentelemetry/exporter-metrics-otlp-grpc/build/src/OTLPMetricExporter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-grpc@0.208.0
 * pieces: chunk-t5z3vjtf.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_exporter_metrics_otlp_http } from "../../../exporter-metrics-otlp-http/build/src/index.js";
import { require_otlp_grpc_exporter_base } from "../../../otlp-grpc-exporter-base/build/src/index.js";
import { require_otlp_transformer } from "../../../otlp-transformer/build/src/index.js";

//@ chunk-t5z3vjtf.js:364-776 cjs-fingerprint
var require_OTLPMetricExporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPMetricExporter = undefined;
  var exporter_metrics_otlp_http_1 = require_exporter_metrics_otlp_http();
  var otlp_grpc_exporter_base_1 = require_otlp_grpc_exporter_base();
  var otlp_transformer_1 = require_otlp_transformer();
  class OTLPMetricExporter extends exporter_metrics_otlp_http_1.OTLPMetricExporterBase {
    constructor(config) {
      super(
        otlp_grpc_exporter_base_1.createOtlpGrpcExportDelegate(
          otlp_grpc_exporter_base_1.convertLegacyOtlpGrpcOptions(config ?? {}, "METRICS"),
          otlp_transformer_1.ProtobufMetricsSerializer,
          "MetricsExportService",
          "/opentelemetry.proto.collector.metrics.v1.MetricsService/Export",
        ),
        config,
      );
    }
  }
  cjsExports.OTLPMetricExporter = OTLPMetricExporter;
});
export { require_OTLPMetricExporter };

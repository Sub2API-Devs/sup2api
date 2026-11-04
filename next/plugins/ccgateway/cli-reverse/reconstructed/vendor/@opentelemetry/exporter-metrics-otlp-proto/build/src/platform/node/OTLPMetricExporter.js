/**
 * @opentelemetry/exporter-metrics-otlp-proto/build/src/platform/node/OTLPMetricExporter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-proto@0.208.0
 * pieces: chunk-qrf13zdh.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../../../runtime/bun-runtime.js";
import { require_exporter_metrics_otlp_http } from "../../../../../exporter-metrics-otlp-http/build/src/index.js";
import { require_otlp_transformer } from "../../../../../otlp-transformer/build/src/index.js";
import { require_index_node_http } from "../../../../../otlp-exporter-base/build/src/index-node-http.js";

//@ chunk-qrf13zdh.js:332-371 esm-layout
var exporter_metrics_otlp_http_1 = __toESM(require_exporter_metrics_otlp_http());
var otlp_transformer_1 = __toESM(require_otlp_transformer());
var node_http_1 = __toESM(require_index_node_http());
//@ chunk-qrf13zdh.js:371-596 esm-fingerprint
class OTLPMetricExporter extends exporter_metrics_otlp_http_1.OTLPMetricExporterBase {
  constructor(config) {
    super(
      node_http_1.createOtlpHttpExportDelegate(
        node_http_1.convertLegacyHttpOptions(config ?? {}, "METRICS", "v1/metrics", {
          "Content-Type": "application/x-protobuf",
        }),
        otlp_transformer_1.ProtobufMetricsSerializer,
      ),
      config,
    );
  }
}
export { OTLPMetricExporter };

/**
 * @opentelemetry/exporter-logs-otlp-proto/build/src/platform/node/OTLPLogExporter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/exporter-logs-otlp-proto@0.208.0
 * pieces: chunk-290z83zt.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../../../runtime/bun-runtime.js";
import { require_otlp_exporter_base } from "../../../../../otlp-exporter-base/build/src/index.js";
import { require_otlp_transformer } from "../../../../../otlp-transformer/build/src/index.js";
import { require_index_node_http } from "../../../../../otlp-exporter-base/build/src/index-node-http.js";

//@ chunk-290z83zt.js:298-336 esm-layout
var otlp_exporter_base_1 = __toESM(require_otlp_exporter_base());
var otlp_transformer_1 = __toESM(require_otlp_transformer());
var node_http_1 = __toESM(require_index_node_http());
//@ chunk-290z83zt.js:336-543 esm-fingerprint
class OTLPLogExporter extends otlp_exporter_base_1.OTLPExporterBase {
  constructor(config = {}) {
    super(
      node_http_1.createOtlpHttpExportDelegate(
        node_http_1.convertLegacyHttpOptions(config, "LOGS", "v1/logs", {
          "Content-Type": "application/x-protobuf",
        }),
        otlp_transformer_1.ProtobufLogsSerializer,
      ),
    );
  }
}
export { OTLPLogExporter };

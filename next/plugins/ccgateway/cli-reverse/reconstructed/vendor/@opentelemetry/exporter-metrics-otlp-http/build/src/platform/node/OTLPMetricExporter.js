/**
 * @opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/exporter-metrics-otlp-http@0.208.0..0.220.0
 * pieces: chunk-hvqbmbtb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_OTLPMetricExporterBase } from "../../OTLPMetricExporterBase.js";
import { require_otlp_transformer } from "../../../../../otlp-transformer/build/src/index.js";
import { require_index_node_http } from "../../../../../otlp-exporter-base/build/src/index-node-http.js";

//@ chunk-hvqbmbtb.js:2962-3324 cjs-fingerprint
var require_OTLPMetricExporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OTLPMetricExporter = undefined;
  var OTLPMetricExporterBase_1 = require_OTLPMetricExporterBase();
  var otlp_transformer_1 = require_otlp_transformer();
  var node_http_1 = require_index_node_http();
  class OTLPMetricExporter extends OTLPMetricExporterBase_1.OTLPMetricExporterBase {
    constructor(config) {
      super(
        node_http_1.createOtlpHttpExportDelegate(
          node_http_1.convertLegacyHttpOptions(config ?? {}, "METRICS", "v1/metrics", {
            "Content-Type": "application/json",
          }),
          otlp_transformer_1.JsonMetricsSerializer,
        ),
        config,
      );
    }
  }
  cjsExports.OTLPMetricExporter = OTLPMetricExporter;
});
export { require_OTLPMetricExporter };

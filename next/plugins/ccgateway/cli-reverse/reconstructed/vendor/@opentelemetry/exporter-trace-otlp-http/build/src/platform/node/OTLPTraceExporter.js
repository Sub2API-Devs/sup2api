/**
 * @opentelemetry/exporter-trace-otlp-http/build/src/platform/node/OTLPTraceExporter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/exporter-trace-otlp-http@0.208.0
 * pieces: chunk-3p3dmcrb.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../../../../runtime/bun-runtime.js";
import { require_otlp_exporter_base } from "../../../../../otlp-exporter-base/build/src/index.js";
import { require_otlp_transformer } from "../../../../../otlp-transformer/build/src/index.js";
import { require_index_node_http } from "../../../../../otlp-exporter-base/build/src/index-node-http.js";

//@ chunk-3p3dmcrb.js:298-336 esm-layout
var otlp_exporter_base_1 = __toESM(require_otlp_exporter_base());
var otlp_transformer_1 = __toESM(require_otlp_transformer());
var node_http_1 = __toESM(require_index_node_http());
//@ chunk-3p3dmcrb.js:336-538 esm-fingerprint
class OTLPTraceExporter extends otlp_exporter_base_1.OTLPExporterBase {
  constructor(config = {}) {
    super(
      node_http_1.createOtlpHttpExportDelegate(
        node_http_1.convertLegacyHttpOptions(config, "TRACES", "v1/traces", {
          "Content-Type": "application/json",
        }),
        otlp_transformer_1.JsonTraceSerializer,
      ),
    );
  }
}
export { OTLPTraceExporter };

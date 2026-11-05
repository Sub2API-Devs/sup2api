/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_convert_legacy_otlp_grpc_options } from "./configuration/convert-legacy-otlp-grpc-options.js";
import { require_otlp_grpc_export_delegate } from "./otlp-grpc-export-delegate.js";

//@ chunk-3k21nfa0.js:392337-392763 cjs-fingerprint
var require_otlp_grpc_exporter_base = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpGrpcExportDelegate = cjsExports.convertLegacyOtlpGrpcOptions = undefined;
  var convert_legacy_otlp_grpc_options_1 = require_convert_legacy_otlp_grpc_options();
  Object.defineProperty(cjsExports, "convertLegacyOtlpGrpcOptions", {
    enumerable: true,
    get: function () {
      return convert_legacy_otlp_grpc_options_1.convertLegacyOtlpGrpcOptions;
    },
  });
  var otlp_grpc_export_delegate_1 = require_otlp_grpc_export_delegate();
  Object.defineProperty(cjsExports, "createOtlpGrpcExportDelegate", {
    enumerable: true,
    get: function () {
      return otlp_grpc_export_delegate_1.createOtlpGrpcExportDelegate;
    },
  });
});
export { require_otlp_grpc_exporter_base };

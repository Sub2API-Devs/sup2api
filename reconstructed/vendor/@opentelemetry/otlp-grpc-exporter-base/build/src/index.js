/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { _y } from "./configuration/convert-legacy-otlp-grpc-options.js";
import { Ry } from "./otlp-grpc-export-delegate.js";

//@ chunk-pwh5dx3n.js:392337-392763 cjs-fingerprint
var Ian = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpGrpcExportDelegate = cjsExports.convertLegacyOtlpGrpcOptions = undefined;
  var convert_legacy_otlp_grpc_options_1 = _y();
  Object.defineProperty(cjsExports, "convertLegacyOtlpGrpcOptions", {
    enumerable: true,
    get: function () {
      return convert_legacy_otlp_grpc_options_1.convertLegacyOtlpGrpcOptions;
    },
  });
  var otlp_grpc_export_delegate_1 = Ry();
  Object.defineProperty(cjsExports, "createOtlpGrpcExportDelegate", {
    enumerable: true,
    get: function () {
      return otlp_grpc_export_delegate_1.createOtlpGrpcExportDelegate;
    },
  });
});
export { Ian };

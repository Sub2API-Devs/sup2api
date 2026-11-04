/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/otlp-grpc-export-delegate.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { require_otlp_exporter_base as D9 } from "../../../otlp-exporter-base/build/src/index.js";
import { Ji } from "./grpc-exporter-transport.js";

//@ chunk-pwh5dx3n.js:391933-392337 cjs-fingerprint
var Ry = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpGrpcExportDelegate = undefined;
  var otlp_exporter_base_1 = D9();
  var grpc_exporter_transport_1 = Ji();
  function createOtlpGrpcExportDelegate(options, serializer, grpcName, grpcPath) {
    return otlp_exporter_base_1.createOtlpNetworkExportDelegate(
      options,
      serializer,
      grpc_exporter_transport_1.createOtlpGrpcExporterTransport({
        address: options.url,
        compression: options.compression,
        credentials: options.credentials,
        metadata: options.metadata,
        userAgent: options.userAgent,
        grpcName,
        grpcPath,
      }),
    );
  }
  cjsExports.createOtlpGrpcExportDelegate = createOtlpGrpcExportDelegate;
});
export { Ry };

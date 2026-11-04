/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/configuration/convert-legacy-otlp-grpc-options.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../../runtime/bun-runtime.js";
import { require_api as Ol } from "../../../../api/build/src/index.js";
import { ny } from "./otlp-grpc-configuration.js";
import { Ji } from "../grpc-exporter-transport.js";
import { fy } from "./otlp-grpc-env-configuration.js";

//@ chunk-pwh5dx3n.js:391311-391933 cjs-fingerprint
var _y = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.convertLegacyOtlpGrpcOptions = undefined;
  var api_1 = Ol();
  var otlp_grpc_configuration_1 = ny();
  var grpc_exporter_transport_1 = Ji();
  var otlp_grpc_env_configuration_1 = fy();
  function convertLegacyOtlpGrpcOptions(config, signalIdentifier) {
    if (config.headers) api_1.diag.warn("Headers cannot be set when using grpc");
    let userProvidedCredentials = config.credentials;
    return otlp_grpc_configuration_1.mergeOtlpGrpcConfigurationWithDefaults(
      {
        url: config.url,
        metadata: () => config.metadata ?? grpc_exporter_transport_1.createEmptyMetadata(),
        compression: config.compression,
        timeoutMillis: config.timeoutMillis,
        concurrencyLimit: config.concurrencyLimit,
        credentials: userProvidedCredentials != null ? () => userProvidedCredentials : undefined,
        userAgent: config.userAgent,
      },
      otlp_grpc_env_configuration_1.getOtlpGrpcConfigurationFromEnv(signalIdentifier),
      otlp_grpc_configuration_1.getOtlpGrpcDefaultConfiguration(),
    );
  }
  cjsExports.convertLegacyOtlpGrpcOptions = convertLegacyOtlpGrpcOptions;
});
export { _y };

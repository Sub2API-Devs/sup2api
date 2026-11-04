/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/configuration/otlp-grpc-env-configuration.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../../runtime/bun-runtime.js";
import { require_core as Qm } from "../../../../core/build/src/index.js";
import { Ji } from "../grpc-exporter-transport.js";
import { require_index_node_http as Eoe } from "../../../../otlp-exporter-base/build/src/index-node-http.js";
import { require_api as Ol } from "../../../../api/build/src/index.js";

//@ chunk-pwh5dx3n.js:389016-391311 cjs-fingerprint
var fy = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getOtlpGrpcConfigurationFromEnv = undefined;
  var core_1 = Qm();
  var grpc_exporter_transport_1 = Ji();
  var node_http_1 = Eoe();
  var fs = Be("fs");
  var path = Be("path");
  var api_1 = Ol();
  function fallbackIfNullishOrBlank(signalSpecific, nonSignalSpecific) {
    if (signalSpecific != null && signalSpecific !== "") return signalSpecific;
    if (nonSignalSpecific != null && nonSignalSpecific !== "") return nonSignalSpecific;
    return;
  }
  function getMetadataFromEnv(signalIdentifier) {
    let signalSpecificRawHeaders = process.env[`OTEL_EXPORTER_OTLP_${signalIdentifier}_HEADERS`]?.trim();
    let nonSignalSpecificRawHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS?.trim();
    let signalSpecificHeaders = core_1.parseKeyPairsIntoRecord(signalSpecificRawHeaders);
    let nonSignalSpecificHeaders = core_1.parseKeyPairsIntoRecord(nonSignalSpecificRawHeaders);
    if (Object.keys(signalSpecificHeaders).length === 0 && Object.keys(nonSignalSpecificHeaders).length === 0)
      return;
    let mergeHeaders = Object.assign({}, nonSignalSpecificHeaders, signalSpecificHeaders);
    let metadata = grpc_exporter_transport_1.createEmptyMetadata();
    for (let [key, value] of Object.entries(mergeHeaders)) metadata.set(key, value);
    return metadata;
  }
  function getMetadataProviderFromEnv(signalIdentifier) {
    let metadata = getMetadataFromEnv(signalIdentifier);
    if (metadata == null) return;
    return () => metadata;
  }
  function getUrlFromEnv(signalIdentifier) {
    let specificEndpoint = process.env[`OTEL_EXPORTER_OTLP_${signalIdentifier}_ENDPOINT`]?.trim();
    let nonSpecificEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
    return fallbackIfNullishOrBlank(specificEndpoint, nonSpecificEndpoint);
  }
  function getInsecureSettingFromEnv(signalIdentifier) {
    let signalSpecificInsecureValue = process.env[`OTEL_EXPORTER_OTLP_${signalIdentifier}_INSECURE`]
      ?.toLowerCase()
      .trim();
    let nonSignalSpecificInsecureValue = process.env.OTEL_EXPORTER_OTLP_INSECURE?.toLowerCase().trim();
    return fallbackIfNullishOrBlank(signalSpecificInsecureValue, nonSignalSpecificInsecureValue) === "true";
  }
  function readFileFromEnv(signalSpecificEnvVar, nonSignalSpecificEnvVar, warningMessage) {
    let signalSpecificPath = process.env[signalSpecificEnvVar]?.trim();
    let nonSignalSpecificPath = process.env[nonSignalSpecificEnvVar]?.trim();
    let filePath = fallbackIfNullishOrBlank(signalSpecificPath, nonSignalSpecificPath);
    if (filePath != null)
      try {
        return fs.readFileSync(path.resolve(process.cwd(), filePath));
      } catch {
        api_1.diag.warn(warningMessage);
        return;
      }
    else return;
  }
  function getClientCertificateFromEnv(signalIdentifier) {
    return readFileFromEnv(
      `OTEL_EXPORTER_OTLP_${signalIdentifier}_CLIENT_CERTIFICATE`,
      "OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE",
      "Failed to read client certificate chain file",
    );
  }
  function getClientKeyFromEnv(signalIdentifier) {
    return readFileFromEnv(
      `OTEL_EXPORTER_OTLP_${signalIdentifier}_CLIENT_KEY`,
      "OTEL_EXPORTER_OTLP_CLIENT_KEY",
      "Failed to read client certificate private key file",
    );
  }
  function getRootCertificateFromEnv(signalIdentifier) {
    return readFileFromEnv(
      `OTEL_EXPORTER_OTLP_${signalIdentifier}_CERTIFICATE`,
      "OTEL_EXPORTER_OTLP_CERTIFICATE",
      "Failed to read root certificate file",
    );
  }
  function getCredentialsFromEnvIgnoreInsecure(signalIdentifier) {
    let clientKey = getClientKeyFromEnv(signalIdentifier);
    let clientCertificate = getClientCertificateFromEnv(signalIdentifier);
    let rootCertificate = getRootCertificateFromEnv(signalIdentifier);
    let clientChainIntact = clientKey != null && clientCertificate != null;
    if (rootCertificate != null && !clientChainIntact) {
      api_1.diag.warn(
        "Client key and certificate must both be provided, but one was missing - attempting to create credentials from just the root certificate",
      );
      return grpc_exporter_transport_1.createSslCredentials(getRootCertificateFromEnv(signalIdentifier));
    }
    return grpc_exporter_transport_1.createSslCredentials(rootCertificate, clientKey, clientCertificate);
  }
  function getCredentialsFromEnv(signalIdentifier) {
    if (getInsecureSettingFromEnv(signalIdentifier))
      return grpc_exporter_transport_1.createInsecureCredentials();
    return getCredentialsFromEnvIgnoreInsecure(signalIdentifier);
  }
  function getOtlpGrpcConfigurationFromEnv(signalIdentifier) {
    return {
      ...node_http_1.getSharedConfigurationFromEnvironment(signalIdentifier),
      metadata: getMetadataProviderFromEnv(signalIdentifier),
      url: getUrlFromEnv(signalIdentifier),
      credentials: (finalResolvedUrl) => {
        if (finalResolvedUrl.startsWith("http://"))
          return () => grpc_exporter_transport_1.createInsecureCredentials();
        else if (finalResolvedUrl.startsWith("https://"))
          return () => getCredentialsFromEnvIgnoreInsecure(signalIdentifier);
        return () => getCredentialsFromEnv(signalIdentifier);
      },
    };
  }
  cjsExports.getOtlpGrpcConfigurationFromEnv = getOtlpGrpcConfigurationFromEnv;
});
export { fy };

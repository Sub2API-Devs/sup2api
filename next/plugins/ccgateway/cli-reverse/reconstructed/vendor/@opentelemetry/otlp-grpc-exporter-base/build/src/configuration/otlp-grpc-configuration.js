/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/configuration/otlp-grpc-configuration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../../runtime/bun-runtime.js";
import { require_otlp_exporter_base } from "../../../../otlp-exporter-base/build/src/index.js";
import { require_grpc_exporter_transport } from "../grpc-exporter-transport.js";
import { require_api as require_api_2 } from "../../../../api/build/src/index.js";

//@ chunk-3k21nfa0.js:387586-389016 cjs-fingerprint
var require_otlp_grpc_configuration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getOtlpGrpcDefaultConfiguration =
    cjsExports.mergeOtlpGrpcConfigurationWithDefaults =
    cjsExports.validateAndNormalizeUrl =
      undefined;
  var otlp_exporter_base_1 = require_otlp_exporter_base();
  var grpc_exporter_transport_1 = require_grpc_exporter_transport();
  var url_1 = importMetaRequire("url");
  var api_1 = require_api_2();
  function validateAndNormalizeUrl(url) {
    url = url.trim();
    if (!url.match(/^([\w]{1,8}):\/\//)) url = `https://${url}`;
    let target = new url_1.URL(url);
    if (target.protocol === "unix:") return url;
    if (target.pathname && target.pathname !== "/")
      api_1.diag.warn(
        "URL path should not be set when using grpc, the path part of the URL will be ignored.",
      );
    if (target.protocol !== "" && !target.protocol?.match(/^(http)s?:$/))
      api_1.diag.warn("URL protocol should be http(s)://. Using http://.");
    return target.host;
  }
  cjsExports.validateAndNormalizeUrl = validateAndNormalizeUrl;
  function overrideMetadataEntriesIfNotPresent(metadata, additionalMetadata) {
    for (let [key, value] of Object.entries(additionalMetadata.getMap()))
      if (metadata.get(key).length < 1) metadata.set(key, value);
  }
  function mergeOtlpGrpcConfigurationWithDefaults(
    userProvidedConfiguration,
    fallbackConfiguration,
    defaultConfiguration,
  ) {
    let rawUrl = userProvidedConfiguration.url ?? fallbackConfiguration.url ?? defaultConfiguration.url;
    return {
      ...otlp_exporter_base_1.mergeOtlpSharedConfigurationWithDefaults(
        userProvidedConfiguration,
        fallbackConfiguration,
        defaultConfiguration,
      ),
      metadata: () => {
        let metadata = defaultConfiguration.metadata();
        overrideMetadataEntriesIfNotPresent(
          metadata,
          userProvidedConfiguration.metadata?.().clone() ?? grpc_exporter_transport_1.createEmptyMetadata(),
        );
        overrideMetadataEntriesIfNotPresent(
          metadata,
          fallbackConfiguration.metadata?.() ?? grpc_exporter_transport_1.createEmptyMetadata(),
        );
        return metadata;
      },
      url: validateAndNormalizeUrl(rawUrl),
      credentials:
        userProvidedConfiguration.credentials ??
        fallbackConfiguration.credentials?.(rawUrl) ??
        defaultConfiguration.credentials(rawUrl),
      userAgent: userProvidedConfiguration.userAgent,
    };
  }
  cjsExports.mergeOtlpGrpcConfigurationWithDefaults = mergeOtlpGrpcConfigurationWithDefaults;
  function getOtlpGrpcDefaultConfiguration() {
    return {
      ...otlp_exporter_base_1.getSharedConfigurationDefaults(),
      metadata: () => grpc_exporter_transport_1.createEmptyMetadata(),
      url: "http://localhost:4317",
      credentials: (url) => {
        if (url.startsWith("http://")) return () => grpc_exporter_transport_1.createInsecureCredentials();
        else return () => grpc_exporter_transport_1.createSslCredentials();
      },
    };
  }
  cjsExports.getOtlpGrpcDefaultConfiguration = getOtlpGrpcDefaultConfiguration;
});
export { require_otlp_grpc_configuration };

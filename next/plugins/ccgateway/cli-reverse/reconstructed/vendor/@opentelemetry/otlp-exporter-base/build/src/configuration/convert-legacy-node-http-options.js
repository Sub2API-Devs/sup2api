/**
 * @opentelemetry/otlp-exporter-base/build/src/configuration/convert-legacy-node-http-options.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_otlp_node_http_configuration } from "./otlp-node-http-configuration.js";
import { require_index_node_http } from "../index-node-http.js";
import { require_otlp_node_http_env_configuration } from "./otlp-node-http-env-configuration.js";
import { require_convert_legacy_http_options } from "./convert-legacy-http-options.js";

//@ chunk-vxhm2nqe.js:265159-265981 cjs-fingerprint
var require_convert_legacy_node_http_options = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.convertLegacyHttpOptions = undefined;
  var api_1 = require_api();
  var otlp_node_http_configuration_1 = require_otlp_node_http_configuration();
  var index_node_http_1 = require_index_node_http();
  var otlp_node_http_env_configuration_1 = require_otlp_node_http_env_configuration();
  var convert_legacy_http_options_1 = require_convert_legacy_http_options();
  function convertLegacyAgentOptions(config) {
    if (typeof config.httpAgentOptions === "function") return config.httpAgentOptions;
    let legacy = config.httpAgentOptions;
    if (config.keepAlive != null)
      legacy = {
        keepAlive: config.keepAlive,
        ...legacy,
      };
    if (legacy != null) return index_node_http_1.httpAgentFactoryFromOptions(legacy);
    else return;
  }
  function convertLegacyHttpOptions(config, signalIdentifier, signalResourcePath, requiredHeaders) {
    if (config.metadata) api_1.diag.warn("Metadata cannot be set when using http");
    return otlp_node_http_configuration_1.mergeOtlpNodeHttpConfigurationWithDefaults(
      {
        url: config.url,
        headers: convert_legacy_http_options_1.convertLegacyHeaders(config),
        concurrencyLimit: config.concurrencyLimit,
        timeoutMillis: config.timeoutMillis,
        compression: config.compression,
        agentFactory: convertLegacyAgentOptions(config),
        userAgent: config.userAgent,
      },
      otlp_node_http_env_configuration_1.getNodeHttpConfigurationFromEnvironment(
        signalIdentifier,
        signalResourcePath,
      ),
      otlp_node_http_configuration_1.getNodeHttpConfigurationDefaults(requiredHeaders, signalResourcePath),
    );
  }
  cjsExports.convertLegacyHttpOptions = convertLegacyHttpOptions;
});
export { require_convert_legacy_node_http_options };

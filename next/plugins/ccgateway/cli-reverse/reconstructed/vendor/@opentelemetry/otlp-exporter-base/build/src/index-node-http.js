/**
 * @opentelemetry/otlp-exporter-base/build/src/index-node-http.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_otlp_node_http_configuration } from "./configuration/otlp-node-http-configuration.js";
import { require_otlp_http_export_delegate } from "./otlp-http-export-delegate.js";
import { require_shared_env_configuration } from "./configuration/shared-env-configuration.js";
import { require_convert_legacy_node_http_options } from "./configuration/convert-legacy-node-http-options.js";

//@ chunk-vxhm2nqe.js:265981-266763 cjs-fingerprint
var require_index_node_http = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.convertLegacyHttpOptions =
    cjsExports.getSharedConfigurationFromEnvironment =
    cjsExports.createOtlpHttpExportDelegate =
    cjsExports.httpAgentFactoryFromOptions =
      undefined;
  var otlp_node_http_configuration_1 = require_otlp_node_http_configuration();
  Object.defineProperty(cjsExports, "httpAgentFactoryFromOptions", {
    enumerable: true,
    get: function () {
      return otlp_node_http_configuration_1.httpAgentFactoryFromOptions;
    },
  });
  var otlp_http_export_delegate_1 = require_otlp_http_export_delegate();
  Object.defineProperty(cjsExports, "createOtlpHttpExportDelegate", {
    enumerable: true,
    get: function () {
      return otlp_http_export_delegate_1.createOtlpHttpExportDelegate;
    },
  });
  var shared_env_configuration_1 = require_shared_env_configuration();
  Object.defineProperty(cjsExports, "getSharedConfigurationFromEnvironment", {
    enumerable: true,
    get: function () {
      return shared_env_configuration_1.getSharedConfigurationFromEnvironment;
    },
  });
  var convert_legacy_node_http_options_1 = require_convert_legacy_node_http_options();
  Object.defineProperty(cjsExports, "convertLegacyHttpOptions", {
    enumerable: true,
    get: function () {
      return convert_legacy_node_http_options_1.convertLegacyHttpOptions;
    },
  });
});
export { require_index_node_http };

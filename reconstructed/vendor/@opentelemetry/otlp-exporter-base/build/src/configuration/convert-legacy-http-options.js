/**
 * @opentelemetry/otlp-exporter-base/build/src/configuration/convert-legacy-http-options.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_shared_configuration } from "./shared-configuration.js";

//@ chunk-798ashq9.js:264901-265159 cjs-fingerprint
var require_convert_legacy_http_options = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.convertLegacyHeaders = undefined;
  var shared_configuration_1 = require_shared_configuration();
  function convertLegacyHeaders(config) {
    if (typeof config.headers === "function") return config.headers;
    return shared_configuration_1.wrapStaticHeadersInFunction(config.headers);
  }
  cjsExports.convertLegacyHeaders = convertLegacyHeaders;
});
export { require_convert_legacy_http_options };

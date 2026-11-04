/**
 * @opentelemetry/otlp-exporter-base/build/src/configuration/otlp-http-configuration.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_shared_configuration } from "./shared-configuration.js";
import { require_util } from "../util.js";

//@ chunk-798ashq9.js:256460-257357 cjs-fingerprint
var require_otlp_http_configuration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getHttpConfigurationDefaults = cjsExports.mergeOtlpHttpConfigurationWithDefaults = undefined;
  var shared_configuration_1 = require_shared_configuration();
  var util_1 = require_util();
  function mergeHeaders(userProvidedHeaders, fallbackHeaders, defaultHeaders) {
    return async () => {
      let requiredHeaders = {
        ...(await defaultHeaders()),
      };
      let headers = {};
      if (fallbackHeaders != null) Object.assign(headers, await fallbackHeaders());
      if (userProvidedHeaders != null)
        Object.assign(headers, util_1.validateAndNormalizeHeaders(await userProvidedHeaders()));
      return Object.assign(headers, requiredHeaders);
    };
  }
  function validateUserProvidedUrl(url) {
    if (url == null) return;
    try {
      let base = globalThis.location?.href;
      return new URL(url, base).href;
    } catch {
      throw Error(`Configuration: Could not parse user-provided export URL: '${url}'`);
    }
  }
  function mergeOtlpHttpConfigurationWithDefaults(
    userProvidedConfiguration,
    fallbackConfiguration,
    defaultConfiguration,
  ) {
    return {
      ...shared_configuration_1.mergeOtlpSharedConfigurationWithDefaults(
        userProvidedConfiguration,
        fallbackConfiguration,
        defaultConfiguration,
      ),
      headers: mergeHeaders(
        userProvidedConfiguration.headers,
        fallbackConfiguration.headers,
        defaultConfiguration.headers,
      ),
      url:
        validateUserProvidedUrl(userProvidedConfiguration.url) ??
        fallbackConfiguration.url ??
        defaultConfiguration.url,
    };
  }
  cjsExports.mergeOtlpHttpConfigurationWithDefaults = mergeOtlpHttpConfigurationWithDefaults;
  function getHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
      ...shared_configuration_1.getSharedConfigurationDefaults(),
      headers: async () => requiredHeaders,
      url: "http://localhost:4318/" + signalResourcePath,
    };
  }
  cjsExports.getHttpConfigurationDefaults = getHttpConfigurationDefaults;
});
export { require_otlp_http_configuration };

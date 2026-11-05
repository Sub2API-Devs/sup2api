/**
 * @opentelemetry/otlp-exporter-base/build/src/configuration/shared-configuration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:849-1722 cjs-fingerprint
var require_shared_configuration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSharedConfigurationDefaults =
    cjsExports.mergeOtlpSharedConfigurationWithDefaults =
    cjsExports.wrapStaticHeadersInFunction =
    cjsExports.validateTimeoutMillis =
      undefined;
  function validateTimeoutMillis(timeoutMillis) {
    if (Number.isFinite(timeoutMillis) && timeoutMillis > 0) return timeoutMillis;
    throw Error(
      `Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '${timeoutMillis}')`,
    );
  }
  cjsExports.validateTimeoutMillis = validateTimeoutMillis;
  function wrapStaticHeadersInFunction(headers) {
    if (headers == null) return;
    return async () => headers;
  }
  cjsExports.wrapStaticHeadersInFunction = wrapStaticHeadersInFunction;
  function mergeOtlpSharedConfigurationWithDefaults(
    userProvidedConfiguration,
    fallbackConfiguration,
    defaultConfiguration,
  ) {
    return {
      timeoutMillis: validateTimeoutMillis(
        userProvidedConfiguration.timeoutMillis ??
          fallbackConfiguration.timeoutMillis ??
          defaultConfiguration.timeoutMillis,
      ),
      concurrencyLimit:
        userProvidedConfiguration.concurrencyLimit ??
        fallbackConfiguration.concurrencyLimit ??
        defaultConfiguration.concurrencyLimit,
      compression:
        userProvidedConfiguration.compression ??
        fallbackConfiguration.compression ??
        defaultConfiguration.compression,
    };
  }
  cjsExports.mergeOtlpSharedConfigurationWithDefaults = mergeOtlpSharedConfigurationWithDefaults;
  function getSharedConfigurationDefaults() {
    return {
      timeoutMillis: 1e4,
      concurrencyLimit: 30,
      compression: "none",
    };
  }
  cjsExports.getSharedConfigurationDefaults = getSharedConfigurationDefaults;
});
export { require_shared_configuration };

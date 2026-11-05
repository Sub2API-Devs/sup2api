/**
 * @opentelemetry/otlp-exporter-base/build/src/configuration/shared-env-configuration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../../core/build/src/index.js";
import { require_api } from "../../../../api/build/src/index.js";

//@ chunk-vxhm2nqe.js:261878-262732 cjs-fingerprint
var require_shared_env_configuration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSharedConfigurationFromEnvironment = undefined;
  var core_1 = require_core();
  var api_1 = require_api();
  function parseAndValidateTimeoutFromEnv(timeoutEnvVar) {
    let envTimeout = core_1.getNumberFromEnv(timeoutEnvVar);
    if (envTimeout != null) {
      if (Number.isFinite(envTimeout) && envTimeout > 0) return envTimeout;
      api_1.diag.warn(
        `Configuration: ${timeoutEnvVar} is invalid, expected number greater than 0 (actual: ${envTimeout})`,
      );
    }
    return;
  }
  function getTimeoutFromEnv(signalIdentifier) {
    let specificTimeout = parseAndValidateTimeoutFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_TIMEOUT`);
    let nonSpecificTimeout = parseAndValidateTimeoutFromEnv("OTEL_EXPORTER_OTLP_TIMEOUT");
    return specificTimeout ?? nonSpecificTimeout;
  }
  function parseAndValidateCompressionFromEnv(compressionEnvVar) {
    let compression = core_1.getStringFromEnv(compressionEnvVar)?.trim();
    if (compression == null || compression === "none" || compression === "gzip") return compression;
    api_1.diag.warn(
      `Configuration: ${compressionEnvVar} is invalid, expected 'none' or 'gzip' (actual: '${compression}')`,
    );
    return;
  }
  function getCompressionFromEnv(signalIdentifier) {
    let specificCompression = parseAndValidateCompressionFromEnv(
      `OTEL_EXPORTER_OTLP_${signalIdentifier}_COMPRESSION`,
    );
    let nonSpecificCompression = parseAndValidateCompressionFromEnv("OTEL_EXPORTER_OTLP_COMPRESSION");
    return specificCompression ?? nonSpecificCompression;
  }
  function getSharedConfigurationFromEnvironment(signalIdentifier) {
    return {
      timeoutMillis: getTimeoutFromEnv(signalIdentifier),
      compression: getCompressionFromEnv(signalIdentifier),
    };
  }
  cjsExports.getSharedConfigurationFromEnvironment = getSharedConfigurationFromEnvironment;
});
export { require_shared_env_configuration };

/**
 * @opentelemetry/otlp-exporter-base/build/src/configuration/otlp-node-http-env-configuration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../../core/build/src/index.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_shared_env_configuration } from "./shared-env-configuration.js";
import { require_shared_configuration } from "./shared-configuration.js";
import { require_otlp_node_http_configuration } from "./otlp-node-http-configuration.js";

//@ chunk-vxhm2nqe.js:262732-264901 cjs-fingerprint
var require_otlp_node_http_env_configuration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getNodeHttpConfigurationFromEnvironment = undefined;
  var fs = importMetaRequire("fs");
  var path = importMetaRequire("path");
  var core_1 = require_core();
  var api_1 = require_api();
  var shared_env_configuration_1 = require_shared_env_configuration();
  var shared_configuration_1 = require_shared_configuration();
  var otlp_node_http_configuration_1 = require_otlp_node_http_configuration();
  function getStaticHeadersFromEnv(signalIdentifier) {
    let signalSpecificRawHeaders = core_1.getStringFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_HEADERS`);
    let nonSignalSpecificRawHeaders = core_1.getStringFromEnv("OTEL_EXPORTER_OTLP_HEADERS");
    let signalSpecificHeaders = core_1.parseKeyPairsIntoRecord(signalSpecificRawHeaders);
    let nonSignalSpecificHeaders = core_1.parseKeyPairsIntoRecord(nonSignalSpecificRawHeaders);
    if (Object.keys(signalSpecificHeaders).length === 0 && Object.keys(nonSignalSpecificHeaders).length === 0)
      return;
    return Object.assign(
      {},
      core_1.parseKeyPairsIntoRecord(nonSignalSpecificRawHeaders),
      core_1.parseKeyPairsIntoRecord(signalSpecificRawHeaders),
    );
  }
  function appendRootPathToUrlIfNeeded(url) {
    try {
      return new URL(url).toString();
    } catch {
      api_1.diag.warn(
        `Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`,
      );
      return;
    }
  }
  function appendResourcePathToUrl(url, path) {
    try {
      new URL(url);
    } catch {
      api_1.diag.warn(
        `Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`,
      );
      return;
    }
    if (!url.endsWith("/")) url = url + "/";
    url += path;
    try {
      new URL(url);
    } catch {
      api_1.diag.warn(
        `Configuration: Provided URL appended with '${path}' is not a valid URL, using 'undefined' instead of '${url}'`,
      );
      return;
    }
    return url;
  }
  function getNonSpecificUrlFromEnv(signalResourcePath) {
    let envUrl = core_1.getStringFromEnv("OTEL_EXPORTER_OTLP_ENDPOINT");
    if (envUrl === undefined) return;
    return appendResourcePathToUrl(envUrl, signalResourcePath);
  }
  function getSpecificUrlFromEnv(signalIdentifier) {
    let envUrl = core_1.getStringFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_ENDPOINT`);
    if (envUrl === undefined) return;
    return appendRootPathToUrlIfNeeded(envUrl);
  }
  function readFileFromEnv(signalSpecificEnvVar, nonSignalSpecificEnvVar, warningMessage) {
    let signalSpecificPath = core_1.getStringFromEnv(signalSpecificEnvVar);
    let nonSignalSpecificPath = core_1.getStringFromEnv(nonSignalSpecificEnvVar);
    let filePath = signalSpecificPath ?? nonSignalSpecificPath;
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
  function getNodeHttpConfigurationFromEnvironment(signalIdentifier, signalResourcePath) {
    return {
      ...shared_env_configuration_1.getSharedConfigurationFromEnvironment(signalIdentifier),
      url: getSpecificUrlFromEnv(signalIdentifier) ?? getNonSpecificUrlFromEnv(signalResourcePath),
      headers: shared_configuration_1.wrapStaticHeadersInFunction(getStaticHeadersFromEnv(signalIdentifier)),
      agentFactory: otlp_node_http_configuration_1.httpAgentFactoryFromOptions({
        keepAlive: true,
        ca: getRootCertificateFromEnv(signalIdentifier),
        cert: getClientCertificateFromEnv(signalIdentifier),
        key: getClientKeyFromEnv(signalIdentifier),
      }),
    };
  }
  cjsExports.getNodeHttpConfigurationFromEnvironment = getNodeHttpConfigurationFromEnvironment;
});
export { require_otlp_node_http_env_configuration };

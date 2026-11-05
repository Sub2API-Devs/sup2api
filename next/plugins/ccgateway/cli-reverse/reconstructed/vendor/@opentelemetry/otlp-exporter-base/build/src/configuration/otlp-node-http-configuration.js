/**
 * @opentelemetry/otlp-exporter-base/build/src/configuration/otlp-node-http-configuration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_otlp_http_configuration } from "./otlp-http-configuration.js";

//@ chunk-vxhm2nqe.js:257357-258116 cjs-fingerprint
var require_otlp_node_http_configuration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getNodeHttpConfigurationDefaults =
    cjsExports.mergeOtlpNodeHttpConfigurationWithDefaults =
    cjsExports.httpAgentFactoryFromOptions =
      undefined;
  var otlp_http_configuration_1 = require_otlp_http_configuration();
  function httpAgentFactoryFromOptions(options) {
    return async (protocol) => {
      let isInsecure = protocol === "http:";
      let httpModule = isInsecure ? import("http") : import("https");
      let { Agent } = await httpModule;
      if (isInsecure) {
        let { ca, cert, key, ...insecureOptions } = options;
        return new Agent(insecureOptions);
      }
      return new Agent(options);
    };
  }
  cjsExports.httpAgentFactoryFromOptions = httpAgentFactoryFromOptions;
  function mergeOtlpNodeHttpConfigurationWithDefaults(
    userProvidedConfiguration,
    fallbackConfiguration,
    defaultConfiguration,
  ) {
    return {
      ...otlp_http_configuration_1.mergeOtlpHttpConfigurationWithDefaults(
        userProvidedConfiguration,
        fallbackConfiguration,
        defaultConfiguration,
      ),
      agentFactory:
        userProvidedConfiguration.agentFactory ??
        fallbackConfiguration.agentFactory ??
        defaultConfiguration.agentFactory,
      userAgent: userProvidedConfiguration.userAgent,
    };
  }
  cjsExports.mergeOtlpNodeHttpConfigurationWithDefaults = mergeOtlpNodeHttpConfigurationWithDefaults;
  function getNodeHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
      ...otlp_http_configuration_1.getHttpConfigurationDefaults(requiredHeaders, signalResourcePath),
      agentFactory: httpAgentFactoryFromOptions({
        keepAlive: true,
      }),
    };
  }
  cjsExports.getNodeHttpConfigurationDefaults = getNodeHttpConfigurationDefaults;
});
export { require_otlp_node_http_configuration };

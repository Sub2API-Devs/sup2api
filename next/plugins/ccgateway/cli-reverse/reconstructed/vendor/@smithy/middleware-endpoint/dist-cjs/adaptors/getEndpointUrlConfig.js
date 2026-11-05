/**
 * @smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointUrlConfig.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/middleware-endpoint@4.3.0..4.3.15
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_shared_ini_file_loader } from "../../../shared-ini-file-loader/dist-cjs/index.js";

//@ chunk-3p78mpxm.js:115651-116280 cjs-fingerprint
var require_getEndpointUrlConfig = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getEndpointUrlConfig = undefined;
  var shared_ini_file_loader_1 = require_shared_ini_file_loader();
  var ENV_ENDPOINT_URL = "AWS_ENDPOINT_URL";
  var CONFIG_ENDPOINT_URL = "endpoint_url";
  var getEndpointUrlConfig = (serviceId) => ({
    environmentVariableSelector: (env) => {
      let serviceSuffixParts = serviceId.split(" ").map((w) => w.toUpperCase());
      let serviceEndpointUrl = env[[ENV_ENDPOINT_URL, ...serviceSuffixParts].join("_")];
      if (serviceEndpointUrl) return serviceEndpointUrl;
      let endpointUrl = env[ENV_ENDPOINT_URL];
      if (endpointUrl) return endpointUrl;
      return;
    },
    configFileSelector: (profile, config) => {
      if (config && profile.services) {
        let servicesSection =
          config[["services", profile.services].join(shared_ini_file_loader_1.CONFIG_PREFIX_SEPARATOR)];
        if (servicesSection) {
          let servicePrefixParts = serviceId.split(" ").map((w) => w.toLowerCase());
          let endpointUrl =
            servicesSection[
              [servicePrefixParts.join("_"), CONFIG_ENDPOINT_URL].join(
                shared_ini_file_loader_1.CONFIG_PREFIX_SEPARATOR,
              )
            ];
          if (endpointUrl) return endpointUrl;
        }
      }
      let endpointUrl = profile[CONFIG_ENDPOINT_URL];
      if (endpointUrl) return endpointUrl;
      return;
    },
    default: undefined,
  });
  cjsExports.getEndpointUrlConfig = getEndpointUrlConfig;
});
export { require_getEndpointUrlConfig };

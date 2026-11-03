/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/STSClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import {
  require_middleware_host_header,
  require_middleware_host_header_2,
} from "../../../../middleware-host-header/dist-cjs/index.js";
import { require_middleware_logger } from "../../../../middleware-logger/dist-cjs/index.js";
import { require_middleware_recursion_detection } from "../../../../middleware-recursion-detection/dist-cjs/index.js";
import { require_middleware_user_agent } from "../../../../middleware-user-agent/dist-cjs/index.js";
import { require_index_native } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_core } from "../../../../../@smithy/core/dist-cjs/index.js";
import { require_schema } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { require_middleware_endpoint } from "../../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { require_retry } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_httpAuthSchemeProvider } from "../../../../client-sts/dist-cjs/auth/httpAuthSchemeProvider.js";
import { require_EndpointParameters } from "./endpoint/EndpointParameters.js";
import { require_runtimeConfig } from "./runtimeConfig.js";
import { require_runtimeExtensions } from "./runtimeExtensions.js";

//@ chunk-a8ee6x44.js:11130-12668 cjs-require-graph
var require_STSClient = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.STSClient = cjsExports.__Client = undefined;
  var middleware_host_header_1 = require_middleware_host_header();
  var middleware_logger_1 = require_middleware_logger();
  var middleware_recursion_detection_1 = require_middleware_recursion_detection();
  var middleware_user_agent_1 = require_middleware_user_agent();
  var config_resolver_1 = require_index_native();
  var core_1 = require_core();
  var schema_1 = require_schema();
  var middleware_content_length_1 = require_middleware_host_header_2();
  var middleware_endpoint_1 = require_middleware_endpoint();
  var middleware_retry_1 = require_retry();
  var smithy_client_1 = require_client();
  Object.defineProperty(cjsExports, "__Client", {
    enumerable: true,
    get: function () {
      return smithy_client_1.Client;
    },
  });
  var httpAuthSchemeProvider_1 = require_httpAuthSchemeProvider();
  var EndpointParameters_1 = require_EndpointParameters();
  var runtimeConfig_1 = require_runtimeConfig();
  var runtimeExtensions_1 = require_runtimeExtensions();
  class STSClient extends smithy_client_1.Client {
    config;
    constructor(...[configuration]) {
      let _config_0 = runtimeConfig_1.getRuntimeConfig(configuration || {});
      super(_config_0);
      this.initConfig = _config_0;
      let _config_1 = EndpointParameters_1.resolveClientEndpointParameters(_config_0);
      let _config_2 = middleware_user_agent_1.resolveUserAgentConfig(_config_1);
      let _config_3 = middleware_retry_1.resolveRetryConfig(_config_2);
      let _config_4 = config_resolver_1.resolveRegionConfig(_config_3);
      let _config_5 = middleware_host_header_1.resolveHostHeaderConfig(_config_4);
      let _config_6 = middleware_endpoint_1.resolveEndpointConfig(_config_5);
      let _config_7 = httpAuthSchemeProvider_1.resolveHttpAuthSchemeConfig(_config_6);
      let _config_8 = runtimeExtensions_1.resolveRuntimeExtensions(
        _config_7,
        configuration?.extensions || [],
      );
      this.config = _config_8;
      this.middlewareStack.use(schema_1.getSchemaSerdePlugin(this.config));
      this.middlewareStack.use(middleware_user_agent_1.getUserAgentPlugin(this.config));
      this.middlewareStack.use(middleware_retry_1.getRetryPlugin(this.config));
      this.middlewareStack.use(middleware_content_length_1.getContentLengthPlugin(this.config));
      this.middlewareStack.use(middleware_host_header_1.getHostHeaderPlugin(this.config));
      this.middlewareStack.use(middleware_logger_1.getLoggerPlugin(this.config));
      this.middlewareStack.use(middleware_recursion_detection_1.getRecursionDetectionPlugin(this.config));
      this.middlewareStack.use(
        core_1.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider:
            httpAuthSchemeProvider_1.defaultSTSHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: async (config) =>
            new core_1.DefaultIdentityProviderConfig({
              "aws.auth#sigv4": config.credentials,
            }),
        }),
      );
      this.middlewareStack.use(core_1.getHttpSigningPlugin(this.config));
    }
    destroy() {
      super.destroy();
    }
  }
  cjsExports.STSClient = STSClient;
});
export { require_STSClient };

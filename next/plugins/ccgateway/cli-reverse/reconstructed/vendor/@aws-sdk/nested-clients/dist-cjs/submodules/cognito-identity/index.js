/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/cognito-identity/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-heg39xxp.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_region_config_resolver } from "../../../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import {
  import_client,
  import_middleware_user_agent,
  import_retry_2,
  import_index_native,
  import_middleware_host_header,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_schema,
  import_middleware_host_header_2,
  import_middleware_logger,
  import_middleware_recursion_detection,
  import_core,
  defaultSTSHttpAuthSchemeParametersProvider,
} from "../../../../client-sts/dist-cjs/auth/httpAuthSchemeProvider.js";
import { getRuntimeConfig_2 } from "../sts/runtimeConfig.js";
import { resolveClientEndpointParameters } from "../../../../client-sts/dist-cjs/index.js";
import { deferInit } from "../../../../../../runtime/deferred-init.js";

//@ chunk-heg39xxp.js:13020-13058 esm-layout
var import_region_config_resolver = __toESM(require_region_config_resolver());
var import_protocol_http = __toESM(require_protocol_http());
var import_client_5 = __toESM(require_client());
//@ chunk-heg39xxp.js:13058-13525 esm-fingerprint
var getHttpAuthExtensionConfiguration = (config) => {
  let {
    httpAuthSchemes: _httpAuthSchemes,
    httpAuthSchemeProvider: _httpAuthSchemeProvider,
    credentials: _credentials,
  } = config;
  return {
    setHttpAuthScheme(httpAuthScheme) {
      let index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
      if (index === -1) _httpAuthSchemes.push(httpAuthScheme);
      else _httpAuthSchemes.splice(index, 1, httpAuthScheme);
    },
    httpAuthSchemes() {
      return _httpAuthSchemes;
    },
    setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
      _httpAuthSchemeProvider = httpAuthSchemeProvider;
    },
    httpAuthSchemeProvider() {
      return _httpAuthSchemeProvider;
    },
    setCredentials(credentials) {
      _credentials = credentials;
    },
    credentials() {
      return _credentials;
    },
  };
};
var resolveHttpAuthRuntimeConfig = (config) => ({
  httpAuthSchemes: config.httpAuthSchemes(),
  httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
  credentials: config.credentials(),
});
//@ chunk-heg39xxp.js:13525-13863 esm-fingerprint
var resolveRuntimeExtensions = (runtimeConfig, extensions) => {
  let extensionConfiguration = Object.assign(
    import_region_config_resolver.getAwsRegionExtensionConfiguration(runtimeConfig),
    import_client_5.getDefaultExtensionConfiguration(runtimeConfig),
    import_protocol_http.getHttpHandlerExtensionConfiguration(runtimeConfig),
    getHttpAuthExtensionConfiguration(runtimeConfig),
  );
  extensions.forEach((extension) => extension.configure(extensionConfiguration));
  return Object.assign(
    runtimeConfig,
    import_region_config_resolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration),
    import_client_5.resolveDefaultRuntimeConfig(extensionConfiguration),
    import_protocol_http.resolveHttpHandlerRuntimeConfig(extensionConfiguration),
    resolveHttpAuthRuntimeConfig(extensionConfiguration),
  );
};
//@ chunk-heg39xxp.js:13863-14920 esm-fingerprint
let CognitoIdentityClient; // deferred: uses import_middleware_host_header (../../../../client-sts/dist-cjs/auth/httpAuthSchemeProvider.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-heg39xxp.js:13863", () => {
  CognitoIdentityClient = class CognitoIdentityClient extends import_client.Client {
    config;
    constructor(...[configuration]) {
      let _config_0 = getRuntimeConfig_2(configuration || {});
      super(_config_0);
      this.initConfig = _config_0;
      let _config_1 = resolveClientEndpointParameters(_config_0);
      let _config_2 = import_middleware_user_agent.resolveUserAgentConfig(_config_1);
      let _config_3 = import_retry_2.resolveRetryConfig(_config_2);
      let _config_4 = import_index_native.resolveRegionConfig(_config_3);
      let _config_5 = import_middleware_host_header.resolveHostHeaderConfig(_config_4);
      let _config_6 = import_middleware_endpoint.resolveEndpointConfig(_config_5);
      let _config_7 = resolveHttpAuthSchemeConfig(_config_6);
      let _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
      this.config = _config_8;
      this.middlewareStack.use(import_schema.getSchemaSerdePlugin(this.config));
      this.middlewareStack.use(import_middleware_user_agent.getUserAgentPlugin(this.config));
      this.middlewareStack.use(import_retry_2.getRetryPlugin(this.config));
      this.middlewareStack.use(import_middleware_host_header_2.getContentLengthPlugin(this.config));
      this.middlewareStack.use(import_middleware_host_header.getHostHeaderPlugin(this.config));
      this.middlewareStack.use(import_middleware_logger.getLoggerPlugin(this.config));
      this.middlewareStack.use(
        import_middleware_recursion_detection.getRecursionDetectionPlugin(this.config),
      );
      this.middlewareStack.use(
        import_core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultSTSHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: async (config) =>
            new import_core.DefaultIdentityProviderConfig({
              "aws.auth#sigv4": config.credentials,
            }),
        }),
      );
      this.middlewareStack.use(import_core.getHttpSigningPlugin(this.config));
    }
    destroy() {
      super.destroy();
    }
  };
});
export { CognitoIdentityClient };

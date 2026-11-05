/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso/index.js
 *
 * AWS SSO 客户端（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-tvcdn76c.js (18)
 * attribution: placement 3, esm-fingerprint 10, esm-layout 5
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../../../../core/dist-cjs/index.js";
import { require_util_user_agent_node } from "../../../../util-user-agent-node/dist-cjs/index.js";
import { require_index_native } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { hashModule, bodyLengthNodeModule } from "../../../../../unresolved-cjs/index.js";
import { require_retry } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import {
  require_node_config_provider,
  require_node_config_provider_2,
} from "../../../../../@smithy/node-config-provider/dist-cjs/index.js";
import { require_node_http_handler } from "../../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { require_index_browser as require_index_browser_2 } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { require_protocols } from "../../../../core/dist-cjs/submodules/protocols/index.js";
import { require_core } from "../../../../../@smithy/core/dist-cjs/index.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_url_parser } from "../../../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { require_util_endpoints } from "../../../../util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { defaultEndpointResolver } from "../signin/endpoint/endpointResolver.js";
import {
  defaultSSOHttpAuthSchemeProvider,
  import_client_2,
  import_middleware_user_agent,
  import_retry_2,
  import_index_native_2,
  import_middleware_host_header,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_schema,
  import_middleware_host_header_2,
  import_middleware_logger,
  import_middleware_recursion_detection,
  import_core_3,
  defaultSSOHttpAuthSchemeParametersProvider,
} from "../../../../client-sso/dist-cjs/auth/httpAuthSchemeProvider.js";
import { packageJson } from "../../../../client-sso/package.json.js";
import { require_region_config_resolver } from "../../../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";
import { resolveClientEndpointParameters } from "../../../../client-sso/dist-cjs/index.js";
import { require_middleware_endpoint } from "../../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { require_schema } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { deferInit } from "../../../../../../runtime/deferred-init.js";

//@ chunk-tvcdn76c.js:4847-4957 placement
var import_core_2 = __toESM(require_core_2());
var import_util_user_agent_node = __toESM(require_util_user_agent_node());
var import_index_native = __toESM(require_index_native());
var import_core_2_3 = __toESM(hashModule());
var import_retry = __toESM(require_retry());
var import_node_config_provider = __toESM(require_node_config_provider());
var import_node_http_handler = __toESM(require_node_http_handler());
var import_util_body_length_node = __toESM(bodyLengthNodeModule());
var import_index_browser_2 = __toESM(require_index_browser_2());
//@ chunk-tvcdn76c.js:4957-5044 placement
var import_core_2_2 = __toESM(require_core_2());
var import_protocols = __toESM(require_protocols());
var import_core = __toESM(require_core());
var import_client = __toESM(require_client());
var import_url_parser = __toESM(require_url_parser());
var import_util_retry = __toESM(base64Module());
var import_util_utf8 = __toESM(require_util_utf8());
//@ chunk-tvcdn76c.js:5044-5071 placement
var import_util_endpoints = __toESM(require_util_endpoints());
var import_index_browser = __toESM(require_index_browser());
//@ chunk-tvcdn76c.js:7616-7669 esm-fingerprint
// deferred: uses import_util_endpoints of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tvcdn76c.js:7616", () => {
  import_index_browser.customEndpointFunctions.aws = import_util_endpoints.awsEndpointFunctions;
});
//@ chunk-tvcdn76c.js:7669-8528 esm-fingerprint
var getRuntimeConfig$1 = (config) => ({
  apiVersion: "2019-06-10",
  base64Decoder: config?.base64Decoder ?? import_util_retry.fromBase64,
  base64Encoder: config?.base64Encoder ?? import_util_retry.toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
  extensions: config?.extensions ?? [],
  httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOHttpAuthSchemeProvider,
  httpAuthSchemes: config?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
      signer: new import_core_2_2.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#noAuth",
      identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
      signer: new import_core.NoAuthSigner(),
    },
  ],
  logger: config?.logger ?? new import_client.NoOpLogger(),
  protocol:
    config?.protocol ??
    new import_protocols.AwsRestJsonProtocol({
      defaultNamespace: "com.amazonaws.sso",
    }),
  serviceId: config?.serviceId ?? "SSO",
  urlParser: config?.urlParser ?? import_url_parser.parseUrl,
  utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
  utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8,
});
//@ chunk-tvcdn76c.js:8528-9926 esm-layout
var import_client_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_node_config_provider_2;
var import_client_4;
var getRuntimeConfig;
deferInit("chunk-tvcdn76c.js:8528", () => {
  import_client_3 = __toESM(require_client());
  import_node_config_provider_2 = __toESM(require_node_config_provider_2());
  import_client_4 = __toESM(require_client());
  getRuntimeConfig = (config$1) => {
    import_client_4.emitWarningIfUnsupportedVersion(process.version);
    let defaultsMode = import_node_config_provider_2.resolveDefaultsModeConfig(config$1);
    let defaultConfigProvider = () => defaultsMode().then(import_client_3.loadConfigsForDefaultMode);
    let clientSharedValues = getRuntimeConfig$1(config$1);
    import_core_2.emitWarningIfUnsupportedVersion(process.version);
    let loaderConfig = {
      profile: config$1?.profile,
      logger: clientSharedValues.logger,
    };
    return {
      ...clientSharedValues,
      ...config$1,
      runtime: "node",
      defaultsMode,
      authSchemePreference:
        config$1?.authSchemePreference ??
        import_node_config_provider.loadConfig(
          import_core_2.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
          loaderConfig,
        ),
      bodyLengthChecker: config$1?.bodyLengthChecker ?? import_util_body_length_node.calculateBodyLength,
      defaultUserAgentProvider:
        config$1?.defaultUserAgentProvider ??
        import_util_user_agent_node.createDefaultUserAgentProvider({
          serviceId: clientSharedValues.serviceId,
          clientVersion: packageJson.version,
        }),
      maxAttempts:
        config$1?.maxAttempts ??
        import_node_config_provider.loadConfig(import_retry.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config$1),
      region:
        config$1?.region ??
        import_node_config_provider.loadConfig(import_index_native.NODE_REGION_CONFIG_OPTIONS, {
          ...import_index_native.NODE_REGION_CONFIG_FILE_OPTIONS,
          ...loaderConfig,
        }),
      requestHandler: import_node_http_handler.NodeHttpHandler.create(
        config$1?.requestHandler ?? defaultConfigProvider,
      ),
      retryMode:
        config$1?.retryMode ??
        import_node_config_provider.loadConfig(
          {
            ...import_retry.NODE_RETRY_MODE_CONFIG_OPTIONS,
            default: async () =>
              (await defaultConfigProvider()).retryMode || import_index_browser_2.DEFAULT_RETRY_MODE,
          },
          config$1,
        ),
      sha256: config$1?.sha256 ?? import_core_2_3.Hash.bind(null, "sha256"),
      streamCollector: config$1?.streamCollector ?? import_node_http_handler.streamCollector,
      useDualstackEndpoint:
        config$1?.useDualstackEndpoint ??
        import_node_config_provider.loadConfig(
          import_index_native.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS,
          loaderConfig,
        ),
      useFipsEndpoint:
        config$1?.useFipsEndpoint ??
        import_node_config_provider.loadConfig(
          import_index_native.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS,
          loaderConfig,
        ),
      userAgentAppId:
        config$1?.userAgentAppId ??
        import_node_config_provider.loadConfig(
          import_util_user_agent_node.NODE_APP_ID_CONFIG_OPTIONS,
          loaderConfig,
        ),
    };
  };
});
//@ chunk-tvcdn76c.js:9926-9964 esm-layout
var import_region_config_resolver; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_protocol_http;
var import_client_5;
deferInit("chunk-tvcdn76c.js:9926", () => {
  import_region_config_resolver = __toESM(require_region_config_resolver());
  import_protocol_http = __toESM(require_protocol_http());
  import_client_5 = __toESM(require_client());
});
//@ chunk-tvcdn76c.js:9964-10431 esm-fingerprint
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
//@ chunk-tvcdn76c.js:10431-10769 esm-fingerprint
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
//@ chunk-tvcdn76c.js:10769-11828 esm-fingerprint
let SSOClient; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tvcdn76c.js:10769", () => {
  SSOClient = class SSOClient extends import_client_2.Client {
    config;
    constructor(...[configuration]) {
      let _config_0 = getRuntimeConfig(configuration || {});
      super(_config_0);
      this.initConfig = _config_0;
      let _config_1 = resolveClientEndpointParameters(_config_0);
      let _config_2 = import_middleware_user_agent.resolveUserAgentConfig(_config_1);
      let _config_3 = import_retry_2.resolveRetryConfig(_config_2);
      let _config_4 = import_index_native_2.resolveRegionConfig(_config_3);
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
        import_core_3.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultSSOHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: async (config) =>
            new import_core_3.DefaultIdentityProviderConfig({
              "aws.auth#sigv4": config.credentials,
            }),
        }),
      );
      this.middlewareStack.use(import_core_3.getHttpSigningPlugin(this.config));
    }
    destroy() {
      super.destroy();
    }
  };
});
//@ chunk-tvcdn76c.js:11828-11856 esm-layout
var import_middleware_endpoint_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_client_6;
deferInit("chunk-tvcdn76c.js:11828", () => {
  import_middleware_endpoint_2 = __toESM(require_middleware_endpoint());
  import_client_6 = __toESM(require_client());
});
//@ chunk-tvcdn76c.js:11856-11871 esm-layout
var import_schema_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tvcdn76c.js:11856", () => {
  import_schema_2 = __toESM(require_schema());
});
//@ chunk-tvcdn76c.js:11871-11887 esm-layout
var import_client_7; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tvcdn76c.js:11871", () => {
  import_client_7 = __toESM(require_client());
});
//@ chunk-tvcdn76c.js:11887-11988 esm-fingerprint
let SSOServiceException; // deferred: uses import_client_7 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tvcdn76c.js:11887", () => {
  SSOServiceException = class SSOServiceException extends import_client_7.ServiceException {
    constructor(options) {
      super(options);
      Object.setPrototypeOf(this, SSOServiceException.prototype);
    }
  };
});
//@ chunk-tvcdn76c.js:11988-12170 esm-fingerprint
let InvalidRequestException_2; // deferred: uses SSOServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tvcdn76c.js:11988", () => {
  InvalidRequestException_2 = class InvalidRequestException_2 extends SSOServiceException {
    name = "InvalidRequestException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "InvalidRequestException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, InvalidRequestException_2.prototype);
    }
  };
});
//@ chunk-tvcdn76c.js:12170-12356 esm-fingerprint
let ResourceNotFoundException_2; // deferred: uses SSOServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tvcdn76c.js:12170", () => {
  ResourceNotFoundException_2 = class ResourceNotFoundException_2 extends SSOServiceException {
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ResourceNotFoundException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ResourceNotFoundException_2.prototype);
    }
  };
});
//@ chunk-tvcdn76c.js:12356-12540 esm-fingerprint
let TooManyRequestsException_2; // deferred: uses SSOServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tvcdn76c.js:12356", () => {
  TooManyRequestsException_2 = class TooManyRequestsException_2 extends SSOServiceException {
    name = "TooManyRequestsException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "TooManyRequestsException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, TooManyRequestsException_2.prototype);
    }
  };
});
//@ chunk-tvcdn76c.js:12540-12718 esm-fingerprint
let UnauthorizedException_2; // deferred: uses SSOServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tvcdn76c.js:12540", () => {
  UnauthorizedException_2 = class UnauthorizedException_2 extends SSOServiceException {
    name = "UnauthorizedException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "UnauthorizedException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, UnauthorizedException_2.prototype);
    }
  };
});
export {
  import_index_browser,
  import_schema_2,
  InvalidRequestException_2,
  ResourceNotFoundException_2,
  TooManyRequestsException_2,
  UnauthorizedException_2,
  SSOServiceException,
  import_client_6,
  import_middleware_endpoint_2,
  SSOClient,
};

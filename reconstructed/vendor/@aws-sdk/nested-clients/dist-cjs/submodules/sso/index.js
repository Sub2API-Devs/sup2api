/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso/index.js
 *
 * AWS SSO 客户端（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-kejz1rpb.js (18)
 * attribution: placement 3, esm-fingerprint 10, esm-layout 5
 */
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { require_core as require_core_2 } from "../../../../core/dist-cjs/index.js";
import { require_util_user_agent_node } from "../../../../util-user-agent-node/dist-cjs/index.js";
import { require_index_native } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { Nme, $me } from "../../../../../unresolved-cjs/index.js";
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
  import_client,
  import_middleware_user_agent,
  import_retry,
  import_index_native,
  import_middleware_host_header,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_schema,
  import_middleware_host_header_2,
  import_middleware_logger,
  import_middleware_recursion_detection,
  import_core,
  defaultSSOHttpAuthSchemeParametersProvider,
} from "../../../../client-sso/dist-cjs/auth/httpAuthSchemeProvider.js";
import { U } from "../../../../client-sso/package.json.js";
import { require_region_config_resolver } from "../../../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";
import { resolveClientEndpointParameters } from "../../../../client-sso/dist-cjs/index.js";
import { require_middleware_endpoint } from "../../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { require_schema } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";

//@ chunk-kejz1rpb.js:4847-4957 placement
var g = Re(require_core_2());
var R = Re(require_util_user_agent_node());
var c = Re(require_index_native());
var ie = Re(Nme());
var y = Re(require_retry());
var a = Re(require_node_config_provider());
var S = Re(require_node_http_handler());
var ae = Re($me());
var ce = Re(require_index_browser_2());
//@ chunk-kejz1rpb.js:4957-5044 placement
var ee = Re(require_core_2());
var te = Re(require_protocols());
var oe = Re(require_core());
var se = Re(require_client());
var re = Re(require_url_parser());
var _ = Re(base64Module());
var f = Re(require_util_utf8());
//@ chunk-kejz1rpb.js:5044-5071 placement
var X = Re(require_util_endpoints());
var p = Re(require_index_browser());
//@ chunk-kejz1rpb.js:7616-7669 esm-fingerprint
p.customEndpointFunctions.aws = X.awsEndpointFunctions;
//@ chunk-kejz1rpb.js:7669-8528 esm-fingerprint
var getRuntimeConfig$1 = (config) => ({
  apiVersion: "2019-06-10",
  base64Decoder: config?.base64Decoder ?? _.fromBase64,
  base64Encoder: config?.base64Encoder ?? _.toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
  extensions: config?.extensions ?? [],
  httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOHttpAuthSchemeProvider,
  httpAuthSchemes: config?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
      signer: new ee.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#noAuth",
      identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
      signer: new oe.NoAuthSigner(),
    },
  ],
  logger: config?.logger ?? new se.NoOpLogger(),
  protocol:
    config?.protocol ??
    new te.AwsRestJsonProtocol({
      defaultNamespace: "com.amazonaws.sso",
    }),
  serviceId: config?.serviceId ?? "SSO",
  urlParser: config?.urlParser ?? re.parseUrl,
  utf8Decoder: config?.utf8Decoder ?? f.fromUtf8,
  utf8Encoder: config?.utf8Encoder ?? f.toUtf8,
});
//@ chunk-kejz1rpb.js:8528-9926 esm-layout
var import_client_2 = Re(require_client());
var import_node_config_provider = Re(require_node_config_provider_2());
var import_client_3 = Re(require_client());
var getRuntimeConfig = (config$1) => {
  import_client_3.emitWarningIfUnsupportedVersion(process.version);
  let defaultsMode = import_node_config_provider.resolveDefaultsModeConfig(config$1);
  let defaultConfigProvider = () => defaultsMode().then(import_client_2.loadConfigsForDefaultMode);
  let clientSharedValues = getRuntimeConfig$1(config$1);
  g.emitWarningIfUnsupportedVersion(process.version);
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
      config$1?.authSchemePreference ?? a.loadConfig(g.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
    bodyLengthChecker: config$1?.bodyLengthChecker ?? ae.calculateBodyLength,
    defaultUserAgentProvider:
      config$1?.defaultUserAgentProvider ??
      R.createDefaultUserAgentProvider({
        serviceId: clientSharedValues.serviceId,
        clientVersion: U.version,
      }),
    maxAttempts: config$1?.maxAttempts ?? a.loadConfig(y.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config$1),
    region:
      config$1?.region ??
      a.loadConfig(c.NODE_REGION_CONFIG_OPTIONS, {
        ...c.NODE_REGION_CONFIG_FILE_OPTIONS,
        ...loaderConfig,
      }),
    requestHandler: S.NodeHttpHandler.create(config$1?.requestHandler ?? defaultConfigProvider),
    retryMode:
      config$1?.retryMode ??
      a.loadConfig(
        {
          ...y.NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: async () => (await defaultConfigProvider()).retryMode || ce.DEFAULT_RETRY_MODE,
        },
        config$1,
      ),
    sha256: config$1?.sha256 ?? ie.Hash.bind(null, "sha256"),
    streamCollector: config$1?.streamCollector ?? S.streamCollector,
    useDualstackEndpoint:
      config$1?.useDualstackEndpoint ??
      a.loadConfig(c.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    useFipsEndpoint:
      config$1?.useFipsEndpoint ?? a.loadConfig(c.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    userAgentAppId: config$1?.userAgentAppId ?? a.loadConfig(R.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig),
  };
};
//@ chunk-kejz1rpb.js:9926-9964 esm-layout
var import_region_config_resolver = Re(require_region_config_resolver());
var import_protocol_http = Re(require_protocol_http());
var import_client_4 = Re(require_client());
//@ chunk-kejz1rpb.js:9964-10431 esm-fingerprint
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
//@ chunk-kejz1rpb.js:10431-10769 esm-fingerprint
var resolveRuntimeExtensions = (runtimeConfig, extensions) => {
  let extensionConfiguration = Object.assign(
    import_region_config_resolver.getAwsRegionExtensionConfiguration(runtimeConfig),
    import_client_4.getDefaultExtensionConfiguration(runtimeConfig),
    import_protocol_http.getHttpHandlerExtensionConfiguration(runtimeConfig),
    getHttpAuthExtensionConfiguration(runtimeConfig),
  );
  extensions.forEach((extension) => extension.configure(extensionConfiguration));
  return Object.assign(
    runtimeConfig,
    import_region_config_resolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration),
    import_client_4.resolveDefaultRuntimeConfig(extensionConfiguration),
    import_protocol_http.resolveHttpHandlerRuntimeConfig(extensionConfiguration),
    resolveHttpAuthRuntimeConfig(extensionConfiguration),
  );
};
//@ chunk-kejz1rpb.js:10769-11828 esm-fingerprint
class SSOClient extends import_client.Client {
  config;
  constructor(...[configuration]) {
    let _config_0 = getRuntimeConfig(configuration || {});
    super(_config_0);
    this.initConfig = _config_0;
    let _config_1 = resolveClientEndpointParameters(_config_0);
    let _config_2 = import_middleware_user_agent.resolveUserAgentConfig(_config_1);
    let _config_3 = import_retry.resolveRetryConfig(_config_2);
    let _config_4 = import_index_native.resolveRegionConfig(_config_3);
    let _config_5 = import_middleware_host_header.resolveHostHeaderConfig(_config_4);
    let _config_6 = import_middleware_endpoint.resolveEndpointConfig(_config_5);
    let _config_7 = resolveHttpAuthSchemeConfig(_config_6);
    let _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
    this.config = _config_8;
    this.middlewareStack.use(import_schema.getSchemaSerdePlugin(this.config));
    this.middlewareStack.use(import_middleware_user_agent.getUserAgentPlugin(this.config));
    this.middlewareStack.use(import_retry.getRetryPlugin(this.config));
    this.middlewareStack.use(import_middleware_host_header_2.getContentLengthPlugin(this.config));
    this.middlewareStack.use(import_middleware_host_header.getHostHeaderPlugin(this.config));
    this.middlewareStack.use(import_middleware_logger.getLoggerPlugin(this.config));
    this.middlewareStack.use(import_middleware_recursion_detection.getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(
      import_core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
        httpAuthSchemeParametersProvider: defaultSSOHttpAuthSchemeParametersProvider,
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
}
//@ chunk-kejz1rpb.js:11828-11856 esm-layout
var import_middleware_endpoint_2 = Re(require_middleware_endpoint());
var import_client_5 = Re(require_client());
//@ chunk-kejz1rpb.js:11856-11871 esm-layout
var import_schema_2 = Re(require_schema());
//@ chunk-kejz1rpb.js:11871-11887 esm-layout
var import_client_6 = Re(require_client());
//@ chunk-kejz1rpb.js:11887-11988 esm-fingerprint
class SSOServiceException extends import_client_6.ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SSOServiceException.prototype);
  }
}
//@ chunk-kejz1rpb.js:11988-12170 esm-fingerprint
class InvalidRequestException extends SSOServiceException {
  name = "InvalidRequestException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, InvalidRequestException.prototype);
  }
}
//@ chunk-kejz1rpb.js:12170-12356 esm-fingerprint
class ResourceNotFoundException extends SSOServiceException {
  name = "ResourceNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
  }
}
//@ chunk-kejz1rpb.js:12356-12540 esm-fingerprint
class TooManyRequestsException extends SSOServiceException {
  name = "TooManyRequestsException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "TooManyRequestsException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, TooManyRequestsException.prototype);
  }
}
//@ chunk-kejz1rpb.js:12540-12718 esm-fingerprint
class UnauthorizedException extends SSOServiceException {
  name = "UnauthorizedException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "UnauthorizedException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
}
export {
  import_schema_2,
  InvalidRequestException,
  ResourceNotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
  SSOServiceException,
  import_client_5,
  import_middleware_endpoint_2,
  p,
};

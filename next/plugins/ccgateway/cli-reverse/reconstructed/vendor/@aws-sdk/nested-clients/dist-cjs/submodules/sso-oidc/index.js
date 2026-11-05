/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-67qh5zdp.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
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
import { require_httpAuthSchemeProvider } from "./auth/httpAuthSchemeProvider.js";
import { require_runtimeConfig } from "./runtimeConfig.js";
import { require_region_config_resolver } from "../../../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-67qh5zdp.js:7138-16157 cjs-fingerprint
var require_sso_oidc = __commonJS(function (cjsExports) {
  var middlewareHostHeader = require_middleware_host_header();
  var middlewareLogger = require_middleware_logger();
  var middlewareRecursionDetection = require_middleware_recursion_detection();
  var middlewareUserAgent = require_middleware_user_agent();
  var configResolver = require_index_native();
  var core = require_core();
  var schema = require_schema();
  var middlewareContentLength = require_middleware_host_header_2();
  var middlewareEndpoint = require_middleware_endpoint();
  var middlewareRetry = require_retry();
  var smithyClient = require_client();
  var httpAuthSchemeProvider = require_httpAuthSchemeProvider();
  var runtimeConfig = require_runtimeConfig();
  var regionConfigResolver = require_region_config_resolver();
  var protocolHttp = require_protocol_http();
  var resolveClientEndpointParameters = (options) =>
    Object.assign(options, {
      useDualstackEndpoint: options.useDualstackEndpoint ?? false,
      useFipsEndpoint: options.useFipsEndpoint ?? false,
      defaultSigningName: "sso-oauth",
    });
  var commonParams = {
    UseFIPS: {
      type: "builtInParams",
      name: "useFipsEndpoint",
    },
    Endpoint: {
      type: "builtInParams",
      name: "endpoint",
    },
    Region: {
      type: "builtInParams",
      name: "region",
    },
    UseDualStack: {
      type: "builtInParams",
      name: "useDualstackEndpoint",
    },
  };
  var getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    let {
      httpAuthSchemes: _httpAuthSchemes,
      httpAuthSchemeProvider: _httpAuthSchemeProvider,
      credentials: _credentials,
    } = runtimeConfig;
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
  var resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    let extensionConfiguration = Object.assign(
      regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig),
      smithyClient.getDefaultExtensionConfiguration(runtimeConfig),
      protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig),
      getHttpAuthExtensionConfiguration(runtimeConfig),
    );
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(
      runtimeConfig,
      regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration),
      smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration),
      protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration),
      resolveHttpAuthRuntimeConfig(extensionConfiguration),
    );
  };
  class SSOOIDCClient extends smithyClient.Client {
    config;
    constructor(...[configuration]) {
      let _config_0 = runtimeConfig.getRuntimeConfig(configuration || {});
      super(_config_0);
      this.initConfig = _config_0;
      let _config_1 = resolveClientEndpointParameters(_config_0);
      let _config_2 = middlewareUserAgent.resolveUserAgentConfig(_config_1);
      let _config_3 = middlewareRetry.resolveRetryConfig(_config_2);
      let _config_4 = configResolver.resolveRegionConfig(_config_3);
      let _config_5 = middlewareHostHeader.resolveHostHeaderConfig(_config_4);
      let _config_6 = middlewareEndpoint.resolveEndpointConfig(_config_5);
      let _config_7 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_6);
      let _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
      this.config = _config_8;
      this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
      this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
      this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
      this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
      this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
      this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
      this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
      this.middlewareStack.use(
        core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider:
            httpAuthSchemeProvider.defaultSSOOIDCHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: async (config) =>
            new core.DefaultIdentityProviderConfig({
              "aws.auth#sigv4": config.credentials,
            }),
        }),
      );
      this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
      super.destroy();
    }
  }
  var SSOOIDCServiceException$1 = class SSOOIDCServiceException extends smithyClient.ServiceException {
    constructor(options) {
      super(options);
      Object.setPrototypeOf(this, SSOOIDCServiceException.prototype);
    }
  };
  var AccessDeniedException$1 = class AccessDeniedException extends SSOOIDCServiceException$1 {
    name = "AccessDeniedException";
    $fault = "client";
    error;
    reason;
    error_description;
    constructor(opts) {
      super({
        name: "AccessDeniedException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, AccessDeniedException.prototype);
      this.error = opts.error;
      this.reason = opts.reason;
      this.error_description = opts.error_description;
    }
  };
  var AuthorizationPendingException$1 = class AuthorizationPendingException extends SSOOIDCServiceException$1 {
    name = "AuthorizationPendingException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "AuthorizationPendingException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, AuthorizationPendingException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var ExpiredTokenException$1 = class ExpiredTokenException extends SSOOIDCServiceException$1 {
    name = "ExpiredTokenException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "ExpiredTokenException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ExpiredTokenException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var InternalServerException$1 = class InternalServerException extends SSOOIDCServiceException$1 {
    name = "InternalServerException";
    $fault = "server";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "InternalServerException",
        $fault: "server",
        ...opts,
      });
      Object.setPrototypeOf(this, InternalServerException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var InvalidClientException$1 = class InvalidClientException extends SSOOIDCServiceException$1 {
    name = "InvalidClientException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "InvalidClientException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, InvalidClientException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var InvalidGrantException$1 = class InvalidGrantException extends SSOOIDCServiceException$1 {
    name = "InvalidGrantException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "InvalidGrantException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, InvalidGrantException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var InvalidRequestException$1 = class InvalidRequestException extends SSOOIDCServiceException$1 {
    name = "InvalidRequestException";
    $fault = "client";
    error;
    reason;
    error_description;
    constructor(opts) {
      super({
        name: "InvalidRequestException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, InvalidRequestException.prototype);
      this.error = opts.error;
      this.reason = opts.reason;
      this.error_description = opts.error_description;
    }
  };
  var InvalidScopeException$1 = class InvalidScopeException extends SSOOIDCServiceException$1 {
    name = "InvalidScopeException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "InvalidScopeException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, InvalidScopeException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var SlowDownException$1 = class SlowDownException extends SSOOIDCServiceException$1 {
    name = "SlowDownException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "SlowDownException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, SlowDownException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var UnauthorizedClientException$1 = class UnauthorizedClientException extends SSOOIDCServiceException$1 {
    name = "UnauthorizedClientException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "UnauthorizedClientException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, UnauthorizedClientException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var UnsupportedGrantTypeException$1 = class UnsupportedGrantTypeException extends SSOOIDCServiceException$1 {
    name = "UnsupportedGrantTypeException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
      super({
        name: "UnsupportedGrantTypeException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, UnsupportedGrantTypeException.prototype);
      this.error = opts.error;
      this.error_description = opts.error_description;
    }
  };
  var _ADE = "AccessDeniedException";
  var _APE = "AuthorizationPendingException";
  var _AT = "AccessToken";
  var _CS = "ClientSecret";
  var _CT = "CreateToken";
  var _CTR = "CreateTokenRequest";
  var _CTRr = "CreateTokenResponse";
  var _CV = "CodeVerifier";
  var _ETE = "ExpiredTokenException";
  var _ICE = "InvalidClientException";
  var _IGE = "InvalidGrantException";
  var _IRE = "InvalidRequestException";
  var _ISE = "InternalServerException";
  var _ISEn = "InvalidScopeException";
  var _IT = "IdToken";
  var _RT = "RefreshToken";
  var _SDE = "SlowDownException";
  var _UCE = "UnauthorizedClientException";
  var _UGTE = "UnsupportedGrantTypeException";
  var _aT = "accessToken";
  var _c = "client";
  var _cI = "clientId";
  var _cS = "clientSecret";
  var _cV = "codeVerifier";
  var _co = "code";
  var _dC = "deviceCode";
  var _e = "error";
  var _eI = "expiresIn";
  var _ed = "error_description";
  var _gT = "grantType";
  var _h = "http";
  var _hE = "httpError";
  var _iT = "idToken";
  var _r_2 = "reason";
  var _rT = "refreshToken";
  var _rU = "redirectUri";
  var _s = "scope";
  var _se = "server";
  var _sm = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc";
  var _tT = "tokenType";
  var n0 = "com.amazonaws.ssooidc";
  var AccessToken = [0, n0, _AT, 8, 0];
  var ClientSecret = [0, n0, _CS, 8, 0];
  var CodeVerifier = [0, n0, _CV, 8, 0];
  var IdToken = [0, n0, _IT, 8, 0];
  var RefreshToken = [0, n0, _RT, 8, 0];
  var AccessDeniedException = [
    -3,
    n0,
    _ADE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _r_2, _ed],
    [0, 0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(AccessDeniedException, AccessDeniedException$1);
  var AuthorizationPendingException = [
    -3,
    n0,
    _APE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(AuthorizationPendingException, AuthorizationPendingException$1);
  var CreateTokenRequest = [
    3,
    n0,
    _CTR,
    0,
    [_cI, _cS, _gT, _dC, _co, _rT, _s, _rU, _cV],
    [0, [() => ClientSecret, 0], 0, 0, 0, [() => RefreshToken, 0], 64, 0, [() => CodeVerifier, 0]],
  ];
  var CreateTokenResponse = [
    3,
    n0,
    _CTRr,
    0,
    [_aT, _tT, _eI, _rT, _iT],
    [[() => AccessToken, 0], 0, 1, [() => RefreshToken, 0], [() => IdToken, 0]],
  ];
  var ExpiredTokenException = [
    -3,
    n0,
    _ETE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(ExpiredTokenException, ExpiredTokenException$1);
  var InternalServerException = [
    -3,
    n0,
    _ISE,
    {
      [_e]: _se,
      [_hE]: 500,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(InternalServerException, InternalServerException$1);
  var InvalidClientException = [
    -3,
    n0,
    _ICE,
    {
      [_e]: _c,
      [_hE]: 401,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(InvalidClientException, InvalidClientException$1);
  var InvalidGrantException = [
    -3,
    n0,
    _IGE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(InvalidGrantException, InvalidGrantException$1);
  var InvalidRequestException = [
    -3,
    n0,
    _IRE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _r_2, _ed],
    [0, 0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(InvalidRequestException, InvalidRequestException$1);
  var InvalidScopeException = [
    -3,
    n0,
    _ISEn,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(InvalidScopeException, InvalidScopeException$1);
  var SlowDownException = [
    -3,
    n0,
    _SDE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(SlowDownException, SlowDownException$1);
  var UnauthorizedClientException = [
    -3,
    n0,
    _UCE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(UnauthorizedClientException, UnauthorizedClientException$1);
  var UnsupportedGrantTypeException = [
    -3,
    n0,
    _UGTE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _ed],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(UnsupportedGrantTypeException, UnsupportedGrantTypeException$1);
  var SSOOIDCServiceException = [-3, _sm, "SSOOIDCServiceException", 0, [], []];
  schema.TypeRegistry.for(_sm).registerError(SSOOIDCServiceException, SSOOIDCServiceException$1);
  var CreateToken = [
    9,
    n0,
    _CT,
    {
      [_h]: ["POST", "/token", 200],
    },
    () => CreateTokenRequest,
    () => CreateTokenResponse,
  ];
  class CreateTokenCommand extends smithyClient.Command.classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    })
    .s("AWSSSOOIDCService", "CreateToken", {})
    .n("SSOOIDCClient", "CreateTokenCommand")
    .sc(CreateToken)
    .build() {}
  var commands = {
    CreateTokenCommand,
  };
  class SSOOIDC extends SSOOIDCClient {}
  smithyClient.createAggregatedClient(commands, SSOOIDC);
  var AccessDeniedExceptionReason = {
    KMS_ACCESS_DENIED: "KMS_AccessDeniedException",
  };
  var InvalidRequestExceptionReason = {
    KMS_DISABLED_KEY: "KMS_DisabledException",
    KMS_INVALID_KEY_USAGE: "KMS_InvalidKeyUsageException",
    KMS_INVALID_STATE: "KMS_InvalidStateException",
    KMS_KEY_NOT_FOUND: "KMS_NotFoundException",
  };
  Object.defineProperty(cjsExports, "$Command", {
    enumerable: true,
    get: function () {
      return smithyClient.Command;
    },
  });
  Object.defineProperty(cjsExports, "__Client", {
    enumerable: true,
    get: function () {
      return smithyClient.Client;
    },
  });
  cjsExports.AccessDeniedException = AccessDeniedException$1;
  cjsExports.AccessDeniedExceptionReason = AccessDeniedExceptionReason;
  cjsExports.AuthorizationPendingException = AuthorizationPendingException$1;
  cjsExports.CreateTokenCommand = CreateTokenCommand;
  cjsExports.ExpiredTokenException = ExpiredTokenException$1;
  cjsExports.InternalServerException = InternalServerException$1;
  cjsExports.InvalidClientException = InvalidClientException$1;
  cjsExports.InvalidGrantException = InvalidGrantException$1;
  cjsExports.InvalidRequestException = InvalidRequestException$1;
  cjsExports.InvalidRequestExceptionReason = InvalidRequestExceptionReason;
  cjsExports.InvalidScopeException = InvalidScopeException$1;
  cjsExports.SSOOIDC = SSOOIDC;
  cjsExports.SSOOIDCClient = SSOOIDCClient;
  cjsExports.SSOOIDCServiceException = SSOOIDCServiceException$1;
  cjsExports.SlowDownException = SlowDownException$1;
  cjsExports.UnauthorizedClientException = UnauthorizedClientException$1;
  cjsExports.UnsupportedGrantTypeException = UnsupportedGrantTypeException$1;
});
//@ chunk-67qh5zdp.js:16157-16177 affinity
export default require_sso_oidc();

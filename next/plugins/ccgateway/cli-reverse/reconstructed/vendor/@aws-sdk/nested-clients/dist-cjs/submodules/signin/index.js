/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (2)
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

//@ chunk-y366fgzk.js:7546-13429 cjs-fingerprint
var require_signin = __commonJS(function (cjsExports) {
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
      defaultSigningName: "signin",
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
  class SigninClient extends smithyClient.Client {
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
            httpAuthSchemeProvider.defaultSigninHttpAuthSchemeParametersProvider,
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
  var SigninServiceException$1 = class SigninServiceException extends smithyClient.ServiceException {
    constructor(options) {
      super(options);
      Object.setPrototypeOf(this, SigninServiceException.prototype);
    }
  };
  var AccessDeniedException$1 = class AccessDeniedException extends SigninServiceException$1 {
    name = "AccessDeniedException";
    $fault = "client";
    error;
    constructor(opts) {
      super({
        name: "AccessDeniedException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, AccessDeniedException.prototype);
      this.error = opts.error;
    }
  };
  var InternalServerException$1 = class InternalServerException extends SigninServiceException$1 {
    name = "InternalServerException";
    $fault = "server";
    error;
    constructor(opts) {
      super({
        name: "InternalServerException",
        $fault: "server",
        ...opts,
      });
      Object.setPrototypeOf(this, InternalServerException.prototype);
      this.error = opts.error;
    }
  };
  var TooManyRequestsError$1 = class TooManyRequestsError extends SigninServiceException$1 {
    name = "TooManyRequestsError";
    $fault = "client";
    error;
    constructor(opts) {
      super({
        name: "TooManyRequestsError",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, TooManyRequestsError.prototype);
      this.error = opts.error;
    }
  };
  var ValidationException$1 = class ValidationException extends SigninServiceException$1 {
    name = "ValidationException";
    $fault = "client";
    error;
    constructor(opts) {
      super({
        name: "ValidationException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ValidationException.prototype);
      this.error = opts.error;
    }
  };
  var _ADE = "AccessDeniedException";
  var _AT = "AccessToken";
  var _COAT = "CreateOAuth2Token";
  var _COATR = "CreateOAuth2TokenRequest";
  var _COATRB = "CreateOAuth2TokenRequestBody";
  var _COATRBr = "CreateOAuth2TokenResponseBody";
  var _COATRr = "CreateOAuth2TokenResponse";
  var _ISE = "InternalServerException";
  var _RT = "RefreshToken";
  var _TMRE = "TooManyRequestsError";
  var _VE = "ValidationException";
  var _aKI = "accessKeyId";
  var _aT = "accessToken";
  var _c = "client";
  var _cI = "clientId";
  var _cV = "codeVerifier";
  var _co = "code";
  var _e = "error";
  var _eI = "expiresIn";
  var _gT = "grantType";
  var _h = "http";
  var _hE = "httpError";
  var _iT = "idToken";
  var _jN = "jsonName";
  var _m = "message";
  var _rT = "refreshToken";
  var _rU = "redirectUri";
  var _s = "server";
  var _sAK = "secretAccessKey";
  var _sT = "sessionToken";
  var _sm = "smithy.ts.sdk.synthetic.com.amazonaws.signin";
  var _tI = "tokenInput";
  var _tO = "tokenOutput";
  var _tT = "tokenType";
  var n0 = "com.amazonaws.signin";
  var RefreshToken = [0, n0, _RT, 8, 0];
  var AccessDeniedException = [
    -3,
    n0,
    _ADE,
    {
      [_e]: _c,
    },
    [_e, _m],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(AccessDeniedException, AccessDeniedException$1);
  var AccessToken = [
    3,
    n0,
    _AT,
    8,
    [_aKI, _sAK, _sT],
    [
      [
        0,
        {
          [_jN]: _aKI,
        },
      ],
      [
        0,
        {
          [_jN]: _sAK,
        },
      ],
      [
        0,
        {
          [_jN]: _sT,
        },
      ],
    ],
  ];
  var CreateOAuth2TokenRequest = [3, n0, _COATR, 0, [_tI], [[() => CreateOAuth2TokenRequestBody, 16]]];
  var CreateOAuth2TokenRequestBody = [
    3,
    n0,
    _COATRB,
    0,
    [_cI, _gT, _co, _rU, _cV, _rT],
    [
      [
        0,
        {
          [_jN]: _cI,
        },
      ],
      [
        0,
        {
          [_jN]: _gT,
        },
      ],
      0,
      [
        0,
        {
          [_jN]: _rU,
        },
      ],
      [
        0,
        {
          [_jN]: _cV,
        },
      ],
      [
        () => RefreshToken,
        {
          [_jN]: _rT,
        },
      ],
    ],
  ];
  var CreateOAuth2TokenResponse = [3, n0, _COATRr, 0, [_tO], [[() => CreateOAuth2TokenResponseBody, 16]]];
  var CreateOAuth2TokenResponseBody = [
    3,
    n0,
    _COATRBr,
    0,
    [_aT, _tT, _eI, _rT, _iT],
    [
      [
        () => AccessToken,
        {
          [_jN]: _aT,
        },
      ],
      [
        0,
        {
          [_jN]: _tT,
        },
      ],
      [
        1,
        {
          [_jN]: _eI,
        },
      ],
      [
        () => RefreshToken,
        {
          [_jN]: _rT,
        },
      ],
      [
        0,
        {
          [_jN]: _iT,
        },
      ],
    ],
  ];
  var InternalServerException = [
    -3,
    n0,
    _ISE,
    {
      [_e]: _s,
      [_hE]: 500,
    },
    [_e, _m],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(InternalServerException, InternalServerException$1);
  var TooManyRequestsError = [
    -3,
    n0,
    _TMRE,
    {
      [_e]: _c,
      [_hE]: 429,
    },
    [_e, _m],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(TooManyRequestsError, TooManyRequestsError$1);
  var ValidationException = [
    -3,
    n0,
    _VE,
    {
      [_e]: _c,
      [_hE]: 400,
    },
    [_e, _m],
    [0, 0],
  ];
  schema.TypeRegistry.for(n0).registerError(ValidationException, ValidationException$1);
  var SigninServiceException = [-3, _sm, "SigninServiceException", 0, [], []];
  schema.TypeRegistry.for(_sm).registerError(SigninServiceException, SigninServiceException$1);
  var CreateOAuth2Token = [
    9,
    n0,
    _COAT,
    {
      [_h]: ["POST", "/v1/token", 200],
    },
    () => CreateOAuth2TokenRequest,
    () => CreateOAuth2TokenResponse,
  ];
  class CreateOAuth2TokenCommand extends smithyClient.Command.classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    })
    .s("Signin", "CreateOAuth2Token", {})
    .n("SigninClient", "CreateOAuth2TokenCommand")
    .sc(CreateOAuth2Token)
    .build() {}
  var commands = {
    CreateOAuth2TokenCommand,
  };
  class Signin extends SigninClient {}
  smithyClient.createAggregatedClient(commands, Signin);
  var OAuth2ErrorCode = {
    AUTHCODE_EXPIRED: "AUTHCODE_EXPIRED",
    INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
    INVALID_REQUEST: "INVALID_REQUEST",
    SERVER_ERROR: "server_error",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    USER_CREDENTIALS_CHANGED: "USER_CREDENTIALS_CHANGED",
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
  cjsExports.CreateOAuth2TokenCommand = CreateOAuth2TokenCommand;
  cjsExports.InternalServerException = InternalServerException$1;
  cjsExports.OAuth2ErrorCode = OAuth2ErrorCode;
  cjsExports.Signin = Signin;
  cjsExports.SigninClient = SigninClient;
  cjsExports.SigninServiceException = SigninServiceException$1;
  cjsExports.TooManyRequestsError = TooManyRequestsError$1;
  cjsExports.ValidationException = ValidationException$1;
});
//@ chunk-y366fgzk.js:13429-13449 affinity
export default require_signin();

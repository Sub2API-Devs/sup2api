/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (76)
 * attribution: esm-fingerprint 18, esm-layout 4, layout 54
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_region_config_resolver } from "../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_client } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import {
  import_client,
  import_retry,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_middleware_host_header_2,
  defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
} from "./auth/httpAuthSchemeProvider.js";
import { getRuntimeConfig_2 } from "./runtimeConfig.js";
import {
  import_middleware_user_agent,
  import_middleware_host_header,
  import_middleware_logger,
  import_middleware_recursion_detection,
} from "../../../@aws-crypto/crc32/build/module/aws_crc32.js";
import {
  import_index_native,
  ge,
  import_schema,
  import_core,
} from "../../../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { resolveEventStreamConfig } from "../../middleware-eventstream/dist-cjs/index.js";
import { resolveWebSocketConfig } from "../../middleware-websocket/dist-cjs/index.js";
import { require_schema } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { require_middleware_endpoint } from "../../../@smithy/middleware-endpoint/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:14441-14802 esm-fingerprint
var resolveClientEndpointParameters = (options) =>
  Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "bedrock",
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
//@ chunk-3cddmtk7.js:26372-26410 esm-layout
var regionConfigResolver = Re(require_region_config_resolver());
var protocolHttp = Re(require_protocol_http());
var import_client_4 = Re(require_client());
//@ chunk-3cddmtk7.js:26410-26936 esm-fingerprint
var getHttpAuthExtensionConfiguration = (options) => {
  let {
    httpAuthSchemes: _httpAuthSchemes,
    httpAuthSchemeProvider: _httpAuthSchemeProvider,
    credentials: _credentials,
    token: _token,
  } = options;
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
    setToken(token) {
      _token = token;
    },
    token() {
      return _token;
    },
  };
};
var resolveHttpAuthRuntimeConfig = (config) => ({
  httpAuthSchemes: config.httpAuthSchemes(),
  httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
  credentials: config.credentials(),
  token: config.token(),
});
//@ chunk-3cddmtk7.js:26936-27274 esm-fingerprint
var resolveRuntimeExtensions = (runtimeConfig, extensions) => {
  let extensionConfiguration = Object.assign(
    regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig),
    import_client_4.getDefaultExtensionConfiguration(runtimeConfig),
    protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig),
    getHttpAuthExtensionConfiguration(runtimeConfig),
  );
  extensions.forEach((extension) => extension.configure(extensionConfiguration));
  return Object.assign(
    runtimeConfig,
    regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration),
    import_client_4.resolveDefaultRuntimeConfig(extensionConfiguration),
    protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration),
    resolveHttpAuthRuntimeConfig(extensionConfiguration),
  );
};
//@ chunk-3cddmtk7.js:27274-28388 esm-fingerprint
class BedrockRuntimeClient extends import_client.Client {
  config;
  constructor(...[configuration]) {
    let _config_0 = getRuntimeConfig_2(configuration || {});
    super(_config_0);
    this.initConfig = _config_0;
    let _config_1 = resolveClientEndpointParameters(_config_0);
    let _config_2 = import_middleware_user_agent.resolveUserAgentConfig(_config_1);
    let _config_3 = import_retry.resolveRetryConfig(_config_2);
    let _config_4 = import_index_native.resolveRegionConfig(_config_3);
    let _config_5 = import_middleware_host_header.resolveHostHeaderConfig(_config_4);
    let _config_6 = import_middleware_endpoint.resolveEndpointConfig(_config_5);
    let _config_7 = ge(_config_6);
    let _config_8 = resolveHttpAuthSchemeConfig(_config_7);
    let _config_9 = resolveEventStreamConfig(_config_8);
    let _config_10 = resolveWebSocketConfig(_config_9);
    let _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
    this.config = _config_11;
    this.middlewareStack.use(import_schema.getSchemaSerdePlugin(this.config));
    this.middlewareStack.use(import_middleware_user_agent.getUserAgentPlugin(this.config));
    this.middlewareStack.use(import_retry.getRetryPlugin(this.config));
    this.middlewareStack.use(import_middleware_host_header_2.getContentLengthPlugin(this.config));
    this.middlewareStack.use(import_middleware_host_header.getHostHeaderPlugin(this.config));
    this.middlewareStack.use(import_middleware_logger.getLoggerPlugin(this.config));
    this.middlewareStack.use(import_middleware_recursion_detection.getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(
      import_core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
        httpAuthSchemeParametersProvider: defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
        identityProviderConfigProvider: async (config) =>
          new import_core.DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials,
            "smithy.api#httpBearerAuth": config.token,
          }),
      }),
    );
    this.middlewareStack.use(import_core.getHttpSigningPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
}
//@ chunk-3cddmtk7.js:28388-28403 esm-layout
var schema = Re(require_schema());
//@ chunk-3cddmtk7.js:28403-28419 esm-layout
var import_client_5 = Re(require_client());
//@ chunk-3cddmtk7.js:28419-28522 esm-fingerprint
class BedrockRuntimeServiceException extends import_client_5.ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, BedrockRuntimeServiceException.prototype);
  }
}
//@ chunk-3cddmtk7.js:28522-28701 esm-fingerprint
class W extends BedrockRuntimeServiceException {
  name = "AccessDeniedException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "AccessDeniedException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, W.prototype);
  }
}
//@ chunk-3cddmtk7.js:28701-28888 esm-fingerprint
class InternalServerException extends BedrockRuntimeServiceException {
  name = "InternalServerException";
  $fault = "server";
  constructor(opts) {
    super({
      name: "InternalServerException",
      $fault: "server",
      ...opts,
    });
    Object.setPrototypeOf(this, InternalServerException.prototype);
  }
}
//@ chunk-3cddmtk7.js:28888-29067 esm-fingerprint
class ThrottlingException extends BedrockRuntimeServiceException {
  name = "ThrottlingException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ThrottlingException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, ThrottlingException.prototype);
  }
}
//@ chunk-3cddmtk7.js:29067-29246 esm-fingerprint
class ValidationException extends BedrockRuntimeServiceException {
  name = "ValidationException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ValidationException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}
//@ chunk-3cddmtk7.js:29246-29417 esm-fingerprint
class N extends BedrockRuntimeServiceException {
  name = "ConflictException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ConflictException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, N.prototype);
  }
}
//@ chunk-3cddmtk7.js:29417-29604 esm-fingerprint
class H extends BedrockRuntimeServiceException {
  name = "ResourceNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, H.prototype);
  }
}
//@ chunk-3cddmtk7.js:29604-29799 esm-fingerprint
class V extends BedrockRuntimeServiceException {
  name = "ServiceQuotaExceededException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ServiceQuotaExceededException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, V.prototype);
  }
}
//@ chunk-3cddmtk7.js:29799-29994 esm-fingerprint
class ServiceUnavailableException extends BedrockRuntimeServiceException {
  name = "ServiceUnavailableException";
  $fault = "server";
  constructor(opts) {
    super({
      name: "ServiceUnavailableException",
      $fault: "server",
      ...opts,
    });
    Object.setPrototypeOf(this, ServiceUnavailableException.prototype);
  }
}
//@ chunk-3cddmtk7.js:29994-30279 esm-fingerprint
class q extends BedrockRuntimeServiceException {
  name = "ModelErrorException";
  $fault = "client";
  originalStatusCode;
  resourceName;
  constructor(opts) {
    super({
      name: "ModelErrorException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, q.prototype);
    this.originalStatusCode = opts.originalStatusCode;
    this.resourceName = opts.resourceName;
  }
}
//@ chunk-3cddmtk7.js:30279-30474 esm-fingerprint
class j extends BedrockRuntimeServiceException {
  name = "ModelNotReadyException";
  $fault = "client";
  $retryable = {};
  constructor(opts) {
    super({
      name: "ModelNotReadyException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, j.prototype);
  }
}
//@ chunk-3cddmtk7.js:30474-30657 esm-fingerprint
class ModelTimeoutException extends BedrockRuntimeServiceException {
  name = "ModelTimeoutException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ModelTimeoutException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, ModelTimeoutException.prototype);
  }
}
//@ chunk-3cddmtk7.js:30657-30967 esm-fingerprint
class ModelStreamErrorException extends BedrockRuntimeServiceException {
  name = "ModelStreamErrorException";
  $fault = "client";
  originalStatusCode;
  originalMessage;
  constructor(opts) {
    super({
      name: "ModelStreamErrorException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, ModelStreamErrorException.prototype);
    this.originalStatusCode = opts.originalStatusCode;
    this.originalMessage = opts.originalMessage;
  }
}
//@ chunk-3cddmtk7.js:30967-31021 layout
var Xt = [0, "com.amazonaws.bedrockruntime", "Body", 8, 21];
//@ chunk-3cddmtk7.js:31021-31143 layout
var zt = [
  -3,
  "com.amazonaws.bedrockruntime",
  "AccessDeniedException",
  {
    ["error"]: "client",
    ["httpError"]: 403,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:31143-31214 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(zt, W);
//@ chunk-3cddmtk7.js:31214-31280 layout
var Qt = [3, "com.amazonaws.bedrockruntime", "AnyToolChoice", 0, [], []];
//@ chunk-3cddmtk7.js:31280-31347 layout
var Kt = [3, "com.amazonaws.bedrockruntime", "AutoToolChoice", 0, [], []];
//@ chunk-3cddmtk7.js:31347-31717 layout
var re = [3, "com.amazonaws.bedrockruntime", "CachePointBlock", 0, ["type"], [0]];
var Jt = [
  3,
  "com.amazonaws.bedrockruntime",
  "Citation",
  0,
  ["title", "source", "sourceContent", "location"],
  [0, 0, () => Mo, () => Vo],
];
var pt = [3, "com.amazonaws.bedrockruntime", "CitationsConfig", 0, ["enabled"], [2]];
var Zt = [
  3,
  "com.amazonaws.bedrockruntime",
  "CitationsContentBlock",
  0,
  ["content", "citations"],
  [() => Po, () => bo],
];
//@ chunk-3cddmtk7.js:31717-31835 layout
var Yt = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ConflictException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:31835-31906 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(Yt, N);
//@ chunk-3cddmtk7.js:31906-32074 layout
var eo = [
  3,
  "com.amazonaws.bedrockruntime",
  "ConverseTokensRequest",
  0,
  ["messages", "system", "toolConfig", "additionalModelRequestFields"],
  [[() => Lo, 0], [() => Uo, 0], () => Ro, 15],
];
//@ chunk-3cddmtk7.js:32074-32697 layout
var to = [
  3,
  "com.amazonaws.bedrockruntime",
  "CountTokensRequest",
  0,
  ["modelId", "input"],
  [
    [0, 1],
    [() => $o, 0],
  ],
];
var oo = [3, "com.amazonaws.bedrockruntime", "CountTokensResponse", 0, ["inputTokens"], [1]];
var mt = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentBlock",
  0,
  ["format", "name", "source", "context", "citations"],
  [0, 0, () => zo, 0, () => pt],
];
var no = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentCharLocation",
  0,
  ["documentIndex", "start", "end"],
  [1, 1, 1],
];
var ro = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentChunkLocation",
  0,
  ["documentIndex", "start", "end"],
  [1, 1, 1],
];
var so = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentPageLocation",
  0,
  ["documentIndex", "start", "end"],
  [1, 1, 1],
];
//@ chunk-3cddmtk7.js:32697-32904 layout
var ao = [
  3,
  "com.amazonaws.bedrockruntime",
  "GuardrailConverseImageBlock",
  8,
  ["format", "source"],
  [0, [() => Qo, 0]],
];
var io = [
  3,
  "com.amazonaws.bedrockruntime",
  "GuardrailConverseTextBlock",
  0,
  ["text", "qualifiers"],
  [0, 64],
];
//@ chunk-3cddmtk7.js:32904-32992 layout
var xt = [3, "com.amazonaws.bedrockruntime", "ImageBlock", 0, ["format", "source"], [0, () => Ko]];
//@ chunk-3cddmtk7.js:32992-33116 layout
var co = [
  -3,
  "com.amazonaws.bedrockruntime",
  "InternalServerException",
  {
    ["error"]: "server",
    ["httpError"]: 500,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:33116-33189 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(co, InternalServerException);
//@ chunk-3cddmtk7.js:33189-33282 layout
var _o = [3, "com.amazonaws.bedrockruntime", "InvokeModelTokensRequest", 0, ["body"], [[() => Xt, 0]]];
//@ chunk-3cddmtk7.js:33282-33370 layout
var lo = [3, "com.amazonaws.bedrockruntime", "Message", 0, ["role", "content"], [0, [() => wo, 0]]];
//@ chunk-3cddmtk7.js:33370-33530 layout
var uo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelErrorException",
  {
    ["error"]: "client",
    ["httpError"]: 424,
  },
  ["message", "originalStatusCode", "resourceName"],
  [0, 1, 0],
];
//@ chunk-3cddmtk7.js:33530-33601 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(uo, q);
//@ chunk-3cddmtk7.js:33601-33724 layout
var po = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelNotReadyException",
  {
    ["error"]: "client",
    ["httpError"]: 429,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:33724-33795 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(po, j);
//@ chunk-3cddmtk7.js:33795-33964 layout
var mo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelStreamErrorException",
  {
    ["error"]: "client",
    ["httpError"]: 424,
  },
  ["message", "originalStatusCode", "originalMessage"],
  [0, 1, 0],
];
//@ chunk-3cddmtk7.js:33964-34037 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(mo, ModelStreamErrorException);
//@ chunk-3cddmtk7.js:34037-34159 layout
var xo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelTimeoutException",
  {
    ["error"]: "client",
    ["httpError"]: 408,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:34159-34232 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(xo, ModelTimeoutException);
//@ chunk-3cddmtk7.js:34232-34446 layout
var Co = [3, "com.amazonaws.bedrockruntime", "ReasoningTextBlock", 8, ["text", "signature"], [0, 0]];
var vo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ResourceNotFoundException",
  {
    ["error"]: "client",
    ["httpError"]: 404,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:34446-34517 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(vo, H);
//@ chunk-3cddmtk7.js:34517-35036 layout
var se = [3, "com.amazonaws.bedrockruntime", "S3Location", 0, ["uri", "bucketOwner"], [0, 0]];
var Ct = [
  3,
  "com.amazonaws.bedrockruntime",
  "SearchResultBlock",
  0,
  ["source", "title", "content", "citations"],
  [0, 0, () => Oo, () => pt],
];
var go = [3, "com.amazonaws.bedrockruntime", "SearchResultContentBlock", 0, ["text"], [0]];
var fo = [
  3,
  "com.amazonaws.bedrockruntime",
  "SearchResultLocation",
  0,
  ["searchResultIndex", "start", "end"],
  [1, 1, 1],
];
var ho = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ServiceQuotaExceededException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:35036-35107 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(ho, V);
//@ chunk-3cddmtk7.js:35107-35235 layout
var So = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ServiceUnavailableException",
  {
    ["error"]: "server",
    ["httpError"]: 503,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:35235-35308 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(So, ServiceUnavailableException);
//@ chunk-3cddmtk7.js:35308-35386 layout
var Ao = [3, "com.amazonaws.bedrockruntime", "SpecificToolChoice", 0, ["name"], [0]];
//@ chunk-3cddmtk7.js:35386-35456 layout
var yo = [3, "com.amazonaws.bedrockruntime", "SystemTool", 0, ["name"], [0]];
//@ chunk-3cddmtk7.js:35456-35576 layout
var Bo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ThrottlingException",
  {
    ["error"]: "client",
    ["httpError"]: 429,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:35576-35649 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(Bo, ThrottlingException);
//@ chunk-3cddmtk7.js:35649-35865 layout
var Ro = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolConfiguration",
  0,
  ["tools", "toolChoice"],
  [() => No, () => en],
];
var Eo = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolResultBlock",
  0,
  ["toolUseId", "content", "status", "type"],
  [0, () => Wo, 0, 0],
];
//@ chunk-3cddmtk7.js:35865-36081 layout
var Io = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolSpecification",
  0,
  ["name", "description", "inputSchema"],
  [0, 0, () => tn],
];
var To = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolUseBlock",
  0,
  ["toolUseId", "name", "input", "type"],
  [0, 0, 15, 0],
];
//@ chunk-3cddmtk7.js:36081-36201 layout
var Go = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ValidationException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:36201-36274 layout
schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(Go, ValidationException);
//@ chunk-3cddmtk7.js:36274-36439 layout
var vt = [3, "com.amazonaws.bedrockruntime", "VideoBlock", 0, ["format", "source"], [0, () => nn]];
var ko = [3, "com.amazonaws.bedrockruntime", "WebLocation", 0, ["url", "domain"], [0, 0]];
//@ chunk-3cddmtk7.js:36439-36547 layout
var Do = [
  -3,
  "smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime",
  "BedrockRuntimeServiceException",
  0,
  [],
  [],
];
//@ chunk-3cddmtk7.js:36547-36643 layout
schema.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime").registerError(
  Do,
  BedrockRuntimeServiceException,
);
//@ chunk-3cddmtk7.js:36643-36859 layout
var Po = [1, "com.amazonaws.bedrockruntime", "CitationGeneratedContentList", 0, () => Ho];
var bo = [1, "com.amazonaws.bedrockruntime", "Citations", 0, () => Jt];
var Mo = [1, "com.amazonaws.bedrockruntime", "CitationSourceContentList", 0, () => qo];
//@ chunk-3cddmtk7.js:36859-37001 layout
var wo = [1, "com.amazonaws.bedrockruntime", "ContentBlocks", 0, [() => jo, 0]];
var Fo = [1, "com.amazonaws.bedrockruntime", "DocumentContentBlocks", 0, () => Xo];
//@ chunk-3cddmtk7.js:37001-37067 layout
var Lo = [1, "com.amazonaws.bedrockruntime", "Messages", 0, [() => lo, 0]];
//@ chunk-3cddmtk7.js:37067-37219 layout
var Oo = [1, "com.amazonaws.bedrockruntime", "SearchResultContentBlocks", 0, () => go];
var Uo = [1, "com.amazonaws.bedrockruntime", "SystemContentBlocks", 0, [() => Zo, 0]];
//@ chunk-3cddmtk7.js:37219-37351 layout
var Wo = [1, "com.amazonaws.bedrockruntime", "ToolResultContentBlocks", 0, () => on];
var No = [1, "com.amazonaws.bedrockruntime", "Tools", 0, () => Yo];
//@ chunk-3cddmtk7.js:37351-37962 layout
var Ho = [3, "com.amazonaws.bedrockruntime", "CitationGeneratedContent", 0, ["text"], [0]];
var Vo = [
  3,
  "com.amazonaws.bedrockruntime",
  "CitationLocation",
  0,
  ["web", "documentChar", "documentPage", "documentChunk", "searchResultLocation"],
  [() => ko, () => no, () => so, () => ro, () => fo],
];
var qo = [3, "com.amazonaws.bedrockruntime", "CitationSourceContent", 0, ["text"], [0]];
var jo = [
  3,
  "com.amazonaws.bedrockruntime",
  "ContentBlock",
  0,
  [
    "text",
    "image",
    "document",
    "video",
    "toolUse",
    "toolResult",
    "guardContent",
    "cachePoint",
    "reasoningContent",
    "citationsContent",
    "searchResult",
  ],
  [
    0,
    () => xt,
    () => mt,
    () => vt,
    () => To,
    () => Eo,
    [() => gt, 0],
    () => re,
    [() => Jo, 0],
    () => Zt,
    () => Ct,
  ],
];
//@ chunk-3cddmtk7.js:37962-38270 layout
var $o = [
  3,
  "com.amazonaws.bedrockruntime",
  "CountTokensInput",
  0,
  ["invokeModel", "converse"],
  [
    [() => _o, 0],
    [() => eo, 0],
  ],
];
var Xo = [3, "com.amazonaws.bedrockruntime", "DocumentContentBlock", 0, ["text"], [0]];
var zo = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentSource",
  0,
  ["bytes", "s3Location", "text", "content"],
  [21, () => se, 0, () => Fo],
];
//@ chunk-3cddmtk7.js:38270-38469 layout
var gt = [
  3,
  "com.amazonaws.bedrockruntime",
  "GuardrailConverseContentBlock",
  0,
  ["text", "image"],
  [() => io, [() => ao, 0]],
];
var Qo = [3, "com.amazonaws.bedrockruntime", "GuardrailConverseImageSource", 8, ["bytes"], [21]];
//@ chunk-3cddmtk7.js:38469-38562 layout
var Ko = [3, "com.amazonaws.bedrockruntime", "ImageSource", 0, ["bytes", "s3Location"], [21, () => se]];
//@ chunk-3cddmtk7.js:38562-38682 layout
var Jo = [
  3,
  "com.amazonaws.bedrockruntime",
  "ReasoningContentBlock",
  8,
  ["reasoningText", "redactedContent"],
  [[() => Co, 0], 21],
];
//@ chunk-3cddmtk7.js:38682-39085 layout
var Zo = [
  3,
  "com.amazonaws.bedrockruntime",
  "SystemContentBlock",
  0,
  ["text", "guardContent", "cachePoint"],
  [0, [() => gt, 0], () => re],
];
var Yo = [
  3,
  "com.amazonaws.bedrockruntime",
  "Tool",
  0,
  ["toolSpec", "systemTool", "cachePoint"],
  [() => Io, () => yo, () => re],
];
var en = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolChoice",
  0,
  ["auto", "any", "tool"],
  [() => Kt, () => Qt, () => Ao],
];
var tn = [3, "com.amazonaws.bedrockruntime", "ToolInputSchema", 0, ["json"], [15]];
//@ chunk-3cddmtk7.js:39085-39336 layout
var on = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolResultContentBlock",
  0,
  ["json", "text", "image", "document", "video", "searchResult"],
  [15, 0, () => xt, () => mt, () => vt, () => Ct],
];
var nn = [3, "com.amazonaws.bedrockruntime", "VideoSource", 0, ["bytes", "s3Location"], [21, () => se]];
//@ chunk-3cddmtk7.js:39336-39462 layout
var CountTokens = [
  9,
  "com.amazonaws.bedrockruntime",
  "CountTokens",
  {
    ["http"]: ["POST", "/model/{modelId}/count-tokens", 200],
  },
  () => to,
  () => oo,
];
//@ chunk-3cddmtk7.js:39462-39490 esm-layout
var middlewareEndpoint = Re(require_middleware_endpoint());
var import_client_6 = Re(require_client());
//@ chunk-3cddmtk7.js:39490-39746 esm-fingerprint
class CountTokensCommand extends import_client_6.Command.classBuilder()
  .ep(commonParams)
  .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
  })
  .s("AmazonBedrockFrontendService", "CountTokens", {})
  .n("BedrockRuntimeClient", "CountTokensCommand")
  .sc(CountTokens)
  .build() {}
export {
  InternalServerException,
  ModelStreamErrorException,
  ModelTimeoutException,
  ServiceUnavailableException,
  ThrottlingException,
  ValidationException,
  BedrockRuntimeServiceException,
};

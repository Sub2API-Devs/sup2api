/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-ayc8mk37.js (75)
 * attribution: esm-fingerprint 18, esm-layout 4, placement 52, layout 1
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_region_config_resolver } from "../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_client } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import {
  import_client_2,
  import_retry_2,
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
  withEventStreamSerdeProvider,
  import_schema,
  import_core_3,
} from "../../../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { resolveEventStreamConfig } from "../../middleware-eventstream/dist-cjs/index.js";
import { resolveWebSocketConfig } from "../../middleware-websocket/dist-cjs/index.js";
import { require_schema } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { ToolUseBlock, ToolSpecification } from "../../../../src/components/Spinner/TeammateSpinnerLine.js";
import { require_middleware_endpoint } from "../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-ayc8mk37.js:14441-14802 esm-fingerprint
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
//@ chunk-ayc8mk37.js:26372-26410 esm-layout
var regionConfigResolver = __toESM(require_region_config_resolver());
var protocolHttp = __toESM(require_protocol_http());
var import_client_5 = __toESM(require_client());
//@ chunk-ayc8mk37.js:26410-26936 esm-fingerprint
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
//@ chunk-ayc8mk37.js:26936-27274 esm-fingerprint
var resolveRuntimeExtensions = (runtimeConfig, extensions) => {
  let extensionConfiguration = Object.assign(
    regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig),
    import_client_5.getDefaultExtensionConfiguration(runtimeConfig),
    protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig),
    getHttpAuthExtensionConfiguration(runtimeConfig),
  );
  extensions.forEach((extension) => extension.configure(extensionConfiguration));
  return Object.assign(
    runtimeConfig,
    regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration),
    import_client_5.resolveDefaultRuntimeConfig(extensionConfiguration),
    protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration),
    resolveHttpAuthRuntimeConfig(extensionConfiguration),
  );
};
//@ chunk-ayc8mk37.js:27274-28388 esm-fingerprint
class BedrockRuntimeClient extends import_client_2.Client {
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
    let _config_7 = withEventStreamSerdeProvider(_config_6);
    let _config_8 = resolveHttpAuthSchemeConfig(_config_7);
    let _config_9 = resolveEventStreamConfig(_config_8);
    let _config_10 = resolveWebSocketConfig(_config_9);
    let _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
    this.config = _config_11;
    this.middlewareStack.use(import_schema.getSchemaSerdePlugin(this.config));
    this.middlewareStack.use(import_middleware_user_agent.getUserAgentPlugin(this.config));
    this.middlewareStack.use(import_retry_2.getRetryPlugin(this.config));
    this.middlewareStack.use(import_middleware_host_header_2.getContentLengthPlugin(this.config));
    this.middlewareStack.use(import_middleware_host_header.getHostHeaderPlugin(this.config));
    this.middlewareStack.use(import_middleware_logger.getLoggerPlugin(this.config));
    this.middlewareStack.use(import_middleware_recursion_detection.getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(
      import_core_3.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
        httpAuthSchemeParametersProvider: defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
        identityProviderConfigProvider: async (config) =>
          new import_core_3.DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials,
            "smithy.api#httpBearerAuth": config.token,
          }),
      }),
    );
    this.middlewareStack.use(import_core_3.getHttpSigningPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
}
//@ chunk-ayc8mk37.js:28388-28403 esm-layout
var schema = __toESM(require_schema());
//@ chunk-ayc8mk37.js:28403-28419 esm-layout
var import_client_6 = __toESM(require_client());
//@ chunk-ayc8mk37.js:28419-28522 esm-fingerprint
let BedrockRuntimeServiceException; // deferred: uses import_client_6 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:28419", () => {
  BedrockRuntimeServiceException = class BedrockRuntimeServiceException extends (
    import_client_6.ServiceException
  ) {
    constructor(options) {
      super(options);
      Object.setPrototypeOf(this, BedrockRuntimeServiceException.prototype);
    }
  };
});
//@ chunk-ayc8mk37.js:28522-28701 esm-fingerprint
let AccessDeniedException_2; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:28522", () => {
  AccessDeniedException_2 = class AccessDeniedException_2 extends BedrockRuntimeServiceException {
    name = "AccessDeniedException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "AccessDeniedException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, AccessDeniedException_2.prototype);
    }
  };
});
//@ chunk-ayc8mk37.js:28701-28888 esm-fingerprint
let InternalServerException; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:28701", () => {
  InternalServerException = class InternalServerException extends BedrockRuntimeServiceException {
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
  };
});
//@ chunk-ayc8mk37.js:28888-29067 esm-fingerprint
let ThrottlingException; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:28888", () => {
  ThrottlingException = class ThrottlingException extends BedrockRuntimeServiceException {
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
  };
});
//@ chunk-ayc8mk37.js:29067-29246 esm-fingerprint
let ValidationException; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:29067", () => {
  ValidationException = class ValidationException extends BedrockRuntimeServiceException {
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
  };
});
//@ chunk-ayc8mk37.js:29246-29417 esm-fingerprint
let ConflictException_2; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:29246", () => {
  ConflictException_2 = class ConflictException_2 extends BedrockRuntimeServiceException {
    name = "ConflictException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ConflictException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ConflictException_2.prototype);
    }
  };
});
//@ chunk-ayc8mk37.js:29417-29604 esm-fingerprint
let ResourceNotFoundException_2; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:29417", () => {
  ResourceNotFoundException_2 = class ResourceNotFoundException_2 extends BedrockRuntimeServiceException {
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
//@ chunk-ayc8mk37.js:29604-29799 esm-fingerprint
let ServiceQuotaExceededException_2; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:29604", () => {
  ServiceQuotaExceededException_2 = class ServiceQuotaExceededException_2 extends (
    BedrockRuntimeServiceException
  ) {
    name = "ServiceQuotaExceededException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ServiceQuotaExceededException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ServiceQuotaExceededException_2.prototype);
    }
  };
});
//@ chunk-ayc8mk37.js:29799-29994 esm-fingerprint
let ServiceUnavailableException; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:29799", () => {
  ServiceUnavailableException = class ServiceUnavailableException extends BedrockRuntimeServiceException {
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
  };
});
//@ chunk-ayc8mk37.js:29994-30279 esm-fingerprint
let ModelErrorException_2; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:29994", () => {
  ModelErrorException_2 = class ModelErrorException_2 extends BedrockRuntimeServiceException {
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
      Object.setPrototypeOf(this, ModelErrorException_2.prototype);
      this.originalStatusCode = opts.originalStatusCode;
      this.resourceName = opts.resourceName;
    }
  };
});
//@ chunk-ayc8mk37.js:30279-30474 esm-fingerprint
let ModelNotReadyException_2; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:30279", () => {
  ModelNotReadyException_2 = class ModelNotReadyException_2 extends BedrockRuntimeServiceException {
    name = "ModelNotReadyException";
    $fault = "client";
    $retryable = {};
    constructor(opts) {
      super({
        name: "ModelNotReadyException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ModelNotReadyException_2.prototype);
    }
  };
});
//@ chunk-ayc8mk37.js:30474-30657 esm-fingerprint
let ModelTimeoutException; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:30474", () => {
  ModelTimeoutException = class ModelTimeoutException extends BedrockRuntimeServiceException {
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
  };
});
//@ chunk-ayc8mk37.js:30657-30967 esm-fingerprint
let ModelStreamErrorException; // deferred: uses BedrockRuntimeServiceException of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:30657", () => {
  ModelStreamErrorException = class ModelStreamErrorException extends BedrockRuntimeServiceException {
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
  };
});
//@ chunk-ayc8mk37.js:30967-31021 placement
var Body = [0, "com.amazonaws.bedrockruntime", "Body", 8, 21];
//@ chunk-ayc8mk37.js:31021-31143 placement
var AccessDeniedException = [
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
//@ chunk-ayc8mk37.js:31143-31214 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:31143", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    AccessDeniedException,
    AccessDeniedException_2,
  );
});
//@ chunk-ayc8mk37.js:31214-31280 placement
var AnyToolChoice = [3, "com.amazonaws.bedrockruntime", "AnyToolChoice", 0, [], []];
//@ chunk-ayc8mk37.js:31280-31347 placement
var AutoToolChoice = [3, "com.amazonaws.bedrockruntime", "AutoToolChoice", 0, [], []];
//@ chunk-ayc8mk37.js:31347-31717 placement
var CachePointBlock = [3, "com.amazonaws.bedrockruntime", "CachePointBlock", 0, ["type"], [0]];
var Citation = [
  3,
  "com.amazonaws.bedrockruntime",
  "Citation",
  0,
  ["title", "source", "sourceContent", "location"],
  [0, 0, () => CitationSourceContentList, () => CitationLocation],
];
var CitationsConfig = [3, "com.amazonaws.bedrockruntime", "CitationsConfig", 0, ["enabled"], [2]];
var CitationsContentBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "CitationsContentBlock",
  0,
  ["content", "citations"],
  [() => CitationGeneratedContentList, () => Citations],
];
//@ chunk-ayc8mk37.js:31717-31835 placement
var ConflictException = [
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
//@ chunk-ayc8mk37.js:31835-31906 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:31835", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ConflictException,
    ConflictException_2,
  );
});
//@ chunk-ayc8mk37.js:31906-32074 placement
var ConverseTokensRequest = [
  3,
  "com.amazonaws.bedrockruntime",
  "ConverseTokensRequest",
  0,
  ["messages", "system", "toolConfig", "additionalModelRequestFields"],
  [[() => Messages, 0], [() => SystemContentBlocks, 0], () => ToolConfiguration, 15],
];
//@ chunk-ayc8mk37.js:32074-32697 placement
var CountTokensRequest = [
  3,
  "com.amazonaws.bedrockruntime",
  "CountTokensRequest",
  0,
  ["modelId", "input"],
  [
    [0, 1],
    [() => CountTokensInput, 0],
  ],
];
var CountTokensResponse = [3, "com.amazonaws.bedrockruntime", "CountTokensResponse", 0, ["inputTokens"], [1]];
var DocumentBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentBlock",
  0,
  ["format", "name", "source", "context", "citations"],
  [0, 0, () => DocumentSource, 0, () => CitationsConfig],
];
var DocumentCharLocation = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentCharLocation",
  0,
  ["documentIndex", "start", "end"],
  [1, 1, 1],
];
var DocumentChunkLocation = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentChunkLocation",
  0,
  ["documentIndex", "start", "end"],
  [1, 1, 1],
];
var DocumentPageLocation = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentPageLocation",
  0,
  ["documentIndex", "start", "end"],
  [1, 1, 1],
];
//@ chunk-ayc8mk37.js:32697-32904 placement
var GuardrailConverseImageBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "GuardrailConverseImageBlock",
  8,
  ["format", "source"],
  [0, [() => GuardrailConverseImageSource, 0]],
];
var GuardrailConverseTextBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "GuardrailConverseTextBlock",
  0,
  ["text", "qualifiers"],
  [0, 64],
];
//@ chunk-ayc8mk37.js:32904-32992 placement
var ImageBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "ImageBlock",
  0,
  ["format", "source"],
  [0, () => ImageSource],
];
//@ chunk-ayc8mk37.js:32992-33116 placement
var InternalServerException_2 = [
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
//@ chunk-ayc8mk37.js:33116-33189 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:33116", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    InternalServerException_2,
    InternalServerException,
  );
});
//@ chunk-ayc8mk37.js:33189-33282 placement
var InvokeModelTokensRequest = [
  3,
  "com.amazonaws.bedrockruntime",
  "InvokeModelTokensRequest",
  0,
  ["body"],
  [[() => Body, 0]],
];
//@ chunk-ayc8mk37.js:33282-33370 placement
var Message = [
  3,
  "com.amazonaws.bedrockruntime",
  "Message",
  0,
  ["role", "content"],
  [0, [() => ContentBlocks, 0]],
];
//@ chunk-ayc8mk37.js:33370-33530 placement
var ModelErrorException = [
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
//@ chunk-ayc8mk37.js:33530-33601 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:33530", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ModelErrorException,
    ModelErrorException_2,
  );
});
//@ chunk-ayc8mk37.js:33601-33724 placement
var ModelNotReadyException = [
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
//@ chunk-ayc8mk37.js:33724-33795 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:33724", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ModelNotReadyException,
    ModelNotReadyException_2,
  );
});
//@ chunk-ayc8mk37.js:33795-33964 placement
var ModelStreamErrorException_2 = [
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
//@ chunk-ayc8mk37.js:33964-34037 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:33964", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ModelStreamErrorException_2,
    ModelStreamErrorException,
  );
});
//@ chunk-ayc8mk37.js:34037-34159 placement
var ModelTimeoutException_2 = [
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
//@ chunk-ayc8mk37.js:34159-34232 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:34159", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ModelTimeoutException_2,
    ModelTimeoutException,
  );
});
//@ chunk-ayc8mk37.js:34232-34446 placement
var ReasoningTextBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "ReasoningTextBlock",
  8,
  ["text", "signature"],
  [0, 0],
];
var ResourceNotFoundException = [
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
//@ chunk-ayc8mk37.js:34446-34517 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:34446", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ResourceNotFoundException,
    ResourceNotFoundException_2,
  );
});
//@ chunk-ayc8mk37.js:34517-35036 placement
var S3Location = [3, "com.amazonaws.bedrockruntime", "S3Location", 0, ["uri", "bucketOwner"], [0, 0]];
var SearchResultBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "SearchResultBlock",
  0,
  ["source", "title", "content", "citations"],
  [0, 0, () => SearchResultContentBlocks, () => CitationsConfig],
];
var SearchResultContentBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "SearchResultContentBlock",
  0,
  ["text"],
  [0],
];
var SearchResultLocation = [
  3,
  "com.amazonaws.bedrockruntime",
  "SearchResultLocation",
  0,
  ["searchResultIndex", "start", "end"],
  [1, 1, 1],
];
var ServiceQuotaExceededException = [
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
//@ chunk-ayc8mk37.js:35036-35107 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:35036", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ServiceQuotaExceededException,
    ServiceQuotaExceededException_2,
  );
});
//@ chunk-ayc8mk37.js:35107-35235 placement
var ServiceUnavailableException_2 = [
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
//@ chunk-ayc8mk37.js:35235-35308 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:35235", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ServiceUnavailableException_2,
    ServiceUnavailableException,
  );
});
//@ chunk-ayc8mk37.js:35308-35386 placement
var SpecificToolChoice = [3, "com.amazonaws.bedrockruntime", "SpecificToolChoice", 0, ["name"], [0]];
//@ chunk-ayc8mk37.js:35386-35456 placement
var SystemTool = [3, "com.amazonaws.bedrockruntime", "SystemTool", 0, ["name"], [0]];
//@ chunk-ayc8mk37.js:35456-35576 placement
var ThrottlingException_2 = [
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
//@ chunk-ayc8mk37.js:35576-35649 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:35576", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ThrottlingException_2,
    ThrottlingException,
  );
});
//@ chunk-ayc8mk37.js:35649-35865 placement
var ToolConfiguration = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolConfiguration",
  0,
  ["tools", "toolChoice"],
  [() => Tools, () => ToolChoice],
];
var ToolResultBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolResultBlock",
  0,
  ["toolUseId", "content", "status", "type"],
  [0, () => ToolResultContentBlocks, 0, 0],
];
//@ chunk-ayc8mk37.js:36081-36201 placement
var ValidationException_2 = [
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
//@ chunk-ayc8mk37.js:36201-36274 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:36201", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(
    ValidationException_2,
    ValidationException,
  );
});
//@ chunk-ayc8mk37.js:36274-36439 placement
var VideoBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "VideoBlock",
  0,
  ["format", "source"],
  [0, () => VideoSource],
];
var WebLocation = [3, "com.amazonaws.bedrockruntime", "WebLocation", 0, ["url", "domain"], [0, 0]];
//@ chunk-ayc8mk37.js:36439-36547 placement
var BedrockRuntimeServiceException_2 = [
  -3,
  "smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime",
  "BedrockRuntimeServiceException",
  0,
  [],
  [],
];
//@ chunk-ayc8mk37.js:36547-36643 placement
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:36547", () => {
  schema.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime").registerError(
    BedrockRuntimeServiceException_2,
    BedrockRuntimeServiceException,
  );
});
//@ chunk-ayc8mk37.js:36643-36859 placement
var CitationGeneratedContentList = [
  1,
  "com.amazonaws.bedrockruntime",
  "CitationGeneratedContentList",
  0,
  () => CitationGeneratedContent,
];
var Citations = [1, "com.amazonaws.bedrockruntime", "Citations", 0, () => Citation];
var CitationSourceContentList = [
  1,
  "com.amazonaws.bedrockruntime",
  "CitationSourceContentList",
  0,
  () => CitationSourceContent,
];
//@ chunk-ayc8mk37.js:36859-37001 placement
var ContentBlocks = [1, "com.amazonaws.bedrockruntime", "ContentBlocks", 0, [() => ContentBlock, 0]];
var DocumentContentBlocks = [
  1,
  "com.amazonaws.bedrockruntime",
  "DocumentContentBlocks",
  0,
  () => DocumentContentBlock,
];
//@ chunk-ayc8mk37.js:37001-37067 placement
var Messages = [1, "com.amazonaws.bedrockruntime", "Messages", 0, [() => Message, 0]];
//@ chunk-ayc8mk37.js:37067-37219 placement
var SearchResultContentBlocks = [
  1,
  "com.amazonaws.bedrockruntime",
  "SearchResultContentBlocks",
  0,
  () => SearchResultContentBlock,
];
var SystemContentBlocks = [
  1,
  "com.amazonaws.bedrockruntime",
  "SystemContentBlocks",
  0,
  [() => SystemContentBlock, 0],
];
//@ chunk-ayc8mk37.js:37219-37351 placement
var ToolResultContentBlocks = [
  1,
  "com.amazonaws.bedrockruntime",
  "ToolResultContentBlocks",
  0,
  () => ToolResultContentBlock,
];
var Tools = [1, "com.amazonaws.bedrockruntime", "Tools", 0, () => Tool];
//@ chunk-ayc8mk37.js:37351-37962 placement
var CitationGeneratedContent = [
  3,
  "com.amazonaws.bedrockruntime",
  "CitationGeneratedContent",
  0,
  ["text"],
  [0],
];
var CitationLocation = [
  3,
  "com.amazonaws.bedrockruntime",
  "CitationLocation",
  0,
  ["web", "documentChar", "documentPage", "documentChunk", "searchResultLocation"],
  [
    () => WebLocation,
    () => DocumentCharLocation,
    () => DocumentPageLocation,
    () => DocumentChunkLocation,
    () => SearchResultLocation,
  ],
];
var CitationSourceContent = [3, "com.amazonaws.bedrockruntime", "CitationSourceContent", 0, ["text"], [0]];
var ContentBlock = [
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
    () => ImageBlock,
    () => DocumentBlock,
    () => VideoBlock,
    () => ToolUseBlock,
    () => ToolResultBlock,
    [() => GuardrailConverseContentBlock, 0],
    () => CachePointBlock,
    [() => ReasoningContentBlock, 0],
    () => CitationsContentBlock,
    () => SearchResultBlock,
  ],
];
//@ chunk-ayc8mk37.js:37962-38270 placement
var CountTokensInput = [
  3,
  "com.amazonaws.bedrockruntime",
  "CountTokensInput",
  0,
  ["invokeModel", "converse"],
  [
    [() => InvokeModelTokensRequest, 0],
    [() => ConverseTokensRequest, 0],
  ],
];
var DocumentContentBlock = [3, "com.amazonaws.bedrockruntime", "DocumentContentBlock", 0, ["text"], [0]];
var DocumentSource = [
  3,
  "com.amazonaws.bedrockruntime",
  "DocumentSource",
  0,
  ["bytes", "s3Location", "text", "content"],
  [21, () => S3Location, 0, () => DocumentContentBlocks],
];
//@ chunk-ayc8mk37.js:38270-38469 placement
var GuardrailConverseContentBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "GuardrailConverseContentBlock",
  0,
  ["text", "image"],
  [() => GuardrailConverseTextBlock, [() => GuardrailConverseImageBlock, 0]],
];
var GuardrailConverseImageSource = [
  3,
  "com.amazonaws.bedrockruntime",
  "GuardrailConverseImageSource",
  8,
  ["bytes"],
  [21],
];
//@ chunk-ayc8mk37.js:38469-38562 placement
var ImageSource = [
  3,
  "com.amazonaws.bedrockruntime",
  "ImageSource",
  0,
  ["bytes", "s3Location"],
  [21, () => S3Location],
];
//@ chunk-ayc8mk37.js:38562-38682 placement
var ReasoningContentBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "ReasoningContentBlock",
  8,
  ["reasoningText", "redactedContent"],
  [[() => ReasoningTextBlock, 0], 21],
];
//@ chunk-ayc8mk37.js:38682-39085 placement
var SystemContentBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "SystemContentBlock",
  0,
  ["text", "guardContent", "cachePoint"],
  [0, [() => GuardrailConverseContentBlock, 0], () => CachePointBlock],
];
var Tool = [
  3,
  "com.amazonaws.bedrockruntime",
  "Tool",
  0,
  ["toolSpec", "systemTool", "cachePoint"],
  [() => ToolSpecification, () => SystemTool, () => CachePointBlock],
];
var ToolChoice = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolChoice",
  0,
  ["auto", "any", "tool"],
  [() => AutoToolChoice, () => AnyToolChoice, () => SpecificToolChoice],
];
var ToolInputSchema = [3, "com.amazonaws.bedrockruntime", "ToolInputSchema", 0, ["json"], [15]];
//@ chunk-ayc8mk37.js:39085-39336 placement
var ToolResultContentBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolResultContentBlock",
  0,
  ["json", "text", "image", "document", "video", "searchResult"],
  [15, 0, () => ImageBlock, () => DocumentBlock, () => VideoBlock, () => SearchResultBlock],
];
var VideoSource = [
  3,
  "com.amazonaws.bedrockruntime",
  "VideoSource",
  0,
  ["bytes", "s3Location"],
  [21, () => S3Location],
];
//@ chunk-ayc8mk37.js:39336-39462 layout
var CountTokens = [
  9,
  "com.amazonaws.bedrockruntime",
  "CountTokens",
  {
    ["http"]: ["POST", "/model/{modelId}/count-tokens", 200],
  },
  () => CountTokensRequest,
  () => CountTokensResponse,
];
//@ chunk-ayc8mk37.js:39462-39490 esm-layout
var middlewareEndpoint; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_client_7;
deferInit("chunk-ayc8mk37.js:39462", () => {
  middlewareEndpoint = __toESM(require_middleware_endpoint());
  import_client_7 = __toESM(require_client());
});
//@ chunk-ayc8mk37.js:39490-39746 esm-fingerprint
let CountTokensCommand; // deferred: uses middlewareEndpoint of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayc8mk37.js:39490", () => {
  CountTokensCommand = class CountTokensCommand extends (
    import_client_7.Command.classBuilder()
      .ep(commonParams)
      .m(function (Command, cs, config, o) {
        return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
      })
      .s("AmazonBedrockFrontendService", "CountTokens", {})
      .n("BedrockRuntimeClient", "CountTokensCommand")
      .sc(CountTokens)
      .build()
  ) {};
});

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js");
export {
  ToolInputSchema,
  InternalServerException,
  ModelStreamErrorException,
  ModelTimeoutException,
  ServiceUnavailableException,
  ThrottlingException,
  ValidationException,
  BedrockRuntimeServiceException,
  BedrockRuntimeClient,
  CountTokensCommand,
};

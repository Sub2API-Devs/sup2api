/**
 * @aws-sdk/client-bedrock/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-gkj73j15.js (55)
 * attribution: esm-fingerprint 17, placement 5, esm-layout 5, layout 28
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_core_2 } from "../../core/dist-cjs/index.js";
import { require_util_user_agent_node } from "../../util-user-agent-node/dist-cjs/index.js";
import { require_index_native } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_core } from "../../../@smithy/core/dist-cjs/index.js";
import { hashModule, bodyLengthNodeModule } from "../../../unresolved-cjs/index.js";
import { require_retry } from "../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { require_node_config_provider } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { require_node_http_handler } from "../../../@smithy/node-http-handler/dist-cjs/index.js";
import { require_index_browser as require_index_browser_2 } from "../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { require_protocols } from "../../core/dist-cjs/submodules/protocols/index.js";
import { require_client } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_url_parser } from "../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../../../@smithy/util-utf8/dist-cjs/index.js";
import { require_util_endpoints } from "../../util-endpoints/dist-cjs/index.js";
import { require_index_browser } from "../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { require_region_config_resolver } from "../../region-config-resolver/dist-cjs/index.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import {
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
  defaultBedrockHttpAuthSchemeParametersProvider,
} from "./auth/httpAuthSchemeProvider.js";
import { getRuntimeConfig_2 } from "./runtimeConfig.js";
import { require_schema } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { require_middleware_endpoint } from "../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-gkj73j15.js:1886-2245 esm-fingerprint
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
//@ chunk-gkj73j15.js:2245-5230 placement
var packageJson = {
  name: "@aws-sdk/client-bedrock",
  description: "AWS SDK for JavaScript Bedrock Client for Node.js, Browser and React Native",
  version: "3.936.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "node ../../scripts/compilation/inline client-bedrock",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "extract:docs": "api-extractor run --local",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo bedrock",
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "5.2.0",
    "@aws-crypto/sha256-js": "5.2.0",
    "@aws-sdk/core": "3.936.0",
    "@aws-sdk/credential-provider-node": "3.936.0",
    "@aws-sdk/middleware-host-header": "3.936.0",
    "@aws-sdk/middleware-logger": "3.936.0",
    "@aws-sdk/middleware-recursion-detection": "3.936.0",
    "@aws-sdk/middleware-user-agent": "3.936.0",
    "@aws-sdk/region-config-resolver": "3.936.0",
    "@aws-sdk/token-providers": "3.936.0",
    "@aws-sdk/types": "3.936.0",
    "@aws-sdk/util-endpoints": "3.936.0",
    "@aws-sdk/util-user-agent-browser": "3.936.0",
    "@aws-sdk/util-user-agent-node": "3.936.0",
    "@smithy/config-resolver": "^4.4.3",
    "@smithy/core": "^3.18.5",
    "@smithy/fetch-http-handler": "^5.3.6",
    "@smithy/hash-node": "^4.2.5",
    "@smithy/invalid-dependency": "^4.2.5",
    "@smithy/middleware-content-length": "^4.2.5",
    "@smithy/middleware-endpoint": "^4.3.12",
    "@smithy/middleware-retry": "^4.4.12",
    "@smithy/middleware-serde": "^4.2.6",
    "@smithy/middleware-stack": "^4.2.5",
    "@smithy/node-config-provider": "^4.3.5",
    "@smithy/node-http-handler": "^4.4.5",
    "@smithy/protocol-http": "^5.3.5",
    "@smithy/smithy-client": "^4.9.8",
    "@smithy/types": "^4.9.0",
    "@smithy/url-parser": "^4.2.5",
    "@smithy/util-base64": "^4.3.0",
    "@smithy/util-body-length-browser": "^4.2.0",
    "@smithy/util-body-length-node": "^4.2.1",
    "@smithy/util-defaults-mode-browser": "^4.3.11",
    "@smithy/util-defaults-mode-node": "^4.2.14",
    "@smithy/util-endpoints": "^3.2.5",
    "@smithy/util-middleware": "^4.2.5",
    "@smithy/util-retry": "^4.2.5",
    "@smithy/util-utf8": "^4.2.0",
    tslib: "^2.6.2",
  },
  devDependencies: {
    "@tsconfig/node18": "18.2.4",
    "@types/node": "^18.19.69",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typescript: "~5.8.3",
  },
  engines: {
    node: ">=18.0.0",
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": ["dist-types/ts3.4/*"],
    },
  },
  files: ["dist-*/**"],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/",
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser",
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native",
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-bedrock",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-bedrock",
  },
};
//@ chunk-gkj73j15.js:5230-5245 placement
var import_core_4 = __toESM(require_core_2());
//@ chunk-gkj73j15.js:5245-5356 placement
var import_util_user_agent_node = __toESM(require_util_user_agent_node());
var import_index_native_2 = __toESM(require_index_native());
var import_core_5 = __toESM(require_core());
var eventStreamCodec = __toESM(hashModule());
var import_retry_2 = __toESM(require_retry());
var import_node_config_provider = __toESM(require_node_config_provider());
var import_node_http_handler = __toESM(require_node_http_handler());
var utilBodyLength = __toESM(bodyLengthNodeModule());
var import_index_browser = __toESM(require_index_browser_2());
//@ chunk-gkj73j15.js:5356-5443 placement
var import_core_6 = __toESM(require_core_2());
var import_protocols = __toESM(require_protocols());
var import_core_7 = __toESM(require_core());
var import_client_2 = __toESM(require_client());
var import_url_parser = __toESM(require_url_parser());
var import_credential_provider_web_identity = __toESM(base64Module());
var import_util_utf8 = __toESM(require_util_utf8());
//@ chunk-gkj73j15.js:5443-5471 placement
var import_util_endpoints = __toESM(require_util_endpoints());
var import_index_browser_2 = __toESM(require_index_browser());
//@ chunk-gkj73j15.js:10758-10796 esm-layout
var regionConfigResolver; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var protocolHttp;
var import_client_5;
deferInit("chunk-gkj73j15.js:10758", () => {
  regionConfigResolver = __toESM(require_region_config_resolver());
  protocolHttp = __toESM(require_protocol_http());
  import_client_5 = __toESM(require_client());
});
//@ chunk-gkj73j15.js:10796-11322 esm-fingerprint
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
//@ chunk-gkj73j15.js:11322-11660 esm-fingerprint
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
//@ chunk-gkj73j15.js:11660-12750 esm-fingerprint
let BedrockClient; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gkj73j15.js:11660", () => {
  BedrockClient = class BedrockClient extends import_client.Client {
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
      let _config_7 = resolveHttpAuthSchemeConfig(_config_6);
      let _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
      this.config = _config_8;
      this.middlewareStack.use(import_schema.getSchemaSerdePlugin(this.config));
      this.middlewareStack.use(import_middleware_user_agent.getUserAgentPlugin(this.config));
      this.middlewareStack.use(import_retry.getRetryPlugin(this.config));
      this.middlewareStack.use(import_middleware_host_header_2.getContentLengthPlugin(this.config));
      this.middlewareStack.use(import_middleware_host_header.getHostHeaderPlugin(this.config));
      this.middlewareStack.use(import_middleware_logger.getLoggerPlugin(this.config));
      this.middlewareStack.use(
        import_middleware_recursion_detection.getRecursionDetectionPlugin(this.config),
      );
      this.middlewareStack.use(
        import_core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultBedrockHttpAuthSchemeParametersProvider,
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
  };
});
//@ chunk-gkj73j15.js:12750-12765 esm-layout
var schema; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gkj73j15.js:12750", () => {
  schema = __toESM(require_schema());
});
//@ chunk-gkj73j15.js:12765-12781 esm-layout
var import_client_6; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gkj73j15.js:12765", () => {
  import_client_6 = __toESM(require_client());
});
//@ chunk-gkj73j15.js:12781-12882 esm-fingerprint
let BedrockServiceException$1; // deferred: uses import_client_6 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:12781", () => {
  BedrockServiceException$1 = class BedrockServiceException$1 extends import_client_6.ServiceException {
    constructor(options) {
      super(options);
      Object.setPrototypeOf(this, BedrockServiceException$1.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:12882-13060 esm-fingerprint
let AccessDeniedException_2; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:12882", () => {
  AccessDeniedException_2 = class AccessDeniedException_2 extends BedrockServiceException$1 {
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
//@ chunk-gkj73j15.js:13060-13242 esm-fingerprint
let InternalServerException_2; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:13060", () => {
  InternalServerException_2 = class InternalServerException_2 extends BedrockServiceException$1 {
    name = "InternalServerException";
    $fault = "server";
    constructor(opts) {
      super({
        name: "InternalServerException",
        $fault: "server",
        ...opts,
      });
      Object.setPrototypeOf(this, InternalServerException_2.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:13242-13428 esm-fingerprint
let ResourceNotFoundException$1; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:13242", () => {
  ResourceNotFoundException$1 = class ResourceNotFoundException$1 extends BedrockServiceException$1 {
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ResourceNotFoundException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ResourceNotFoundException$1.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:13428-13602 esm-fingerprint
let ThrottlingException$1; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:13428", () => {
  ThrottlingException$1 = class ThrottlingException$1 extends BedrockServiceException$1 {
    name = "ThrottlingException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ThrottlingException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ThrottlingException$1.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:13602-13776 esm-fingerprint
let ValidationException$1; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:13602", () => {
  ValidationException$1 = class ValidationException$1 extends BedrockServiceException$1 {
    name = "ValidationException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ValidationException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ValidationException$1.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:13776-13946 esm-fingerprint
let ConflictException_2; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:13776", () => {
  ConflictException_2 = class ConflictException_2 extends BedrockServiceException$1 {
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
//@ chunk-gkj73j15.js:13946-14140 esm-fingerprint
let ServiceQuotaExceededException$1; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:13946", () => {
  ServiceQuotaExceededException$1 = class ServiceQuotaExceededException$1 extends BedrockServiceException$1 {
    name = "ServiceQuotaExceededException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ServiceQuotaExceededException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ServiceQuotaExceededException$1.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:14140-14362 esm-fingerprint
let TooManyTagsException$1; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:14140", () => {
  TooManyTagsException$1 = class TooManyTagsException$1 extends BedrockServiceException$1 {
    name = "TooManyTagsException";
    $fault = "client";
    resourceName;
    constructor(opts) {
      super({
        name: "TooManyTagsException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, TooManyTagsException$1.prototype);
      this.resourceName = opts.resourceName;
    }
  };
});
//@ chunk-gkj73j15.js:14362-14542 esm-fingerprint
let ResourceInUseException_2; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:14362", () => {
  ResourceInUseException_2 = class ResourceInUseException_2 extends BedrockServiceException$1 {
    name = "ResourceInUseException";
    $fault = "client";
    constructor(opts) {
      super({
        name: "ResourceInUseException",
        $fault: "client",
        ...opts,
      });
      Object.setPrototypeOf(this, ResourceInUseException_2.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:14542-14732 esm-fingerprint
let ServiceUnavailableException$1; // deferred: uses BedrockServiceException$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:14542", () => {
  ServiceUnavailableException$1 = class ServiceUnavailableException$1 extends BedrockServiceException$1 {
    name = "ServiceUnavailableException";
    $fault = "server";
    constructor(opts) {
      super({
        name: "ServiceUnavailableException",
        $fault: "server",
        ...opts,
      });
      Object.setPrototypeOf(this, ServiceUnavailableException$1.prototype);
    }
  };
});
//@ chunk-gkj73j15.js:14732-14801 layout
var EvaluationDatasetMetricConfigs = [0, "com.amazonaws.bedrock", "InferenceProfileDescription", 8, 0];
//@ chunk-gkj73j15.js:14801-14916 layout
var AccessDeniedException = [
  -3,
  "com.amazonaws.bedrock",
  "AccessDeniedException",
  {
    ["error"]: "client",
    ["httpError"]: 403,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:14916-14980 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:14916", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(
    AccessDeniedException,
    AccessDeniedException_2,
  );
});
//@ chunk-gkj73j15.js:14980-15091 layout
var ConflictException = [
  -3,
  "com.amazonaws.bedrock",
  "ConflictException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:15091-15155 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:15091", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(ConflictException, ConflictException_2);
});
//@ chunk-gkj73j15.js:15155-15488 layout
var GetInferenceProfileRequest = [
  3,
  "com.amazonaws.bedrock",
  "GetInferenceProfileRequest",
  0,
  ["inferenceProfileIdentifier"],
  [[0, 1]],
];
var GetInferenceProfileResponse = [
  3,
  "com.amazonaws.bedrock",
  "GetInferenceProfileResponse",
  0,
  [
    "inferenceProfileName",
    "description",
    "createdAt",
    "updatedAt",
    "inferenceProfileArn",
    "models",
    "inferenceProfileId",
    "status",
    "type",
  ],
  [
    0,
    [() => EvaluationDatasetMetricConfigs, 0],
    5,
    5,
    0,
    () => AutomatedReasoningPolicyDefinitionTypeList,
    0,
    0,
    0,
  ],
];
//@ chunk-gkj73j15.js:15488-15903 layout
var InferenceProfileModel = [3, "com.amazonaws.bedrock", "InferenceProfileModel", 0, ["modelArn"], [0]];
var InferenceProfileSummary = [
  3,
  "com.amazonaws.bedrock",
  "InferenceProfileSummary",
  0,
  [
    "inferenceProfileName",
    "description",
    "createdAt",
    "updatedAt",
    "inferenceProfileArn",
    "models",
    "inferenceProfileId",
    "status",
    "type",
  ],
  [
    0,
    [() => EvaluationDatasetMetricConfigs, 0],
    5,
    5,
    0,
    () => AutomatedReasoningPolicyDefinitionTypeList,
    0,
    0,
    0,
  ],
];
var InternalServerException = [
  -3,
  "com.amazonaws.bedrock",
  "InternalServerException",
  {
    ["error"]: "server",
    ["httpError"]: 500,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:15903-15967 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:15903", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(
    InternalServerException,
    InternalServerException_2,
  );
});
//@ chunk-gkj73j15.js:15967-16291 layout
var ListInferenceProfilesRequest = [
  3,
  "com.amazonaws.bedrock",
  "ListInferenceProfilesRequest",
  0,
  ["maxResults", "nextToken", "typeEquals"],
  [
    [
      1,
      {
        ["httpQuery"]: "maxResults",
      },
    ],
    [
      0,
      {
        ["httpQuery"]: "nextToken",
      },
    ],
    [
      0,
      {
        ["httpQuery"]: "type",
      },
    ],
  ],
];
var ListInferenceProfilesResponse = [
  3,
  "com.amazonaws.bedrock",
  "ListInferenceProfilesResponse",
  0,
  ["inferenceProfileSummaries", "nextToken"],
  [[() => InferenceProfileSummaries, 0], 0],
];
//@ chunk-gkj73j15.js:16291-16407 layout
var ResourceInUseException = [
  -3,
  "com.amazonaws.bedrock",
  "ResourceInUseException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:16407-16471 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:16407", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(
    ResourceInUseException,
    ResourceInUseException_2,
  );
});
//@ chunk-gkj73j15.js:16471-16590 layout
var ResourceNotFoundException = [
  -3,
  "com.amazonaws.bedrock",
  "ResourceNotFoundException",
  {
    ["error"]: "client",
    ["httpError"]: 404,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:16590-16654 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:16590", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(
    ResourceNotFoundException,
    ResourceNotFoundException$1,
  );
});
//@ chunk-gkj73j15.js:16654-16777 layout
var ServiceQuotaExceededException = [
  -3,
  "com.amazonaws.bedrock",
  "ServiceQuotaExceededException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:16777-16841 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:16777", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(
    ServiceQuotaExceededException,
    ServiceQuotaExceededException$1,
  );
});
//@ chunk-gkj73j15.js:16841-16962 layout
var ServiceUnavailableException = [
  -3,
  "com.amazonaws.bedrock",
  "ServiceUnavailableException",
  {
    ["error"]: "server",
    ["httpError"]: 503,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:16962-17026 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:16962", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(
    ServiceUnavailableException,
    ServiceUnavailableException$1,
  );
});
//@ chunk-gkj73j15.js:17026-17139 layout
var ThrottlingException = [
  -3,
  "com.amazonaws.bedrock",
  "ThrottlingException",
  {
    ["error"]: "client",
    ["httpError"]: 429,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:17139-17203 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:17139", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(ThrottlingException, ThrottlingException$1);
});
//@ chunk-gkj73j15.js:17203-17334 layout
var TooManyTagsException = [
  -3,
  "com.amazonaws.bedrock",
  "TooManyTagsException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message", "resourceName"],
  [0, 0],
];
//@ chunk-gkj73j15.js:17334-17398 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:17334", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(
    TooManyTagsException,
    TooManyTagsException$1,
  );
});
//@ chunk-gkj73j15.js:17398-17511 layout
var ValidationException = [
  -3,
  "com.amazonaws.bedrock",
  "ValidationException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-gkj73j15.js:17511-17575 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:17511", () => {
  schema.TypeRegistry.for("com.amazonaws.bedrock").registerError(ValidationException, ValidationException$1);
});
//@ chunk-gkj73j15.js:17575-17669 layout
var BedrockServiceException = [
  -3,
  "smithy.ts.sdk.synthetic.com.amazonaws.bedrock",
  "BedrockServiceException",
  0,
  [],
  [],
];
//@ chunk-gkj73j15.js:17669-17757 layout
// deferred: uses schema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:17669", () => {
  schema.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.bedrock").registerError(
    BedrockServiceException,
    BedrockServiceException$1,
  );
});
//@ chunk-gkj73j15.js:17757-17898 layout
var AutomatedReasoningPolicyDefinitionTypeList = [
  1,
  "com.amazonaws.bedrock",
  "InferenceProfileModels",
  0,
  () => InferenceProfileModel,
];
var InferenceProfileSummaries = [
  1,
  "com.amazonaws.bedrock",
  "InferenceProfileSummaries",
  0,
  [() => InferenceProfileSummary, 0],
];
//@ chunk-gkj73j15.js:17898-18043 layout
var GetInferenceProfile = [
  9,
  "com.amazonaws.bedrock",
  "GetInferenceProfile",
  {
    ["http"]: ["GET", "/inference-profiles/{inferenceProfileIdentifier}", 200],
  },
  () => GetInferenceProfileRequest,
  () => GetInferenceProfileResponse,
];
//@ chunk-gkj73j15.js:18043-18161 layout
var ListInferenceProfiles = [
  9,
  "com.amazonaws.bedrock",
  "ListInferenceProfiles",
  {
    ["http"]: ["GET", "/inference-profiles", 200],
  },
  () => ListInferenceProfilesRequest,
  () => ListInferenceProfilesResponse,
];
//@ chunk-gkj73j15.js:18161-18189 esm-layout
var import_middleware_endpoint_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_client_7;
deferInit("chunk-gkj73j15.js:18161", () => {
  import_middleware_endpoint_2 = __toESM(require_middleware_endpoint());
  import_client_7 = __toESM(require_client());
});
//@ chunk-gkj73j15.js:18189-18456 esm-fingerprint
let GetInferenceProfileCommand; // deferred: uses import_middleware_endpoint_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:18189", () => {
  GetInferenceProfileCommand = class GetInferenceProfileCommand extends (
    import_client_7.Command.classBuilder()
      .ep(commonParams)
      .m(function (Command, cs, config, o) {
        return [
          import_middleware_endpoint_2.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        ];
      })
      .s("AmazonBedrockControlPlaneService", "GetInferenceProfile", {})
      .n("BedrockClient", "GetInferenceProfileCommand")
      .sc(GetInferenceProfile)
      .build()
  ) {};
});
//@ chunk-gkj73j15.js:18456-18484 esm-layout
var import_middleware_endpoint_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_client_8;
deferInit("chunk-gkj73j15.js:18456", () => {
  import_middleware_endpoint_3 = __toESM(require_middleware_endpoint());
  import_client_8 = __toESM(require_client());
});
//@ chunk-gkj73j15.js:18484-18755 esm-fingerprint
let ListInferenceProfilesCommand; // deferred: uses import_middleware_endpoint_3 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gkj73j15.js:18484", () => {
  ListInferenceProfilesCommand = class ListInferenceProfilesCommand extends (
    import_client_8.Command.classBuilder()
      .ep(commonParams)
      .m(function (Command, cs, config, o) {
        return [
          import_middleware_endpoint_3.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        ];
      })
      .s("AmazonBedrockControlPlaneService", "ListInferenceProfiles", {})
      .n("BedrockClient", "ListInferenceProfilesCommand")
      .sc(ListInferenceProfiles)
      .build()
  ) {};
});

// The import cycle this module closes (4 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/@aws-sdk/client-bedrock/dist-cjs/index.js");
export {
  import_index_browser_2,
  import_util_endpoints,
  import_credential_provider_web_identity,
  import_core_6,
  import_core_7,
  import_client_2,
  import_protocols,
  import_url_parser,
  import_util_utf8,
  import_core_4,
  import_node_config_provider,
  utilBodyLength,
  import_util_user_agent_node,
  packageJson,
  import_core_5,
  import_retry_2,
  import_index_native_2,
  import_node_http_handler,
  import_index_browser,
  eventStreamCodec,
  BedrockClient,
  GetInferenceProfileCommand,
  ListInferenceProfilesCommand,
};

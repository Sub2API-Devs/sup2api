/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-ayc8mk37.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_middleware_host_header_2 } from "../../../middleware-host-header/dist-cjs/index.js";
import { require_middleware_endpoint } from "../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { require_retry } from "../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { require_client } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_core_2 } from "../../../core/dist-cjs/index.js";
import { require_core } from "../../../../@smithy/core/dist-cjs/index.js";
import { require_util_middleware } from "../../../../@smithy/util-middleware/dist-cjs/index.js";

//@ chunk-ayc8mk37.js:13451-13503 esm-layout
var import_middleware_host_header_2 = __toESM(require_middleware_host_header_2());
var import_middleware_endpoint = __toESM(require_middleware_endpoint());
var import_retry_2 = __toESM(require_retry());
var import_client_2 = __toESM(require_client());
//@ chunk-ayc8mk37.js:13503-13731 esm-layout
var import_core_4 = __toESM(require_core_2());
var import_core_5 = __toESM(require_core());
var import_util_middleware = __toESM(require_util_middleware());
var defaultBedrockRuntimeHttpAuthSchemeParametersProvider = async (config, context, input) => ({
  operation: import_util_middleware.getSmithyContext(context).operation,
  region:
    (await import_util_middleware.normalizeProvider(config.region)()) ||
    (() => {
      throw Error("expected `region` to be configured for `aws.auth#sigv4`");
    })(),
});
//@ chunk-ayc8mk37.js:13731-13901 esm-fingerprint
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "bedrock",
      region: authParameters.region,
    },
    propertiesExtractor: (config, context) => ({
      signingProperties: {
        config,
        context,
      },
    }),
  };
}
//@ chunk-ayc8mk37.js:13901-14117 esm-fingerprint
function createSmithyApiHttpBearerAuthHttpAuthOption(authParameters) {
  return {
    schemeId: "smithy.api#httpBearerAuth",
    propertiesExtractor: ({ profile, filepath, configFilepath, ignoreCache }, context) => ({
      identityProperties: {
        profile,
        filepath,
        configFilepath,
        ignoreCache,
      },
    }),
  };
}
//@ chunk-ayc8mk37.js:14117-14441 esm-fingerprint
var defaultBedrockRuntimeHttpAuthSchemeProvider = (authParameters) => {
  let options = [];
  switch (authParameters.operation) {
    default:
      options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
      options.push(createSmithyApiHttpBearerAuthHttpAuthOption(authParameters));
  }
  return options;
};
var resolveHttpAuthSchemeConfig = (config) => {
  let token = import_core_5.memoizeIdentityProvider(
    config.token,
    import_core_5.isIdentityExpired,
    import_core_5.doesIdentityRequireRefresh,
  );
  let config_0 = import_core_4.resolveAwsSdkSigV4Config(config);
  return Object.assign(config_0, {
    authSchemePreference: import_util_middleware.normalizeProvider(config.authSchemePreference ?? []),
    token,
  });
};
export {
  import_client_2,
  import_retry_2,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_middleware_host_header_2,
  defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
  defaultBedrockRuntimeHttpAuthSchemeProvider,
};

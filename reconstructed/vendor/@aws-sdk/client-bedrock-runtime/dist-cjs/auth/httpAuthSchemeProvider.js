/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/auth/httpAuthSchemeProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { require_middleware_host_header_2 } from "../../../middleware-host-header/dist-cjs/index.js";
import { require_middleware_endpoint } from "../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { require_retry } from "../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { require_client } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_core as require_core_2 } from "../../../core/dist-cjs/index.js";
import { require_core } from "../../../../@smithy/core/dist-cjs/index.js";
import { require_util_middleware } from "../../../../@smithy/util-middleware/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:13451-13503 esm-layout
var import_middleware_host_header_2 = Re(require_middleware_host_header_2());
var import_middleware_endpoint = Re(require_middleware_endpoint());
var import_retry = Re(require_retry());
var import_client = Re(require_client());
//@ chunk-3cddmtk7.js:13503-13731 esm-layout
var import_core_2 = Re(require_core_2());
var import_core_3 = Re(require_core());
var import_util_middleware = Re(require_util_middleware());
var defaultBedrockRuntimeHttpAuthSchemeParametersProvider = async (config, context, input) => ({
  operation: import_util_middleware.getSmithyContext(context).operation,
  region:
    (await import_util_middleware.normalizeProvider(config.region)()) ||
    (() => {
      throw Error("expected `region` to be configured for `aws.auth#sigv4`");
    })(),
});
//@ chunk-3cddmtk7.js:13731-13901 esm-fingerprint
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
//@ chunk-3cddmtk7.js:13901-14117 esm-fingerprint
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
//@ chunk-3cddmtk7.js:14117-14441 esm-fingerprint
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
  let token = import_core_3.memoizeIdentityProvider(
    config.token,
    import_core_3.isIdentityExpired,
    import_core_3.doesIdentityRequireRefresh,
  );
  let config_0 = import_core_2.resolveAwsSdkSigV4Config(config);
  return Object.assign(config_0, {
    authSchemePreference: import_util_middleware.normalizeProvider(config.authSchemePreference ?? []),
    token,
  });
};
export {
  import_client,
  import_retry,
  import_middleware_endpoint,
  resolveHttpAuthSchemeConfig,
  import_middleware_host_header_2,
  defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
  defaultBedrockRuntimeHttpAuthSchemeProvider,
};

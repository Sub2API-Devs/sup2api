/**
 * @aws-sdk/client-bedrock/dist-cjs/runtimeConfig.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-gkj73j15.js (1)
 * attribution: esm-layout 1
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_client } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_node_config_provider_2 } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { getRuntimeConfig } from "./runtimeConfig.shared.js";
import {
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
} from "./index.js";
import { defaultProvider } from "../../credential-provider-node/dist-cjs/index.js";
import { fromEnvSigningName, fromSsoClient } from "../../token-providers/dist-cjs/index.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-gkj73j15.js:8876-10758 esm-layout
var import_client_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var import_node_config_provider_2;
var import_client_4;
var getRuntimeConfig_2;
deferInit("chunk-gkj73j15.js:8876", () => {
  import_client_3 = __toESM(require_client());
  import_node_config_provider_2 = __toESM(require_node_config_provider_2());
  import_client_4 = __toESM(require_client());
  getRuntimeConfig_2 = (config) => {
    import_client_4.emitWarningIfUnsupportedVersion(process.version);
    let defaultsMode = import_node_config_provider_2.resolveDefaultsModeConfig(config);
    let defaultConfigProvider = () => defaultsMode().then(import_client_3.loadConfigsForDefaultMode);
    let clientSharedValues = getRuntimeConfig(config);
    import_core_4.emitWarningIfUnsupportedVersion(process.version);
    let loaderConfig = {
      profile: config?.profile,
      logger: clientSharedValues.logger,
      signingName: "bedrock",
    };
    return {
      ...clientSharedValues,
      ...config,
      runtime: "node",
      defaultsMode,
      authSchemePreference:
        config?.authSchemePreference ??
        import_node_config_provider.loadConfig(
          import_core_4.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
          loaderConfig,
        ),
      bodyLengthChecker: config?.bodyLengthChecker ?? utilBodyLength.calculateBodyLength,
      credentialDefaultProvider: config?.credentialDefaultProvider ?? defaultProvider,
      defaultUserAgentProvider:
        config?.defaultUserAgentProvider ??
        import_util_user_agent_node.createDefaultUserAgentProvider({
          serviceId: clientSharedValues.serviceId,
          clientVersion: packageJson.version,
        }),
      httpAuthSchemes: config?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
          signer: new import_core_4.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#httpBearerAuth",
          identityProvider: (ipc) =>
            ipc.getIdentityProvider("smithy.api#httpBearerAuth") ||
            (async (idProps) => {
              try {
                return await fromEnvSigningName({
                  signingName: "bedrock",
                })();
              } catch (error) {
                return await fromSsoClient(idProps)(idProps);
              }
            }),
          signer: new import_core_5.HttpBearerAuthSigner(),
        },
      ],
      maxAttempts:
        config?.maxAttempts ??
        import_node_config_provider.loadConfig(import_retry_2.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
      region:
        config?.region ??
        import_node_config_provider.loadConfig(import_index_native_2.NODE_REGION_CONFIG_OPTIONS, {
          ...import_index_native_2.NODE_REGION_CONFIG_FILE_OPTIONS,
          ...loaderConfig,
        }),
      requestHandler: import_node_http_handler.NodeHttpHandler.create(
        config?.requestHandler ?? defaultConfigProvider,
      ),
      retryMode:
        config?.retryMode ??
        import_node_config_provider.loadConfig(
          {
            ...import_retry_2.NODE_RETRY_MODE_CONFIG_OPTIONS,
            default: async () =>
              (await defaultConfigProvider()).retryMode || import_index_browser.DEFAULT_RETRY_MODE,
          },
          config,
        ),
      sha256: config?.sha256 ?? eventStreamCodec.Hash.bind(null, "sha256"),
      streamCollector: config?.streamCollector ?? import_node_http_handler.streamCollector,
      useDualstackEndpoint:
        config?.useDualstackEndpoint ??
        import_node_config_provider.loadConfig(
          import_index_native_2.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS,
          loaderConfig,
        ),
      useFipsEndpoint:
        config?.useFipsEndpoint ??
        import_node_config_provider.loadConfig(
          import_index_native_2.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS,
          loaderConfig,
        ),
      userAgentAppId:
        config?.userAgentAppId ??
        import_node_config_provider.loadConfig(
          import_util_user_agent_node.NODE_APP_ID_CONFIG_OPTIONS,
          loaderConfig,
        ),
    };
  };
});
export { getRuntimeConfig_2 };

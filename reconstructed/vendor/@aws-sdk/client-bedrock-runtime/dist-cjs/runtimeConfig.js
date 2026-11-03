/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/runtimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-layout 1
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_client } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_node_config_provider_2 } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { getRuntimeConfig } from "./runtimeConfig.shared.js";
import { import_core_4, Ee } from "../../eventstream-handler-node/dist-es/EventSigningStream.js";
import { C, Ke, Te, P, b, Je, Qe } from "../../../_unknown/bedrockRuntimeConfig.js";
import { defaultProvider } from "../../credential-provider-node/dist-cjs/index.js";
import {
  import_util_user_agent_node,
  ne,
  import_core_5,
  import_index_native_2,
} from "../../../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { fromEnvSigningName, qur } from "../../token-providers/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:24302-26372 esm-layout
var import_client_2 = Re(require_client());
var import_node_config_provider = Re(require_node_config_provider_2());
var import_client_3 = Re(require_client());
var getRuntimeConfig_2 = (config) => {
  import_client_3.emitWarningIfUnsupportedVersion(process.version);
  let defaultsMode = import_node_config_provider.resolveDefaultsModeConfig(config);
  let defaultConfigProvider = () => defaultsMode().then(import_client_2.loadConfigsForDefaultMode);
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
      C.loadConfig(import_core_4.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
    bodyLengthChecker: config?.bodyLengthChecker ?? Ke.calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? defaultProvider,
    defaultUserAgentProvider:
      config?.defaultUserAgentProvider ??
      import_util_user_agent_node.createDefaultUserAgentProvider({
        serviceId: clientSharedValues.serviceId,
        clientVersion: Ee.version,
      }),
    eventStreamPayloadHandlerProvider: config?.eventStreamPayloadHandlerProvider ?? ne,
    eventStreamSerdeProvider: config?.eventStreamSerdeProvider ?? Te,
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
              return await qur(idProps)(idProps);
            }
          }),
        signer: new import_core_5.HttpBearerAuthSigner(),
      },
    ],
    maxAttempts: config?.maxAttempts ?? C.loadConfig(P.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
    region:
      config?.region ??
      C.loadConfig(import_index_native_2.NODE_REGION_CONFIG_OPTIONS, {
        ...import_index_native_2.NODE_REGION_CONFIG_FILE_OPTIONS,
        ...loaderConfig,
      }),
    requestHandler: b.NodeHttp2Handler.create(
      config?.requestHandler ??
        (async () => ({
          ...(await defaultConfigProvider()),
          disableConcurrentStreams: true,
        })),
    ),
    retryMode:
      config?.retryMode ??
      C.loadConfig(
        {
          ...P.NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: async () => (await defaultConfigProvider()).retryMode || Je.DEFAULT_RETRY_MODE,
        },
        config,
      ),
    sha256: config?.sha256 ?? Qe.Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? b.streamCollector,
    useDualstackEndpoint:
      config?.useDualstackEndpoint ??
      C.loadConfig(import_index_native_2.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    useFipsEndpoint:
      config?.useFipsEndpoint ??
      C.loadConfig(import_index_native_2.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    userAgentAppId:
      config?.userAgentAppId ??
      C.loadConfig(import_util_user_agent_node.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig),
  };
};
export { getRuntimeConfig_2 };

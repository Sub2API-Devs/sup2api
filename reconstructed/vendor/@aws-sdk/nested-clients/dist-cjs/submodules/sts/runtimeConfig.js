/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/runtimeConfig.js
 *
 * AWS STS 运行时配置（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1), chunk-heg39xxp.js (3)
 * attribution: cjs-fingerprint 1, placement 2, esm-layout 1
 */
import { Re, x } from "../../../../../../runtime/bun-runtime.js";
import { require_core as require_core_2 } from "../../../../core/dist-cjs/index.js";
import { require_util_user_agent_node } from "../../../../util-user-agent-node/dist-cjs/index.js";
import { require_index_native } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_core } from "../../../../../@smithy/core/dist-cjs/index.js";
import { Nme, $me } from "../../../../../unresolved-cjs/index.js";
import { require_retry } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import {
  require_node_config_provider,
  require_node_config_provider_2,
} from "../../../../../@smithy/node-config-provider/dist-cjs/index.js";
import { require_node_http_handler } from "../../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { require_index_browser as require_index_browser_2 } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { getRuntimeConfig, require_runtimeConfig_shared } from "./runtimeConfig.shared.js";
import { defaultProvider } from "../../../../credential-provider-node/dist-cjs/index.js";
import { Y } from "../../../../client-sts/package.json.js";
import { require_tslib } from "../../../../../tslib/tslib.js";
import { require_package } from "../../../package.json.js";

//@ chunk-heg39xxp.js:5178-5193 placement
var import_core_3 = Re(require_core_2());
//@ chunk-heg39xxp.js:5193-5304 placement
var import_util_user_agent_node = Re(require_util_user_agent_node());
var import_index_native_2 = Re(require_index_native());
var import_core_4 = Re(require_core());
var ye = Re(Nme());
var import_retry_2 = Re(require_retry());
var import_node_config_provider = Re(require_node_config_provider());
var import_node_http_handler = Re(require_node_http_handler());
var Te = Re($me());
var import_index_browser = Re(require_index_browser_2());
//@ chunk-heg39xxp.js:11221-13020 esm-layout
var import_client_3 = Re(require_client());
var import_node_config_provider_2 = Re(require_node_config_provider_2());
var import_client_4 = Re(require_client());
var getRuntimeConfig_2 = (config) => {
  import_client_4.emitWarningIfUnsupportedVersion(process.version);
  let defaultsMode = import_node_config_provider_2.resolveDefaultsModeConfig(config);
  let defaultConfigProvider = () => defaultsMode().then(import_client_3.loadConfigsForDefaultMode);
  let clientSharedValues = getRuntimeConfig(config);
  import_core_3.emitWarningIfUnsupportedVersion(process.version);
  let loaderConfig = {
    profile: config?.profile,
    logger: clientSharedValues.logger,
  };
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    authSchemePreference:
      config?.authSchemePreference ??
      import_node_config_provider.loadConfig(import_core_3.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
    bodyLengthChecker: config?.bodyLengthChecker ?? Te.calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? defaultProvider,
    defaultUserAgentProvider:
      config?.defaultUserAgentProvider ??
      import_util_user_agent_node.createDefaultUserAgentProvider({
        serviceId: clientSharedValues.serviceId,
        clientVersion: Y.version,
      }),
    httpAuthSchemes: config?.httpAuthSchemes ?? [
      {
        schemeId: "aws.auth#sigv4",
        identityProvider: (ipc) =>
          ipc.getIdentityProvider("aws.auth#sigv4") ||
          (async (idProps) => await defaultProvider(idProps?.__config || {})()),
        signer: new import_core_3.AwsSdkSigV4Signer(),
      },
      {
        schemeId: "smithy.api#noAuth",
        identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
        signer: new import_core_4.NoAuthSigner(),
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
    sha256: config?.sha256 ?? ye.Hash.bind(null, "sha256"),
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
//@ chunk-a8ee6x44.js:7841-9866 cjs-fingerprint
var require_runtimeConfig = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getRuntimeConfig = undefined;
  var tslib_1 = require_tslib();
  var package_json_1 = tslib_1.__importDefault(require_package());
  var core_1 = require_core_2();
  var util_user_agent_node_1 = require_util_user_agent_node();
  var config_resolver_1 = require_index_native();
  var core_2 = require_core();
  var hash_node_1 = Nme();
  var middleware_retry_1 = require_retry();
  var node_config_provider_1 = require_node_config_provider();
  var node_http_handler_1 = require_node_http_handler();
  var util_body_length_node_1 = $me();
  var util_retry_1 = require_index_browser_2();
  var runtimeConfig_shared_1 = require_runtimeConfig_shared();
  var smithy_client_1 = require_client();
  var util_defaults_mode_node_1 = require_node_config_provider_2();
  var smithy_client_2 = require_client();
  var getRuntimeConfig = (config) => {
    smithy_client_2.emitWarningIfUnsupportedVersion(process.version);
    let defaultsMode = util_defaults_mode_node_1.resolveDefaultsModeConfig(config);
    let defaultConfigProvider = () => defaultsMode().then(smithy_client_1.loadConfigsForDefaultMode);
    let clientSharedValues = runtimeConfig_shared_1.getRuntimeConfig(config);
    core_1.emitWarningIfUnsupportedVersion(process.version);
    let loaderConfig = {
      profile: config?.profile,
      logger: clientSharedValues.logger,
    };
    return {
      ...clientSharedValues,
      ...config,
      runtime: "node",
      defaultsMode,
      authSchemePreference:
        config?.authSchemePreference ??
        node_config_provider_1.loadConfig(core_1.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
      bodyLengthChecker: config?.bodyLengthChecker ?? util_body_length_node_1.calculateBodyLength,
      defaultUserAgentProvider:
        config?.defaultUserAgentProvider ??
        util_user_agent_node_1.createDefaultUserAgentProvider({
          serviceId: clientSharedValues.serviceId,
          clientVersion: package_json_1.default.version,
        }),
      httpAuthSchemes: config?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (ipc) =>
            ipc.getIdentityProvider("aws.auth#sigv4") ||
            (async (idProps) => await config.credentialDefaultProvider(idProps?.__config || {})()),
          signer: new core_1.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
          signer: new core_2.NoAuthSigner(),
        },
      ],
      maxAttempts:
        config?.maxAttempts ??
        node_config_provider_1.loadConfig(middleware_retry_1.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
      region:
        config?.region ??
        node_config_provider_1.loadConfig(config_resolver_1.NODE_REGION_CONFIG_OPTIONS, {
          ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS,
          ...loaderConfig,
        }),
      requestHandler: node_http_handler_1.NodeHttpHandler.create(
        config?.requestHandler ?? defaultConfigProvider,
      ),
      retryMode:
        config?.retryMode ??
        node_config_provider_1.loadConfig(
          {
            ...middleware_retry_1.NODE_RETRY_MODE_CONFIG_OPTIONS,
            default: async () => (await defaultConfigProvider()).retryMode || util_retry_1.DEFAULT_RETRY_MODE,
          },
          config,
        ),
      sha256: config?.sha256 ?? hash_node_1.Hash.bind(null, "sha256"),
      streamCollector: config?.streamCollector ?? node_http_handler_1.streamCollector,
      useDualstackEndpoint:
        config?.useDualstackEndpoint ??
        node_config_provider_1.loadConfig(
          config_resolver_1.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS,
          loaderConfig,
        ),
      useFipsEndpoint:
        config?.useFipsEndpoint ??
        node_config_provider_1.loadConfig(
          config_resolver_1.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS,
          loaderConfig,
        ),
      userAgentAppId:
        config?.userAgentAppId ??
        node_config_provider_1.loadConfig(util_user_agent_node_1.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig),
    };
  };
  cjsExports.getRuntimeConfig = getRuntimeConfig;
});
export { require_runtimeConfig, getRuntimeConfig_2 };

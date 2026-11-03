/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/runtimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_tslib } from "../../../../../tslib/tslib.js";
import { require_package } from "../../../package.json.js";
import { require_core as require_core_2 } from "../../../../core/dist-cjs/index.js";
import { require_util_user_agent_node } from "../../../../util-user-agent-node/dist-cjs/index.js";
import { require_index_native } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { Nme, $me } from "../../../../../unresolved-cjs/index.js";
import { require_retry } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import {
  require_node_config_provider,
  require_node_config_provider_2,
} from "../../../../../@smithy/node-config-provider/dist-cjs/index.js";
import { require_node_http_handler } from "../../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { require_index_browser as require_index_browser_2 } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { require_runtimeConfig_shared } from "./runtimeConfig.shared.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";

//@ chunk-y366fgzk.js:5894-7546 cjs-require-graph
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
export { require_runtimeConfig };

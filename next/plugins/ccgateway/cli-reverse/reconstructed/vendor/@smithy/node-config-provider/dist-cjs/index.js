/**
 * @smithy/node-config-provider/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/node-config-provider@2.3.0..3.0.0
 * pieces: chunk-3p78mpxm.js (1), chunk-cqstz3az.js (1)
 * attribution: cjs-require-graph 1, cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../property-provider/dist-cjs/index.js";
import { require_shared_ini_file_loader } from "../../shared-ini-file-loader/dist-cjs/index.js";
import { require_index_native } from "../../core/dist-cjs/submodules/config/index.native.js";

//@ chunk-cqstz3az.js:298-1420 cjs-fingerprint
var require_node_config_provider = __commonJS(function (cjsExports) {
  var import_property_provider = require_property_provider();
  var import_shared_ini_file_loader = require_shared_ini_file_loader();
  function getSelectorName(functionString) {
    try {
      let constants = new Set(Array.from(functionString.match(/([A-Z_]){3,}/g) ?? []));
      constants.delete("CONFIG");
      constants.delete("CONFIG_PREFIX_SEPARATOR");
      constants.delete("ENV");
      return [...constants].join(", ");
    } catch (error) {
      return functionString;
    }
  }
  var fromEnv = (environmentVariableSelector, options) => async () => {
    try {
      let config = environmentVariableSelector(process.env, options);
      if (config === undefined) throw Error();
      return config;
    } catch (e) {
      throw new import_property_provider.CredentialsProviderError(
        e.message || `Not found in ENV: ${getSelectorName(environmentVariableSelector.toString())}`,
        {
          logger: options?.logger,
        },
      );
    }
  };
  var fromSharedConfigFiles =
    (configFileSelector, { preferredFile = "config", ...init } = {}) =>
    async () => {
      let profile = import_shared_ini_file_loader.getProfileName(init);
      let { configFile, credentialsFile } = await import_shared_ini_file_loader.loadSharedConfigFiles(init);
      let profileFromCredentials = credentialsFile[profile] || {};
      let profileFromConfig = configFile[profile] || {};
      let mergedProfile =
        preferredFile === "config"
          ? {
              ...profileFromCredentials,
              ...profileFromConfig,
            }
          : {
              ...profileFromConfig,
              ...profileFromCredentials,
            };
      try {
        let configValue = configFileSelector(
          mergedProfile,
          preferredFile === "config" ? configFile : credentialsFile,
        );
        if (configValue === undefined) throw Error();
        return configValue;
      } catch (e) {
        throw new import_property_provider.CredentialsProviderError(
          e.message ||
            `Not found in config files w/ profile [${profile}]: ${getSelectorName(configFileSelector.toString())}`,
          {
            logger: init.logger,
          },
        );
      }
    };
  var isFunction = (func) => typeof func === "function";
  var fromStatic = (defaultValue) =>
    isFunction(defaultValue)
      ? async () => await defaultValue()
      : import_property_provider.fromStatic(defaultValue);
  var loadConfig = (
    { environmentVariableSelector, configFileSelector, default: defaultValue },
    configuration = {},
  ) => {
    let { signingName, logger } = configuration;
    let envOptions = {
      signingName,
      logger,
    };
    return import_property_provider.memoize(
      import_property_provider.chain(
        fromEnv(environmentVariableSelector, envOptions),
        fromSharedConfigFiles(configFileSelector, configuration),
        fromStatic(defaultValue),
      ),
    );
  };
  cjsExports.loadConfig = loadConfig;
});
//@ chunk-3p78mpxm.js:166742-168080 cjs-require-graph
var require_node_config_provider_2 = __commonJS(function (cjsExports) {
  var configResolverModule = require_index_native();
  var nodeConfigProviderModule = require_node_config_provider();
  var propertyProviderModule = require_property_provider();
  var AWS_EXECUTION_ENV = "AWS_EXECUTION_ENV";
  var AWS_REGION_ENV = "AWS_REGION";
  var AWS_DEFAULT_REGION_ENV = "AWS_DEFAULT_REGION";
  var ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
  var DEFAULTS_MODE_OPTIONS = ["in-region", "cross-region", "mobile", "standard", "legacy"];
  var path = "/latest/meta-data/placement/region";
  var AWS_DEFAULTS_MODE_ENV = "AWS_DEFAULTS_MODE";
  var AWS_DEFAULTS_MODE_CONFIG = "defaults_mode";
  var NODE_DEFAULTS_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[AWS_DEFAULTS_MODE_ENV],
    configFileSelector: (profile) => profile[AWS_DEFAULTS_MODE_CONFIG],
    default: "legacy",
  };
  var resolveDefaultsModeConfig = ({
    region = nodeConfigProviderModule.loadConfig(configResolverModule.NODE_REGION_CONFIG_OPTIONS),
    defaultsMode = nodeConfigProviderModule.loadConfig(NODE_DEFAULTS_MODE_CONFIG_OPTIONS),
  } = {}) =>
    propertyProviderModule.memoize(async () => {
      let mode = typeof defaultsMode === "function" ? await defaultsMode() : defaultsMode;
      switch (mode?.toLowerCase()) {
        case "auto":
          return resolveNodeDefaultsModeAuto(region);
        case "in-region":
        case "cross-region":
        case "mobile":
        case "standard":
        case "legacy":
          return Promise.resolve(mode?.toLocaleLowerCase());
        case undefined:
          return Promise.resolve("legacy");
        default:
          throw Error(
            `Invalid parameter for "defaultsMode", expect ${DEFAULTS_MODE_OPTIONS.join(", ")}, got ${mode}`,
          );
      }
    });
  var resolveNodeDefaultsModeAuto = async (clientRegion) => {
    if (clientRegion) {
      let resolvedRegion = typeof clientRegion === "function" ? await clientRegion() : clientRegion;
      let inferredRegion = await inferPhysicalRegion();
      if (!inferredRegion) return "standard";
      if (resolvedRegion === inferredRegion) return "in-region";
      else return "cross-region";
    }
    return "standard";
  };
  var inferPhysicalRegion = async () => {
    if (
      process.env[AWS_EXECUTION_ENV] &&
      (process.env[AWS_REGION_ENV] || process.env[AWS_DEFAULT_REGION_ENV])
    )
      return process.env[AWS_REGION_ENV] ?? process.env[AWS_DEFAULT_REGION_ENV];
    if (!process.env[ENV_IMDS_DISABLED])
      try {
        let { getInstanceMetadataEndpoint, httpRequest } =
          await import("../../credential-provider-imds/dist-cjs/ENV_CMDS_FULL_URI.lazy.js");
        let instanceMetadataEndpoint = await getInstanceMetadataEndpoint();
        return (
          await httpRequest({
            ...instanceMetadataEndpoint,
            path,
          })
        ).toString();
      } catch (error) {}
  };
  cjsExports.resolveDefaultsModeConfig = resolveDefaultsModeConfig;
});
export { require_node_config_provider, require_node_config_provider_2 };

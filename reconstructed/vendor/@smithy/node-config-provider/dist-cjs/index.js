/**
 * @smithy/node-config-provider/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/node-config-provider@2.3.0..3.0.0
 * pieces: chunk-b93kvvbs.js (1), chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1, cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../property-provider/dist-cjs/index.js";
import { require_shared_ini_file_loader } from "../../shared-ini-file-loader/dist-cjs/index.js";
import { require_index_native } from "../../core/dist-cjs/submodules/config/index.native.js";

//@ chunk-b93kvvbs.js:298-1420 cjs-fingerprint
var require_node_config_provider = x(function (cjsExports) {
  var import_property_provider = require_property_provider();
  var l = require_shared_ini_file_loader();
  function d(e) {
    try {
      let o = new Set(Array.from(e.match(/([A-Z_]){3,}/g) ?? []));
      o.delete("CONFIG");
      o.delete("CONFIG_PREFIX_SEPARATOR");
      o.delete("ENV");
      return [...o].join(", ");
    } catch (error) {
      return e;
    }
  }
  var h = (environmentVariableSelector, o) => async () => {
    try {
      let config = environmentVariableSelector(process.env, o);
      if (config === undefined) throw Error();
      return config;
    } catch (e) {
      throw new import_property_provider.CredentialsProviderError(
        e.message || `Not found in ENV: ${d(environmentVariableSelector.toString())}`,
        {
          logger: o?.logger,
        },
      );
    }
  };
  var w =
    (configFileSelector, { preferredFile = "config", ...init } = {}) =>
    async () => {
      let profile = l.getProfileName(init);
      let { configFile, credentialsFile } = await l.loadSharedConfigFiles(init);
      let profileFromCredentials = credentialsFile[profile] || {};
      let profileFromConfig = configFile[profile] || {};
      let m =
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
        let f = configFileSelector(m, preferredFile === "config" ? configFile : credentialsFile);
        if (f === undefined) throw Error();
        return f;
      } catch (e) {
        throw new import_property_provider.CredentialsProviderError(
          e.message ||
            `Not found in config files w/ profile [${profile}]: ${d(configFileSelector.toString())}`,
          {
            logger: init.logger,
          },
        );
      }
    };
  var F = (func) => typeof func === "function";
  var u = (defaultValue) =>
    F(defaultValue) ? async () => await defaultValue() : import_property_provider.fromStatic(defaultValue);
  var loadConfig = ({ environmentVariableSelector, configFileSelector, default: defaultValue }, n = {}) => {
    let { signingName, logger } = n;
    let s = {
      signingName,
      logger,
    };
    return import_property_provider.memoize(
      import_property_provider.chain(
        h(environmentVariableSelector, s),
        w(configFileSelector, n),
        u(defaultValue),
      ),
    );
  };
  cjsExports.loadConfig = loadConfig;
});
//@ chunk-edce4vxq.js:166742-168080 cjs-require-graph
var require_node_config_provider_2 = x(function (cjsExports) {
  var qd = require_index_native();
  var pi = require_node_config_provider();
  var Hd = require_property_provider();
  var Gd = "AWS_EXECUTION_ENV";
  var mi = "AWS_REGION";
  var gi = "AWS_DEFAULT_REGION";
  var Xd = "AWS_EC2_METADATA_DISABLED";
  var Wd = ["in-region", "cross-region", "mobile", "standard", "legacy"];
  var path = "/latest/meta-data/placement/region";
  var Qd = "AWS_DEFAULTS_MODE";
  var Yd = "defaults_mode";
  var Jd = {
    environmentVariableSelector: (e) => e[Qd],
    configFileSelector: (e) => e[Yd],
    default: "legacy",
  };
  var resolveDefaultsModeConfig = ({
    region: e = pi.loadConfig(qd.NODE_REGION_CONFIG_OPTIONS),
    defaultsMode: t = pi.loadConfig(Jd),
  } = {}) =>
    Hd.memoize(async () => {
      let r = typeof t === "function" ? await t() : t;
      switch (r?.toLowerCase()) {
        case "auto":
          return eh(e);
        case "in-region":
        case "cross-region":
        case "mobile":
        case "standard":
        case "legacy":
          return Promise.resolve(r?.toLocaleLowerCase());
        case undefined:
          return Promise.resolve("legacy");
        default:
          throw Error(`Invalid parameter for "defaultsMode", expect ${Wd.join(", ")}, got ${r}`);
      }
    });
  var eh = async (e) => {
    if (e) {
      let t = typeof e === "function" ? await e() : e;
      let r = await th();
      if (!r) return "standard";
      if (t === r) return "in-region";
      else return "cross-region";
    }
    return "standard";
  };
  var th = async () => {
    if (process.env[Gd] && (process.env[mi] || process.env[gi])) return process.env[mi] ?? process.env[gi];
    if (!process.env[Xd])
      try {
        let { getInstanceMetadataEndpoint, httpRequest } = await import("./chunk-7bg2190x.js");
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

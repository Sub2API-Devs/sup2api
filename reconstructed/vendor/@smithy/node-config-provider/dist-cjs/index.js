/**
 * @smithy/node-config-provider/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/node-config-provider@2.3.0..3.0.0
 * pieces: chunk-b93kvvbs.js (1), chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1, cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { $h } from "../../property-provider/dist-cjs/index.js";
import { hU } from "../../shared-ini-file-loader/dist-cjs/index.js";
import { dR } from "../../core/dist-cjs/submodules/config/index.native.js";

//@ chunk-b93kvvbs.js:298-1420 cjs-fingerprint
var wD = x(function (y) {
  var t = $h(),
    l = hU();
  function d(e) {
    try {
      let o = new Set(Array.from(e.match(/([A-Z_]){3,}/g) ?? []));
      return (o.delete("CONFIG"), o.delete("CONFIG_PREFIX_SEPARATOR"), o.delete("ENV"), [...o].join(", "));
    } catch (error) {
      return e;
    }
  }
  var h = (e, o) => async () => {
      try {
        let r = e(process.env, o);
        if (r === void 0) throw Error();
        return r;
      } catch (error) {
        throw new t.CredentialsProviderError(error.message || `Not found in ENV: ${d(e.toString())}`, {
          logger: o?.logger,
        });
      }
    },
    w =
      (e, { preferredFile: o = "config", ...r } = {}) =>
      async () => {
        let profileName = l.getProfileName(r),
          { configFile: configFile, credentialsFile: credentialsFile } = await l.loadSharedConfigFiles(r),
          s = credentialsFile[profileName] || {},
          g = configFile[profileName] || {},
          m = o === "config" ? { ...s, ...g } : { ...g, ...s };
        try {
          let f = e(m, o === "config" ? configFile : credentialsFile);
          if (f === void 0) throw Error();
          return f;
        } catch (error) {
          throw new t.CredentialsProviderError(
            error.message || `Not found in config files w/ profile [${profileName}]: ${d(e.toString())}`,
            { logger: r.logger },
          );
        }
      },
    F = (e) => typeof e === "function",
    u = (e) => (F(e) ? async () => await e() : t.fromStatic(e)),
    C = (
      {
        environmentVariableSelector: environmentVariableSelector,
        configFileSelector: configFileSelector,
        default: r,
      },
      n = {},
    ) => {
      let { signingName: signingName, logger: logger } = n,
        s = { signingName: signingName, logger: logger };
      return t.memoize(t.chain(h(environmentVariableSelector, s), w(configFileSelector, n), u(r)));
    };
  y.loadConfig = C;
});
//@ chunk-edce4vxq.js:166742-168080 cjs-require-graph
var Ume = x(function (rh) {
  var qd = dR(),
    pi = wD(),
    Hd = $h(),
    Gd = "AWS_EXECUTION_ENV",
    mi = "AWS_REGION",
    gi = "AWS_DEFAULT_REGION",
    Xd = "AWS_EC2_METADATA_DISABLED",
    Wd = ["in-region", "cross-region", "mobile", "standard", "legacy"],
    Kd = "/latest/meta-data/placement/region",
    Qd = "AWS_DEFAULTS_MODE",
    Yd = "defaults_mode",
    Jd = { environmentVariableSelector: (e) => e[Qd], configFileSelector: (e) => e[Yd], default: "legacy" },
    Zd = ({
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
          case void 0:
            return Promise.resolve("legacy");
          default:
            throw Error(`Invalid parameter for "defaultsMode", expect ${Wd.join(", ")}, got ${r}`);
        }
      }),
    eh = async (e) => {
      if (e) {
        let t = typeof e === "function" ? await e() : e,
          r = await th();
        if (!r) return "standard";
        if (t === r) return "in-region";
        else return "cross-region";
      }
      return "standard";
    },
    th = async () => {
      if (process.env[Gd] && (process.env[mi] || process.env[gi])) return process.env[mi] ?? process.env[gi];
      if (!process.env[Xd])
        try {
          let { getInstanceMetadataEndpoint: getInstanceMetadataEndpoint, httpRequest: httpRequest } =
              await import("./chunk-7bg2190x.js"),
            r = await getInstanceMetadataEndpoint();
          return (await httpRequest({ ...r, path: Kd })).toString();
        } catch (error) {}
    };
  rh.resolveDefaultsModeConfig = Zd;
});

export { wD, Ume };

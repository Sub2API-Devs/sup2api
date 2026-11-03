/**
 * @aws-sdk/credential-provider-node/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-node@3.936.0..3.972.2
 * pieces: chunk-j3x7ed1b.js (6)
 * attribution: esm-layout 3, esm-fingerprint 3
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { hU } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { ENV_KEY, ENV_SECRET, fromEnv } from "../../credential-provider-env/dist-cjs/index.js";

//@ chunk-j3x7ed1b.js:1021-1047 esm-layout
var c = Re($h()),
  m = Re(hU());
//@ chunk-j3x7ed1b.js:1047-1723 esm-layout
var i = Re($h()),
  AWS_EC2_METADATA_DISABLED = "AWS_EC2_METADATA_DISABLED",
  S = async (e) => {
    let {
      ENV_CMDS_FULL_URI: ENV_CMDS_FULL_URI,
      ENV_CMDS_RELATIVE_URI: ENV_CMDS_RELATIVE_URI,
      fromContainerMetadata: fromContainerMetadata,
      fromInstanceMetadata: fromInstanceMetadata,
    } = await import("./chunk-7bg2190x.js");
    if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
      e.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromHttp/fromContainerMetadata");
      let { fromHttp: fromHttp } = await import("./chunk-0c72454j.js");
      return i.chain(fromHttp(e), fromContainerMetadata(e));
    }
    if (process.env[AWS_EC2_METADATA_DISABLED] && process.env[AWS_EC2_METADATA_DISABLED] !== "false")
      return async () => {
        throw new i.CredentialsProviderError("EC2 Instance Metadata Service access disabled", {
          logger: e.logger,
        });
      };
    return (
      e.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromInstanceMetadata"),
      fromInstanceMetadata(e)
    );
  };
//@ chunk-j3x7ed1b.js:1723-2018 esm-fingerprint
function g(e, o) {
  let r = A(e),
    n,
    s,
    t,
    d = async (a) => {
      if (a?.forceRefresh) return await r(a);
      if (t?.expiration) {
        if (t?.expiration?.getTime() < Date.now()) t = void 0;
      }
      if (n) await n;
      else if (!t || o?.(t))
        if (t) {
          if (!s)
            s = r(a).then((l) => {
              ((t = l), (s = void 0));
            });
        } else
          return (
            (n = r(a).then((l) => {
              ((t = l), (n = void 0));
            })),
            d(a)
          );
      return t;
    };
  return d;
}
//@ chunk-j3x7ed1b.js:2018-2140 esm-fingerprint
var A = (e) => async (o) => {
  let r;
  for (let n of e)
    try {
      return await n(o);
    } catch (error) {
      if (((r = error), error?.tryNextLink)) continue;
      throw error;
    }
  throw r;
};
//@ chunk-j3x7ed1b.js:2140-4216 esm-layout
var v = !1,
  defaultProvider = (e = {}) =>
    g(
      [
        async () => {
          if (e.profile ?? process.env[m.ENV_PROFILE]) {
            if (process.env[ENV_KEY] && process.env[ENV_SECRET]) {
              if (!v)
                ((e.logger?.warn && e.logger?.constructor?.name !== "NoOpLogger"
                  ? e.logger.warn.bind(e.logger)
                  : console.warn)(`@aws-sdk/credential-provider-node - defaultProvider::fromEnv WARNING:
    Multiple credential sources detected: 
    Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
    This SDK will proceed with the AWS_PROFILE value.
    
    However, a future version may change this behavior to prefer the ENV static credentials.
    Please ensure that your environment only sets either the AWS_PROFILE or the
    AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY pair.
`),
                  (v = !0));
            }
            throw new c.CredentialsProviderError("AWS_PROFILE is set, skipping fromEnv provider.", {
              logger: e.logger,
              tryNextLink: !0,
            });
          }
          return (
            e.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromEnv"),
            fromEnv(e)()
          );
        },
        async (o) => {
          e.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromSSO");
          let {
            ssoStartUrl: ssoStartUrl,
            ssoAccountId: ssoAccountId,
            ssoRegion: ssoRegion,
            ssoRoleName: ssoRoleName,
            ssoSession: ssoSession,
          } = e;
          if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession)
            throw new c.CredentialsProviderError(
              "Skipping SSO provider in default chain (inputs do not include SSO fields).",
              { logger: e.logger },
            );
          let { fromSSO: fromSSO } = await import("./chunk-rs2k9kxx.js");
          return fromSSO(e)(o);
        },
        async (o) => {
          e.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromIni");
          let { fromIni: fromIni } = await import("./chunk-8f6p9rtw.js");
          return fromIni(e)(o);
        },
        async (o) => {
          e.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromProcess");
          let { fromProcess: fromProcess } = await import("./chunk-skhq176t.js");
          return fromProcess(e)(o);
        },
        async (o) => {
          e.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromTokenFile");
          let { fromTokenFile: fromTokenFile } = await import("./chunk-2pe5kgjj.js");
          return fromTokenFile(e)(o);
        },
        async () => (
          e.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::remoteProvider"),
          (await S(e))()
        ),
        async () => {
          throw new c.CredentialsProviderError("Could not load credentials from any providers", {
            tryNextLink: !1,
            logger: e.logger,
          });
        },
      ],
      I,
    );
//@ chunk-j3x7ed1b.js:4216-4292 esm-fingerprint
var I = (e) => e?.expiration !== void 0 && e.expiration.getTime() - Date.now() < 300000;

export { defaultProvider };

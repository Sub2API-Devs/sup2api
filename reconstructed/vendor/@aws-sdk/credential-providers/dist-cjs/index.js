/**
 * @aws-sdk/credential-providers/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-providers@3.1153.0..3.1161.0
 * pieces: chunk-thwbpw6e.js (7)
 * attribution: esm-layout 6, esm-fingerprint 1
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { fromEnv } from "../../credential-provider-env/dist-cjs/index.js";
import { fromIni } from "../../credential-provider-ini/dist-cjs/index.js";
import { defaultProvider } from "../../credential-provider-node/dist-cjs/index.js";
import { dR } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { wD } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { EE } from "../../../@smithy/core/dist-cjs/index.js";

//@ chunk-thwbpw6e.js:561-1125 esm-layout
var x = Re($h()),
  O = (...e) => {
    let r = -1,
      merged = Object.assign(
        async (t) => {
          let o = await P(...e)(t);
          if (!o.expiration && r !== -1) o.expiration = new Date(Date.now() + r);
          return o;
        },
        {
          expireAfter(t) {
            if (t < 300000)
              throw Error(
                "@aws-sdk/credential-providers - createCredentialChain(...).expireAfter(ms) may not be called with a duration lower than five minutes.",
              );
            return ((r = t), merged);
          },
        },
      );
    return merged;
  },
  P =
    (...e) =>
    async (r) => {
      if (e.length === 0) throw new x.ProviderError("No providers in chain", { tryNextLink: !1 });
      let n;
      for (let i of e)
        try {
          return await i(r);
        } catch (error) {
          if (((n = error), error?.tryNextLink)) continue;
          throw error;
        }
      throw n;
    };
//@ chunk-thwbpw6e.js:1125-1143 esm-layout
var R = (e) => fromEnv(e);
//@ chunk-thwbpw6e.js:1143-1169 esm-layout
var F = (e = {}) => fromIni({ ...e });
//@ chunk-thwbpw6e.js:1169-1195 esm-layout
var v = (e = {}) => defaultProvider({ ...e });
//@ chunk-thwbpw6e.js:1195-1221 esm-layout
var E = Re(dR()),
  T = Re(wD());
//@ chunk-thwbpw6e.js:1221-3607 esm-layout
var h = Re(EE()),
  S = Re($h()),
  US_EAST_1 = "us-east-1",
  A = (e, r, n) => {
    let i;
    return async (t = {}) => {
      let { callerClientConfig: callerClientConfig } = t,
        w = e.clientConfig?.profile ?? callerClientConfig?.profile,
        c = e.logger ?? callerClientConfig?.logger;
      c?.debug("@aws-sdk/credential-providers - fromTemporaryCredentials (STS)");
      let f = { ...e.params, RoleSessionName: e.params.RoleSessionName ?? "aws-sdk-js-" + Date.now() };
      if (f?.SerialNumber) {
        if (!e.mfaCodeProvider)
          throw new S.CredentialsProviderError(
            "Temporary credential requires multi-factor authentication, but no MFA code callback was provided.",
            { tryNextLink: !1, logger: c },
          );
        f.TokenCode = await e.mfaCodeProvider(f?.SerialNumber);
      }
      let { AssumeRoleCommand: AssumeRoleCommand, STSClient: STSClient } =
        await import("./chunk-nm3tp7ry.js");
      if (!i) {
        let u = typeof r === "function" ? r() : void 0,
          s = [
            e.masterCredentials,
            e.clientConfig?.credentials,
            void callerClientConfig?.credentials,
            callerClientConfig?.credentialDefaultProvider?.(),
            u,
          ],
          l = "STS client default credentials";
        if (s[0]) l = "options.masterCredentials";
        else if (s[1]) l = "options.clientConfig.credentials";
        else if (s[2])
          throw (
            (l = "caller client's credentials"),
            Error("fromTemporaryCredentials recursion in callerClientConfig.credentials")
          );
        else if (s[3]) l = "caller client's credentialDefaultProvider";
        else if (s[4]) l = "AWS SDK default credentials";
        let d = [e.clientConfig?.region, callerClientConfig?.region, await n?.({ profile: w }), US_EAST_1],
          m = "default partition's default region";
        if (d[0]) m = "options.clientConfig.region";
        else if (d[1]) m = "caller client's region";
        else if (d[2]) m = "file or env region";
        let C = [y(e.clientConfig?.requestHandler), y(callerClientConfig?.requestHandler)],
          g = "STS default requestHandler";
        if (C[0]) g = "options.clientConfig.requestHandler";
        else if (C[1]) g = "caller client's requestHandler";
        (c?.debug?.(
          `@aws-sdk/credential-providers - fromTemporaryCredentials STS client init with ${m}=${await h.normalizeProvider(p(d))()}, ${l}, ${g}.`,
        ),
          (i = new STSClient({
            userAgentAppId: callerClientConfig?.userAgentAppId,
            ...e.clientConfig,
            credentials: p(s),
            logger: c,
            profile: w,
            region: p(d),
            requestHandler: p(C),
          })));
      }
      if (e.clientPlugins) for (let clientPlugin of e.clientPlugins) i.middlewareStack.use(clientPlugin);
      let { Credentials: Credentials } = await i.send(new AssumeRoleCommand(f));
      if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey)
        throw new S.CredentialsProviderError(
          `Invalid response from STS.assumeRole call with role ${f.RoleArn}`,
          { logger: c },
        );
      return {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretAccessKey,
        sessionToken: Credentials.SessionToken,
        expiration: Credentials.Expiration,
        credentialScope: Credentials.CredentialScope,
      };
    };
  },
  y = (e) => (e?.metadata?.handlerProtocol === "h2" ? void 0 : e),
  p = (e) => {
    for (let r of e) if (r !== void 0) return r;
  };
//@ chunk-thwbpw6e.js:3607-3836 esm-fingerprint
var M = (e) =>
  A(e, v, async ({ profile: profile = process.env.AWS_PROFILE }) =>
    T.loadConfig(
      {
        environmentVariableSelector: (n) => n.AWS_REGION,
        configFileSelector: (n) => n.region,
        default: () => {
          return;
        },
      },
      { ...E.NODE_REGION_CONFIG_FILE_OPTIONS, profile: profile },
    )(),
  );

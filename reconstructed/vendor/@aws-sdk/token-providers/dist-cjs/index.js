/**
 * @aws-sdk/token-providers/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/token-providers@3.936.0..3.939.0
 * pieces: chunk-0rkz0exm.js (4), chunk-k63efphf.js (10)
 * attribution: esm-layout 7, esm-fingerprint 7
 */
import { promises } from "fs";
import { Re } from "../../../../runtime/bun-runtime.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { hU } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { a_2, S } from "../index.js";
import { g_2, a } from "../../core/dist-cjs/index.js";

//@ chunk-k63efphf.js:325-422 esm-fingerprint
var g = 300000,
  p = "To refresh this SSO session run 'aws sso login' with the corresponding profile.";
//@ chunk-k63efphf.js:422-721 esm-fingerprint
var k = async (e, o = {}) => {
  let { SSOOIDCClient: SSOOIDCClient } = await import("./chunk-ddzww9ex.js").then((m) => Re(m.default)),
    n = (f) => o.clientConfig?.[f] ?? o.parentClientConfig?.[f];
  return new SSOOIDCClient(
    Object.assign({}, o.clientConfig ?? {}, {
      region: e ?? o.clientConfig?.region,
      logger: n("logger"),
      userAgentAppId: n("userAgentAppId"),
    }),
  );
};
//@ chunk-k63efphf.js:721-971 esm-fingerprint
var h = async (e, o, s = {}) => {
  let { CreateTokenCommand: CreateTokenCommand } = await import("./chunk-ddzww9ex.js").then((m) =>
    Re(m.default),
  );
  return (await k(o, s)).send(
    new CreateTokenCommand({
      clientId: e.clientId,
      clientSecret: e.clientSecret,
      refreshToken: e.refreshToken,
      grantType: "refresh_token",
    }),
  );
};
//@ chunk-k63efphf.js:971-986 esm-layout
var u = Re($h());
//@ chunk-k63efphf.js:986-1110 esm-fingerprint
var w = (e) => {
  if (e.expiration && e.expiration.getTime() < Date.now())
    throw new u.TokenProviderError(`Token is expired. ${p}`, !1);
};
//@ chunk-k63efphf.js:1110-1125 esm-layout
var E = Re($h());
//@ chunk-k63efphf.js:1125-1272 esm-fingerprint
var i_k63e = (e, o, s = !1) => {
  if (typeof o > "u")
    throw new E.TokenProviderError(
      `Value not present for '${e}' in SSO Token${s ? ". Cannot refresh" : ""}. ${p}`,
      !1,
    );
};
//@ chunk-k63efphf.js:1272-1287 esm-layout
var x = Re(hU());
//@ chunk-k63efphf.js:1317-1419 esm-fingerprint
var { writeFile: writeFile } = promises,
  O = (e, o) => {
    let sSOTokenFilepath = x.getSSOTokenFilepath(e),
      json = JSON.stringify(o, null, 2);
    return writeFile(sSOTokenFilepath, json);
  };
//@ chunk-k63efphf.js:1419-3078 esm-layout
var date = new Date(0),
  Xur =
    (e = {}) =>
    async ({ callerClientConfig: o } = {}) => {
      let s = { ...e, parentClientConfig: { ...o, ...e.parentClientConfig } };
      s.logger?.debug("@aws-sdk/token-providers - fromSso");
      let knownFiles = await a_2.parseKnownFiles(s),
        profileName = a_2.getProfileName({ profile: s.profile ?? o?.profile }),
        f = knownFiles[profileName];
      if (!f)
        throw new S.TokenProviderError(
          `Profile '${profileName}' could not be found in shared credentials file.`,
          !1,
        );
      else if (!f.sso_session)
        throw new S.TokenProviderError(
          `Profile '${profileName}' is missing required property 'sso_session'.`,
        );
      let sso_session = f.sso_session,
        d = (await a_2.loadSsoSessionData(s))[sso_session];
      if (!d)
        throw new S.TokenProviderError(
          `Sso session '${sso_session}' could not be found in shared credentials file.`,
          !1,
        );
      for (let t of ["sso_start_url", "sso_region"])
        if (!d[t])
          throw new S.TokenProviderError(
            `Sso session '${sso_session}' is missing required property '${t}'.`,
            !1,
          );
      let { sso_start_url: sso_start_url, sso_region: sso_region } = d,
        r;
      try {
        r = await a_2.getSSOTokenFromFile(sso_session);
      } catch (error) {
        throw new S.TokenProviderError(
          `The SSO session token associated with profile=${profileName} was not found or is invalid. ${p}`,
          !1,
        );
      }
      (i_k63e("accessToken", r.accessToken), i_k63e("expiresAt", r.expiresAt));
      let { accessToken: accessToken, expiresAt: expiresAt } = r,
        l = { token: accessToken, expiration: new Date(expiresAt) };
      if (l.expiration.getTime() - Date.now() > g) return l;
      if (Date.now() - date.getTime() < 30000) return (w(l), l);
      (i_k63e("clientId", r.clientId, !0),
        i_k63e("clientSecret", r.clientSecret, !0),
        i_k63e("refreshToken", r.refreshToken, !0));
      try {
        date.setTime(Date.now());
        let t = await h(r, sso_region, s);
        (i_k63e("accessToken", t.accessToken), i_k63e("expiresIn", t.expiresIn));
        let date_2 = new Date(Date.now() + t.expiresIn * 1000);
        try {
          await O(sso_session, {
            ...r,
            accessToken: t.accessToken,
            expiresAt: date_2.toISOString(),
            refreshToken: t.refreshToken,
          });
        } catch (error) {}
        return { token: t.accessToken, expiration: date_2 };
      } catch (error) {
        return (w(l), l);
      }
    };
//@ chunk-0rkz0exm.js:571-579 esm-layout
var r = g_2;
//@ chunk-0rkz0exm.js:579-1030 esm-layout
var s = Re($h()),
  Vur =
    ({ logger: e, signingName: n } = {}) =>
    async () => {
      if ((e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"), !n))
        throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key", {
          logger: e,
        });
      let t = r(n);
      if (!(t in process.env))
        throw new s.TokenProviderError(`Token not present in '${t}' environment variable`, { logger: e });
      let o = { token: process.env[t] };
      return (a.setTokenFeature(o, "BEARER_SERVICE_ENV_VARS", "3"), o);
    };
//@ chunk-0rkz0exm.js:1030-1045 esm-layout
var i = Re($h());
//@ chunk-0rkz0exm.js:1045-1272 esm-fingerprint
var qur = (e = {}) =>
  i.memoize(
    i.chain(Xur(e), async () => {
      throw new i.TokenProviderError("Could not load token from any providers", !1);
    }),
    (n) => n.expiration !== void 0 && n.expiration.getTime() - Date.now() < 300000,
    (n) => n.expiration !== void 0,
  );

export { Vur, qur, Xur };

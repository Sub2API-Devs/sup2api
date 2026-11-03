/**
 * @aws-sdk/credential-provider-ini/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-ini@3.936.0..3.939.0
 * pieces: chunk-hecvqqcj.js (12)
 * attribution: esm-layout 8, esm-fingerprint 4
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { hU } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { SD } from "../../core/dist-cjs/submodules/client/index.js";
import { U, G } from "../../credential-provider-login/dist-cjs/index.js";

//@ chunk-hecvqqcj.js:371-386 esm-layout
var k = Re(hU());
//@ chunk-hecvqqcj.js:386-402 esm-layout
var ne = Re($h());
//@ chunk-hecvqqcj.js:402-439 esm-layout
var I = Re(SD()),
  P = Re($h()),
  N = Re(hU());
//@ chunk-hecvqqcj.js:439-1426 esm-layout
var L = Re(SD()),
  _ = Re($h()),
  O = (e, r, t) => {
    let o = {
      EcsContainer: async (s) => {
        let { fromHttp: fromHttp } = await import("./chunk-0c72454j.js"),
          { fromContainerMetadata: fromContainerMetadata } = await import("./chunk-7bg2190x.js");
        return (
          t?.debug("@aws-sdk/credential-provider-ini - credential_source is EcsContainer"),
          async () => _.chain(fromHttp(s ?? {}), fromContainerMetadata(s))().then(S)
        );
      },
      Ec2InstanceMetadata: async (s) => {
        t?.debug("@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata");
        let { fromInstanceMetadata: fromInstanceMetadata } = await import("./chunk-7bg2190x.js");
        return async () => fromInstanceMetadata(s)().then(S);
      },
      Environment: async (s) => {
        t?.debug("@aws-sdk/credential-provider-ini - credential_source is Environment");
        let { fromEnv: fromEnv } = await import("./chunk-vche1z6n.js");
        return async () => fromEnv(s)().then(S);
      },
    };
    if (e in o) return o[e];
    else
      throw new _.CredentialsProviderError(
        `Unsupported credential source in profile ${r}. Got ${e}, expected EcsContainer or Ec2InstanceMetadata or Environment.`,
        { logger: t },
      );
  },
  S = (e) => L.setCredentialFeature(e, "CREDENTIALS_PROFILE_NAMED_PROVIDER", "p");
//@ chunk-hecvqqcj.js:1426-3742 esm-fingerprint
var K = (e, { profile: r = "default", logger: t } = {}) =>
    Boolean(e) &&
    typeof e === "object" &&
    typeof e.role_arn === "string" &&
    ["undefined", "string"].indexOf(typeof e.role_session_name) > -1 &&
    ["undefined", "string"].indexOf(typeof e.external_id) > -1 &&
    ["undefined", "string"].indexOf(typeof e.mfa_serial) > -1 &&
    (se(e, { profile: r, logger: t }) || ie(e, { profile: r, logger: t })),
  se = (e, { profile: profile, logger: logger }) => {
    let o = typeof e.source_profile === "string" && typeof e.credential_source > "u";
    if (o) logger?.debug?.(`    ${profile} isAssumeRoleWithSourceProfile source_profile=${e.source_profile}`);
    return o;
  },
  ie = (e, { profile: profile, logger: logger }) => {
    let o = typeof e.credential_source === "string" && typeof e.source_profile > "u";
    if (o)
      logger?.debug?.(`    ${profile} isCredentialSourceProfile credential_source=${e.credential_source}`);
    return o;
  },
  B = async (e, r, t, o = {}, s) => {
    t.logger?.debug("@aws-sdk/credential-provider-ini - resolveAssumeRoleCredentials (STS)");
    let n = r[e],
      { source_profile: source_profile, region: region } = n;
    if (!t.roleAssumer) {
      let { getDefaultRoleAssumer: getDefaultRoleAssumer } = await import("./chunk-my7fcfze.js").then((m) =>
        Re(m.default),
      );
      t.roleAssumer = getDefaultRoleAssumer(
        {
          ...t.clientConfig,
          credentialProviderLogger: t.logger,
          parentClientConfig: { ...t?.parentClientConfig, region: region ?? t?.parentClientConfig?.region },
        },
        t.clientPlugins,
      );
    }
    if (source_profile && source_profile in o)
      throw new P.CredentialsProviderError(
        `Detected a cycle attempting to resolve credentials for profile ${N.getProfileName(t)}. Profiles visited: ` +
          Object.keys(o).join(", "),
        { logger: t.logger },
      );
    t.logger?.debug(
      `@aws-sdk/credential-provider-ini - finding credential resolver using ${source_profile ? `source_profile=[${source_profile}]` : `profile=[${e}]`}`,
    );
    let g = source_profile
      ? s(source_profile, r, t, { ...o, [source_profile]: !0 }, F(r[source_profile] ?? {}))
      : (await O(n.credential_source, e, t.logger)(t))();
    if (F(n)) return g.then((l) => I.setCredentialFeature(l, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
    else {
      let l = {
          RoleArn: n.role_arn,
          RoleSessionName: n.role_session_name || `aws-sdk-js-${Date.now()}`,
          ExternalId: n.external_id,
          DurationSeconds: parseInt(n.duration_seconds || "3600", 10),
        },
        { mfa_serial: mfa_serial } = n;
      if (mfa_serial) {
        if (!t.mfaCodeProvider)
          throw new P.CredentialsProviderError(
            `Profile ${e} requires multi-factor authentication, but no MFA code callback was provided.`,
            { logger: t.logger, tryNextLink: !1 },
          );
        ((l.SerialNumber = mfa_serial), (l.TokenCode = await t.mfaCodeProvider(mfa_serial)));
      }
      let d = await g;
      return t
        .roleAssumer(d, l)
        .then((c) => I.setCredentialFeature(c, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
    }
  },
  F = (e) => !e.role_arn && !!e.credential_source;
//@ chunk-hecvqqcj.js:9813-9968 esm-fingerprint
var J = (e) => Boolean(e && e.login_session),
  Y = async (e, r) => {
    let t = await U({ ...r, profile: e })();
    return G.setCredentialFeature(t, "CREDENTIALS_PROFILE_LOGIN", "AC");
  };
//@ chunk-hecvqqcj.js:9968-10224 esm-layout
var z = Re(SD()),
  V = (e) => Boolean(e) && typeof e === "object" && typeof e.credential_process === "string",
  X = async (e, r) =>
    import("./chunk-skhq176t.js").then(({ fromProcess: fromProcess }) =>
      fromProcess({ ...e, profile: r })().then((o) =>
        z.setCredentialFeature(o, "CREDENTIALS_PROFILE_PROCESS", "v"),
      ),
    );
//@ chunk-hecvqqcj.js:10224-10769 esm-layout
var v = Re(SD()),
  Q = async (e, r, t = {}) => {
    let { fromSSO: fromSSO } = await import("./chunk-rs2k9kxx.js");
    return fromSSO({
      profile: e,
      logger: t.logger,
      parentClientConfig: t.parentClientConfig,
      clientConfig: t.clientConfig,
    })().then((s) => {
      if (r.sso_session) return v.setCredentialFeature(s, "CREDENTIALS_PROFILE_SSO", "r");
      else return v.setCredentialFeature(s, "CREDENTIALS_PROFILE_SSO_LEGACY", "t");
    });
  },
  Z = (e) =>
    e &&
    (typeof e.sso_start_url === "string" ||
      typeof e.sso_account_id === "string" ||
      typeof e.sso_session === "string" ||
      typeof e.sso_region === "string" ||
      typeof e.sso_role_name === "string");
//@ chunk-hecvqqcj.js:10769-11416 esm-layout
var ee = Re(SD()),
  x = (e) =>
    Boolean(e) &&
    typeof e === "object" &&
    typeof e.aws_access_key_id === "string" &&
    typeof e.aws_secret_access_key === "string" &&
    ["undefined", "string"].indexOf(typeof e.aws_session_token) > -1 &&
    ["undefined", "string"].indexOf(typeof e.aws_account_id) > -1,
  R = async (e, r) => {
    r?.logger?.debug("@aws-sdk/credential-provider-ini - resolveStaticCredentials");
    let t = {
      accessKeyId: e.aws_access_key_id,
      secretAccessKey: e.aws_secret_access_key,
      sessionToken: e.aws_session_token,
      ...(e.aws_credential_scope && { credentialScope: e.aws_credential_scope }),
      ...(e.aws_account_id && { accountId: e.aws_account_id }),
    };
    return ee.setCredentialFeature(t, "CREDENTIALS_PROFILE", "n");
  };
//@ chunk-hecvqqcj.js:11416-11984 esm-layout
var te = Re(SD()),
  re = (e) =>
    Boolean(e) &&
    typeof e === "object" &&
    typeof e.web_identity_token_file === "string" &&
    typeof e.role_arn === "string" &&
    ["undefined", "string"].indexOf(typeof e.role_session_name) > -1,
  oe = async (e, r) =>
    import("./chunk-2pe5kgjj.js").then(({ fromTokenFile: fromTokenFile }) =>
      fromTokenFile({
        webIdentityTokenFile: e.web_identity_token_file,
        roleArn: e.role_arn,
        roleSessionName: e.role_session_name,
        roleAssumerWithWebIdentity: r.roleAssumerWithWebIdentity,
        logger: r.logger,
        parentClientConfig: r.parentClientConfig,
      })().then((o) => te.setCredentialFeature(o, "CREDENTIALS_PROFILE_STS_WEB_ID_TOKEN", "q")),
    );
//@ chunk-hecvqqcj.js:11984-12402 esm-fingerprint
var A = async (e, r, t, o = {}, s = !1) => {
  let n = r[e];
  if (Object.keys(o).length > 0 && x(n)) return R(n, t);
  if (s || K(n, { profile: e, logger: t.logger })) return B(e, r, t, o, A);
  if (x(n)) return R(n, t);
  if (re(n)) return oe(n, t);
  if (V(n)) return X(t, e);
  if (Z(n)) return await Q(e, n, t);
  if (J(n)) return Y(e, t);
  throw new ne.CredentialsProviderError(
    `Could not resolve credentials using profile: [${e}] in configuration/credentials file(s).`,
    { logger: t.logger },
  );
};
//@ chunk-hecvqqcj.js:12402-12676 esm-fingerprint
var fromIni =
  (e = {}) =>
  async ({ callerClientConfig: r } = {}) => {
    let t = { ...e, parentClientConfig: { ...r, ...e.parentClientConfig } };
    t.logger?.debug("@aws-sdk/credential-provider-ini - fromIni");
    let knownFiles = await k.parseKnownFiles(t);
    return A(k.getProfileName({ profile: e.profile ?? r?.profile }), knownFiles, t);
  };

export { fromIni };

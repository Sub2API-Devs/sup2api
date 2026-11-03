/**
 * @aws-sdk/credential-provider-sso/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-sso@3.936.0..3.939.0
 * pieces: chunk-rs2k9kxx.js (6)
 * attribution: esm-layout 4, esm-fingerprint 2
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { hU } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { SD } from "../../core/dist-cjs/submodules/client/index.js";
import { Xur } from "../../token-providers/dist-cjs/index.js";

//@ chunk-rs2k9kxx.js:372-398 esm-layout
var S = Re($h()),
  m = Re(hU());
//@ chunk-rs2k9kxx.js:398-584 esm-fingerprint
var D = (e) =>
  e &&
  (typeof e.sso_start_url === "string" ||
    typeof e.sso_account_id === "string" ||
    typeof e.sso_session === "string" ||
    typeof e.sso_region === "string" ||
    typeof e.sso_role_name === "string");
//@ chunk-rs2k9kxx.js:584-599 esm-layout
var y = Re(SD());
//@ chunk-rs2k9kxx.js:599-2516 esm-layout
var d = Re($h()),
  F = Re(hU()),
  h = !1,
  O = async ({
    ssoStartUrl: ssoStartUrl,
    ssoSession: ssoSession,
    ssoAccountId: ssoAccountId,
    ssoRegion: ssoRegion,
    ssoRoleName: ssoRoleName,
    ssoClient: ssoClient,
    clientConfig: clientConfig,
    parentClientConfig: parentClientConfig,
    profile: profile,
    filepath: filepath,
    configFilepath: configFilepath,
    ignoreCache: ignoreCache,
    logger: logger,
  }) => {
    let g,
      N = "To refresh this SSO session run aws sso login with the corresponding profile.";
    if (ssoSession)
      try {
        let c = await Xur({
          profile: profile,
          filepath: filepath,
          configFilepath: configFilepath,
          ignoreCache: ignoreCache,
        })();
        g = { accessToken: c.token, expiresAt: new Date(c.expiration).toISOString() };
      } catch (error) {
        throw new d.CredentialsProviderError(error.message, { tryNextLink: h, logger: logger });
      }
    else
      try {
        g = await F.getSSOTokenFromFile(ssoStartUrl);
      } catch (error) {
        throw new d.CredentialsProviderError(
          "The SSO session associated with this profile is invalid. To refresh this SSO session run aws sso login with the corresponding profile.",
          { tryNextLink: h, logger: logger },
        );
      }
    if (new Date(g.expiresAt).getTime() - Date.now() <= 0)
      throw new d.CredentialsProviderError(
        "The SSO session associated with this profile has expired. To refresh this SSO session run aws sso login with the corresponding profile.",
        { tryNextLink: h, logger: logger },
      );
    let { accessToken: accessToken } = g,
      { SSOClient: SSOClient, GetRoleCredentialsCommand: GetRoleCredentialsCommand } =
        await import("./chunk-5hsv1dry.js"),
      w =
        ssoClient ||
        new SSOClient(
          Object.assign({}, clientConfig ?? {}, {
            logger: clientConfig?.logger ?? parentClientConfig?.logger,
            region: clientConfig?.region ?? ssoRegion,
            userAgentAppId: clientConfig?.userAgentAppId ?? parentClientConfig?.userAgentAppId,
          }),
        ),
      I;
    try {
      I = await w.send(
        new GetRoleCredentialsCommand({
          accountId: ssoAccountId,
          roleName: ssoRoleName,
          accessToken: accessToken,
        }),
      );
    } catch (error) {
      throw new d.CredentialsProviderError(error, { tryNextLink: h, logger: logger });
    }
    let {
      roleCredentials: {
        accessKeyId: L,
        secretAccessKey: R,
        sessionToken: T,
        expiration: v,
        credentialScope: P,
        accountId: E,
      } = {},
    } = I;
    if (!L || !R || !T || !v)
      throw new d.CredentialsProviderError("SSO returns an invalid temporary credential.", {
        tryNextLink: h,
        logger: logger,
      });
    let x = {
      accessKeyId: L,
      secretAccessKey: R,
      sessionToken: T,
      expiration: new Date(v),
      ...(P && { credentialScope: P }),
      ...(E && { accountId: E }),
    };
    if (ssoSession) y.setCredentialFeature(x, "CREDENTIALS_SSO", "s");
    else y.setCredentialFeature(x, "CREDENTIALS_SSO_LEGACY", "u");
    return x;
  };
//@ chunk-rs2k9kxx.js:2516-2958 esm-layout
var M = Re($h()),
  U = (e, f) => {
    let {
      sso_start_url: sso_start_url,
      sso_account_id: sso_account_id,
      sso_region: sso_region,
      sso_role_name: sso_role_name,
    } = e;
    if (!sso_start_url || !sso_account_id || !sso_region || !sso_role_name)
      throw new M.CredentialsProviderError(
        `Profile is configured with invalid SSO credentials. Required parameters "sso_account_id", "sso_region", "sso_role_name", "sso_start_url". Got ${Object.keys(e).join(", ")}
Reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html`,
        { tryNextLink: !1, logger: f },
      );
    return e;
  };
//@ chunk-rs2k9kxx.js:2958-4782 esm-fingerprint
var Y =
  (e = {}) =>
  async ({ callerClientConfig: f } = {}) => {
    e.logger?.debug("@aws-sdk/credential-provider-sso - fromSSO");
    let {
        ssoStartUrl: ssoStartUrl,
        ssoAccountId: ssoAccountId,
        ssoRegion: ssoRegion,
        ssoRoleName: ssoRoleName,
        ssoSession: ssoSession,
      } = e,
      { ssoClient: ssoClient } = e,
      profileName = m.getProfileName({ profile: e.profile ?? f?.profile });
    if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
      let o = (await m.parseKnownFiles(e))[profileName];
      if (!o)
        throw new S.CredentialsProviderError(`Profile ${profileName} was not found.`, { logger: e.logger });
      if (!D(o))
        throw new S.CredentialsProviderError(
          `Profile ${profileName} is not configured with SSO credentials.`,
          { logger: e.logger },
        );
      if (o?.sso_session) {
        let p = (await m.loadSsoSessionData(e))[o.sso_session],
          w = ` configurations in profile ${profileName} and sso-session ${o.sso_session}`;
        if (ssoRegion && ssoRegion !== p.sso_region)
          throw new S.CredentialsProviderError("Conflicting SSO region" + w, {
            tryNextLink: !1,
            logger: e.logger,
          });
        if (ssoStartUrl && ssoStartUrl !== p.sso_start_url)
          throw new S.CredentialsProviderError("Conflicting SSO start_url" + w, {
            tryNextLink: !1,
            logger: e.logger,
          });
        ((o.sso_region = p.sso_region), (o.sso_start_url = p.sso_start_url));
      }
      let {
        sso_start_url: sso_start_url,
        sso_account_id: sso_account_id,
        sso_region: sso_region,
        sso_role_name: sso_role_name,
        sso_session: sso_session,
      } = U(o, e.logger);
      return O({
        ssoStartUrl: sso_start_url,
        ssoSession: sso_session,
        ssoAccountId: sso_account_id,
        ssoRegion: sso_region,
        ssoRoleName: sso_role_name,
        ssoClient: ssoClient,
        clientConfig: e.clientConfig,
        parentClientConfig: e.parentClientConfig,
        profile: profileName,
        filepath: e.filepath,
        configFilepath: e.configFilepath,
        ignoreCache: e.ignoreCache,
        logger: e.logger,
      });
    } else if (!ssoStartUrl || !ssoAccountId || !ssoRegion || !ssoRoleName)
      throw new S.CredentialsProviderError(
        'Incomplete configuration. The fromSSO() argument hash must include "ssoStartUrl", "ssoAccountId", "ssoRegion", "ssoRoleName"',
        { tryNextLink: !1, logger: e.logger },
      );
    else
      return O({
        ssoStartUrl: ssoStartUrl,
        ssoSession: ssoSession,
        ssoAccountId: ssoAccountId,
        ssoRegion: ssoRegion,
        ssoRoleName: ssoRoleName,
        ssoClient: ssoClient,
        clientConfig: e.clientConfig,
        parentClientConfig: e.parentClientConfig,
        profile: profileName,
        filepath: e.filepath,
        configFilepath: e.configFilepath,
        ignoreCache: e.ignoreCache,
        logger: e.logger,
      });
  };

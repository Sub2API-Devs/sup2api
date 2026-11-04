/**
 * @aws-sdk/credential-provider-sso/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-sso@3.936.0..3.939.0
 * pieces: chunk-rs2k9kxx.js (6)
 * attribution: esm-layout 4, esm-fingerprint 2
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { require_shared_ini_file_loader } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { require_client } from "../../core/dist-cjs/submodules/client/index.js";
import { fromSso } from "../../token-providers/dist-cjs/index.js";

//@ chunk-rs2k9kxx.js:372-398 esm-layout
var import_property_provider = __toESM(require_property_provider());
var sharedIniFileLoader = __toESM(require_shared_ini_file_loader());
//@ chunk-rs2k9kxx.js:398-584 esm-fingerprint
var isSsoProfile = (arg) =>
  arg &&
  (typeof arg.sso_start_url === "string" ||
    typeof arg.sso_account_id === "string" ||
    typeof arg.sso_session === "string" ||
    typeof arg.sso_region === "string" ||
    typeof arg.sso_role_name === "string");
//@ chunk-rs2k9kxx.js:584-599 esm-layout
var client = __toESM(require_client());
//@ chunk-rs2k9kxx.js:599-2516 esm-layout
var import_property_provider_2 = __toESM(require_property_provider());
var import_shared_ini_file_loader = __toESM(require_shared_ini_file_loader());
var SHOULD_FAIL_CREDENTIAL_CHAIN = false;
var resolveSSOCredentials = async ({
  ssoStartUrl,
  ssoSession,
  ssoAccountId,
  ssoRegion,
  ssoRoleName,
  ssoClient,
  clientConfig,
  parentClientConfig,
  profile,
  filepath,
  configFilepath,
  ignoreCache,
  logger,
}) => {
  let token;
  let refreshMessage = "To refresh this SSO session run aws sso login with the corresponding profile.";
  if (ssoSession)
    try {
      let _token = await fromSso({
        profile,
        filepath,
        configFilepath,
        ignoreCache,
      })();
      token = {
        accessToken: _token.token,
        expiresAt: new Date(_token.expiration).toISOString(),
      };
    } catch (e) {
      throw new import_property_provider_2.CredentialsProviderError(e.message, {
        tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
        logger,
      });
    }
  else
    try {
      token = await import_shared_ini_file_loader.getSSOTokenFromFile(ssoStartUrl);
    } catch (e) {
      throw new import_property_provider_2.CredentialsProviderError(
        "The SSO session associated with this profile is invalid. To refresh this SSO session run aws sso login with the corresponding profile.",
        {
          tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
          logger,
        },
      );
    }
  if (new Date(token.expiresAt).getTime() - Date.now() <= 0)
    throw new import_property_provider_2.CredentialsProviderError(
      "The SSO session associated with this profile has expired. To refresh this SSO session run aws sso login with the corresponding profile.",
      {
        tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
        logger,
      },
    );
  let { accessToken } = token;
  let { SSOClient, GetRoleCredentialsCommand } =
    await import("../../client-sso/dist-cjs/GetRoleCredentialsCommand_2.lazy.js");
  let sso =
    ssoClient ||
    new SSOClient(
      Object.assign({}, clientConfig ?? {}, {
        logger: clientConfig?.logger ?? parentClientConfig?.logger,
        region: clientConfig?.region ?? ssoRegion,
        userAgentAppId: clientConfig?.userAgentAppId ?? parentClientConfig?.userAgentAppId,
      }),
    );
  let ssoResp;
  try {
    ssoResp = await sso.send(
      new GetRoleCredentialsCommand({
        accountId: ssoAccountId,
        roleName: ssoRoleName,
        accessToken,
      }),
    );
  } catch (e) {
    throw new import_property_provider_2.CredentialsProviderError(e, {
      tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
      logger,
    });
  }
  let {
    roleCredentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken,
      expiration,
      credentialScope,
      accountId,
    } = {},
  } = ssoResp;
  if (!accessKeyId || !secretAccessKey || !sessionToken || !expiration)
    throw new import_property_provider_2.CredentialsProviderError(
      "SSO returns an invalid temporary credential.",
      {
        tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
        logger,
      },
    );
  let credentials = {
    accessKeyId,
    secretAccessKey,
    sessionToken,
    expiration: new Date(expiration),
    ...(credentialScope && {
      credentialScope,
    }),
    ...(accountId && {
      accountId,
    }),
  };
  if (ssoSession) client.setCredentialFeature(credentials, "CREDENTIALS_SSO", "s");
  else client.setCredentialFeature(credentials, "CREDENTIALS_SSO_LEGACY", "u");
  return credentials;
};
//@ chunk-rs2k9kxx.js:2516-2958 esm-layout
var import_property_provider_3 = __toESM(require_property_provider());
var validateSsoProfile = (profile, logger) => {
  let { sso_start_url, sso_account_id, sso_region, sso_role_name } = profile;
  if (!sso_start_url || !sso_account_id || !sso_region || !sso_role_name)
    throw new import_property_provider_3.CredentialsProviderError(
      `Profile is configured with invalid SSO credentials. Required parameters "sso_account_id", "sso_region", "sso_role_name", "sso_start_url". Got ${Object.keys(profile).join(", ")}
Reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html`,
      {
        tryNextLink: false,
        logger,
      },
    );
  return profile;
};
//@ chunk-rs2k9kxx.js:2958-4782 esm-fingerprint
var fromSSO =
  (init = {}) =>
  async ({ callerClientConfig } = {}) => {
    init.logger?.debug("@aws-sdk/credential-provider-sso - fromSSO");
    let { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
    let { ssoClient } = init;
    let profileName = sharedIniFileLoader.getProfileName({
      profile: init.profile ?? callerClientConfig?.profile,
    });
    if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
      let profile = (await sharedIniFileLoader.parseKnownFiles(init))[profileName];
      if (!profile)
        throw new import_property_provider.CredentialsProviderError(`Profile ${profileName} was not found.`, {
          logger: init.logger,
        });
      if (!isSsoProfile(profile))
        throw new import_property_provider.CredentialsProviderError(
          `Profile ${profileName} is not configured with SSO credentials.`,
          {
            logger: init.logger,
          },
        );
      if (profile?.sso_session) {
        let session = (await sharedIniFileLoader.loadSsoSessionData(init))[profile.sso_session];
        let conflictMsg = ` configurations in profile ${profileName} and sso-session ${profile.sso_session}`;
        if (ssoRegion && ssoRegion !== session.sso_region)
          throw new import_property_provider.CredentialsProviderError(
            "Conflicting SSO region" + conflictMsg,
            {
              tryNextLink: false,
              logger: init.logger,
            },
          );
        if (ssoStartUrl && ssoStartUrl !== session.sso_start_url)
          throw new import_property_provider.CredentialsProviderError(
            "Conflicting SSO start_url" + conflictMsg,
            {
              tryNextLink: false,
              logger: init.logger,
            },
          );
        profile.sso_region = session.sso_region;
        profile.sso_start_url = session.sso_start_url;
      }
      let { sso_start_url, sso_account_id, sso_region, sso_role_name, sso_session } = validateSsoProfile(
        profile,
        init.logger,
      );
      return resolveSSOCredentials({
        ssoStartUrl: sso_start_url,
        ssoSession: sso_session,
        ssoAccountId: sso_account_id,
        ssoRegion: sso_region,
        ssoRoleName: sso_role_name,
        ssoClient,
        clientConfig: init.clientConfig,
        parentClientConfig: init.parentClientConfig,
        profile: profileName,
        filepath: init.filepath,
        configFilepath: init.configFilepath,
        ignoreCache: init.ignoreCache,
        logger: init.logger,
      });
    } else if (!ssoStartUrl || !ssoAccountId || !ssoRegion || !ssoRoleName)
      throw new import_property_provider.CredentialsProviderError(
        'Incomplete configuration. The fromSSO() argument hash must include "ssoStartUrl", "ssoAccountId", "ssoRegion", "ssoRoleName"',
        {
          tryNextLink: false,
          logger: init.logger,
        },
      );
    else
      return resolveSSOCredentials({
        ssoStartUrl,
        ssoSession,
        ssoAccountId,
        ssoRegion,
        ssoRoleName,
        ssoClient,
        clientConfig: init.clientConfig,
        parentClientConfig: init.parentClientConfig,
        profile: profileName,
        filepath: init.filepath,
        configFilepath: init.configFilepath,
        ignoreCache: init.ignoreCache,
        logger: init.logger,
      });
  };
export { fromSSO };

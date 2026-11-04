/**
 * @aws-sdk/token-providers/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/token-providers@3.936.0..3.939.0
 * pieces: chunk-0rkz0exm.js (4), chunk-k63efphf.js (10)
 * attribution: esm-layout 7, esm-fingerprint 7
 */
import { promises } from "fs";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { require_shared_ini_file_loader } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { import_shared_ini_file_loader, import_property_provider_4 } from "../index.js";
import { bearerTokenEnvKey, import_client } from "../../core/dist-cjs/index.js";

//@ chunk-k63efphf.js:325-422 esm-fingerprint
var SSO_TOKEN_TTL_MS = 300000;
var REFRESH_MESSAGE = "To refresh this SSO session run 'aws sso login' with the corresponding profile.";
//@ chunk-k63efphf.js:422-721 esm-fingerprint
var loadSsoSessionToken = async (ssoRegion, init = {}) => {
  let { SSOOIDCClient } = await import("../../nested-clients/dist-cjs/submodules/sso-oidc/index.js").then(
    (clientModule) => __toESM(clientModule.default),
  );
  let coalesce = (prop) => init.clientConfig?.[prop] ?? init.parentClientConfig?.[prop];
  return new SSOOIDCClient(
    Object.assign({}, init.clientConfig ?? {}, {
      region: ssoRegion ?? init.clientConfig?.region,
      logger: coalesce("logger"),
      userAgentAppId: coalesce("userAgentAppId"),
    }),
  );
};
//@ chunk-k63efphf.js:721-971 esm-fingerprint
var getNewSsoOidcToken = async (ssoToken, ssoRegion, init = {}) => {
  let { CreateTokenCommand } =
    await import("../../nested-clients/dist-cjs/submodules/sso-oidc/index.js").then((clientModule) =>
      __toESM(clientModule.default),
    );
  return (await loadSsoSessionToken(ssoRegion, init)).send(
    new CreateTokenCommand({
      clientId: ssoToken.clientId,
      clientSecret: ssoToken.clientSecret,
      refreshToken: ssoToken.refreshToken,
      grantType: "refresh_token",
    }),
  );
};
//@ chunk-k63efphf.js:971-986 esm-layout
var import_property_provider_2 = __toESM(require_property_provider());
//@ chunk-k63efphf.js:986-1110 esm-fingerprint
var validateTokenExpiry = (token) => {
  if (token.expiration && token.expiration.getTime() < Date.now())
    throw new import_property_provider_2.TokenProviderError(`Token is expired. ${REFRESH_MESSAGE}`, false);
};
//@ chunk-k63efphf.js:1110-1125 esm-layout
var import_property_provider_3 = __toESM(require_property_provider());
//@ chunk-k63efphf.js:1125-1272 esm-fingerprint
var validateTokenKey = (key, value, forRefresh = false) => {
  if (typeof value === "undefined")
    throw new import_property_provider_3.TokenProviderError(
      `Value not present for '${key}' in SSO Token${forRefresh ? ". Cannot refresh" : ""}. ${REFRESH_MESSAGE}`,
      false,
    );
};
//@ chunk-k63efphf.js:1272-1287 esm-layout
var sharedIniFileLoader = __toESM(require_shared_ini_file_loader());
//@ chunk-k63efphf.js:1317-1419 esm-fingerprint
var { writeFile } = promises;
var writeSSOTokenToFile = (ssoSessionName, ssoToken) => {
  let ssoTokenFilepath = sharedIniFileLoader.getSSOTokenFilepath(ssoSessionName);
  let tokenString = JSON.stringify(ssoToken, null, 2);
  return writeFile(ssoTokenFilepath, tokenString);
};
//@ chunk-k63efphf.js:1419-3078 esm-layout
var lastRefreshAttemptTime = new Date(0);
var fromSso =
  (_init = {}) =>
  async ({ callerClientConfig } = {}) => {
    let init = {
      ..._init,
      parentClientConfig: {
        ...callerClientConfig,
        ..._init.parentClientConfig,
      },
    };
    init.logger?.debug("@aws-sdk/token-providers - fromSso");
    let profiles = await import_shared_ini_file_loader.parseKnownFiles(init);
    let profileName = import_shared_ini_file_loader.getProfileName({
      profile: init.profile ?? callerClientConfig?.profile,
    });
    let profile = profiles[profileName];
    if (!profile)
      throw new import_property_provider_4.TokenProviderError(
        `Profile '${profileName}' could not be found in shared credentials file.`,
        false,
      );
    else if (!profile.sso_session)
      throw new import_property_provider_4.TokenProviderError(
        `Profile '${profileName}' is missing required property 'sso_session'.`,
      );
    let ssoSessionName = profile.sso_session;
    let sessionData = (await import_shared_ini_file_loader.loadSsoSessionData(init))[ssoSessionName];
    if (!sessionData)
      throw new import_property_provider_4.TokenProviderError(
        `Sso session '${ssoSessionName}' could not be found in shared credentials file.`,
        false,
      );
    for (let ssoSessionRequiredKey of ["sso_start_url", "sso_region"])
      if (!sessionData[ssoSessionRequiredKey])
        throw new import_property_provider_4.TokenProviderError(
          `Sso session '${ssoSessionName}' is missing required property '${ssoSessionRequiredKey}'.`,
          false,
        );
    let { sso_start_url: ssoStartUrl, sso_region: ssoRegion } = sessionData;
    let ssoToken;
    try {
      ssoToken = await import_shared_ini_file_loader.getSSOTokenFromFile(ssoSessionName);
    } catch (e) {
      throw new import_property_provider_4.TokenProviderError(
        `The SSO session token associated with profile=${profileName} was not found or is invalid. ${REFRESH_MESSAGE}`,
        false,
      );
    }
    validateTokenKey("accessToken", ssoToken.accessToken);
    validateTokenKey("expiresAt", ssoToken.expiresAt);
    let { accessToken, expiresAt } = ssoToken;
    let existingToken = {
      token: accessToken,
      expiration: new Date(expiresAt),
    };
    if (existingToken.expiration.getTime() - Date.now() > SSO_TOKEN_TTL_MS) return existingToken;
    if (Date.now() - lastRefreshAttemptTime.getTime() < 30000) {
      validateTokenExpiry(existingToken);
      return existingToken;
    }
    validateTokenKey("clientId", ssoToken.clientId, true);
    validateTokenKey("clientSecret", ssoToken.clientSecret, true);
    validateTokenKey("refreshToken", ssoToken.refreshToken, true);
    try {
      lastRefreshAttemptTime.setTime(Date.now());
      let newSsoOidcToken = await getNewSsoOidcToken(ssoToken, ssoRegion, init);
      validateTokenKey("accessToken", newSsoOidcToken.accessToken);
      validateTokenKey("expiresIn", newSsoOidcToken.expiresIn);
      let newTokenExpiration = new Date(Date.now() + newSsoOidcToken.expiresIn * 1000);
      try {
        await writeSSOTokenToFile(ssoSessionName, {
          ...ssoToken,
          accessToken: newSsoOidcToken.accessToken,
          expiresAt: newTokenExpiration.toISOString(),
          refreshToken: newSsoOidcToken.refreshToken,
        });
      } catch (error) {}
      return {
        token: newSsoOidcToken.accessToken,
        expiration: newTokenExpiration,
      };
    } catch (error) {
      validateTokenExpiry(existingToken);
      return existingToken;
    }
  };
//@ chunk-0rkz0exm.js:571-579 esm-layout
var tokenTtlMs = bearerTokenEnvKey;
//@ chunk-0rkz0exm.js:579-1030 esm-layout
var import_property_provider = __toESM(require_property_provider());
var fromEnvSigningName =
  ({ logger, signingName } = {}) =>
  async () => {
    logger?.debug?.("@aws-sdk/token-providers - fromEnvSigningName");
    if (!signingName)
      throw new import_property_provider.TokenProviderError(
        "Please pass 'signingName' to compute environment variable key",
        {
          logger,
        },
      );
    let bearerTokenKey = tokenTtlMs(signingName);
    if (!(bearerTokenKey in process.env))
      throw new import_property_provider.TokenProviderError(
        `Token not present in '${bearerTokenKey}' environment variable`,
        {
          logger,
        },
      );
    let token = {
      token: process.env[bearerTokenKey],
    };
    import_client.setTokenFeature(token, "BEARER_SERVICE_ENV_VARS", "3");
    return token;
  };
//@ chunk-0rkz0exm.js:1030-1045 esm-layout
var propertyProvider = __toESM(require_property_provider());
//@ chunk-0rkz0exm.js:1045-1272 esm-fingerprint
var fromSsoClient = (init = {}) =>
  propertyProvider.memoize(
    propertyProvider.chain(fromSso(init), async () => {
      throw new propertyProvider.TokenProviderError("Could not load token from any providers", false);
    }),
    (token) => token.expiration !== undefined && token.expiration.getTime() - Date.now() < 300000,
    (token) => token.expiration !== undefined,
  );
export { fromEnvSigningName, fromSsoClient, fromSso };

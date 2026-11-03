/**
 * @aws-sdk/credential-provider-ini/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-ini@3.936.0..3.939.0
 * pieces: chunk-hecvqqcj.js (12)
 * attribution: esm-layout 8, esm-fingerprint 4
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_shared_ini_file_loader } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { require_client } from "../../core/dist-cjs/submodules/client/index.js";
import { fromLoginCredentials, import_client_2 } from "../../credential-provider-login/dist-cjs/index.js";

//@ chunk-hecvqqcj.js:371-386 esm-layout
var sharedIniFileLoader = Re(require_shared_ini_file_loader());
//@ chunk-hecvqqcj.js:386-402 esm-layout
var propertyProvider = Re(require_property_provider());
//@ chunk-hecvqqcj.js:402-439 esm-layout
var client = Re(require_client());
var import_property_provider = Re(require_property_provider());
var import_shared_ini_file_loader = Re(require_shared_ini_file_loader());
//@ chunk-hecvqqcj.js:439-1426 esm-layout
var import_client = Re(require_client());
var import_property_provider_2 = Re(require_property_provider());
var resolveCredentialSource = (credentialSource, profileName, logger) => {
  let sourceProvidersMap = {
    EcsContainer: async (options) => {
      let { fromHttp } = await import("./chunk-0c72454j.js");
      let { fromContainerMetadata } = await import("./chunk-7bg2190x.js");
      logger?.debug("@aws-sdk/credential-provider-ini - credential_source is EcsContainer");
      return async () =>
        import_property_provider_2
          .chain(fromHttp(options ?? {}), fromContainerMetadata(options))()
          .then(setNamedProvider);
    },
    Ec2InstanceMetadata: async (options) => {
      logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata");
      let { fromInstanceMetadata } = await import("./chunk-7bg2190x.js");
      return async () => fromInstanceMetadata(options)().then(setNamedProvider);
    },
    Environment: async (options) => {
      logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Environment");
      let { fromEnv } = await import("./chunk-vche1z6n.js");
      return async () => fromEnv(options)().then(setNamedProvider);
    },
  };
  if (credentialSource in sourceProvidersMap) return sourceProvidersMap[credentialSource];
  else
    throw new import_property_provider_2.CredentialsProviderError(
      `Unsupported credential source in profile ${profileName}. Got ${credentialSource}, expected EcsContainer or Ec2InstanceMetadata or Environment.`,
      {
        logger,
      },
    );
};
var setNamedProvider = (creds) =>
  import_client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_NAMED_PROVIDER", "p");
//@ chunk-hecvqqcj.js:1426-3742 esm-fingerprint
var isAssumeRoleProfile = (arg, { profile = "default", logger } = {}) =>
  Boolean(arg) &&
  typeof arg === "object" &&
  typeof arg.role_arn === "string" &&
  ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1 &&
  ["undefined", "string"].indexOf(typeof arg.external_id) > -1 &&
  ["undefined", "string"].indexOf(typeof arg.mfa_serial) > -1 &&
  (isAssumeRoleWithSourceProfile(arg, {
    profile,
    logger,
  }) ||
    isCredentialSourceProfile(arg, {
      profile,
      logger,
    }));
var isAssumeRoleWithSourceProfile = (arg, { profile, logger }) => {
  let withSourceProfile =
    typeof arg.source_profile === "string" && typeof arg.credential_source === "undefined";
  if (withSourceProfile)
    logger?.debug?.(`    ${profile} isAssumeRoleWithSourceProfile source_profile=${arg.source_profile}`);
  return withSourceProfile;
};
var isCredentialSourceProfile = (arg, { profile, logger }) => {
  let withProviderProfile =
    typeof arg.credential_source === "string" && typeof arg.source_profile === "undefined";
  if (withProviderProfile)
    logger?.debug?.(`    ${profile} isCredentialSourceProfile credential_source=${arg.credential_source}`);
  return withProviderProfile;
};
var resolveAssumeRoleCredentials = async (
  profileName,
  profiles,
  options,
  visitedProfiles = {},
  resolveProfileData,
) => {
  options.logger?.debug("@aws-sdk/credential-provider-ini - resolveAssumeRoleCredentials (STS)");
  let profileData = profiles[profileName];
  let { source_profile, region } = profileData;
  if (!options.roleAssumer) {
    let { getDefaultRoleAssumer } = await import("./chunk-my7fcfze.js").then((m) => Re(m.default));
    options.roleAssumer = getDefaultRoleAssumer(
      {
        ...options.clientConfig,
        credentialProviderLogger: options.logger,
        parentClientConfig: {
          ...options?.parentClientConfig,
          region: region ?? options?.parentClientConfig?.region,
        },
      },
      options.clientPlugins,
    );
  }
  if (source_profile && source_profile in visitedProfiles)
    throw new import_property_provider.CredentialsProviderError(
      `Detected a cycle attempting to resolve credentials for profile ${import_shared_ini_file_loader.getProfileName(options)}. Profiles visited: ` +
        Object.keys(visitedProfiles).join(", "),
      {
        logger: options.logger,
      },
    );
  options.logger?.debug(
    `@aws-sdk/credential-provider-ini - finding credential resolver using ${source_profile ? `source_profile=[${source_profile}]` : `profile=[${profileName}]`}`,
  );
  let sourceCredsProvider = source_profile
    ? resolveProfileData(
        source_profile,
        profiles,
        options,
        {
          ...visitedProfiles,
          [source_profile]: true,
        },
        isCredentialSourceWithoutRoleArn(profiles[source_profile] ?? {}),
      )
    : (await resolveCredentialSource(profileData.credential_source, profileName, options.logger)(options))();
  if (isCredentialSourceWithoutRoleArn(profileData))
    return sourceCredsProvider.then((creds) =>
      client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"),
    );
  else {
    let params = {
      RoleArn: profileData.role_arn,
      RoleSessionName: profileData.role_session_name || `aws-sdk-js-${Date.now()}`,
      ExternalId: profileData.external_id,
      DurationSeconds: parseInt(profileData.duration_seconds || "3600", 10),
    };
    let { mfa_serial } = profileData;
    if (mfa_serial) {
      if (!options.mfaCodeProvider)
        throw new import_property_provider.CredentialsProviderError(
          `Profile ${profileName} requires multi-factor authentication, but no MFA code callback was provided.`,
          {
            logger: options.logger,
            tryNextLink: false,
          },
        );
      params.SerialNumber = mfa_serial;
      params.TokenCode = await options.mfaCodeProvider(mfa_serial);
    }
    let sourceCreds = await sourceCredsProvider;
    return options
      .roleAssumer(sourceCreds, params)
      .then((creds) => client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
  }
};
var isCredentialSourceWithoutRoleArn = (section) => !section.role_arn && !!section.credential_source;
//@ chunk-hecvqqcj.js:9813-9968 esm-fingerprint
var J = (e) => Boolean(e && e.login_session);
var resolveLoginCredentials = async (profileName, options) => {
  let credentials = await fromLoginCredentials({
    ...options,
    profile: profileName,
  })();
  return import_client_2.setCredentialFeature(credentials, "CREDENTIALS_PROFILE_LOGIN", "AC");
};
//@ chunk-hecvqqcj.js:9968-10224 esm-layout
var import_client_4 = Re(require_client());
var isProcessProfile = (arg) =>
  Boolean(arg) && typeof arg === "object" && typeof arg.credential_process === "string";
var resolveProcessCredentials = async (options, profile) =>
  import("./chunk-skhq176t.js").then(({ fromProcess }) =>
    fromProcess({
      ...options,
      profile,
    })().then((creds) => import_client_4.setCredentialFeature(creds, "CREDENTIALS_PROFILE_PROCESS", "v")),
  );
//@ chunk-hecvqqcj.js:10224-10769 esm-layout
var import_client_5 = Re(require_client());
var resolveSsoCredentials = async (profile, profileData, options = {}) => {
  let { fromSSO } = await import("./chunk-rs2k9kxx.js");
  return fromSSO({
    profile,
    logger: options.logger,
    parentClientConfig: options.parentClientConfig,
    clientConfig: options.clientConfig,
  })().then((creds) => {
    if (profileData.sso_session)
      return import_client_5.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO", "r");
    else return import_client_5.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO_LEGACY", "t");
  });
};
var isSsoProfile = (arg) =>
  arg &&
  (typeof arg.sso_start_url === "string" ||
    typeof arg.sso_account_id === "string" ||
    typeof arg.sso_session === "string" ||
    typeof arg.sso_region === "string" ||
    typeof arg.sso_role_name === "string");
//@ chunk-hecvqqcj.js:10769-11416 esm-layout
var import_client_6 = Re(require_client());
var isStaticCredsProfile = (arg) =>
  Boolean(arg) &&
  typeof arg === "object" &&
  typeof arg.aws_access_key_id === "string" &&
  typeof arg.aws_secret_access_key === "string" &&
  ["undefined", "string"].indexOf(typeof arg.aws_session_token) > -1 &&
  ["undefined", "string"].indexOf(typeof arg.aws_account_id) > -1;
var resolveStaticCredentials = async (profile, options) => {
  options?.logger?.debug("@aws-sdk/credential-provider-ini - resolveStaticCredentials");
  let credentials = {
    accessKeyId: profile.aws_access_key_id,
    secretAccessKey: profile.aws_secret_access_key,
    sessionToken: profile.aws_session_token,
    ...(profile.aws_credential_scope && {
      credentialScope: profile.aws_credential_scope,
    }),
    ...(profile.aws_account_id && {
      accountId: profile.aws_account_id,
    }),
  };
  return import_client_6.setCredentialFeature(credentials, "CREDENTIALS_PROFILE", "n");
};
//@ chunk-hecvqqcj.js:11416-11984 esm-layout
var import_client_7 = Re(require_client());
var isWebIdentityProfile = (arg) =>
  Boolean(arg) &&
  typeof arg === "object" &&
  typeof arg.web_identity_token_file === "string" &&
  typeof arg.role_arn === "string" &&
  ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1;
var resolveWebIdentityCredentials = async (profile, options) =>
  import("./chunk-2pe5kgjj.js").then(({ fromTokenFile }) =>
    fromTokenFile({
      webIdentityTokenFile: profile.web_identity_token_file,
      roleArn: profile.role_arn,
      roleSessionName: profile.role_session_name,
      roleAssumerWithWebIdentity: options.roleAssumerWithWebIdentity,
      logger: options.logger,
      parentClientConfig: options.parentClientConfig,
    })().then((creds) =>
      import_client_7.setCredentialFeature(creds, "CREDENTIALS_PROFILE_STS_WEB_ID_TOKEN", "q"),
    ),
  );
//@ chunk-hecvqqcj.js:11984-12402 esm-fingerprint
var resolveProfileData = async (
  profileName,
  profiles,
  options,
  visitedProfiles = {},
  isAssumeRoleRecursiveCall = false,
) => {
  let data = profiles[profileName];
  if (Object.keys(visitedProfiles).length > 0 && isStaticCredsProfile(data))
    return resolveStaticCredentials(data, options);
  if (
    isAssumeRoleRecursiveCall ||
    isAssumeRoleProfile(data, {
      profile: profileName,
      logger: options.logger,
    })
  )
    return resolveAssumeRoleCredentials(profileName, profiles, options, visitedProfiles, resolveProfileData);
  if (isStaticCredsProfile(data)) return resolveStaticCredentials(data, options);
  if (isWebIdentityProfile(data)) return resolveWebIdentityCredentials(data, options);
  if (isProcessProfile(data)) return resolveProcessCredentials(options, profileName);
  if (isSsoProfile(data)) return await resolveSsoCredentials(profileName, data, options);
  if (J(data)) return resolveLoginCredentials(profileName, options);
  throw new propertyProvider.CredentialsProviderError(
    `Could not resolve credentials using profile: [${profileName}] in configuration/credentials file(s).`,
    {
      logger: options.logger,
    },
  );
};
//@ chunk-hecvqqcj.js:12402-12676 esm-fingerprint
var fromIni =
  (_init = {}) =>
  async ({ callerClientConfig } = {}) => {
    let init = {
      ..._init,
      parentClientConfig: {
        ...callerClientConfig,
        ..._init.parentClientConfig,
      },
    };
    init.logger?.debug("@aws-sdk/credential-provider-ini - fromIni");
    let profiles = await sharedIniFileLoader.parseKnownFiles(init);
    return resolveProfileData(
      sharedIniFileLoader.getProfileName({
        profile: _init.profile ?? callerClientConfig?.profile,
      }),
      profiles,
      init,
    );
  };
export { fromIni };

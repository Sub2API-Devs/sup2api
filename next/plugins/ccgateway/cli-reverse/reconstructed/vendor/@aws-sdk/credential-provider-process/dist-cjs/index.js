/**
 * @aws-sdk/credential-provider-process/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-process@3.936.0..3.972.46
 * pieces: chunk-aa9fw239.js (5)
 * attribution: esm-layout 3, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { promisify } from "util";
import { exec } from "child_process";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_shared_ini_file_loader } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { require_client } from "../../core/dist-cjs/submodules/client/index.js";

//@ chunk-aa9fw239.js:335-350 esm-layout
var import_shared_ini_file_loader = __toESM(require_shared_ini_file_loader());
//@ chunk-aa9fw239.js:350-376 esm-layout
var import_property_provider = __toESM(require_property_provider());
var import_shared_ini_file_loader_2 = __toESM(require_shared_ini_file_loader());
//@ chunk-aa9fw239.js:446-1211 esm-layout
var client = __toESM(require_client());
var getValidatedProcessCredentials = (profileName, data, profiles) => {
  if (data.Version !== 1) throw Error(`Profile ${profileName} credential_process did not return Version 1.`);
  if (data.AccessKeyId === undefined || data.SecretAccessKey === undefined)
    throw Error(`Profile ${profileName} credential_process returned invalid credentials.`);
  if (data.Expiration) {
    let currentTime = new Date();
    if (new Date(data.Expiration) < currentTime)
      throw Error(`Profile ${profileName} credential_process returned expired credentials.`);
  }
  let accountId = data.AccountId;
  if (!accountId && profiles?.[profileName]?.aws_account_id) accountId = profiles[profileName].aws_account_id;
  let credentials = {
    accessKeyId: data.AccessKeyId,
    secretAccessKey: data.SecretAccessKey,
    ...(data.SessionToken && {
      sessionToken: data.SessionToken,
    }),
    ...(data.Expiration && {
      expiration: new Date(data.Expiration),
    }),
    ...(data.CredentialScope && {
      credentialScope: data.CredentialScope,
    }),
    ...(accountId && {
      accountId,
    }),
  };
  client.setCredentialFeature(credentials, "CREDENTIALS_PROCESS", "w");
  return credentials;
};
//@ chunk-aa9fw239.js:1211-1798 esm-fingerprint
var resolveProcessCredentials = async (profileName, profiles, logger) => {
  let profile = profiles[profileName];
  if (profiles[profileName]) {
    let credentialProcess = profile.credential_process;
    if (credentialProcess !== undefined) {
      let execPromise = promisify(
        import_shared_ini_file_loader_2.externalDataInterceptor?.getTokenRecord?.().exec ?? exec,
      );
      try {
        let { stdout } = await execPromise(credentialProcess);
        let data;
        try {
          data = JSON.parse(stdout.trim());
        } catch {
          throw Error(`Profile ${profileName} credential_process returned invalid JSON.`);
        }
        return getValidatedProcessCredentials(profileName, data, profiles);
      } catch (error) {
        throw new import_property_provider.CredentialsProviderError(error.message, {
          logger,
        });
      }
    } else
      throw new import_property_provider.CredentialsProviderError(
        `Profile ${profileName} did not contain credential_process.`,
        {
          logger,
        },
      );
  } else
    throw new import_property_provider.CredentialsProviderError(
      `Profile ${profileName} could not be found in shared credentials file.`,
      {
        logger,
      },
    );
};
//@ chunk-aa9fw239.js:1798-2022 esm-fingerprint
var fromProcess =
  (init = {}) =>
  async ({ callerClientConfig } = {}) => {
    init.logger?.debug("@aws-sdk/credential-provider-process - fromProcess");
    let profiles = await import_shared_ini_file_loader.parseKnownFiles(init);
    return resolveProcessCredentials(
      import_shared_ini_file_loader.getProfileName({
        profile: init.profile ?? callerClientConfig?.profile,
      }),
      profiles,
      init.logger,
    );
  };
export { fromProcess };

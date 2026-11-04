/**
 * @aws-sdk/credential-provider-web-identity/dist-cjs/fromTokenFile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-web-identity@3.936.0
 * pieces: chunk-2pe5kgjj.js (1)
 * attribution: esm-fingerprint 1
 */
import { readFileSync } from "fs";
import {
  import_property_provider,
  fromWebToken,
  import_shared_ini_file_loader,
  import_client,
} from "./fromWebToken.js";

//@ chunk-2pe5kgjj.js:1050-1694 esm-fingerprint
var ENV_TOKEN_FILE = "AWS_WEB_IDENTITY_TOKEN_FILE";
var ENV_ROLE_ARN = "AWS_ROLE_ARN";
var ENV_ROLE_SESSION_NAME = "AWS_ROLE_SESSION_NAME";
var fromTokenFile =
  (init = {}) =>
  async (awsIdentityProperties) => {
    init.logger?.debug("@aws-sdk/credential-provider-web-identity - fromTokenFile");
    let webIdentityTokenFile = init?.webIdentityTokenFile ?? process.env[ENV_TOKEN_FILE];
    let roleArn = init?.roleArn ?? process.env[ENV_ROLE_ARN];
    let roleSessionName = init?.roleSessionName ?? process.env[ENV_ROLE_SESSION_NAME];
    if (!webIdentityTokenFile || !roleArn)
      throw new import_property_provider.CredentialsProviderError(
        "Web identity configuration not specified",
        {
          logger: init.logger,
        },
      );
    let credentials = await fromWebToken({
      ...init,
      webIdentityToken:
        import_shared_ini_file_loader.externalDataInterceptor?.getTokenRecord?.()[webIdentityTokenFile] ??
        readFileSync(webIdentityTokenFile, {
          encoding: "ascii",
        }),
      roleArn,
      roleSessionName,
    })(awsIdentityProperties);
    if (webIdentityTokenFile === process.env[ENV_TOKEN_FILE])
      import_client.setCredentialFeature(credentials, "CREDENTIALS_ENV_VARS_STS_WEB_ID_TOKEN", "h");
    return credentials;
  };
export { fromTokenFile };

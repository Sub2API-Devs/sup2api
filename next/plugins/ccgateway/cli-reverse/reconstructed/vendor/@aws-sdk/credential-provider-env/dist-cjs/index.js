/**
 * @aws-sdk/credential-provider-env/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-env@3.936.0
 * pieces: chunk-qrtqtj8x.js (1)
 * attribution: esm-layout 1
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_client } from "../../core/dist-cjs/submodules/client/index.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";

//@ chunk-qrtqtj8x.js:335-1021 esm-layout
var client = __toESM(require_client());
var propertyProvider = __toESM(require_property_provider());
var ENV_KEY = "AWS_ACCESS_KEY_ID";
var ENV_SECRET = "AWS_SECRET_ACCESS_KEY";
var ENV_SESSION = "AWS_SESSION_TOKEN";
var ENV_EXPIRATION = "AWS_CREDENTIAL_EXPIRATION";
var ENV_CREDENTIAL_SCOPE = "AWS_CREDENTIAL_SCOPE";
var ENV_ACCOUNT_ID = "AWS_ACCOUNT_ID";
var fromEnv = (init) => async () => {
  init?.logger?.debug("@aws-sdk/credential-provider-env - fromEnv");
  let accessKeyId = process.env[ENV_KEY];
  let secretAccessKey = process.env[ENV_SECRET];
  let sessionToken = process.env[ENV_SESSION];
  let expiry = process.env[ENV_EXPIRATION];
  let credentialScope = process.env[ENV_CREDENTIAL_SCOPE];
  let accountId = process.env[ENV_ACCOUNT_ID];
  if (accessKeyId && secretAccessKey) {
    let credentials = {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && {
        sessionToken,
      }),
      ...(expiry && {
        expiration: new Date(expiry),
      }),
      ...(credentialScope && {
        credentialScope,
      }),
      ...(accountId && {
        accountId,
      }),
    };
    client.setCredentialFeature(credentials, "CREDENTIALS_ENV_VARS", "g");
    return credentials;
  }
  throw new propertyProvider.CredentialsProviderError("Unable to find environment variable credentials.", {
    logger: init?.logger,
  });
};
export { fromEnv, ENV_KEY, ENV_SECRET };

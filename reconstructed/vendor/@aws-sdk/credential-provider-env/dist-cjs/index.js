/**
 * @aws-sdk/credential-provider-env/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-env@3.936.0
 * pieces: chunk-j3x7ed1b.js (1)
 * attribution: esm-layout 1
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { SD } from "../../core/dist-cjs/submodules/client/index.js";
import { $h } from "../../../@smithy/property-provider/dist-cjs/index.js";

//@ chunk-j3x7ed1b.js:335-1021 esm-layout
var p = Re(SD()),
  E = Re($h()),
  ENV_KEY = "AWS_ACCESS_KEY_ID",
  ENV_SECRET = "AWS_SECRET_ACCESS_KEY",
  AWS_SESSION_TOKEN = "AWS_SESSION_TOKEN",
  AWS_CREDENTIAL_EXPIRATION = "AWS_CREDENTIAL_EXPIRATION",
  AWS_CREDENTIAL_SCOPE = "AWS_CREDENTIAL_SCOPE",
  AWS_ACCOUNT_ID = "AWS_ACCOUNT_ID",
  fromEnv = (e) => async () => {
    e?.logger?.debug("@aws-sdk/credential-provider-env - fromEnv");
    let o = process.env[ENV_KEY],
      r = process.env[ENV_SECRET],
      n = process.env[AWS_SESSION_TOKEN],
      s = process.env[AWS_CREDENTIAL_EXPIRATION],
      t = process.env[AWS_CREDENTIAL_SCOPE],
      d = process.env[AWS_ACCOUNT_ID];
    if (o && r) {
      let a = {
        accessKeyId: o,
        secretAccessKey: r,
        ...(n && { sessionToken: n }),
        ...(s && { expiration: new Date(s) }),
        ...(t && { credentialScope: t }),
        ...(d && { accountId: d }),
      };
      return (p.setCredentialFeature(a, "CREDENTIALS_ENV_VARS", "g"), a);
    }
    throw new E.CredentialsProviderError("Unable to find environment variable credentials.", {
      logger: e?.logger,
    });
  };

export { ENV_KEY, ENV_SECRET, fromEnv };
